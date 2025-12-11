import type { SessionState, StreamEvent } from '../types.js'

export interface SessionClientOptions {
  sessionId: string
  baseUrl?: string
  authToken?: string
}

export type StateListener = (state: SessionState) => void
export type EventListener = (event: StreamEvent) => void

/**
 * WebSocket client for real-time session updates
 */
export class SessionClient {
  private ws: WebSocket | null = null
  private sessionId: string
  private baseUrl: string
  private authToken?: string
  private stateListeners = new Set<StateListener>()
  private eventListeners = new Set<EventListener>()
  private currentState: SessionState | null = null

  constructor(options: SessionClientOptions) {
    this.sessionId = options.sessionId
    this.baseUrl = options.baseUrl ?? 'https://agents.do'
    this.authToken = options.authToken
  }

  /**
   * Connect to the session WebSocket
   */
  connect(): void {
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    this.ws = new WebSocket(`${wsUrl}/sessions/${this.sessionId}/ws`)

    this.ws.onopen = () => {
      // Send auth token if available
      if (this.authToken) {
        this.ws?.send(
          JSON.stringify({
            type: 'auth',
            token: this.authToken,
          })
        )
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)

        if (data.type === 'state' && data.state) {
          this.currentState = data.state
          this.stateListeners.forEach((fn) => fn(data.state))
        }

        if (data.type === 'event' && data.event) {
          this.eventListeners.forEach((fn) => fn(data.event))
          // Also update state if included
          if (data.state) {
            this.currentState = data.state
            this.stateListeners.forEach((fn) => fn(data.state))
          }
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      // Could implement reconnection logic here
    }
  }

  /**
   * Subscribe to state updates
   */
  onState(fn: StateListener): () => void {
    this.stateListeners.add(fn)
    // If we already have state, call immediately
    if (this.currentState) {
      fn(this.currentState)
    }
    return () => this.stateListeners.delete(fn)
  }

  /**
   * Subscribe to events
   */
  onEvent(fn: EventListener): () => void {
    this.eventListeners.add(fn)
    return () => this.eventListeners.delete(fn)
  }

  /**
   * Get current state (if available)
   */
  getState(): SessionState | null {
    return this.currentState
  }

  /**
   * Close the connection
   */
  close(): void {
    this.ws?.close()
    this.ws = null
    this.stateListeners.clear()
    this.eventListeners.clear()
  }
}

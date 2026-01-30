/**
 * MDXE Tail WebSocket Client
 *
 * Provides WebSocket-based real-time event streaming for the mdxe tail command.
 * Supports automatic reconnection with exponential backoff, keepalive ping/pong,
 * and event filtering.
 *
 * @module mdxe/tail/ws-client
 */

import type { MdxeEvent } from './types.js'
import type { EventFilter } from './filter.js'

/**
 * WebSocket message types sent by the client
 */
export type TailClientMessage =
  | { type: 'subscribe'; filter?: EventFilter }
  | { type: 'unsubscribe' }
  | { type: 'ping' }

/**
 * WebSocket message types received from the server
 */
export type TailServerMessage =
  | { type: 'event'; event: MdxeEvent }
  | { type: 'pong'; timestamp: number }
  | { type: 'subscribed'; filter?: EventFilter }
  | { type: 'unsubscribed' }
  | { type: 'error'; message: string }

/**
 * Connection metrics for monitoring and debugging
 */
export interface TailClientMetrics {
  /** Total messages received */
  messagesReceived: number
  /** Number of connection attempts made */
  connectionAttempts: number
  /** Latency of last ping/pong in milliseconds */
  lastPingLatencyMs?: number
}

/**
 * Options for creating a TailClient
 */
export interface TailClientOptions {
  /** WebSocket server URL */
  url: string
  /** Initial event filter (auto-subscribes on connect) */
  filter?: EventFilter
  /** Callback when an event is received */
  onEvent?: (event: MdxeEvent) => void
  /** Callback when connection is established */
  onConnect?: () => void
  /** Callback when connection is closed */
  onDisconnect?: () => void
  /** Callback when an error occurs */
  onError?: (error: Error) => void
  /** Whether to automatically reconnect on unexpected close (default: false) */
  reconnect?: boolean
  /** Base delay for reconnection in milliseconds (default: 1000) */
  reconnectBaseMs?: number
  /** Maximum delay for reconnection in milliseconds (default: 30000) */
  reconnectMaxMs?: number
  /** Interval for keepalive pings in milliseconds (default: 30000) */
  pingIntervalMs?: number
}

/**
 * WebSocket client for real-time event tailing
 *
 * @example
 * ```ts
 * const client = new TailClient({
 *   url: 'ws://localhost:3000/tail',
 *   filter: { source: 'mdxe-*', minImportance: 'high' },
 *   onEvent: (event) => console.log(event),
 *   onConnect: () => console.log('Connected'),
 *   reconnect: true,
 * })
 *
 * client.connect()
 * // Later...
 * client.disconnect()
 * ```
 */
export class TailClient {
  private readonly url: string
  private readonly filter?: EventFilter
  private readonly onEvent?: (event: MdxeEvent) => void
  private readonly onConnect?: () => void
  private readonly onDisconnect?: () => void
  private readonly onError?: (error: Error) => void
  private readonly shouldReconnect: boolean
  private readonly reconnectBaseMs: number
  private readonly reconnectMaxMs: number
  private readonly pingIntervalMs: number

  private ws: WebSocket | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts: number = 0
  private isDisconnecting: boolean = false
  private lastPingTime: number | null = null
  private currentFilter?: EventFilter

  // Metrics
  private _messagesReceived: number = 0
  private _connectionAttempts: number = 0
  private _lastPingLatencyMs?: number

  constructor(options: TailClientOptions) {
    this.url = options.url
    this.filter = options.filter
    this.onEvent = options.onEvent
    this.onConnect = options.onConnect
    this.onDisconnect = options.onDisconnect
    this.onError = options.onError
    this.shouldReconnect = options.reconnect ?? false
    this.reconnectBaseMs = options.reconnectBaseMs ?? 1000
    this.reconnectMaxMs = options.reconnectMaxMs ?? 30000
    this.pingIntervalMs = options.pingIntervalMs ?? 30000
  }

  /**
   * Connect to the WebSocket server
   */
  connect(): void {
    // Don't create multiple connections
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      return
    }

    this.isDisconnecting = false
    this._connectionAttempts++

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      // Reset reconnection attempts on successful connection
      this.reconnectAttempts = 0

      // Start keepalive ping interval
      this.startPingInterval()

      // Auto-subscribe if filter was provided
      if (this.filter) {
        this.subscribe(this.filter)
      } else if (this.currentFilter) {
        // Re-subscribe with the last used filter on reconnection
        this.subscribe(this.currentFilter)
      }

      this.onConnect?.()
    }

    this.ws.onclose = (event) => {
      this.stopPingInterval()
      this.onDisconnect?.()

      // Attempt reconnection if enabled and not intentional disconnect
      if (this.shouldReconnect && !this.isDisconnecting && event.code !== 1000) {
        this.scheduleReconnect()
      }
    }

    this.ws.onerror = () => {
      this.onError?.(new Error('WebSocket error'))
    }

    this.ws.onmessage = (event) => {
      this._messagesReceived++

      try {
        const message = JSON.parse(event.data as string) as TailServerMessage

        switch (message.type) {
          case 'event':
            this.onEvent?.(message.event)
            break
          case 'pong':
            if (this.lastPingTime !== null) {
              this._lastPingLatencyMs = Date.now() - this.lastPingTime
              this.lastPingTime = null
            }
            break
          // Other message types are handled silently
        }
      } catch {
        // Ignore malformed messages
      }
    }
  }

  /**
   * Disconnect from the WebSocket server
   */
  disconnect(): void {
    this.isDisconnecting = true
    this.clearReconnectTimer()
    this.stopPingInterval()

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  /**
   * Subscribe to events with an optional filter
   *
   * @param filter - Event filter to apply
   */
  subscribe(filter?: EventFilter): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    this.currentFilter = filter
    const message: TailClientMessage = filter ? { type: 'subscribe', filter } : { type: 'subscribe' }
    this.ws.send(JSON.stringify(message))
  }

  /**
   * Unsubscribe from events
   */
  unsubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return
    }

    const message: TailClientMessage = { type: 'unsubscribe' }
    this.ws.send(JSON.stringify(message))
  }

  /**
   * Check if the client is currently connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN
  }

  /**
   * Get connection metrics
   */
  getMetrics(): TailClientMetrics {
    return {
      messagesReceived: this._messagesReceived,
      connectionAttempts: this._connectionAttempts,
      lastPingLatencyMs: this._lastPingLatencyMs,
    }
  }

  private startPingInterval(): void {
    this.stopPingInterval()

    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now()
        const message: TailClientMessage = { type: 'ping' }
        this.ws.send(JSON.stringify(message))
      }
    }, this.pingIntervalMs)
  }

  private stopPingInterval(): void {
    if (this.pingTimer !== null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer()

    // Calculate delay with exponential backoff
    const delay = Math.min(this.reconnectBaseMs * Math.pow(2, this.reconnectAttempts), this.reconnectMaxMs)

    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, delay)
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}

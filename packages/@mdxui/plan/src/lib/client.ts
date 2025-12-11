/**
 * WebSocket client for connecting to agent sessions
 */

export interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  model: string
  cwd: string
  startedAt: Date | string
  completedAt?: Date | string

  plan: PlanStep[]
  todos: Todo[]
  tools: ToolExecution[]
  messages: Message[]

  cost: number
  duration: number
  usage?: Usage
}

export interface PlanStep {
  id: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'skipped'
}

export interface Todo {
  content: string
  activeForm: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface ToolExecution {
  id: string
  tool: string
  input: unknown
  output?: unknown
  status: 'running' | 'success' | 'error'
  startedAt: Date | string
  completedAt?: Date | string
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date | string
}

export interface Usage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export type StateListener = (state: SessionState) => void

export class SessionClient {
  private ws: WebSocket | null = null
  private listeners = new Set<StateListener>()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  constructor(
    private sessionId: string,
    private baseUrl: string
  ) {
    this.connect()
  }

  private connect() {
    const wsUrl = this.baseUrl.replace(/^http/, 'ws')
    this.ws = new WebSocket(`${wsUrl}/sessions/${this.sessionId}/ws`)

    this.ws.onopen = () => {
      console.log(`Connected to session ${this.sessionId}`)
      this.reconnectAttempts = 0
    }

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'state' && data.data) {
          this.notifyListeners(data.data)
        } else if (data.state) {
          this.notifyListeners(data.state)
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket closed')
      this.attemptReconnect()
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`)

    setTimeout(() => {
      this.connect()
    }, delay)
  }

  private notifyListeners(state: SessionState) {
    this.listeners.forEach((listener) => {
      try {
        listener(state)
      } catch (error) {
        console.error('Listener error:', error)
      }
    })
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  close() {
    this.maxReconnectAttempts = 0 // Prevent reconnection
    this.ws?.close()
    this.listeners.clear()
  }
}

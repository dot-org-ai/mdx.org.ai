/**
 * Session Durable Object
 *
 * Manages persistent state and WebSocket connections for agent sessions.
 * Handles event streams from local, sandbox, or DO-native execution modes.
 */

import type {
  SessionState,
  StreamEvent,
  Env,
  WebSocketMessage,
  SessionConfig,
} from './types'

/**
 * Create initial session state
 */
function createInitialState(id: string, config?: Partial<SessionConfig>): SessionState {
  return {
    id,
    status: 'idle',
    executionMode: config?.executionMode,
    model: config?.model || 'claude-sonnet-4-20250514',
    cwd: config?.cwd,
    startedAt: new Date(),
    plan: [],
    todos: [],
    tools: [],
    messages: [],
    cost: 0,
    duration: 0,
    usage: {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    },
  }
}

/**
 * Update session state based on incoming event
 * This is where we extract structured data from the event stream
 */
function updateState(state: SessionState, event: StreamEvent): void {
  const timestamp = event.timestamp || new Date()

  switch (event.type) {
    case 'assistant':
      state.messages.push({
        id: crypto.randomUUID(),
        type: 'assistant',
        content: event.content,
        timestamp,
      })
      break

    case 'tool_use':
      // Create tool execution record
      const toolExec = {
        id: event.id,
        tool: event.tool,
        input: event.input,
        status: 'running' as const,
        startedAt: timestamp,
      }
      state.tools.push(toolExec)

      // Extract todos from TodoWrite tool
      if (event.tool === 'TodoWrite' && event.input && typeof event.input === 'object') {
        const input = event.input as { todos?: Array<{ content: string; activeForm: string; status: string }> }
        if (input.todos) {
          state.todos = input.todos.map(t => ({
            content: t.content,
            activeForm: t.activeForm,
            status: t.status as 'pending' | 'in_progress' | 'completed',
          }))
        }
      }

      state.messages.push({
        id: event.id,
        type: 'tool_use',
        content: event.input,
        timestamp,
      })
      break

    case 'tool_result':
      // Update tool execution with result
      const tool = state.tools.find(t => t.id === event.id)
      if (tool) {
        tool.output = event.output
        tool.status = event.error ? 'error' : 'success'
        tool.completedAt = timestamp
        tool.duration = tool.completedAt.getTime() - tool.startedAt.getTime()
        if (event.error) {
          tool.error = event.error
        }
      }

      state.messages.push({
        id: event.id,
        type: 'tool_result',
        content: event.output,
        timestamp,
      })
      break

    case 'result':
      state.status = 'completed'
      state.completedAt = timestamp
      state.cost = event.cost
      state.duration = event.duration
      state.usage = event.usage
      break

    case 'error':
      state.status = 'error'
      state.error = event.error
      state.completedAt = timestamp
      break

    case 'unknown':
      // Log unknown events for debugging
      console.warn('Unknown event:', event.raw)
      break
  }

  // Update session status based on tool states
  if (state.status === 'idle' && state.tools.length > 0) {
    state.status = 'running'
  }
}

/**
 * Session Durable Object
 *
 * Features:
 * - Persistent state storage
 * - WebSocket broadcasting to multiple clients
 * - Event handling from external runners
 * - MDX/Markdown rendering endpoints
 * - DO-native Agent SDK execution (future)
 */
export class SessionDO implements DurableObject {
  private state: DurableObjectState
  private env: Env
  private sessionState: SessionState
  private sockets: Set<WebSocket> = new Set()

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env

    // Initialize session state
    const sessionId = state.id.toString()
    this.sessionState = createInitialState(sessionId)

    // Restore from storage
    state.blockConcurrencyWhile(async () => {
      const stored = await state.storage.get<SessionState>('state')
      if (stored) {
        this.sessionState = stored
        // Restore Date objects
        this.sessionState.startedAt = new Date(this.sessionState.startedAt)
        if (this.sessionState.completedAt) {
          this.sessionState.completedAt = new Date(this.sessionState.completedAt)
        }
      }
    })
  }

  /**
   * Handle HTTP requests and WebSocket upgrades
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade for real-time updates
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // REST endpoints
    switch (url.pathname) {
      case '/':
      case '/state':
        return this.handleGetState(request)

      case '/mdx':
        return this.handleGetMDX(request)

      case '/markdown':
        return this.handleGetMarkdown(request)

      case '/event':
        if (request.method === 'POST') {
          return this.handlePostEvent(request)
        }
        break

      case '/run/native':
        if (request.method === 'POST') {
          return this.handleRunNative(request)
        }
        break
    }

    return new Response('Not found', { status: 404 })
  }

  /**
   * Handle WebSocket upgrade
   */
  private handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair()
    const client = pair[0]
    const server = pair[1]

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server)
    this.sockets.add(server)

    // Send current state immediately
    server.send(JSON.stringify({
      type: 'state',
      data: this.sessionState,
    } satisfies WebSocketMessage))

    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  /**
   * Get current session state
   */
  private handleGetState(request: Request): Response {
    return Response.json(this.sessionState)
  }

  /**
   * Get MDX representation of session
   * TODO: Implement MDX rendering
   */
  private handleGetMDX(request: Request): Response {
    // For now, return placeholder
    const mdx = `---
$type: AgentSession
$id: ${this.sessionState.id}
status: ${this.sessionState.status}
---

# Agent Session

Status: ${this.sessionState.status}
Model: ${this.sessionState.model}

## Todos

${this.sessionState.todos.map(t => `- [${t.status === 'completed' ? 'x' : t.status === 'in_progress' ? '-' : ' '}] ${t.content}`).join('\n')}

## Tools

${this.sessionState.tools.map(t => `- ${t.tool}: ${t.status}`).join('\n')}
`
    return new Response(mdx, {
      headers: { 'Content-Type': 'text/markdown' },
    })
  }

  /**
   * Get Markdown representation of session
   * TODO: Implement GitHub-specific markdown rendering
   */
  private handleGetMarkdown(request: Request): Response {
    // For now, return similar to MDX
    return this.handleGetMDX(request)
  }

  /**
   * Handle incoming event from external runner
   */
  private async handlePostEvent(request: Request): Promise<Response> {
    try {
      const event = await request.json() as StreamEvent

      // Update state
      updateState(this.sessionState, event)

      // Persist to storage
      await this.state.storage.put('state', this.sessionState)

      // Broadcast to all connected clients
      await this.broadcast({
        type: 'event',
        event,
        state: this.sessionState,
      })

      return new Response('ok')
    } catch (error) {
      console.error('Error handling event:', error)
      return new Response('Error processing event', { status: 500 })
    }
  }

  /**
   * Handle DO-native execution request
   * TODO: Implement Agent SDK V2 integration
   */
  private async handleRunNative(request: Request): Promise<Response> {
    try {
      const config = await request.json() as SessionConfig

      // Start execution in background
      this.state.waitUntil(this.runDONative(config))

      return Response.json({
        started: true,
        sessionId: this.sessionState.id
      })
    } catch (error) {
      console.error('Error starting native execution:', error)
      return new Response('Error starting execution', { status: 500 })
    }
  }

  /**
   * Run Agent SDK V2 in DO-native mode
   * TODO: Implement full Agent SDK integration
   */
  private async runDONative(config: SessionConfig): Promise<void> {
    this.sessionState.status = 'running'
    this.sessionState.executionMode = 'do-native'
    await this.persist()
    await this.broadcast({ type: 'state', data: this.sessionState })

    // TODO: Implement Agent SDK V2 execution
    // const tools = createDOTools(this.env)
    // const agent = new AgentSession({
    //   sessionId: this.sessionState.id,
    //   onEvent: (event) => this.handleEvent(event),
    // })
    // await agent.run(config.prompt, tools)

    console.log('DO-native execution not yet implemented')
  }

  /**
   * Broadcast message to all connected WebSocket clients
   */
  private async broadcast(message: WebSocketMessage): Promise<void> {
    const json = JSON.stringify(message)

    for (const socket of this.sockets) {
      try {
        socket.send(json)
      } catch (error) {
        console.error('Error broadcasting to socket:', error)
        this.sockets.delete(socket)
      }
    }
  }

  /**
   * Persist state to storage
   */
  private async persist(): Promise<void> {
    await this.state.storage.put('state', this.sessionState)
  }

  /**
   * Handle WebSocket close
   */
  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    this.sockets.delete(ws)
  }

  /**
   * Handle WebSocket error
   */
  webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error)
    this.sockets.delete(ws)
  }
}

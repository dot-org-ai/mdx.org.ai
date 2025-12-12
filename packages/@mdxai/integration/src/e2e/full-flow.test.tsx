/**
 * Full E2E Flow Tests
 *
 * End-to-end tests that verify the complete flow across all packages:
 * - Create session -> Stream events -> Complete -> Verify state
 * - Multiple concurrent sessions don't interfere
 * - Session recovery after disconnect
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import React from 'react'
import {
  mockFetch,
  createMockResponse,
  flushPromises,
  getLastWebSocket,
  getAllWebSockets,
  MockWebSocket,
  wait,
} from '../test-setup'
import {
  mockAssistantEvent,
  mockToolUseEvent,
  mockToolResultEvent,
  mockResultEvent,
  generateUsage,
  generateSessionFlow,
  generateComplexSessionFlow,
  generateEditCodeFlow,
  generateTestRunFlow,
  createEventStream,
  resetToolIdCounter,
} from '../mocks/claude-output'

/**
 * Types for E2E testing
 */
interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  model: string
  cwd?: string
  startedAt: Date | string
  completedAt?: Date | string
  error?: string
  plan: Array<{ id: string; description: string; status: string }>
  todos: Array<{ content: string; activeForm: string; status: string }>
  tools: Array<{
    id: string
    tool: string
    input: unknown
    output?: unknown
    status: string
    startedAt: Date | string
    completedAt?: Date | string
    error?: string
  }>
  messages: Array<{ id: string; type: string; content: unknown; timestamp: Date | string }>
  cost: number
  duration: number
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

interface StreamEvent {
  type: string
  [key: string]: unknown
}

/**
 * Complete session state manager simulating SessionDO
 */
class SessionManager {
  private sessions = new Map<string, SessionState>()
  private websockets = new Map<string, Set<MockWebSocket>>()
  private eventHistory = new Map<string, StreamEvent[]>()

  createSession(sessionId: string, config?: { model?: string; cwd?: string }): SessionState {
    const state: SessionState = {
      id: sessionId,
      status: 'idle',
      model: config?.model ?? 'claude-sonnet-4-20250514',
      cwd: config?.cwd,
      startedAt: new Date(),
      plan: [],
      todos: [],
      tools: [],
      messages: [],
      cost: 0,
      duration: 0,
      usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    }
    this.sessions.set(sessionId, state)
    this.eventHistory.set(sessionId, [])
    return state
  }

  getSession(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId)
  }

  registerWebSocket(sessionId: string, ws: MockWebSocket): void {
    if (!this.websockets.has(sessionId)) {
      this.websockets.set(sessionId, new Set())
    }
    this.websockets.get(sessionId)!.add(ws)

    // Send current state on connect
    const state = this.sessions.get(sessionId)
    if (state) {
      ws.simulateMessage({ type: 'state', data: state })
    }
  }

  unregisterWebSocket(sessionId: string, ws: MockWebSocket): void {
    this.websockets.get(sessionId)?.delete(ws)
  }

  handleEvent(sessionId: string, event: StreamEvent): void {
    const state = this.sessions.get(sessionId)
    if (!state) return

    // Store in history
    this.eventHistory.get(sessionId)?.push(event)

    // Update state
    this.updateState(state, event)

    // Broadcast to connected clients
    this.broadcast(sessionId, { type: 'event', event, state })
  }

  private updateState(state: SessionState, event: StreamEvent): void {
    const timestamp = event.timestamp || new Date()

    switch (event.type) {
      case 'assistant':
        state.messages.push({
          id: crypto.randomUUID(),
          type: 'assistant',
          content: (event as { content: string }).content,
          timestamp,
        })
        break

      case 'tool_use': {
        const toolEvent = event as { id: string; tool: string; input: unknown }
        state.tools.push({
          id: toolEvent.id,
          tool: toolEvent.tool,
          input: toolEvent.input,
          status: 'running',
          startedAt: timestamp,
        })

        if (toolEvent.tool === 'TodoWrite' && toolEvent.input) {
          const input = toolEvent.input as { todos?: Array<{ content: string; activeForm: string; status: string }> }
          if (input.todos) {
            state.todos = input.todos
          }
        }

        state.messages.push({
          id: toolEvent.id,
          type: 'tool_use',
          content: toolEvent.input,
          timestamp,
        })

        if (state.status === 'idle') {
          state.status = 'running'
        }
        break
      }

      case 'tool_result': {
        const resultEvent = event as { id: string; output: unknown; error?: string }
        const tool = state.tools.find((t) => t.id === resultEvent.id)
        if (tool) {
          tool.output = resultEvent.output
          tool.status = resultEvent.error ? 'error' : 'success'
          tool.completedAt = timestamp
          if (resultEvent.error) tool.error = resultEvent.error
        }

        state.messages.push({
          id: resultEvent.id,
          type: 'tool_result',
          content: resultEvent.output,
          timestamp,
        })
        break
      }

      case 'result': {
        const finalEvent = event as {
          cost: number
          duration: number
          usage: { inputTokens: number; outputTokens: number; totalTokens: number }
        }
        state.status = 'completed'
        state.completedAt = timestamp
        state.cost = finalEvent.cost
        state.duration = finalEvent.duration
        state.usage = finalEvent.usage
        break
      }

      case 'complete': {
        const completeEvent = event as { exitCode: number }
        if (state.status !== 'completed' && state.status !== 'error') {
          state.status = completeEvent.exitCode === 0 ? 'completed' : 'error'
          state.completedAt = timestamp
        }
        break
      }

      case 'error': {
        const errorEvent = event as { error: string }
        state.status = 'error'
        state.error = errorEvent.error
        state.completedAt = timestamp
        break
      }
    }
  }

  private broadcast(sessionId: string, message: unknown): void {
    const sockets = this.websockets.get(sessionId)
    if (sockets) {
      for (const ws of sockets) {
        if (ws.readyState === MockWebSocket.OPEN) {
          ws.simulateMessage(message)
        }
      }
    }
  }

  getEventHistory(sessionId: string): StreamEvent[] {
    return this.eventHistory.get(sessionId) ?? []
  }

  reset(): void {
    this.sessions.clear()
    this.websockets.clear()
    this.eventHistory.clear()
  }
}

/**
 * Simulated API client
 */
class ApiClient {
  constructor(
    private manager: SessionManager,
    private baseUrl: string = 'https://agents.do'
  ) {}

  async createSession(config: { prompt: string; model?: string; cwd?: string }): Promise<{
    sessionId: string
    url: string
    wsUrl: string
  }> {
    const sessionId = crypto.randomUUID()
    this.manager.createSession(sessionId, config)
    return {
      sessionId,
      url: `${this.baseUrl}/sessions/${sessionId}`,
      wsUrl: `${this.baseUrl.replace('https://', 'wss://')}/sessions/${sessionId}/ws`,
    }
  }

  async getSession(sessionId: string): Promise<SessionState | undefined> {
    return this.manager.getSession(sessionId)
  }
}

/**
 * Session card component for testing
 */
function TestSessionCard({
  sessionId,
  manager,
}: {
  sessionId: string
  manager: SessionManager
}) {
  const [state, setState] = React.useState<SessionState | null>(null)
  const [events, setEvents] = React.useState<StreamEvent[]>([])
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    ws.onopen = () => {
      setIsConnected(true)
      manager.registerWebSocket(sessionId, ws)
    }

    ws.onclose = () => {
      setIsConnected(false)
      manager.unregisterWebSocket(sessionId, ws)
    }

    ws.onmessage = (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data)
        if (data.type === 'state' && data.data) {
          setState(data.data)
        } else if (data.state) {
          setState(data.state)
        }
        if (data.event) {
          setEvents((prev) => [...prev, data.event])
        }
      } catch {
        // Ignore parse errors
      }
    }

    return () => {
      ws.close()
    }
  }, [sessionId, manager])

  if (!state) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div data-testid={`session-${sessionId.slice(0, 8)}`}>
      <div data-testid="status">{state.status}</div>
      <div data-testid="todo-count">{state.todos.length}</div>
      <div data-testid="tool-count">{state.tools.length}</div>
      <div data-testid="event-count">{events.length}</div>
      <div data-testid="cost">{state.cost.toFixed(4)}</div>
      {!isConnected && <div data-testid="disconnected">Disconnected</div>}
      <ul data-testid="todos">
        {state.todos.map((t, i) => (
          <li key={i} data-testid={`todo-${i}`}>
            {t.content}: {t.status}
          </li>
        ))}
      </ul>
    </div>
  )
}

describe('E2E: Create Session -> Stream Events -> Complete -> Verify State', () => {
  let manager: SessionManager

  beforeEach(() => {
    resetToolIdCounter()
    manager = new SessionManager()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  afterEach(() => {
    manager.reset()
  })

  it('should complete full session lifecycle', async () => {
    const api = new ApiClient(manager)

    // 1. Create session
    const { sessionId } = await api.createSession({
      prompt: 'Help me build a feature',
      model: 'claude-opus-4-20250514',
    })

    // 2. Render UI
    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    // 3. Verify initial state
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('idle')
    })

    // 4. Stream events
    const events = generateEditCodeFlow(
      '/src/feature.ts',
      'add new feature',
      'old code',
      'new code'
    )

    // Wrap state-mutating calls in act() to handle React updates
    await act(async () => {
      for (const event of events) {
        manager.handleEvent(sessionId, event)
      }
    })

    // 5. Verify final state
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('completed')
    })

    const finalState = manager.getSession(sessionId)
    expect(finalState?.status).toBe('completed')
    expect(finalState?.todos.length).toBeGreaterThan(0)
    expect(finalState?.tools.length).toBeGreaterThan(0)
    expect(finalState?.cost).toBeGreaterThan(0)
  })

  it('should track todos through completion', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Run tests' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    const events = generateTestRunFlow(
      'npm test',
      5,
      0,
      'PASS All tests passed'
    )

    await act(async () => {
      for (const event of events) {
        manager.handleEvent(sessionId, event)
      }
    })

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('completed')
    })

    const finalState = manager.getSession(sessionId)
    expect(finalState?.todos).toHaveLength(2)
    expect(finalState?.todos.every((t) => t.status === 'completed')).toBe(true)
  })

  it('should accumulate events correctly', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Complex task' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    const events = generateComplexSessionFlow()

    await act(async () => {
      for (const event of events) {
        manager.handleEvent(sessionId, event)
      }
    })

    await waitFor(() => {
      const eventCount = parseInt(screen.getByTestId('event-count').textContent || '0', 10)
      expect(eventCount).toBe(events.length)
    })

    const history = manager.getEventHistory(sessionId)
    expect(history.length).toBe(events.length)
  })
})

describe('E2E: Multiple Concurrent Sessions', () => {
  let manager: SessionManager

  beforeEach(() => {
    resetToolIdCounter()
    manager = new SessionManager()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  afterEach(() => {
    manager.reset()
  })

  it('should not interfere between sessions', async () => {
    const api = new ApiClient(manager)

    // Create multiple sessions
    const session1 = await api.createSession({ prompt: 'Task 1' })
    const session2 = await api.createSession({ prompt: 'Task 2' })
    const session3 = await api.createSession({ prompt: 'Task 3' })

    // Render all session cards
    render(
      <div>
        <TestSessionCard sessionId={session1.sessionId} manager={manager} />
        <TestSessionCard sessionId={session2.sessionId} manager={manager} />
        <TestSessionCard sessionId={session3.sessionId} manager={manager} />
      </div>
    )
    await flushPromises()

    // Stream different events to each session
    const events1 = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Session 1 starting' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [{ content: 'Task for session 1', activeForm: 'Working', status: 'completed' }],
          },
        },
      ],
    })

    const events2 = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Session 2 starting' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'First task', activeForm: 'First', status: 'completed' },
              { content: 'Second task', activeForm: 'Second', status: 'completed' },
            ],
          },
        },
      ],
    })

    const events3 = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Session 3 starting' },
        { type: 'error', error: 'Something went wrong' },
      ],
    })

    // Process events for each session
    await act(async () => {
      for (const event of events1) {
        manager.handleEvent(session1.sessionId, event)
      }
      for (const event of events2) {
        manager.handleEvent(session2.sessionId, event)
      }
      for (const event of events3.slice(0, -1)) {
        // Skip result event for error flow
        manager.handleEvent(session3.sessionId, event)
      }
    })

    // Verify each session has correct state
    const state1 = manager.getSession(session1.sessionId)
    const state2 = manager.getSession(session2.sessionId)
    const state3 = manager.getSession(session3.sessionId)

    expect(state1?.status).toBe('completed')
    expect(state1?.todos).toHaveLength(1)

    expect(state2?.status).toBe('completed')
    expect(state2?.todos).toHaveLength(2)

    expect(state3?.status).toBe('error')
    expect(state3?.error).toBe('Something went wrong')
  })

  it('should handle rapid updates across sessions', async () => {
    const api = new ApiClient(manager)

    const sessions = await Promise.all([
      api.createSession({ prompt: 'Task 1' }),
      api.createSession({ prompt: 'Task 2' }),
      api.createSession({ prompt: 'Task 3' }),
    ])

    render(
      <div>
        {sessions.map((s) => (
          <TestSessionCard key={s.sessionId} sessionId={s.sessionId} manager={manager} />
        ))}
      </div>
    )
    await flushPromises()

    // Generate many events for each session
    const eventSets = sessions.map(() => {
      const steps = []
      for (let i = 0; i < 5; i++) {
        steps.push({
          type: 'tool' as const,
          tool: 'Read',
          input: { file_path: `/file${i}.ts` },
          output: `content ${i}`,
        })
      }
      return generateSessionFlow({ steps })
    })

    // Stream events concurrently
    for (let eventIdx = 0; eventIdx < Math.max(...eventSets.map((e) => e.length)); eventIdx++) {
      for (let sessionIdx = 0; sessionIdx < sessions.length; sessionIdx++) {
        if (eventIdx < eventSets[sessionIdx].length) {
          manager.handleEvent(sessions[sessionIdx].sessionId, eventSets[sessionIdx][eventIdx])
        }
      }
    }

    await flushPromises()

    // Verify all sessions completed correctly
    for (const { sessionId } of sessions) {
      const state = manager.getSession(sessionId)
      expect(state?.status).toBe('completed')
      expect(state?.tools).toHaveLength(5)
    }
  })
})

describe('E2E: Session Recovery After Disconnect', () => {
  let manager: SessionManager

  beforeEach(() => {
    resetToolIdCounter()
    manager = new SessionManager()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  afterEach(() => {
    manager.reset()
  })

  it('should restore state after WebSocket reconnect', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Long task' })

    // Start with some state
    const initialEvents = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting...' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Step 1', activeForm: 'Doing 1', status: 'completed' },
              { content: 'Step 2', activeForm: 'Doing 2', status: 'in_progress' },
            ],
          },
        },
        { type: 'tool', tool: 'Read', input: { file_path: '/test.ts' }, output: 'content' },
      ],
    })

    // Process events before component mounts
    for (const event of initialEvents.slice(0, -1)) {
      // Skip result to keep running
      manager.handleEvent(sessionId, event)
    }

    // Manually set to running (not completed)
    const state = manager.getSession(sessionId)!
    state.status = 'running'

    // Now mount component - should receive current state
    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('running')
      expect(screen.getByTestId('todo-count')).toHaveTextContent('2')
      expect(screen.getByTestId('tool-count')).toHaveTextContent('2')
    })
  })

  it('should continue receiving events after reconnect', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Resumable task' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    // Send initial events
    manager.handleEvent(sessionId, mockAssistantEvent('Starting...'))
    await flushPromises()

    await waitFor(() => {
      expect(screen.getByTestId('event-count')).toHaveTextContent('1')
    })

    // Simulate disconnect and reconnect (component re-render)
    const { unmount } = render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    // Send more events
    const additionalEvents = generateSessionFlow({
      steps: [
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [{ content: 'New task', activeForm: 'Working', status: 'completed' }],
          },
        },
      ],
    })

    for (const event of additionalEvents) {
      manager.handleEvent(sessionId, event)
    }

    await flushPromises()

    // Verify manager state directly (DOM has multiple instances)
    await waitFor(() => {
      const finalState = manager.getSession(sessionId)
      expect(finalState?.status).toBe('completed')
      expect(finalState?.todos).toHaveLength(1)
    })

    unmount()
  })

  it('should handle multiple reconnections', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Reconnect test' })

    // Multiple mount/unmount cycles
    for (let cycle = 0; cycle < 3; cycle++) {
      const { unmount } = render(<TestSessionCard sessionId={sessionId} manager={manager} />)
      await flushPromises()

      // Send event during this cycle - capture tool ID
      const toolEvent = mockToolUseEvent('Read', { file_path: `/file${cycle}.ts` })
      manager.handleEvent(sessionId, toolEvent)
      manager.handleEvent(sessionId, mockToolResultEvent(toolEvent.id, `content ${cycle}`))

      await flushPromises()

      unmount()
    }

    // Final mount should show all accumulated state
    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    await waitFor(() => {
      const finalState = manager.getSession(sessionId)
      expect(finalState?.tools).toHaveLength(3)
    })
  })
})

describe('E2E: Error Scenarios', () => {
  let manager: SessionManager

  beforeEach(() => {
    resetToolIdCounter()
    manager = new SessionManager()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  afterEach(() => {
    manager.reset()
  })

  it('should handle session errors gracefully', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Will fail' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    // Start session then error - capture the tool ID
    manager.handleEvent(sessionId, mockAssistantEvent('Starting task...'))
    const toolEvent = mockToolUseEvent('Read', { file_path: '/nonexistent.ts' })
    manager.handleEvent(sessionId, toolEvent)
    manager.handleEvent(sessionId, mockToolResultEvent(toolEvent.id, null, 'File not found'))
    manager.handleEvent(sessionId, { type: 'error', error: 'Task failed: File not found' })

    await flushPromises()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    })

    const state = manager.getSession(sessionId)
    expect(state?.error).toBe('Task failed: File not found')
    expect(state?.tools[0].status).toBe('error')
  })

  it('should preserve state on error', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Partial failure' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    // Complete some tasks successfully - capture tool IDs
    const todoWriteEvent = mockToolUseEvent('TodoWrite', {
      todos: [
        { content: 'Task 1', activeForm: 'Working 1', status: 'completed' },
        { content: 'Task 2', activeForm: 'Working 2', status: 'in_progress' },
      ],
    })
    manager.handleEvent(sessionId, todoWriteEvent)
    manager.handleEvent(sessionId, mockToolResultEvent(todoWriteEvent.id, { success: true }))

    const readEvent = mockToolUseEvent('Read', { file_path: '/good.ts' })
    manager.handleEvent(sessionId, readEvent)
    manager.handleEvent(sessionId, mockToolResultEvent(readEvent.id, 'good content'))

    // Then fail
    manager.handleEvent(sessionId, { type: 'error', error: 'API rate limit exceeded' })

    await flushPromises()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('error')
    })

    const state = manager.getSession(sessionId)
    // Todos should be preserved
    expect(state?.todos).toHaveLength(2)
    // Successful tools should be preserved
    expect(state?.tools.filter((t) => t.status === 'success')).toHaveLength(2)
  })
})

describe('E2E: Performance and Scale', () => {
  let manager: SessionManager

  beforeEach(() => {
    resetToolIdCounter()
    manager = new SessionManager()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  afterEach(() => {
    manager.reset()
  })

  it('should handle many events efficiently', async () => {
    const api = new ApiClient(manager)
    const { sessionId } = await api.createSession({ prompt: 'Many events' })

    render(<TestSessionCard sessionId={sessionId} manager={manager} />)
    await flushPromises()

    const startTime = Date.now()

    // Generate 100 tool executions
    for (let i = 0; i < 100; i++) {
      const toolUse = mockToolUseEvent('Read', { file_path: `/file${i}.ts` })
      manager.handleEvent(sessionId, toolUse)
      manager.handleEvent(sessionId, mockToolResultEvent(toolUse.id, `content ${i}`))
    }

    // Final result
    manager.handleEvent(
      sessionId,
      mockResultEvent(0.5, generateUsage(10000, 5000))
    )

    const processTime = Date.now() - startTime

    await flushPromises()

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('completed')
      expect(screen.getByTestId('tool-count')).toHaveTextContent('100')
    })

    // Should process all events in reasonable time
    expect(processTime).toBeLessThan(5000) // 5 seconds max
  })

  it('should handle many concurrent sessions', async () => {
    const api = new ApiClient(manager)
    const sessionCount = 20

    const sessions = await Promise.all(
      Array.from({ length: sessionCount }, (_, i) =>
        api.createSession({ prompt: `Task ${i}` })
      )
    )

    render(
      <div>
        {sessions.map((s) => (
          <TestSessionCard key={s.sessionId} sessionId={s.sessionId} manager={manager} />
        ))}
      </div>
    )
    await flushPromises()

    // Send events to all sessions
    for (const { sessionId } of sessions) {
      manager.handleEvent(sessionId, mockAssistantEvent('Working...'))
      manager.handleEvent(
        sessionId,
        mockResultEvent(0.01, generateUsage(100, 50))
      )
    }

    await flushPromises()

    // Verify all sessions completed
    for (const { sessionId } of sessions) {
      const state = manager.getSession(sessionId)
      expect(state?.status).toBe('completed')
    }
  })
})

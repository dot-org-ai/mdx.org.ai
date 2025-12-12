/**
 * Service + Plan Integration Tests
 *
 * Tests the interaction between @mdxai/service and @mdxui/plan components.
 * Verifies:
 * - Dashboard component connects to service WebSocket
 * - SessionCard receives and renders state updates
 * - Multiple sessions update independently
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
  mockResultEvent,
  generateUsage,
  generateComplexSessionFlow,
  resetToolIdCounter,
} from '../mocks/claude-output'

/**
 * SessionState type matching @mdxui/plan
 */
interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  model: string
  cwd: string
  startedAt: Date | string
  completedAt?: Date | string
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
  }>
  messages: Array<{ role: string; content: string; timestamp: Date | string }>
  cost: number
  duration: number
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number }
}

/**
 * Create a mock session state for testing
 */
function createMockSessionState(overrides: Partial<SessionState> = {}): SessionState {
  return {
    id: 'session-123',
    status: 'running',
    model: 'claude-sonnet-4-20250514',
    cwd: '/home/user/project',
    startedAt: new Date().toISOString(),
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
    ...overrides,
  }
}

/**
 * Simple mock components for testing
 */
function MockSessionCard({
  sessionId,
  baseUrl = 'https://agents.do',
}: {
  sessionId: string
  baseUrl?: string
}) {
  const [state, setState] = React.useState<SessionState | null>(null)
  const [isConnected, setIsConnected] = React.useState(false)

  React.useEffect(() => {
    const wsUrl = baseUrl.replace(/^http/, 'ws')
    const ws = new WebSocket(`${wsUrl}/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    ws.onopen = () => setIsConnected(true)
    ws.onclose = () => setIsConnected(false)

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        if (data.state) setState(data.state)
        else if (data.type === 'state' && data.data) setState(data.data)
      } catch {
        // Ignore parse errors
      }
    }

    return () => ws.close()
  }, [sessionId, baseUrl])

  if (!state) {
    return <div data-testid="loading">Loading...</div>
  }

  return (
    <div data-testid={`session-card-${sessionId}`}>
      <div data-testid="session-id">{state.id}</div>
      <div data-testid="session-status">{state.status}</div>
      <div data-testid="session-model">{state.model}</div>
      <div data-testid="todo-count">{state.todos.length} todos</div>
      <div data-testid="tool-count">{state.tools.length} tools</div>
      <div data-testid="cost">${state.cost.toFixed(4)}</div>
      {!isConnected && <div data-testid="reconnecting">Reconnecting...</div>}
      {state.todos.map((todo, i) => (
        <div key={i} data-testid={`todo-${i}`}>
          {todo.content}: {todo.status}
        </div>
      ))}
    </div>
  )
}

function MockDashboard({ sessionIds, baseUrl }: { sessionIds: string[]; baseUrl?: string }) {
  return (
    <div data-testid="dashboard">
      {sessionIds.map((id) => (
        <MockSessionCard key={id} sessionId={id} baseUrl={baseUrl} />
      ))}
    </div>
  )
}

describe('Service + Plan Integration: WebSocket Connection', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should connect SessionCard to service WebSocket', async () => {
    const sessionId = 'plan-session-001'

    render(<MockSessionCard sessionId={sessionId} />)

    await flushPromises()

    const ws = getLastWebSocket()
    expect(ws).toBeDefined()
    expect(ws?.url).toContain(sessionId)
    expect(ws?.readyState).toBe(MockWebSocket.OPEN)
  })

  it('should receive state via WebSocket and render', async () => {
    const sessionId = 'plan-session-002'

    render(<MockSessionCard sessionId={sessionId} />)

    // Initially shows loading
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    await flushPromises()
    const ws = getLastWebSocket()

    // Simulate service sending state
    const state = createMockSessionState({
      id: sessionId,
      status: 'running',
      model: 'claude-opus-4-20250514',
    })

    act(() => {
      ws?.simulateMessage({ type: 'state', data: state })
    })

    await waitFor(() => {
      expect(screen.getByTestId('session-id')).toHaveTextContent(sessionId)
      expect(screen.getByTestId('session-status')).toHaveTextContent('running')
      expect(screen.getByTestId('session-model')).toHaveTextContent('claude-opus-4-20250514')
    })
  })

  it('should update state when receiving events', async () => {
    const sessionId = 'plan-session-003'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Send initial state
    const initialState = createMockSessionState({
      id: sessionId,
      status: 'running',
      todos: [],
    })

    act(() => {
      ws?.simulateMessage({ state: initialState })
    })

    await waitFor(() => {
      expect(screen.getByTestId('todo-count')).toHaveTextContent('0 todos')
    })

    // Send updated state with todos
    const updatedState = createMockSessionState({
      id: sessionId,
      status: 'running',
      todos: [
        { content: 'Read file', activeForm: 'Reading file', status: 'in_progress' },
        { content: 'Edit code', activeForm: 'Editing code', status: 'pending' },
      ],
    })

    act(() => {
      ws?.simulateMessage({ state: updatedState })
    })

    await waitFor(() => {
      expect(screen.getByTestId('todo-count')).toHaveTextContent('2 todos')
      expect(screen.getByTestId('todo-0')).toHaveTextContent('Read file: in_progress')
      expect(screen.getByTestId('todo-1')).toHaveTextContent('Edit code: pending')
    })
  })

  it('should show reconnecting indicator when disconnected', async () => {
    const sessionId = 'plan-session-004'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Send state to get past loading
    act(() => {
      ws?.simulateMessage({ state: createMockSessionState({ id: sessionId }) })
    })

    await waitFor(() => {
      expect(screen.queryByTestId('reconnecting')).not.toBeInTheDocument()
    })

    // Disconnect
    act(() => {
      ws?.close()
    })

    await waitFor(() => {
      expect(screen.getByTestId('reconnecting')).toBeInTheDocument()
    })
  })
})

describe('Service + Plan Integration: Dashboard with Multiple Sessions', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should render multiple session cards', async () => {
    const sessionIds = ['multi-001', 'multi-002', 'multi-003']

    render(<MockDashboard sessionIds={sessionIds} />)
    await flushPromises()

    const websockets = getAllWebSockets()
    expect(websockets).toHaveLength(3)

    // Each session should connect to its own URL
    expect(websockets.map((ws) => ws.url)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('multi-001'),
        expect.stringContaining('multi-002'),
        expect.stringContaining('multi-003'),
      ])
    )
  })

  it('should update sessions independently', async () => {
    const sessionIds = ['indep-001', 'indep-002']

    render(<MockDashboard sessionIds={sessionIds} />)
    await flushPromises()

    const websockets = getAllWebSockets()

    // Send different states to each session
    act(() => {
      websockets[0].simulateMessage({
        state: createMockSessionState({
          id: 'indep-001',
          status: 'running',
          cost: 0.05,
        }),
      })
      websockets[1].simulateMessage({
        state: createMockSessionState({
          id: 'indep-002',
          status: 'completed',
          cost: 0.15,
        }),
      })
    })

    await waitFor(() => {
      const card1 = screen.getByTestId('session-card-indep-001')
      const card2 = screen.getByTestId('session-card-indep-002')

      expect(card1.querySelector('[data-testid="session-status"]')).toHaveTextContent('running')
      expect(card1.querySelector('[data-testid="cost"]')).toHaveTextContent('$0.0500')

      expect(card2.querySelector('[data-testid="session-status"]')).toHaveTextContent('completed')
      expect(card2.querySelector('[data-testid="cost"]')).toHaveTextContent('$0.1500')
    })
  })

  it('should handle mixed session states', async () => {
    const sessionIds = ['mixed-001', 'mixed-002', 'mixed-003']

    render(<MockDashboard sessionIds={sessionIds} />)
    await flushPromises()

    const websockets = getAllWebSockets()

    // Session 1: idle
    act(() => {
      websockets[0].simulateMessage({
        state: createMockSessionState({
          id: 'mixed-001',
          status: 'idle',
          todos: [],
        }),
      })
    })

    // Session 2: running with todos
    act(() => {
      websockets[1].simulateMessage({
        state: createMockSessionState({
          id: 'mixed-002',
          status: 'running',
          todos: [
            { content: 'Task A', activeForm: 'Doing A', status: 'in_progress' },
          ],
        }),
      })
    })

    // Session 3: error
    act(() => {
      websockets[2].simulateMessage({
        state: createMockSessionState({
          id: 'mixed-003',
          status: 'error',
          todos: [
            { content: 'Failed task', activeForm: 'Failing', status: 'pending' },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('session-card-mixed-001')).toBeInTheDocument()
      expect(screen.getByTestId('session-card-mixed-002')).toBeInTheDocument()
      expect(screen.getByTestId('session-card-mixed-003')).toBeInTheDocument()

      expect(
        screen.getByTestId('session-card-mixed-001').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('idle')

      expect(
        screen.getByTestId('session-card-mixed-002').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('running')

      expect(
        screen.getByTestId('session-card-mixed-003').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('error')
    })
  })

  it('should handle one session completing while another is running', async () => {
    const sessionIds = ['race-001', 'race-002']

    render(<MockDashboard sessionIds={sessionIds} />)
    await flushPromises()

    const websockets = getAllWebSockets()

    // Both start running
    act(() => {
      websockets[0].simulateMessage({
        state: createMockSessionState({
          id: 'race-001',
          status: 'running',
        }),
      })
      websockets[1].simulateMessage({
        state: createMockSessionState({
          id: 'race-002',
          status: 'running',
        }),
      })
    })

    await waitFor(() => {
      expect(
        screen.getByTestId('session-card-race-001').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('running')
      expect(
        screen.getByTestId('session-card-race-002').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('running')
    })

    // Session 1 completes
    act(() => {
      websockets[0].simulateMessage({
        state: createMockSessionState({
          id: 'race-001',
          status: 'completed',
          cost: 0.10,
        }),
      })
    })

    await waitFor(() => {
      expect(
        screen.getByTestId('session-card-race-001').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('completed')
      // Session 2 should still be running
      expect(
        screen.getByTestId('session-card-race-002').querySelector('[data-testid="session-status"]')
      ).toHaveTextContent('running')
    })
  })
})

describe('Service + Plan Integration: Real-time State Updates', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should update todos in real-time', async () => {
    const sessionId = 'realtime-001'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Initial state
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          todos: [
            { content: 'Task 1', activeForm: 'Doing task 1', status: 'pending' },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('todo-0')).toHaveTextContent('Task 1: pending')
    })

    // Update to in_progress
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          todos: [
            { content: 'Task 1', activeForm: 'Doing task 1', status: 'in_progress' },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('todo-0')).toHaveTextContent('Task 1: in_progress')
    })

    // Complete
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          todos: [
            { content: 'Task 1', activeForm: 'Doing task 1', status: 'completed' },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('todo-0')).toHaveTextContent('Task 1: completed')
    })
  })

  it('should update tool count as tools execute', async () => {
    const sessionId = 'realtime-002'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // No tools initially
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          tools: [],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('tool-count')).toHaveTextContent('0 tools')
    })

    // Add tools progressively
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          tools: [
            { id: 't1', tool: 'Read', input: {}, status: 'running', startedAt: new Date().toISOString() },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('tool-count')).toHaveTextContent('1 tools')
    })

    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          tools: [
            { id: 't1', tool: 'Read', input: {}, status: 'success', startedAt: new Date().toISOString() },
            { id: 't2', tool: 'Write', input: {}, status: 'running', startedAt: new Date().toISOString() },
          ],
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('tool-count')).toHaveTextContent('2 tools')
    })
  })

  it('should update cost in real-time', async () => {
    const sessionId = 'realtime-003'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Initial cost
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          cost: 0.01,
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('cost')).toHaveTextContent('$0.0100')
    })

    // Cost increases
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          cost: 0.05,
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('cost')).toHaveTextContent('$0.0500')
    })

    // Final cost
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          status: 'completed',
          cost: 0.12,
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('cost')).toHaveTextContent('$0.1200')
      expect(screen.getByTestId('session-status')).toHaveTextContent('completed')
    })
  })
})

describe('Service + Plan Integration: Error Handling', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should handle WebSocket errors gracefully', async () => {
    const sessionId = 'error-001'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Simulate error
    act(() => {
      ws?.simulateError(new Error('Connection failed'))
    })

    // Should still show loading (no state received)
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('should handle malformed WebSocket messages', async () => {
    const sessionId = 'error-002'
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Send malformed message (direct string, not JSON)
    act(() => {
      ws?.onmessage?.(new MessageEvent('message', { data: 'not valid json' }))
    })

    // Should still show loading
    expect(screen.getByTestId('loading')).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('should handle session error state', async () => {
    const sessionId = 'error-003'

    render(<MockSessionCard sessionId={sessionId} />)
    await flushPromises()
    const ws = getLastWebSocket()

    // Send error state
    act(() => {
      ws?.simulateMessage({
        state: createMockSessionState({
          id: sessionId,
          status: 'error',
        }),
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('session-status')).toHaveTextContent('error')
    })
  })
})

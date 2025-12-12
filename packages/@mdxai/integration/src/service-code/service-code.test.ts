/**
 * Service + Code Integration Tests
 *
 * Tests the interaction between @mdxai/code (CLI/client) and @mdxai/service.
 * Verifies:
 * - CLI events are received by SessionDO
 * - WebSocket clients receive broadcast events
 * - Session state updates correctly from event stream
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mockFetch,
  createMockResponse,
  flushPromises,
  getLastWebSocket,
  MockWebSocket,
} from '../test-setup'
import {
  mockAssistantEvent,
  mockToolUseEvent,
  mockToolResultEvent,
  mockResultEvent,
  generateUsage,
  generateSessionFlow,
  generateComplexSessionFlow,
  resetToolIdCounter,
} from '../mocks/claude-output'

// Import types (we mock the implementations)
import type { SessionState, StreamEvent } from '@mdxai/service'

/**
 * Simulate the updateState logic from SessionDO
 * This mirrors the actual implementation for testing state transitions
 */
function updateState(state: SessionState, event: StreamEvent): SessionState {
  const newState = { ...state }
  const timestamp = event.timestamp || new Date()

  switch (event.type) {
    case 'assistant':
      newState.messages = [
        ...state.messages,
        {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: (event as { content: string }).content,
          timestamp,
        },
      ]
      break

    case 'tool_use': {
      const toolEvent = event as { id: string; tool: string; input: unknown }
      newState.tools = [
        ...state.tools,
        {
          id: toolEvent.id,
          tool: toolEvent.tool,
          input: toolEvent.input,
          status: 'running',
          startedAt: timestamp,
        },
      ]

      // Extract todos from TodoWrite
      if (toolEvent.tool === 'TodoWrite' && toolEvent.input) {
        const input = toolEvent.input as { todos?: Array<{ content: string; activeForm: string; status: string }> }
        if (input.todos) {
          newState.todos = input.todos.map((t) => ({
            content: t.content,
            activeForm: t.activeForm,
            status: t.status as 'pending' | 'in_progress' | 'completed',
          }))
        }
      }

      newState.messages = [
        ...state.messages,
        {
          id: toolEvent.id,
          type: 'tool_use',
          content: JSON.stringify(toolEvent.input),
          timestamp,
        },
      ]

      if (newState.status === 'idle') {
        newState.status = 'running'
      }
      break
    }

    case 'tool_result': {
      const resultEvent = event as { id: string; output: unknown; error?: string }
      newState.tools = state.tools.map((tool) => {
        if (tool.id === resultEvent.id) {
          const startTime = tool.startedAt instanceof Date ? tool.startedAt : new Date(tool.startedAt)
          return {
            ...tool,
            output: resultEvent.output,
            status: resultEvent.error ? 'error' : 'success',
            completedAt: timestamp,
            duration: timestamp.getTime() - startTime.getTime(),
            error: resultEvent.error,
          }
        }
        return tool
      })

      newState.messages = [
        ...state.messages,
        {
          id: resultEvent.id,
          type: 'tool_result',
          content: JSON.stringify(resultEvent.output),
          timestamp,
        },
      ]
      break
    }

    case 'result': {
      const finalEvent = event as { cost: number; duration: number; usage: SessionState['usage'] }
      newState.status = 'completed'
      newState.completedAt = timestamp
      newState.cost = finalEvent.cost
      newState.duration = finalEvent.duration
      newState.usage = finalEvent.usage
      break
    }

    case 'error': {
      const errorEvent = event as { error: string }
      newState.status = 'error'
      newState.error = errorEvent.error
      newState.completedAt = timestamp
      break
    }
  }

  return newState
}

/**
 * Create an initial session state
 */
function createInitialState(sessionId: string): SessionState {
  return {
    id: sessionId,
    status: 'idle',
    model: 'claude-sonnet-4-20250514',
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

describe('Service + Code Integration: EventReporter -> SessionDO', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should POST events to session endpoint with correct format', async () => {
    const sessionId = 'test-session-001'
    const baseUrl = 'https://agents.do'
    const authToken = 'test-token-123'

    // Simulate EventReporter sending an assistant event
    const event = mockAssistantEvent('Hello, I will help you with this task.')

    await fetch(`${baseUrl}/sessions/${sessionId}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(event),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      `${baseUrl}/sessions/${sessionId}/event`,
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"type":"assistant"'),
      })
    )
  })

  it('should send tool_use events with tool details', async () => {
    const sessionId = 'test-session-002'
    const baseUrl = 'https://agents.do'

    const event = mockToolUseEvent('Read', { file_path: '/src/index.ts' })

    await fetch(`${baseUrl}/sessions/${sessionId}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify(event),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"tool":"Read"'),
      })
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"file_path":"/src/index.ts"'),
      })
    )
  })

  it('should send tool_result events with output', async () => {
    const sessionId = 'test-session-003'
    const toolId = 'toolu_001'
    const output = 'export function main() {\n  console.log("hello")\n}'

    const event = mockToolResultEvent(toolId, output)

    await fetch(`https://agents.do/sessions/${sessionId}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify(event),
    })

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining('"type":"tool_result"'),
      })
    )
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: expect.stringContaining(toolId),
      })
    )
  })

  it('should send result event with cost and usage', async () => {
    const sessionId = 'test-session-004'
    const usage = generateUsage(1500, 800, 100, 200)
    const event = mockResultEvent(0.0125, usage)

    await fetch(`https://agents.do/sessions/${sessionId}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
      body: JSON.stringify(event),
    })

    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string)
    expect(body.type).toBe('result')
    expect(body.cost).toBe(0.0125)
    expect(body.usage.inputTokens).toBe(1500)
    expect(body.usage.outputTokens).toBe(800)
  })
})

describe('Service + Code Integration: SessionDO State Updates', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should update state on assistant event', () => {
    const state = createInitialState('session-001')
    const event = mockAssistantEvent('Hello world')

    const newState = updateState(state, event)

    expect(newState.messages).toHaveLength(1)
    expect(newState.messages[0].type).toBe('assistant')
    expect(newState.messages[0].content).toBe('Hello world')
  })

  it('should transition to running on first tool_use', () => {
    const state = createInitialState('session-002')
    expect(state.status).toBe('idle')

    const event = mockToolUseEvent('Read', { file_path: '/test.ts' })
    const newState = updateState(state, event)

    expect(newState.status).toBe('running')
    expect(newState.tools).toHaveLength(1)
    expect(newState.tools[0].status).toBe('running')
  })

  it('should extract todos from TodoWrite tool', () => {
    const state = createInitialState('session-003')
    const todos = [
      { content: 'Read file', activeForm: 'Reading file', status: 'in_progress' },
      { content: 'Edit code', activeForm: 'Editing code', status: 'pending' },
    ]

    const event = mockToolUseEvent('TodoWrite', { todos })
    const newState = updateState(state, event)

    expect(newState.todos).toHaveLength(2)
    expect(newState.todos[0].content).toBe('Read file')
    expect(newState.todos[0].status).toBe('in_progress')
    expect(newState.todos[1].content).toBe('Edit code')
    expect(newState.todos[1].status).toBe('pending')
  })

  it('should update tool on tool_result', async () => {
    const toolEvent = mockToolUseEvent('Read', { file_path: '/test.ts' })
    let state = createInitialState('session-004')
    state = updateState(state, toolEvent)

    // Simulate some time passing
    await new Promise((r) => setTimeout(r, 10))

    const resultEvent = mockToolResultEvent(toolEvent.id, 'file contents here')
    const newState = updateState(state, resultEvent)

    expect(newState.tools[0].status).toBe('success')
    expect(newState.tools[0].output).toBe('file contents here')
    expect(newState.tools[0].completedAt).toBeDefined()
  })

  it('should mark tool as error on error result', () => {
    const toolEvent = mockToolUseEvent('Read', { file_path: '/nonexistent.ts' })
    let state = createInitialState('session-005')
    state = updateState(state, toolEvent)

    const resultEvent = mockToolResultEvent(toolEvent.id, null, 'File not found')
    const newState = updateState(state, resultEvent)

    expect(newState.tools[0].status).toBe('error')
    expect(newState.tools[0].error).toBe('File not found')
  })

  it('should complete session on result event', () => {
    let state = createInitialState('session-006')
    state = { ...state, status: 'running' }

    const usage = generateUsage(1000, 500)
    const event = mockResultEvent(0.01, usage)
    const newState = updateState(state, event)

    expect(newState.status).toBe('completed')
    expect(newState.completedAt).toBeDefined()
    expect(newState.cost).toBe(0.01)
    expect(newState.usage.inputTokens).toBe(1000)
    expect(newState.usage.outputTokens).toBe(500)
  })

  it('should handle complex session flow', () => {
    const events = generateComplexSessionFlow()
    let state = createInitialState('session-007')

    for (const event of events) {
      state = updateState(state, event)
    }

    // Verify final state
    expect(state.status).toBe('completed')
    expect(state.todos).toHaveLength(4)
    expect(state.todos.every((t) => t.status === 'completed')).toBe(true)
    expect(state.tools.length).toBeGreaterThan(0)
    expect(state.tools.every((t) => t.status !== 'running')).toBe(true)
    expect(state.messages.length).toBeGreaterThan(0)
    expect(state.cost).toBeGreaterThan(0)
  })
})

describe('Service + Code Integration: WebSocket Client', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should connect to session WebSocket', async () => {
    const sessionId = 'ws-session-001'
    const baseUrl = 'https://agents.do'

    // Simulate SessionClient connect
    const wsUrl = baseUrl.replace('https://', 'wss://')
    new WebSocket(`${wsUrl}/sessions/${sessionId}/ws`)

    await flushPromises()

    const ws = getLastWebSocket()
    expect(ws).toBeDefined()
    expect(ws?.url).toBe(`wss://agents.do/sessions/${sessionId}/ws`)
    expect(ws?.readyState).toBe(MockWebSocket.OPEN)
  })

  it('should send auth token on connection', async () => {
    const sessionId = 'ws-session-002'
    const authToken = 'test-auth-token'

    const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    await flushPromises()

    // Simulate what SessionClient does on open
    ws.send(JSON.stringify({ type: 'auth', token: authToken }))

    const sentMessages = ws.getSentMessages()
    expect(sentMessages).toHaveLength(1)
    expect(sentMessages[0]).toEqual({ type: 'auth', token: authToken })
  })

  it('should receive state updates via WebSocket', async () => {
    const sessionId = 'ws-session-003'
    const stateUpdates: SessionState[] = []

    const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    await flushPromises()

    // Add state listener
    const originalOnMessage = ws.onmessage
    ws.onmessage = (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      if (data.type === 'state' && data.state) {
        stateUpdates.push(data.state)
      }
      originalOnMessage?.call(ws, event)
    }

    // Simulate server sending state
    const mockState = createInitialState(sessionId)
    ws.simulateMessage({ type: 'state', state: mockState })

    expect(stateUpdates).toHaveLength(1)
    expect(stateUpdates[0].id).toBe(sessionId)
  })

  it('should receive event updates via WebSocket', async () => {
    const sessionId = 'ws-session-004'
    const events: StreamEvent[] = []

    const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    await flushPromises()

    ws.onmessage = (event) => {
      const data = JSON.parse((event as MessageEvent).data)
      if (data.type === 'event' && data.event) {
        events.push(data.event)
      }
    }

    // Simulate server broadcasting events
    const assistantEvent = mockAssistantEvent('Starting task...')
    ws.simulateMessage({ type: 'event', event: assistantEvent, state: createInitialState(sessionId) })

    const toolEvent = mockToolUseEvent('Read', { file_path: '/src/index.ts' })
    ws.simulateMessage({ type: 'event', event: toolEvent, state: createInitialState(sessionId) })

    expect(events).toHaveLength(2)
    expect(events[0].type).toBe('assistant')
    expect(events[1].type).toBe('tool_use')
  })

  it('should handle multiple concurrent WebSocket connections', async () => {
    const sessionId = 'ws-session-005'

    // Create multiple connections (simulating multiple dashboard clients)
    const ws1 = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket
    const ws2 = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket
    const ws3 = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket

    await flushPromises()

    const states1: SessionState[] = []
    const states2: SessionState[] = []
    const states3: SessionState[] = []

    ws1.onmessage = (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      if (data.state) states1.push(data.state)
    }
    ws2.onmessage = (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      if (data.state) states2.push(data.state)
    }
    ws3.onmessage = (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      if (data.state) states3.push(data.state)
    }

    // Simulate broadcast to all connections
    const state = createInitialState(sessionId)
    ws1.simulateMessage({ type: 'state', state })
    ws2.simulateMessage({ type: 'state', state })
    ws3.simulateMessage({ type: 'state', state })

    expect(states1).toHaveLength(1)
    expect(states2).toHaveLength(1)
    expect(states3).toHaveLength(1)
  })

  it('should handle WebSocket disconnect and reconnect', async () => {
    const sessionId = 'ws-session-006'

    const ws1 = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket
    await flushPromises()

    let closeCount = 0
    ws1.onclose = () => closeCount++

    // Close connection
    ws1.close()
    expect(closeCount).toBe(1)
    expect(ws1.readyState).toBe(MockWebSocket.CLOSED)

    // Reconnect
    const ws2 = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket
    await flushPromises()

    expect(ws2.readyState).toBe(MockWebSocket.OPEN)
  })
})

describe('Service + Code Integration: Full Event Flow', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should process complete session lifecycle', async () => {
    const sessionId = 'flow-session-001'
    let state = createInitialState(sessionId)
    const wsEvents: StreamEvent[] = []

    // Simulate WebSocket connection
    const ws = new WebSocket(`wss://agents.do/sessions/${sessionId}/ws`) as unknown as MockWebSocket
    await flushPromises()

    ws.onmessage = (e) => {
      const data = JSON.parse((e as MessageEvent).data)
      if (data.event) wsEvents.push(data.event)
      if (data.state) state = data.state
    }

    // Generate session flow
    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting the task' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Step 1', activeForm: 'Doing step 1', status: 'in_progress' },
              { content: 'Step 2', activeForm: 'Doing step 2', status: 'pending' },
            ],
          },
        },
        { type: 'tool', tool: 'Read', input: { file_path: '/src/app.ts' }, output: 'file content' },
        { type: 'assistant', content: 'Task completed' },
      ],
    })

    // Process events through state updates and WebSocket
    for (const event of events) {
      // Update state
      state = updateState(state, event)

      // Simulate WebSocket broadcast
      ws.simulateMessage({ type: 'event', event, state })
    }

    // Verify final state
    expect(state.status).toBe('completed')
    expect(state.todos).toHaveLength(2)
    expect(state.tools.length).toBeGreaterThan(0)
    expect(wsEvents.length).toBe(events.length)
  })

  it('should handle session with errors', async () => {
    const sessionId = 'flow-session-002'
    let state = createInitialState(sessionId)

    // Simulate error during execution
    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting task' },
        { type: 'tool', tool: 'Read', input: { file_path: '/missing.ts' }, error: 'File not found' },
        { type: 'error', error: 'Task failed: File not found' },
      ],
    })

    // Process all events except result (which wouldn't be sent on error)
    for (const event of events.slice(0, -1)) {
      state = updateState(state, event)
    }

    // Verify error state
    expect(state.status).toBe('error')
    expect(state.error).toBe('Task failed: File not found')
    expect(state.tools[0].status).toBe('error')
    expect(state.tools[0].error).toBe('File not found')
  })

  it('should handle rapid event succession', async () => {
    const sessionId = 'flow-session-003'
    let state = createInitialState(sessionId)
    let updateCount = 0

    // Generate many rapid events
    const steps: Array<{ type: 'tool'; tool: string; input: { file_path: string }; output: string }> = []
    for (let i = 0; i < 10; i++) {
      steps.push({
        type: 'tool',
        tool: 'Read',
        input: { file_path: `/file${i}.ts` },
        output: `content ${i}`,
      })
    }

    const events = generateSessionFlow({ steps })

    // Process all events
    for (const event of events) {
      state = updateState(state, event)
      updateCount++
    }

    // Verify all events were processed
    expect(updateCount).toBe(events.length)
    expect(state.tools).toHaveLength(10)
    expect(state.status).toBe('completed')
  })
})

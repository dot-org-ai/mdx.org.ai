/**
 * Sandbox + Service Integration Tests
 *
 * Tests the interaction between @mdxai/sandbox and @mdxai/service.
 * Verifies:
 * - Sandbox reporter sends events to SessionDO
 * - Session state reflects sandbox execution progress
 * - Completion event triggers session status update
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  mockFetch,
  createMockResponse,
  flushPromises,
} from '../test-setup'
import {
  mockAssistantEvent,
  mockToolUseEvent,
  mockToolResultEvent,
  mockResultEvent,
  generateUsage,
  generateSessionFlow,
  generateComplexSessionFlow,
  createEventStream,
  eventsToStreamJson,
  resetToolIdCounter,
} from '../mocks/claude-output'

/**
 * Types matching sandbox package
 */
interface SandboxProcess {
  pid: number
  stdout: ReadableStream<Uint8Array>
  stderr: ReadableStream<Uint8Array>
  exitCode: Promise<number>
  kill: () => Promise<void>
}

interface StreamEvent {
  type: string
  [key: string]: unknown
}

interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  todos: Array<{ content: string; status: string }>
  tools: Array<{ id: string; status: string }>
  cost: number
  usage: { inputTokens: number; outputTokens: number; totalTokens: number }
}

/**
 * Create a mock sandbox process
 */
function createMockSandboxProcess(
  events: StreamEvent[],
  exitCode: number = 0
): SandboxProcess {
  return {
    pid: Math.floor(Math.random() * 10000) + 1000,
    stdout: createEventStream(events, 0),
    stderr: new ReadableStream<Uint8Array>(),
    exitCode: Promise.resolve(exitCode),
    kill: vi.fn().mockResolvedValue(undefined),
  }
}

/**
 * Simplified SandboxReporter for testing
 */
class MockSandboxReporter {
  private sessionUrl: string
  private authToken?: string
  private retryAttempts: number
  private retryDelay: number
  public reportedEvents: StreamEvent[] = []

  constructor(config: {
    sessionUrl: string
    authToken?: string
    retryAttempts?: number
    retryDelay?: number
  }) {
    this.sessionUrl = config.sessionUrl
    this.authToken = config.authToken
    this.retryAttempts = config.retryAttempts ?? 3
    this.retryDelay = config.retryDelay ?? 1000
  }

  async streamToSession(proc: SandboxProcess): Promise<void> {
    const reader = proc.stdout.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line)
            await this.reportEvent(event)
          } catch {
            // Skip invalid JSON
          }
        }
      }

      const exitCode = await proc.exitCode
      await this.reportEvent({ type: 'complete', exitCode })
    } catch (error) {
      await this.reportEvent({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  private async reportEvent(event: StreamEvent): Promise<void> {
    this.reportedEvents.push(event)

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`
    }

    await this.fetchWithRetry(`${this.sessionUrl}/event`, {
      method: 'POST',
      headers,
      body: JSON.stringify(event),
    })
  }

  private async fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(url, options)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        if (attempt < this.retryAttempts) {
          await new Promise((r) => setTimeout(r, this.retryDelay * Math.pow(2, attempt)))
        }
      }
    }

    throw new Error(`Failed after ${this.retryAttempts + 1} attempts: ${lastError?.message}`)
  }
}

/**
 * Simulate SessionDO state updates
 */
function createSessionStateUpdater(initialId: string) {
  let state: SessionState = {
    id: initialId,
    status: 'idle',
    todos: [],
    tools: [],
    cost: 0,
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
  }

  return {
    getState: () => state,
    handleEvent: (event: StreamEvent) => {
      switch (event.type) {
        case 'assistant':
          // Assistant events don't directly change state
          break

        case 'tool_use': {
          const toolEvent = event as { id: string; tool: string; input: unknown }
          state = {
            ...state,
            status: 'running',
            tools: [
              ...state.tools,
              { id: toolEvent.id, status: 'running' },
            ],
          }

          // Extract todos
          if (toolEvent.tool === 'TodoWrite' && toolEvent.input) {
            const input = toolEvent.input as { todos?: Array<{ content: string; status: string }> }
            if (input.todos) {
              state = { ...state, todos: input.todos }
            }
          }
          break
        }

        case 'tool_result': {
          const resultEvent = event as { id: string; error?: string }
          state = {
            ...state,
            tools: state.tools.map((t) =>
              t.id === resultEvent.id
                ? { ...t, status: resultEvent.error ? 'error' : 'success' }
                : t
            ),
          }
          break
        }

        case 'result': {
          const finalEvent = event as {
            cost: number
            usage: { inputTokens: number; outputTokens: number; totalTokens: number }
          }
          state = {
            ...state,
            status: 'completed',
            cost: finalEvent.cost,
            usage: finalEvent.usage,
          }
          break
        }

        case 'complete': {
          const completeEvent = event as { exitCode: number }
          if (state.status !== 'completed' && state.status !== 'error') {
            state = {
              ...state,
              status: completeEvent.exitCode === 0 ? 'completed' : 'error',
            }
          }
          break
        }

        case 'error': {
          state = { ...state, status: 'error' }
          break
        }
      }
    },
  }
}

describe('Sandbox + Service Integration: Event Reporting', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should report events from sandbox to service', async () => {
    const sessionId = 'sandbox-001'
    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting execution' },
        { type: 'tool', tool: 'Read', input: { file_path: '/test.ts' }, output: 'content' },
        { type: 'assistant', content: 'Done' },
      ],
    })

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // Should have reported all events + completion
    expect(mockFetch).toHaveBeenCalled()

    // Verify all events were reported to correct URL
    const calls = mockFetch.mock.calls
    for (const call of calls) {
      expect(call[0]).toBe(`https://agents.do/sessions/${sessionId}/event`)
    }

    // Verify completion event was sent
    const lastCall = calls[calls.length - 1]
    const lastBody = JSON.parse((lastCall[1] as RequestInit).body as string)
    expect(lastBody.type).toBe('complete')
    expect(lastBody.exitCode).toBe(0)
  })

  it('should include auth token in requests', async () => {
    const sessionId = 'sandbox-002'
    const authToken = 'secret-token-123'
    const events = [mockAssistantEvent('Test')]

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
      authToken,
    })

    await reporter.streamToSession(proc)

    for (const call of mockFetch.mock.calls) {
      const headers = (call[1] as RequestInit).headers as Record<string, string>
      expect(headers['Authorization']).toBe(`Bearer ${authToken}`)
    }
  })

  it('should report correct exit code on failure', async () => {
    const sessionId = 'sandbox-003'
    const events = [mockAssistantEvent('Starting...')]

    const proc = createMockSandboxProcess(events, 1) // Exit code 1
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // Find the complete event
    const completeCall = mockFetch.mock.calls.find((call) => {
      const body = JSON.parse((call[1] as RequestInit).body as string)
      return body.type === 'complete'
    })

    expect(completeCall).toBeDefined()
    const completeBody = JSON.parse((completeCall![1] as RequestInit).body as string)
    expect(completeBody.exitCode).toBe(1)
  })

  it('should report all events in order', async () => {
    const sessionId = 'sandbox-004'
    const events = [
      mockAssistantEvent('Step 1'),
      mockToolUseEvent('Read', { file_path: '/a.ts' }),
      mockToolResultEvent('toolu_1', 'content A'),
      mockAssistantEvent('Step 2'),
      mockToolUseEvent('Read', { file_path: '/b.ts' }),
      mockToolResultEvent('toolu_2', 'content B'),
    ]

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // Events should be reported in order (minus result which is added by generateSessionFlow)
    expect(reporter.reportedEvents[0].type).toBe('assistant')
    expect(reporter.reportedEvents[1].type).toBe('tool_use')
    expect(reporter.reportedEvents[2].type).toBe('tool_result')
    expect(reporter.reportedEvents[3].type).toBe('assistant')
    expect(reporter.reportedEvents[4].type).toBe('tool_use')
    expect(reporter.reportedEvents[5].type).toBe('tool_result')
  })
})

describe('Sandbox + Service Integration: Session State Updates', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should update session state from sandbox events', async () => {
    const sessionId = 'state-001'
    const stateUpdater = createSessionStateUpdater(sessionId)

    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Task 1', activeForm: 'Doing 1', status: 'in_progress' },
              { content: 'Task 2', activeForm: 'Doing 2', status: 'pending' },
            ],
          },
        },
        { type: 'tool', tool: 'Read', input: { file_path: '/test.ts' }, output: 'content' },
      ],
    })

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // Simulate SessionDO receiving events
    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.status).toBe('completed')
    expect(finalState.todos).toHaveLength(2)
    expect(finalState.todos[0].status).toBe('in_progress')
    expect(finalState.tools.length).toBeGreaterThan(0)
  })

  it('should reflect sandbox execution progress', async () => {
    const sessionId = 'state-002'
    const stateUpdater = createSessionStateUpdater(sessionId)
    const stateSnapshots: SessionState[] = []

    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'Starting' },
        { type: 'tool', tool: 'Read', input: { file_path: '/a.ts' }, output: 'content A' },
        { type: 'tool', tool: 'Read', input: { file_path: '/b.ts' }, output: 'content B' },
        { type: 'tool', tool: 'Read', input: { file_path: '/c.ts' }, output: 'content C' },
      ],
    })

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // Process events and capture state snapshots
    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
      stateSnapshots.push({ ...stateUpdater.getState() })
    }

    // Verify state progression
    expect(stateSnapshots[0].status).toBe('idle') // After assistant event
    expect(stateSnapshots[1].status).toBe('running') // After first tool_use
    expect(stateSnapshots[1].tools).toHaveLength(1)

    // Final state should be completed
    const finalState = stateSnapshots[stateSnapshots.length - 1]
    expect(finalState.status).toBe('completed')
  })

  it('should handle completion event correctly', async () => {
    const sessionId = 'state-003'
    const stateUpdater = createSessionStateUpdater(sessionId)

    const events = [mockAssistantEvent('Hello')]
    const proc = createMockSandboxProcess(events, 0)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.status).toBe('completed')
  })

  it('should handle non-zero exit code', async () => {
    const sessionId = 'state-004'
    const stateUpdater = createSessionStateUpdater(sessionId)

    const events = [mockAssistantEvent('Starting...')] // No result event
    const proc = createMockSandboxProcess(events, 1) // Exit code 1
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.status).toBe('error')
  })
})

describe('Sandbox + Service Integration: Complex Flows', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should handle complex session with multiple tools', async () => {
    const sessionId = 'complex-001'
    const stateUpdater = createSessionStateUpdater(sessionId)

    const events = generateComplexSessionFlow()
    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.status).toBe('completed')
    expect(finalState.todos).toHaveLength(4)
    expect(finalState.todos.every((t) => t.status === 'completed')).toBe(true)
    expect(finalState.tools.length).toBeGreaterThan(5)
    expect(finalState.cost).toBeGreaterThan(0)
  })

  it('should track tool success/failure states', async () => {
    const sessionId = 'complex-002'
    const stateUpdater = createSessionStateUpdater(sessionId)

    const events = generateSessionFlow({
      steps: [
        { type: 'tool', tool: 'Read', input: { file_path: '/success.ts' }, output: 'content' },
        {
          type: 'tool',
          tool: 'Read',
          input: { file_path: '/fail.ts' },
          output: null,
          error: 'File not found',
        },
        { type: 'tool', tool: 'Read', input: { file_path: '/success2.ts' }, output: 'content2' },
      ],
    })

    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.tools).toHaveLength(3)

    const statuses = finalState.tools.map((t) => t.status)
    expect(statuses).toContain('success')
    expect(statuses).toContain('error')
  })

  it('should handle rapid event succession', async () => {
    const sessionId = 'complex-003'
    const stateUpdater = createSessionStateUpdater(sessionId)

    // Generate many rapid events
    const steps = []
    for (let i = 0; i < 20; i++) {
      steps.push({
        type: 'tool' as const,
        tool: 'Read',
        input: { file_path: `/file${i}.ts` },
        output: `content ${i}`,
      })
    }

    const events = generateSessionFlow({ steps })
    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    const finalState = stateUpdater.getState()
    expect(finalState.tools).toHaveLength(20)
    expect(finalState.tools.every((t) => t.status === 'success')).toBe(true)
  })
})

describe('Sandbox + Service Integration: Error Handling', () => {
  beforeEach(() => {
    resetToolIdCounter()
  })

  it('should retry on network failure', async () => {
    const sessionId = 'error-001'

    // First call fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue(createMockResponse({ success: true }))

    const events = [mockAssistantEvent('Test')]
    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
      retryAttempts: 3,
      retryDelay: 10,
    })

    await reporter.streamToSession(proc)

    // Should have made at least 2 calls (1 fail + 1 success for first event)
    expect(mockFetch.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('should report error event on stream failure', async () => {
    const sessionId = 'error-002'
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))

    // Create a process with a failing stream
    const failingStream = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error('Stream read error')
      },
    })

    const proc: SandboxProcess = {
      pid: 12345,
      stdout: failingStream,
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(0),
      kill: vi.fn(),
    }

    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await expect(reporter.streamToSession(proc)).rejects.toThrow('Stream read error')

    // Verify error event was reported
    const errorCall = mockFetch.mock.calls.find((call) => {
      const body = JSON.parse((call[1] as RequestInit).body as string)
      return body.type === 'error'
    })

    expect(errorCall).toBeDefined()
    const errorBody = JSON.parse((errorCall![1] as RequestInit).body as string)
    expect(errorBody.error).toContain('Stream read error')
  })

  it('should handle partial stream before failure', async () => {
    const sessionId = 'error-003'
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))

    // Create a stream that sends some events then fails
    let eventIndex = 0
    const partialEvents = [
      mockAssistantEvent('Step 1'),
      mockToolUseEvent('Read', { file_path: '/test.ts' }),
    ]

    const partialStream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (eventIndex < partialEvents.length) {
          const encoder = new TextEncoder()
          controller.enqueue(encoder.encode(JSON.stringify(partialEvents[eventIndex]) + '\n'))
          eventIndex++
        } else {
          throw new Error('Connection lost')
        }
      },
    })

    const proc: SandboxProcess = {
      pid: 12345,
      stdout: partialStream,
      stderr: new ReadableStream(),
      exitCode: Promise.resolve(1),
      kill: vi.fn(),
    }

    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await expect(reporter.streamToSession(proc)).rejects.toThrow('Connection lost')

    // Should have reported the events before failure
    expect(reporter.reportedEvents.length).toBeGreaterThanOrEqual(2)
    expect(reporter.reportedEvents[0].type).toBe('assistant')
    expect(reporter.reportedEvents[1].type).toBe('tool_use')

    // Should have reported error
    const errorEvent = reporter.reportedEvents.find((e) => e.type === 'error')
    expect(errorEvent).toBeDefined()
  })
})

describe('Sandbox + Service Integration: Session Lifecycle', () => {
  beforeEach(() => {
    resetToolIdCounter()
    mockFetch.mockResolvedValue(createMockResponse({ success: true }))
  })

  it('should handle full session lifecycle: create -> stream -> complete', async () => {
    const sessionId = 'lifecycle-001'
    const stateUpdater = createSessionStateUpdater(sessionId)

    // 1. Session starts idle
    expect(stateUpdater.getState().status).toBe('idle')

    // 2. Generate realistic session events
    const events = generateSessionFlow({
      steps: [
        { type: 'assistant', content: 'I will help you with this task.' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Read requirements', activeForm: 'Reading', status: 'in_progress' },
              { content: 'Implement feature', activeForm: 'Implementing', status: 'pending' },
            ],
          },
        },
        { type: 'tool', tool: 'Read', input: { file_path: '/requirements.md' }, output: '# Requirements' },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Read requirements', activeForm: 'Reading', status: 'completed' },
              { content: 'Implement feature', activeForm: 'Implementing', status: 'in_progress' },
            ],
          },
        },
        { type: 'tool', tool: 'Write', input: { file_path: '/feature.ts', content: 'export {}' } },
        {
          type: 'tool',
          tool: 'TodoWrite',
          input: {
            todos: [
              { content: 'Read requirements', activeForm: 'Reading', status: 'completed' },
              { content: 'Implement feature', activeForm: 'Implementing', status: 'completed' },
            ],
          },
        },
        { type: 'assistant', content: 'Done! Feature implemented.' },
      ],
    })

    // 3. Stream events from sandbox
    const proc = createMockSandboxProcess(events)
    const reporter = new MockSandboxReporter({
      sessionUrl: `https://agents.do/sessions/${sessionId}`,
    })

    await reporter.streamToSession(proc)

    // 4. Process events (simulating SessionDO)
    for (const event of reporter.reportedEvents) {
      stateUpdater.handleEvent(event)
    }

    // 5. Verify final state
    const finalState = stateUpdater.getState()
    expect(finalState.status).toBe('completed')
    expect(finalState.todos).toHaveLength(2)
    expect(finalState.todos.every((t) => t.status === 'completed')).toBe(true)
    expect(finalState.cost).toBeGreaterThan(0)
    expect(finalState.usage.totalTokens).toBeGreaterThan(0)
  })

  it('should support multiple concurrent sandboxes', async () => {
    const sessions = ['concurrent-001', 'concurrent-002', 'concurrent-003']
    const stateUpdaters = sessions.map((id) => ({
      id,
      updater: createSessionStateUpdater(id),
    }))

    // Create processes for each session
    const processes = sessions.map((id, i) =>
      createMockSandboxProcess([
        mockAssistantEvent(`Session ${i + 1} starting`),
        mockToolUseEvent('Read', { file_path: `/session${i + 1}/file.ts` }),
        mockToolResultEvent(`toolu_${i}`, `content ${i + 1}`),
      ])
    )

    // Start all reporters concurrently
    const reporters = sessions.map(
      (id) =>
        new MockSandboxReporter({
          sessionUrl: `https://agents.do/sessions/${id}`,
        })
    )

    await Promise.all(
      processes.map((proc, i) => reporters[i].streamToSession(proc))
    )

    // Process events for each session
    for (let i = 0; i < sessions.length; i++) {
      for (const event of reporters[i].reportedEvents) {
        stateUpdaters[i].updater.handleEvent(event)
      }
    }

    // Verify each session completed independently
    for (const { id, updater } of stateUpdaters) {
      const state = updater.getState()
      expect(state.id).toBe(id)
      expect(state.status).toBe('completed')
    }
  })
})

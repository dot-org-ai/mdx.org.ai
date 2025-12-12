import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  SessionClient,
  type SessionState,
  type PlanStep,
  type Todo,
  type ToolExecution,
  type Message,
  type Usage,
} from './client'

// Create a mock WebSocket class
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.OPEN
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  url: string

  constructor(url: string) {
    this.url = url
    MockWebSocket.instances.push(this)
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event('open'))
      }
    }, 0)
  }

  send(_data: string): void {}

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }))
    }
  }

  simulateError(): void {
    if (this.onerror) {
      this.onerror(new Event('error'))
    }
  }

  simulateClose(): void {
    if (this.onclose) {
      this.onclose(new CloseEvent('close'))
    }
  }
}

describe('SessionClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('URL construction', () => {
    it('constructs WebSocket URL with /ws suffix', async () => {
      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      expect(MockWebSocket.instances[0].url).toBe(
        'wss://api.example.com/sessions/test-session/ws'
      )
    })

    it('converts http to ws', async () => {
      new SessionClient('test-session', 'http://localhost:3000')
      await vi.advanceTimersByTimeAsync(0)

      expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000/sessions/test-session/ws')
    })

    it('converts https to wss', async () => {
      new SessionClient('test-session', 'https://secure.api.com')
      await vi.advanceTimersByTimeAsync(0)

      expect(MockWebSocket.instances[0].url).toBe('wss://secure.api.com/sessions/test-session/ws')
    })

    it('includes session ID in URL path', async () => {
      new SessionClient('my-unique-session-id', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      expect(MockWebSocket.instances[0].url).toContain('my-unique-session-id')
    })
  })

  describe('subscription', () => {
    it('allows subscribing to state updates', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      client.subscribe(listener)

      const mockState: SessionState = {
        id: 'test-session',
        status: 'running',
        model: 'claude-3',
        cwd: '/test',
        startedAt: '2024-01-01T00:00:00Z',
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
      }

      MockWebSocket.instances[0].simulateMessage({ state: mockState })

      expect(listener).toHaveBeenCalledWith(mockState)
    })

    it('allows unsubscribing from state updates', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      const unsubscribe = client.subscribe(listener)

      unsubscribe()

      MockWebSocket.instances[0].simulateMessage({ state: { id: 'test' } })

      expect(listener).not.toHaveBeenCalled()
    })

    it('supports multiple subscribers', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener1 = vi.fn()
      const listener2 = vi.fn()
      client.subscribe(listener1)
      client.subscribe(listener2)

      const mockState: SessionState = {
        id: 'test-session',
        status: 'running',
        model: 'claude-3',
        cwd: '/test',
        startedAt: '2024-01-01T00:00:00Z',
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
      }

      MockWebSocket.instances[0].simulateMessage({ state: mockState })

      expect(listener1).toHaveBeenCalledWith(mockState)
      expect(listener2).toHaveBeenCalledWith(mockState)
    })
  })

  describe('message parsing', () => {
    it('handles state property format', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      client.subscribe(listener)

      const mockState = { id: 'test', status: 'running' }
      MockWebSocket.instances[0].simulateMessage({ state: mockState })

      expect(listener).toHaveBeenCalledWith(mockState)
    })

    it('handles type: state with data format', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      client.subscribe(listener)

      const mockState = { id: 'test', status: 'completed' }
      MockWebSocket.instances[0].simulateMessage({ type: 'state', data: mockState })

      expect(listener).toHaveBeenCalledWith(mockState)
    })

    it('ignores messages without state data', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      client.subscribe(listener)

      MockWebSocket.instances[0].simulateMessage({ type: 'other', data: {} })

      expect(listener).not.toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })

  describe('close', () => {
    it('closes WebSocket connection', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const ws = MockWebSocket.instances[0]
      const closeSpy = vi.spyOn(ws, 'close')

      client.close()

      expect(closeSpy).toHaveBeenCalled()
    })

    it('clears all listeners on close', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const listener = vi.fn()
      client.subscribe(listener)

      client.close()

      // Simulate a message after close - listener should not be called
      MockWebSocket.instances[0].simulateMessage({ state: { id: 'test' } })

      expect(listener).not.toHaveBeenCalled()
    })

    it('prevents reconnection after close', async () => {
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      client.close()

      // Simulate close event that would normally trigger reconnect
      MockWebSocket.instances[0].simulateClose()

      // Advance timers to allow any reconnection attempts
      await vi.advanceTimersByTimeAsync(10000)

      // Should only have the original WebSocket instance
      expect(MockWebSocket.instances.length).toBe(1)
    })
  })

  describe('reconnection', () => {
    it('attempts reconnection on close', async () => {
      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      // Simulate close
      MockWebSocket.instances[0].simulateClose()

      // Advance time to trigger reconnect (1000ms * 2^0 = 1000ms)
      await vi.advanceTimersByTimeAsync(1000)

      // Should have created a new WebSocket
      expect(MockWebSocket.instances.length).toBe(2)
    })

    it('uses exponential backoff for reconnection', async () => {
      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      // First close
      MockWebSocket.instances[0].simulateClose()
      await vi.advanceTimersByTimeAsync(1000) // 1000 * 2^0
      expect(MockWebSocket.instances.length).toBe(2)

      // Second close
      MockWebSocket.instances[1].simulateClose()
      await vi.advanceTimersByTimeAsync(2000) // 1000 * 2^1
      expect(MockWebSocket.instances.length).toBe(3)
    })

    it('reconnects indefinitely with successful connections', async () => {
      // Because onopen resets reconnectAttempts to 0, successful connections
      // allow unlimited reconnections. This verifies that behavior works.
      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0) // Initial connection + onopen fires

      // Each close followed by reconnect should work because onopen fires
      for (let i = 0; i < 3; i++) {
        MockWebSocket.instances[MockWebSocket.instances.length - 1].simulateClose()
        await vi.advanceTimersByTimeAsync(2000) // Wait for reconnect
        await vi.advanceTimersByTimeAsync(0) // Allow onopen to fire
      }

      // Should have 1 original + 3 reconnection attempts = 4
      expect(MockWebSocket.instances.length).toBe(4)
    })

    it('resets reconnection attempts on successful connection', async () => {
      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      // Close and reconnect
      MockWebSocket.instances[0].simulateClose()
      await vi.advanceTimersByTimeAsync(1000)

      // Simulate successful open on the new connection
      MockWebSocket.instances[1].onopen?.(new Event('open'))

      // Close again - should use initial backoff (1000ms, not 2000ms)
      MockWebSocket.instances[1].simulateClose()
      await vi.advanceTimersByTimeAsync(1000)

      expect(MockWebSocket.instances.length).toBe(3)
    })
  })

  describe('error handling', () => {
    it('logs WebSocket errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      MockWebSocket.instances[0].simulateError()

      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('handles listener errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const client = new SessionClient('test-session', 'https://api.example.com')
      await vi.advanceTimersByTimeAsync(0)

      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error')
      })
      const goodListener = vi.fn()

      client.subscribe(errorListener)
      client.subscribe(goodListener)

      const mockState = { id: 'test', status: 'running' }
      MockWebSocket.instances[0].simulateMessage({ state: mockState })

      // Good listener should still be called even if one listener throws
      expect(goodListener).toHaveBeenCalled()
      expect(consoleErrorSpy).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })
  })
})

describe('Type definitions', () => {
  it('SessionState has correct shape', () => {
    const state: SessionState = {
      id: 'test',
      status: 'running',
      model: 'claude-3',
      cwd: '/test',
      startedAt: new Date(),
      plan: [],
      todos: [],
      tools: [],
      messages: [],
      cost: 0,
      duration: 0,
    }
    expect(state.id).toBe('test')
  })

  it('PlanStep has correct shape', () => {
    const step: PlanStep = {
      id: 'step-1',
      description: 'Test step',
      status: 'pending',
    }
    expect(step.status).toBe('pending')
  })

  it('Todo has correct shape', () => {
    const todo: Todo = {
      content: 'Test todo',
      activeForm: 'Testing',
      status: 'in_progress',
    }
    expect(todo.status).toBe('in_progress')
  })

  it('ToolExecution has correct shape', () => {
    const tool: ToolExecution = {
      id: 'tool-1',
      tool: 'Read',
      input: {},
      status: 'success',
      startedAt: new Date(),
    }
    expect(tool.status).toBe('success')
  })

  it('Message has correct shape', () => {
    const message: Message = {
      role: 'assistant',
      content: 'Hello',
      timestamp: new Date(),
    }
    expect(message.role).toBe('assistant')
  })

  it('Usage has correct shape', () => {
    const usage: Usage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    }
    expect(usage.totalTokens).toBe(150)
  })
})

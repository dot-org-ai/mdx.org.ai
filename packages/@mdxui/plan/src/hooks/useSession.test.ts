import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSession } from './useSession'
import type { SessionState } from '../lib/client'

// Create a mock WebSocket class that we can control in tests
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
    // Simulate async connection
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
}

describe('useSession', () => {
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

  it('returns null initially', () => {
    const { result } = renderHook(() => useSession('test-session'))

    expect(result.current.state).toBeNull()
  })

  it('connects to WebSocket on mount', async () => {
    renderHook(() => useSession('test-session', 'https://api.example.com'))

    // Wait for WebSocket to be created
    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toBe('wss://api.example.com/sessions/test-session/ws')
  })

  it('updates state on WebSocket message with state property', async () => {
    const { result } = renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

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
      cost: 0.01,
      duration: 1000,
    }

    act(() => {
      MockWebSocket.instances[0].simulateMessage({ state: mockState })
    })

    expect(result.current.state).toEqual(mockState)
  })

  it('updates state on WebSocket message with type: state format', async () => {
    const { result } = renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

    const mockState: SessionState = {
      id: 'test-session',
      status: 'completed',
      model: 'claude-3-opus',
      cwd: '/test',
      startedAt: '2024-01-01T00:00:00Z',
      plan: [],
      todos: [],
      tools: [],
      messages: [],
      cost: 0.05,
      duration: 5000,
    }

    act(() => {
      MockWebSocket.instances[0].simulateMessage({ type: 'state', data: mockState })
    })

    expect(result.current.state).toEqual(mockState)
  })

  it('closes WebSocket on unmount', async () => {
    const { unmount } = renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

    const ws = MockWebSocket.instances[0]
    const closeSpy = vi.spyOn(ws, 'close')

    unmount()

    expect(closeSpy).toHaveBeenCalled()
  })

  it('sets isConnected to true on successful connection', async () => {
    const { result } = renderHook(() => useSession('test-session'))

    // Initially should be connected (optimistic)
    expect(result.current.isConnected).toBe(true)
  })

  it('returns error as null initially', () => {
    const { result } = renderHook(() => useSession('test-session'))

    expect(result.current.error).toBeNull()
  })

  it('does not connect when sessionId is empty', async () => {
    renderHook(() => useSession(''))

    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances.length).toBe(0)
  })

  it('converts http to ws in URL', async () => {
    renderHook(() => useSession('test-session', 'http://localhost:3000'))

    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances[0].url).toBe('ws://localhost:3000/sessions/test-session/ws')
  })

  it('converts https to wss in URL', async () => {
    renderHook(() => useSession('test-session', 'https://api.example.com'))

    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances[0].url).toBe('wss://api.example.com/sessions/test-session/ws')
  })

  it('uses default baseUrl when not provided', async () => {
    renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances[0].url).toBe('wss://agents.do/sessions/test-session/ws')
  })

  it('clears error on successful state update', async () => {
    const { result } = renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

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

    act(() => {
      MockWebSocket.instances[0].simulateMessage({ state: mockState })
    })

    expect(result.current.error).toBeNull()
  })

  it('handles malformed JSON in WebSocket message gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useSession('test-session'))

    await vi.advanceTimersByTimeAsync(0)

    act(() => {
      // Simulate a message with malformed JSON by calling onmessage directly
      if (MockWebSocket.instances[0].onmessage) {
        MockWebSocket.instances[0].onmessage(
          new MessageEvent('message', { data: 'not valid json' })
        )
      }
    })

    // State should remain null
    expect(result.current.state).toBeNull()
    // Error should have been logged
    expect(consoleErrorSpy).toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('reconnects sessionId or baseUrl changes', async () => {
    const { rerender } = renderHook(
      ({ sessionId, baseUrl }) => useSession(sessionId, baseUrl),
      { initialProps: { sessionId: 'session-1', baseUrl: 'https://api.example.com' } }
    )

    await vi.advanceTimersByTimeAsync(0)

    expect(MockWebSocket.instances.length).toBe(1)
    expect(MockWebSocket.instances[0].url).toContain('session-1')

    rerender({ sessionId: 'session-2', baseUrl: 'https://api.example.com' })

    await vi.advanceTimersByTimeAsync(0)

    // Should have created a new WebSocket for the new session
    expect(MockWebSocket.instances.length).toBe(2)
    expect(MockWebSocket.instances[1].url).toContain('session-2')
  })
})

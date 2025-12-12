import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import type { SessionState, StreamEvent } from '../types.js'

// Create mock functions that are stable across the module
const mockOnState = vi.fn()
const mockOnEvent = vi.fn()
const mockConnect = vi.fn()
const mockClose = vi.fn()

// Mock SessionClient with factory function
vi.mock('./websocket.js', () => ({
  SessionClient: vi.fn(() => ({
    onState: mockOnState,
    onEvent: mockOnEvent,
    connect: mockConnect,
    close: mockClose,
  })),
}))

// Import hooks after mocking
import { useSession, useSessionEvents, useSessionWithEvents } from './hooks.js'
import { SessionClient } from './websocket.js'

describe('React Hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOnState.mockReturnValue(vi.fn())
    mockOnEvent.mockReturnValue(vi.fn())
  })

  describe('useSession', () => {
    it('should return null initially', () => {
      const { result } = renderHook(() => useSession('session-123'))

      expect(result.current).toBeNull()
    })

    it('should connect to WebSocket on mount', () => {
      renderHook(() => useSession('session-123'))

      expect(SessionClient).toHaveBeenCalledWith({
        sessionId: 'session-123',
        baseUrl: undefined,
        authToken: undefined,
      })
      expect(mockConnect).toHaveBeenCalled()
    })

    it('should update on WebSocket message', async () => {
      let stateCallback: ((state: SessionState) => void) | undefined

      mockOnState.mockImplementation((cb: (state: SessionState) => void) => {
        stateCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useSession('session-123'))

      const mockState: SessionState = {
        id: 'session-123',
        status: 'running',
        model: 'sonnet',
        cwd: '/test',
        startedAt: new Date(),
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
        usage: { input_tokens: 0, output_tokens: 0 },
      }

      act(() => {
        stateCallback?.(mockState)
      })

      expect(result.current).toEqual(mockState)
    })

    it('should clean up on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnState.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useSession('session-123'))

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
      expect(mockClose).toHaveBeenCalled()
    })

    it('should pass baseUrl to SessionClient', () => {
      renderHook(() =>
        useSession('session-123', { baseUrl: 'http://localhost:3000' })
      )

      expect(SessionClient).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:3000',
        })
      )
    })

    it('should pass authToken to SessionClient', () => {
      renderHook(() =>
        useSession('session-123', { authToken: 'test-token' })
      )

      expect(SessionClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: 'test-token',
        })
      )
    })

    it('should reconnect when sessionId changes', () => {
      const { rerender } = renderHook(
        ({ sessionId }) => useSession(sessionId),
        { initialProps: { sessionId: 'session-1' } }
      )

      expect(SessionClient).toHaveBeenCalledTimes(1)

      rerender({ sessionId: 'session-2' })

      expect(SessionClient).toHaveBeenCalledTimes(2)
      expect(mockClose).toHaveBeenCalled()
    })
  })

  describe('useSessionEvents', () => {
    it('should return empty array initially', () => {
      const { result } = renderHook(() => useSessionEvents('session-123'))

      expect(result.current).toEqual([])
    })

    it('should accumulate events', async () => {
      let eventCallback: ((event: StreamEvent) => void) | undefined

      mockOnEvent.mockImplementation((cb: (event: StreamEvent) => void) => {
        eventCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useSessionEvents('session-123'))

      const event1: StreamEvent = {
        type: 'tool_use',
        data: { tool: 'Read' },
        timestamp: new Date(),
      }

      const event2: StreamEvent = {
        type: 'tool_result',
        data: { result: 'success' },
        timestamp: new Date(),
      }

      act(() => {
        eventCallback?.(event1)
      })

      expect(result.current).toHaveLength(1)

      act(() => {
        eventCallback?.(event2)
      })

      expect(result.current).toHaveLength(2)
      expect(result.current[0]).toEqual(event1)
      expect(result.current[1]).toEqual(event2)
    })

    it('should clean up on unmount', () => {
      const unsubscribe = vi.fn()
      mockOnEvent.mockReturnValue(unsubscribe)

      const { unmount } = renderHook(() => useSessionEvents('session-123'))

      unmount()

      expect(unsubscribe).toHaveBeenCalled()
      expect(mockClose).toHaveBeenCalled()
    })

    it('should pass options to SessionClient', () => {
      renderHook(() =>
        useSessionEvents('session-123', {
          baseUrl: 'http://localhost:3000',
          authToken: 'test-token',
        })
      )

      expect(SessionClient).toHaveBeenCalledWith({
        sessionId: 'session-123',
        baseUrl: 'http://localhost:3000',
        authToken: 'test-token',
      })
    })
  })

  describe('useSessionWithEvents', () => {
    it('should return null state and empty events initially', () => {
      const { result } = renderHook(() => useSessionWithEvents('session-123'))

      expect(result.current.state).toBeNull()
      expect(result.current.events).toEqual([])
    })

    it('should combine state and events', async () => {
      let stateCallback: ((state: SessionState) => void) | undefined
      let eventCallback: ((event: StreamEvent) => void) | undefined

      mockOnState.mockImplementation((cb: (state: SessionState) => void) => {
        stateCallback = cb
        return vi.fn()
      })

      mockOnEvent.mockImplementation((cb: (event: StreamEvent) => void) => {
        eventCallback = cb
        return vi.fn()
      })

      const { result } = renderHook(() => useSessionWithEvents('session-123'))

      const mockState: SessionState = {
        id: 'session-123',
        status: 'running',
        model: 'sonnet',
        cwd: '/test',
        startedAt: new Date(),
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
        usage: { input_tokens: 0, output_tokens: 0 },
      }

      const mockEvent: StreamEvent = {
        type: 'tool_use',
        data: { tool: 'Read' },
        timestamp: new Date(),
      }

      act(() => {
        stateCallback?.(mockState)
        eventCallback?.(mockEvent)
      })

      expect(result.current.state).toEqual(mockState)
      expect(result.current.events).toHaveLength(1)
      expect(result.current.events[0]).toEqual(mockEvent)
    })

    it('should clean up on unmount', () => {
      const unsubscribeState = vi.fn()
      const unsubscribeEvents = vi.fn()

      mockOnState.mockReturnValue(unsubscribeState)
      mockOnEvent.mockReturnValue(unsubscribeEvents)

      const { unmount } = renderHook(() => useSessionWithEvents('session-123'))

      unmount()

      expect(unsubscribeState).toHaveBeenCalled()
      expect(unsubscribeEvents).toHaveBeenCalled()
      expect(mockClose).toHaveBeenCalled()
    })

    it('should pass options to SessionClient', () => {
      renderHook(() =>
        useSessionWithEvents('session-123', {
          baseUrl: 'http://localhost:3000',
          authToken: 'test-token',
        })
      )

      expect(SessionClient).toHaveBeenCalledWith({
        sessionId: 'session-123',
        baseUrl: 'http://localhost:3000',
        authToken: 'test-token',
      })
    })

    it('should reconnect when sessionId changes', () => {
      const { rerender } = renderHook(
        ({ sessionId }) => useSessionWithEvents(sessionId),
        { initialProps: { sessionId: 'session-1' } }
      )

      rerender({ sessionId: 'session-2' })

      // Should create a new client for the new session
      expect(SessionClient).toHaveBeenCalledTimes(2)
    })
  })
})

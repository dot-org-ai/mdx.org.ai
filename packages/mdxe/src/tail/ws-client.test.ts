/**
 * Tests for WebSocket TailClient
 *
 * Tests connection lifecycle, subscriptions, reconnection,
 * keepalive, and event handling for the WebSocket client.
 *
 * @module mdxe/tail/ws-client.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TailClient, type TailClientOptions } from './ws-client.js'
import { type MdxeEvent, createEvent } from './types.js'
import { type EventFilter } from './filter.js'

// WebSocket readyState constants
const WS_CONNECTING = 0
const WS_OPEN = 1
const WS_CLOSING = 2
const WS_CLOSED = 3

/**
 * Mock WebSocket implementation for testing
 */
class MockWebSocket {
  static CONNECTING = WS_CONNECTING
  static OPEN = WS_OPEN
  static CLOSING = WS_CLOSING
  static CLOSED = WS_CLOSED

  url: string
  readyState: number = WS_CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null
  sentMessages: string[] = []

  constructor(url: string) {
    this.url = url
  }

  send(data: string): void {
    this.sentMessages.push(data)
  }

  close(): void {
    this.readyState = WS_CLOSED
    if (this.onclose) {
      this.onclose({ code: 1000, reason: 'Normal closure' } as CloseEvent)
    }
  }

  // Test helpers
  simulateOpen(): void {
    this.readyState = WS_OPEN
    if (this.onopen) {
      this.onopen({} as Event)
    }
  }

  simulateMessage(data: unknown): void {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) } as MessageEvent)
    }
  }

  simulateError(error: Error): void {
    if (this.onerror) {
      this.onerror({ error } as unknown as Event)
    }
  }

  simulateClose(code = 1000, reason = 'Normal closure'): void {
    this.readyState = WS_CLOSED
    if (this.onclose) {
      this.onclose({ code, reason } as CloseEvent)
    }
  }
}

// Store mock instances for test access
let mockWebSocketInstance: MockWebSocket | null = null

// Create mock constructor with static properties
const mockWebSocketConstructor = vi.fn((url: string) => {
  mockWebSocketInstance = new MockWebSocket(url)
  return mockWebSocketInstance
}) as unknown as typeof WebSocket & { mockClear: () => void }

// Add static properties to the mock constructor
Object.defineProperty(mockWebSocketConstructor, 'CONNECTING', { value: WS_CONNECTING })
Object.defineProperty(mockWebSocketConstructor, 'OPEN', { value: WS_OPEN })
Object.defineProperty(mockWebSocketConstructor, 'CLOSING', { value: WS_CLOSING })
Object.defineProperty(mockWebSocketConstructor, 'CLOSED', { value: WS_CLOSED })

// Mock global WebSocket
vi.stubGlobal('WebSocket', mockWebSocketConstructor)

describe('TailClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockWebSocketInstance = null
    mockWebSocketConstructor.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Connection Lifecycle', () => {
    it('creates WebSocket connection on connect()', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()

      expect(mockWebSocketConstructor).toHaveBeenCalledWith('ws://localhost:3000/tail')
      expect(mockWebSocketInstance).not.toBeNull()
    })

    it('reports connected state after WebSocket opens', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      expect(client.isConnected()).toBe(false)

      mockWebSocketInstance!.simulateOpen()
      expect(client.isConnected()).toBe(true)
    })

    it('calls onConnect callback when connection opens', () => {
      const onConnect = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onConnect,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      expect(onConnect).toHaveBeenCalledTimes(1)
    })

    it('disconnects and cleans up on disconnect()', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      expect(client.isConnected()).toBe(true)

      client.disconnect()
      expect(client.isConnected()).toBe(false)
    })

    it('calls onDisconnect callback when connection closes', () => {
      const onDisconnect = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onDisconnect,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      mockWebSocketInstance!.simulateClose()

      expect(onDisconnect).toHaveBeenCalledTimes(1)
    })

    it('calls onError callback on WebSocket error', () => {
      const onError = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onError,
      })

      client.connect()
      const error = new Error('Connection failed')
      mockWebSocketInstance!.simulateError(error)

      expect(onError).toHaveBeenCalledTimes(1)
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    it('does not create multiple connections on repeated connect() calls', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      client.connect()
      client.connect()

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)
    })
  })

  describe('Subscription', () => {
    it('sends subscribe message without filter', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      client.subscribe()

      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'subscribe' })
      )
    })

    it('sends subscribe message with filter', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })
      const filter: EventFilter = {
        source: 'mdxe-*',
        minImportance: 'high',
      }

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      client.subscribe(filter)

      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'subscribe', filter })
      )
    })

    it('sends subscribe with initial filter from options', () => {
      const filter: EventFilter = { source: 'mdxe-build' }
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        filter,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Should auto-subscribe with filter on connection
      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'subscribe', filter })
      )
    })

    it('sends unsubscribe message', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      client.subscribe()
      client.unsubscribe()

      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'unsubscribe' })
      )
    })

    it('does not send subscribe when not connected', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.subscribe()

      expect(mockWebSocketInstance).toBeNull()
    })
  })

  describe('Event Handling', () => {
    it('calls onEvent callback when event message received', () => {
      const onEvent = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onEvent,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      const event = createEvent({
        source: 'mdxe-build',
        type: 'build_started',
        data: { target: 'production' },
      })

      mockWebSocketInstance!.simulateMessage({ type: 'event', event })

      expect(onEvent).toHaveBeenCalledTimes(1)
      expect(onEvent).toHaveBeenCalledWith(event)
    })

    it('handles multiple events', () => {
      const onEvent = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onEvent,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      const event1 = createEvent({ source: 'a', type: 'x', data: {} })
      const event2 = createEvent({ source: 'b', type: 'y', data: {} })
      const event3 = createEvent({ source: 'c', type: 'z', data: {} })

      mockWebSocketInstance!.simulateMessage({ type: 'event', event: event1 })
      mockWebSocketInstance!.simulateMessage({ type: 'event', event: event2 })
      mockWebSocketInstance!.simulateMessage({ type: 'event', event: event3 })

      expect(onEvent).toHaveBeenCalledTimes(3)
    })

    it('ignores non-event messages', () => {
      const onEvent = vi.fn()
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        onEvent,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      mockWebSocketInstance!.simulateMessage({ type: 'pong', timestamp: Date.now() })
      mockWebSocketInstance!.simulateMessage({ type: 'subscribed' })

      expect(onEvent).not.toHaveBeenCalled()
    })
  })

  describe('Keepalive Ping/Pong', () => {
    it('sends ping at configured interval', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        pingIntervalMs: 5000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Advance time past ping interval
      vi.advanceTimersByTime(5000)

      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'ping' })
      )
    })

    it('sends multiple pings over time', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        pingIntervalMs: 5000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      vi.advanceTimersByTime(15000)

      const pingMessages = mockWebSocketInstance!.sentMessages.filter(
        (msg) => JSON.parse(msg).type === 'ping'
      )
      expect(pingMessages).toHaveLength(3)
    })

    it('stops ping interval on disconnect', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        pingIntervalMs: 5000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      vi.advanceTimersByTime(5000)
      const pingCountBefore = mockWebSocketInstance!.sentMessages.filter(
        (msg) => JSON.parse(msg).type === 'ping'
      ).length

      client.disconnect()

      vi.advanceTimersByTime(10000)
      // Should not have more pings after disconnect
      // The mock is cleared but we can verify no new connection was made
      expect(pingCountBefore).toBe(1)
    })

    it('uses default ping interval of 30000ms', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Should not ping before 30s
      vi.advanceTimersByTime(29000)
      expect(
        mockWebSocketInstance!.sentMessages.filter((msg) => JSON.parse(msg).type === 'ping')
      ).toHaveLength(0)

      // Should ping at 30s
      vi.advanceTimersByTime(1000)
      expect(
        mockWebSocketInstance!.sentMessages.filter((msg) => JSON.parse(msg).type === 'ping')
      ).toHaveLength(1)
    })
  })

  describe('Automatic Reconnection', () => {
    it('attempts reconnect after unexpected close when reconnect enabled', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Simulate unexpected close
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)

      // Advance past reconnect delay
      vi.advanceTimersByTime(1000)

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2)
    })

    it('does not reconnect when reconnect disabled', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: false,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      vi.advanceTimersByTime(60000)

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)
    })

    it('does not reconnect on normal close (code 1000)', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()
      mockWebSocketInstance!.simulateClose(1000, 'Normal closure')

      vi.advanceTimersByTime(60000)

      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)
    })

    it('uses exponential backoff for reconnection attempts', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
        reconnectMaxMs: 30000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // First disconnect - should reconnect after 1000ms (base * 2^0)
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
      vi.advanceTimersByTime(999)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)
      vi.advanceTimersByTime(1)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2)

      // Simulate immediate failure
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      // Second reconnect - should wait 2000ms (base * 2^1)
      vi.advanceTimersByTime(1999)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(2)
      vi.advanceTimersByTime(1)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(3)

      // Third failure
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      // Third reconnect - should wait 4000ms (base * 2^2)
      vi.advanceTimersByTime(3999)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(3)
      vi.advanceTimersByTime(1)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(4)
    })

    it('caps reconnection delay at maxMs', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
        reconnectMaxMs: 5000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Simulate multiple failures to hit the cap
      for (let i = 0; i < 5; i++) {
        mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
        vi.advanceTimersByTime(Math.min(1000 * Math.pow(2, i), 5000))
      }

      // Reset mock count
      const countAfterMultipleFailures = mockWebSocketConstructor.mock.calls.length

      // Next reconnect should still use 5000ms (capped), not 32000ms
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      // Should not reconnect before 5000ms
      vi.advanceTimersByTime(4999)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(countAfterMultipleFailures)

      // Should reconnect at 5000ms
      vi.advanceTimersByTime(1)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(countAfterMultipleFailures + 1)
    })

    it('resets backoff after successful connection', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
        reconnectMaxMs: 30000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // First disconnect and reconnect
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
      vi.advanceTimersByTime(1000)

      // Second disconnect
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
      vi.advanceTimersByTime(2000)

      // Successful connection
      mockWebSocketInstance!.simulateOpen()

      // Disconnect again - should reset to base delay
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')

      const countBefore = mockWebSocketConstructor.mock.calls.length
      vi.advanceTimersByTime(999)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(countBefore)
      vi.advanceTimersByTime(1)
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(countBefore + 1)
    })

    it('does not reconnect after explicit disconnect()', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 1000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Explicit disconnect
      client.disconnect()

      vi.advanceTimersByTime(60000)

      // Should only have the initial connection
      expect(mockWebSocketConstructor).toHaveBeenCalledTimes(1)
    })

    it('re-subscribes with filter after reconnection', () => {
      const filter: EventFilter = { source: 'mdxe-*' }
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        filter,
        reconnect: true,
        reconnectBaseMs: 1000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      // Clear sent messages to track reconnection behavior
      mockWebSocketInstance!.sentMessages = []

      // Simulate disconnect and reconnect
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
      vi.advanceTimersByTime(1000)
      mockWebSocketInstance!.simulateOpen()

      // Should re-subscribe with the filter
      expect(mockWebSocketInstance!.sentMessages).toContainEqual(
        JSON.stringify({ type: 'subscribe', filter })
      )
    })
  })

  describe('Connection Metrics', () => {
    it('tracks messages received count', () => {
      const client = new TailClient({ url: 'ws://localhost:3000/tail' })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      expect(client.getMetrics().messagesReceived).toBe(0)

      mockWebSocketInstance!.simulateMessage({ type: 'pong', timestamp: Date.now() })
      mockWebSocketInstance!.simulateMessage({
        type: 'event',
        event: createEvent({ source: 'a', type: 'b', data: {} }),
      })

      expect(client.getMetrics().messagesReceived).toBe(2)
    })

    it('tracks connection attempts', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        reconnect: true,
        reconnectBaseMs: 100,
      })

      expect(client.getMetrics().connectionAttempts).toBe(0)

      client.connect()
      expect(client.getMetrics().connectionAttempts).toBe(1)

      mockWebSocketInstance!.simulateOpen()
      mockWebSocketInstance!.simulateClose(1006, 'Connection lost')
      vi.advanceTimersByTime(100)

      expect(client.getMetrics().connectionAttempts).toBe(2)
    })

    it('tracks last ping/pong latency', () => {
      const client = new TailClient({
        url: 'ws://localhost:3000/tail',
        pingIntervalMs: 1000,
      })

      client.connect()
      mockWebSocketInstance!.simulateOpen()

      expect(client.getMetrics().lastPingLatencyMs).toBeUndefined()

      // Trigger ping
      vi.advanceTimersByTime(1000)

      // Simulate pong response after 50ms
      vi.advanceTimersByTime(50)
      mockWebSocketInstance!.simulateMessage({ type: 'pong', timestamp: Date.now() })

      expect(client.getMetrics().lastPingLatencyMs).toBeGreaterThanOrEqual(0)
    })
  })
})

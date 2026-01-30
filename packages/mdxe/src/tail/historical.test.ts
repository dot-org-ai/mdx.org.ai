/**
 * Tests for Historical Event Retrieval from R2 Storage
 *
 * Tests the fetchHistoricalEvents function and HistoricalTailPoller class
 * for retrieving and polling historical events.
 *
 * @module mdxe/tail/historical.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchHistoricalEvents,
  HistoricalTailPoller,
  buildQueryUrl,
  type HistoricalTailOptions,
  type HistoricalTailResult,
  type PollingOptions,
} from './historical.js'
import { type MdxeEvent, createEvent } from './types.js'
import { type EventFilter } from './filter.js'

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Helper to create test events
const makeEvent = (overrides: Partial<MdxeEvent> = {}): MdxeEvent =>
  createEvent({
    source: 'mdxe-build',
    type: 'build_started',
    importance: 'normal',
    data: {},
    ...overrides,
  })

// Helper to create a mock response
const mockResponse = (data: HistoricalTailResult, ok = true, status = 200) => ({
  ok,
  status,
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
})

describe('buildQueryUrl', () => {
  const baseUrl = 'https://api.example.com/tail'

  it('returns base URL when no options provided', () => {
    const url = buildQueryUrl({ baseUrl })
    expect(url).toBe('https://api.example.com/tail')
  })

  it('adds since parameter as ISO string', () => {
    const since = new Date('2024-01-15T10:00:00Z')
    const url = buildQueryUrl({ baseUrl, since })
    expect(url).toContain('since=2024-01-15T10%3A00%3A00.000Z')
  })

  it('adds until parameter as ISO string', () => {
    const until = new Date('2024-01-15T12:00:00Z')
    const url = buildQueryUrl({ baseUrl, until })
    expect(url).toContain('until=2024-01-15T12%3A00%3A00.000Z')
  })

  it('adds limit parameter', () => {
    const url = buildQueryUrl({ baseUrl, limit: 50 })
    expect(url).toContain('limit=50')
  })

  it('adds offset parameter', () => {
    const url = buildQueryUrl({ baseUrl, offset: 100 })
    expect(url).toContain('offset=100')
  })

  it('adds filter source parameter', () => {
    const url = buildQueryUrl({ baseUrl, filter: { source: 'mdxe-*' } })
    expect(url).toContain('source=mdxe-*')
  })

  it('adds filter type parameter', () => {
    const url = buildQueryUrl({ baseUrl, filter: { type: 'build_started' } })
    expect(url).toContain('type=build_started')
  })

  it('adds filter minImportance parameter', () => {
    const url = buildQueryUrl({ baseUrl, filter: { minImportance: 'high' } })
    expect(url).toContain('minImportance=high')
  })

  it('combines multiple parameters', () => {
    const since = new Date('2024-01-15T10:00:00Z')
    const url = buildQueryUrl({
      baseUrl,
      since,
      limit: 25,
      offset: 50,
      filter: { source: 'mdxe-build', minImportance: 'normal' },
    })
    expect(url).toContain('since=')
    expect(url).toContain('limit=25')
    expect(url).toContain('offset=50')
    expect(url).toContain('source=mdxe-build')
    expect(url).toContain('minImportance=normal')
  })
})

describe('fetchHistoricalEvents', () => {
  const baseUrl = 'https://api.example.com/tail'

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('successful responses', () => {
    it('fetches events from the API', async () => {
      const events = [makeEvent({ timestamp: 1000 }), makeEvent({ timestamp: 2000 })]
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events, hasMore: false })
      )

      const result = await fetchHistoricalEvents({ baseUrl })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(result.events).toHaveLength(2)
      expect(result.hasMore).toBe(false)
    })

    it('passes date range parameters', async () => {
      const since = new Date('2024-01-15T10:00:00Z')
      const until = new Date('2024-01-15T12:00:00Z')
      mockFetch.mockResolvedValueOnce(mockResponse({ events: [], hasMore: false }))

      await fetchHistoricalEvents({ baseUrl, since, until })

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string
      expect(calledUrl).toContain('since=2024-01-15T10%3A00%3A00.000Z')
      expect(calledUrl).toContain('until=2024-01-15T12%3A00%3A00.000Z')
    })

    it('passes pagination parameters', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [], hasMore: true, nextOffset: 100 })
      )

      const result = await fetchHistoricalEvents({ baseUrl, limit: 50, offset: 50 })

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string
      expect(calledUrl).toContain('limit=50')
      expect(calledUrl).toContain('offset=50')
      expect(result.hasMore).toBe(true)
      expect(result.nextOffset).toBe(100)
    })

    it('passes filter parameters', async () => {
      const filter: EventFilter = {
        source: 'mdxe-*',
        type: 'error',
        minImportance: 'high',
      }
      mockFetch.mockResolvedValueOnce(mockResponse({ events: [], hasMore: false }))

      await fetchHistoricalEvents({ baseUrl, filter })

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string
      expect(calledUrl).toContain('source=mdxe-*')
      expect(calledUrl).toContain('type=error')
      expect(calledUrl).toContain('minImportance=high')
    })

    it('returns empty events array when no events found', async () => {
      mockFetch.mockResolvedValueOnce(mockResponse({ events: [], hasMore: false }))

      const result = await fetchHistoricalEvents({ baseUrl })

      expect(result.events).toEqual([])
      expect(result.hasMore).toBe(false)
    })

    it('returns hasMore true with nextOffset when more events available', async () => {
      const events = Array.from({ length: 50 }, (_, i) => makeEvent({ timestamp: i }))
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events, hasMore: true, nextOffset: 50 })
      )

      const result = await fetchHistoricalEvents({ baseUrl, limit: 50 })

      expect(result.events).toHaveLength(50)
      expect(result.hasMore).toBe(true)
      expect(result.nextOffset).toBe(50)
    })
  })

  describe('error handling', () => {
    it('throws on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchHistoricalEvents({ baseUrl })).rejects.toThrow('Network error')
    })

    it('throws on non-OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: vi.fn().mockResolvedValue('Server error'),
      })

      await expect(fetchHistoricalEvents({ baseUrl })).rejects.toThrow(
        'Failed to fetch historical events: 500 Internal Server Error'
      )
    })

    it('throws on 404 response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: vi.fn().mockResolvedValue('Not found'),
      })

      await expect(fetchHistoricalEvents({ baseUrl })).rejects.toThrow(
        'Failed to fetch historical events: 404 Not Found'
      )
    })

    it('throws on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: vi.fn().mockRejectedValue(new SyntaxError('Unexpected token')),
      })

      await expect(fetchHistoricalEvents({ baseUrl })).rejects.toThrow()
    })
  })
})

describe('HistoricalTailPoller', () => {
  const baseUrl = 'https://api.example.com/tail'
  let onEvents: ReturnType<typeof vi.fn>
  let onError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch.mockReset()
    onEvents = vi.fn()
    onError = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('creates a poller with default options', () => {
      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      expect(poller.isPolling()).toBe(false)
    })

    it('accepts custom poll interval', () => {
      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 5000,
      })
      expect(poller.isPolling()).toBe(false)
    })
  })

  describe('start/stop', () => {
    it('starts polling', () => {
      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      poller.start()
      expect(poller.isPolling()).toBe(true)
    })

    it('stops polling', () => {
      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      poller.start()
      poller.stop()
      expect(poller.isPolling()).toBe(false)
    })

    it('fetches immediately on start', async () => {
      const events = [makeEvent({ timestamp: 1000 })]
      mockFetch.mockResolvedValueOnce(mockResponse({ events, hasMore: false }))

      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      poller.start()

      // Wait for the immediate fetch and callback to complete
      await vi.waitFor(() => {
        expect(onEvents).toHaveBeenCalledWith(events)
      })
      expect(mockFetch).toHaveBeenCalledTimes(1)

      poller.stop()
    })

    it('polls at the specified interval', async () => {
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 2000,
      })
      poller.start()

      // Initial fetch
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      // Advance 2 seconds for second poll
      await vi.advanceTimersByTimeAsync(2000)
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })

      // Advance another 2 seconds for third poll
      await vi.advanceTimersByTimeAsync(2000)
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })

      poller.stop()
    })

    it('does not poll after stop', async () => {
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 2000,
      })
      poller.start()

      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      poller.stop()

      const callCountAfterStop = mockFetch.mock.calls.length
      await vi.advanceTimersByTimeAsync(5000)
      // Should not have made any more calls after stop
      expect(mockFetch).toHaveBeenCalledTimes(callCountAfterStop)
    })

    it('can restart after stop', async () => {
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      poller.start()
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })
      poller.stop()

      const callCountAfterStop = mockFetch.mock.calls.length

      // Restart
      poller.start()
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(callCountAfterStop + 1)
      })

      poller.stop()
    })
  })

  describe('deduplication', () => {
    it('deduplicates events by traceId', async () => {
      const event1 = makeEvent({ timestamp: 1000, traceId: 'trace-1' })
      const event2 = makeEvent({ timestamp: 2000, traceId: 'trace-2' })

      // First poll returns both events
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1, event2], hasMore: false })
      )
      // Second poll returns same events (simulating overlap)
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1, event2], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 1000,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()
      expect(onEvents).toHaveBeenCalledWith([event1, event2])

      await vi.advanceTimersByTimeAsync(1000)
      // Second call should be with empty array (all deduplicated)
      expect(onEvents).toHaveBeenLastCalledWith([])

      poller.stop()
    })

    it('deduplicates events by timestamp when no traceId', async () => {
      const event1 = makeEvent({ timestamp: 1000 })
      const event2 = makeEvent({ timestamp: 2000 })

      // First poll
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1, event2], hasMore: false })
      )
      // Second poll returns same timestamps
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1, event2], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 1000,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()
      expect(onEvents).toHaveBeenCalledWith([event1, event2])

      await vi.advanceTimersByTimeAsync(1000)
      expect(onEvents).toHaveBeenLastCalledWith([])

      poller.stop()
    })

    it('emits new events alongside duplicates', async () => {
      const event1 = makeEvent({ timestamp: 1000, traceId: 'trace-1' })
      const event2 = makeEvent({ timestamp: 2000, traceId: 'trace-2' })
      const event3 = makeEvent({ timestamp: 3000, traceId: 'trace-3' })

      // First poll
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1, event2], hasMore: false })
      )
      // Second poll has one old event and one new
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event2, event3], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 1000,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()
      expect(onEvents).toHaveBeenCalledWith([event1, event2])

      await vi.advanceTimersByTimeAsync(1000)
      // Should only emit the new event
      expect(onEvents).toHaveBeenLastCalledWith([event3])

      poller.stop()
    })

    it('clears old entries from dedup set based on time window', async () => {
      const now = Date.now()
      const oldEvent = makeEvent({ timestamp: now - 3600000, traceId: 'old' }) // 1 hour ago
      const newEvent = makeEvent({ timestamp: now, traceId: 'new' })

      // First poll returns old event
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [oldEvent], hasMore: false })
      )
      // After some time, poll returns old event again (should be re-emitted after cleanup)
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [oldEvent, newEvent], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 1000,
        // Use a short dedup window for testing
        dedupWindowMs: 500,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()
      expect(onEvents).toHaveBeenCalledWith([oldEvent])

      // Advance past the dedup window
      await vi.advanceTimersByTimeAsync(1000)
      // Old event should be re-emitted since its entry was cleaned up
      expect(onEvents).toHaveBeenLastCalledWith([oldEvent, newEvent])

      poller.stop()
    })
  })

  describe('error handling', () => {
    it('calls onError when fetch fails', async () => {
      const error = new Error('Network failure')
      mockFetch.mockRejectedValueOnce(error)

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        onError,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()

      expect(onError).toHaveBeenCalledWith(error)
      expect(onEvents).not.toHaveBeenCalled()
    })

    it('continues polling after error', async () => {
      const error = new Error('Network failure')
      mockFetch.mockRejectedValueOnce(error)
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [makeEvent()], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        onError,
        pollIntervalMs: 1000,
      })
      poller.start()

      // First poll fails
      await vi.runOnlyPendingTimersAsync()
      expect(onError).toHaveBeenCalledTimes(1)

      // Second poll succeeds
      await vi.advanceTimersByTimeAsync(1000)
      expect(onEvents).toHaveBeenCalledTimes(1)

      poller.stop()
    })

    it('does not throw when onError not provided', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'))

      const poller = new HistoricalTailPoller({ baseUrl, onEvents })
      poller.start()

      // Should not throw
      await expect(vi.runOnlyPendingTimersAsync()).resolves.not.toThrow()

      poller.stop()
    })
  })

  describe('filter application', () => {
    it('passes filter to API requests', async () => {
      const filter: EventFilter = {
        source: 'mdxe-build',
        type: 'error',
        minImportance: 'high',
      }
      mockFetch.mockResolvedValue(mockResponse({ events: [], hasMore: false }))

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        filter,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string
      expect(calledUrl).toContain('source=mdxe-build')
      expect(calledUrl).toContain('type=error')
      expect(calledUrl).toContain('minImportance=high')

      poller.stop()
    })

    it('updates since parameter on each poll to fetch only new events', async () => {
      const now = Date.now()
      const event1 = makeEvent({ timestamp: now, traceId: 'trace-1' })
      const event2 = makeEvent({ timestamp: now + 1000, traceId: 'trace-2' })

      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event1], hasMore: false })
      )
      mockFetch.mockResolvedValueOnce(
        mockResponse({ events: [event2], hasMore: false })
      )

      const poller = new HistoricalTailPoller({
        baseUrl,
        onEvents,
        pollIntervalMs: 1000,
      })
      poller.start()

      await vi.runOnlyPendingTimersAsync()

      // Second poll should use 'since' parameter based on last event timestamp
      await vi.advanceTimersByTimeAsync(1000)

      // The second call should have a since parameter
      const secondCallUrl = mockFetch.mock.calls[1]?.[0] as string
      expect(secondCallUrl).toContain('since=')

      poller.stop()
    })
  })
})

/**
 * Historical Event Retrieval from R2 Storage
 *
 * Provides functions for fetching and polling historical events
 * from the mdxe tail API endpoint.
 *
 * @module mdxe/tail/historical
 */

import { type MdxeEvent } from './types.js'
import { type EventFilter } from './filter.js'

/**
 * Options for fetching historical events
 */
export interface HistoricalTailOptions {
  /** Base URL of the tail API endpoint */
  baseUrl: string
  /** Filter to apply to events */
  filter?: EventFilter
  /** Start of the time range (inclusive) */
  since?: Date
  /** End of the time range (exclusive) */
  until?: Date
  /** Maximum number of events to return */
  limit?: number
  /** Number of events to skip */
  offset?: number
}

/**
 * Result of fetching historical events
 */
export interface HistoricalTailResult {
  /** The fetched events */
  events: MdxeEvent[]
  /** Whether there are more events available */
  hasMore: boolean
  /** Offset for the next page, if hasMore is true */
  nextOffset?: number
}

/**
 * Build the query URL for the tail API
 *
 * @param options - Options for building the URL
 * @returns The complete URL with query parameters
 */
export function buildQueryUrl(options: HistoricalTailOptions): string {
  const url = new URL(options.baseUrl)

  if (options.since) {
    url.searchParams.set('since', options.since.toISOString())
  }
  if (options.until) {
    url.searchParams.set('until', options.until.toISOString())
  }
  if (options.limit !== undefined) {
    url.searchParams.set('limit', String(options.limit))
  }
  if (options.offset !== undefined) {
    url.searchParams.set('offset', String(options.offset))
  }
  if (options.filter?.source) {
    url.searchParams.set('source', options.filter.source)
  }
  if (options.filter?.type) {
    url.searchParams.set('type', options.filter.type)
  }
  if (options.filter?.minImportance) {
    url.searchParams.set('minImportance', options.filter.minImportance)
  }

  return url.toString()
}

/**
 * Fetch historical events from the tail API
 *
 * @param options - Options for fetching events
 * @returns The fetched events and pagination info
 * @throws Error if the fetch fails or returns a non-OK response
 *
 * @example
 * ```ts
 * const result = await fetchHistoricalEvents({
 *   baseUrl: 'https://api.example.com/tail',
 *   since: new Date('2024-01-15T10:00:00Z'),
 *   limit: 50,
 *   filter: { source: 'mdxe-*', minImportance: 'high' },
 * })
 *
 * console.log(`Fetched ${result.events.length} events`)
 * if (result.hasMore) {
 *   // Fetch more with result.nextOffset
 * }
 * ```
 */
export async function fetchHistoricalEvents(
  options: HistoricalTailOptions
): Promise<HistoricalTailResult> {
  const url = buildQueryUrl(options)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(
      `Failed to fetch historical events: ${response.status} ${response.statusText}`
    )
  }

  const data = (await response.json()) as HistoricalTailResult

  return {
    events: data.events ?? [],
    hasMore: data.hasMore ?? false,
    nextOffset: data.nextOffset,
  }
}

/**
 * Options for the historical tail poller
 */
export interface PollingOptions extends HistoricalTailOptions {
  /** Callback for new events */
  onEvents: (events: MdxeEvent[]) => void
  /** Callback for errors */
  onError?: (error: Error) => void
  /** Polling interval in milliseconds (default: 2000) */
  pollIntervalMs?: number
  /** Deduplication window in milliseconds (default: 60000) */
  dedupWindowMs?: number
}

/**
 * Generate a unique key for an event for deduplication
 *
 * Uses traceId if available, otherwise falls back to timestamp + source + type
 */
function getEventKey(event: MdxeEvent): string {
  if (event.traceId) {
    return event.traceId
  }
  return `${event.timestamp}:${event.source}:${event.type}`
}

/**
 * Poller for continuously fetching historical events with deduplication
 *
 * @example
 * ```ts
 * const poller = new HistoricalTailPoller({
 *   baseUrl: 'https://api.example.com/tail',
 *   onEvents: (events) => {
 *     events.forEach(event => console.log(event))
 *   },
 *   onError: (error) => {
 *     console.error('Polling error:', error)
 *   },
 *   pollIntervalMs: 2000,
 * })
 *
 * poller.start()
 *
 * // Later...
 * poller.stop()
 * ```
 */
export class HistoricalTailPoller {
  private readonly baseUrl: string
  private readonly filter?: EventFilter
  private readonly onEvents: (events: MdxeEvent[]) => void
  private readonly onError?: (error: Error) => void
  private readonly pollIntervalMs: number
  private readonly dedupWindowMs: number

  private polling = false
  private timeoutId?: ReturnType<typeof setTimeout>
  private seenEvents = new Map<string, number>() // key -> timestamp seen
  private lastEventTimestamp?: number

  constructor(options: PollingOptions) {
    this.baseUrl = options.baseUrl
    this.filter = options.filter
    this.onEvents = options.onEvents
    this.onError = options.onError
    this.pollIntervalMs = options.pollIntervalMs ?? 2000
    this.dedupWindowMs = options.dedupWindowMs ?? 60000
  }

  /**
   * Start polling for events
   */
  start(): void {
    if (this.polling) return
    this.polling = true
    this.poll()
  }

  /**
   * Stop polling for events
   */
  stop(): void {
    this.polling = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = undefined
    }
  }

  /**
   * Check if currently polling
   */
  isPolling(): boolean {
    return this.polling
  }

  private async poll(): Promise<void> {
    if (!this.polling) return

    try {
      // Clean up old entries from dedup set
      this.cleanupSeenEvents()

      const result = await fetchHistoricalEvents({
        baseUrl: this.baseUrl,
        filter: this.filter,
        since: this.lastEventTimestamp ? new Date(this.lastEventTimestamp) : undefined,
      })

      // Deduplicate events
      const newEvents = result.events.filter((event) => {
        const key = getEventKey(event)
        if (this.seenEvents.has(key)) {
          return false
        }
        this.seenEvents.set(key, Date.now())
        return true
      })

      // Update last event timestamp for next poll
      if (result.events.length > 0) {
        const maxTimestamp = Math.max(...result.events.map((e) => e.timestamp))
        if (!this.lastEventTimestamp || maxTimestamp > this.lastEventTimestamp) {
          this.lastEventTimestamp = maxTimestamp
        }
      }

      // Emit new events
      this.onEvents(newEvents)
    } catch (error) {
      if (this.onError && error instanceof Error) {
        this.onError(error)
      }
    }

    // Schedule next poll
    if (this.polling) {
      this.timeoutId = setTimeout(() => this.poll(), this.pollIntervalMs)
    }
  }

  /**
   * Remove entries from the seen events map that are older than the dedup window
   */
  private cleanupSeenEvents(): void {
    const now = Date.now()
    const cutoff = now - this.dedupWindowMs

    for (const [key, timestamp] of this.seenEvents) {
      if (timestamp < cutoff) {
        this.seenEvents.delete(key)
      }
    }
  }
}

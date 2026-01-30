/**
 * MDXE Tail - Event Types and Filtering
 *
 * Provides event types and filtering utilities for the mdxe tail command.
 * Used for real-time event streaming and filtering in development and production.
 *
 * @example
 * ```ts
 * import {
 *   createEvent,
 *   matchesFilter,
 *   type MdxeEvent,
 *   type EventFilter,
 * } from 'mdxe/tail'
 *
 * // Create an event
 * const event = createEvent({
 *   source: 'mdxe-build',
 *   type: 'build_started',
 *   data: { target: 'production' },
 * })
 *
 * // Filter events
 * const filter: EventFilter = {
 *   source: 'mdxe-*',
 *   minImportance: 'high',
 * }
 *
 * if (matchesFilter(event, filter)) {
 *   console.log('Event matches filter:', event)
 * }
 * ```
 *
 * @module mdxe/tail
 */

// Types
export {
  type MdxeEvent,
  type EventImportance,
  type CreateEventOptions,
  MdxeEventSchema,
  EventImportanceSchema,
  IMPORTANCE_LEVELS,
  isValidImportance,
  createEvent,
} from './types.js'

// Filtering
export {
  type EventFilter,
  EventFilterSchema,
  matchesFilter,
  compareImportance,
} from './filter.js'

// WebSocket Client
export {
  TailClient,
  type TailClientOptions,
  type TailClientMetrics,
  type TailClientMessage,
  type TailServerMessage,
} from './ws-client.js'

// Historical retrieval
export {
  type HistoricalTailOptions,
  type HistoricalTailResult,
  type PollingOptions,
  fetchHistoricalEvents,
  buildQueryUrl,
  HistoricalTailPoller,
} from './historical.js'

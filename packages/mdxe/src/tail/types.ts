/**
 * MDXE Tail Event Types
 *
 * Defines the core types for event collection and filtering
 * in the mdxe tail command system.
 *
 * Inspired by DuckTail patterns from ducktail.
 *
 * @module mdxe/tail/types
 */

import { z } from 'zod'

/**
 * Event importance levels for prioritization and filtering.
 *
 * - `critical`: Errors, failures, must-see events
 * - `high`: Important events, warnings
 * - `normal`: Standard events (default)
 * - `low`: Verbose debugging, informational
 */
export const IMPORTANCE_LEVELS = ['critical', 'high', 'normal', 'low'] as const

/**
 * Event importance type
 */
export type EventImportance = (typeof IMPORTANCE_LEVELS)[number]

/**
 * Zod schema for EventImportance validation
 */
export const EventImportanceSchema = z.enum(IMPORTANCE_LEVELS)

/**
 * Check if a string is a valid importance level
 */
export function isValidImportance(value: string): value is EventImportance {
  return IMPORTANCE_LEVELS.includes(value as EventImportance)
}

/**
 * Zod schema for MdxeEvent validation
 */
export const MdxeEventSchema = z.object({
  /** Unix timestamp in milliseconds */
  timestamp: z.number(),
  /** Source identifier (e.g., "mdxe-build", "mdxe-test", "mdxe-dev") */
  source: z.string(),
  /** Event type/name for categorization (e.g., "build_started", "test_passed", "error") */
  type: z.string(),
  /** Importance level for filtering */
  importance: EventImportanceSchema,
  /** Event payload data */
  data: z.record(z.unknown()),
  /** Optional trace ID for correlation */
  traceId: z.string().optional(),
})

/**
 * A single event in the mdxe system
 */
export interface MdxeEvent {
  /** Unix timestamp in milliseconds */
  timestamp: number
  /** Source identifier (e.g., "mdxe-build", "mdxe-test", "mdxe-dev") */
  source: string
  /** Event type/name for categorization (e.g., "build_started", "test_passed", "error") */
  type: string
  /** Importance level for filtering */
  importance: EventImportance
  /** Event payload data */
  data: Record<string, unknown>
  /** Optional trace ID for correlation */
  traceId?: string
}

/**
 * Options for creating an event
 */
export interface CreateEventOptions {
  /** Source identifier */
  source: string
  /** Event type */
  type: string
  /** Event data */
  data: Record<string, unknown>
  /** Importance level (defaults to 'normal') */
  importance?: EventImportance
  /** Optional trace ID */
  traceId?: string
  /** Custom timestamp (defaults to Date.now()) */
  timestamp?: number
}

/**
 * Create a new MdxeEvent with defaults
 *
 * @param options - Event creation options
 * @returns A complete MdxeEvent
 *
 * @example
 * ```ts
 * const event = createEvent({
 *   source: 'mdxe-build',
 *   type: 'build_started',
 *   data: { target: 'production' },
 * })
 * ```
 */
export function createEvent(options: CreateEventOptions): MdxeEvent {
  return {
    timestamp: options.timestamp ?? Date.now(),
    source: options.source,
    type: options.type,
    importance: options.importance ?? 'normal',
    data: options.data,
    ...(options.traceId !== undefined && { traceId: options.traceId }),
  }
}

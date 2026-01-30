/**
 * MDXE Tail Event Filtering
 *
 * Provides event filtering logic for the mdxe tail command.
 * Supports source prefix matching, type exact matching,
 * and importance-based filtering.
 *
 * @module mdxe/tail/filter
 */

import { z } from 'zod'
import { type MdxeEvent, type EventImportance, EventImportanceSchema, IMPORTANCE_LEVELS } from './types.js'

/**
 * Zod schema for EventFilter validation
 */
export const EventFilterSchema = z.object({
  /** Filter by source (exact match or prefix with * wildcard) */
  source: z.string().optional(),
  /** Filter by event type (exact match) */
  type: z.string().optional(),
  /** Minimum importance level */
  minImportance: EventImportanceSchema.optional(),
})

/**
 * Filter for event subscriptions
 */
export interface EventFilter {
  /** Filter by source (exact match or prefix with * wildcard) */
  source?: string
  /** Filter by event type (exact match) */
  type?: string
  /** Minimum importance level */
  minImportance?: EventImportance
}

/**
 * Compare two importance levels.
 *
 * Returns:
 * - Positive number if `a` is higher importance than `b`
 * - Negative number if `a` is lower importance than `b`
 * - 0 if they are equal
 *
 * Importance order (highest to lowest): critical > high > normal > low
 *
 * @param a - First importance level
 * @param b - Second importance level
 * @returns Comparison result
 *
 * @example
 * ```ts
 * compareImportance('critical', 'low') // > 0
 * compareImportance('low', 'high') // < 0
 * compareImportance('normal', 'normal') // === 0
 * ```
 */
export function compareImportance(a: EventImportance, b: EventImportance): number {
  // Lower index = higher importance
  const indexA = IMPORTANCE_LEVELS.indexOf(a)
  const indexB = IMPORTANCE_LEVELS.indexOf(b)
  // Return negative of difference so that higher importance (lower index) returns positive
  return indexB - indexA
}

/**
 * Check if a source matches a filter pattern.
 *
 * - If pattern ends with `*`, matches any source starting with the prefix
 * - If pattern is just `*`, matches all sources
 * - Otherwise, requires exact match
 *
 * @param source - The event source to check
 * @param pattern - The filter pattern
 * @returns Whether the source matches
 */
function matchesSource(source: string, pattern: string): boolean {
  if (pattern === '*') {
    return true
  }
  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1)
    return source.startsWith(prefix)
  }
  return source === pattern
}

/**
 * Check if an event's importance meets the minimum threshold.
 *
 * @param eventImportance - The event's importance level
 * @param minImportance - The minimum required importance
 * @returns Whether the event meets or exceeds the minimum
 */
function meetsMinImportance(eventImportance: EventImportance, minImportance: EventImportance): boolean {
  // Event importance must be >= minImportance
  // compareImportance returns positive if first is higher importance
  return compareImportance(eventImportance, minImportance) >= 0
}

/**
 * Check if an event matches a filter.
 *
 * All specified filter conditions must match (AND logic).
 * If a filter field is not specified, it matches all values.
 *
 * @param event - The event to check
 * @param filter - The filter to apply
 * @returns Whether the event matches all filter conditions
 *
 * @example
 * ```ts
 * const event = createEvent({
 *   source: 'mdxe-build',
 *   type: 'error',
 *   importance: 'critical',
 *   data: {},
 * })
 *
 * // Matches - source starts with 'mdxe-'
 * matchesFilter(event, { source: 'mdxe-*' }) // true
 *
 * // Matches - type is exactly 'error'
 * matchesFilter(event, { type: 'error' }) // true
 *
 * // Matches - critical >= high
 * matchesFilter(event, { minImportance: 'high' }) // true
 *
 * // Doesn't match - type is 'error', not 'warning'
 * matchesFilter(event, { type: 'warning' }) // false
 * ```
 */
export function matchesFilter(event: MdxeEvent, filter: EventFilter): boolean {
  // Check source filter
  if (filter.source !== undefined && !matchesSource(event.source, filter.source)) {
    return false
  }

  // Check type filter (exact match only, no wildcards)
  if (filter.type !== undefined && event.type !== filter.type) {
    return false
  }

  // Check importance filter
  if (filter.minImportance !== undefined && !meetsMinImportance(event.importance, filter.minImportance)) {
    return false
  }

  return true
}

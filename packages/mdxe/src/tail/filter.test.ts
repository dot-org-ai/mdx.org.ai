/**
 * Tests for EventFilter matching logic
 *
 * @module mdxe/tail/filter.test
 */

import { describe, it, expect } from 'vitest'
import {
  type EventFilter,
  EventFilterSchema,
  matchesFilter,
  compareImportance,
} from './filter.js'
import { type MdxeEvent, createEvent } from './types.js'

describe('EventFilter Schema', () => {
  it('allows empty filter (matches all)', () => {
    const result = EventFilterSchema.safeParse({})
    expect(result.success).toBe(true)
  })

  it('allows source filter', () => {
    const result = EventFilterSchema.safeParse({ source: 'mdxe-build' })
    expect(result.success).toBe(true)
  })

  it('allows source filter with wildcard', () => {
    const result = EventFilterSchema.safeParse({ source: 'mdxe-*' })
    expect(result.success).toBe(true)
  })

  it('allows type filter', () => {
    const result = EventFilterSchema.safeParse({ type: 'build_started' })
    expect(result.success).toBe(true)
  })

  it('allows minImportance filter', () => {
    const result = EventFilterSchema.safeParse({ minImportance: 'high' })
    expect(result.success).toBe(true)
  })

  it('allows combined filters', () => {
    const result = EventFilterSchema.safeParse({
      source: 'mdxe-*',
      type: 'error',
      minImportance: 'critical',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid minImportance', () => {
    const result = EventFilterSchema.safeParse({ minImportance: 'invalid' })
    expect(result.success).toBe(false)
  })
})

describe('compareImportance', () => {
  it('returns 0 for equal importance', () => {
    expect(compareImportance('critical', 'critical')).toBe(0)
    expect(compareImportance('high', 'high')).toBe(0)
    expect(compareImportance('normal', 'normal')).toBe(0)
    expect(compareImportance('low', 'low')).toBe(0)
  })

  it('returns positive when first is higher importance', () => {
    expect(compareImportance('critical', 'high')).toBeGreaterThan(0)
    expect(compareImportance('critical', 'normal')).toBeGreaterThan(0)
    expect(compareImportance('critical', 'low')).toBeGreaterThan(0)
    expect(compareImportance('high', 'normal')).toBeGreaterThan(0)
    expect(compareImportance('high', 'low')).toBeGreaterThan(0)
    expect(compareImportance('normal', 'low')).toBeGreaterThan(0)
  })

  it('returns negative when first is lower importance', () => {
    expect(compareImportance('low', 'normal')).toBeLessThan(0)
    expect(compareImportance('low', 'high')).toBeLessThan(0)
    expect(compareImportance('low', 'critical')).toBeLessThan(0)
    expect(compareImportance('normal', 'high')).toBeLessThan(0)
    expect(compareImportance('normal', 'critical')).toBeLessThan(0)
    expect(compareImportance('high', 'critical')).toBeLessThan(0)
  })
})

describe('matchesFilter', () => {
  // Helper to create test events
  const makeEvent = (overrides: Partial<MdxeEvent> = {}): MdxeEvent =>
    createEvent({
      source: 'mdxe-build',
      type: 'build_started',
      importance: 'normal',
      data: {},
      ...overrides,
    })

  describe('empty filter', () => {
    it('matches all events', () => {
      const filter: EventFilter = {}
      expect(matchesFilter(makeEvent(), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: 'other' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ type: 'different' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'critical' }), filter)).toBe(true)
    })
  })

  describe('source filtering', () => {
    it('matches exact source', () => {
      const filter: EventFilter = { source: 'mdxe-build' }
      expect(matchesFilter(makeEvent({ source: 'mdxe-build' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: 'mdxe-test' }), filter)).toBe(false)
    })

    it('matches source prefix with wildcard', () => {
      const filter: EventFilter = { source: 'mdxe-*' }
      expect(matchesFilter(makeEvent({ source: 'mdxe-build' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: 'mdxe-test' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: 'mdxe-dev' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: 'other-service' }), filter)).toBe(false)
    })

    it('handles wildcard at different positions', () => {
      // Wildcard at end (prefix match)
      expect(matchesFilter(makeEvent({ source: 'mdxe-build' }), { source: 'mdxe-*' })).toBe(true)

      // No wildcard means exact match
      expect(matchesFilter(makeEvent({ source: 'mdxe-build' }), { source: 'mdxe-' })).toBe(false)
      expect(matchesFilter(makeEvent({ source: 'mdxe-' }), { source: 'mdxe-' })).toBe(true)
    })

    it('handles single wildcard to match all', () => {
      const filter: EventFilter = { source: '*' }
      expect(matchesFilter(makeEvent({ source: 'anything' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ source: '' }), filter)).toBe(true)
    })
  })

  describe('type filtering', () => {
    it('matches exact type', () => {
      const filter: EventFilter = { type: 'build_started' }
      expect(matchesFilter(makeEvent({ type: 'build_started' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ type: 'build_finished' }), filter)).toBe(false)
    })

    it('requires exact match (no wildcards)', () => {
      const filter: EventFilter = { type: 'build_*' }
      expect(matchesFilter(makeEvent({ type: 'build_started' }), filter)).toBe(false)
      expect(matchesFilter(makeEvent({ type: 'build_*' }), filter)).toBe(true)
    })
  })

  describe('importance filtering', () => {
    it('matches events at or above minImportance', () => {
      const filter: EventFilter = { minImportance: 'high' }

      expect(matchesFilter(makeEvent({ importance: 'critical' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'high' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'normal' }), filter)).toBe(false)
      expect(matchesFilter(makeEvent({ importance: 'low' }), filter)).toBe(false)
    })

    it('allows all levels when minImportance is low', () => {
      const filter: EventFilter = { minImportance: 'low' }

      expect(matchesFilter(makeEvent({ importance: 'critical' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'high' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'normal' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'low' }), filter)).toBe(true)
    })

    it('only allows critical when minImportance is critical', () => {
      const filter: EventFilter = { minImportance: 'critical' }

      expect(matchesFilter(makeEvent({ importance: 'critical' }), filter)).toBe(true)
      expect(matchesFilter(makeEvent({ importance: 'high' }), filter)).toBe(false)
      expect(matchesFilter(makeEvent({ importance: 'normal' }), filter)).toBe(false)
      expect(matchesFilter(makeEvent({ importance: 'low' }), filter)).toBe(false)
    })
  })

  describe('combined filters', () => {
    it('requires all conditions to match', () => {
      const filter: EventFilter = {
        source: 'mdxe-*',
        type: 'error',
        minImportance: 'high',
      }

      // All match
      expect(
        matchesFilter(
          makeEvent({
            source: 'mdxe-build',
            type: 'error',
            importance: 'critical',
          }),
          filter
        )
      ).toBe(true)

      // Source doesn't match
      expect(
        matchesFilter(
          makeEvent({
            source: 'other-service',
            type: 'error',
            importance: 'critical',
          }),
          filter
        )
      ).toBe(false)

      // Type doesn't match
      expect(
        matchesFilter(
          makeEvent({
            source: 'mdxe-build',
            type: 'warning',
            importance: 'critical',
          }),
          filter
        )
      ).toBe(false)

      // Importance doesn't match
      expect(
        matchesFilter(
          makeEvent({
            source: 'mdxe-build',
            type: 'error',
            importance: 'normal',
          }),
          filter
        )
      ).toBe(false)
    })
  })
})

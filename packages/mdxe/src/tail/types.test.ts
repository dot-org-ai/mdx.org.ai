/**
 * Tests for MdxeEvent type structure and validation
 *
 * @module mdxe/tail/types.test
 */

import { describe, it, expect } from 'vitest'
import {
  type MdxeEvent,
  type EventImportance,
  MdxeEventSchema,
  EventImportanceSchema,
  createEvent,
  isValidImportance,
  IMPORTANCE_LEVELS,
} from './types.js'

describe('EventImportance', () => {
  it('has four levels in order: critical, high, normal, low', () => {
    expect(IMPORTANCE_LEVELS).toEqual(['critical', 'high', 'normal', 'low'])
  })

  it('validates valid importance levels', () => {
    expect(isValidImportance('critical')).toBe(true)
    expect(isValidImportance('high')).toBe(true)
    expect(isValidImportance('normal')).toBe(true)
    expect(isValidImportance('low')).toBe(true)
  })

  it('rejects invalid importance levels', () => {
    expect(isValidImportance('invalid')).toBe(false)
    expect(isValidImportance('')).toBe(false)
    expect(isValidImportance('CRITICAL')).toBe(false)
  })
})

describe('MdxeEvent', () => {
  const validEvent: MdxeEvent = {
    timestamp: Date.now(),
    source: 'mdxe-build',
    type: 'build_started',
    importance: 'normal',
    data: { target: 'production' },
  }

  describe('type structure', () => {
    it('requires timestamp as Unix ms', () => {
      const event = { ...validEvent, timestamp: 1706644800000 }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('requires source as string', () => {
      const event = { ...validEvent, source: 'mdxe-test' }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('requires type as string', () => {
      const event = { ...validEvent, type: 'test_passed' }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('requires importance as valid level', () => {
      const event = { ...validEvent, importance: 'critical' as const }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('requires data as Record<string, unknown>', () => {
      const event = { ...validEvent, data: { key: 'value', nested: { a: 1 } } }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(true)
    })

    it('allows optional traceId', () => {
      const withTrace = { ...validEvent, traceId: 'trace-123' }
      const withoutTrace = { ...validEvent }
      delete (withoutTrace as any).traceId

      expect(MdxeEventSchema.safeParse(withTrace).success).toBe(true)
      expect(MdxeEventSchema.safeParse(withoutTrace).success).toBe(true)
    })
  })

  describe('validation', () => {
    it('rejects event without timestamp', () => {
      const event = { ...validEvent } as any
      delete event.timestamp
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('rejects event with invalid timestamp', () => {
      const event = { ...validEvent, timestamp: 'not-a-number' }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('rejects event without source', () => {
      const event = { ...validEvent } as any
      delete event.source
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('rejects event without type', () => {
      const event = { ...validEvent } as any
      delete event.type
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('rejects event with invalid importance', () => {
      const event = { ...validEvent, importance: 'invalid' }
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })

    it('rejects event without data', () => {
      const event = { ...validEvent } as any
      delete event.data
      const result = MdxeEventSchema.safeParse(event)
      expect(result.success).toBe(false)
    })
  })
})

describe('createEvent', () => {
  it('creates event with all required fields', () => {
    const event = createEvent({
      source: 'mdxe-build',
      type: 'build_started',
      data: { target: 'production' },
    })

    expect(event.source).toBe('mdxe-build')
    expect(event.type).toBe('build_started')
    expect(event.data).toEqual({ target: 'production' })
    expect(typeof event.timestamp).toBe('number')
    expect(event.importance).toBe('normal') // default
  })

  it('creates event with custom importance', () => {
    const event = createEvent({
      source: 'mdxe-error',
      type: 'error',
      importance: 'critical',
      data: { message: 'Something failed' },
    })

    expect(event.importance).toBe('critical')
  })

  it('creates event with traceId', () => {
    const event = createEvent({
      source: 'mdxe-test',
      type: 'test_started',
      data: {},
      traceId: 'trace-abc-123',
    })

    expect(event.traceId).toBe('trace-abc-123')
  })

  it('generates timestamp automatically', () => {
    const before = Date.now()
    const event = createEvent({
      source: 'mdxe-dev',
      type: 'dev_started',
      data: {},
    })
    const after = Date.now()

    expect(event.timestamp).toBeGreaterThanOrEqual(before)
    expect(event.timestamp).toBeLessThanOrEqual(after)
  })

  it('allows custom timestamp', () => {
    const customTimestamp = 1706644800000
    const event = createEvent({
      source: 'mdxe-build',
      type: 'build_started',
      data: {},
      timestamp: customTimestamp,
    })

    expect(event.timestamp).toBe(customTimestamp)
  })
})

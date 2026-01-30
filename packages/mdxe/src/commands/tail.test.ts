/**
 * Tests for mdxe tail command
 *
 * @module mdxe/commands/tail.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  parseTailArgs,
  formatEvent,
  getColorForImportance,
  type TailCommandOptions,
} from './tail.js'
import { createEvent, type MdxeEvent, type EventImportance } from '../tail/types.js'

describe('parseTailArgs', () => {
  describe('Mode Options', () => {
    it('defaults to historical mode (not live, not follow)', () => {
      const result = parseTailArgs([])
      expect(result.live).toBe(false)
      expect(result.follow).toBe(false)
    })

    it('parses --live flag', () => {
      const result = parseTailArgs(['--live'])
      expect(result.live).toBe(true)
    })

    it('parses --follow flag', () => {
      const result = parseTailArgs(['--follow'])
      expect(result.follow).toBe(true)
    })

    it('parses -f short option for follow', () => {
      const result = parseTailArgs(['-f'])
      expect(result.follow).toBe(true)
    })
  })

  describe('Filter Options', () => {
    it('parses --source filter', () => {
      const result = parseTailArgs(['--source', 'mdxe-build'])
      expect(result.filter?.source).toBe('mdxe-build')
    })

    it('parses --type filter', () => {
      const result = parseTailArgs(['--type', 'error'])
      expect(result.filter?.type).toBe('error')
    })

    it('parses --importance filter', () => {
      const result = parseTailArgs(['--importance', 'high'])
      expect(result.filter?.minImportance).toBe('high')
    })

    it('parses -i short option for importance', () => {
      const result = parseTailArgs(['-i', 'critical'])
      expect(result.filter?.minImportance).toBe('critical')
    })

    it('handles wildcard source patterns', () => {
      const result = parseTailArgs(['--source', 'mdxe-*'])
      expect(result.filter?.source).toBe('mdxe-*')
    })
  })

  describe('Time Range Options', () => {
    it('parses --since option', () => {
      const result = parseTailArgs(['--since', '2024-01-15T10:00:00Z'])
      expect(result.since).toBeInstanceOf(Date)
      expect(result.since?.toISOString()).toBe('2024-01-15T10:00:00.000Z')
    })

    it('parses --until option', () => {
      const result = parseTailArgs(['--until', '2024-01-16T10:00:00Z'])
      expect(result.until).toBeInstanceOf(Date)
      expect(result.until?.toISOString()).toBe('2024-01-16T10:00:00.000Z')
    })

    it('parses relative time --since 1h', () => {
      const before = Date.now()
      const result = parseTailArgs(['--since', '1h'])
      const after = Date.now()

      // Should be approximately 1 hour ago
      const oneHourMs = 60 * 60 * 1000
      expect(result.since).toBeInstanceOf(Date)
      expect(result.since!.getTime()).toBeGreaterThanOrEqual(before - oneHourMs - 100)
      expect(result.since!.getTime()).toBeLessThanOrEqual(after - oneHourMs + 100)
    })

    it('parses relative time --since 30m', () => {
      const before = Date.now()
      const result = parseTailArgs(['--since', '30m'])
      const after = Date.now()

      const thirtyMinMs = 30 * 60 * 1000
      expect(result.since).toBeInstanceOf(Date)
      expect(result.since!.getTime()).toBeGreaterThanOrEqual(before - thirtyMinMs - 100)
      expect(result.since!.getTime()).toBeLessThanOrEqual(after - thirtyMinMs + 100)
    })
  })

  describe('Output Options', () => {
    it('parses --limit option', () => {
      const result = parseTailArgs(['--limit', '50'])
      expect(result.limit).toBe(50)
    })

    it('parses -n short option for limit', () => {
      const result = parseTailArgs(['-n', '100'])
      expect(result.limit).toBe(100)
    })

    it('parses --json flag for JSON output', () => {
      const result = parseTailArgs(['--json'])
      expect(result.json).toBe(true)
    })

    it('parses --no-color flag', () => {
      const result = parseTailArgs(['--no-color'])
      expect(result.noColor).toBe(true)
    })
  })

  describe('Server Options', () => {
    it('parses --url option', () => {
      const result = parseTailArgs(['--url', 'https://api.example.com/tail'])
      expect(result.url).toBe('https://api.example.com/tail')
    })

    it('defaults URL from environment variable', () => {
      const original = process.env.MDXE_TAIL_URL
      process.env.MDXE_TAIL_URL = 'https://env.example.com/tail'

      const result = parseTailArgs([])
      expect(result.url).toBe('https://env.example.com/tail')

      if (original !== undefined) {
        process.env.MDXE_TAIL_URL = original
      } else {
        delete process.env.MDXE_TAIL_URL
      }
    })
  })

  describe('Complex Combinations', () => {
    it('parses multiple options together', () => {
      const result = parseTailArgs([
        '--live',
        '--source', 'mdxe-*',
        '--importance', 'high',
        '--limit', '100',
        '--json',
      ])

      expect(result.live).toBe(true)
      expect(result.filter?.source).toBe('mdxe-*')
      expect(result.filter?.minImportance).toBe('high')
      expect(result.limit).toBe(100)
      expect(result.json).toBe(true)
    })

    it('handles follow with filters', () => {
      const result = parseTailArgs([
        '-f',
        '--type', 'error',
        '-i', 'critical',
      ])

      expect(result.follow).toBe(true)
      expect(result.filter?.type).toBe('error')
      expect(result.filter?.minImportance).toBe('critical')
    })
  })
})

describe('getColorForImportance', () => {
  it('returns red for critical', () => {
    expect(getColorForImportance('critical')).toBe('\x1b[31m')
  })

  it('returns yellow for high', () => {
    expect(getColorForImportance('high')).toBe('\x1b[33m')
  })

  it('returns default/reset for normal', () => {
    expect(getColorForImportance('normal')).toBe('\x1b[0m')
  })

  it('returns gray for low', () => {
    expect(getColorForImportance('low')).toBe('\x1b[90m')
  })
})

describe('formatEvent', () => {
  const baseEvent: MdxeEvent = {
    timestamp: 1706644800000, // 2024-01-30T20:00:00.000Z
    source: 'mdxe-build',
    type: 'build_started',
    importance: 'normal',
    data: { target: 'production' },
  }

  describe('Default (colored) format', () => {
    it('formats event with timestamp, importance, source, type', () => {
      const output = formatEvent(baseEvent, { noColor: false, json: false })

      expect(output).toContain('2024-01-30')
      expect(output).toContain('mdxe-build')
      expect(output).toContain('build_started')
      expect(output).toContain('normal')
    })

    it('includes data as JSON', () => {
      const output = formatEvent(baseEvent, { noColor: false, json: false })
      expect(output).toContain('target')
      expect(output).toContain('production')
    })

    it('applies color for critical events', () => {
      const event = { ...baseEvent, importance: 'critical' as EventImportance }
      const output = formatEvent(event, { noColor: false, json: false })
      expect(output).toContain('\x1b[31m') // red
    })

    it('applies color for high events', () => {
      const event = { ...baseEvent, importance: 'high' as EventImportance }
      const output = formatEvent(event, { noColor: false, json: false })
      expect(output).toContain('\x1b[33m') // yellow
    })

    it('applies gray for low events', () => {
      const event = { ...baseEvent, importance: 'low' as EventImportance }
      const output = formatEvent(event, { noColor: false, json: false })
      expect(output).toContain('\x1b[90m') // gray
    })
  })

  describe('No-color format', () => {
    it('formats event without ANSI codes', () => {
      const output = formatEvent(baseEvent, { noColor: true, json: false })

      expect(output).not.toContain('\x1b[')
      expect(output).toContain('mdxe-build')
      expect(output).toContain('build_started')
    })
  })

  describe('JSON format', () => {
    it('outputs event as JSON', () => {
      const output = formatEvent(baseEvent, { noColor: false, json: true })

      const parsed = JSON.parse(output)
      expect(parsed.timestamp).toBe(baseEvent.timestamp)
      expect(parsed.source).toBe(baseEvent.source)
      expect(parsed.type).toBe(baseEvent.type)
      expect(parsed.importance).toBe(baseEvent.importance)
      expect(parsed.data).toEqual(baseEvent.data)
    })

    it('ignores noColor flag when json is true', () => {
      const output1 = formatEvent(baseEvent, { noColor: false, json: true })
      const output2 = formatEvent(baseEvent, { noColor: true, json: true })

      expect(output1).toBe(output2)
    })
  })
})

describe('TailCommandOptions defaults', () => {
  it('has correct default values', () => {
    const defaults = parseTailArgs([])

    expect(defaults.live).toBe(false)
    expect(defaults.follow).toBe(false)
    expect(defaults.json).toBe(false)
    expect(defaults.noColor).toBe(false)
    expect(defaults.limit).toBeUndefined()
    expect(defaults.filter).toBeUndefined()
  })
})

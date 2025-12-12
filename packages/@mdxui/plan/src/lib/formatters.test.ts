import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { formatDuration, formatCost, formatTokens, formatTimestamp, truncate } from './formatters'

describe('formatDuration', () => {
  it('formats milliseconds for short durations', () => {
    expect(formatDuration(500)).toBe('500ms')
    expect(formatDuration(0)).toBe('0ms')
    expect(formatDuration(999)).toBe('999ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(1000)).toBe('1s')
    expect(formatDuration(5000)).toBe('5s')
    expect(formatDuration(30000)).toBe('30s')
    expect(formatDuration(59000)).toBe('59s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(60000)).toBe('1m 0s')
    expect(formatDuration(90000)).toBe('1m 30s')
    expect(formatDuration(125000)).toBe('2m 5s')
    expect(formatDuration(3599000)).toBe('59m 59s')
  })

  it('formats hours and minutes', () => {
    expect(formatDuration(3600000)).toBe('1h 0m')
    expect(formatDuration(3720000)).toBe('1h 2m')
    expect(formatDuration(7200000)).toBe('2h 0m')
    expect(formatDuration(5400000)).toBe('1h 30m')
  })

  it('handles edge cases', () => {
    expect(formatDuration(1)).toBe('1ms')
    expect(formatDuration(1001)).toBe('1s')
    expect(formatDuration(60001)).toBe('1m 0s')
  })
})

describe('formatCost', () => {
  it('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.00')
  })

  it('formats small costs with 4 decimal places', () => {
    expect(formatCost(0.001)).toBe('$0.0010')
    expect(formatCost(0.0042)).toBe('$0.0042')
    expect(formatCost(0.0099)).toBe('$0.0099')
  })

  it('formats regular costs with 2 decimal places', () => {
    expect(formatCost(0.01)).toBe('$0.01')
    expect(formatCost(0.05)).toBe('$0.05')
    expect(formatCost(1)).toBe('$1.00')
    expect(formatCost(1.25)).toBe('$1.25')
    expect(formatCost(10.5)).toBe('$10.50')
    expect(formatCost(100)).toBe('$100.00')
  })

  it('handles edge case at $0.01 boundary', () => {
    expect(formatCost(0.009)).toBe('$0.0090')
    expect(formatCost(0.01)).toBe('$0.01')
  })
})

describe('formatTokens', () => {
  it('formats token counts with commas', () => {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(100)).toBe('100')
    expect(formatTokens(1000)).toBe('1,000')
    expect(formatTokens(1500)).toBe('1,500')
    expect(formatTokens(10000)).toBe('10,000')
    expect(formatTokens(100000)).toBe('100,000')
    expect(formatTokens(1000000)).toBe('1,000,000')
    expect(formatTokens(1234567)).toBe('1,234,567')
  })
})

describe('formatTimestamp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for timestamps less than 1 minute ago', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatTimestamp(new Date('2024-01-01T11:59:30Z'))).toBe('just now')
    expect(formatTimestamp(new Date('2024-01-01T11:59:59Z'))).toBe('just now')
    expect(formatTimestamp('2024-01-01T11:59:45Z')).toBe('just now')
  })

  it('formats minutes ago for timestamps less than 1 hour', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatTimestamp(new Date('2024-01-01T11:59:00Z'))).toBe('1m ago')
    expect(formatTimestamp(new Date('2024-01-01T11:55:00Z'))).toBe('5m ago')
    expect(formatTimestamp(new Date('2024-01-01T11:30:00Z'))).toBe('30m ago')
    expect(formatTimestamp(new Date('2024-01-01T11:01:00Z'))).toBe('59m ago')
  })

  it('formats hours ago for timestamps less than 1 day', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatTimestamp(new Date('2024-01-01T11:00:00Z'))).toBe('1h ago')
    expect(formatTimestamp(new Date('2024-01-01T06:00:00Z'))).toBe('6h ago')
    expect(formatTimestamp(new Date('2024-01-01T00:00:00Z'))).toBe('12h ago')
  })

  it('formats date for timestamps more than 1 day ago', () => {
    const now = new Date('2024-01-15T12:00:00Z')
    vi.setSystemTime(now)

    const result = formatTimestamp(new Date('2024-01-10T14:30:00Z'))
    // Should contain month and day
    expect(result).toContain('Jan')
    expect(result).toContain('10')
  })

  it('accepts string timestamps', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatTimestamp('2024-01-01T11:59:30Z')).toBe('just now')
    expect(formatTimestamp('2024-01-01T11:55:00Z')).toBe('5m ago')
  })

  it('accepts Date objects', () => {
    const now = new Date('2024-01-01T12:00:00Z')
    vi.setSystemTime(now)

    expect(formatTimestamp(new Date('2024-01-01T11:59:30Z'))).toBe('just now')
  })
})

describe('truncate', () => {
  it('returns original text if shorter than maxLength', () => {
    expect(truncate('Hello', 100)).toBe('Hello')
    expect(truncate('Short', 10)).toBe('Short')
  })

  it('returns original text if equal to maxLength', () => {
    expect(truncate('12345', 5)).toBe('12345')
    expect(truncate('1234567890', 10)).toBe('1234567890')
  })

  it('truncates and adds ellipsis if longer than maxLength', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
    expect(truncate('This is a long text', 10)).toBe('This is a ...')
  })

  it('uses default maxLength of 100', () => {
    const shortText = 'x'.repeat(50)
    const longText = 'x'.repeat(150)

    expect(truncate(shortText)).toBe(shortText)
    expect(truncate(longText)).toBe('x'.repeat(100) + '...')
  })

  it('handles empty string', () => {
    expect(truncate('')).toBe('')
    expect(truncate('', 10)).toBe('')
  })

  it('handles maxLength of 0', () => {
    expect(truncate('Hello', 0)).toBe('...')
  })
})

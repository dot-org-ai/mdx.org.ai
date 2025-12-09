import { describe, it, expect } from 'vitest'
import {
  CSV,
  TSV,
  parse,
  stringify,
  fromCSV,
  toCSV,
  parseTSV,
  stringifyTSV,
  getHeaders,
  toJSONLD,
  detectDelimiter,
  parseAuto,
} from './index.js'

// =============================================================================
// parse (CSV) Tests
// =============================================================================

describe('parse', () => {
  describe('basic parsing', () => {
    it('should parse simple CSV', () => {
      const result = parse('name,age\nAlice,30\nBob,25')
      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({ name: 'Alice', age: 30 })
      expect(result[1]).toEqual({ name: 'Bob', age: 25 })
    })

    it('should handle quoted values', () => {
      const result = parse('name,bio\n"Alice","Hello, world"')
      expect(result[0]).toEqual({ name: 'Alice', bio: 'Hello, world' })
    })

    it('should handle empty values', () => {
      const result = parse('name,age\nAlice,\nBob,25')
      // With dynamicTyping=true (default), empty values become null
      expect(result[0]?.age).toBe(null)
      expect(result[1]?.age).toBe(25)
    })

    it('should handle different data types with dynamic typing', () => {
      const result = parse('string,number,bool\nhello,42,true')
      expect(result[0]).toEqual({
        string: 'hello',
        number: 42,
        bool: true,
      })
    })
  })

  describe('options', () => {
    it('should use custom headers', () => {
      const result = parse('Alice,30\nBob,25', { headers: ['name', 'age'] })
      expect(result[0]).toEqual({ name: 'Alice', age: 30 })
    })

    it('should skip rows', () => {
      const result = parse('name,age\nAlice,30\nBob,25', { skipRows: 1 })
      expect(result).toHaveLength(1)
    })

    it('should disable dynamic typing', () => {
      const result = parse('name,age\nAlice,30', { dynamicTyping: false })
      expect(result[0]?.age).toBe('30')
    })

    it('should use custom delimiter', () => {
      const result = parse('name;age\nAlice;30', { delimiter: ';' })
      expect(result[0]).toEqual({ name: 'Alice', age: 30 })
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = parse('')
      expect(result).toEqual([])
    })

    it('should handle headers only', () => {
      const result = parse('name,age')
      expect(result).toEqual([])
    })

    it('should handle unicode', () => {
      const result = parse('name\n客户\n🎉')
      expect(result[0]?.name).toBe('客户')
      expect(result[1]?.name).toBe('🎉')
    })

    it('should handle newlines in quoted values', () => {
      const result = parse('name,bio\n"Alice","Line 1\nLine 2"')
      expect(result[0]?.bio).toContain('\n')
    })

    it('should handle ArrayBuffer input', () => {
      const encoder = new TextEncoder()
      const buffer = encoder.encode('name,age\nAlice,30')
      const result = parse(buffer.buffer)
      expect(result[0]).toEqual({ name: 'Alice', age: 30 })
    })
  })
})

// =============================================================================
// stringify Tests
// =============================================================================

describe('stringify', () => {
  describe('basic conversion', () => {
    it('should convert array of objects to CSV', () => {
      const result = stringify([{ name: 'Alice', age: 30 }])
      expect(result).toContain('name,age')
      expect(result).toContain('Alice,30')
    })

    it('should handle multiple rows', () => {
      const result = stringify([
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ])
      const lines = result.split('\n')
      expect(lines.length).toBeGreaterThanOrEqual(3)
    })

    it('should quote values with commas', () => {
      const result = stringify([{ name: 'Hello, world' }])
      expect(result).toContain('"Hello, world"')
    })
  })

  describe('options', () => {
    it('should use custom delimiter', () => {
      const result = stringify([{ name: 'Alice', age: 30 }], { delimiter: ';' })
      expect(result).toContain('name;age')
    })

    it('should exclude headers', () => {
      const result = stringify([{ name: 'Alice' }], { headers: false })
      expect(result).not.toContain('name')
      expect(result).toContain('Alice')
    })

    it('should quote all values', () => {
      const result = stringify([{ name: 'Alice' }], { quoteAll: true })
      expect(result).toContain('"Alice"')
    })

    it('should use custom line ending', () => {
      const result = stringify([{ a: 1 }, { a: 2 }], { lineEnding: '\r\n' })
      expect(result).toContain('\r\n')
    })
  })

  describe('round-trip', () => {
    it('should round-trip simple data', () => {
      const original = [{ name: 'Alice', age: 30 }]
      const csv = stringify(original)
      const result = parse(csv)
      expect(result).toEqual(original)
    })

    it('should round-trip with special characters', () => {
      const original = [{ value: 'test, with "quotes"' }]
      const csv = stringify(original)
      const result = parse(csv)
      expect(result[0]?.value).toBe(original[0]?.value)
    })
  })
})

// =============================================================================
// TSV Tests
// =============================================================================

describe('parseTSV', () => {
  it('should parse TSV content', () => {
    const result = parseTSV('name\tage\nAlice\t30')
    expect(result[0]).toEqual({ name: 'Alice', age: 30 })
  })
})

describe('stringifyTSV', () => {
  it('should create TSV content', () => {
    const result = stringifyTSV([{ name: 'Alice', age: 30 }])
    expect(result).toContain('name\tage')
    expect(result).toContain('Alice\t30')
  })
})

// =============================================================================
// Format Objects Tests
// =============================================================================

describe('CSV Format Object', () => {
  it('should have correct metadata', () => {
    expect(CSV.name).toBe('csv')
    expect(CSV.mimeTypes).toContain('text/csv')
    expect(CSV.extensions).toContain('csv')
  })

  it('should parse via format object', () => {
    const result = CSV.parse('name\nAlice')
    expect(result[0]?.name).toBe('Alice')
  })

  it('should stringify via format object', () => {
    const result = CSV.stringify([{ name: 'Alice' }])
    expect(result).toContain('Alice')
  })

  it('should get headers', () => {
    const data = [{ name: 'Alice', age: 30 }]
    const headers = CSV.getHeaders(data)
    expect(headers).toEqual(['name', 'age'])
  })
})

describe('TSV Format Object', () => {
  it('should have correct metadata', () => {
    expect(TSV.name).toBe('tsv')
    expect(TSV.mimeTypes).toContain('text/tab-separated-values')
    expect(TSV.extensions).toContain('tsv')
  })
})

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('getHeaders', () => {
  it('should return headers from data', () => {
    const result = getHeaders([{ a: 1, b: 2, c: 3 }])
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('should return empty array for empty data', () => {
    const result = getHeaders([])
    expect(result).toEqual([])
  })
})

describe('toJSONLD', () => {
  it('should convert to JSON-LD ItemList', () => {
    const result = toJSONLD([{ name: 'Alice' }, { name: 'Bob' }])
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('ItemList')
    expect(result.itemListElement).toHaveLength(2)
  })

  it('should use custom type', () => {
    const result = toJSONLD([{ name: 'Alice' }], { type: 'DataCatalog' })
    expect(result['@type']).toBe('DataCatalog')
  })
})

describe('detectDelimiter', () => {
  it('should detect comma delimiter', () => {
    const result = detectDelimiter('name,age,city\nAlice,30,NYC')
    expect(result).toBe(',')
  })

  it('should detect tab delimiter', () => {
    const result = detectDelimiter('name\tage\tcity\nAlice\t30\tNYC')
    expect(result).toBe('\t')
  })

  it('should detect semicolon delimiter', () => {
    const result = detectDelimiter('name;age;city\nAlice;30;NYC')
    expect(result).toBe(';')
  })

  it('should detect pipe delimiter', () => {
    const result = detectDelimiter('name|age|city\nAlice|30|NYC')
    expect(result).toBe('|')
  })
})

describe('parseAuto', () => {
  it('should auto-detect CSV', () => {
    const result = parseAuto('name,age\nAlice,30')
    expect(result[0]?.name).toBe('Alice')
  })

  it('should auto-detect TSV', () => {
    const result = parseAuto('name\tage\nAlice\t30')
    expect(result[0]?.name).toBe('Alice')
  })
})

// =============================================================================
// Alias Tests
// =============================================================================

describe('aliases', () => {
  it('fromCSV should work like parse', () => {
    const result = fromCSV('name\nAlice')
    expect(result[0]?.name).toBe('Alice')
  })

  it('toCSV should work like stringify', () => {
    const result = toCSV([{ name: 'Alice' }])
    expect(result).toContain('Alice')
  })
})

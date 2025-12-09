import { describe, it, expect } from 'vitest'
import {
  XLSX,
  parse,
  stringify,
  getSheetNames,
  getHeaders,
  toCSV,
  toJSONLD,
} from './index.js'

// =============================================================================
// parse Tests
// =============================================================================

describe('parse', () => {
  describe('basic parsing', () => {
    it('should parse simple XLSX', () => {
      // Create test data using stringify for round-trip testing
      const testData = [{ name: 'Alice', age: 30 }]
      const buffer = stringify(testData)
      const result = parse(buffer)
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Alice')
      expect(result[0]?.age).toBe(30)
    })

    it('should handle multiple rows', () => {
      const testData = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ]
      const buffer = stringify(testData)
      const result = parse(buffer)
      expect(result).toHaveLength(2)
      expect(result[0]?.name).toBe('Alice')
      expect(result[1]?.name).toBe('Bob')
    })

    it('should handle different data types', () => {
      const testData = [{
        string: 'hello',
        number: 42,
        bool: true,
      }]
      const buffer = stringify(testData)
      const result = parse(buffer)
      expect(result[0]?.string).toBe('hello')
      expect(result[0]?.number).toBe(42)
      expect(result[0]?.bool).toBe(true)
    })
  })

  describe('options', () => {
    it('should parse specific sheet by index', () => {
      const testData = [{ name: 'Alice' }]
      const buffer = stringify(testData)
      const result = parse(buffer, { sheet: 0 })
      expect(result).toHaveLength(1)
      expect(result[0]?.name).toBe('Alice')
    })

    it('should throw for non-existent sheet', () => {
      const testData = [{ name: 'Alice' }]
      const buffer = stringify(testData)
      expect(() => parse(buffer, { sheet: 'NonExistent' })).toThrow()
    })
  })

  describe('edge cases', () => {
    it('should handle empty data', () => {
      const buffer = stringify([])
      const result = parse(buffer)
      expect(result).toEqual([])
    })

    it('should handle unicode', () => {
      const testData = [{ name: '客户', emoji: '🎉' }]
      const buffer = stringify(testData)
      const result = parse(buffer)
      expect(result[0]?.name).toBe('客户')
      expect(result[0]?.emoji).toBe('🎉')
    })
  })
})

// =============================================================================
// stringify Tests
// =============================================================================

describe('stringify', () => {
  describe('basic conversion', () => {
    it('should create valid XLSX buffer', () => {
      const result = stringify([{ name: 'Alice', age: 30 }])
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result.byteLength).toBeGreaterThan(0)
    })

    it('should be parseable after creation', () => {
      const original = [{ name: 'Alice', age: 30 }]
      const buffer = stringify(original)
      const result = parse(buffer)
      expect(result).toEqual(original)
    })
  })

  describe('options', () => {
    it('should use custom sheet name', () => {
      const buffer = stringify([{ name: 'Alice' }], { sheetName: 'CustomSheet' })
      const names = getSheetNames(buffer)
      expect(names).toContain('CustomSheet')
    })

    it('should exclude headers when specified', () => {
      const buffer = stringify([{ name: 'Alice' }], { headers: false })
      // Parse without headers option to see raw data
      const result = parse(buffer, { headers: false })
      expect(result).toHaveLength(1)
    })
  })

  describe('round-trip', () => {
    it('should round-trip simple data', () => {
      const original = [{ name: 'Alice', age: 30 }]
      const buffer = stringify(original)
      const result = parse(buffer)
      expect(result).toEqual(original)
    })

    it('should round-trip with special characters', () => {
      const original = [{ value: 'test, with "quotes"' }]
      const buffer = stringify(original)
      const result = parse(buffer)
      expect(result[0]?.value).toBe(original[0]?.value)
    })
  })
})

// =============================================================================
// Format Object Tests
// =============================================================================

describe('XLSX Format Object', () => {
  it('should have correct metadata', () => {
    expect(XLSX.name).toBe('xlsx')
    expect(XLSX.mimeTypes).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    expect(XLSX.extensions).toContain('xlsx')
    expect(XLSX.extensions).toContain('xls')
  })

  it('should parse via format object', () => {
    const testData = [{ name: 'Alice' }]
    const buffer = stringify(testData)
    const result = XLSX.parse(buffer)
    expect(result[0]?.name).toBe('Alice')
  })

  it('should stringify via format object', () => {
    const result = XLSX.stringify([{ name: 'Alice' }])
    expect(result).toBeInstanceOf(ArrayBuffer)
  })

  it('should get headers', () => {
    const data = [{ name: 'Alice', age: 30 }]
    const headers = XLSX.getHeaders(data)
    expect(headers).toEqual(['name', 'age'])
  })
})

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('getSheetNames', () => {
  it('should return sheet names', () => {
    const buffer = stringify([{ name: 'Alice' }], { sheetName: 'TestSheet' })
    const result = getSheetNames(buffer)
    expect(result).toContain('TestSheet')
  })

  it('should return default sheet name', () => {
    const buffer = stringify([{ name: 'Alice' }])
    const result = getSheetNames(buffer)
    expect(result).toContain('Sheet1')
  })
})

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

describe('toCSV', () => {
  it('should convert XLSX to CSV string', () => {
    const buffer = stringify([{ name: 'Alice', age: 30 }])
    const result = toCSV(buffer)
    expect(result).toContain('name')
    expect(result).toContain('Alice')
    expect(result).toContain('30')
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

import { describe, it, expect } from 'vitest'
import {
  // Format objects
  JSON,
  YAML,
  CSV,
  TSV,
  XLSX,
  PDF,
  Markdown,
  HTML,
  // Registry
  formats,
  getFormat,
  getFormatByExtension,
  getFormatByMimeType,
  parseByExtension,
  // Type guards
  isBiDirectional,
  isReadOnly,
  isTabular,
  // Re-exports
  toJSON,
  fromJSON,
  toYAML,
  fromYAML,
  toMarkdown,
  fromMarkdown,
  toHTML,
  fromHTML,
} from './index.js'

// =============================================================================
// Format Objects Tests
// =============================================================================

describe('Format Objects', () => {
  describe('JSON', () => {
    it('should have correct metadata', () => {
      expect(JSON.name).toBe('json')
      expect(JSON.mimeTypes).toContain('application/json')
      expect(JSON.extensions).toContain('json')
    })

    it('should parse and stringify', () => {
      const data = { name: 'test' }
      const str = JSON.stringify(data)
      const parsed = JSON.parse(str)
      expect(parsed).toEqual(data)
    })
  })

  describe('YAML', () => {
    it('should have correct metadata', () => {
      expect(YAML.name).toBe('yaml')
      expect(YAML.mimeTypes).toContain('application/yaml')
      expect(YAML.extensions).toContain('yaml')
      expect(YAML.extensions).toContain('yml')
    })

    it('should parse and stringify', () => {
      const data = { name: 'test' }
      const str = YAML.stringify(data)
      const parsed = YAML.parse(str)
      expect(parsed).toEqual(data)
    })
  })

  describe('CSV', () => {
    it('should have correct metadata', () => {
      expect(CSV.name).toBe('csv')
      expect(CSV.mimeTypes).toContain('text/csv')
      expect(CSV.extensions).toContain('csv')
    })

    it('should parse and stringify', () => {
      const data = [{ name: 'Alice', age: 30 }]
      const str = CSV.stringify(data)
      const parsed = CSV.parse(str)
      expect(parsed).toEqual(data)
    })
  })

  describe('TSV', () => {
    it('should have correct metadata', () => {
      expect(TSV.name).toBe('tsv')
      expect(TSV.mimeTypes).toContain('text/tab-separated-values')
      expect(TSV.extensions).toContain('tsv')
    })
  })

  describe('XLSX', () => {
    it('should have correct metadata', () => {
      expect(XLSX.name).toBe('xlsx')
      expect(XLSX.extensions).toContain('xlsx')
      expect(XLSX.extensions).toContain('xls')
    })

    it('should parse and stringify', () => {
      const data = [{ name: 'Alice', age: 30 }]
      const buffer = XLSX.stringify(data)
      const parsed = XLSX.parse(buffer)
      expect(parsed).toEqual(data)
    })
  })

  describe('PDF', () => {
    it('should have correct metadata', () => {
      expect(PDF.name).toBe('pdf')
      expect(PDF.mimeTypes).toContain('application/pdf')
      expect(PDF.extensions).toContain('pdf')
    })

    it('should be read-only', () => {
      expect(PDF.readonly).toBe(true)
    })
  })

  describe('Markdown', () => {
    it('should have correct metadata', () => {
      expect(Markdown.name).toBe('markdown')
      expect(Markdown.mimeTypes).toContain('text/markdown')
      expect(Markdown.extensions).toContain('md')
      expect(Markdown.extensions).toContain('mdx')
    })

    it('should parse and stringify', () => {
      const str = Markdown.stringify({ name: 'Test' })
      expect(str).toContain('# Test')
    })
  })

  describe('HTML', () => {
    it('should have correct metadata', () => {
      expect(HTML.name).toBe('html')
      expect(HTML.mimeTypes).toContain('text/html')
      expect(HTML.extensions).toContain('html')
      expect(HTML.extensions).toContain('htm')
    })

    it('should parse and stringify', () => {
      const str = HTML.stringify({ name: 'Test' })
      expect(str).toContain('<h1')
      expect(str).toContain('Test')
    })
  })
})

// =============================================================================
// Format Registry Tests
// =============================================================================

describe('Format Registry', () => {
  describe('formats object', () => {
    it('should contain all formats', () => {
      expect(formats.json).toBe(JSON)
      expect(formats.yaml).toBe(YAML)
      expect(formats.csv).toBe(CSV)
      expect(formats.tsv).toBe(TSV)
      expect(formats.xlsx).toBe(XLSX)
      expect(formats.pdf).toBe(PDF)
      expect(formats.markdown).toBe(Markdown)
      expect(formats.html).toBe(HTML)
    })
  })

  describe('getFormat', () => {
    it('should get format by name', () => {
      expect(getFormat('json')).toBe(JSON)
      expect(getFormat('yaml')).toBe(YAML)
      expect(getFormat('csv')).toBe(CSV)
      expect(getFormat('pdf')).toBe(PDF)
    })
  })

  describe('getFormatByExtension', () => {
    it('should get format by extension', () => {
      expect(getFormatByExtension('json')).toBe(JSON)
      expect(getFormatByExtension('yaml')).toBe(YAML)
      expect(getFormatByExtension('yml')).toBe(YAML)
      expect(getFormatByExtension('csv')).toBe(CSV)
      expect(getFormatByExtension('xlsx')).toBe(XLSX)
      expect(getFormatByExtension('xls')).toBe(XLSX)
      expect(getFormatByExtension('pdf')).toBe(PDF)
      expect(getFormatByExtension('md')).toBe(Markdown)
      expect(getFormatByExtension('html')).toBe(HTML)
    })

    it('should handle extension with dot', () => {
      expect(getFormatByExtension('.json')).toBe(JSON)
      expect(getFormatByExtension('.yaml')).toBe(YAML)
    })

    it('should be case-insensitive', () => {
      expect(getFormatByExtension('JSON')).toBe(JSON)
      expect(getFormatByExtension('YAML')).toBe(YAML)
    })

    it('should return undefined for unknown extension', () => {
      expect(getFormatByExtension('unknown')).toBeUndefined()
    })
  })

  describe('getFormatByMimeType', () => {
    it('should get format by MIME type', () => {
      expect(getFormatByMimeType('application/json')).toBe(JSON)
      expect(getFormatByMimeType('application/yaml')).toBe(YAML)
      expect(getFormatByMimeType('text/csv')).toBe(CSV)
      expect(getFormatByMimeType('application/pdf')).toBe(PDF)
      expect(getFormatByMimeType('text/html')).toBe(HTML)
      expect(getFormatByMimeType('text/markdown')).toBe(Markdown)
    })

    it('should handle MIME type with charset', () => {
      expect(getFormatByMimeType('application/json; charset=utf-8')).toBe(JSON)
    })

    it('should return undefined for unknown MIME type', () => {
      expect(getFormatByMimeType('application/unknown')).toBeUndefined()
    })
  })
})

// =============================================================================
// Type Guards Tests
// =============================================================================

describe('Type Guards', () => {
  describe('isBiDirectional', () => {
    it('should return true for bi-directional formats', () => {
      expect(isBiDirectional(JSON)).toBe(true)
      expect(isBiDirectional(YAML)).toBe(true)
      expect(isBiDirectional(CSV)).toBe(true)
      expect(isBiDirectional(XLSX)).toBe(true)
      expect(isBiDirectional(Markdown)).toBe(true)
      expect(isBiDirectional(HTML)).toBe(true)
    })

    it('should return false for read-only formats', () => {
      expect(isBiDirectional(PDF as any)).toBe(false)
    })
  })

  describe('isReadOnly', () => {
    it('should return true for PDF', () => {
      expect(isReadOnly(PDF as any)).toBe(true)
    })

    it('should return false for bi-directional formats', () => {
      expect(isReadOnly(JSON as any)).toBe(false)
    })
  })

  describe('isTabular', () => {
    it('should return true for tabular formats', () => {
      expect(isTabular(CSV)).toBe(true)
      expect(isTabular(TSV)).toBe(true)
      expect(isTabular(XLSX)).toBe(true)
    })

    it('should return false for non-tabular formats', () => {
      expect(isTabular(JSON as any)).toBe(false)
      expect(isTabular(YAML as any)).toBe(false)
    })
  })
})

// =============================================================================
// parseByExtension Tests
// =============================================================================

describe('parseByExtension', () => {
  it('should parse JSON by extension', () => {
    const result = parseByExtension('{"name": "test"}', 'json')
    expect(result).toEqual({ name: 'test' })
  })

  it('should parse YAML by extension', () => {
    const result = parseByExtension('name: test', 'yaml')
    expect(result).toEqual({ name: 'test' })
  })

  it('should parse CSV by extension', () => {
    const result = parseByExtension('name\nAlice', 'csv')
    expect(result).toHaveLength(1)
  })

  it('should throw for unknown extension', () => {
    expect(() => parseByExtension('data', 'unknown')).toThrow('Unknown file extension')
  })
})

// =============================================================================
// Re-exports Tests
// =============================================================================

describe('Re-exports', () => {
  it('should export JSON functions', () => {
    expect(typeof toJSON).toBe('function')
    expect(typeof fromJSON).toBe('function')
  })

  it('should export YAML functions', () => {
    expect(typeof toYAML).toBe('function')
    expect(typeof fromYAML).toBe('function')
  })

  it('should export Markdown functions', () => {
    expect(typeof toMarkdown).toBe('function')
    expect(typeof fromMarkdown).toBe('function')
  })

  it('should export HTML functions', () => {
    expect(typeof toHTML).toBe('function')
    expect(typeof fromHTML).toBe('function')
  })

  it('should work with re-exported functions', () => {
    const json = toJSON({ name: 'test' })
    const parsed = fromJSON(json)
    expect(parsed).toEqual({ name: 'test' })
  })
})

// =============================================================================
// Integration Tests
// =============================================================================

describe('Integration', () => {
  it('should allow format-agnostic processing', () => {
    const data = { name: 'Test', value: 42 }

    // Convert to different formats
    const jsonStr = JSON.stringify(data)
    const yamlStr = YAML.stringify(data)

    // Parse back
    const fromJsonData = JSON.parse(jsonStr)
    const fromYamlData = YAML.parse(yamlStr)

    // Both should produce equivalent results
    expect(fromJsonData).toEqual(data)
    expect(fromYamlData).toEqual(data)
  })

  it('should convert between formats', () => {
    const original = { name: 'Test', items: ['a', 'b', 'c'] }

    // JSON -> YAML
    const jsonStr = JSON.stringify(original)
    const fromJson = JSON.parse(jsonStr)
    const yamlStr = YAML.stringify(fromJson)
    const fromYaml = YAML.parse(yamlStr)

    expect(fromYaml).toEqual(original)
  })

  it('should process tabular data across formats', () => {
    const data = [
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]

    // CSV round-trip
    const csvStr = CSV.stringify(data)
    const csvData = CSV.parse(csvStr)
    expect(csvData).toEqual(data)

    // XLSX round-trip
    const xlsxBuffer = XLSX.stringify(data)
    const xlsxData = XLSX.parse(xlsxBuffer)
    expect(xlsxData).toEqual(data)

    // Convert CSV to XLSX and back
    const csvToXlsx = XLSX.stringify(csvData)
    const xlsxToCsv = CSV.stringify(XLSX.parse(csvToXlsx))
    const finalData = CSV.parse(xlsxToCsv)
    expect(finalData).toEqual(data)
  })
})

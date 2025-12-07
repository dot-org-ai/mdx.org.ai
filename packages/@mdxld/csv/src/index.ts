/**
 * @mdxld/csv
 *
 * CSV and TSV format support with bi-directional conversion.
 * Implements the standard Format interface with parse, stringify, and fetch.
 */

import Papa from 'papaparse'
import type {
  TabularFormat,
  FormatFetchOptions,
  TabularParseOptions,
  TabularStringifyOptions,
} from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface CSVParseOptions extends TabularParseOptions {
  /** Whether first row contains headers (default: true) */
  headers?: boolean | string[]
  /** Skip empty rows (default: true) */
  skipEmpty?: boolean
  /** Custom delimiter (default: ',' for CSV, '\t' for TSV) */
  delimiter?: string
  /** Transform values during parsing */
  transform?: (value: string, column: string) => unknown
  /** Number of rows to skip at the beginning */
  skipRows?: number
  /** Dynamic typing - convert numbers/booleans */
  dynamicTyping?: boolean
  /** Comment character - lines starting with this are skipped */
  comments?: string | false
}

export interface CSVStringifyOptions extends TabularStringifyOptions {
  /** Include header row (default: true) */
  headers?: boolean | string[]
  /** Custom delimiter (default: ',') */
  delimiter?: string
  /** Quote all values (default: false) */
  quoteAll?: boolean
  /** Line ending style (default: '\n') */
  lineEnding?: '\n' | '\r\n'
  /** Quote character (default: '"') */
  quoteChar?: string
  /** Escape character (default: '"') */
  escapeChar?: string
}

export type CSVRecord = Record<string, unknown>
export type CSVData = CSVRecord[]

// ============================================================================
// Parse
// ============================================================================

/**
 * Parse CSV string to array of objects.
 *
 * @example
 * ```ts
 * const data = parse('name,age\nAlice,30\nBob,25')
 * // [{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]
 * ```
 */
export function parse(input: string | ArrayBuffer, options: CSVParseOptions = {}): CSVData {
  const {
    headers = true,
    skipEmpty = true,
    delimiter = ',',
    transform,
    skipRows = 0,
    dynamicTyping = true,
    comments = false,
  } = options

  const content = typeof input === 'string' ? input : new TextDecoder().decode(input)

  const result = Papa.parse<CSVRecord>(content, {
    header: headers === true,
    delimiter,
    skipEmptyLines: skipEmpty,
    dynamicTyping,
    comments,
    transformHeader: (header) => header.trim(),
  })

  let data = result.data

  // Skip rows if specified
  if (skipRows > 0) {
    data = data.slice(skipRows)
  }

  // Apply custom headers if provided as array
  if (Array.isArray(headers)) {
    data = data.map((row) => {
      if (Array.isArray(row)) {
        const obj: CSVRecord = {}
        headers.forEach((header, i) => {
          obj[header] = (row as unknown[])[i]
        })
        return obj
      }
      return row
    })
  }

  // Apply transform function
  if (transform) {
    data = data.map((row) => {
      const transformed: CSVRecord = {}
      for (const [key, value] of Object.entries(row)) {
        transformed[key] = transform(String(value), key)
      }
      return transformed
    })
  }

  return data
}

/**
 * Alias for parse() - CSV.parse style.
 */
export const fromCSV = parse

// ============================================================================
// Stringify
// ============================================================================

/**
 * Convert array of objects to CSV string.
 *
 * @example
 * ```ts
 * const csv = stringify([{ name: 'Alice', age: 30 }])
 * // 'name,age\nAlice,30'
 * ```
 */
export function stringify(data: CSVData, options: CSVStringifyOptions = {}): string {
  const {
    headers = true,
    delimiter = ',',
    quoteAll = false,
    lineEnding = '\n',
    quoteChar = '"',
  } = options

  // Get headers from first row or options
  let headerRow: string[] = []
  if (headers === true && data.length > 0) {
    headerRow = Object.keys(data[0] ?? {})
  } else if (Array.isArray(headers)) {
    headerRow = headers
  }

  const result = Papa.unparse(data, {
    header: headers !== false,
    delimiter,
    quotes: quoteAll,
    newline: lineEnding,
    quoteChar,
    columns: headerRow.length > 0 ? headerRow : undefined,
  })

  return result
}

/**
 * Alias for stringify() - CSV.stringify style.
 */
export const toCSV = stringify

// ============================================================================
// TSV Helpers
// ============================================================================

/**
 * Parse TSV (tab-separated values) string.
 */
export function parseTSV(input: string | ArrayBuffer, options: Omit<CSVParseOptions, 'delimiter'> = {}): CSVData {
  return parse(input, { ...options, delimiter: '\t' })
}

/**
 * Alias for parseTSV().
 */
export const fromTSV = parseTSV

/**
 * Convert array of objects to TSV string.
 */
export function stringifyTSV(data: CSVData, options: Omit<CSVStringifyOptions, 'delimiter'> = {}): string {
  return stringify(data, { ...options, delimiter: '\t' })
}

/**
 * Alias for stringifyTSV().
 */
export const toTSV = stringifyTSV

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch CSV from URL and parse.
 *
 * @example
 * ```ts
 * const data = await fetchCSV('https://example.com/data.csv')
 * ```
 */
export async function fetchCSV(
  url: string,
  options: FormatFetchOptions & CSVParseOptions = {}
): Promise<CSVData> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal as AbortSignal,
    } as RequestInit)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    return parse(text, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

/**
 * Fetch TSV from URL and parse.
 */
export async function fetchTSV(
  url: string,
  options: FormatFetchOptions & Omit<CSVParseOptions, 'delimiter'> = {}
): Promise<CSVData> {
  return fetchCSV(url, { ...options, delimiter: '\t' })
}

// ============================================================================
// Format Objects
// ============================================================================

/**
 * CSV Format object implementing the standard Format interface.
 *
 * @example
 * ```ts
 * import { CSV } from '@mdxld/csv'
 *
 * const data = CSV.parse('name,age\nAlice,30')
 * const str = CSV.stringify(data)
 * const remote = await CSV.fetch('https://example.com/data.csv')
 * ```
 */
export const CSV: TabularFormat<CSVData, CSVParseOptions, CSVStringifyOptions> = {
  name: 'csv',
  mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/csv'] as const,
  extensions: ['csv'] as const,
  parse,
  stringify,
  fetch: fetchCSV,
  getHeaders(data: CSVData): string[] {
    if (data.length === 0) return []
    return Object.keys(data[0] ?? {})
  },
}

/**
 * TSV Format object.
 */
export const TSV: TabularFormat<CSVData, Omit<CSVParseOptions, 'delimiter'>, Omit<CSVStringifyOptions, 'delimiter'>> = {
  name: 'tsv',
  mimeTypes: ['text/tab-separated-values'] as const,
  extensions: ['tsv', 'tab'] as const,
  parse: parseTSV,
  stringify: stringifyTSV,
  fetch: fetchTSV,
  getHeaders(data: CSVData): string[] {
    if (data.length === 0) return []
    return Object.keys(data[0] ?? {})
  },
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get column headers from CSV data.
 */
export function getHeaders(data: CSVData): string[] {
  return CSV.getHeaders(data)
}

/**
 * Convert CSV to JSON-LD format with @context.
 */
export function toJSONLD(data: CSVData, options: { context?: string; type?: string } = {}): Record<string, unknown> {
  const { context = 'https://schema.org', type = 'ItemList' } = options
  return {
    '@context': context,
    '@type': type,
    itemListElement: data.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item,
    })),
  }
}

/**
 * Detect delimiter from CSV content.
 */
export function detectDelimiter(content: string): string {
  const firstLine = content.split('\n')[0] || ''
  const delimiters = [',', '\t', ';', '|']
  let maxCount = 0
  let detected = ','

  for (const d of delimiters) {
    const count = (firstLine.match(new RegExp(d.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&'), 'g')) || []).length
    if (count > maxCount) {
      maxCount = count
      detected = d
    }
  }

  return detected
}

/**
 * Auto-detect and parse CSV/TSV content.
 */
export function parseAuto(input: string | ArrayBuffer, options: Omit<CSVParseOptions, 'delimiter'> = {}): CSVData {
  const content = typeof input === 'string' ? input : new TextDecoder().decode(input)
  const delimiter = detectDelimiter(content)
  return parse(input, { ...options, delimiter })
}

// Default export
export default CSV

/**
 * @mdxld/xlsx
 *
 * Excel (XLSX) format support with bi-directional conversion.
 * Implements the standard Format interface with parse, stringify, and fetch.
 */

import * as XLSX_LIB from 'xlsx'
import type {
  TabularBinaryFormat,
  FormatFetchOptions,
  TabularParseOptions,
  TabularStringifyOptions,
} from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface XLSXParseOptions extends TabularParseOptions {
  /** Sheet name or index to parse (default: first sheet) */
  sheet?: string | number
  /** Whether first row contains headers (default: true) */
  headers?: boolean | string[]
  /** Range to parse (e.g., 'A1:C10') */
  range?: string
  /** Skip empty rows */
  skipEmpty?: boolean
  /** Date format for parsing dates */
  dateFormat?: string
  /** Raw values without formatting */
  raw?: boolean
  /** Decode password-protected files */
  password?: string
}

export interface XLSXStringifyOptions extends TabularStringifyOptions {
  /** Sheet name (default: 'Sheet1') */
  sheetName?: string
  /** Include header row (default: true) */
  headers?: boolean | string[]
  /** Column widths */
  columnWidths?: number[]
  /** Output format */
  bookType?: 'xlsx' | 'xls' | 'csv' | 'ods'
  /** Compression level (0-9) */
  compression?: number
}

export interface XLSXMultiSheetOptions extends XLSXParseOptions {
  /** Parse all sheets */
  allSheets?: boolean
}

export type XLSXRecord = Record<string, unknown>
export type XLSXData = XLSXRecord[]
export type XLSXMultiSheet = Record<string, XLSXData>

// ============================================================================
// Parse
// ============================================================================

/**
 * Parse XLSX buffer to array of objects.
 *
 * @example
 * ```ts
 * const data = parse(buffer)
 * // [{ name: 'Alice', age: 30 }, { name: 'Bob', age: 25 }]
 * ```
 */
export function parse(input: string | ArrayBuffer, options: XLSXParseOptions = {}): XLSXData {
  const {
    sheet = 0,
    headers = true,
    range,
    skipEmpty = true,
    raw = false,
    password,
  } = options

  const workbook = XLSX_LIB.read(input, {
    type: typeof input === 'string' ? 'binary' : 'array',
    raw,
    password,
  })

  // Get sheet by name or index
  let sheetName: string
  if (typeof sheet === 'number') {
    sheetName = workbook.SheetNames[sheet] ?? workbook.SheetNames[0] ?? ''
  } else {
    sheetName = sheet
  }

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  // Parse options for sheet_to_json
  const parseOpts: XLSX_LIB.Sheet2JSONOpts = {
    header: headers === true ? 1 : (Array.isArray(headers) ? headers : undefined),
    range,
    defval: null,
    blankrows: !skipEmpty,
    raw,
  }

  let data = XLSX_LIB.utils.sheet_to_json<XLSXRecord>(worksheet, parseOpts)

  // If headers is true, use first row as headers
  if (headers === true && data.length > 0) {
    const firstRow = data[0]
    if (firstRow && typeof Object.values(firstRow)[0] === 'string') {
      // First row might already be used as headers by xlsx
    }
  }

  // Apply custom headers
  if (Array.isArray(headers) && data.length > 0) {
    data = data.map((row) => {
      const values = Object.values(row)
      const obj: XLSXRecord = {}
      headers.forEach((header, i) => {
        obj[header] = values[i]
      })
      return obj
    })
  }

  return data
}

/**
 * Alias for parse().
 */
export const fromXLSX = parse

/**
 * Parse all sheets from XLSX.
 */
export function parseAllSheets(input: string | ArrayBuffer, options: XLSXParseOptions = {}): XLSXMultiSheet {
  const workbook = XLSX_LIB.read(input, {
    type: typeof input === 'string' ? 'binary' : 'array',
    raw: options.raw,
    password: options.password,
  })

  const result: XLSXMultiSheet = {}

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName]
    if (worksheet) {
      result[sheetName] = XLSX_LIB.utils.sheet_to_json<XLSXRecord>(worksheet, {
        header: options.headers === true ? 1 : undefined,
        defval: null,
        blankrows: !options.skipEmpty,
      })
    }
  }

  return result
}

// ============================================================================
// Stringify
// ============================================================================

/**
 * Convert array of objects to XLSX buffer.
 *
 * @example
 * ```ts
 * const buffer = stringify([{ name: 'Alice', age: 30 }])
 * ```
 */
export function stringify(data: XLSXData, options: XLSXStringifyOptions = {}): ArrayBuffer {
  const {
    sheetName = 'Sheet1',
    headers = true,
    columnWidths,
    bookType = 'xlsx',
    compression = 6,
  } = options

  // Create worksheet
  const worksheet = XLSX_LIB.utils.json_to_sheet(data, {
    header: Array.isArray(headers) ? headers : undefined,
    skipHeader: headers === false,
  })

  // Set column widths
  if (columnWidths) {
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }))
  }

  // Create workbook
  const workbook = XLSX_LIB.utils.book_new()
  XLSX_LIB.utils.book_append_sheet(workbook, worksheet, sheetName)

  // Write to buffer
  const buffer = XLSX_LIB.write(workbook, {
    type: 'array',
    bookType,
    compression: compression > 0,
  })

  return buffer
}

/**
 * Alias for stringify().
 */
export const toXLSX = stringify

/**
 * Create multi-sheet XLSX.
 */
export function stringifyMultiSheet(sheets: XLSXMultiSheet, options: XLSXStringifyOptions = {}): ArrayBuffer {
  const { bookType = 'xlsx', compression = 6 } = options

  const workbook = XLSX_LIB.utils.book_new()

  for (const [name, data] of Object.entries(sheets)) {
    const worksheet = XLSX_LIB.utils.json_to_sheet(data, {
      header: Array.isArray(options.headers) ? options.headers : undefined,
      skipHeader: options.headers === false,
    })
    XLSX_LIB.utils.book_append_sheet(workbook, worksheet, name)
  }

  return XLSX_LIB.write(workbook, {
    type: 'array',
    bookType,
    compression: compression > 0,
  })
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch XLSX from URL and parse.
 *
 * @example
 * ```ts
 * const data = await fetchXLSX('https://example.com/data.xlsx')
 * ```
 */
export async function fetchXLSX(
  url: string,
  options: FormatFetchOptions & XLSXParseOptions = {}
): Promise<XLSXData> {
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

    const buffer = await response.arrayBuffer()
    return parse(buffer, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * XLSX Format object implementing the standard Format interface.
 *
 * @example
 * ```ts
 * import { XLSX } from '@mdxld/xlsx'
 *
 * const data = XLSX.parse(buffer)
 * const buffer = XLSX.stringify(data)
 * const remote = await XLSX.fetch('https://example.com/data.xlsx')
 * ```
 */
export const XLSX: TabularBinaryFormat<XLSXData, XLSXParseOptions, XLSXStringifyOptions> = {
  name: 'xlsx',
  mimeTypes: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ] as const,
  extensions: ['xlsx', 'xls'] as const,
  parse,
  stringify,
  fetch: fetchXLSX,
  getHeaders(data: XLSXData): string[] {
    if (data.length === 0) return []
    return Object.keys(data[0] ?? {})
  },
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get sheet names from XLSX buffer.
 */
export function getSheetNames(input: string | ArrayBuffer): string[] {
  const workbook = XLSX_LIB.read(input, {
    type: typeof input === 'string' ? 'binary' : 'array',
  })
  return workbook.SheetNames
}

/**
 * Get column headers from XLSX data.
 */
export function getHeaders(data: XLSXData): string[] {
  return XLSX.getHeaders(data)
}

/**
 * Convert XLSX to CSV string.
 */
export function toCSV(input: string | ArrayBuffer, options: XLSXParseOptions = {}): string {
  const {
    sheet = 0,
    password,
  } = options

  const workbook = XLSX_LIB.read(input, {
    type: typeof input === 'string' ? 'binary' : 'array',
    password,
  })

  let sheetName: string
  if (typeof sheet === 'number') {
    sheetName = workbook.SheetNames[sheet] ?? workbook.SheetNames[0] ?? ''
  } else {
    sheetName = sheet
  }

  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }

  return XLSX_LIB.utils.sheet_to_csv(worksheet)
}

/**
 * Convert XLSX to JSON-LD format.
 */
export function toJSONLD(data: XLSXData, options: { context?: string; type?: string } = {}): Record<string, unknown> {
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
 * Create XLSX from CSV string.
 */
export function fromCSV(csv: string, options: XLSXStringifyOptions = {}): ArrayBuffer {
  const workbook = XLSX_LIB.read(csv, { type: 'string' })
  return XLSX_LIB.write(workbook, {
    type: 'array',
    bookType: options.bookType ?? 'xlsx',
  })
}

// Default export
export default XLSX

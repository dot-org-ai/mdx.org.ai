/**
 * @mdxdb/sources - CSV source adapter
 * Parse CSV files and streams with type conversion
 */

import type {
  CSVSourceConfig,
  CSVColumnConfig,
  MDXLDDocument,
  SourceRequest,
  SourceResponse,
  SourceClient,
} from './types.js'
import { CacheManager, createCacheConfig, defaultCache } from './cache.js'
import { createProxyFetch } from './proxy.js'

/**
 * CSV parsing result
 */
export interface CSVParseResult {
  rows: MDXLDDocument[]
  headers: string[]
  totalRows: number
  errors?: CSVParseError[]
}

export interface CSVParseError {
  row: number
  column?: string
  message: string
  value?: string
}

/**
 * CSV source client
 */
export class CSVSource implements SourceClient<CSVSourceConfig> {
  readonly config: CSVSourceConfig
  private fetchFn: typeof fetch
  private cache: CacheManager

  constructor(config: CSVSourceConfig, cache?: CacheManager) {
    this.config = {
      delimiter: ',',
      hasHeaders: true,
      quote: '"',
      escape: '"',
      skipEmptyLines: true,
      skipRows: 0,
      batchSize: 100,
      ...config,
    }
    this.cache = cache || defaultCache

    this.fetchFn = config.proxy
      ? createProxyFetch(config.proxy)
      : fetch.bind(globalThis)
  }

  /**
   * Execute a request (fetch and parse CSV)
   */
  async request<R = CSVParseResult>(req: SourceRequest): Promise<SourceResponse<R>> {
    const url = this.buildUrl(req)

    const cacheConfig = this.config.cache
      ? createCacheConfig(this.config.cache)
      : null

    // Check cache
    if (cacheConfig && req.method === 'GET') {
      const cacheKey = this.cache.generateKey(req, cacheConfig)

      const result = await this.cache.get<R>(
        cacheKey,
        () => this.fetchAndParse<R>(url),
        cacheConfig
      )

      return {
        data: result.data,
        status: 200,
        headers: new Headers(),
        cached: result.cached,
        stale: result.stale,
        cacheKey,
      }
    }

    const data = await this.fetchAndParse<R>(url)

    return {
      data,
      status: 200,
      headers: new Headers(),
      cached: false,
      stale: false,
    }
  }

  /**
   * Fetch CSV and parse
   */
  private async fetchAndParse<R>(url: string): Promise<R> {
    const headers = new Headers(this.config.headers)
    headers.set('Accept', 'text/csv, text/plain')

    const response = await this.fetchFn(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const text = await response.text()
    const result = this.parse(text)

    return result as R
  }

  /**
   * Load all data from configured source
   */
  async load(): Promise<MDXLDDocument[]> {
    const url = this.config.url || this.config.baseUrl

    if (!url) {
      throw new Error('No URL or baseUrl configured')
    }

    const response = await this.request<CSVParseResult>({
      method: 'GET',
      path: url,
    })

    return response.data.rows
  }

  /**
   * Stream CSV data in batches
   */
  async *stream(): AsyncGenerator<MDXLDDocument[], void, unknown> {
    const url = this.config.url || this.config.baseUrl

    if (!url) {
      throw new Error('No URL or baseUrl configured')
    }

    const headers = new Headers(this.config.headers)
    headers.set('Accept', 'text/csv, text/plain')

    const response = await this.fetchFn(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (!response.body) {
      throw new Error('Response body is not readable')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()

    let buffer = ''
    let headerRow: string[] | null = null
    let batch: MDXLDDocument[] = []
    let rowIndex = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        // Process remaining buffer
        if (buffer.trim()) {
          const rows = this.parseRows(buffer, headerRow!)
          batch.push(...rows)
        }
        if (batch.length > 0) {
          yield batch
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })

      // Process complete lines
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim() && this.config.skipEmptyLines) continue

        rowIndex++

        // Skip configured rows
        if (rowIndex <= (this.config.skipRows || 0)) continue

        // Handle header row
        if (!headerRow && this.config.hasHeaders === true) {
          headerRow = this.parseLine(line)
          continue
        } else if (!headerRow && Array.isArray(this.config.hasHeaders)) {
          headerRow = this.config.hasHeaders
        }

        // Parse data row
        const values = this.parseLine(line)
        const row = this.createRow(headerRow || [], values, rowIndex)

        if (row) {
          batch.push(row)

          if (batch.length >= (this.config.batchSize || 100)) {
            yield batch
            batch = []
          }
        }

        // Check max rows
        if (this.config.maxRows && rowIndex > this.config.maxRows) {
          if (batch.length > 0) {
            yield batch
          }
          return
        }
      }
    }
  }

  /**
   * Parse CSV text
   */
  parse(text: string): CSVParseResult {
    const lines = text.split(/\r?\n/)
    const errors: CSVParseError[] = []
    const rows: MDXLDDocument[] = []

    let headerRow: string[] | null = null
    let rowIndex = 0
    let dataRowIndex = 0

    for (const line of lines) {
      rowIndex++

      // Skip configured rows
      if (rowIndex <= (this.config.skipRows || 0)) continue

      // Skip empty lines
      if (!line.trim() && this.config.skipEmptyLines) continue

      // Handle header row
      if (!headerRow && this.config.hasHeaders === true) {
        headerRow = this.parseLine(line)
        continue
      } else if (!headerRow && Array.isArray(this.config.hasHeaders)) {
        headerRow = this.config.hasHeaders
      } else if (!headerRow) {
        // No headers - generate column names
        const values = this.parseLine(line)
        headerRow = values.map((_, i) => `column${i}`)
      }

      // Parse data row
      try {
        const values = this.parseLine(line)
        const row = this.createRow(headerRow, values, dataRowIndex)

        if (row) {
          rows.push(row)
          dataRowIndex++
        }
      } catch (e) {
        errors.push({
          row: rowIndex,
          message: e instanceof Error ? e.message : 'Parse error',
        })
      }

      // Check max rows
      if (this.config.maxRows && dataRowIndex >= this.config.maxRows) {
        break
      }
    }

    return {
      rows,
      headers: headerRow || [],
      totalRows: dataRowIndex,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Parse rows from text (with known headers)
   */
  private parseRows(text: string, headers: string[]): MDXLDDocument[] {
    const lines = text.split(/\r?\n/)
    const rows: MDXLDDocument[] = []

    for (const line of lines) {
      if (!line.trim() && this.config.skipEmptyLines) continue

      const values = this.parseLine(line)
      const row = this.createRow(headers, values, rows.length)

      if (row) {
        rows.push(row)
      }
    }

    return rows
  }

  /**
   * Parse a single CSV line
   */
  private parseLine(line: string): string[] {
    const values: string[] = []
    const delimiter = this.config.delimiter || ','
    const quote = this.config.quote || '"'
    const escape = this.config.escape || '"'

    let current = ''
    let inQuotes = false
    let i = 0

    while (i < line.length) {
      const char = line[i]
      const nextChar = line[i + 1]

      if (inQuotes) {
        if (char === escape && nextChar === quote) {
          // Escaped quote
          current += quote
          i += 2
        } else if (char === quote) {
          // End of quoted field
          inQuotes = false
          i++
        } else {
          current += char
          i++
        }
      } else {
        if (char === quote) {
          // Start of quoted field
          inQuotes = true
          i++
        } else if (char === delimiter) {
          // Field separator
          values.push(current.trim())
          current = ''
          i++
        } else {
          current += char
          i++
        }
      }
    }

    // Add last field
    values.push(current.trim())

    return values
  }

  /**
   * Create a row object from values
   */
  private createRow(
    headers: string[],
    values: string[],
    rowIndex: number
  ): MDXLDDocument | null {
    const row: Record<string, string> = {}

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      if (header) {
        row[header] = values[i] || ''
      }
    }

    // Apply custom transform if configured
    if (this.config.rowTransform) {
      return this.config.rowTransform(row)
    }

    // Apply column transforms
    const transformed = this.transformRow(row, rowIndex)

    return transformed
  }

  /**
   * Transform row values based on column config
   */
  private transformRow(
    row: Record<string, string>,
    rowIndex: number
  ): MDXLDDocument {
    const result: MDXLDDocument = {
      $type: 'CSVRow',
      $id: `row:${rowIndex}`,
    }

    for (const [key, value] of Object.entries(row)) {
      const columnConfig = this.config.columns?.[key]

      if (columnConfig) {
        result[key] = this.transformValue(value, columnConfig)
      } else {
        result[key] = value
      }
    }

    return result
  }

  /**
   * Transform a single value based on column config
   */
  private transformValue(value: string, config: CSVColumnConfig): unknown {
    // Handle empty values
    if (!value || value.trim() === '') {
      if (config.required) {
        throw new Error(`Required value is empty`)
      }
      return config.default ?? null
    }

    // Custom transform takes precedence
    if (config.transform) {
      return config.transform(value)
    }

    // Type-based transformation
    switch (config.type) {
      case 'number': {
        const num = parseFloat(value.replace(/[^0-9.-]/g, ''))
        return isNaN(num) ? (config.default ?? null) : num
      }

      case 'boolean': {
        const lower = value.toLowerCase().trim()
        return ['true', 'yes', '1', 'y'].includes(lower)
      }

      case 'date': {
        const date = new Date(value)
        return isNaN(date.getTime()) ? (config.default ?? null) : date.toISOString()
      }

      case 'array': {
        const delimiter = config.arrayDelimiter || ','
        return value.split(delimiter).map(v => v.trim()).filter(Boolean)
      }

      case 'json': {
        try {
          return JSON.parse(value)
        } catch {
          return config.default ?? null
        }
      }

      case 'string':
      default:
        return value
    }
  }

  /**
   * Build URL from request
   */
  private buildUrl(req: SourceRequest): string {
    let path = req.path

    // Replace path parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
      }
    }

    // If path is already a full URL, use it directly
    if (path.startsWith('http://') || path.startsWith('https://')) {
      const url = new URL(path)

      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (Array.isArray(value)) {
            for (const v of value) {
              url.searchParams.append(key, v)
            }
          } else {
            url.searchParams.set(key, value)
          }
        }
      }

      return url.toString()
    }

    const url = new URL(path, this.config.baseUrl)

    // Add query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v)
          }
        } else {
          url.searchParams.set(key, value)
        }
      }
    }

    return url.toString()
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(key?: string, tags?: string[]): Promise<void> {
    await this.cache.invalidate(key, tags)
  }
}

/**
 * Create a CSV source from configuration
 */
export function createCSVSource(
  config: CSVSourceConfig,
  cache?: CacheManager
): CSVSource {
  return new CSVSource(config, cache)
}

/**
 * Parse CSV string (standalone function)
 */
export function parseCSV(
  text: string,
  options?: Partial<CSVSourceConfig>
): CSVParseResult {
  const source = new CSVSource({
    type: 'csv',
    id: 'temp',
    baseUrl: '',
    ...options,
  })

  return source.parse(text)
}

/**
 * Convert CSV rows to MDXLD documents
 */
export function csvToMDXLD(
  text: string,
  options: {
    $type: string
    $id: (row: Record<string, string>, index: number) => string
    $context?: string
    mapRow?: (row: Record<string, string>) => Record<string, unknown>
  } & Partial<CSVSourceConfig>
): MDXLDDocument[] {
  const source = new CSVSource({
    type: 'csv',
    id: 'temp',
    baseUrl: '',
    ...options,
    rowTransform: (row) => {
      const transformed = options.mapRow ? options.mapRow(row) : row
      return {
        $type: options.$type,
        $id: options.$id(row, 0), // Note: index not available in this context
        ...(options.$context ? { $context: options.$context } : {}),
        ...transformed,
      }
    },
  })

  const result = source.parse(text)
  return result.rows
}

/**
 * Generate CSV from MDXLD documents
 */
export function mdxldToCSV(
  docs: MDXLDDocument[],
  options?: {
    delimiter?: string
    includeHeaders?: boolean
    columns?: string[]
  }
): string {
  if (docs.length === 0) return ''

  const delimiter = options?.delimiter || ','
  const includeHeaders = options?.includeHeaders ?? true

  // Determine columns (docs[0] is guaranteed to exist due to length check above)
  const firstDoc = docs[0]!
  const columns = options?.columns || Object.keys(firstDoc).filter(k => !k.startsWith('$'))

  const lines: string[] = []

  // Add header row
  if (includeHeaders) {
    lines.push(columns.map(c => escapeCSVValue(c, delimiter)).join(delimiter))
  }

  // Add data rows
  for (const doc of docs) {
    const values = columns.map(col => {
      const value = doc[col]
      return escapeCSVValue(formatCSVValue(value), delimiter)
    })
    lines.push(values.join(delimiter))
  }

  return lines.join('\n')
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function escapeCSVValue(value: string, delimiter: string): string {
  // Check if value needs quoting
  if (value.includes('"') || value.includes(delimiter) || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

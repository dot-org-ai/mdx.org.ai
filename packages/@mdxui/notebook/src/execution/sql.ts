import type { CellOutput } from '../types'

/**
 * SQL tagged template literal for querying URLs via ClickHouse
 *
 * Usage:
 * ```ts
 * const result = await sql`SELECT * FROM url('https://jsonplaceholder.typicode.com/todos') LIMIT 5`
 * ```
 */
export function sql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): SQLQuery {
  // Interpolate the template
  let query = strings[0]
  for (let i = 0; i < values.length; i++) {
    query += escapeValue(values[i]) + strings[i + 1]
  }
  return new SQLQuery(query)
}

/**
 * Escape values for SQL interpolation
 */
function escapeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }
  if (typeof value === 'number') {
    return String(value)
  }
  if (typeof value === 'boolean') {
    return value ? '1' : '0'
  }
  if (typeof value === 'string') {
    // Escape single quotes
    return `'${value.replace(/'/g, "''")}'`
  }
  if (Array.isArray(value)) {
    return `[${value.map(escapeValue).join(', ')}]`
  }
  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * SQL Query wrapper with execution methods
 */
export class SQLQuery {
  constructor(public readonly query: string) {}

  /**
   * Execute via ClickHouse HTTP interface
   */
  async execute(endpoint?: string): Promise<SQLResult> {
    const url = endpoint || 'https://sql.do/query'

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: this.query,
        format: 'JSON',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new SQLError(`Query failed: ${error}`)
    }

    const result = await response.json()
    return new SQLResult(result)
  }

  toString(): string {
    return this.query
  }
}

/**
 * SQL Query Result
 */
export class SQLResult {
  readonly columns: string[]
  readonly rows: Record<string, unknown>[]
  readonly meta: Array<{ name: string; type: string }>
  readonly statistics?: {
    elapsed: number
    rows_read: number
    bytes_read: number
  }

  constructor(data: ClickHouseResponse) {
    this.meta = data.meta || []
    this.columns = this.meta.map((m) => m.name)
    this.rows = data.data || []
    this.statistics = data.statistics
  }

  /**
   * Get all rows as an array
   */
  toArray(): Record<string, unknown>[] {
    return this.rows
  }

  /**
   * Get first row
   */
  first(): Record<string, unknown> | undefined {
    return this.rows[0]
  }

  /**
   * Map over rows
   */
  map<T>(fn: (row: Record<string, unknown>, index: number) => T): T[] {
    return this.rows.map(fn)
  }

  /**
   * Convert to table output format
   */
  toOutput(): CellOutput {
    return {
      type: 'table',
      data: {
        columns: this.columns,
        rows: this.rows,
      },
      timestamp: Date.now(),
    }
  }
}

class SQLError extends Error {
  name = 'SQLError'
}

interface ClickHouseResponse {
  meta?: Array<{ name: string; type: string }>
  data?: Record<string, unknown>[]
  rows?: number
  statistics?: {
    elapsed: number
    rows_read: number
    bytes_read: number
  }
}

/**
 * Create a SQL executor for notebook cells
 */
export function createSQLExecutor(endpoint?: string) {
  return async (query: string): Promise<CellOutput[]> => {
    const startTime = performance.now()

    try {
      const sqlQuery = new SQLQuery(query)
      const result = await sqlQuery.execute(endpoint)

      return [{
        type: 'table',
        data: {
          columns: result.columns,
          rows: result.rows,
        },
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      }]
    } catch (error) {
      return [{
        type: 'error',
        data: {
          name: error instanceof Error ? error.name : 'Error',
          message: error instanceof Error ? error.message : String(error),
        },
        timestamp: Date.now(),
        executionTime: performance.now() - startTime,
      }]
    }
  }
}

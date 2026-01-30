/**
 * SQL Escape Utilities
 *
 * Provides functions for safely escaping values to prevent SQL injection
 * when building ClickHouse queries.
 *
 * @packageDocumentation
 */

/**
 * Escapes a string value for safe inclusion in SQL queries.
 *
 * Handles:
 * - Single quotes (')
 * - Double quotes (")
 * - Backslashes (\)
 * - Newlines (\n)
 * - Carriage returns (\r)
 * - Tab characters (\t)
 * - Null bytes (\0)
 * - Other control characters
 *
 * @param value - The string value to escape
 * @returns The escaped string safe for SQL inclusion
 */
export function escapeValue(value: string): string {
  if (value === '') {
    return ''
  }

  // First, remove null bytes and other dangerous control characters
  let escaped = value.replace(/\0/g, '')

  // Remove other control characters (except tab, newline, carriage return which we handle separately)
  escaped = escaped.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')

  // Escape backslashes first (before other escapes that produce backslashes)
  escaped = escaped.replace(/\\/g, '\\\\')

  // Escape single quotes
  escaped = escaped.replace(/'/g, "\\'")

  // Escape double quotes
  escaped = escaped.replace(/"/g, '\\"')

  // Escape newlines
  escaped = escaped.replace(/\n/g, '\\n')

  // Escape carriage returns
  escaped = escaped.replace(/\r/g, '\\r')

  // Escape tabs
  escaped = escaped.replace(/\t/g, '\\t')

  return escaped
}

/**
 * Validates and sanitizes a SQL identifier (table name, column name, etc.)
 *
 * Identifiers must:
 * - Start with a letter or underscore
 * - Contain only letters, numbers, and underscores
 * - Not be empty
 *
 * @param identifier - The identifier to validate
 * @returns The validated identifier
 * @throws Error if the identifier is invalid
 */
export function sanitizeIdentifier(identifier: string): string {
  if (!identifier || identifier.length === 0) {
    throw new Error('Identifier cannot be empty')
  }

  // Check if identifier starts with a number
  if (/^[0-9]/.test(identifier)) {
    throw new Error(`Invalid identifier: "${identifier}" - cannot start with a number`)
  }

  // Check for valid characters (letters, numbers, underscores only)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error(`Invalid identifier: "${identifier}" - contains invalid characters`)
  }

  return identifier
}

/**
 * Result from buildInsertQuery containing the query template and escaped data
 */
export interface InsertQueryResult {
  /** The SQL query string with column names */
  query: string
  /** The escaped data object ready for JSON serialization */
  data: Record<string, unknown>
}

/**
 * Builds a safe INSERT query for ClickHouse using JSONEachRow format.
 *
 * This function:
 * 1. Validates the table name
 * 2. Escapes all string values in the data
 * 3. Returns both the query and the sanitized data
 *
 * @param tableName - The name of the table to insert into
 * @param data - The data object to insert
 * @returns The query string and escaped data
 * @throws Error if the table name is invalid
 */
export function buildInsertQuery(
  tableName: string,
  data: Record<string, unknown>
): InsertQueryResult {
  // Validate table name
  const safeTableName = sanitizeIdentifier(tableName)

  // Get column names from data keys
  const columns = Object.keys(data)

  // Build the query
  const query = `INSERT INTO ${safeTableName} (${columns.join(', ')}) FORMAT JSONEachRow`

  // Escape all string values in the data
  const escapedData: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      escapedData[key] = escapeValue(value)
    } else if (value !== null && typeof value === 'object') {
      // For objects (like the data JSON field), recursively escape string values
      escapedData[key] = escapeObjectStrings(value as Record<string, unknown>)
    } else {
      escapedData[key] = value
    }
  }

  return { query, data: escapedData }
}

/**
 * Recursively escapes all string values in an object.
 *
 * @param obj - The object to process
 * @returns A new object with all strings escaped
 */
function escapeObjectStrings(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = escapeValue(value)
    } else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string'
          ? escapeValue(item)
          : (item !== null && typeof item === 'object'
            ? escapeObjectStrings(item as Record<string, unknown>)
            : item)
      )
    } else if (value !== null && typeof value === 'object') {
      result[key] = escapeObjectStrings(value as Record<string, unknown>)
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Validates a query to ensure it doesn't contain dangerous operations.
 *
 * This is a defense-in-depth measure for the API query endpoint.
 * Only SELECT queries should be allowed via the API.
 *
 * @param query - The SQL query to validate
 * @returns true if the query is safe, false otherwise
 */
export function isQuerySafe(query: string): boolean {
  const normalizedQuery = query.toUpperCase().trim()

  // Dangerous operations that should not be allowed
  const dangerousPatterns = [
    /^\s*DROP\s+/i,
    /^\s*DELETE\s+/i,
    /^\s*TRUNCATE\s+/i,
    /^\s*ALTER\s+/i,
    /^\s*CREATE\s+/i,
    /^\s*INSERT\s+/i,
    /^\s*UPDATE\s+/i,
    /;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s+/i,
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(query)) {
      return false
    }
  }

  return true
}

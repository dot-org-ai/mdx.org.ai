/**
 * Error Sanitization Utilities
 *
 * Provides utilities for creating safe error responses that don't expose
 * internal implementation details like stack traces or file paths in production.
 *
 * @packageDocumentation
 */

/**
 * Standard error response format for HTTP APIs
 */
export interface ErrorResponse {
  /** The error message */
  error: string
  /** Stack trace (only included in debug mode) */
  stack?: string
  /** Error code if available */
  code?: string
  /** Error name/type */
  name?: string
}

/**
 * Options for error sanitization
 */
export interface SanitizeOptions {
  /** Whether to include debug information (stack traces, full paths) */
  debug?: boolean
}

/**
 * Result of sanitizing an error
 */
export interface SanitizedError {
  /** Sanitized error message */
  message: string
  /** Stack trace (only if debug mode enabled) */
  stack?: string
  /** Error name/type */
  name?: string
  /** Error code if available */
  code?: string
}

/**
 * Regex patterns for identifying internal paths that should be sanitized
 */
const PATH_PATTERNS = [
  // Unix-style absolute paths
  /\/(?:Users|home|app|var|opt|usr|tmp)\/[^\s'"]+/g,
  // Windows-style paths
  /[A-Z]:\\[^\s'"]+/gi,
  // node_modules paths
  /node_modules\/[^\s'"]+/g,
]

/**
 * Check if the current environment is development mode
 *
 * @returns true if running in development mode
 */
export function isDevelopment(): boolean {
  const env = process.env.NODE_ENV
  // Only development is considered dev mode
  // undefined defaults to dev for local development
  // test mode should NOT expose stack traces by default
  return env === 'development' || env === undefined
}

/**
 * Sanitize internal paths from a string
 *
 * @param str - String that may contain internal paths
 * @returns String with paths sanitized
 */
function sanitizePaths(str: string): string {
  let result = str
  for (const pattern of PATH_PATTERNS) {
    result = result.replace(pattern, '[path]')
  }
  return result
}

/**
 * Sanitize an error for safe exposure
 *
 * In production mode:
 * - Removes stack traces
 * - Sanitizes internal file paths from error messages
 *
 * In debug mode:
 * - Preserves full stack traces
 * - Preserves full file paths
 *
 * @param error - The error to sanitize
 * @param options - Sanitization options
 * @returns Sanitized error object
 */
export function sanitizeError(error: Error | unknown, options: SanitizeOptions = {}): SanitizedError {
  const { debug = false } = options

  // Handle null/undefined
  if (error == null) {
    return { message: 'Unknown error' }
  }

  // Handle non-Error objects (strings, numbers, etc.)
  if (!(error instanceof Error)) {
    const message = String(error)
    return {
      message: debug ? message : sanitizePaths(message),
    }
  }

  // Handle Error objects
  const result: SanitizedError = {
    message: debug ? error.message : sanitizePaths(error.message),
  }

  // Include error name if not generic "Error"
  if (error.name && error.name !== 'Error') {
    result.name = error.name
  }

  // Include error code if present
  if ('code' in error && typeof (error as Error & { code?: string }).code === 'string') {
    result.code = (error as Error & { code: string }).code
  }

  // Include stack trace only in debug mode
  if (debug && error.stack) {
    result.stack = error.stack
  }

  return result
}

/**
 * Create an error response suitable for HTTP responses
 *
 * Automatically determines debug mode based on NODE_ENV unless explicitly specified.
 * In production, stack traces and internal paths are removed.
 *
 * @param error - The error to convert
 * @param options - Options including debug override
 * @returns ErrorResponse object ready for JSON serialization
 *
 * @example
 * ```ts
 * // In a request handler:
 * catch (error) {
 *   const response = createErrorResponse(error)
 *   return new Response(JSON.stringify(response), {
 *     status: 500,
 *     headers: { 'Content-Type': 'application/json' }
 *   })
 * }
 * ```
 */
export function createErrorResponse(error: Error | unknown, options: SanitizeOptions = {}): ErrorResponse {
  // Determine debug mode: explicit option > NODE_ENV
  const debug = options.debug !== undefined ? options.debug : isDevelopment()

  const sanitized = sanitizeError(error, { debug })

  const response: ErrorResponse = {
    error: sanitized.message,
  }

  if (sanitized.stack) {
    response.stack = sanitized.stack
  }

  if (sanitized.code) {
    response.code = sanitized.code
  }

  if (sanitized.name) {
    response.name = sanitized.name
  }

  return response
}

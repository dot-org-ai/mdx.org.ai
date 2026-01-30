/**
 * Error Sanitization Utilities for Cloudflare Workers
 *
 * Provides utilities for creating safe error responses that don't expose
 * internal implementation details like stack traces in production.
 *
 * This is a Workers-compatible version that doesn't rely on process.env.
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
}

/**
 * Options for error sanitization
 */
export interface SanitizeOptions {
  /** Whether to include debug information (stack traces) */
  debug?: boolean
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
 * Create an error response suitable for HTTP responses
 *
 * In production (debug: false), stack traces and internal paths are removed.
 * In debug mode (debug: true), full error details are preserved.
 *
 * @param error - The error to convert
 * @param options - Options including debug flag
 * @returns ErrorResponse object ready for JSON serialization
 *
 * @example
 * ```ts
 * // In a request handler:
 * catch (error) {
 *   const response = createErrorResponse(error, { debug: env.DEBUG === 'true' })
 *   return new Response(JSON.stringify(response), {
 *     status: 500,
 *     headers: { 'Content-Type': 'application/json' }
 *   })
 * }
 * ```
 */
export function createErrorResponse(error: Error | unknown, options: SanitizeOptions = {}): ErrorResponse {
  const { debug = false } = options

  // Handle null/undefined
  if (error == null) {
    return { error: 'Unknown error' }
  }

  // Handle non-Error objects (strings, numbers, etc.)
  if (!(error instanceof Error)) {
    const message = String(error)
    return {
      error: debug ? message : sanitizePaths(message),
    }
  }

  // Build response
  const response: ErrorResponse = {
    error: debug ? error.message : sanitizePaths(error.message),
  }

  // Include stack trace only in debug mode
  if (debug && error.stack) {
    response.stack = error.stack
  }

  // Include error code if present
  if ('code' in error && typeof (error as Error & { code?: string }).code === 'string') {
    response.code = (error as Error & { code: string }).code
  }

  return response
}

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Error codes for categorizing different error types
 */
export const ErrorCode = {
  /** Execution exceeded time limit */
  TIMEOUT: 'ERR_TIMEOUT',
  /** Memory limit exceeded */
  MEMORY_EXCEEDED: 'ERR_MEMORY_EXCEEDED',
  /** Sandbox security violation */
  SANDBOX_VIOLATION: 'ERR_SANDBOX_VIOLATION',
  /** MDX/JS parsing error */
  PARSE_ERROR: 'ERR_PARSE_ERROR',
  /** Requested export not found */
  MISSING_EXPORT: 'ERR_MISSING_EXPORT',
  /** Input validation failed */
  VALIDATION_ERROR: 'ERR_VALIDATION_ERROR',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

// ============================================================================
// Base Error Class
// ============================================================================

/**
 * Base error class for all @mdxe/workers errors
 */
export class WorkersError extends Error {
  /** Error code for programmatic error handling */
  readonly code: ErrorCodeType

  constructor(message: string, code: ErrorCodeType) {
    super(message)
    this.code = code
    this.name = 'WorkersError'

    // Maintain proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor)
    }
  }

  /**
   * Serialize error to JSON for API responses
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
    }
  }
}

// ============================================================================
// Timeout Error
// ============================================================================

export interface TimeoutErrorOptions {
  /** Timeout duration in milliseconds */
  timeout?: number
}

/**
 * Error thrown when execution exceeds the configured time limit
 */
export class TimeoutError extends WorkersError {
  /** Timeout duration in milliseconds */
  readonly timeout?: number

  constructor(message: string, options: TimeoutErrorOptions = {}) {
    super(message, ErrorCode.TIMEOUT)
    this.name = 'TimeoutError'
    this.timeout = options.timeout
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      timeout: this.timeout,
    }
  }
}

// ============================================================================
// Memory Error
// ============================================================================

export interface MemoryErrorOptions {
  /** Memory limit in MB */
  limit?: number
  /** Actual usage in MB (if available) */
  usage?: number
}

/**
 * Error thrown when memory limit is exceeded
 */
export class MemoryError extends WorkersError {
  /** Memory limit in MB */
  readonly limit?: number
  /** Actual usage in MB */
  readonly usage?: number

  constructor(message: string, options: MemoryErrorOptions = {}) {
    super(message, ErrorCode.MEMORY_EXCEEDED)
    this.name = 'MemoryError'
    this.limit = options.limit
    this.usage = options.usage
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      limit: this.limit,
      usage: this.usage,
    }
  }
}

// ============================================================================
// Sandbox Error
// ============================================================================

export type ViolationType = 'network' | 'filesystem' | 'process' | 'env' | 'other'

export interface SandboxErrorOptions {
  /** Type of sandbox violation */
  violationType?: ViolationType
  /** Resource that was blocked */
  blockedResource?: string
}

/**
 * Error thrown when sandbox security is violated
 */
export class SandboxError extends WorkersError {
  /** Type of sandbox violation */
  readonly violationType?: ViolationType
  /** Resource that was blocked */
  readonly blockedResource?: string

  constructor(message: string, options: SandboxErrorOptions = {}) {
    super(message, ErrorCode.SANDBOX_VIOLATION)
    this.name = 'SandboxError'
    this.violationType = options.violationType
    this.blockedResource = options.blockedResource
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      violationType: this.violationType,
      blockedResource: this.blockedResource,
    }
  }
}

// ============================================================================
// Parse Error
// ============================================================================

export interface ParseErrorOptions {
  /** Line number where error occurred */
  line?: number
  /** Column number where error occurred */
  column?: number
  /** Source file or content identifier */
  source?: string
}

/**
 * Error thrown when MDX/JS parsing fails
 */
export class ParseError extends WorkersError {
  /** Line number where error occurred */
  readonly line?: number
  /** Column number where error occurred */
  readonly column?: number
  /** Source file or content identifier */
  readonly source?: string

  constructor(message: string, options: ParseErrorOptions = {}) {
    super(message, ErrorCode.PARSE_ERROR)
    this.name = 'ParseError'
    this.line = options.line
    this.column = options.column
    this.source = options.source
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      line: this.line,
      column: this.column,
      source: this.source,
    }
  }
}

// ============================================================================
// Missing Export Error
// ============================================================================

export interface MissingExportErrorOptions {
  /** Name of the missing export */
  exportName?: string
  /** List of available exports in the module */
  availableExports?: string[]
}

/**
 * Error thrown when a requested export is not found in the module
 */
export class MissingExportError extends WorkersError {
  /** Name of the missing export */
  readonly exportName?: string
  /** List of available exports in the module */
  readonly availableExports?: string[]

  constructor(message: string, options: MissingExportErrorOptions = {}) {
    super(message, ErrorCode.MISSING_EXPORT)
    this.name = 'MissingExportError'
    this.exportName = options.exportName
    this.availableExports = options.availableExports
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      exportName: this.exportName,
      availableExports: this.availableExports,
    }
  }
}

// ============================================================================
// Validation Error
// ============================================================================

export interface ValidationErrorOptions {
  /** Field that failed validation */
  field?: string
  /** Expected type or value */
  expected?: string
  /** Received type or value */
  received?: string
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends WorkersError {
  /** Field that failed validation */
  readonly field?: string
  /** Expected type or value */
  readonly expected?: string
  /** Received type or value */
  readonly received?: string

  constructor(message: string, options: ValidationErrorOptions = {}) {
    super(message, ErrorCode.VALIDATION_ERROR)
    this.name = 'ValidationError'
    this.field = options.field
    this.expected = options.expected
    this.received = options.received
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      field: this.field,
      expected: this.expected,
      received: this.received,
    }
  }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an error is a TimeoutError
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError
}

/**
 * Check if an error is a MemoryError
 */
export function isMemoryError(error: unknown): error is MemoryError {
  return error instanceof MemoryError
}

/**
 * Check if an error is a SandboxError
 */
export function isSandboxError(error: unknown): error is SandboxError {
  return error instanceof SandboxError
}

/**
 * Check if an error is a ParseError
 */
export function isParseError(error: unknown): error is ParseError {
  return error instanceof ParseError
}

/**
 * Check if an error is a MissingExportError
 */
export function isMissingExportError(error: unknown): error is MissingExportError {
  return error instanceof MissingExportError
}

/**
 * Check if an error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError
}

/**
 * Check if an error is any WorkersError type
 */
export function isWorkersError(error: unknown): error is WorkersError {
  return error instanceof WorkersError
}

// ============================================================================
// Error Factory Functions
// ============================================================================

/**
 * Create a timeout error with standard message
 */
export function createTimeoutError(timeout: number): TimeoutError {
  return new TimeoutError(`Execution timed out after ${timeout}ms`, { timeout })
}

/**
 * Create a memory error with standard message
 */
export function createMemoryError(limit: number, usage?: number): MemoryError {
  const usageMsg = usage ? ` (used: ${usage}MB)` : ''
  return new MemoryError(`Memory limit of ${limit}MB exceeded${usageMsg}`, { limit, usage })
}

/**
 * Create a sandbox error for network violations
 */
export function createNetworkBlockedError(url: string): SandboxError {
  return new SandboxError(`Network access blocked: ${url}`, {
    violationType: 'network',
    blockedResource: url,
  })
}

/**
 * Create a parse error with location info
 */
export function createParseError(
  message: string,
  line?: number,
  column?: number,
  source?: string
): ParseError {
  const locationMsg = line ? ` at line ${line}${column ? `:${column}` : ''}` : ''
  const fullMessage = `${message}${locationMsg}`
  return new ParseError(fullMessage, { line, column, source })
}

/**
 * Create a missing export error
 */
export function createMissingExportError(
  exportName: string,
  availableExports: string[] = []
): MissingExportError {
  const availableMsg =
    availableExports.length > 0 ? `. Available exports: ${availableExports.join(', ')}` : ''
  return new MissingExportError(`Export '${exportName}' not found${availableMsg}`, {
    exportName,
    availableExports,
  })
}

/**
 * Create a validation error for invalid content type
 */
export function createValidationError(
  field: string,
  expected: string,
  received: string
): ValidationError {
  return new ValidationError(`Invalid ${field}: expected ${expected}, received ${received}`, {
    field,
    expected,
    received,
  })
}

// ============================================================================
// Error Wrapping Utilities
// ============================================================================

/**
 * Wrap an unknown error into a WorkersError type
 */
export function wrapError(error: unknown): WorkersError {
  if (error instanceof WorkersError) {
    return error
  }

  if (error instanceof Error) {
    // Check for common error patterns and convert appropriately
    const message = error.message.toLowerCase()

    if (message.includes('timeout') || message.includes('timed out')) {
      return new TimeoutError(error.message)
    }

    if (message.includes('memory') || message.includes('heap') || message.includes('allocation')) {
      return new MemoryError(error.message)
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('blocked')
    ) {
      return new SandboxError(error.message, { violationType: 'network' })
    }

    if (
      message.includes('syntax') ||
      message.includes('parse') ||
      message.includes('unexpected token')
    ) {
      return new ParseError(error.message)
    }

    if (message.includes('export') || message.includes('not found') || message.includes('undefined')) {
      return new MissingExportError(error.message)
    }

    // Default to validation error for unknown errors
    return new ValidationError(error.message)
  }

  // For non-Error objects, create a generic validation error
  return new ValidationError(String(error))
}

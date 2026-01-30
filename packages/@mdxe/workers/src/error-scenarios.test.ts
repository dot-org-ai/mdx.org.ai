/**
 * @mdxe/workers Error Scenario Tests
 *
 * Tests for various error conditions that can occur during MDX evaluation
 * in Cloudflare Workers. Uses TDD approach.
 *
 * This file tests:
 * 1. Error type construction and properties
 * 2. Type guards for error identification
 * 3. Error serialization for API responses
 * 4. Error factory functions
 * 5. Error wrapping utilities
 */
import { describe, it, expect } from 'vitest'
import {
  TimeoutError,
  MemoryError,
  SandboxError,
  ParseError,
  MissingExportError,
  ValidationError,
  isTimeoutError,
  isMemoryError,
  isSandboxError,
  isParseError,
  isMissingExportError,
  isValidationError,
  isWorkersError,
  WorkersError,
  ErrorCode,
  createTimeoutError,
  createMemoryError,
  createNetworkBlockedError,
  createParseError,
  createMissingExportError,
  createValidationError,
  wrapError,
} from './errors.js'


// ============================================================================
// Error Type Tests
// ============================================================================

describe('Error Types', () => {
  describe('TimeoutError', () => {
    it('is an instance of Error', () => {
      const error = new TimeoutError('Operation timed out')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new TimeoutError('Operation timed out')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new TimeoutError('Operation timed out')
      expect(error.code).toBe(ErrorCode.TIMEOUT)
    })

    it('has correct name', () => {
      const error = new TimeoutError('Operation timed out')
      expect(error.name).toBe('TimeoutError')
    })

    it('preserves message', () => {
      const error = new TimeoutError('Custom timeout message')
      expect(error.message).toBe('Custom timeout message')
    })

    it('includes timeout duration when provided', () => {
      const error = new TimeoutError('Timed out', { timeout: 5000 })
      expect(error.timeout).toBe(5000)
    })

    it('is identified by type guard', () => {
      const error = new TimeoutError('Timed out')
      expect(isTimeoutError(error)).toBe(true)
      expect(isTimeoutError(new Error('Generic error'))).toBe(false)
    })
  })

  describe('MemoryError', () => {
    it('is an instance of Error', () => {
      const error = new MemoryError('Memory limit exceeded')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new MemoryError('Memory limit exceeded')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new MemoryError('Memory limit exceeded')
      expect(error.code).toBe(ErrorCode.MEMORY_EXCEEDED)
    })

    it('has correct name', () => {
      const error = new MemoryError('Memory limit exceeded')
      expect(error.name).toBe('MemoryError')
    })

    it('includes memory limit when provided', () => {
      const error = new MemoryError('Exceeded limit', { limit: 128 })
      expect(error.limit).toBe(128)
    })

    it('is identified by type guard', () => {
      const error = new MemoryError('Memory error')
      expect(isMemoryError(error)).toBe(true)
      expect(isMemoryError(new Error('Generic error'))).toBe(false)
    })
  })

  describe('SandboxError', () => {
    it('is an instance of Error', () => {
      const error = new SandboxError('Sandbox violation')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new SandboxError('Sandbox violation')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new SandboxError('Sandbox violation')
      expect(error.code).toBe(ErrorCode.SANDBOX_VIOLATION)
    })

    it('has correct name', () => {
      const error = new SandboxError('Sandbox violation')
      expect(error.name).toBe('SandboxError')
    })

    it('includes violation type when provided', () => {
      const error = new SandboxError('Network blocked', { violationType: 'network' })
      expect(error.violationType).toBe('network')
    })

    it('includes blocked resource when provided', () => {
      const error = new SandboxError('Network blocked', {
        violationType: 'network',
        blockedResource: 'https://example.com',
      })
      expect(error.blockedResource).toBe('https://example.com')
    })

    it('is identified by type guard', () => {
      const error = new SandboxError('Sandbox violation')
      expect(isSandboxError(error)).toBe(true)
      expect(isSandboxError(new Error('Generic error'))).toBe(false)
    })
  })

  describe('ParseError', () => {
    it('is an instance of Error', () => {
      const error = new ParseError('Invalid syntax')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new ParseError('Invalid syntax')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new ParseError('Invalid syntax')
      expect(error.code).toBe(ErrorCode.PARSE_ERROR)
    })

    it('has correct name', () => {
      const error = new ParseError('Invalid syntax')
      expect(error.name).toBe('ParseError')
    })

    it('includes source location when provided', () => {
      const error = new ParseError('Unexpected token', {
        line: 10,
        column: 5,
        source: 'test.mdx',
      })
      expect(error.line).toBe(10)
      expect(error.column).toBe(5)
      expect(error.source).toBe('test.mdx')
    })

    it('is identified by type guard', () => {
      const error = new ParseError('Parse error')
      expect(isParseError(error)).toBe(true)
      expect(isParseError(new Error('Generic error'))).toBe(false)
    })
  })

  describe('MissingExportError', () => {
    it('is an instance of Error', () => {
      const error = new MissingExportError('Export not found')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new MissingExportError('Export not found')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new MissingExportError('Export not found')
      expect(error.code).toBe(ErrorCode.MISSING_EXPORT)
    })

    it('has correct name', () => {
      const error = new MissingExportError('Export not found')
      expect(error.name).toBe('MissingExportError')
    })

    it('includes export name when provided', () => {
      const error = new MissingExportError('Export not found', { exportName: 'greet' })
      expect(error.exportName).toBe('greet')
    })

    it('includes available exports when provided', () => {
      const error = new MissingExportError('Export not found', {
        exportName: 'greet',
        availableExports: ['hello', 'goodbye'],
      })
      expect(error.availableExports).toEqual(['hello', 'goodbye'])
    })

    it('is identified by type guard', () => {
      const error = new MissingExportError('Missing export')
      expect(isMissingExportError(error)).toBe(true)
      expect(isMissingExportError(new Error('Generic error'))).toBe(false)
    })
  })

  describe('ValidationError', () => {
    it('is an instance of Error', () => {
      const error = new ValidationError('Invalid input')
      expect(error).toBeInstanceOf(Error)
    })

    it('is an instance of WorkersError', () => {
      const error = new ValidationError('Invalid input')
      expect(error).toBeInstanceOf(WorkersError)
    })

    it('has correct error code', () => {
      const error = new ValidationError('Invalid input')
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR)
    })

    it('has correct name', () => {
      const error = new ValidationError('Invalid input')
      expect(error.name).toBe('ValidationError')
    })

    it('includes field name when provided', () => {
      const error = new ValidationError('Invalid input', { field: 'content' })
      expect(error.field).toBe('content')
    })

    it('includes expected and received values when provided', () => {
      const error = new ValidationError('Type mismatch', {
        field: 'content',
        expected: 'string',
        received: 'undefined',
      })
      expect(error.expected).toBe('string')
      expect(error.received).toBe('undefined')
    })

    it('is identified by type guard', () => {
      const error = new ValidationError('Validation error')
      expect(isValidationError(error)).toBe(true)
      expect(isValidationError(new Error('Generic error'))).toBe(false)
    })
  })
})

// ============================================================================
// Error Code Constants Tests
// ============================================================================

describe('ErrorCode constants', () => {
  it('has unique error codes', () => {
    const codes = Object.values(ErrorCode)
    const uniqueCodes = new Set(codes)
    expect(uniqueCodes.size).toBe(codes.length)
  })

  it('has expected error codes', () => {
    expect(ErrorCode.TIMEOUT).toBe('ERR_TIMEOUT')
    expect(ErrorCode.MEMORY_EXCEEDED).toBe('ERR_MEMORY_EXCEEDED')
    expect(ErrorCode.SANDBOX_VIOLATION).toBe('ERR_SANDBOX_VIOLATION')
    expect(ErrorCode.PARSE_ERROR).toBe('ERR_PARSE_ERROR')
    expect(ErrorCode.MISSING_EXPORT).toBe('ERR_MISSING_EXPORT')
    expect(ErrorCode.VALIDATION_ERROR).toBe('ERR_VALIDATION_ERROR')
  })
})

// ============================================================================
// Error Factory Function Tests
// ============================================================================

describe('Error Factory Functions', () => {
  describe('createTimeoutError', () => {
    it('creates TimeoutError with formatted message', () => {
      const error = createTimeoutError(5000)

      expect(error).toBeInstanceOf(TimeoutError)
      expect(error.message).toBe('Execution timed out after 5000ms')
      expect(error.timeout).toBe(5000)
    })

    it('includes error code', () => {
      const error = createTimeoutError(1000)
      expect(error.code).toBe(ErrorCode.TIMEOUT)
    })
  })

  describe('createMemoryError', () => {
    it('creates MemoryError with limit only', () => {
      const error = createMemoryError(128)

      expect(error).toBeInstanceOf(MemoryError)
      expect(error.message).toBe('Memory limit of 128MB exceeded')
      expect(error.limit).toBe(128)
      expect(error.usage).toBeUndefined()
    })

    it('creates MemoryError with limit and usage', () => {
      const error = createMemoryError(128, 256)

      expect(error.message).toBe('Memory limit of 128MB exceeded (used: 256MB)')
      expect(error.limit).toBe(128)
      expect(error.usage).toBe(256)
    })
  })

  describe('createNetworkBlockedError', () => {
    it('creates SandboxError for network violation', () => {
      const error = createNetworkBlockedError('https://example.com/api')

      expect(error).toBeInstanceOf(SandboxError)
      expect(error.message).toBe('Network access blocked: https://example.com/api')
      expect(error.violationType).toBe('network')
      expect(error.blockedResource).toBe('https://example.com/api')
    })
  })

  describe('createParseError', () => {
    it('creates ParseError with message only', () => {
      const error = createParseError('Unexpected token')

      expect(error).toBeInstanceOf(ParseError)
      expect(error.message).toBe('Unexpected token')
    })

    it('creates ParseError with line number', () => {
      const error = createParseError('Unexpected token', 10)

      expect(error.message).toBe('Unexpected token at line 10')
      expect(error.line).toBe(10)
    })

    it('creates ParseError with line and column', () => {
      const error = createParseError('Unexpected token', 10, 5)

      expect(error.message).toBe('Unexpected token at line 10:5')
      expect(error.line).toBe(10)
      expect(error.column).toBe(5)
    })

    it('creates ParseError with source file', () => {
      const error = createParseError('Unexpected token', 10, 5, 'test.mdx')

      expect(error.source).toBe('test.mdx')
    })
  })

  describe('createMissingExportError', () => {
    it('creates MissingExportError without available exports', () => {
      const error = createMissingExportError('greet')

      expect(error).toBeInstanceOf(MissingExportError)
      expect(error.message).toBe("Export 'greet' not found")
      expect(error.exportName).toBe('greet')
      expect(error.availableExports).toEqual([])
    })

    it('creates MissingExportError with available exports', () => {
      const error = createMissingExportError('greet', ['hello', 'goodbye'])

      expect(error.message).toBe("Export 'greet' not found. Available exports: hello, goodbye")
      expect(error.availableExports).toEqual(['hello', 'goodbye'])
    })
  })

  describe('createValidationError', () => {
    it('creates ValidationError with field info', () => {
      const error = createValidationError('content', 'string', 'number')

      expect(error).toBeInstanceOf(ValidationError)
      expect(error.message).toBe('Invalid content: expected string, received number')
      expect(error.field).toBe('content')
      expect(error.expected).toBe('string')
      expect(error.received).toBe('number')
    })
  })
})

// ============================================================================
// Error Wrapping Utilities Tests
// ============================================================================

describe('wrapError', () => {
  it('returns WorkersError unchanged', () => {
    const original = new TimeoutError('Timed out')
    const wrapped = wrapError(original)

    expect(wrapped).toBe(original)
  })

  it('converts timeout-related error messages', () => {
    const error = new Error('Operation timed out after 5s')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(TimeoutError)
  })

  it('converts memory-related error messages', () => {
    const error = new Error('Out of memory: heap allocation failed')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(MemoryError)
  })

  it('converts network-related error messages', () => {
    const error = new Error('Network request blocked')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(SandboxError)
    expect((wrapped as SandboxError).violationType).toBe('network')
  })

  it('converts fetch-related error messages', () => {
    const error = new Error('fetch failed')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(SandboxError)
  })

  it('converts syntax-related error messages', () => {
    const error = new Error('Syntax error: unexpected token')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(ParseError)
  })

  it('converts export-related error messages', () => {
    const error = new Error('Export not found')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(MissingExportError)
  })

  it('defaults to ValidationError for unknown errors', () => {
    const error = new Error('Something went wrong')
    const wrapped = wrapError(error)

    expect(wrapped).toBeInstanceOf(ValidationError)
  })

  it('handles non-Error objects', () => {
    const wrapped = wrapError('string error')

    expect(wrapped).toBeInstanceOf(ValidationError)
    expect(wrapped.message).toBe('string error')
  })

  it('handles numbers', () => {
    const wrapped = wrapError(404)

    expect(wrapped).toBeInstanceOf(ValidationError)
    expect(wrapped.message).toBe('404')
  })

  it('handles null', () => {
    const wrapped = wrapError(null)

    expect(wrapped).toBeInstanceOf(ValidationError)
  })

  it('handles undefined', () => {
    const wrapped = wrapError(undefined)

    expect(wrapped).toBeInstanceOf(ValidationError)
  })
})

// ============================================================================
// isWorkersError Type Guard Tests
// ============================================================================

describe('isWorkersError', () => {
  it('returns true for all WorkersError subclasses', () => {
    expect(isWorkersError(new TimeoutError('test'))).toBe(true)
    expect(isWorkersError(new MemoryError('test'))).toBe(true)
    expect(isWorkersError(new SandboxError('test'))).toBe(true)
    expect(isWorkersError(new ParseError('test'))).toBe(true)
    expect(isWorkersError(new MissingExportError('test'))).toBe(true)
    expect(isWorkersError(new ValidationError('test'))).toBe(true)
  })

  it('returns false for regular Error', () => {
    expect(isWorkersError(new Error('test'))).toBe(false)
  })

  it('returns false for null and undefined', () => {
    expect(isWorkersError(null)).toBe(false)
    expect(isWorkersError(undefined)).toBe(false)
  })
})

// ============================================================================
// Error Serialization Tests
// ============================================================================

describe('Error Serialization', () => {
  it('TimeoutError serializes to JSON correctly', () => {
    const error = new TimeoutError('Timed out', { timeout: 5000 })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('TimeoutError')
    expect(json.code).toBe(ErrorCode.TIMEOUT)
    expect(json.message).toBe('Timed out')
    expect(json.timeout).toBe(5000)
  })

  it('MemoryError serializes to JSON correctly', () => {
    const error = new MemoryError('Memory exceeded', { limit: 128 })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('MemoryError')
    expect(json.code).toBe(ErrorCode.MEMORY_EXCEEDED)
    expect(json.limit).toBe(128)
  })

  it('SandboxError serializes to JSON correctly', () => {
    const error = new SandboxError('Network blocked', {
      violationType: 'network',
      blockedResource: 'https://example.com',
    })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('SandboxError')
    expect(json.code).toBe(ErrorCode.SANDBOX_VIOLATION)
    expect(json.violationType).toBe('network')
    expect(json.blockedResource).toBe('https://example.com')
  })

  it('ParseError serializes to JSON correctly', () => {
    const error = new ParseError('Syntax error', { line: 10, column: 5 })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('ParseError')
    expect(json.code).toBe(ErrorCode.PARSE_ERROR)
    expect(json.line).toBe(10)
    expect(json.column).toBe(5)
  })

  it('MissingExportError serializes to JSON correctly', () => {
    const error = new MissingExportError('Export not found', {
      exportName: 'greet',
      availableExports: ['hello'],
    })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('MissingExportError')
    expect(json.code).toBe(ErrorCode.MISSING_EXPORT)
    expect(json.exportName).toBe('greet')
    expect(json.availableExports).toEqual(['hello'])
  })

  it('ValidationError serializes to JSON correctly', () => {
    const error = new ValidationError('Invalid type', {
      field: 'content',
      expected: 'string',
      received: 'number',
    })
    const json = JSON.parse(JSON.stringify(error))

    expect(json.name).toBe('ValidationError')
    expect(json.code).toBe(ErrorCode.VALIDATION_ERROR)
    expect(json.field).toBe('content')
    expect(json.expected).toBe('string')
    expect(json.received).toBe('number')
  })
})

// ============================================================================
// Type Guard Edge Cases
// ============================================================================

describe('Type Guard Edge Cases', () => {
  it('type guards return false for null', () => {
    expect(isTimeoutError(null)).toBe(false)
    expect(isMemoryError(null)).toBe(false)
    expect(isSandboxError(null)).toBe(false)
    expect(isParseError(null)).toBe(false)
    expect(isMissingExportError(null)).toBe(false)
    expect(isValidationError(null)).toBe(false)
  })

  it('type guards return false for undefined', () => {
    expect(isTimeoutError(undefined)).toBe(false)
    expect(isMemoryError(undefined)).toBe(false)
    expect(isSandboxError(undefined)).toBe(false)
    expect(isParseError(undefined)).toBe(false)
    expect(isMissingExportError(undefined)).toBe(false)
    expect(isValidationError(undefined)).toBe(false)
  })

  it('type guards return false for plain objects', () => {
    const fakeError = { name: 'TimeoutError', code: 'ERR_TIMEOUT' }
    expect(isTimeoutError(fakeError)).toBe(false)
  })

  it('type guards return false for other error types', () => {
    const timeoutError = new TimeoutError('Timeout')
    expect(isMemoryError(timeoutError)).toBe(false)
    expect(isSandboxError(timeoutError)).toBe(false)
    expect(isParseError(timeoutError)).toBe(false)
  })
})

// ============================================================================
// WorkersError Base Class Tests
// ============================================================================

describe('WorkersError Base Class', () => {
  it('all error types extend WorkersError', () => {
    expect(new TimeoutError('test')).toBeInstanceOf(WorkersError)
    expect(new MemoryError('test')).toBeInstanceOf(WorkersError)
    expect(new SandboxError('test')).toBeInstanceOf(WorkersError)
    expect(new ParseError('test')).toBeInstanceOf(WorkersError)
    expect(new MissingExportError('test')).toBeInstanceOf(WorkersError)
    expect(new ValidationError('test')).toBeInstanceOf(WorkersError)
  })

  it('WorkersError has code property', () => {
    const error = new TimeoutError('test')
    expect(error.code).toBeDefined()
  })

  it('WorkersError stack trace is captured', () => {
    const error = new TimeoutError('test')
    expect(error.stack).toBeDefined()
    expect(error.stack).toContain('TimeoutError')
  })
})

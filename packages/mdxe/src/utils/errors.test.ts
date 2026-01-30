/**
 * Tests for error sanitization utilities
 *
 * These tests ensure that:
 * 1. Stack traces are NOT exposed in production error responses
 * 2. Error messages are sanitized (no internal paths)
 * 3. Debug mode DOES include stack traces when enabled
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  isDevelopment,
  sanitizeError,
  createErrorResponse,
  type ErrorResponse,
} from './errors.js'

describe('error utilities', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    // Reset environment between tests
    vi.resetModules()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  // ============================================================================
  // isDevelopment
  // ============================================================================

  describe('isDevelopment', () => {
    it('returns true when NODE_ENV is development', () => {
      process.env.NODE_ENV = 'development'
      expect(isDevelopment()).toBe(true)
    })

    it('returns true when NODE_ENV is undefined', () => {
      delete process.env.NODE_ENV
      expect(isDevelopment()).toBe(true)
    })

    it('returns false when NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production'
      expect(isDevelopment()).toBe(false)
    })

    it('returns false when NODE_ENV is test', () => {
      process.env.NODE_ENV = 'test'
      // In test mode, we should NOT expose stack traces by default
      // Tests can opt-in to debug mode explicitly
      expect(isDevelopment()).toBe(false)
    })
  })

  // ============================================================================
  // sanitizeError
  // ============================================================================

  describe('sanitizeError', () => {
    const errorWithStack = new Error('Test error')
    errorWithStack.stack = 'Error: Test error\n    at /Users/developer/projects/app/src/index.ts:42:10'

    it('removes stack trace in production', () => {
      const sanitized = sanitizeError(errorWithStack, { debug: false })

      expect(sanitized.message).toBe('Test error')
      expect(sanitized.stack).toBeUndefined()
    })

    it('includes stack trace in debug mode', () => {
      const sanitized = sanitizeError(errorWithStack, { debug: true })

      expect(sanitized.message).toBe('Test error')
      expect(sanitized.stack).toBeDefined()
      expect(sanitized.stack).toContain('at /Users/developer')
    })

    it('sanitizes internal paths from error message', () => {
      const errorWithPath = new Error('Failed to read /Users/developer/projects/app/config.json')
      const sanitized = sanitizeError(errorWithPath, { debug: false })

      expect(sanitized.message).not.toContain('/Users/')
      expect(sanitized.message).toContain('Failed to read')
    })

    it('preserves error message structure when sanitizing paths', () => {
      const errorWithPath = new Error('ENOENT: no such file or directory, open \'/Users/dev/app/file.txt\'')
      const sanitized = sanitizeError(errorWithPath, { debug: false })

      expect(sanitized.message).not.toContain('/Users/')
      expect(sanitized.message).toContain('ENOENT')
    })

    it('handles non-Error objects', () => {
      const stringError = 'Simple string error'
      const sanitized = sanitizeError(stringError as unknown as Error, { debug: false })

      expect(sanitized.message).toBe('Simple string error')
      expect(sanitized.stack).toBeUndefined()
    })

    it('handles null and undefined', () => {
      const nullSanitized = sanitizeError(null as unknown as Error, { debug: false })
      const undefinedSanitized = sanitizeError(undefined as unknown as Error, { debug: false })

      expect(nullSanitized.message).toBe('Unknown error')
      expect(undefinedSanitized.message).toBe('Unknown error')
    })

    it('preserves error name when available', () => {
      const typeError = new TypeError('Invalid argument')
      const sanitized = sanitizeError(typeError, { debug: false })

      expect(sanitized.name).toBe('TypeError')
    })

    it('does not sanitize paths in debug mode', () => {
      const errorWithPath = new Error('Failed at /Users/developer/projects/app/index.ts')
      const sanitized = sanitizeError(errorWithPath, { debug: true })

      expect(sanitized.message).toContain('/Users/developer')
    })
  })

  // ============================================================================
  // createErrorResponse
  // ============================================================================

  describe('createErrorResponse', () => {
    const testError = new Error('Something went wrong')
    testError.stack = 'Error: Something went wrong\n    at Object.<anonymous> (/app/src/handler.ts:15:11)'

    it('returns sanitized response in production', () => {
      process.env.NODE_ENV = 'production'
      const response = createErrorResponse(testError)

      expect(response.error).toBe('Something went wrong')
      expect(response.stack).toBeUndefined()
    })

    it('includes stack trace in development', () => {
      process.env.NODE_ENV = 'development'
      const response = createErrorResponse(testError)

      expect(response.error).toBe('Something went wrong')
      expect(response.stack).toBeDefined()
    })

    it('respects explicit debug option over NODE_ENV', () => {
      process.env.NODE_ENV = 'production'
      const response = createErrorResponse(testError, { debug: true })

      expect(response.stack).toBeDefined()
    })

    it('can suppress stack even in development', () => {
      process.env.NODE_ENV = 'development'
      const response = createErrorResponse(testError, { debug: false })

      expect(response.stack).toBeUndefined()
    })

    it('includes error code when provided', () => {
      const errorWithCode = Object.assign(new Error('Not found'), { code: 'NOT_FOUND' })
      const response = createErrorResponse(errorWithCode)

      expect(response.code).toBe('NOT_FOUND')
    })

    it('returns valid ErrorResponse type', () => {
      const response = createErrorResponse(testError)

      // Type check - error is required
      expect(typeof response.error).toBe('string')
      // stack should be string or undefined
      expect(response.stack === undefined || typeof response.stack === 'string').toBe(true)
    })

    it('sanitizes internal paths from error in production', () => {
      process.env.NODE_ENV = 'production'
      const pathError = new Error('Module not found: /home/user/app/node_modules/secret/index.js')
      const response = createErrorResponse(pathError)

      expect(response.error).not.toContain('/home/user')
      expect(response.error).not.toContain('node_modules')
    })

    it('handles generic Error with only message', () => {
      const simpleError = new Error('Generic error')
      const response = createErrorResponse(simpleError, { debug: false })

      expect(response).toEqual({
        error: 'Generic error',
      })
    })
  })

  // ============================================================================
  // ErrorResponse type
  // ============================================================================

  describe('ErrorResponse type', () => {
    it('allows minimal response with just error', () => {
      const minimal: ErrorResponse = { error: 'Test' }
      expect(minimal.error).toBe('Test')
    })

    it('allows response with optional stack', () => {
      const withStack: ErrorResponse = {
        error: 'Test',
        stack: 'Error: Test\n    at ...',
      }
      expect(withStack.stack).toBeDefined()
    })

    it('allows response with optional code', () => {
      const withCode: ErrorResponse = {
        error: 'Test',
        code: 'TEST_ERROR',
      }
      expect(withCode.code).toBe('TEST_ERROR')
    })

    it('allows full response with all fields', () => {
      const full: ErrorResponse = {
        error: 'Test error message',
        stack: 'Error: Test\n    at ...',
        code: 'TEST_ERROR',
        name: 'TestError',
      }
      expect(full.name).toBe('TestError')
    })
  })

  // ============================================================================
  // Integration: createHandler error responses
  // ============================================================================

  describe('integration with createHandler pattern', () => {
    it('produces safe error JSON for HTTP responses', () => {
      process.env.NODE_ENV = 'production'

      // Simulate what createHandler would do
      const error = new Error('Database connection failed')
      error.stack = 'Error: Database connection failed\n    at /app/db.ts:42:10\n    at /app/node_modules/pg/index.js:100:5'

      const response = createErrorResponse(error)
      const json = JSON.stringify(response)

      // Parse back to verify it's valid JSON
      const parsed = JSON.parse(json)

      expect(parsed.error).toBe('Database connection failed')
      expect(parsed.stack).toBeUndefined()
      expect(json).not.toContain('/app/')
      expect(json).not.toContain('node_modules')
    })

    it('matches existing error response format', () => {
      // Existing format in @mdxe/workers:
      // { error: err.message, stack: err.stack }
      const error = new Error('Test')
      error.stack = 'stack trace'

      const devResponse = createErrorResponse(error, { debug: true })
      const prodResponse = createErrorResponse(error, { debug: false })

      // Should match expected shape
      expect(devResponse).toHaveProperty('error')
      expect(devResponse).toHaveProperty('stack')
      expect(prodResponse).toHaveProperty('error')
      expect(prodResponse.stack).toBeUndefined()
    })
  })
})

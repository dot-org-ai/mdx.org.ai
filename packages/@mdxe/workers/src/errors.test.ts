/**
 * Tests for Workers-compatible error sanitization utilities
 */

import { describe, it, expect } from 'vitest'
import { createErrorResponse, type ErrorResponse } from './errors.js'

describe('createErrorResponse (Workers)', () => {
  const testError = new Error('Something went wrong')
  testError.stack = 'Error: Something went wrong\n    at Object.<anonymous> (/app/src/handler.ts:15:11)'

  it('returns sanitized response by default (production mode)', () => {
    const response = createErrorResponse(testError)

    expect(response.error).toBe('Something went wrong')
    expect(response.stack).toBeUndefined()
  })

  it('includes stack trace when debug is true', () => {
    const response = createErrorResponse(testError, { debug: true })

    expect(response.error).toBe('Something went wrong')
    expect(response.stack).toBeDefined()
    expect(response.stack).toContain('handler.ts')
  })

  it('sanitizes internal paths from error message', () => {
    const pathError = new Error('Module not found: /home/user/app/node_modules/secret/index.js')
    const response = createErrorResponse(pathError)

    expect(response.error).not.toContain('/home/user')
    expect(response.error).not.toContain('node_modules')
    expect(response.error).toContain('[path]')
  })

  it('does not sanitize paths in debug mode', () => {
    const pathError = new Error('Failed at /Users/developer/projects/app/index.ts')
    const response = createErrorResponse(pathError, { debug: true })

    expect(response.error).toContain('/Users/developer')
  })

  it('handles null error', () => {
    const response = createErrorResponse(null)

    expect(response.error).toBe('Unknown error')
  })

  it('handles undefined error', () => {
    const response = createErrorResponse(undefined)

    expect(response.error).toBe('Unknown error')
  })

  it('handles string errors', () => {
    const response = createErrorResponse('Simple string error')

    expect(response.error).toBe('Simple string error')
    expect(response.stack).toBeUndefined()
  })

  it('includes error code when available', () => {
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

  it('produces safe error JSON for HTTP responses', () => {
    const error = new Error('Database connection failed')
    error.stack = 'Error: Database connection failed\n    at /app/db.ts:42:10\n    at /app/node_modules/pg/index.js:100:5'

    const response = createErrorResponse(error)
    const json = JSON.stringify(response)

    // Parse back to verify it's valid JSON
    const parsed = JSON.parse(json) as ErrorResponse

    expect(parsed.error).toBe('Database connection failed')
    expect(parsed.stack).toBeUndefined()
    expect(json).not.toContain('/app/')
    expect(json).not.toContain('node_modules')
  })

  it('sanitizes Windows-style paths', () => {
    const windowsError = new Error('Cannot read C:\\Users\\developer\\project\\config.json')
    const response = createErrorResponse(windowsError)

    expect(response.error).not.toContain('C:\\Users')
    expect(response.error).toContain('[path]')
  })

  it('works with env.DEBUG pattern', () => {
    // Simulate how this would be used with Workers env bindings
    const env = { DEBUG: 'true' }

    const response = createErrorResponse(testError, { debug: env.DEBUG === 'true' })

    expect(response.stack).toBeDefined()
  })
})

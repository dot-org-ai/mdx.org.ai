/**
 * Type tests for discriminated union result types
 *
 * These tests verify that ExecutionResult, DeployResult, and DoResult
 * are properly discriminated unions that enable type narrowing.
 */

import { describe, it, expect, expectTypeOf } from 'vitest'
import type { ExecutionResult, DeployResult, DoResult } from '../src/types.js'
import {
  isSuccess,
  isError,
  isExecutionSuccess,
  isExecutionError,
  isDoSuccess,
  isDoError,
  isDeploySuccess,
  isDeployError,
} from '../src/types.js'

/**
 * Type-level tests using expectTypeOf
 * These verify the type system behavior without runtime assertions
 */
describe('Result Type Discrimination', () => {
  describe('ExecutionResult', () => {
    it('should narrow to success type when success is true', () => {
      const result: ExecutionResult = { success: true, output: 'test' }

      if (result.success) {
        // In the success branch, output should be accessible
        expectTypeOf(result.output).toEqualTypeOf<unknown>()

        // error should NOT be accessible in the success branch
        // @ts-expect-error error does not exist on success type
        const _error: string = result.error
      }
    })

    it('should narrow to error type when success is false', () => {
      const result: ExecutionResult = { success: false, error: 'test error' }

      if (!result.success) {
        // In the error branch, error should be accessible and required
        expectTypeOf(result.error).toEqualTypeOf<string>()

        // output should NOT be accessible in the error branch
        // @ts-expect-error output does not exist on error type
        const _output: unknown = result.output
      }
    })

    it('should allow optional fields on success', () => {
      // Success with all optional fields
      const fullSuccess: ExecutionResult = {
        success: true,
        output: { data: 'test' },
        duration: 100,
        logs: ['log1', 'log2'],
      }

      // Success with minimal fields
      const minimalSuccess: ExecutionResult = {
        success: true,
      }

      expect(fullSuccess.success).toBe(true)
      expect(minimalSuccess.success).toBe(true)
    })

    it('should allow optional fields on error', () => {
      // Error with all optional fields
      const fullError: ExecutionResult = {
        success: false,
        error: 'test error',
        duration: 100,
        logs: ['log1', 'log2'],
      }

      // Error with minimal fields
      const minimalError: ExecutionResult = {
        success: false,
        error: 'test error',
      }

      expect(fullError.success).toBe(false)
      expect(minimalError.success).toBe(false)
    })
  })

  describe('DeployResult', () => {
    it('should narrow to success type when success is true', () => {
      const result: DeployResult = {
        success: true,
        url: 'https://example.com',
        deploymentId: 'dep-123',
      }

      if (result.success) {
        // In the success branch, url and deploymentId should be accessible
        expectTypeOf(result.url).toEqualTypeOf<string | undefined>()
        expectTypeOf(result.deploymentId).toEqualTypeOf<string | undefined>()

        // error should NOT be accessible in the success branch
        // @ts-expect-error error does not exist on success type
        const _error: string = result.error
      }
    })

    it('should narrow to error type when success is false', () => {
      const result: DeployResult = { success: false, error: 'deployment failed' }

      if (!result.success) {
        // In the error branch, error should be accessible and required
        expectTypeOf(result.error).toEqualTypeOf<string>()

        // url and deploymentId should NOT be accessible in the error branch
        // @ts-expect-error url does not exist on error type
        const _url: string = result.url
        // @ts-expect-error deploymentId does not exist on error type
        const _deploymentId: string = result.deploymentId
      }
    })

    it('should allow optional fields on success', () => {
      // Success with all optional fields
      const fullSuccess: DeployResult = {
        success: true,
        url: 'https://example.workers.dev',
        deploymentId: 'dep-123',
        logs: ['Building...', 'Deploying...', 'Done!'],
      }

      // Success with minimal fields
      const minimalSuccess: DeployResult = {
        success: true,
      }

      expect(fullSuccess.success).toBe(true)
      expect(minimalSuccess.success).toBe(true)
    })

    it('should allow optional fields on error', () => {
      // Error with all optional fields
      const fullError: DeployResult = {
        success: false,
        error: 'deployment failed',
        logs: ['Building...', 'Error: Build failed'],
      }

      // Error with minimal fields
      const minimalError: DeployResult = {
        success: false,
        error: 'deployment failed',
      }

      expect(fullError.success).toBe(false)
      expect(minimalError.success).toBe(false)
    })
  })

  describe('DoResult', () => {
    it('should narrow to success type when success is true', () => {
      const result: DoResult = {
        success: true,
        returnValue: { result: 'test' },
      }

      if (result.success) {
        // In the success branch, returnValue should be accessible
        expectTypeOf(result.returnValue).toEqualTypeOf<unknown>()
        expectTypeOf(result.output).toEqualTypeOf<unknown>()

        // error should NOT be accessible in the success branch
        // @ts-expect-error error does not exist on success type
        const _error: string = result.error
      }
    })

    it('should narrow to error type when success is false', () => {
      const result: DoResult = { success: false, error: 'action failed' }

      if (!result.success) {
        // In the error branch, error should be accessible and required
        expectTypeOf(result.error).toEqualTypeOf<string>()

        // returnValue should NOT be accessible in the error branch
        // @ts-expect-error returnValue does not exist on error type
        const _returnValue: unknown = result.returnValue
      }
    })

    it('should allow optional fields on success', () => {
      // Success with all optional fields
      const fullSuccess: DoResult = {
        success: true,
        output: { data: 'test' },
        returnValue: 42,
        duration: 100,
        logs: ['log1', 'log2'],
      }

      // Success with minimal fields
      const minimalSuccess: DoResult = {
        success: true,
      }

      expect(fullSuccess.success).toBe(true)
      expect(minimalSuccess.success).toBe(true)
    })

    it('should allow optional fields on error', () => {
      // Error with all optional fields
      const fullError: DoResult = {
        success: false,
        error: 'action failed',
        duration: 100,
        logs: ['log1', 'log2'],
      }

      // Error with minimal fields
      const minimalError: DoResult = {
        success: false,
        error: 'action failed',
      }

      expect(fullError.success).toBe(false)
      expect(minimalError.success).toBe(false)
    })
  })
})

/**
 * Runtime behavior tests
 * These verify that the types work correctly at runtime
 */
describe('Result Type Runtime Behavior', () => {
  describe('ExecutionResult type narrowing', () => {
    it('should safely access success-only properties after narrowing', () => {
      const successResult: ExecutionResult = {
        success: true,
        output: 'test output',
        duration: 100,
      }

      const errorResult: ExecutionResult = {
        success: false,
        error: 'test error',
        duration: 50,
      }

      // Helper function that demonstrates type narrowing
      function getOutput(result: ExecutionResult): unknown {
        if (result.success) {
          return result.output
        }
        return undefined
      }

      function getError(result: ExecutionResult): string | undefined {
        if (!result.success) {
          return result.error
        }
        return undefined
      }

      expect(getOutput(successResult)).toBe('test output')
      expect(getOutput(errorResult)).toBeUndefined()
      expect(getError(successResult)).toBeUndefined()
      expect(getError(errorResult)).toBe('test error')
    })
  })

  describe('DeployResult type narrowing', () => {
    it('should safely access success-only properties after narrowing', () => {
      const successResult: DeployResult = {
        success: true,
        url: 'https://example.workers.dev',
        deploymentId: 'dep-123',
      }

      const errorResult: DeployResult = {
        success: false,
        error: 'deployment failed',
      }

      // Helper function that demonstrates type narrowing
      function getUrl(result: DeployResult): string | undefined {
        if (result.success) {
          return result.url
        }
        return undefined
      }

      function getDeployError(result: DeployResult): string | undefined {
        if (!result.success) {
          return result.error
        }
        return undefined
      }

      expect(getUrl(successResult)).toBe('https://example.workers.dev')
      expect(getUrl(errorResult)).toBeUndefined()
      expect(getDeployError(successResult)).toBeUndefined()
      expect(getDeployError(errorResult)).toBe('deployment failed')
    })
  })

  describe('DoResult type narrowing', () => {
    it('should safely access success-only properties after narrowing', () => {
      const successResult: DoResult = {
        success: true,
        returnValue: { result: 42 },
        output: 'test',
      }

      const errorResult: DoResult = {
        success: false,
        error: 'action failed',
      }

      // Helper function that demonstrates type narrowing
      function getReturnValue(result: DoResult): unknown {
        if (result.success) {
          return result.returnValue
        }
        return undefined
      }

      function getDoError(result: DoResult): string | undefined {
        if (!result.success) {
          return result.error
        }
        return undefined
      }

      expect(getReturnValue(successResult)).toEqual({ result: 42 })
      expect(getReturnValue(errorResult)).toBeUndefined()
      expect(getDoError(successResult)).toBeUndefined()
      expect(getDoError(errorResult)).toBe('action failed')
    })
  })
})

/**
 * Type guard utility tests
 */
describe('Type Guard Utilities', () => {
  describe('isSuccess / isError', () => {
    it('should correctly identify success results', () => {
      const successResult: ExecutionResult = { success: true, output: 'test' }
      const errorResult: ExecutionResult = { success: false, error: 'test error' }

      expect(isSuccess(successResult)).toBe(true)
      expect(isSuccess(errorResult)).toBe(false)
      expect(isError(successResult)).toBe(false)
      expect(isError(errorResult)).toBe(true)
    })

    it('should enable type narrowing for generic results', () => {
      const result: ExecutionResult = { success: true, output: 'test' }

      if (isSuccess(result)) {
        // TypeScript should know result.output is available
        expectTypeOf(result.output).toEqualTypeOf<unknown>()
      }

      const errorResult: ExecutionResult = { success: false, error: 'test' }

      if (isError(errorResult)) {
        // TypeScript should know result.error is available
        expectTypeOf(errorResult.error).toEqualTypeOf<string>()
      }
    })
  })

  describe('isExecutionSuccess / isExecutionError', () => {
    it('should correctly identify ExecutionResult success', () => {
      const successResult: ExecutionResult = {
        success: true,
        output: 'test output',
        duration: 100,
      }

      const errorResult: ExecutionResult = {
        success: false,
        error: 'test error',
      }

      expect(isExecutionSuccess(successResult)).toBe(true)
      expect(isExecutionSuccess(errorResult)).toBe(false)
      expect(isExecutionError(successResult)).toBe(false)
      expect(isExecutionError(errorResult)).toBe(true)
    })

    it('should enable type narrowing for ExecutionResult', () => {
      const result: ExecutionResult = { success: true, output: 'test' }

      if (isExecutionSuccess(result)) {
        expect(result.output).toBe('test')
      }

      const errorResult: ExecutionResult = { success: false, error: 'test' }

      if (isExecutionError(errorResult)) {
        expect(errorResult.error).toBe('test')
      }
    })
  })

  describe('isDoSuccess / isDoError', () => {
    it('should correctly identify DoResult success', () => {
      const successResult: DoResult = {
        success: true,
        returnValue: 42,
      }

      const errorResult: DoResult = {
        success: false,
        error: 'action failed',
      }

      expect(isDoSuccess(successResult)).toBe(true)
      expect(isDoSuccess(errorResult)).toBe(false)
      expect(isDoError(successResult)).toBe(false)
      expect(isDoError(errorResult)).toBe(true)
    })

    it('should enable type narrowing for DoResult', () => {
      const result: DoResult = { success: true, returnValue: { result: 42 } }

      if (isDoSuccess(result)) {
        expect(result.returnValue).toEqual({ result: 42 })
      }

      const errorResult: DoResult = { success: false, error: 'test' }

      if (isDoError(errorResult)) {
        expect(errorResult.error).toBe('test')
      }
    })
  })

  describe('isDeploySuccess / isDeployError', () => {
    it('should correctly identify DeployResult success', () => {
      const successResult: DeployResult = {
        success: true,
        url: 'https://example.workers.dev',
        deploymentId: 'dep-123',
      }

      const errorResult: DeployResult = {
        success: false,
        error: 'deployment failed',
      }

      expect(isDeploySuccess(successResult)).toBe(true)
      expect(isDeploySuccess(errorResult)).toBe(false)
      expect(isDeployError(successResult)).toBe(false)
      expect(isDeployError(errorResult)).toBe(true)
    })

    it('should enable type narrowing for DeployResult', () => {
      const result: DeployResult = { success: true, url: 'https://example.com' }

      if (isDeploySuccess(result)) {
        expect(result.url).toBe('https://example.com')
      }

      const errorResult: DeployResult = { success: false, error: 'test' }

      if (isDeployError(errorResult)) {
        expect(errorResult.error).toBe('test')
      }
    })
  })
})

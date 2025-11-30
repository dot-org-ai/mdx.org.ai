import { describe, it, expect } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  getActiveInstanceCount,
  createEvaluator,
} from './index.js'

describe('@mdxe/node', () => {
  describe('re-exports from @mdxe/isolate', () => {
    it('exports compileToModule', () => {
      expect(typeof compileToModule).toBe('function')
    })

    it('exports createWorkerConfig', () => {
      expect(typeof createWorkerConfig).toBe('function')
    })

    it('exports generateModuleId', () => {
      expect(typeof generateModuleId).toBe('function')
    })
  })

  describe('instance management', () => {
    it('getActiveInstanceCount returns number', () => {
      expect(typeof getActiveInstanceCount()).toBe('number')
    })
  })

  describe('createEvaluator', () => {
    it('returns evaluator with expected interface', () => {
      const evaluator = createEvaluator()

      expect(typeof evaluator.evaluate).toBe('function')
      expect(typeof evaluator.dispose).toBe('function')
      expect(typeof evaluator.getInstanceCount).toBe('function')
    })

    it('evaluator starts with zero instances', () => {
      const evaluator = createEvaluator()

      expect(evaluator.getInstanceCount()).toBe(0)
    })
  })
})

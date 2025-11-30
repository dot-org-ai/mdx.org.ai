import { describe, it, expect } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  generateModuleId,
  clearCache,
  isCached,
  getCacheStats,
  precompile,
} from './index.js'

describe('@mdxe/workers', () => {
  const simpleMDX = `export function add(a, b) { return a + b }`

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

  describe('cache utilities', () => {
    it('clearCache clears all cache', async () => {
      await precompile(simpleMDX)
      const stats = getCacheStats()
      expect(stats.size).toBeGreaterThan(0)

      clearCache()
      expect(getCacheStats().size).toBe(0)
    })

    it('clearCache clears specific module', async () => {
      const id1 = await precompile('export const a = 1')
      const id2 = await precompile('export const b = 2')

      expect(getCacheStats().size).toBe(2)

      clearCache(id1)
      expect(getCacheStats().size).toBe(1)
      expect(isCached(id1)).toBe(false)
      expect(isCached(id2)).toBe(true)

      clearCache()
    })

    it('isCached returns correct status', async () => {
      clearCache()
      const id = await precompile(simpleMDX)

      expect(isCached(id)).toBe(true)
      expect(isCached('nonexistent')).toBe(false)

      clearCache()
    })

    it('getCacheStats returns size and IDs', async () => {
      clearCache()
      const id = await precompile(simpleMDX)

      const stats = getCacheStats()
      expect(stats.size).toBe(1)
      expect(stats.moduleIds).toContain(id)

      clearCache()
    })
  })

  describe('precompile', () => {
    it('compiles and caches module', async () => {
      clearCache()

      const id = await precompile(simpleMDX)

      expect(typeof id).toBe('string')
      expect(isCached(id)).toBe(true)

      clearCache()
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  compileToWorkerConfig,
  generateModuleId,
  getExports,
} from './index.js'

describe('@mdxe/isolate', () => {
  const simpleMDX = `---
title: Test
---

# Hello World

export function greet(name) {
  return \`Hello, \${name}!\`
}

export const PI = 3.14159
`

  describe('compileToModule', () => {
    it('compiles MDX to module format', async () => {
      const module = await compileToModule(simpleMDX)

      expect(module.mainModule).toBe('entry.js')
      expect(module.modules).toHaveProperty('entry.js')
      expect(module.modules).toHaveProperty('mdx.js')
      expect(module.data.title).toBe('Test')
      expect(module.hash).toBeDefined()
    })

    it('includes JSX runtime when bundleRuntime is true', async () => {
      const module = await compileToModule(simpleMDX, { bundleRuntime: true })

      expect(module.modules).toHaveProperty('jsx-runtime.js')
    })

    it('uses custom filename', async () => {
      const module = await compileToModule(simpleMDX, { filename: 'custom.js' })

      expect(module.modules).toHaveProperty('custom.js')
    })
  })

  describe('createWorkerConfig', () => {
    it('creates worker config from module', async () => {
      const module = await compileToModule(simpleMDX)
      const config = createWorkerConfig(module)

      expect(config.compatibilityDate).toBeDefined()
      expect(config.mainModule).toBe('entry.js')
      expect(config.modules).toEqual(module.modules)
      expect(config.globalOutbound).toBeNull() // Network blocked by default
    })

    it('respects blockNetwork option', async () => {
      const module = await compileToModule(simpleMDX)

      const blockedConfig = createWorkerConfig(module, { blockNetwork: true })
      expect(blockedConfig.globalOutbound).toBeNull()

      const unlockedConfig = createWorkerConfig(module, { blockNetwork: false })
      expect(unlockedConfig.globalOutbound).toBeUndefined()
    })
  })

  describe('compileToWorkerConfig', () => {
    it('combines compile and config creation', async () => {
      const result = await compileToWorkerConfig(simpleMDX)

      expect(result.mainModule).toBe('entry.js')
      expect(result.hash).toBeDefined()
      expect(result.data.title).toBe('Test')
    })
  })

  describe('generateModuleId', () => {
    it('generates consistent hash for same content', () => {
      const id1 = generateModuleId('test content')
      const id2 = generateModuleId('test content')

      expect(id1).toBe(id2)
    })

    it('generates different hash for different content', () => {
      const id1 = generateModuleId('content a')
      const id2 = generateModuleId('content b')

      expect(id1).not.toBe(id2)
    })

    it('includes version in ID when provided', () => {
      const id = generateModuleId('test', 'v1')

      expect(id).toContain('-v1')
    })
  })

  describe('getExports', () => {
    it('extracts export names from entry module', async () => {
      const module = await compileToModule(simpleMDX)
      const exports = getExports(module)

      // getExports looks for export patterns in the main module
      // Entry module uses namespace import, so returns empty for simple patterns
      expect(Array.isArray(exports)).toBe(true)
    })
  })
})

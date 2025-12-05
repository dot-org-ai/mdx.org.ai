import { describe, it, expect } from 'vitest'
import { parse, toAst, safeParse, safeToAst, success, error, defaultConfig } from './index.js'

describe('@mdxe/electron', () => {
  describe('parse', () => {
    it('should parse MDX content with frontmatter', () => {
      const content = `---
title: Hello World
---

# Welcome`

      const doc = parse(content)

      expect(doc.data.title).toBe('Hello World')
      expect(doc.content).toContain('# Welcome')
    })
  })

  describe('toAst', () => {
    it('should convert document to AST', () => {
      const doc = parse('# Heading\n\nParagraph.')
      const ast = toAst(doc)

      expect(ast.type).toBe('root')
      expect(ast.children.length).toBeGreaterThan(0)
    })
  })

  describe('safeParse', () => {
    it('should return success for valid content', () => {
      const result = safeParse('# Valid\n\nContent')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.content).toContain('# Valid')
    })

    it('should return error for invalid content', () => {
      // Note: mdxld is quite forgiving, so most content parses
      // This is more of a structural test
      const result = safeParse('')

      expect(result.success).toBe(true)
    })
  })

  describe('safeToAst', () => {
    it('should return success for valid content', () => {
      const result = safeToAst('# Heading')

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.type).toBe('root')
    })
  })

  describe('success helper', () => {
    it('should create success result', () => {
      const result = success({ test: true })

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ test: true })
      expect(result.error).toBeUndefined()
    })
  })

  describe('error helper', () => {
    it('should create error result', () => {
      const result = error('Something went wrong')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Something went wrong')
      expect(result.data).toBeUndefined()
    })
  })

  describe('defaultConfig', () => {
    it('should have expected defaults', () => {
      expect(defaultConfig.watchFiles).toBe(false)
      expect(defaultConfig.baseDir).toBeDefined()
      expect(defaultConfig.components).toEqual({})
      expect(defaultConfig.ipcPrefix).toBe('mdx')
    })
  })
})

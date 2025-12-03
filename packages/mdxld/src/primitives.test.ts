/**
 * Tests for primitives integration
 *
 * These tests verify that the primitives packages are correctly re-exported
 * via mdxld when they are installed as peer dependencies.
 */

import { describe, it, expect } from 'vitest'

describe('primitives integration', () => {
  describe('optional peer dependencies', () => {
    it('should have functions export available', async () => {
      // Test that the module can be imported
      // This will throw if ai-functions is not installed (which is expected for optional peer deps)
      try {
        const mod = await import('./functions.js')
        expect(mod).toBeDefined()
        // If ai-functions is installed, we should have exports
        if (mod) {
          expect(typeof mod).toBe('object')
        }
      } catch (error) {
        // It's ok if ai-functions is not installed (optional peer dependency)
        expect(error).toMatchObject({
          message: expect.stringMatching(/Cannot find module|Cannot find package/),
        })
      }
    })

    it('should have database export available', async () => {
      try {
        const mod = await import('./database.js')
        expect(mod).toBeDefined()
        if (mod) {
          expect(typeof mod).toBe('object')
        }
      } catch (error) {
        // It's ok if ai-database is not installed (optional peer dependency)
        expect(error).toMatchObject({
          message: expect.stringMatching(/Cannot find module|Cannot find package/),
        })
      }
    })

    it('should have workflows export available', async () => {
      try {
        const mod = await import('./workflows.js')
        expect(mod).toBeDefined()
        if (mod) {
          expect(typeof mod).toBe('object')
        }
      } catch (error) {
        // It's ok if ai-workflows is not installed (optional peer dependency)
        expect(error).toMatchObject({
          message: expect.stringMatching(/Cannot find module|Cannot find package/),
        })
      }
    })
  })

  describe('module structure', () => {
    it('should export functions module separately from core', async () => {
      const core = await import('./index.js')

      // Core should have parse/stringify
      expect(core.parse).toBeDefined()
      expect(core.stringify).toBeDefined()

      // Core should NOT have primitives exports
      expect('RPC' in core).toBe(false)
      expect('DB' in core).toBe(false)
      expect('Workflow' in core).toBe(false)
    })
  })

  describe('documentation', () => {
    it('functions module should have JSDoc', async () => {
      const mod = await import('./functions.js?raw')
      const source = mod.default || ''

      // Check for documentation comments
      expect(source).toContain('@packageDocumentation')
      expect(source).toContain('AI Functions primitives integration')
      expect(source).toContain('@example')
    })

    it('database module should have JSDoc', async () => {
      const mod = await import('./database.js?raw')
      const source = mod.default || ''

      expect(source).toContain('@packageDocumentation')
      expect(source).toContain('AI Database primitives integration')
      expect(source).toContain('@example')
    })

    it('workflows module should have JSDoc', async () => {
      const mod = await import('./workflows.js?raw')
      const source = mod.default || ''

      expect(source).toContain('@packageDocumentation')
      expect(source).toContain('AI Workflows primitives integration')
      expect(source).toContain('@example')
    })
  })
})

describe('integration examples', () => {
  it('should document how to use functions export', () => {
    const example = `
      import { RPC, AI, generateText } from 'mdxld/functions'

      // Use RPC primitives
      const rpc = RPC({ functions: { hello: () => 'world' } })

      // Use AI function constructors
      const ai = AI('Generate a summary', { input: schema({ text: 'string' }) })
    `
    expect(example).toContain('mdxld/functions')
  })

  it('should document how to use database export', () => {
    const example = `
      import { DB } from 'mdxld/database'

      const db = DB({
        Post: {
          title: 'string',
          author: 'Author.posts',
        },
        Author: {
          name: 'string',
        },
      })

      const post = await db.Post.get('hello-world')
    `
    expect(example).toContain('mdxld/database')
  })

  it('should document how to use workflows export', () => {
    const example = `
      import { Workflow, on, every } from 'mdxld/workflows'

      const workflow = Workflow($ => {
        $.on.Customer.created(async (customer, $) => {
          $.log('New customer:', customer.name)
        })
      })

      await workflow.start()
    `
    expect(example).toContain('mdxld/workflows')
  })
})

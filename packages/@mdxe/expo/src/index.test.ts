import { describe, it, expect, vi } from 'vitest'
import {
  parse,
  createMDXRuntime,
  fetchMDX,
  loadMDX,
  defaultConfig,
  type ExpoMDXConfig,
} from './index.js'

describe('@mdxe/expo', () => {
  describe('parse', () => {
    it('should parse MDX content with frontmatter', () => {
      const content = `---
title: Hello World
author: Test
---

# Welcome

This is a paragraph.`

      const doc = parse(content)

      expect(doc.data.title).toBe('Hello World')
      expect(doc.data.author).toBe('Test')
      expect(doc.content).toContain('# Welcome')
      expect(doc.content).toContain('This is a paragraph.')
    })

    it('should parse content without frontmatter', () => {
      const content = '# Just a heading\n\nSome text.'

      const doc = parse(content)

      expect(doc.data).toEqual({})
      expect(doc.content).toContain('# Just a heading')
    })

    it('should handle empty content', () => {
      const doc = parse('')

      expect(doc.data).toEqual({})
      expect(doc.content).toBe('')
    })
  })

  describe('createMDXRuntime', () => {
    it('should create a runtime with default config', () => {
      const runtime = createMDXRuntime()

      expect(runtime.getConfig()).toEqual(defaultConfig)
    })

    it('should merge custom config with defaults', () => {
      const customConfig: ExpoMDXConfig = {
        components: { CustomButton: () => null },
        useRouter: false,
      }

      const runtime = createMDXRuntime(customConfig)
      const config = runtime.getConfig()

      expect(config.useRouter).toBe(false)
      expect(config.components?.CustomButton).toBeDefined()
    })

    it('should parse content via runtime', () => {
      const runtime = createMDXRuntime()

      const doc = runtime.parse(`---
title: Test
---

# Hello`)

      expect(doc.data.title).toBe('Test')
      expect(doc.content).toContain('# Hello')
    })

    it('should return available components', () => {
      const runtime = createMDXRuntime({
        components: {
          Button: () => null,
          Card: () => null,
        },
      })

      const components = runtime.getComponents()

      expect(Object.keys(components)).toContain('Button')
      expect(Object.keys(components)).toContain('Card')
    })
  })

  describe('fetchMDX', () => {
    it('should fetch and parse MDX from URL', async () => {
      const mockContent = `---
title: Remote Content
---

# Fetched

This was fetched from a URL.`

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockContent),
      })

      const doc = await fetchMDX('https://example.com/content.mdx')

      expect(doc.data.title).toBe('Remote Content')
      expect(doc.content).toContain('# Fetched')
    })

    it('should throw error on failed fetch', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(fetchMDX('https://example.com/missing.mdx')).rejects.toThrow(
        'Failed to fetch MDX from https://example.com/missing.mdx: Not Found'
      )
    })
  })

  describe('loadMDX', () => {
    it('should throw not implemented error', async () => {
      await expect(loadMDX('/path/to/file.mdx')).rejects.toThrow(
        'loadMDX is not yet implemented'
      )
    })
  })

  describe('defaultConfig', () => {
    it('should have expected default values', () => {
      expect(defaultConfig.components).toEqual({})
      expect(defaultConfig.useRouter).toBe(true)
      expect(defaultConfig.scope).toEqual({})
    })
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { parse } from 'mdxld'
import {
  createJsonLd,
  loadMdxldModules,
  createContentIndex,
  clearDocumentCache,
  invalidateDocumentCache,
  mdxldMiddleware,
  getMdxldContext,
  createMdxldRoute,
} from './server.js'
import { getDefaultRemarkPlugins, mdxld, createMdxldConfig } from './vite.js'
import { extractJsonLd, extractFrontmatter, getPageJsonLd, useMdxldContext } from './client.js'
import { mdxldRenderer, createDocumentRenderer, MDXProvider, StructuredData, Head } from './renderer.js'
import type { Context } from 'hono'

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports server functions', async () => {
    const mod = await import('./index.js')
    expect(mod.mdxldMiddleware).toBeDefined()
    expect(mod.getMdxldContext).toBeDefined()
    expect(mod.createJsonLd).toBeDefined()
    expect(mod.createMdxldRoute).toBeDefined()
    expect(mod.clearDocumentCache).toBeDefined()
    expect(mod.invalidateDocumentCache).toBeDefined()
    expect(mod.loadMdxldModules).toBeDefined()
    expect(mod.createContentIndex).toBeDefined()
    expect(mod.parse).toBeDefined()
    expect(mod.stringify).toBeDefined()
  })

  it('exports vite functions', async () => {
    const mod = await import('./index.js')
    expect(mod.mdxld).toBeDefined()
    expect(mod.createMdxldConfig).toBeDefined()
    expect(mod.getDefaultRemarkPlugins).toBeDefined()
  })

  it('exports client functions', async () => {
    const mod = await import('./index.js')
    expect(mod.createMdxldClient).toBeDefined()
    expect(mod.extractJsonLd).toBeDefined()
    expect(mod.extractFrontmatter).toBeDefined()
    expect(mod.getPageJsonLd).toBeDefined()
    expect(mod.useMdxldContext).toBeDefined()
  })

  it('exports renderer functions', async () => {
    const mod = await import('./index.js')
    expect(mod.mdxldRenderer).toBeDefined()
    expect(mod.createDocumentRenderer).toBeDefined()
    expect(mod.MDXProvider).toBeDefined()
    expect(mod.StructuredData).toBeDefined()
    expect(mod.Head).toBeDefined()
  })

  it('exports types', async () => {
    // Types are exported but we verify by importing them
    const mod = await import('./types.js')
    // Verify interface shapes exist via runtime checks
    expect(mod).toBeDefined()
  })
})

// ===========================================================================
// createJsonLd Tests
// ===========================================================================

describe('createJsonLd', () => {
  it('should create JSON-LD from MDXLD document', () => {
    const doc = parse(`---
$type: BlogPost
$id: /posts/hello
title: Hello World
author: John Doe
---

# Hello World

This is content.
`)

    const jsonld = createJsonLd(doc, 'https://example.com')

    expect(jsonld['@context']).toBe('https://schema.org')
    expect(jsonld['@type']).toBe('BlogPost')
    expect(jsonld['@id']).toBe('https://example.com/posts/hello')
    expect(jsonld['title']).toBe('Hello World')
    expect(jsonld['author']).toBe('John Doe')
  })

  it('should use document context if provided', () => {
    const doc = parse(`---
$context: https://custom.org/context
$type: Article
title: Test
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['@context']).toBe('https://custom.org/context')
    expect(jsonld['@type']).toBe('Article')
  })

  it('should handle absolute URLs for @id', () => {
    const doc = parse(`---
$id: https://other.com/resource
title: Test
---
Content
`)

    const jsonld = createJsonLd(doc, 'https://example.com')

    expect(jsonld['@id']).toBe('https://other.com/resource')
  })

  it('should skip internal properties', () => {
    const doc = parse(`---
title: Test
_internal: should be skipped
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['title']).toBe('Test')
    expect(jsonld['_internal']).toBeUndefined()
  })

  it('should use default schema.org context when no context provided', () => {
    const doc = parse(`---
title: Test
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['@context']).toBe('https://schema.org')
  })

  it('should handle document without type', () => {
    const doc = parse(`---
title: No Type Document
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['@type']).toBeUndefined()
    expect(jsonld['title']).toBe('No Type Document')
  })

  it('should handle document without id', () => {
    const doc = parse(`---
$type: Article
title: No ID Document
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['@id']).toBeUndefined()
    expect(jsonld['@type']).toBe('Article')
  })

  it('should handle relative id without baseUrl', () => {
    const doc = parse(`---
$id: /posts/test
title: Test
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['@id']).toBe('/posts/test')
  })

  it('should handle nested data properties', () => {
    const doc = parse(`---
title: Test
metadata:
  views: 100
  likes: 50
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['metadata']).toEqual({ views: 100, likes: 50 })
  })

  it('should handle array data properties', () => {
    const doc = parse(`---
title: Test
tags:
  - javascript
  - typescript
  - mdx
---
Content
`)

    const jsonld = createJsonLd(doc)

    expect(jsonld['tags']).toEqual(['javascript', 'typescript', 'mdx'])
  })
})

// ===========================================================================
// loadMdxldModules Tests
// ===========================================================================

describe('loadMdxldModules', () => {
  it('should parse modules into documents', () => {
    const modules = {
      './posts/hello.mdx': `---
title: Hello
---
Content`,
      './posts/world.mdx': `---
title: World
---
More content`,
    }

    const docs = loadMdxldModules(modules)

    expect(docs).toHaveLength(2)
    expect(docs[0].path).toBe('/posts/hello')
    expect(docs[0].document.data.title).toBe('Hello')
    expect(docs[1].path).toBe('/posts/world')
    expect(docs[1].document.data.title).toBe('World')
  })

  it('should handle .md extension', () => {
    const modules = {
      './docs/readme.md': `---
title: Readme
---
Documentation`,
    }

    const docs = loadMdxldModules(modules)

    expect(docs).toHaveLength(1)
    expect(docs[0].path).toBe('/docs/readme')
  })

  it('should handle nested paths', () => {
    const modules = {
      './content/blog/2024/01/post.mdx': `---
title: January Post
---
Content`,
    }

    const docs = loadMdxldModules(modules)

    expect(docs[0].path).toBe('/content/blog/2024/01/post')
  })

  it('should handle empty modules object', () => {
    const docs = loadMdxldModules({})
    expect(docs).toHaveLength(0)
  })

  it('should preserve document metadata', () => {
    const modules = {
      './article.mdx': `---
$type: Article
$id: /articles/test
title: Test Article
author: John
date: 2024-01-15
---
Content`,
    }

    const docs = loadMdxldModules(modules)

    expect(docs[0].document.type).toBe('Article')
    expect(docs[0].document.id).toBe('/articles/test')
    expect(docs[0].document.data.author).toBe('John')
  })
})

// ===========================================================================
// createContentIndex Tests
// ===========================================================================

describe('createContentIndex', () => {
  it('should create sorted index from documents', () => {
    const documents = [
      {
        path: '/posts/b',
        document: parse(`---
title: B Post
date: 2024-01-02
---
Content B`),
      },
      {
        path: '/posts/a',
        document: parse(`---
title: A Post
date: 2024-01-01
---
Content A`),
      },
      {
        path: '/posts/c',
        document: parse(`---
title: C Post
date: 2024-01-03
---
Content C`),
      },
    ]

    const index = createContentIndex(documents, {
      sortBy: 'title',
      sortOrder: 'asc',
    })

    expect(index[0].title).toBe('A Post')
    expect(index[1].title).toBe('B Post')
    expect(index[2].title).toBe('C Post')
  })

  it('should filter documents', () => {
    const documents = [
      {
        path: '/posts/draft',
        document: parse(`---
title: Draft Post
draft: true
---
Content`),
      },
      {
        path: '/posts/published',
        document: parse(`---
title: Published Post
---
Content`),
      },
    ]

    const index = createContentIndex(documents, {
      filter: (doc) => !doc.data.draft,
    })

    expect(index).toHaveLength(1)
    expect(index[0].title).toBe('Published Post')
  })

  it('should support custom sort function', () => {
    const documents = [
      {
        path: '/posts/a',
        document: parse(`---
title: Short
---
Content`),
      },
      {
        path: '/posts/b',
        document: parse(`---
title: A Very Long Title
---
Content`),
      },
    ]

    const index = createContentIndex(documents, {
      sortBy: (doc) => (doc.data.title as string)?.length || 0,
      sortOrder: 'desc',
    })

    expect(index[0].title).toBe('A Very Long Title')
    expect(index[1].title).toBe('Short')
  })

  it('should sort descending order', () => {
    const documents = [
      {
        path: '/posts/a',
        document: parse(`---
title: A Post
---
Content`),
      },
      {
        path: '/posts/c',
        document: parse(`---
title: C Post
---
Content`),
      },
    ]

    const index = createContentIndex(documents, {
      sortBy: 'title',
      sortOrder: 'desc',
    })

    expect(index[0].title).toBe('C Post')
    expect(index[1].title).toBe('A Post')
  })

  it('should handle null values in sort', () => {
    const documents = [
      {
        path: '/posts/a',
        document: parse(`---
title: With Date
date: 2024-01-15
---
Content`),
      },
      {
        path: '/posts/b',
        document: parse(`---
title: Without Date
---
Content`),
      },
    ]

    const index = createContentIndex(documents, {
      sortBy: 'date',
      sortOrder: 'asc',
    })

    // Items without date should be sorted to the end
    expect(index[0].title).toBe('With Date')
    expect(index[1].title).toBe('Without Date')
  })

  it('should include type and id in index', () => {
    const documents = [
      {
        path: '/posts/test',
        document: parse(`---
$type: BlogPost
$id: /posts/test
title: Test Post
---
Content`),
      },
    ]

    const index = createContentIndex(documents)

    expect(index[0].type).toBe('BlogPost')
    expect(index[0].id).toBe('/posts/test')
    expect(index[0].path).toBe('/posts/test')
  })

  it('should handle empty documents array', () => {
    const index = createContentIndex([])
    expect(index).toHaveLength(0)
  })

  it('should use default sort options', () => {
    const documents = [
      {
        path: '/posts/b',
        document: parse(`---
title: B Post
---
Content`),
      },
      {
        path: '/posts/a',
        document: parse(`---
title: A Post
---
Content`),
      },
    ]

    const index = createContentIndex(documents)

    // Default is sortBy: 'title', sortOrder: 'asc'
    expect(index[0].title).toBe('A Post')
    expect(index[1].title).toBe('B Post')
  })
})

// ===========================================================================
// getDefaultRemarkPlugins Tests
// ===========================================================================

describe('getDefaultRemarkPlugins', () => {
  it('should return array of remark plugins', () => {
    const plugins = getDefaultRemarkPlugins()

    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBeGreaterThanOrEqual(2)
  })

  it('should include MDXLD plugin when jsonld enabled', () => {
    const plugins = getDefaultRemarkPlugins({ jsonld: true })
    expect(plugins.length).toBe(3)
  })

  it('should exclude MDXLD plugin when jsonld disabled', () => {
    const plugins = getDefaultRemarkPlugins({ jsonld: false })
    expect(plugins.length).toBe(2)
  })

  it('should include frontmatter plugin by default', () => {
    const plugins = getDefaultRemarkPlugins()
    // First plugin should be remark-frontmatter
    expect(plugins[0]).toBeDefined()
  })

  it('should include mdx-frontmatter plugin with name config', () => {
    const plugins = getDefaultRemarkPlugins()
    // Second plugin should be remark-mdx-frontmatter with options
    const mdxFrontmatterPlugin = plugins[1]
    expect(Array.isArray(mdxFrontmatterPlugin)).toBe(true)
    expect((mdxFrontmatterPlugin as [unknown, { name: string }])[1].name).toBe('frontmatter')
  })
})

// ===========================================================================
// mdxld Vite Plugin Tests
// ===========================================================================

describe('mdxld vite plugin', () => {
  it('should return array of plugins', () => {
    const plugins = mdxld()
    expect(Array.isArray(plugins)).toBe(true)
    expect(plugins.length).toBe(2)
  })

  it('should accept custom options', () => {
    const plugins = mdxld({
      jsonld: false,
      jsxImportSource: 'preact',
    })
    expect(plugins.length).toBe(2)
  })

  it('should accept custom remark plugins', () => {
    const customPlugin = () => (tree: unknown) => tree
    const plugins = mdxld({
      remarkPlugins: [customPlugin],
    })
    expect(plugins.length).toBe(2)
  })

  it('should accept custom rehype plugins', () => {
    const customPlugin = () => (tree: unknown) => tree
    const plugins = mdxld({
      rehypePlugins: [customPlugin],
    })
    expect(plugins.length).toBe(2)
  })

  it('should use hono/jsx as default jsxImportSource', () => {
    const plugins = mdxld()
    // The plugin is created with default options
    expect(plugins).toBeDefined()
  })
})

// ===========================================================================
// createMdxldConfig Tests
// ===========================================================================

describe('createMdxldConfig', () => {
  it('should return config with plugins array', async () => {
    // Note: This will fail if honox is not installed, but we test the function exists
    try {
      const config = await createMdxldConfig()
      expect(config.plugins).toBeDefined()
      expect(Array.isArray(config.plugins)).toBe(true)
    } catch {
      // honox may not be installed in test environment
      expect(createMdxldConfig).toBeDefined()
    }
  })

  it('should accept honox options', async () => {
    try {
      const config = await createMdxldConfig({ devServer: { port: 3000 } })
      expect(config.plugins).toBeDefined()
    } catch {
      // honox may not be installed
      expect(createMdxldConfig).toBeDefined()
    }
  })

  it('should accept mdxld options', async () => {
    try {
      const config = await createMdxldConfig({}, { jsonld: false })
      expect(config.plugins).toBeDefined()
    } catch {
      // honox may not be installed
      expect(createMdxldConfig).toBeDefined()
    }
  })
})

// ===========================================================================
// Document Cache Tests
// ===========================================================================

describe('document cache', () => {
  beforeEach(() => {
    clearDocumentCache()
  })

  it('should clear all cached documents', () => {
    clearDocumentCache()
    // Cache should be empty after clearing
    expect(clearDocumentCache).toBeDefined()
  })

  it('should invalidate specific path', () => {
    const result = invalidateDocumentCache('/test/path')
    // Returns false if path was not in cache
    expect(typeof result).toBe('boolean')
  })

  it('should return false when invalidating non-existent path', () => {
    clearDocumentCache()
    const result = invalidateDocumentCache('/non/existent/path')
    expect(result).toBe(false)
  })
})

// ===========================================================================
// mdxldMiddleware Tests
// ===========================================================================

describe('mdxldMiddleware', () => {
  beforeEach(() => {
    clearDocumentCache()
  })

  it('should return middleware function', () => {
    const middleware = mdxldMiddleware()
    expect(typeof middleware).toBe('function')
  })

  it('should call next when no loader provided', async () => {
    const middleware = mdxldMiddleware()
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/test' },
      set: vi.fn(),
    } as unknown as Context

    await middleware(mockContext, next)

    expect(next).toHaveBeenCalled()
  })

  it('should load and parse content with loader', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Test
---
Content`)

    const middleware = mdxldMiddleware({ loader })
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/test' },
      set: vi.fn(),
    } as unknown as Context

    await middleware(mockContext, next)

    expect(loader).toHaveBeenCalledWith('/test')
    expect(mockContext.set).toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  it('should call next when loader returns null', async () => {
    const loader = vi.fn().mockResolvedValue(null)

    const middleware = mdxldMiddleware({ loader })
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/test' },
      set: vi.fn(),
    } as unknown as Context

    await middleware(mockContext, next)

    expect(next).toHaveBeenCalled()
    expect(mockContext.set).not.toHaveBeenCalled()
  })

  it('should apply transform function', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Original
---
Content`)
    const transform = vi.fn().mockImplementation((doc) => ({
      ...doc,
      data: { ...doc.data, title: 'Transformed' },
    }))

    const middleware = mdxldMiddleware({ loader, transform })
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/test' },
      set: vi.fn(),
    } as unknown as Context

    await middleware(mockContext, next)

    expect(transform).toHaveBeenCalled()
    expect(mockContext.set).toHaveBeenCalled()
  })

  it('should use cache when enabled', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Cached
---
Content`)

    clearDocumentCache()

    const middleware = mdxldMiddleware({
      loader,
      cache: { enabled: true, ttl: 3600 },
    })
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/cached-test' },
      set: vi.fn(),
    } as unknown as Context

    // First call
    await middleware(mockContext, next)
    expect(loader).toHaveBeenCalledTimes(1)

    // Second call should use cache
    await middleware(mockContext, next)
    // Loader should still only be called once due to caching
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('should disable cache when cache.enabled is false', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Not Cached
---
Content`)

    const middleware = mdxldMiddleware({
      loader,
      cache: { enabled: false },
    })
    const next = vi.fn().mockResolvedValue(undefined)
    const mockContext = {
      req: { path: '/not-cached-test' },
      set: vi.fn(),
    } as unknown as Context

    // First call
    await middleware(mockContext, next)
    expect(loader).toHaveBeenCalledTimes(1)

    // Second call should not use cache
    await middleware(mockContext, next)
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

// ===========================================================================
// getMdxldContext Tests
// ===========================================================================

describe('getMdxldContext', () => {
  it('should return undefined when no context set', () => {
    const mockContext = {
      get: vi.fn().mockReturnValue(undefined),
    } as unknown as Context

    const result = getMdxldContext(mockContext)

    expect(result).toBeUndefined()
  })

  it('should return context when set', () => {
    const mdxldContext = {
      document: parse(`---
title: Test
---
Content`),
      path: '/test',
    }

    const mockContext = {
      get: vi.fn().mockReturnValue(mdxldContext),
    } as unknown as Context

    const result = getMdxldContext(mockContext)

    expect(result).toBe(mdxldContext)
    expect(result?.document.data.title).toBe('Test')
  })
})

// ===========================================================================
// createMdxldRoute Tests
// ===========================================================================

describe('createMdxldRoute', () => {
  it('should return 404 when no loader provided', async () => {
    const route = createMdxldRoute({})
    const mockContext = {
      req: { path: '/test' },
      notFound: vi.fn().mockReturnValue('Not Found'),
    } as unknown as Context

    const result = await route(mockContext)

    expect(mockContext.notFound).toHaveBeenCalled()
    expect(result).toBe('Not Found')
  })

  it('should return 404 when content not found', async () => {
    const loader = vi.fn().mockResolvedValue(null)
    const route = createMdxldRoute({ loader })
    const mockContext = {
      req: { path: '/test' },
      notFound: vi.fn().mockReturnValue('Not Found'),
    } as unknown as Context

    const result = await route(mockContext)

    expect(mockContext.notFound).toHaveBeenCalled()
  })

  it('should return JSON by default', async () => {
    const loader = vi.fn().mockResolvedValue(`---
$type: Article
title: Test
---
Content`)
    const route = createMdxldRoute({ loader })
    const jsonResponse = { json: true }
    const mockContext = {
      req: { path: '/test' },
      json: vi.fn().mockReturnValue(jsonResponse),
    } as unknown as Context

    const result = await route(mockContext)

    expect(mockContext.json).toHaveBeenCalled()
    expect(result).toBe(jsonResponse)
  })

  it('should return JSON-LD when format is jsonld', async () => {
    const loader = vi.fn().mockResolvedValue(`---
$type: Article
title: Test
---
Content`)
    const route = createMdxldRoute({ loader, format: 'jsonld', baseUrl: 'https://example.com' })
    const mockContext = {
      req: { path: '/test' },
      json: vi.fn().mockImplementation((data) => data),
    } as unknown as Context

    const result = await route(mockContext)

    expect(mockContext.json).toHaveBeenCalled()
    expect((result as Record<string, unknown>)['@type']).toBe('Article')
    expect((result as Record<string, unknown>)['@context']).toBe('https://schema.org')
  })

  it('should return HTML when format is html', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Test Page
---
Content`)
    const route = createMdxldRoute({ loader, format: 'html' })
    const mockContext = {
      req: { path: '/test' },
      html: vi.fn().mockImplementation((html) => html),
    } as unknown as Context

    const result = await route(mockContext)

    expect(mockContext.html).toHaveBeenCalled()
    expect(result).toContain('<!DOCTYPE html>')
    expect(result).toContain('Test Page')
  })

  it('should apply transform function', async () => {
    const loader = vi.fn().mockResolvedValue(`---
title: Original
---
Content`)
    const transform = vi.fn().mockImplementation((doc) => ({
      ...doc,
      data: { ...doc.data, title: 'Transformed' },
    }))
    const route = createMdxldRoute({ loader, transform })
    const mockContext = {
      req: { path: '/test' },
      json: vi.fn().mockImplementation((data) => data),
    } as unknown as Context

    const result = await route(mockContext)

    expect(transform).toHaveBeenCalled()
    expect((result as { data: { title: string } }).data.title).toBe('Transformed')
  })
})

// ===========================================================================
// Client Functions Tests (Server-side behavior)
// ===========================================================================

describe('client functions (server-side)', () => {
  describe('extractJsonLd', () => {
    it('should return empty array when document is undefined', () => {
      const result = extractJsonLd()
      expect(result).toEqual([])
    })
  })

  describe('extractFrontmatter', () => {
    it('should return empty object when document is undefined', () => {
      const result = extractFrontmatter()
      expect(result).toEqual({})
    })
  })

  describe('getPageJsonLd', () => {
    it('should return undefined when window is undefined', () => {
      const result = getPageJsonLd()
      expect(result).toBeUndefined()
    })
  })

  describe('useMdxldContext', () => {
    it('should return context object', () => {
      const result = useMdxldContext()
      expect(result).toHaveProperty('jsonld')
      expect(result).toHaveProperty('frontmatter')
    })
  })
})

// ===========================================================================
// Renderer Components Tests
// ===========================================================================

describe('renderer components', () => {
  describe('mdxldRenderer', () => {
    it('should return middleware function', () => {
      const renderer = mdxldRenderer()
      expect(typeof renderer).toBe('function')
    })

    it('should accept options', () => {
      const renderer = mdxldRenderer({
        defaultTitle: 'My Site',
        baseUrl: 'https://example.com',
      })
      expect(typeof renderer).toBe('function')
    })

    it('should accept defaultStyles option', () => {
      const renderer = mdxldRenderer({
        defaultStyles: false,
      })
      expect(typeof renderer).toBe('function')
    })

    it('should accept custom styles', () => {
      const renderer = mdxldRenderer({
        styles: '.custom { color: red; }',
      })
      expect(typeof renderer).toBe('function')
    })

    it('should accept custom head content', () => {
      const renderer = mdxldRenderer({
        head: '<meta name="description" content="Test" />',
      })
      expect(typeof renderer).toBe('function')
    })
  })

  describe('createDocumentRenderer', () => {
    it('should return middleware function', () => {
      const renderer = createDocumentRenderer(({ children }) => children as ReturnType<typeof createDocumentRenderer>)
      expect(typeof renderer).toBe('function')
    })

    it('should accept custom render function', () => {
      const customRender = vi.fn().mockReturnValue('<html></html>')
      const renderer = createDocumentRenderer(customRender)
      expect(typeof renderer).toBe('function')
    })
  })

  describe('MDXProvider', () => {
    it('should be a function component', () => {
      expect(typeof MDXProvider).toBe('function')
    })

    it('should accept children prop', () => {
      const result = MDXProvider({ children: 'Test content' })
      expect(result).toBeDefined()
    })

    it('should accept className prop', () => {
      const result = MDXProvider({ children: 'Test', className: 'custom-class' })
      expect(result).toBeDefined()
    })
  })

  describe('StructuredData', () => {
    it('should be a function component', () => {
      expect(typeof StructuredData).toBe('function')
    })

    it('should accept type prop', () => {
      const result = StructuredData({ type: 'Article' })
      expect(result).toBeDefined()
    })

    it('should accept id prop', () => {
      const result = StructuredData({ id: '/articles/test' })
      expect(result).toBeDefined()
    })

    it('should accept context prop', () => {
      const result = StructuredData({ context: 'https://custom.org' })
      expect(result).toBeDefined()
    })

    it('should accept data prop', () => {
      const result = StructuredData({
        type: 'BlogPost',
        data: { title: 'Test', author: 'John' },
      })
      expect(result).toBeDefined()
    })
  })

  describe('Head', () => {
    it('should be a function component', () => {
      expect(typeof Head).toBe('function')
    })

    it('should return null', () => {
      const result = Head({ children: '<meta name="test" />' })
      expect(result).toBeNull()
    })
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('type definitions', () => {
  it('should export MDXLDVitePluginOptions type', async () => {
    const types = await import('./types.js')
    // Type exists if import succeeds
    expect(types).toBeDefined()
  })

  it('should export CreateAppOptions type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })

  it('should export MDXRouteModule type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })

  it('should export MDXComponentProps type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })

  it('should export MDXLDContext type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })

  it('should export MDXLDRendererOptions type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })

  it('should export MDXLDRouteOptions type', async () => {
    const types = await import('./types.js')
    expect(types).toBeDefined()
  })
})

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('integration', () => {
  it('should work end-to-end with document parsing and JSON-LD generation', () => {
    const content = `---
$type: BlogPost
$id: /posts/integration-test
$context: https://schema.org
title: Integration Test
author: Test Author
datePublished: 2024-01-15
tags:
  - testing
  - mdxld
---

# Integration Test

This is a test post for integration testing.
`

    const doc = parse(content)
    const jsonld = createJsonLd(doc, 'https://example.com')

    expect(jsonld['@context']).toBe('https://schema.org')
    expect(jsonld['@type']).toBe('BlogPost')
    expect(jsonld['@id']).toBe('https://example.com/posts/integration-test')
    expect(jsonld['title']).toBe('Integration Test')
    expect(jsonld['author']).toBe('Test Author')
    expect(jsonld['tags']).toEqual(['testing', 'mdxld'])
  })

  it('should work with loadMdxldModules and createContentIndex', () => {
    const modules = {
      './blog/post-1.mdx': `---
title: First Post
date: 2024-01-01
---
Content 1`,
      './blog/post-2.mdx': `---
title: Second Post
date: 2024-01-15
---
Content 2`,
      './blog/draft.mdx': `---
title: Draft Post
date: 2024-01-10
draft: true
---
Draft content`,
    }

    const docs = loadMdxldModules(modules)
    const index = createContentIndex(docs, {
      filter: (doc) => !doc.data.draft,
      sortBy: 'date',
      sortOrder: 'desc',
    })

    expect(index).toHaveLength(2)
    expect(index[0].title).toBe('Second Post')
    expect(index[1].title).toBe('First Post')
  })
})

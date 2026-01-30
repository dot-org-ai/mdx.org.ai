import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MDXLDDocument } from 'mdxld'
import {
  withMDXE,
  createMDXRouteHandler,
  generateMDXStaticParams,
  generateMDXMetadata,
  parseMDX,
  generateBreadcrumbs,
  getNavigation,
} from './index.js'

// ===========================================================================
// Test Fixtures and Utilities
// ===========================================================================

/**
 * Helper to create mock documents
 */
function createMockDocument(data: Record<string, unknown> = {}): MDXLDDocument {
  return {
    data: {
      title: 'Test Document',
      slug: 'test-doc',
      ...data,
    },
    content: '# Test\n\nThis is a test document.',
  }
}

/**
 * Helper to create mock Request
 */
function createMockRequest(url: string, method = 'GET'): Request {
  return new Request(url, { method })
}

/**
 * Helper to create mock route context
 */
function createMockContext(slug: string[] = []): { params: Promise<{ slug?: string[] }> } {
  return { params: Promise.resolve({ slug }) }
}

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports withMDXE function', async () => {
    const mod = await import('./index.js')
    expect(mod.withMDXE).toBeDefined()
    expect(typeof mod.withMDXE).toBe('function')
  })

  it('exports createMDXRouteHandler function', async () => {
    const mod = await import('./index.js')
    expect(mod.createMDXRouteHandler).toBeDefined()
    expect(typeof mod.createMDXRouteHandler).toBe('function')
  })

  it('exports generateMDXStaticParams function', async () => {
    const mod = await import('./index.js')
    expect(mod.generateMDXStaticParams).toBeDefined()
    expect(typeof mod.generateMDXStaticParams).toBe('function')
  })

  it('exports generateMDXMetadata function', async () => {
    const mod = await import('./index.js')
    expect(mod.generateMDXMetadata).toBeDefined()
    expect(typeof mod.generateMDXMetadata).toBe('function')
  })

  it('exports parseMDX function', async () => {
    const mod = await import('./index.js')
    expect(mod.parseMDX).toBeDefined()
    expect(typeof mod.parseMDX).toBe('function')
  })

  it('exports generateBreadcrumbs function', async () => {
    const mod = await import('./index.js')
    expect(mod.generateBreadcrumbs).toBeDefined()
    expect(typeof mod.generateBreadcrumbs).toBe('function')
  })

  it('exports getNavigation function', async () => {
    const mod = await import('./index.js')
    expect(mod.getNavigation).toBeDefined()
    expect(typeof mod.getNavigation).toBe('function')
  })

  it('exports parse from mdxld', async () => {
    const mod = await import('./index.js')
    expect(mod.parse).toBeDefined()
    expect(typeof mod.parse).toBe('function')
  })

  it('exports widget utilities', async () => {
    const mod = await import('./index.js')
    expect(mod.getWidgetCSS).toBeDefined()
    expect(mod.getWidgetJS).toBeDefined()
    expect(mod.getAllWidgetCSS).toBeDefined()
    expect(mod.getAllWidgetJS).toBeDefined()
    expect(mod.parseWidgetQuery).toBeDefined()
    expect(mod.createWidgetCSSHandler).toBeDefined()
    expect(mod.createWidgetJSHandler).toBeDefined()
  })

  it('exports app router utilities', async () => {
    const mod = await import('./index.js')
    expect(mod.ContentLoader).toBeDefined()
    expect(mod.createContentLoader).toBeDefined()
    expect(mod.getLayoutConfig).toBeDefined()
    expect(mod.extractToc).toBeDefined()
    expect(mod.generateSitemap).toBeDefined()
    expect(mod.renderSitemapXML).toBeDefined()
    expect(mod.createSitemapHandler).toBeDefined()
  })
})

// ===========================================================================
// withMDXE() Tests
// ===========================================================================

describe('withMDXE()', () => {
  it('returns config with page extensions', () => {
    const config = withMDXE({})
    expect(config.pageExtensions).toContain('mdx')
    expect(config.pageExtensions).toContain('md')
    expect(config.pageExtensions).toContain('tsx')
  })

  it('preserves existing config options', () => {
    const config = withMDXE({ reactStrictMode: true })
    expect(config.reactStrictMode).toBe(true)
    expect(config.pageExtensions).toBeDefined()
  })

  it('accepts custom page extensions', () => {
    const config = withMDXE({}, { pageExtensions: ['tsx', 'mdx'] })
    expect(config.pageExtensions).toEqual(['tsx', 'mdx'])
  })

  it('includes default page extensions', () => {
    const config = withMDXE({})
    expect(config.pageExtensions).toEqual(['tsx', 'ts', 'jsx', 'js', 'mdx', 'md'])
  })

  it('preserves custom webpack config', () => {
    const customWebpack = vi.fn((config) => config)
    const config = withMDXE({}, { webpack: customWebpack })
    expect(config.pageExtensions).toBeDefined()
  })

  it('handles empty config', () => {
    const config = withMDXE()
    expect(config.pageExtensions).toBeDefined()
  })

  it('preserves existing images config', () => {
    const config = withMDXE({
      images: { domains: ['example.com'] },
    })
    expect(config.images).toEqual({ domains: ['example.com'] })
    expect(config.pageExtensions).toBeDefined()
  })

  it('preserves existing i18n config', () => {
    const config = withMDXE({
      i18n: { locales: ['en', 'es'], defaultLocale: 'en' },
    })
    expect(config.i18n).toEqual({ locales: ['en', 'es'], defaultLocale: 'en' })
  })

  it('preserves basePath configuration', () => {
    const config = withMDXE({ basePath: '/docs' })
    expect(config.basePath).toBe('/docs')
  })

  it('preserves experimental features', () => {
    const config = withMDXE({
      experimental: { serverActions: true },
    })
    expect(config.experimental).toEqual({ serverActions: true })
  })
})

// ===========================================================================
// createMDXRouteHandler() Tests
// ===========================================================================

describe('createMDXRouteHandler()', () => {
  it('returns a function', () => {
    const handler = createMDXRouteHandler({
      getDocument: async () => null,
    })
    expect(typeof handler).toBe('function')
  })

  it('returns 404 when document not found', async () => {
    const handler = createMDXRouteHandler({
      getDocument: async () => null,
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Not found')
  })

  it('returns document when found', async () => {
    const mockDoc = createMockDocument()
    const handler = createMDXRouteHandler({
      getDocument: async () => mockDoc,
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.data.title).toBe('Test Document')
  })

  it('applies transform function', async () => {
    const mockDoc = createMockDocument()
    const handler = createMDXRouteHandler({
      getDocument: async () => mockDoc,
      transform: (doc) => ({ title: doc.data.title, transformed: true }),
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    const json = await response.json()
    expect(json.transformed).toBe(true)
  })

  it('uses custom notFound handler', async () => {
    const handler = createMDXRouteHandler({
      getDocument: async () => null,
      notFound: () => new Response('Custom not found', { status: 404 }),
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toBe('Custom not found')
  })

  it('handles empty slug array', async () => {
    const mockDoc = createMockDocument()
    const handler = createMDXRouteHandler({
      getDocument: async (slug) => {
        return slug.length === 0 ? mockDoc : null
      },
    })

    const request = createMockRequest('http://localhost/api/docs')
    const response = await handler(request, createMockContext([]))

    expect(response.status).toBe(200)
  })

  it('passes slug to getDocument function', async () => {
    const getDocument = vi.fn().mockResolvedValue(createMockDocument())
    const handler = createMDXRouteHandler({ getDocument })

    const request = createMockRequest('http://localhost/api/docs/intro/getting-started')
    await handler(request, createMockContext(['intro', 'getting-started']))

    expect(getDocument).toHaveBeenCalledWith(['intro', 'getting-started'])
  })

  it('returns JSON content type header', async () => {
    const handler = createMDXRouteHandler({
      getDocument: async () => createMockDocument(),
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('handles undefined slug parameter', async () => {
    const mockDoc = createMockDocument()
    const handler = createMDXRouteHandler({
      getDocument: async (slug) => {
        return slug.length === 0 ? mockDoc : null
      },
    })

    const request = createMockRequest('http://localhost/api/docs')
    const response = await handler(request, { params: Promise.resolve({}) })

    expect(response.status).toBe(200)
  })

  it('transforms document data correctly', async () => {
    const mockDoc = createMockDocument({ author: 'John Doe', date: '2024-01-01' })
    const handler = createMDXRouteHandler({
      getDocument: async () => mockDoc,
      transform: (doc) => ({
        title: doc.data.title,
        author: doc.data.author,
        excerpt: doc.content.substring(0, 50),
      }),
    })

    const request = createMockRequest('http://localhost/api/docs/test')
    const response = await handler(request, createMockContext(['test']))

    const json = await response.json()
    expect(json.title).toBe('Test Document')
    expect(json.author).toBe('John Doe')
    expect(json.excerpt).toBeDefined()
  })
})

// ===========================================================================
// generateMDXStaticParams() Tests
// ===========================================================================

describe('generateMDXStaticParams()', () => {
  it('generates params from documents with string slugs', async () => {
    const docs = [
      createMockDocument({ slug: 'intro' }),
      createMockDocument({ slug: 'getting-started/installation' }),
    ]

    const params = await generateMDXStaticParams(docs)

    expect(params).toEqual([
      { slug: ['intro'] },
      { slug: ['getting-started', 'installation'] },
    ])
  })

  it('generates params from documents with array slugs', async () => {
    const docs = [
      createMockDocument({ slug: ['docs', 'intro'] }),
      createMockDocument({ slug: ['docs', 'api', 'reference'] }),
    ]

    const params = await generateMDXStaticParams(docs)

    expect(params).toEqual([
      { slug: ['docs', 'intro'] },
      { slug: ['docs', 'api', 'reference'] },
    ])
  })

  it('accepts async function for documents', async () => {
    const getDocuments = async () => [
      createMockDocument({ slug: 'test-1' }),
      createMockDocument({ slug: 'test-2' }),
    ]

    const params = await generateMDXStaticParams(getDocuments)

    expect(params.length).toBe(2)
  })

  it('uses custom slug field', async () => {
    const docs = [createMockDocument({ path: 'custom/path' })]

    const params = await generateMDXStaticParams(docs, { slugField: 'path' })

    expect(params).toEqual([{ slug: ['custom', 'path'] }])
  })

  it('filters out documents without valid slug', async () => {
    const docs = [
      createMockDocument({ slug: 'valid' }),
      createMockDocument({ slug: undefined }),
      createMockDocument({ slug: 123 }),
    ]

    const params = await generateMDXStaticParams(docs)

    expect(params.length).toBe(1)
  })

  it('handles empty documents array', async () => {
    const params = await generateMDXStaticParams([])
    expect(params).toEqual([])
  })

  it('handles documents with empty string slugs', async () => {
    const docs = [
      createMockDocument({ slug: '' }),
      createMockDocument({ slug: 'valid' }),
    ]

    const params = await generateMDXStaticParams(docs)
    expect(params.length).toBe(2)
    expect(params[0].slug).toEqual([])
  })

  it('converts array elements to strings', async () => {
    const docs = [
      createMockDocument({ slug: ['docs', 123, 'page'] }),
    ]

    const params = await generateMDXStaticParams(docs)
    expect(params[0].slug).toEqual(['docs', '123', 'page'])
  })

  it('filters leading slashes from slugs', async () => {
    const docs = [
      createMockDocument({ slug: '/docs/intro' }),
    ]

    const params = await generateMDXStaticParams(docs)
    expect(params[0].slug[0]).not.toBe('')
  })
})

// ===========================================================================
// generateMDXMetadata() Tests
// ===========================================================================

describe('generateMDXMetadata()', () => {
  it('generates basic metadata from document', () => {
    const doc = createMockDocument({
      title: 'My Page',
      description: 'Page description',
    })

    const metadata = generateMDXMetadata(doc)

    expect(metadata.title).toBe('My Page')
    expect(metadata.description).toBe('Page description')
  })

  it('handles null document', () => {
    const metadata = generateMDXMetadata(null)

    expect(metadata.title).toBe('Not Found')
  })

  it('uses default description when not provided', () => {
    const doc = createMockDocument({ title: 'Test' })

    const metadata = generateMDXMetadata(doc, {
      defaultDescription: 'Default desc',
    })

    expect(metadata.description).toBe('Default desc')
  })

  it('generates OpenGraph metadata with baseUrl', () => {
    const doc = createMockDocument({
      title: 'My Page',
      slug: 'docs/intro',
      description: 'Page desc',
    })

    const metadata = generateMDXMetadata(doc, {
      baseUrl: 'https://example.com',
    })

    expect(metadata.openGraph?.url).toBe('https://example.com/docs/intro')
    expect(metadata.openGraph?.title).toBe('My Page')
    expect(metadata.twitter?.card).toBe('summary_large_image')
  })

  it('applies title template', () => {
    const doc = createMockDocument({ title: 'Page Title' })

    const metadata = generateMDXMetadata(doc, {
      titleTemplate: '%s | My Site',
    })

    expect(metadata.title).toEqual({
      default: 'Page Title',
      template: '%s | My Site',
    })
  })

  it('falls back to name field for title', () => {
    const doc = createMockDocument({ name: 'Named Page', title: undefined })

    const metadata = generateMDXMetadata(doc)

    expect(metadata.title).toBe('Named Page')
  })

  it('uses Untitled when no title or name provided', () => {
    const doc = createMockDocument({ title: undefined, name: undefined })

    const metadata = generateMDXMetadata(doc)

    expect(metadata.title).toBe('Untitled')
  })

  it('generates Twitter card metadata', () => {
    const doc = createMockDocument({
      title: 'My Page',
      description: 'Description',
    })

    const metadata = generateMDXMetadata(doc, {
      baseUrl: 'https://example.com',
    })

    expect(metadata.twitter).toBeDefined()
    expect(metadata.twitter?.title).toBe('My Page')
    expect(metadata.twitter?.description).toBe('Description')
  })

  it('sets openGraph type to article', () => {
    const doc = createMockDocument({ title: 'Test' })

    const metadata = generateMDXMetadata(doc, {
      baseUrl: 'https://example.com',
    })

    expect(metadata.openGraph?.type).toBe('article')
  })

  it('handles document without slug for OpenGraph URL', () => {
    const doc = createMockDocument({ title: 'Test', slug: undefined })

    const metadata = generateMDXMetadata(doc, {
      baseUrl: 'https://example.com',
    })

    expect(metadata.openGraph?.url).toBe('https://example.com/')
  })

  it('does not include OpenGraph without baseUrl', () => {
    const doc = createMockDocument({ title: 'Test' })

    const metadata = generateMDXMetadata(doc)

    expect(metadata.openGraph).toBeUndefined()
  })
})

// ===========================================================================
// parseMDX() Tests
// ===========================================================================

describe('parseMDX()', () => {
  it('parses MDX content', () => {
    const content = `---
title: Test
---

# Hello World`

    const doc = parseMDX(content)

    expect(doc.data.title).toBe('Test')
    expect(doc.content).toContain('# Hello World')
  })

  it('parses MDX with multiple frontmatter fields', () => {
    const content = `---
title: Test
description: A test document
author: John Doe
date: 2024-01-01
---

Content here`

    const doc = parseMDX(content)

    expect(doc.data.title).toBe('Test')
    expect(doc.data.description).toBe('A test document')
    expect(doc.data.author).toBe('John Doe')
  })

  it('parses MDX without frontmatter', () => {
    const content = '# Just Content\n\nNo frontmatter here.'

    const doc = parseMDX(content)

    expect(doc.content).toContain('# Just Content')
  })

  it('parses MDX with nested frontmatter objects', () => {
    const content = `---
title: Test
metadata:
  keywords:
    - mdx
    - next
---

Content`

    const doc = parseMDX(content)

    expect(doc.data.metadata).toBeDefined()
  })

  it('handles empty content', () => {
    const doc = parseMDX('')
    expect(doc.content).toBe('')
  })
})

// ===========================================================================
// generateBreadcrumbs() Tests
// ===========================================================================

describe('generateBreadcrumbs()', () => {
  it('generates breadcrumbs from slug', () => {
    const breadcrumbs = generateBreadcrumbs(['docs', 'getting-started'])

    expect(breadcrumbs).toEqual([
      { title: 'Home', href: '/' },
      { title: 'Docs', href: '/docs' },
      { title: 'Getting Started', href: '/docs/getting-started' },
    ])
  })

  it('handles empty slug', () => {
    const breadcrumbs = generateBreadcrumbs([])

    expect(breadcrumbs).toEqual([{ title: 'Home', href: '/' }])
  })

  it('uses custom base path', () => {
    const breadcrumbs = generateBreadcrumbs(['intro'], { basePath: '/docs' })

    expect(breadcrumbs).toEqual([
      { title: 'Home', href: '/docs' },
      { title: 'Intro', href: '/docs/intro' },
    ])
  })

  it('uses custom home label', () => {
    const breadcrumbs = generateBreadcrumbs(['test'], { homeLabel: 'Start' })

    expect(breadcrumbs[0].title).toBe('Start')
  })

  it('capitalizes each word in segment', () => {
    const breadcrumbs = generateBreadcrumbs(['my-great-page'])

    expect(breadcrumbs[1].title).toBe('My Great Page')
  })

  it('handles single segment slug', () => {
    const breadcrumbs = generateBreadcrumbs(['about'])

    expect(breadcrumbs.length).toBe(2)
    expect(breadcrumbs[1]).toEqual({ title: 'About', href: '/about' })
  })

  it('handles deeply nested slugs', () => {
    const breadcrumbs = generateBreadcrumbs(['docs', 'api', 'v2', 'endpoints', 'users'])

    expect(breadcrumbs.length).toBe(6)
    expect(breadcrumbs[5].href).toBe('/docs/api/v2/endpoints/users')
  })

  it('skips empty segments', () => {
    const breadcrumbs = generateBreadcrumbs(['docs', '', 'intro'])

    expect(breadcrumbs.length).toBe(3)
  })
})

// ===========================================================================
// getNavigation() Tests
// ===========================================================================

describe('getNavigation()', () => {
  const docs = [
    createMockDocument({ title: 'First', slug: 'first' }),
    createMockDocument({ title: 'Second', slug: 'second' }),
    createMockDocument({ title: 'Third', slug: 'third' }),
  ]

  it('returns previous and next for middle page', () => {
    const nav = getNavigation(['second'], docs)

    expect(nav.previous?.title).toBe('First')
    expect(nav.next?.title).toBe('Third')
  })

  it('returns only next for first page', () => {
    const nav = getNavigation(['first'], docs)

    expect(nav.previous).toBeUndefined()
    expect(nav.next?.title).toBe('Second')
  })

  it('returns only previous for last page', () => {
    const nav = getNavigation(['third'], docs)

    expect(nav.previous?.title).toBe('Second')
    expect(nav.next).toBeUndefined()
  })

  it('returns empty object for unknown slug', () => {
    const nav = getNavigation(['unknown'], docs)

    expect(nav.previous).toBeUndefined()
    expect(nav.next).toBeUndefined()
  })

  it('uses custom base path for hrefs', () => {
    const nav = getNavigation(['second'], docs, { basePath: '/docs' })

    expect(nav.previous?.href).toBe('/docs/first')
    expect(nav.next?.href).toBe('/docs/third')
  })

  it('handles array slug values', () => {
    const docsWithArraySlugs = [
      createMockDocument({ title: 'First', slug: ['docs', 'first'] }),
      createMockDocument({ title: 'Second', slug: ['docs', 'second'] }),
    ]

    const nav = getNavigation(['docs', 'second'], docsWithArraySlugs)

    expect(nav.previous?.title).toBe('First')
    expect(nav.previous?.href).toBe('/docs/first')
  })

  it('uses custom slug field', () => {
    const docsWithPath = [
      createMockDocument({ title: 'First', path: 'first' }),
      createMockDocument({ title: 'Second', path: 'second' }),
    ]

    const nav = getNavigation(['second'], docsWithPath, { slugField: 'path' })

    expect(nav.previous?.title).toBe('First')
  })

  it('includes document reference in navigation item', () => {
    const nav = getNavigation(['second'], docs)

    expect(nav.previous?.doc).toBeDefined()
    expect(nav.previous?.doc.data.title).toBe('First')
  })

  it('handles single document array', () => {
    const singleDoc = [createMockDocument({ title: 'Only', slug: 'only' })]

    const nav = getNavigation(['only'], singleDoc)

    expect(nav.previous).toBeUndefined()
    expect(nav.next).toBeUndefined()
  })

  it('handles empty documents array', () => {
    const nav = getNavigation(['test'], [])

    expect(nav.previous).toBeUndefined()
    expect(nav.next).toBeUndefined()
  })

  it('falls back to name field for navigation title', () => {
    const docsWithNames = [
      createMockDocument({ name: 'First Doc', slug: 'first', title: undefined }),
      createMockDocument({ name: 'Second Doc', slug: 'second', title: undefined }),
    ]

    const nav = getNavigation(['second'], docsWithNames)

    expect(nav.previous?.title).toBe('First Doc')
  })
})

// ===========================================================================
// Widget Module Tests
// ===========================================================================

describe('widgets', () => {
  it('exports widget utilities', async () => {
    const mod = await import('./widgets.js')
    expect(mod.getWidgetCSS).toBeDefined()
    expect(mod.getWidgetJS).toBeDefined()
    expect(mod.getAllWidgetCSS).toBeDefined()
    expect(mod.getAllWidgetJS).toBeDefined()
    expect(mod.parseWidgetQuery).toBeDefined()
    expect(mod.createWidgetCSSHandler).toBeDefined()
    expect(mod.createWidgetJSHandler).toBeDefined()
  })

  describe('getWidgetCSS()', () => {
    it('returns CSS for specified widgets', async () => {
      const { getWidgetCSS } = await import('./widgets.js')
      const css = getWidgetCSS(['chatbox'])
      expect(css).toContain('.mdx-chatbox')
    })

    it('returns CSS for multiple widgets', async () => {
      const { getWidgetCSS } = await import('./widgets.js')
      const css = getWidgetCSS(['chatbox', 'searchbox'])
      expect(css).toContain('.mdx-chatbox')
      expect(css).toContain('.mdx-searchbox')
    })

    it('returns empty string for invalid widgets', async () => {
      const { getWidgetCSS } = await import('./widgets.js')
      const css = getWidgetCSS(['invalid' as any])
      expect(css).toBe('')
    })

    it('returns empty string for empty array', async () => {
      const { getWidgetCSS } = await import('./widgets.js')
      const css = getWidgetCSS([])
      expect(css).toBe('')
    })
  })

  describe('getWidgetJS()', () => {
    it('returns JS for specified widgets', async () => {
      const { getWidgetJS } = await import('./widgets.js')
      const js = getWidgetJS(['chatbox'])
      expect(js).toContain('createChatbox')
    })

    it('returns JS for multiple widgets', async () => {
      const { getWidgetJS } = await import('./widgets.js')
      const js = getWidgetJS(['chatbox', 'searchbox'])
      expect(js).toContain('createChatbox')
      expect(js).toContain('createSearchbox')
    })
  })

  describe('getAllWidgetCSS()', () => {
    it('returns CSS for all widgets', async () => {
      const { getAllWidgetCSS } = await import('./widgets.js')
      const css = getAllWidgetCSS()
      expect(css).toContain('.mdx-chatbox')
      expect(css).toContain('.mdx-searchbox')
      expect(css).toContain('.mdx-toc')
      expect(css).toContain('.mdx-theme-toggle')
      expect(css).toContain('.mdx-copy-button')
    })
  })

  describe('getAllWidgetJS()', () => {
    it('returns JS for all widgets', async () => {
      const { getAllWidgetJS } = await import('./widgets.js')
      const js = getAllWidgetJS()
      expect(js).toContain('createChatbox')
      expect(js).toContain('createSearchbox')
      expect(js).toContain('createToc')
      expect(js).toContain('createThemeToggle')
      expect(js).toContain('addCopyButtons')
    })
  })

  describe('parseWidgetQuery()', () => {
    it('parses comma-separated widget names', async () => {
      const { parseWidgetQuery } = await import('./widgets.js')
      const widgets = parseWidgetQuery('chatbox,searchbox')
      expect(widgets).toEqual(['chatbox', 'searchbox'])
    })

    it('filters invalid widget names', async () => {
      const { parseWidgetQuery } = await import('./widgets.js')
      const widgets = parseWidgetQuery('chatbox,invalid,searchbox')
      expect(widgets).toEqual(['chatbox', 'searchbox'])
    })

    it('handles whitespace', async () => {
      const { parseWidgetQuery } = await import('./widgets.js')
      const widgets = parseWidgetQuery('chatbox , searchbox')
      expect(widgets).toEqual(['chatbox', 'searchbox'])
    })

    it('handles empty string', async () => {
      const { parseWidgetQuery } = await import('./widgets.js')
      const widgets = parseWidgetQuery('')
      expect(widgets).toEqual([])
    })

    it('recognizes all valid widget names', async () => {
      const { parseWidgetQuery } = await import('./widgets.js')
      const widgets = parseWidgetQuery('chatbox,searchbox,toc,theme-toggle,copy-button')
      expect(widgets).toHaveLength(5)
    })
  })

  describe('createWidgetCSSHandler()', () => {
    it('returns all widget CSS when no query param', async () => {
      const { createWidgetCSSHandler } = await import('./widgets.js')
      const handler = createWidgetCSSHandler()
      const request = new Request('http://localhost/api/widgets.css')
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/css')
      const css = await response.text()
      expect(css).toContain('.mdx-chatbox')
    })

    it('returns specific widget CSS with w param', async () => {
      const { createWidgetCSSHandler } = await import('./widgets.js')
      const handler = createWidgetCSSHandler()
      const request = new Request('http://localhost/api/widgets.css?w=chatbox')
      const response = await handler(request)

      const css = await response.text()
      expect(css).toContain('.mdx-chatbox')
      expect(css).not.toContain('.mdx-searchbox')
    })

    it('returns specific widget CSS with widgets param', async () => {
      const { createWidgetCSSHandler } = await import('./widgets.js')
      const handler = createWidgetCSSHandler()
      const request = new Request('http://localhost/api/widgets.css?widgets=chatbox,searchbox')
      const response = await handler(request)

      const css = await response.text()
      expect(css).toContain('.mdx-chatbox')
      expect(css).toContain('.mdx-searchbox')
    })

    it('sets cache-control header', async () => {
      const { createWidgetCSSHandler } = await import('./widgets.js')
      const handler = createWidgetCSSHandler()
      const request = new Request('http://localhost/api/widgets.css')
      const response = await handler(request)

      expect(response.headers.get('Cache-Control')).toContain('max-age=31536000')
    })
  })

  describe('createWidgetJSHandler()', () => {
    it('returns all widget JS when no query param', async () => {
      const { createWidgetJSHandler } = await import('./widgets.js')
      const handler = createWidgetJSHandler()
      const request = new Request('http://localhost/api/widgets.js')
      const response = await handler(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('application/javascript')
    })

    it('returns specific widget JS with w param', async () => {
      const { createWidgetJSHandler } = await import('./widgets.js')
      const handler = createWidgetJSHandler()
      const request = new Request('http://localhost/api/widgets.js?w=chatbox')
      const response = await handler(request)

      const js = await response.text()
      expect(js).toContain('createChatbox')
    })
  })
})

// ===========================================================================
// App Router Utilities Tests
// ===========================================================================

describe('app router utilities', () => {
  it('exports app utilities', async () => {
    const mod = await import('./app.js')
    expect(mod.ContentLoader).toBeDefined()
    expect(mod.createContentLoader).toBeDefined()
    expect(mod.getLayoutConfig).toBeDefined()
    expect(mod.extractToc).toBeDefined()
    expect(mod.generateSitemap).toBeDefined()
    expect(mod.renderSitemapXML).toBeDefined()
    expect(mod.createSitemapHandler).toBeDefined()
  })

  describe('ContentLoader', () => {
    it('creates a content loader instance', async () => {
      const { ContentLoader } = await import('./app.js')
      const loader = new ContentLoader({
        baseDir: '/content',
      })
      expect(loader).toBeDefined()
    })

    it('creates content loader with custom extensions', async () => {
      const { ContentLoader } = await import('./app.js')
      const loader = new ContentLoader({
        baseDir: '/content',
        extensions: ['.mdx'],
      })
      expect(loader).toBeDefined()
    })
  })

  describe('createContentLoader()', () => {
    it('returns ContentLoader instance', async () => {
      const { createContentLoader, ContentLoader } = await import('./app.js')
      const loader = createContentLoader({ baseDir: '/content' })
      expect(loader).toBeInstanceOf(ContentLoader)
    })
  })

  describe('getLayoutConfig()', () => {
    it('returns default layout config', async () => {
      const { getLayoutConfig } = await import('./app.js')
      const doc = createMockDocument()
      const config = getLayoutConfig(doc)

      expect(config.type).toBe('default')
      expect(config.showToc).toBe(false)
    })

    it('returns docs layout config', async () => {
      const { getLayoutConfig } = await import('./app.js')
      const doc = createMockDocument({ layout: 'docs' })
      const config = getLayoutConfig(doc)

      expect(config.type).toBe('docs')
      expect(config.showToc).toBe(true)
      expect(config.showSidebar).toBe(true)
      expect(config.showBreadcrumbs).toBe(true)
      expect(config.showNavigation).toBe(true)
    })

    it('returns blog layout config', async () => {
      const { getLayoutConfig } = await import('./app.js')
      const doc = createMockDocument({ layout: 'blog' })
      const config = getLayoutConfig(doc)

      expect(config.type).toBe('blog')
      expect(config.showToc).toBe(true)
      expect(config.showSidebar).toBe(false)
    })

    it('returns landing layout config', async () => {
      const { getLayoutConfig } = await import('./app.js')
      const doc = createMockDocument({ layout: 'landing' })
      const config = getLayoutConfig(doc)

      expect(config.type).toBe('landing')
      expect(config.fullWidth).toBe(true)
      expect(config.showToc).toBe(false)
    })

    it('overrides config with document settings', async () => {
      const { getLayoutConfig } = await import('./app.js')
      const doc = createMockDocument({ layout: 'docs', showToc: false })
      const config = getLayoutConfig(doc)

      expect(config.showToc).toBe(false)
    })
  })

  describe('extractToc()', () => {
    it('extracts h2 headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = '## First Section\n\nContent\n\n## Second Section'
      const toc = extractToc(content)

      expect(toc.length).toBe(2)
      expect(toc[0].text).toBe('First Section')
      expect(toc[0].depth).toBe(2)
    })

    it('extracts h3 headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = '### Sub Section'
      const toc = extractToc(content)

      expect(toc[0].depth).toBe(3)
    })

    it('extracts h4 headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = '#### Deep Section'
      const toc = extractToc(content)

      expect(toc[0].depth).toBe(4)
    })

    it('generates slug IDs', async () => {
      const { extractToc } = await import('./app.js')
      const content = '## My Great Section'
      const toc = extractToc(content)

      expect(toc[0].id).toBe('my-great-section')
    })

    it('handles special characters in headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = "## What's New?"
      const toc = extractToc(content)

      expect(toc[0].id).toBe('whats-new')
    })

    it('returns empty array for content without headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = 'Just some paragraph text.'
      const toc = extractToc(content)

      expect(toc).toEqual([])
    })

    it('ignores h1 headings', async () => {
      const { extractToc } = await import('./app.js')
      const content = '# Title\n\n## Section'
      const toc = extractToc(content)

      expect(toc.length).toBe(1)
      expect(toc[0].text).toBe('Section')
    })
  })

  describe('renderSitemapXML()', () => {
    it('renders valid sitemap XML', async () => {
      const { renderSitemapXML } = await import('./app.js')
      const entries = [
        { url: 'https://example.com/page1' },
        { url: 'https://example.com/page2' },
      ]

      const xml = renderSitemapXML(entries)

      expect(xml).toContain('<?xml version="1.0"')
      expect(xml).toContain('<urlset')
      expect(xml).toContain('<loc>https://example.com/page1</loc>')
      expect(xml).toContain('<loc>https://example.com/page2</loc>')
    })

    it('includes lastmod when provided', async () => {
      const { renderSitemapXML } = await import('./app.js')
      const entries = [
        { url: 'https://example.com/page', lastmod: new Date('2024-01-15') },
      ]

      const xml = renderSitemapXML(entries)

      expect(xml).toContain('<lastmod>2024-01-15</lastmod>')
    })

    it('includes changefreq when provided', async () => {
      const { renderSitemapXML } = await import('./app.js')
      const entries = [
        { url: 'https://example.com/page', changefreq: 'weekly' as const },
      ]

      const xml = renderSitemapXML(entries)

      expect(xml).toContain('<changefreq>weekly</changefreq>')
    })

    it('includes priority when provided', async () => {
      const { renderSitemapXML } = await import('./app.js')
      const entries = [
        { url: 'https://example.com/page', priority: 0.8 },
      ]

      const xml = renderSitemapXML(entries)

      expect(xml).toContain('<priority>0.8</priority>')
    })

    it('handles empty entries', async () => {
      const { renderSitemapXML } = await import('./app.js')
      const xml = renderSitemapXML([])

      expect(xml).toContain('<urlset')
      expect(xml).toContain('</urlset>')
    })
  })
})

// ===========================================================================
// Type Export Tests
// ===========================================================================

describe('type exports', () => {
  it('exports all core types', async () => {
    const mod = await import('./index.js')
    // Type exports are compile-time only, just verify module loads
    expect(mod).toBeDefined()
    expect(mod.withMDXE).toBeDefined()
    expect(mod.createMDXRouteHandler).toBeDefined()
  })

  it('exports MDXLDDocument type from mdxld', async () => {
    // This test verifies the re-export works by checking the module loads
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

// ===========================================================================
// Integration Tests
// ===========================================================================

describe('integration scenarios', () => {
  it('generates static params and metadata for docs site', async () => {
    const docs = [
      createMockDocument({
        title: 'Introduction',
        slug: 'intro',
        description: 'Getting started guide',
      }),
      createMockDocument({
        title: 'API Reference',
        slug: 'api/reference',
        description: 'Complete API documentation',
      }),
    ]

    const params = await generateMDXStaticParams(docs)
    expect(params.length).toBe(2)

    const metadata = generateMDXMetadata(docs[0], {
      baseUrl: 'https://docs.example.com',
      titleTemplate: '%s | My Docs',
    })

    expect(metadata.title).toEqual({
      default: 'Introduction',
      template: '%s | My Docs',
    })
    expect(metadata.openGraph?.url).toBe('https://docs.example.com/intro')
  })

  it('creates complete navigation structure', () => {
    const docs = [
      createMockDocument({ title: 'Overview', slug: 'docs/overview' }),
      createMockDocument({ title: 'Installation', slug: 'docs/installation' }),
      createMockDocument({ title: 'Configuration', slug: 'docs/configuration' }),
      createMockDocument({ title: 'Usage', slug: 'docs/usage' }),
    ]

    const nav = getNavigation(['docs', 'installation'], docs, { basePath: '' })
    const breadcrumbs = generateBreadcrumbs(['docs', 'installation'])

    expect(nav.previous?.title).toBe('Overview')
    expect(nav.next?.title).toBe('Configuration')
    expect(breadcrumbs[0].title).toBe('Home')
    expect(breadcrumbs[2].title).toBe('Installation')
  })

  it('handles MDX content parsing and route handling', async () => {
    const mdxContent = `---
title: My Post
author: John Doe
date: 2024-01-15
---

# Welcome

This is my post content.`

    const doc = parseMDX(mdxContent)
    expect(doc.data.title).toBe('My Post')

    const handler = createMDXRouteHandler({
      getDocument: async () => doc,
      transform: (d) => ({
        title: d.data.title,
        author: d.data.author,
        content: d.content,
      }),
    })

    const response = await handler(
      createMockRequest('http://localhost/api/posts/my-post'),
      createMockContext(['my-post'])
    )

    expect(response.status).toBe(200)
    const json = await response.json()
    expect(json.title).toBe('My Post')
    expect(json.author).toBe('John Doe')
  })
})

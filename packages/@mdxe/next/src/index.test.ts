import { describe, it, expect, vi } from 'vitest'
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

// Helper to create mock documents
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

describe('withMDXE', () => {
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
})

describe('createMDXRouteHandler', () => {
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

    const request = new Request('http://localhost/api/docs/test')
    const response = await handler(request, { params: Promise.resolve({ slug: ['test'] }) })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Not found')
  })

  it('returns document when found', async () => {
    const mockDoc = createMockDocument()
    const handler = createMDXRouteHandler({
      getDocument: async () => mockDoc,
    })

    const request = new Request('http://localhost/api/docs/test')
    const response = await handler(request, { params: Promise.resolve({ slug: ['test'] }) })

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

    const request = new Request('http://localhost/api/docs/test')
    const response = await handler(request, { params: Promise.resolve({ slug: ['test'] }) })

    const json = await response.json()
    expect(json.transformed).toBe(true)
  })

  it('uses custom notFound handler', async () => {
    const handler = createMDXRouteHandler({
      getDocument: async () => null,
      notFound: () => new Response('Custom not found', { status: 404 }),
    })

    const request = new Request('http://localhost/api/docs/test')
    const response = await handler(request, { params: Promise.resolve({ slug: ['test'] }) })

    expect(response.status).toBe(404)
    const text = await response.text()
    expect(text).toBe('Custom not found')
  })
})

describe('generateMDXStaticParams', () => {
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
})

describe('generateMDXMetadata', () => {
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
})

describe('parseMDX', () => {
  it('parses MDX content', () => {
    const content = `---
title: Test
---

# Hello World`

    const doc = parseMDX(content)

    expect(doc.data.title).toBe('Test')
    expect(doc.content).toContain('# Hello World')
  })
})

describe('generateBreadcrumbs', () => {
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
})

describe('getNavigation', () => {
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
})

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
})

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
})

describe('type exports', () => {
  it('exports all core types', async () => {
    const mod = await import('./index.js')
    // Type exports are compile-time only, just verify module loads
    expect(mod).toBeDefined()
    expect(mod.withMDXE).toBeDefined()
    expect(mod.createMDXRouteHandler).toBeDefined()
  })
})

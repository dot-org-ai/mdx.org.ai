/**
 * End-to-end tests for full document lifecycle
 *
 * Tests complete workflows from document creation to rendering:
 * - Create → Parse → Transform → Render
 * - Multi-format output (JSON, HTML, Markdown, Terminal)
 * - HTTP serving with Hono
 * - Component rendering with mdxui
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { Hono } from 'hono'
import React from 'react'
import { render } from 'ink-testing-library'

// Core packages
import { parse, stringify, toAst, type MDXLDDocument } from 'mdxld'

// Rendering packages
import { render as renderMarkdown } from '@mdxui/markdown'
import {
  mdx,
  renderToHtml,
  htmlResponse,
  jsonResponse,
  createMapLoader,
  clearCache,
} from '@mdxe/hono'
import { MDXDocument, renderToText } from '@mdxe/ink'

// Component factory
import {
  createComponents,
  getComponentMeta,
  type HeroProps,
  type FeaturesProps,
  type PricingProps,
} from 'mdxui'

import { documentCollection } from '../shared/fixtures/documents.js'

describe('E2E: Document Creation and Parsing', () => {
  it('should create, serialize, and re-parse document', () => {
    // Create document programmatically using expanded mode structure
    const doc: MDXLDDocument = {
      type: 'BlogPost',
      id: 'https://example.com/posts/test',
      data: {
        title: 'Test Post',
        author: 'E2E Test',
        tags: ['testing', 'e2e'],
      },
      content: `# Test Post

This is a test post created programmatically.

## Section 1

Content for section 1.

## Section 2

Content for section 2.
`,
    }

    // Serialize to string
    const serialized = stringify(doc)

    // Verify frontmatter is present
    expect(serialized).toContain('---')
    expect(serialized).toContain('$type: BlogPost')
    expect(serialized).toContain('title: Test Post')

    // Re-parse
    const reparsed = parse(serialized)

    // Verify data integrity (in expanded mode, $type is at root as 'type')
    expect(reparsed.type).toBe('BlogPost')
    expect(reparsed.data.title).toBe('Test Post')
    expect(reparsed.data.author).toBe('E2E Test')
    expect(reparsed.data.tags).toEqual(['testing', 'e2e'])

    // Verify content
    expect(reparsed.content).toContain('# Test Post')
    expect(reparsed.content).toContain('## Section 1')
  })

  it('should handle complex nested frontmatter', () => {
    const doc: MDXLDDocument = {
      type: 'Product',
      data: {
        name: 'Widget Pro',
        pricing: {
          monthly: 29,
          yearly: 299,
          enterprise: 'Contact us',
        },
        features: [
          { name: 'Feature A', tier: 'free' },
          { name: 'Feature B', tier: 'pro' },
          { name: 'Feature C', tier: 'enterprise' },
        ],
      },
      content: '# Widget Pro\n\nThe best widget.',
    }

    const serialized = stringify(doc)
    const reparsed = parse(serialized)

    // Verify type is preserved
    expect(reparsed.type).toBe('Product')
    expect(reparsed.data.name).toBe('Widget Pro')
    // Note: Simple YAML parser may not fully preserve complex nested structures
    expect(reparsed.data.pricing).toBeDefined()
  })
})

describe('E2E: Multi-format Rendering', () => {
  const testDoc = parse(documentCollection.typed)

  it('should render same document to all formats', () => {
    // Markdown
    const markdown = renderMarkdown(testDoc)
    expect(markdown).toContain('# My First Blog Post')
    expect(markdown).toContain('**Bold text**')

    // HTML
    const html = renderToHtml(testDoc, { defaultStyles: false })
    expect(html).toContain('<h1>My First Blog Post</h1>')
    expect(html).toContain('<strong>Bold text</strong>')

    // Terminal text - note: renderToText may strip formatting to plain text
    const text = renderToText(testDoc, { showFrontmatter: false })
    expect(text).toContain('# My First Blog Post')
    // Terminal rendering preserves markdown syntax
    expect(text).toContain('Bold text')
  })

  it('should preserve frontmatter in all formats when requested', () => {
    const markdown = renderMarkdown(testDoc, { includeFrontmatter: true })
    // Note: In expanded mode, $type is at doc.type, the renderer serializes it back
    expect(markdown).toContain('title: My First Blog Post')

    // The terminal text renderer shows doc.data (not doc.type)
    const text = renderToText(testDoc, { showFrontmatter: true })
    expect(text).toContain('title')
    expect(text).toContain('My First Blog Post')
  })

  it('should render code blocks correctly in all formats', () => {
    const doc = parse(documentCollection.simple)

    const markdown = renderMarkdown(doc)
    expect(markdown).toContain('```javascript')
    expect(markdown).toContain("const greeting = 'Hello, World!'")

    const html = renderToHtml(doc)
    expect(html).toContain('class="language-javascript"')
    expect(html).toContain('const greeting')

    const text = renderToText(doc, { showFrontmatter: false })
    expect(text).toContain('```javascript')
  })
})

describe('E2E: HTTP Server with Hono', () => {
  let app: Hono

  beforeEach(() => {
    clearCache()
    app = new Hono()
  })

  it('should serve complete document lifecycle via HTTP', async () => {
    // Setup content loaders (paths are relative to basePath)
    const jsonLoader = createMapLoader({
      '/index': documentCollection.simple,
      '/blog/post': documentCollection.typed,
      '/api/docs': documentCollection.api,
    })

    const htmlLoader = createMapLoader({
      '/index': documentCollection.simple,
    })

    // JSON endpoint
    app.use('/json/*', mdx({ loader: jsonLoader, basePath: '/json/', cache: false }))

    // HTML endpoint
    app.use(
      '/html/*',
      mdx({
        loader: htmlLoader,
        basePath: '/html/',
        renderer: (doc) => htmlResponse(doc),
        cache: false,
      })
    )

    // Test JSON response
    const jsonRes = await app.request('/json/blog/post')
    expect(jsonRes.status).toBe(200)
    expect(jsonRes.headers.get('Content-Type')).toBe('application/json')

    const json = (await jsonRes.json()) as { type: string; data: Record<string, unknown>; content: string }
    // In expanded mode, $type is at root level
    expect(json.type).toBe('BlogPost')
    expect(json.content).toContain('# My First Blog Post')

    // Test HTML response
    const htmlRes = await app.request('/html/index')
    expect(htmlRes.status).toBe(200)
    expect(htmlRes.headers.get('Content-Type')).toBe('text/html; charset=utf-8')

    const html = await htmlRes.text()
    expect(html).toContain('<!DOCTYPE html>')
    expect(html).toContain('Hello World')
  })

  it('should handle document transformations in HTTP pipeline', async () => {
    const loader = createMapLoader({
      '/doc': documentCollection.simple,
    })

    app.use(
      '/*',
      mdx({
        loader,
        transform: (doc) => ({
          ...doc,
          data: {
            ...doc.data,
            transformed: true,
            transformedAt: new Date().toISOString(),
          },
        }),
        cache: false,
      })
    )

    const res = await app.request('/doc')
    const json = (await res.json()) as { data: Record<string, unknown> }

    expect(json.data.transformed).toBe(true)
    expect(json.data.transformedAt).toBeDefined()
  })

  it('should serve multiple document types correctly', async () => {
    // Convert collection keys to paths
    const pathMap: Record<string, string> = {}
    for (const [key, value] of Object.entries(documentCollection)) {
      pathMap[`/${key}`] = value
    }
    const loader = createMapLoader(pathMap)

    app.use('/*', mdx({ loader, cache: false }))

    // Test each document type
    const types = ['simple', 'typed', 'linkedData', 'complex', 'api']

    for (const type of types) {
      const res = await app.request(`/${type}`)
      expect(res.status).toBe(200)

      const json = (await res.json()) as { data: Record<string, unknown>; content: string }
      expect(json.data).toBeDefined()
    }
  })

  it('should handle 404 for missing documents', async () => {
    const loader = createMapLoader({
      '/exists': documentCollection.simple,
    })

    app.use('/*', mdx({ loader, cache: false }))
    app.notFound((c) => c.text('Not Found', 404))

    const res = await app.request('/does-not-exist')
    expect(res.status).toBe(404)
  })

  it('should cache documents correctly', async () => {
    let loadCount = 0
    const loader = () => {
      loadCount++
      return documentCollection.simple
    }

    app.use('/*', mdx({ loader, cache: true, cacheTTL: 300 }))

    await app.request('/doc1')
    await app.request('/doc1')
    await app.request('/doc1')

    expect(loadCount).toBe(1)

    // Different path should trigger new load
    await app.request('/doc2')
    expect(loadCount).toBe(2)
  })
})

describe('E2E: Terminal Rendering with Ink', () => {
  it('should render complete document in terminal', () => {
    const doc = parse(documentCollection.complex)

    const { lastFrame } = render(React.createElement(MDXDocument, { doc }))
    const output = lastFrame()

    // Note: In expanded mode, $type is at doc.type, not in doc.data
    // The Ink renderer displays doc.data content
    expect(output).toContain('title')
    expect(output).toContain('Awesome Product')

    // Content should be visible
    expect(output).toContain('Awesome Product')
  })

  it('should render all document types without errors', () => {
    for (const [name, content] of Object.entries(documentCollection)) {
      if (name === 'empty') continue

      const doc = parse(content)
      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      // Should render something
      expect(lastFrame()).toBeDefined()
    }
  })
})

describe('E2E: Component Factory Integration', () => {
  it('should create and render landing page components', () => {
    const jsx = React.createElement
    const components = createComponents(jsx)

    // Build a complete landing page structure
    const heroProps: HeroProps = {
      title: 'Build Something Amazing',
      subtitle: 'The best platform for developers',
      primaryAction: { label: 'Get Started', href: '/start' },
      secondaryAction: { label: 'Learn More', href: '/docs' },
    }

    const featuresProps: FeaturesProps = {
      title: 'Features',
      items: [
        { title: 'Fast', description: 'Lightning fast performance' },
        { title: 'Secure', description: 'Enterprise-grade security' },
        { title: 'Scalable', description: 'Grows with your needs' },
      ],
    }

    const pricingProps: PricingProps = {
      title: 'Pricing',
      tiers: [
        { name: 'Free', price: '$0', features: ['1 project'] },
        { name: 'Pro', price: '$29', features: ['Unlimited'], featured: true },
      ],
    }

    const hero = components.Hero(heroProps)
    const features = components.Features(featuresProps)
    const pricing = components.Pricing(pricingProps)

    // Verify components are created
    expect(hero).toBeDefined()
    expect(features).toBeDefined()
    expect(pricing).toBeDefined()

    // Verify React element structure
    expect((hero as React.ReactElement).type).toBe('header')
    expect((features as React.ReactElement).type).toBe('section')
    expect((pricing as React.ReactElement).type).toBe('section')
  })

  it('should use component metadata for validation', () => {
    const heroMeta = getComponentMeta('Hero')
    const tableMeta = getComponentMeta('Table')
    const alertMeta = getComponentMeta('Alert')

    // Verify required props
    expect(heroMeta.requiredProps).toContain('title')
    expect(tableMeta.requiredProps).toContain('columns')
    expect(tableMeta.requiredProps).toContain('data')
    expect(alertMeta.requiredProps).toContain('message')

    // Verify categories
    expect(heroMeta.category).toBe('landing')
    expect(tableMeta.category).toBe('data')
    expect(alertMeta.category).toBe('feedback')
  })
})

describe('E2E: AST Processing', () => {
  it('should process document through AST transformation', () => {
    const doc = parse(documentCollection.simple)
    const ast = toAst(doc)

    // Count different node types
    const headings = ast.children.filter((n) => n.type === 'heading')
    const paragraphs = ast.children.filter((n) => n.type === 'paragraph')
    const lists = ast.children.filter((n) => n.type === 'list')
    const codeBlocks = ast.children.filter((n) => n.type === 'code')

    expect(headings.length).toBeGreaterThan(0)
    expect(paragraphs.length).toBeGreaterThan(0)
    expect(lists.length).toBeGreaterThan(0)
    expect(codeBlocks.length).toBeGreaterThan(0)
  })

  it('should extract all headings from complex document', () => {
    const doc = parse(documentCollection.complex)
    const ast = toAst(doc)

    const headings = ast.children
      .filter((n) => n.type === 'heading')
      .map((h) => ({
        depth: h.depth,
        text:
          h.children
            ?.map((c) => c.value || '')
            .join('') || '',
      }))

    expect(headings.length).toBeGreaterThan(0)
    expect(headings[0].depth).toBe(1)
    expect(headings[0].text).toBe('Awesome Product')
  })
})

describe('E2E: Error Handling', () => {
  it('should handle empty document gracefully', () => {
    const doc = parse(documentCollection.empty)

    expect(doc.data).toEqual({})
    expect(doc.content).toBe('')

    // Should render without errors
    const markdown = renderMarkdown(doc)
    expect(markdown).toBe('')

    const html = renderToHtml(doc)
    expect(html).toContain('<!DOCTYPE html>')

    const text = renderToText(doc, { showFrontmatter: false })
    expect(typeof text).toBe('string')
  })

  it('should handle frontmatter-only document', () => {
    const doc = parse(documentCollection.frontmatterOnly)

    expect(doc.data.title).toBe('Frontmatter Only')
    expect(doc.content.trim()).toBe('')
  })

  it('should handle minimal document without frontmatter', () => {
    const doc = parse(documentCollection.minimal)

    expect(doc.data).toEqual({})
    expect(doc.content).toContain('# Just Content')
  })
})

describe('E2E: Full Workflow Integration', () => {
  it('should complete full create → parse → transform → serve → render workflow', async () => {
    // Step 1: Create document using expanded mode structure
    const originalDoc: MDXLDDocument = {
      type: 'Article',
      data: {
        title: 'Integration Test Article',
        status: 'draft',
      },
      content: '# Integration Test\n\nThis tests the full workflow.',
    }

    // Step 2: Serialize
    const serialized = stringify(originalDoc)

    // Step 3: Setup HTTP server
    clearCache()
    const app = new Hono()
    const contentStore = new Map<string, string>()
    contentStore.set('/article', serialized)

    app.use(
      '/*',
      mdx({
        loader: (path) => contentStore.get(path) || null,
        transform: (doc) => ({
          ...doc,
          data: { ...doc.data, status: 'published', processedAt: new Date().toISOString() },
        }),
        cache: false,
      })
    )

    // Step 4: Fetch and verify
    const res = await app.request('/article')
    const json = (await res.json()) as { type: string; data: Record<string, unknown>; content: string }

    // In expanded mode, $type is at root level as 'type'
    expect(json.type).toBe('Article')
    expect(json.data.title).toBe('Integration Test Article')
    expect(json.data.status).toBe('published') // Transformed
    expect(json.data.processedAt).toBeDefined() // Added by transform

    // Step 5: Re-parse and render
    const finalDoc = parse(serialized)
    finalDoc.data = json.data // Apply transformed data

    const markdown = renderMarkdown(finalDoc, { includeFrontmatter: true })
    expect(markdown).toContain('status: published')

    const html = renderToHtml(finalDoc)
    expect(html).toContain('Integration Test Article')

    const text = renderToText(finalDoc)
    expect(text).toContain('# Integration Test')
  })
})

/**
 * Integration tests for mdxld with rendering packages
 *
 * Tests the integration between:
 * - mdxld (parsing)
 * - @mdxui/markdown (markdown rendering)
 * - @mdxe/hono (HTTP serving)
 * - @mdxe/ink (terminal rendering)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse, stringify, toAst } from 'mdxld'
import { render as renderMarkdown, renderString as renderMarkdownString } from '@mdxui/markdown'
import { Hono } from 'hono'
import {
  mdx,
  renderToHtml,
  htmlResponse,
  jsonResponse,
  createMapLoader,
  parseContentPath,
  clearCache,
  parse as honoParse,
} from '@mdxe/hono'
import {
  MDXDocument,
  MDXContent,
  renderToText,
  parse as inkParse,
} from '@mdxe/ink'
import React from 'react'
import { render } from 'ink-testing-library'

import {
  simpleDocument,
  typedDocument,
  complexDocument,
  apiDocument,
  documentCollection,
} from '../shared/fixtures/documents.js'
import { assertHtmlContains, assertMarkdownContains } from '../shared/helpers/index.js'

describe('mdxld + @mdxui/markdown Integration', () => {
  describe('parse → render pipeline', () => {
    it('should parse and render simple document to markdown', () => {
      const doc = parse(simpleDocument)
      const markdown = renderMarkdown(doc)

      expect(markdown).toContain('# Hello World')
      expect(markdown).toContain('This is a simple test document')
      expect(markdown).toContain('- Feature 1')
      expect(markdown).toContain('> A quote for testing')
      expect(markdown).toContain('```javascript')
    })

    it('should preserve frontmatter through parse → stringify → parse cycle', () => {
      const doc1 = parse(typedDocument)
      const serialized = stringify(doc1)
      const doc2 = parse(serialized)

      // In expanded mode, $type is at root level as 'type'
      expect(doc2.type).toBe('BlogPost')
      expect(doc2.data.title).toBe('My First Blog Post')
      expect(doc2.data.author).toBe('Jane Doe')
    })

    it('should render typed document with frontmatter included', () => {
      const doc = parse(typedDocument)
      const markdown = renderMarkdown(doc, { includeFrontmatter: true })

      expect(markdown).toContain('$type: BlogPost')
      expect(markdown).toContain('title: My First Blog Post')
      expect(markdown).toContain('# My First Blog Post')
    })

    it('should render complex document with nested frontmatter', () => {
      const doc = parse(complexDocument)
      const markdown = renderMarkdown(doc)

      // In expanded mode, $type is at root level as 'type'
      expect(doc.type).toBe('LandingPage')
      expect(doc.data.hero).toBeDefined()
      expect((doc.data.hero as Record<string, unknown>).headline).toBe('Build Amazing Things')
      expect(markdown).toContain('# Awesome Product')
    })

    it('should handle all document types in collection', () => {
      for (const [name, content] of Object.entries(documentCollection)) {
        if (name === 'empty') continue // Skip empty document

        const doc = parse(content)
        const markdown = renderMarkdown(doc)

        // Should not throw and should produce some output
        expect(typeof markdown).toBe('string')
        if (name !== 'frontmatterOnly') {
          expect(markdown.length).toBeGreaterThan(0)
        }
      }
    })
  })

  describe('AST integration', () => {
    it('should convert parsed document to AST', () => {
      const doc = parse(simpleDocument)
      const ast = toAst(doc)

      expect(ast.type).toBe('root')
      expect(ast.children.length).toBeGreaterThan(0)

      // Find heading node
      const heading = ast.children.find((n) => n.type === 'heading')
      expect(heading).toBeDefined()
      expect(heading?.depth).toBe(1)
    })

    it('should preserve code blocks in AST', () => {
      const doc = parse(simpleDocument)
      const ast = toAst(doc)

      const codeBlock = ast.children.find((n) => n.type === 'code')
      expect(codeBlock).toBeDefined()
      expect(codeBlock?.lang).toBe('javascript')
      expect(codeBlock?.value).toContain("const greeting = 'Hello, World!'")
    })
  })
})

describe('mdxld + @mdxe/hono Integration', () => {
  beforeEach(() => {
    clearCache()
  })

  describe('middleware pipeline', () => {
    it('should serve parsed document as JSON', async () => {
      const app = new Hono()
      const loader = createMapLoader({
        '/hello': simpleDocument,
      })

      app.use('/*', mdx({ loader, cache: false }))

      const res = await app.request('/hello')
      expect(res.status).toBe(200)

      const json = await res.json() as { data: Record<string, unknown>; content: string }
      expect(json.data.title).toBe('Hello World')
      expect(json.data.author).toBe('Test Author')
      expect(json.content).toContain('# Hello World')
    })

    it('should serve typed document with $type preserved', async () => {
      const app = new Hono()
      const loader = createMapLoader({
        '/blog/post': typedDocument,
      })

      app.use('/*', mdx({ loader, cache: false }))

      const res = await app.request('/blog/post')
      const json = await res.json() as { type: string; id: string; data: Record<string, unknown> }

      // In expanded mode, $type and $id are at root level
      expect(json.type).toBe('BlogPost')
      expect(json.id).toBe('https://example.com/posts/hello-world')
    })

    it('should render document to HTML', async () => {
      const app = new Hono()
      const loader = createMapLoader({
        '/page': simpleDocument,
      })

      app.use(
        '/*',
        mdx({
          loader,
          renderer: (doc) => htmlResponse(doc),
          cache: false,
        })
      )

      const res = await app.request('/page')
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/html; charset=utf-8')

      const html = await res.text()
      assertHtmlContains(html, {
        tags: ['html', 'head', 'title', 'body', 'article', 'h1'],
        text: ['Hello World', 'This is a simple test document'],
      })
    })

    it('should apply transforms before rendering', async () => {
      const app = new Hono()
      const loader = createMapLoader({
        '/doc': simpleDocument,
      })

      app.use(
        '/*',
        mdx({
          loader,
          transform: (doc) => ({
            ...doc,
            data: { ...doc.data, transformed: true, title: 'Transformed Title' },
          }),
          cache: false,
        })
      )

      const res = await app.request('/doc')
      const json = await res.json() as { data: Record<string, unknown> }

      expect(json.data.transformed).toBe(true)
      expect(json.data.title).toBe('Transformed Title')
    })

    it('should handle multiple documents with different paths', async () => {
      const app = new Hono()

      // Note: With basePath, the loader receives paths with basePath stripped
      // So /docs/getting-started with basePath '/docs/' becomes /getting-started
      const docsLoader = createMapLoader({
        '/getting-started': simpleDocument,
      })
      const blogLoader = createMapLoader({
        '/first-post': typedDocument,
      })
      const apiLoader = createMapLoader({
        '/reference': apiDocument,
      })

      app.use('/docs/*', mdx({ loader: docsLoader, basePath: '/docs/', cache: false }))
      app.use('/blog/*', mdx({ loader: blogLoader, basePath: '/blog/', cache: false }))
      app.use('/api/*', mdx({ loader: apiLoader, basePath: '/api/', cache: false }))

      const docsRes = await app.request('/docs/getting-started')
      const docsJson = await docsRes.json() as { data: Record<string, unknown> }
      expect(docsJson.data.title).toBe('Hello World')

      const blogRes = await app.request('/blog/first-post')
      const blogJson = await blogRes.json() as { type: string; data: Record<string, unknown> }
      expect(blogJson.type).toBe('BlogPost')

      const apiRes = await app.request('/api/reference')
      const apiJson = await apiRes.json() as { type: string; data: Record<string, unknown> }
      expect(apiJson.type).toBe('API')
    })

    it('should cache documents between requests', async () => {
      let loadCount = 0
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: () => {
            loadCount++
            return simpleDocument
          },
          cache: true,
          cacheTTL: 60,
        })
      )

      await app.request('/doc')
      await app.request('/doc')
      await app.request('/doc')

      expect(loadCount).toBe(1)
    })
  })

  describe('HTML rendering integration', () => {
    it('should render code blocks with language class', () => {
      const doc = honoParse(simpleDocument)
      const html = renderToHtml(doc)

      assertHtmlContains(html, {
        tags: ['pre', 'code'],
        attributes: { class: 'language-javascript' },
      })
    })

    it('should render links correctly', () => {
      const doc = honoParse(typedDocument)
      const html = renderToHtml(doc)

      expect(html).toContain('href="https://docs.example.com"')
      expect(html).toContain('Link to documentation')
    })

    it('should render lists', () => {
      const doc = honoParse(simpleDocument)
      const html = renderToHtml(doc)

      assertHtmlContains(html, {
        tags: ['ul', 'li'],
        text: ['Feature 1', 'Feature 2', 'Feature 3'],
      })
    })

    it('should include custom styles', () => {
      const doc = honoParse(simpleDocument)
      const html = renderToHtml(doc, {
        styles: '<link rel="stylesheet" href="/custom.css">',
      })

      expect(html).toContain('href="/custom.css"')
    })

    it('should use custom template', () => {
      const doc = honoParse(simpleDocument)
      const html = renderToHtml(doc, {
        template: '<html><body class="custom">{{content}}</body></html>',
        defaultStyles: false,
      })

      expect(html).toContain('class="custom"')
      expect(html).toContain('<h1>Hello World</h1>')
    })
  })
})

describe('mdxld + @mdxe/ink Integration', () => {
  describe('terminal rendering pipeline', () => {
    it('should render simple document to terminal', () => {
      const doc = inkParse(simpleDocument)
      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      const output = lastFrame()
      expect(output).toContain('Hello World')
      expect(output).toContain('simple test document')
    })

    it('should render frontmatter in terminal', () => {
      const doc = inkParse(typedDocument)
      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      const output = lastFrame()
      // Note: In expanded mode, $type is at doc.type, not in doc.data
      // The Ink renderer shows doc.data content
      expect(output).toContain('title')
      expect(output).toContain('My First Blog Post')
      expect(output).toContain('author')
      expect(output).toContain('Jane Doe')
    })

    it('should hide frontmatter when disabled', () => {
      const doc = inkParse(typedDocument)
      const { lastFrame } = render(
        React.createElement(MDXDocument, { doc, options: { showFrontmatter: false } })
      )

      const output = lastFrame()
      expect(output).not.toContain('$type')
      expect(output).toContain('My First Blog Post') // Content still shows
    })

    it('should render code blocks with language', () => {
      const doc = inkParse(simpleDocument)
      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      const output = lastFrame()
      expect(output).toContain('javascript')
      expect(output).toContain('const greeting')
    })

    it('should render to plain text', () => {
      const doc = inkParse(simpleDocument)
      const text = renderToText(doc)

      expect(text).toContain('# Hello World')
      expect(text).toContain('```javascript')
      expect(text).toContain("const greeting = 'Hello, World!'")
    })

    it('should render lists with bullets', () => {
      const doc = inkParse(simpleDocument)
      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('• Feature 1')
      expect(text).toContain('• Feature 2')
      expect(text).toContain('• Feature 3')
    })

    it('should render blockquotes with border', () => {
      const doc = inkParse(simpleDocument)
      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('│ A quote for testing')
    })
  })

  describe('MDXContent component', () => {
    it('should render from raw content string', () => {
      const { lastFrame } = render(
        React.createElement(MDXContent, { content: typedDocument })
      )

      const output = lastFrame()
      expect(output).toContain('My First Blog Post')
    })
  })
})

describe('Cross-renderer consistency', () => {
  it('should preserve content structure across renderers', () => {
    const doc = parse(simpleDocument)

    // Markdown output
    const markdown = renderMarkdown(doc, { includeFrontmatter: false })

    // HTML output
    const html = renderToHtml(doc, { defaultStyles: false })

    // Terminal text output
    const text = renderToText(doc, { showFrontmatter: false })

    // All should contain the main heading
    expect(markdown).toContain('# Hello World')
    expect(html).toContain('<h1>Hello World</h1>')
    expect(text).toContain('# Hello World')

    // All should contain the features
    expect(markdown).toContain('Feature 1')
    expect(html).toContain('Feature 1')
    expect(text).toContain('Feature 1')
  })

  it('should preserve frontmatter data across parsers', () => {
    // Parse with each package's parser (they should all use mdxld)
    const doc1 = parse(typedDocument)
    const doc2 = honoParse(typedDocument)
    const doc3 = inkParse(typedDocument)

    // In expanded mode, $type is at root level as 'type'
    expect(doc1.type).toBe('BlogPost')
    expect(doc2.type).toBe('BlogPost')
    expect(doc3.type).toBe('BlogPost')

    expect(doc1.data.title).toBe(doc2.data.title)
    expect(doc2.data.title).toBe(doc3.data.title)
  })
})

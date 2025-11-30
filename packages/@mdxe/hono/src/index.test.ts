import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import {
  mdx,
  renderToHtml,
  htmlResponse,
  jsonResponse,
  createMapLoader,
  parseContentPath,
  clearCache,
  parse,
} from './index.js'

describe('@mdxe/hono', () => {
  beforeEach(() => {
    clearCache()
  })

  describe('mdx middleware', () => {
    it('should serve MDX content as JSON by default', async () => {
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: (path) => {
            if (path === '/hello') {
              return `---
title: Hello
---

# Hello World`
            }
            return null
          },
          cache: false,
        })
      )

      const res = await app.request('/hello')
      expect(res.status).toBe(200)

      const json = (await res.json()) as { data: { title: string }; content: string }
      expect(json.data.title).toBe('Hello')
      expect(json.content).toContain('# Hello World')
    })

    it('should use custom renderer', async () => {
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: () => '# Test',
          renderer: (doc, c) => c.text(`Title: ${doc.content}`),
          cache: false,
        })
      )

      const res = await app.request('/any')
      const text = await res.text()
      expect(text).toBe('Title: # Test')
    })

    it('should return 404 for non-existent content', async () => {
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: () => null,
          cache: false,
        })
      )

      app.notFound((c) => c.text('Not Found', 404))

      const res = await app.request('/missing')
      expect(res.status).toBe(404)
    })

    it('should apply transform function', async () => {
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: () => `---
title: Original
---

Content`,
          transform: (doc) => ({
            ...doc,
            data: { ...doc.data, title: 'Transformed' },
          }),
          cache: false,
        })
      )

      const res = await app.request('/test')
      const json = (await res.json()) as { data: { title: string } }
      expect(json.data.title).toBe('Transformed')
    })

    it('should cache content', async () => {
      let loadCount = 0
      const app = new Hono()

      app.use(
        '/*',
        mdx({
          loader: () => {
            loadCount++
            return '# Test'
          },
          cache: true,
          cacheTTL: 60,
        })
      )

      await app.request('/test')
      await app.request('/test')

      expect(loadCount).toBe(1)
    })

    it('should respect basePath', async () => {
      const app = new Hono()

      app.use(
        '/docs/*',
        mdx({
          loader: (path) => `# Doc: ${path}`,
          basePath: '/docs/',
          cache: false,
        })
      )

      const res = await app.request('/docs/getting-started')
      const json = (await res.json()) as { content: string }
      expect(json.content).toContain('getting-started')
    })
  })

  describe('renderToHtml', () => {
    it('should render document to HTML', () => {
      const doc = parse(`---
title: Test Page
---

# Hello World

This is a paragraph.`)

      const html = renderToHtml(doc)

      expect(html).toContain('<!DOCTYPE html>')
      expect(html).toContain('<title>Test Page</title>')
      expect(html).toContain('<h1>Hello World</h1>')
      expect(html).toContain('This is a paragraph')
    })

    it('should include default styles', () => {
      const doc = parse('# Test')
      const html = renderToHtml(doc)
      expect(html).toContain('<style>')
      expect(html).toContain('.mdx-content')
    })

    it('should exclude default styles when disabled', () => {
      const doc = parse('# Test')
      const html = renderToHtml(doc, { defaultStyles: false })
      expect(html).not.toContain('.mdx-content {')
    })

    it('should use custom template', () => {
      const doc = parse(`---
title: Custom
---

Content`)

      const html = renderToHtml(doc, {
        template: '<html><head><title>{{title}}</title></head><body>{{content}}</body></html>',
        defaultStyles: false,
      })

      expect(html).toContain('<title>Custom</title>')
      expect(html).toContain('<p>Content')
      expect(html).toContain('</p>')
    })

    it('should render code blocks', () => {
      const doc = parse('```javascript\nconst x = 1;\n```')
      const html = renderToHtml(doc)
      expect(html).toContain('<pre><code class="language-javascript">')
      expect(html).toContain('const x = 1;')
    })

    it('should render inline formatting', () => {
      const doc = parse('This is **bold** and *italic* and `code`.')
      const html = renderToHtml(doc)
      expect(html).toContain('<strong>bold</strong>')
      expect(html).toContain('<em>italic</em>')
      expect(html).toContain('<code>code</code>')
    })

    it('should render links', () => {
      const doc = parse('[Click here](https://example.com)')
      const html = renderToHtml(doc)
      expect(html).toContain('<a href="https://example.com">Click here</a>')
    })

    it('should render lists', () => {
      const doc = parse('- Item 1\n- Item 2')
      const html = renderToHtml(doc)
      expect(html).toContain('<ul>')
      expect(html).toContain('<li>Item 1</li>')
      expect(html).toContain('<li>Item 2</li>')
    })

    it('should render blockquotes', () => {
      const doc = parse('> This is a quote')
      const html = renderToHtml(doc)
      expect(html).toContain('<blockquote>')
    })

    it('should add custom head content', () => {
      const doc = parse('# Test')
      const html = renderToHtml(doc, {
        head: '<meta name="author" content="John">',
      })
      expect(html).toContain('<meta name="author" content="John">')
    })

    it('should add custom styles', () => {
      const doc = parse('# Test')
      const html = renderToHtml(doc, {
        styles: '<link rel="stylesheet" href="/custom.css">',
      })
      expect(html).toContain('<link rel="stylesheet" href="/custom.css">')
    })
  })

  describe('htmlResponse', () => {
    it('should create HTML response', () => {
      const doc = parse('# Test')
      const response = htmlResponse(doc)

      expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8')
    })
  })

  describe('jsonResponse', () => {
    it('should create JSON response', async () => {
      const doc = parse('# Test')
      const response = jsonResponse(doc)

      expect(response.headers.get('Content-Type')).toBe('application/json')

      const json = (await response.json()) as { content: string }
      expect(json.content).toContain('# Test')
    })
  })

  describe('createMapLoader', () => {
    it('should load content from map', () => {
      const loader = createMapLoader({
        '/index': '# Home',
        '/about': '# About',
      })

      expect(loader('/index')).toBe('# Home')
      expect(loader('/about')).toBe('# About')
      expect(loader('/missing')).toBeNull()
    })

    it('should fallback to /index for directories', () => {
      const loader = createMapLoader({
        '/docs/index': '# Docs',
      })

      expect(loader('/docs')).toBe('# Docs')
    })
  })

  describe('parseContentPath', () => {
    it('should strip base path', () => {
      expect(parseContentPath('/docs/hello', '/docs/')).toBe('/hello')
    })

    it('should strip extension', () => {
      expect(parseContentPath('/hello.mdx')).toBe('/hello')
    })

    it('should handle root path', () => {
      expect(parseContentPath('/')).toBe('/index')
    })

    it('should ensure leading slash', () => {
      expect(parseContentPath('hello')).toBe('/hello')
    })

    it('should handle complex paths', () => {
      expect(parseContentPath('/docs/api/users.mdx', '/docs/', '.mdx')).toBe('/api/users')
    })
  })

  describe('cache management', () => {
    it('should clear all cache', async () => {
      const app = new Hono()
      let loadCount = 0

      app.use(
        '/*',
        mdx({
          loader: () => {
            loadCount++
            return '# Test'
          },
          cache: true,
        })
      )

      await app.request('/test')
      clearCache()
      await app.request('/test')

      expect(loadCount).toBe(2)
    })
  })
})

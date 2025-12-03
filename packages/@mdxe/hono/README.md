# @mdxe/hono

Hono middleware for serving MDX content with automatic HTML rendering, caching, and content negotiation.

## Installation

```bash
npm install @mdxe/hono
# or
pnpm add @mdxe/hono
# or
yarn add @mdxe/hono
```

## Features

- **MDX Middleware** - Serve MDX files as HTML or JSON
- **Content Negotiation** - Automatic format based on Accept header
- **Caching** - Built-in ETag and Cache-Control support
- **HTML Rendering** - Server-side HTML generation from MDX
- **Frontmatter Support** - MDXLD metadata in responses
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { Hono } from 'hono'
import { mdx, htmlResponse } from '@mdxe/hono'
import { parse } from 'mdxld'

const app = new Hono()

// Serve MDX from filesystem
app.use('/docs/*', mdx({
  root: './content',
  cache: true
}))

// Serve individual MDX document
app.get('/page', (c) => {
  const doc = parse(`---
title: Hello World
---

# Welcome

This is MDX content.`)

  return htmlResponse(doc, {
    title: doc.data.title,
    styles: ['https://cdn.example.com/styles.css']
  })
})

export default app
```

## API Reference

### `mdx(options)`

Create Hono middleware for serving MDX content.

```typescript
function mdx<E extends Env = Env>(options: MDXMiddlewareOptions): MiddlewareHandler<E>

interface MDXMiddlewareOptions {
  root?: string              // Root directory for MDX files
  cache?: boolean            // Enable caching (default: true)
  maxAge?: number            // Cache max-age in seconds (default: 3600)
  transform?: (doc: MDXLDDocument) => MDXLDDocument  // Transform before render
  render?: RenderOptions     // HTML rendering options
}
```

**Example:**

```typescript
import { Hono } from 'hono'
import { mdx } from '@mdxe/hono'

const app = new Hono()

app.use('/docs/*', mdx({
  root: './docs',
  cache: true,
  maxAge: 3600,
  transform: (doc) => ({
    ...doc,
    data: {
      ...doc.data,
      generatedAt: new Date().toISOString()
    }
  }),
  render: {
    styles: ['/styles/docs.css'],
    scripts: ['/js/docs.js']
  }
}))
```

### `renderToHtml(doc, options?)`

Render an MDXLD document to HTML string.

```typescript
function renderToHtml(doc: MDXLDDocument, options?: RenderOptions): string

interface RenderOptions {
  title?: string              // Page title (defaults to doc.data.title)
  description?: string        // Meta description
  styles?: string[]           // CSS URLs to include
  scripts?: string[]          // Script URLs to include
  head?: string               // Additional head HTML
  wrapper?: string            // Wrapper element class
  lang?: string               // HTML lang attribute (default: 'en')
}
```

**Example:**

```typescript
import { renderToHtml } from '@mdxe/hono'
import { parse } from 'mdxld'

const doc = parse(`---
title: My Page
description: A sample page
---

# Hello World

Content here.`)

const html = renderToHtml(doc, {
  title: doc.data.title,
  description: doc.data.description,
  styles: [
    'https://cdn.jsdelivr.net/npm/water.css@2/out/water.css',
    '/custom.css'
  ],
  scripts: ['/analytics.js'],
  head: '<link rel="icon" href="/favicon.ico">',
  wrapper: 'article',
  lang: 'en'
})
```

### `htmlResponse(doc, options?)`

Create an HTML Response from an MDXLD document.

```typescript
function htmlResponse(doc: MDXLDDocument, options?: RenderOptions): Response
```

**Example:**

```typescript
import { Hono } from 'hono'
import { htmlResponse } from '@mdxe/hono'
import { parse } from 'mdxld'

const app = new Hono()

app.get('/page/:slug', async (c) => {
  const slug = c.req.param('slug')
  const content = await Bun.file(`./content/${slug}.mdx`).text()
  const doc = parse(content)

  return htmlResponse(doc, {
    title: doc.data.title,
    styles: ['/styles.css']
  })
})
```

### `jsonResponse(doc)`

Create a JSON Response from an MDXLD document.

```typescript
function jsonResponse(doc: MDXLDDocument): Response
```

**Example:**

```typescript
import { Hono } from 'hono'
import { jsonResponse } from '@mdxe/hono'
import { parse } from 'mdxld'

const app = new Hono()

app.get('/api/page/:slug', async (c) => {
  const content = await getContent(c.req.param('slug'))
  const doc = parse(content)
  return jsonResponse(doc)
})
```

### Content Negotiation

The middleware automatically handles content negotiation based on the Accept header:

```typescript
import { Hono } from 'hono'
import { mdx } from '@mdxe/hono'

const app = new Hono()

app.use('/docs/*', mdx({ root: './docs' }))

// GET /docs/intro with Accept: text/html → HTML response
// GET /docs/intro with Accept: application/json → JSON response
```

## HTML Output

The `renderToHtml` function generates a complete HTML document:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Page Title</title>
  <meta name="description" content="Page description">
  <link rel="stylesheet" href="/styles.css">
  <!-- Additional head content -->
</head>
<body>
  <article class="wrapper">
    <!-- Rendered MDX content -->
  </article>
  <script src="/script.js"></script>
</body>
</html>
```

## Caching

The middleware supports ETag-based caching:

```typescript
app.use('/docs/*', mdx({
  root: './docs',
  cache: true,
  maxAge: 3600  // 1 hour
}))
```

This adds the following headers:

```
Cache-Control: public, max-age=3600
ETag: "abc123..."
```

Conditional requests with `If-None-Match` return 304 Not Modified when content hasn't changed.

## Examples

### Documentation Site

```typescript
import { Hono } from 'hono'
import { mdx } from '@mdxe/hono'
import { serveStatic } from 'hono/bun'

const app = new Hono()

// Serve static assets
app.use('/static/*', serveStatic({ root: './public' }))

// Serve MDX documentation
app.use('/docs/*', mdx({
  root: './docs',
  cache: true,
  render: {
    styles: ['/static/docs.css'],
    scripts: ['/static/docs.js'],
    head: `
      <link rel="icon" href="/static/favicon.ico">
      <meta property="og:site_name" content="My Docs">
    `
  }
}))

// Redirect root to docs
app.get('/', (c) => c.redirect('/docs/getting-started'))

export default app
```

### API with HTML and JSON

```typescript
import { Hono } from 'hono'
import { htmlResponse, jsonResponse } from '@mdxe/hono'
import { parse } from 'mdxld'

const app = new Hono()

app.get('/content/:slug', async (c) => {
  const content = await fetchContent(c.req.param('slug'))
  const doc = parse(content)

  const accept = c.req.header('Accept') || ''

  if (accept.includes('application/json')) {
    return jsonResponse(doc)
  }

  return htmlResponse(doc, {
    title: doc.data.title,
    styles: ['/styles.css']
  })
})
```

### With Database Backend

```typescript
import { Hono } from 'hono'
import { htmlResponse } from '@mdxe/hono'
import { createFsDatabase } from '@mdxdb/fs'

const app = new Hono()
const db = createFsDatabase({ root: './content' })

app.get('/page/:id', async (c) => {
  const doc = await db.get(c.req.param('id'))

  if (!doc) {
    return c.notFound()
  }

  return htmlResponse(doc, {
    title: doc.data.title,
    description: doc.data.description
  })
})
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  data: TData & {
    $id?: string
    $type?: string
    $context?: string | Record<string, unknown>
    [key: string]: unknown
  }
  content: string
}
```

### `RenderOptions`

```typescript
interface RenderOptions {
  title?: string
  description?: string
  styles?: string[]
  scripts?: string[]
  head?: string
  wrapper?: string
  lang?: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/next](https://www.npmjs.com/package/@mdxe/next) | Next.js integration |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers |
| [hono](https://www.npmjs.com/package/hono) | Web framework |

## License

MIT

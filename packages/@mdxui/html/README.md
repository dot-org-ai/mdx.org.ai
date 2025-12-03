# @mdxui/html

Render MDXLD documents to HTML strings. Server-side HTML generation from MDX content.

## Installation

```bash
npm install @mdxui/html
# or
pnpm add @mdxui/html
# or
yarn add @mdxui/html
```

## Features

- **HTML Rendering** - Convert MDXLD documents to HTML strings
- **SSR Support** - Server-side rendering with React
- **Full Documents** - Generate complete HTML documents with DOCTYPE
- **Custom Styles** - Inject CSS stylesheets and inline styles
- **Meta Tags** - Automatic meta tag generation from frontmatter
- **Component Mapping** - Map MDX components to HTML elements
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { toHTML, renderToHtml } from '@mdxui/html'

const doc = parse(`---
$type: BlogPost
title: Hello World
description: My first post
---

# Hello World

This is **bold** and *italic* text.

## Features

- Easy to use
- Fast rendering
- Type-safe

[Learn more](https://example.com)
`)

// Full rendering with metadata
const result = await toHTML(doc, {
  styles: ['https://cdn.example.com/styles.css'],
  pretty: true,
})

console.log(result.html)        // Full HTML document
console.log(result.title)       // "Hello World"
console.log(result.description) // "My first post"

// Just the HTML string
const html = await renderToHtml(doc)
```

## API Reference

### `toHTML(doc, options?)`

Render an MDXLD document to HTML with full metadata.

```typescript
function toHTML(
  doc: MDXLDDocument,
  options?: HTMLRenderOptions
): Promise<HTMLOutput>

interface HTMLRenderOptions {
  fullDocument?: boolean   // Include DOCTYPE/html (default: true)
  pretty?: boolean         // Pretty print HTML (default: false)
  styles?: string[]        // CSS stylesheet URLs
  inlineStyles?: string    // Inline CSS
  scripts?: string[]       // JavaScript URLs
  wrapper?: string | React.ComponentType  // Wrapper element
  components?: Record<string, React.ComponentType>  // Component mapping
  syntaxHighlight?: boolean  // Code highlighting
  title?: string           // Override title
  meta?: Record<string, string>  // Additional meta tags
  baseUrl?: string         // Base URL for relative links
}

interface HTMLOutput {
  html: string             // Rendered HTML
  title?: string           // Document title
  description?: string     // Meta description
  meta: Record<string, string>  // All meta tags
}
```

### `renderToHtml(doc, options?)`

Convenience function to get just the HTML string.

```typescript
const html = await renderToHtml(doc)
```

### `renderToStaticHtml(doc, options?)`

Render without React hydration attributes.

```typescript
const html = await renderToStaticHtml(doc)
```

### `createHTMLComponent(render)`

Create a React component from an HTML render function.

```typescript
const MyComponent = createHTMLComponent((props) => {
  return `<div>${props.content}</div>`
})
```

## Examples

### Blog Post

```typescript
import { parse } from 'mdxld'
import { toHTML } from '@mdxui/html'

const post = parse(`---
$type: BlogPost
title: Getting Started with MDX
description: Learn how to use MDX in your projects
author: Jane Doe
date: 2024-03-15
---

# Getting Started with MDX

MDX allows you to use JSX in your markdown content.

## Installation

\`\`\`bash
npm install mdxld @mdxui/html
\`\`\`

## Usage

Write your content in MDX format with YAML frontmatter.
`)

const { html, title, description } = await toHTML(post, {
  styles: ['/styles/blog.css'],
  meta: {
    'og:type': 'article',
    'twitter:card': 'summary_large_image',
  },
  pretty: true,
})
```

### Static Site Generation

```typescript
import { toHTML } from '@mdxui/html'
import { readdir } from 'fs/promises'

async function buildSite(contentDir: string, outputDir: string) {
  const files = await readdir(contentDir)

  for (const file of files) {
    if (!file.endsWith('.mdx')) continue

    const content = await Bun.file(`${contentDir}/${file}`).text()
    const doc = parse(content)

    const { html } = await toHTML(doc, {
      styles: ['/styles/main.css'],
      scripts: ['/scripts/main.js'],
      wrapper: 'main',
    })

    const outputPath = `${outputDir}/${file.replace('.mdx', '.html')}`
    await Bun.write(outputPath, html)
  }
}
```

### With Custom Components

```typescript
const html = await toHTML(doc, {
  components: {
    Button: ({ children, href }) => (
      <a href={href} className="btn">{children}</a>
    ),
    Card: ({ title, children }) => (
      <div className="card">
        <h3>{title}</h3>
        {children}
      </div>
    ),
  },
})
```

### Content Only (No Document Wrapper)

```typescript
const { html } = await toHTML(doc, {
  fullDocument: false,
  wrapper: 'article',
})

// Use in a layout
const page = `
<!DOCTYPE html>
<html>
<head>...</head>
<body>
  <header>...</header>
  ${html}
  <footer>...</footer>
</body>
</html>
`
```

## Markdown Support

The renderer supports standard markdown syntax:

| Syntax | Output |
|--------|--------|
| `# Heading` | `<h1>` |
| `**bold**` | `<strong>` |
| `*italic*` | `<em>` |
| `[link](url)` | `<a>` |
| `![alt](src)` | `<img>` |
| `` `code` `` | `<code>` |
| ```` ```lang ```` | `<pre><code>` |
| `> quote` | `<blockquote>` |
| `---` | `<hr>` |
| `- item` | `<ul><li>` |

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}
```

### `HTMLOutput`

```typescript
interface HTMLOutput {
  html: string
  title?: string
  description?: string
  meta: Record<string, string>
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxui/json](https://www.npmjs.com/package/@mdxui/json) | JSON output |
| [@mdxui/markdown](https://www.npmjs.com/package/@mdxui/markdown) | Markdown output |
| [@mdxe/hono](https://www.npmjs.com/package/@mdxe/hono) | Hono middleware |

## License

MIT

/**
 * @mdxe/hono - Serve and render MDXLD documents with Hono
 *
 * Provides middleware, helpers, and utilities for serving MDX content
 * with the Hono web framework.
 *
 * @packageDocumentation
 */

import type { Context, MiddlewareHandler, Env } from 'hono'
import { parse, stringify, type MDXLDDocument, type MDXLDData } from 'mdxld'

/**
 * Options for MDX middleware
 */
export interface MDXMiddlewareOptions {
  /**
   * Function to load MDX content for a given path
   */
  loader: (path: string) => Promise<string | null> | string | null

  /**
   * Transform document before rendering
   */
  transform?: (doc: MDXLDDocument) => MDXLDDocument | Promise<MDXLDDocument>

  /**
   * Custom renderer function
   * If not provided, returns JSON representation
   */
  renderer?: (doc: MDXLDDocument, c: Context) => Response | Promise<Response>

  /**
   * Base path for MDX routes
   * @default '/'
   */
  basePath?: string

  /**
   * File extension to strip from paths
   * @default '.mdx'
   */
  extension?: string

  /**
   * Enable caching
   * @default true
   */
  cache?: boolean

  /**
   * Cache TTL in seconds
   * @default 3600
   */
  cacheTTL?: number
}

/**
 * Options for rendering MDX to HTML
 */
export interface RenderOptions {
  /**
   * HTML template wrapper
   * Use {{content}} as placeholder for rendered content
   * Use {{title}}, {{description}}, etc. for frontmatter values
   */
  template?: string

  /**
   * CSS styles to include
   */
  styles?: string

  /**
   * Additional head content
   */
  head?: string

  /**
   * Include default styling
   * @default true
   */
  defaultStyles?: boolean
}

/**
 * Simple in-memory cache
 */
const cache = new Map<string, { doc: MDXLDDocument; expires: number }>()

/**
 * Default HTML template
 */
const defaultTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{title}}</title>
  {{head}}
  {{styles}}
</head>
<body>
  <article class="mdx-content">
    {{content}}
  </article>
</body>
</html>`

/**
 * Default CSS styles
 */
const defaultStyles = `
<style>
  .mdx-content {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
  }
  .mdx-content h1, .mdx-content h2, .mdx-content h3 {
    margin-top: 2rem;
    margin-bottom: 1rem;
  }
  .mdx-content pre {
    background: #f4f4f4;
    padding: 1rem;
    overflow-x: auto;
    border-radius: 4px;
  }
  .mdx-content code {
    font-family: ui-monospace, monospace;
  }
  .mdx-content blockquote {
    border-left: 4px solid #ddd;
    margin: 1rem 0;
    padding-left: 1rem;
    color: #666;
  }
</style>
`

/**
 * Create MDX middleware for Hono
 *
 * @param options - Middleware options
 * @returns Hono middleware handler
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { mdx } from '@mdxe/hono'
 *
 * const app = new Hono()
 *
 * app.use('/docs/*', mdx({
 *   loader: async (path) => {
 *     // Load MDX content from filesystem, KV, etc.
 *     return await readFile(`./content${path}.mdx`, 'utf-8')
 *   },
 *   renderer: (doc, c) => {
 *     return c.html(renderToHtml(doc))
 *   }
 * }))
 * ```
 */
export function mdx<E extends Env = Env>(options: MDXMiddlewareOptions): MiddlewareHandler<E> {
  const {
    loader,
    transform,
    renderer,
    basePath = '/',
    extension = '.mdx',
    cache: useCache = true,
    cacheTTL = 3600,
  } = options

  return async (c, next) => {
    const path = c.req.path

    // Check if path matches basePath
    const normalizedBasePath = basePath.endsWith('/') ? basePath.slice(0, -1) : basePath
    if (normalizedBasePath && !path.startsWith(normalizedBasePath)) {
      return next()
    }

    // Get content path
    let contentPath = normalizedBasePath ? path.slice(normalizedBasePath.length) : path
    if (!contentPath || contentPath === '/') {
      contentPath = '/index'
    }
    const normalizedPath = contentPath.endsWith(extension) ? contentPath.slice(0, -extension.length) : contentPath

    // Check cache
    if (useCache) {
      const cached = cache.get(normalizedPath)
      if (cached && cached.expires > Date.now()) {
        const doc = transform ? await transform(cached.doc) : cached.doc
        if (renderer) {
          return renderer(doc, c as unknown as Context)
        }
        return c.json(doc)
      }
    }

    // Load content
    const content = await loader(normalizedPath)
    if (!content) {
      return next()
    }

    // Parse document
    let doc = parse(content)

    // Cache
    if (useCache) {
      cache.set(normalizedPath, {
        doc,
        expires: Date.now() + cacheTTL * 1000,
      })
    }

    // Transform
    if (transform) {
      doc = await transform(doc)
    }

    // Render
    if (renderer) {
      return renderer(doc, c as unknown as Context)
    }

    // Default: return JSON
    return c.json(doc)
  }
}

/**
 * Convert MDX content to simple HTML
 *
 * This is a lightweight converter that handles basic markdown.
 * For full MDX support, use a proper MDX compiler.
 */
function contentToHtml(content: string): string {
  let html = content

  // Use unique placeholders that won't be matched by markdown patterns
  const codeBlocks: string[] = []
  const inlineCodes: string[] = []

  // Code blocks (before other processing to preserve content)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const langAttr = lang ? ` class="language-${lang}"` : ''
    const escaped = code.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = `\x00CB${codeBlocks.length}\x00`
    codeBlocks.push(`<pre><code${langAttr}>${escaped}</code></pre>`)
    return placeholder
  })

  // Inline code (before escaping)
  html = html.replace(/`([^`]+)`/g, (_, code) => {
    const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const placeholder = `\x00IC${inlineCodes.length}\x00`
    inlineCodes.push(`<code>${escaped}</code>`)
    return placeholder
  })

  // Blockquotes (before escaping >)
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  // Now escape remaining HTML entities
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Restore blockquotes
  html = html.replace(/&lt;blockquote&gt;/g, '<blockquote>')
  html = html.replace(/&lt;\/blockquote&gt;/g, '</blockquote>')

  // Headings
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')

  // Horizontal rules
  html = html.replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr>')

  // Unordered lists
  html = html.replace(/^[-*+] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Restore code blocks and inline code
  codeBlocks.forEach((block, i) => {
    html = html.replace(`\x00CB${i}\x00`, block)
  })
  inlineCodes.forEach((code, i) => {
    html = html.replace(`\x00IC${i}\x00`, code)
  })

  // Paragraphs (lines not already wrapped)
  const lines = html.split('\n')
  const result: string[] = []
  let inParagraph = false

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      continue
    }

    // Skip if already has block-level element
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<pre') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('<li') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('</ul') ||
      trimmed.startsWith('</ol') ||
      trimmed.startsWith('</blockquote')
    ) {
      if (inParagraph) {
        result.push('</p>')
        inParagraph = false
      }
      result.push(line)
      continue
    }

    if (!inParagraph) {
      result.push('<p>' + line)
      inParagraph = true
    } else {
      result.push(' ' + trimmed)
    }
  }

  if (inParagraph) {
    result.push('</p>')
  }

  return result.join('\n')
}

/**
 * Render MDXLD document to HTML string
 *
 * @param doc - MDXLD document
 * @param options - Render options
 * @returns HTML string
 *
 * @example
 * ```ts
 * const html = renderToHtml(doc, {
 *   template: customTemplate,
 *   styles: '<link rel="stylesheet" href="/styles.css">'
 * })
 * ```
 */
export function renderToHtml(doc: MDXLDDocument, options: RenderOptions = {}): string {
  const { template = defaultTemplate, styles = '', head = '', defaultStyles: includeDefaults = true } = options

  const content = contentToHtml(doc.content)
  const title = (doc.data.title as string) || 'Untitled'
  const description = (doc.data.description as string) || ''

  let html = template
    .replace(/\{\{content\}\}/g, content)
    .replace(/\{\{title\}\}/g, escapeHtml(title))
    .replace(/\{\{description\}\}/g, escapeHtml(description))
    .replace(/\{\{head\}\}/g, head)
    .replace(/\{\{styles\}\}/g, (includeDefaults ? defaultStyles : '') + styles)

  // Replace any other frontmatter placeholders
  for (const [key, value] of Object.entries(doc.data)) {
    if (typeof value === 'string') {
      html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), escapeHtml(value))
    }
  }

  return html
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

/**
 * Create HTML response helper
 *
 * @param doc - MDXLD document
 * @param options - Render options
 * @returns Response object
 */
export function htmlResponse(doc: MDXLDDocument, options: RenderOptions = {}): Response {
  const html = renderToHtml(doc, options)
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  })
}

/**
 * Create JSON response with document
 *
 * @param doc - MDXLD document
 * @returns Response object
 */
export function jsonResponse(doc: MDXLDDocument): Response {
  return new Response(JSON.stringify(doc), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Create a document loader from a map of paths to content
 *
 * @param contentMap - Map of paths to MDX content strings
 * @returns Loader function
 *
 * @example
 * ```ts
 * const loader = createMapLoader({
 *   '/index': '# Welcome\n\nHello world!',
 *   '/about': '# About\n\nAbout us...',
 * })
 * ```
 */
export function createMapLoader(contentMap: Record<string, string>): (path: string) => string | null {
  return (path: string) => {
    return contentMap[path] || contentMap[path + '/index'] || null
  }
}

/**
 * Parse request path to content path
 *
 * @param reqPath - Request path
 * @param basePath - Base path to strip
 * @param extension - Extension to strip
 * @returns Normalized content path
 */
export function parseContentPath(reqPath: string, basePath = '/', extension = '.mdx'): string {
  let path = reqPath

  // Strip base path
  if (path.startsWith(basePath)) {
    path = path.slice(basePath.length)
  }

  // Strip extension
  if (path.endsWith(extension)) {
    path = path.slice(0, -extension.length)
  }

  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = '/' + path
  }

  // Handle empty path
  if (path === '/') {
    path = '/index'
  }

  return path
}

/**
 * Clear the document cache
 */
export function clearCache(): void {
  cache.clear()
}

/**
 * Remove a specific path from cache
 */
export function invalidateCache(path: string): boolean {
  return cache.delete(path)
}

// Re-export types from mdxld
export type { MDXLDDocument, MDXLDData } from 'mdxld'
export { parse, stringify } from 'mdxld'

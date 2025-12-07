/**
 * @mdxe/honox/server - Server utilities for HonoX + MDXLD
 *
 * Provides server-side utilities for creating HonoX apps with MDXLD support,
 * including route helpers, document loaders, and middleware.
 *
 * @packageDocumentation
 */

import type { Context, Env, MiddlewareHandler } from 'hono'
import { parse, type MDXLDDocument, type MDXLDData } from 'mdxld'
import type { CreateAppOptions, MDXLDRouteOptions, MDXLDContext } from './types.js'

/**
 * Simple in-memory cache for parsed documents
 */
const documentCache = new Map<string, { doc: MDXLDDocument; expires: number }>()

/**
 * Middleware to add MDXLD context to Hono context
 *
 * This middleware parses MDXLD documents and adds them to the context
 * for use in routes and renderers.
 *
 * @param options - Route options
 * @returns Hono middleware handler
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { mdxldMiddleware } from '@mdxe/honox/server'
 *
 * const app = new Hono()
 * app.use('/docs/*', mdxldMiddleware({
 *   loader: (path) => readFile(`./content${path}.mdx`, 'utf-8')
 * }))
 * ```
 */
export function mdxldMiddleware<E extends Env = Env>(options: MDXLDRouteOptions = {}): MiddlewareHandler<E> {
  const { transform, loader, cache = { enabled: true, ttl: 3600 } } = options

  return async (c, next) => {
    if (!loader) {
      return next()
    }

    const path = c.req.path

    // Check cache
    if (cache.enabled) {
      const cached = documentCache.get(path)
      if (cached && cached.expires > Date.now()) {
        const doc = transform ? await transform(cached.doc) : cached.doc
        c.set('mdxld' as never, { document: doc, path } as MDXLDContext as never)
        return next()
      }
    }

    // Load content
    const content = await loader(path)
    if (!content) {
      return next()
    }

    // Parse document
    let doc = parse(content)

    // Cache
    if (cache.enabled) {
      documentCache.set(path, {
        doc,
        expires: Date.now() + (cache.ttl || 3600) * 1000,
      })
    }

    // Transform
    if (transform) {
      doc = await transform(doc)
    }

    // Add to context
    c.set('mdxld' as never, { document: doc, path } as MDXLDContext as never)

    return next()
  }
}

/**
 * Get MDXLD document from Hono context
 *
 * @param c - Hono context
 * @returns MDXLD context or undefined
 */
export function getMdxldContext<E extends Env = Env>(c: Context<E>): MDXLDContext | undefined {
  return c.get('mdxld' as never) as MDXLDContext | undefined
}

/**
 * Create JSON-LD structured data from MDXLD document
 *
 * @param doc - MDXLD document
 * @param baseUrl - Base URL for @id generation
 * @returns JSON-LD object
 *
 * @example
 * ```ts
 * const jsonld = createJsonLd(doc, 'https://example.com')
 * // { "@context": "https://schema.org", "@type": "BlogPost", ... }
 * ```
 */
export function createJsonLd(doc: MDXLDDocument, baseUrl?: string): Record<string, unknown> {
  const jsonld: Record<string, unknown> = {}

  // Add context
  if (doc.context) {
    jsonld['@context'] = doc.context
  } else {
    jsonld['@context'] = 'https://schema.org'
  }

  // Add type
  if (doc.type) {
    jsonld['@type'] = doc.type
  }

  // Add id
  if (doc.id) {
    jsonld['@id'] = doc.id.startsWith('http') ? doc.id : baseUrl ? `${baseUrl}${doc.id}` : doc.id
  }

  // Add data properties
  for (const [key, value] of Object.entries(doc.data)) {
    // Skip internal properties
    if (key.startsWith('_')) continue

    jsonld[key] = value
  }

  return jsonld
}

/**
 * Create a route handler for MDXLD content
 *
 * This is a convenience function for creating routes that serve
 * MDXLD documents in various formats (HTML, JSON, JSON-LD).
 *
 * @param options - Route options
 * @returns Route handler function
 *
 * @example
 * ```ts
 * import { createMdxldRoute } from '@mdxe/honox/server'
 *
 * app.get('/api/posts/:slug', createMdxldRoute({
 *   loader: (path) => loadContent(path),
 *   format: 'jsonld'
 * }))
 * ```
 */
export function createMdxldRoute(
  options: MDXLDRouteOptions & {
    format?: 'json' | 'jsonld' | 'html'
    baseUrl?: string
  }
) {
  const { loader, transform, format = 'json', baseUrl } = options

  return async (c: Context) => {
    if (!loader) {
      return c.notFound()
    }

    const path = c.req.path
    const content = await loader(path)

    if (!content) {
      return c.notFound()
    }

    let doc = parse(content)

    if (transform) {
      doc = await transform(doc)
    }

    switch (format) {
      case 'jsonld':
        return c.json(createJsonLd(doc, baseUrl))

      case 'html':
        // Return simple HTML representation
        const html = `<!DOCTYPE html>
<html>
<head>
  <title>${escapeHtml((doc.data.title as string) || 'Untitled')}</title>
  ${
    doc.type
      ? `<script type="application/ld+json">${JSON.stringify(createJsonLd(doc, baseUrl))}</script>`
      : ''
  }
</head>
<body>
  <article>${doc.content}</article>
</body>
</html>`
        return c.html(html)

      case 'json':
      default:
        return c.json({
          type: doc.type,
          id: doc.id,
          context: doc.context,
          data: doc.data,
          content: doc.content,
        })
    }
  }
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/**
 * Clear the document cache
 */
export function clearDocumentCache(): void {
  documentCache.clear()
}

/**
 * Invalidate a specific path in the cache
 */
export function invalidateDocumentCache(path: string): boolean {
  return documentCache.delete(path)
}

/**
 * Load MDXLD documents from a glob pattern
 *
 * Useful for building content indexes or sitemaps.
 *
 * @param modules - Glob import result (e.g., from import.meta.glob)
 * @returns Array of MDXLD documents with paths
 *
 * @example
 * ```ts
 * const modules = import.meta.glob('./content/*.mdx', { eager: true, as: 'raw' })
 * const docs = loadMdxldModules(modules)
 * ```
 */
export function loadMdxldModules(modules: Record<string, string>): Array<{ path: string; document: MDXLDDocument }> {
  return Object.entries(modules).map(([path, content]) => ({
    path: path.replace(/\.mdx?$/, '').replace(/^\.\//, '/'),
    document: parse(content),
  }))
}

/**
 * Create a content index from MDXLD documents
 *
 * @param documents - Array of documents with paths
 * @param options - Index options
 * @returns Content index
 */
export function createContentIndex(
  documents: Array<{ path: string; document: MDXLDDocument }>,
  options: {
    sortBy?: keyof MDXLDData | ((doc: MDXLDDocument) => unknown)
    sortOrder?: 'asc' | 'desc'
    filter?: (doc: MDXLDDocument) => boolean
  } = {}
) {
  const { sortBy = 'title', sortOrder = 'asc', filter } = options

  let filtered = filter ? documents.filter(({ document }) => filter(document)) : documents

  if (sortBy) {
    filtered = filtered.sort((a, b) => {
      const aVal = typeof sortBy === 'function' ? sortBy(a.document) : a.document.data[sortBy]
      const bVal = typeof sortBy === 'function' ? sortBy(b.document) : b.document.data[sortBy]

      if (aVal === bVal) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const comparison = aVal < bVal ? -1 : 1
      return sortOrder === 'desc' ? -comparison : comparison
    })
  }

  return filtered.map(({ path, document }) => ({
    path,
    type: document.type,
    id: document.id,
    ...document.data,
  }))
}

// Re-export mdxld functions
export { parse, stringify } from 'mdxld'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

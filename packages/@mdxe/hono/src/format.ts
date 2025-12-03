/**
 * @mdxe/hono Format Utilities
 *
 * Extension-based content negotiation for MDX documents
 *
 * @packageDocumentation
 */

import type { Context, Next, MiddlewareHandler } from 'hono'
import type { MDXLDDocument } from 'mdxld'
import { stringify } from 'mdxld'

/**
 * Supported output formats
 */
export type OutputFormat = 'html' | 'json' | 'md' | 'txt' | 'xml'

/**
 * Format extensions mapping
 */
export const FORMAT_EXTENSIONS: Record<string, OutputFormat> = {
  '.html': 'html',
  '.json': 'json',
  '.md': 'md',
  '.mdx': 'md',
  '.txt': 'txt',
  '.xml': 'xml',
}

/**
 * Content types for each format
 */
export const FORMAT_CONTENT_TYPES: Record<OutputFormat, string> = {
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
  txt: 'text/plain; charset=utf-8',
  xml: 'application/xml; charset=utf-8',
}

/**
 * Parse format from URL path
 * Returns the format and the path without the format extension
 */
export function parseFormat(path: string): { format: OutputFormat | null; basePath: string } {
  // Check for format extensions at the end of the path
  for (const [ext, format] of Object.entries(FORMAT_EXTENSIONS)) {
    if (path.endsWith(ext)) {
      return {
        format,
        basePath: path.slice(0, -ext.length) || '/',
      }
    }
  }

  return { format: null, basePath: path }
}

/**
 * Get format from Accept header
 */
export function getFormatFromAccept(accept: string): OutputFormat | null {
  if (accept.includes('application/json')) return 'json'
  if (accept.includes('text/markdown')) return 'md'
  if (accept.includes('text/plain')) return 'txt'
  if (accept.includes('application/xml')) return 'xml'
  if (accept.includes('text/html')) return 'html'
  return null
}

/**
 * Context variables set by format middleware
 */
export interface FormatContext {
  /** Requested output format */
  outputFormat: OutputFormat
  /** Original path without format extension */
  basePath: string
  /** Whether format was explicitly requested via extension */
  explicitFormat: boolean
}

/**
 * Format negotiation middleware
 *
 * Sets c.get('format') with FormatContext
 * Rewrites URL to strip format extension for downstream routing
 */
export function formatMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const url = new URL(c.req.url)
    const { format: extFormat, basePath } = parseFormat(url.pathname)

    // Determine final format
    let outputFormat: OutputFormat = 'html' // default
    let explicitFormat = false

    if (extFormat) {
      // Extension takes precedence
      outputFormat = extFormat
      explicitFormat = true
    } else {
      // Check Accept header
      const accept = c.req.header('Accept') || ''
      const acceptFormat = getFormatFromAccept(accept)
      if (acceptFormat) {
        outputFormat = acceptFormat
      }
    }

    // Store format context
    c.set('format', {
      outputFormat,
      basePath,
      explicitFormat,
    } as FormatContext)

    // If extension was used, rewrite the path for routing
    if (explicitFormat && basePath !== url.pathname) {
      // Create a new URL with the base path
      const newUrl = new URL(c.req.url)
      newUrl.pathname = basePath

      // Update the request path by using Hono's path rewriting
      // We'll handle this in the route handler instead
    }

    await next()
  }
}

/**
 * Get format context from Hono context
 */
export function getFormat(c: Context): FormatContext {
  return c.get('format') || { outputFormat: 'html', basePath: c.req.path, explicitFormat: false }
}

/**
 * Render document in requested format
 */
export function renderDocument(
  doc: MDXLDDocument,
  format: OutputFormat,
  options?: {
    /** HTML renderer function */
    renderHtml?: (doc: MDXLDDocument) => string
    /** XML renderer function (for RSS/Atom) */
    renderXml?: (doc: MDXLDDocument) => string
  }
): { content: string; contentType: string } {
  const contentType = FORMAT_CONTENT_TYPES[format]

  switch (format) {
    case 'json':
      return {
        content: JSON.stringify(doc, null, 2),
        contentType,
      }

    case 'md':
      // Reconstruct the original MDX source
      return {
        content: stringify(doc),
        contentType,
      }

    case 'txt':
      // Plain text: just the content without frontmatter
      return {
        content: doc.content,
        contentType,
      }

    case 'xml':
      // Use custom XML renderer if provided, otherwise basic XML
      if (options?.renderXml) {
        return {
          content: options.renderXml(doc),
          contentType,
        }
      }
      // Basic XML representation
      return {
        content: documentToXml(doc),
        contentType,
      }

    case 'html':
    default:
      // Use custom HTML renderer if provided
      if (options?.renderHtml) {
        return {
          content: options.renderHtml(doc),
          contentType,
        }
      }
      // Basic HTML fallback
      return {
        content: `<!DOCTYPE html><html><head><title>${escapeXml(getTitle(doc))}</title></head><body>${doc.content}</body></html>`,
        contentType,
      }
  }
}

/**
 * Convert document to basic XML
 */
function documentToXml(doc: MDXLDDocument): string {
  const title = getTitle(doc)
  const description = doc.data.description || ''

  const typeStr = Array.isArray(doc.type) ? doc.type.join(', ') : doc.type

  return `<?xml version="1.0" encoding="UTF-8"?>
<document>
  <metadata>
    ${doc.id ? `<id>${escapeXml(doc.id)}</id>` : ''}
    ${typeStr ? `<type>${escapeXml(typeStr)}</type>` : ''}
    <title>${escapeXml(title)}</title>
    ${description ? `<description>${escapeXml(String(description))}</description>` : ''}
  </metadata>
  <content><![CDATA[${doc.content}]]></content>
</document>`
}

/**
 * Get title from document
 */
function getTitle(doc: MDXLDDocument): string {
  return String(doc.data.title || doc.data.name || 'Untitled')
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Create a format-aware response
 */
export function formatResponse(
  c: Context,
  doc: MDXLDDocument,
  options?: {
    renderHtml?: (doc: MDXLDDocument) => string
    renderXml?: (doc: MDXLDDocument) => string
  }
): Response {
  const { outputFormat } = getFormat(c)
  const { content, contentType } = renderDocument(doc, outputFormat, options)

  return new Response(content, {
    status: 200,
    headers: {
      'Content-Type': contentType,
    },
  })
}

/**
 * Check if a path should be handled by format middleware
 * Excludes static assets and special routes
 */
export function shouldHandleFormat(path: string): boolean {
  // Skip static assets
  if (path.startsWith('/styles/')) return false
  if (path.startsWith('/scripts/')) return false
  if (path.startsWith('/widgets')) return false
  if (path.startsWith('/_')) return false
  if (path === '/$.js' || path === '/$.css') return false
  if (path === '/robots.txt') return false
  if (path === '/sitemap.xml') return false
  if (path === '/llms.txt' || path === '/llms-full.txt') return false
  if (path === '/favicon.ico') return false

  return true
}

/**
 * Route matcher that handles format extensions
 *
 * Given a list of registered paths, finds the matching path
 * for a request that may have a format extension
 */
export function matchRouteWithFormat(
  requestPath: string,
  registeredPaths: string[]
): { matchedPath: string | null; format: OutputFormat | null } {
  // First try exact match
  if (registeredPaths.includes(requestPath)) {
    return { matchedPath: requestPath, format: null }
  }

  // Try with format extension stripped
  const { format, basePath } = parseFormat(requestPath)
  if (format && registeredPaths.includes(basePath)) {
    return { matchedPath: basePath, format }
  }

  return { matchedPath: null, format: null }
}

/**
 * @mdxe/hono Format Utilities
 *
 * Content negotiation for MDX documents: by URL extension (`/doc.md`, `/doc.json`) or by `Accept`.
 *
 * The text registers (`md`, `plain`) are RENDERED by `@mdxui/text` (see `./text.ts`, mdx-8je.18),
 * not served as raw `doc.content`; the `Accept` rung resolves through the same capability ladder
 * the mdxe CLI uses. An `Accept` that names only formats this face does not implement is refused
 * with `406` naming what exists — never a silent downgrade.
 *
 * @packageDocumentation
 */

import type { Context, Next, MiddlewareHandler } from 'hono'
import type { MDXLDDocument } from 'mdxld'
import { stringify } from 'mdxld'
import { parseAccept } from '@mdxui/text/capabilities'
import {
  capabilitiesForRegister,
  notAcceptable,
  renderTextRegister,
  resolveTextRegister,
  textRegisterHeaders,
  TEXT_REGISTER_CONTENT_TYPES,
  type Capabilities,
  type TextRegister,
  type TextRegisterHeaderOptions,
} from './text.js'

/**
 * Supported output formats. `md` and `txt` are the two text registers (`@mdxui/text` `md` /
 * `plain`); `mdx` is the raw MDXLD source (frontmatter + body, `stringify`); `html`, `json`, `xml`
 * are the other faces.
 */
export type OutputFormat = 'html' | 'json' | 'md' | 'mdx' | 'txt' | 'xml'

/**
 * Format extensions mapping
 */
export const FORMAT_EXTENSIONS: Record<string, OutputFormat> = {
  '.html': 'html',
  '.json': 'json',
  '.md': 'md',
  '.mdx': 'mdx',
  '.txt': 'txt',
  '.xml': 'xml',
}

/**
 * Content types for each format
 */
export const FORMAT_CONTENT_TYPES: Record<OutputFormat, string> = {
  html: 'text/html; charset=utf-8',
  json: 'application/json; charset=utf-8',
  md: TEXT_REGISTER_CONTENT_TYPES.md,
  mdx: 'text/mdx; charset=utf-8',
  txt: TEXT_REGISTER_CONTENT_TYPES.plain,
  xml: 'application/xml; charset=utf-8',
}

/**
 * Media type → format: the full set an `Accept` header can name. Wildcards resolve to the face
 * their range covers (`text/*` and the bare wildcard to `html`, `application/*` to `json`).
 */
export const ACCEPT_FORMATS: Readonly<Record<string, OutputFormat>> = Object.freeze({
  'text/html': 'html',
  'application/json': 'json',
  'text/markdown': 'md',
  'text/mdx': 'mdx',
  'text/plain': 'txt',
  'application/xml': 'xml',
  'text/xml': 'xml',
  'text/*': 'html',
  'application/*': 'json',
  '*/*': 'html',
})

/** The media types this face serves — what a 406 names, in preference order. */
export const AVAILABLE_MEDIA_TYPES: readonly string[] = Object.freeze([
  'text/html',
  'application/json',
  'text/markdown',
  'text/plain',
  'text/mdx',
  'application/xml',
])

/** The text register a format is, or null for the non-text faces. */
export function registerForFormat(format: OutputFormat | null): TextRegister | null {
  if (format === 'md') return 'md'
  if (format === 'txt') return 'plain'
  return null
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

/** How the format of a response was decided — auditable, never a guess we hide. */
export type FormatDecision = 'extension' | 'accept' | 'default' | 'refused'

/** The outcome of negotiating an `Accept` header. */
export type NegotiatedFormat =
  /** `Accept` named a format we serve (highest `q` wins; ties in header order). */
  | { readonly format: OutputFormat; readonly decidedBy: 'accept' }
  /** No `Accept`, or one expressing no preference we can read: the default face. */
  | { readonly format: 'html'; readonly decidedBy: 'default' }
  /** `Accept` named only formats we do not implement (or refused ours with `q=0`): fail closed. */
  | { readonly format: null; readonly decidedBy: 'refused' }

/**
 * Negotiate a format from an `Accept` header. Entries are read in `q` order (ties in header
 * order); the first that names a format we serve wins; `q=0` entries are refusals and skipped.
 * A header that names nothing we serve is REFUSED (the caller answers 406), never downgraded.
 */
export function negotiateFormat(accept: string | undefined): NegotiatedFormat {
  if (accept === undefined || accept.trim() === '') return { format: 'html', decidedBy: 'default' }
  const entries = parseAccept(accept)
  if (entries.length === 0) return { format: 'html', decidedBy: 'default' }
  for (const entry of entries) {
    if (entry.q <= 0) continue
    const format = ACCEPT_FORMATS[entry.type]
    if (format !== undefined) return { format, decidedBy: 'accept' }
  }
  return { format: null, decidedBy: 'refused' }
}

/**
 * Get format from Accept header (`null` when it names nothing we serve). Prefer
 * {@link negotiateFormat}, which also distinguishes "no preference" from "refused".
 */
export function getFormatFromAccept(accept: string): OutputFormat | null {
  const negotiated = negotiateFormat(accept)
  return negotiated.decidedBy === 'accept' ? negotiated.format : null
}

/**
 * Context variables set by format middleware
 */
export interface FormatContext {
  /** Requested output format; `null` when `Accept` was refused (a 406 at serve time). */
  outputFormat: OutputFormat | null
  /** Original path without format extension */
  basePath: string
  /** Whether format was explicitly requested via extension */
  explicitFormat: boolean
  /** Which rung decided. */
  decidedBy: FormatDecision
  /** The request's `Accept` header, verbatim (undefined when absent). */
  accept: string | undefined
  /**
   * The frozen `@mdxui/text` capabilities when the format is a text register (`md`/`txt`) — the
   * same object the CLI threads to its renderers; `caller.detectedBy` is `'accept'` for a
   * negotiated register and `'flag'` for a `.md`/`.txt` extension. `null` for every other face.
   */
  capabilities: Capabilities | null
}

/** Build the context for a format decided by a URL extension. */
export function contextFromExtension(format: OutputFormat, basePath: string, accept?: string): FormatContext {
  const register = registerForFormat(format)
  return {
    outputFormat: format,
    basePath,
    explicitFormat: true,
    decidedBy: 'extension',
    accept,
    capabilities: register ? capabilitiesForRegister(register) : null,
  }
}

/** Build the context for a request without an extension: the `Accept` rung, or the default. */
export function contextFromAccept(accept: string | undefined, basePath: string): FormatContext {
  const negotiated = negotiateFormat(accept)
  const register = registerForFormat(negotiated.format)
  let capabilities: Capabilities | null = null
  if (register) {
    // The ONE ladder decides the text register; `negotiateFormat` only established that a text
    // type outranks every other face in this header, so the two agree by construction.
    const resolved = resolveTextRegister(accept)
    capabilities = resolved?.register === register ? resolved.capabilities : capabilitiesForRegister(register)
  }
  return {
    outputFormat: negotiated.format,
    basePath,
    explicitFormat: false,
    decidedBy: negotiated.decidedBy,
    accept,
    capabilities,
  }
}

/**
 * Format negotiation middleware
 *
 * Sets c.get('format') with FormatContext. Extension wins over `Accept`; a refused `Accept` is
 * recorded (`outputFormat: null`) and answered 406 by {@link formatResponse} when a document is
 * served — the middleware itself never blocks non-document routes.
 */
export function formatMiddleware(): MiddlewareHandler {
  return async (c: Context, next: Next) => {
    const url = new URL(c.req.url)
    const { format: extFormat, basePath } = parseFormat(url.pathname)
    const accept = c.req.header('Accept')

    const context = extFormat ? contextFromExtension(extFormat, basePath, accept) : contextFromAccept(accept, basePath)
    c.set('format', context)

    await next()
  }
}

/**
 * Get format context from Hono context
 */
export function getFormat(c: Context): FormatContext {
  return (c.get('format') as FormatContext | undefined) ?? contextFromAccept(c.req.header('Accept'), c.req.path)
}

export interface RenderDocumentOptions {
  /** HTML renderer function */
  renderHtml?: (doc: MDXLDDocument) => string
  /** XML renderer function (for RSS/Atom) */
  renderXml?: (doc: MDXLDDocument) => string
}

/**
 * Render document in requested format. The text registers (`md`, `txt`) render through
 * `@mdxui/text`; pass the request's `capabilities` so the bytes match what the CLI would emit
 * for the same context (a bare register is resolved with the register's defaults).
 */
export function renderDocument(
  doc: MDXLDDocument,
  format: OutputFormat,
  options?: RenderDocumentOptions & { capabilities?: Capabilities | null }
): { content: string; contentType: string } {
  const contentType = FORMAT_CONTENT_TYPES[format]

  switch (format) {
    case 'json':
      return {
        content: JSON.stringify(doc, null, 2),
        contentType,
      }

    case 'mdx':
      // The raw MDXLD source: frontmatter + body, exactly as authored
      return {
        content: stringify(doc),
        contentType,
      }

    case 'md':
      // The md register — rendered by @mdxui/text, not the raw source
      return {
        content: renderTextRegister(doc, options?.capabilities ?? 'md'),
        contentType,
      }

    case 'txt':
      // The plain register — rendered by @mdxui/text
      return {
        content: renderTextRegister(doc, options?.capabilities ?? 'plain'),
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

export interface DocumentResponseOptions extends RenderDocumentOptions {
  /** Tokenizer for the md register's `x-markdown-tokens` header. */
  tokenizer?: TextRegisterHeaderOptions['tokenizer']
}

/**
 * The response for a document under a resolved {@link FormatContext}:
 *   - a refused `Accept` → `406` naming what exists (fail closed, never a downgrade);
 *   - a text register → `@mdxui/text` bytes with `Content-Type`, `Vary: Accept` (when negotiated)
 *     and, on md, the labelled `x-markdown-tokens`;
 *   - every other face → its renderer, with `Vary: Accept` when the format was negotiated.
 */
export async function documentResponse(
  doc: MDXLDDocument,
  context: FormatContext,
  options?: DocumentResponseOptions
): Promise<Response> {
  const format = context.outputFormat
  if (format === null) {
    return notAcceptable(context.accept ?? '', AVAILABLE_MEDIA_TYPES)
  }

  const negotiated = context.decidedBy === 'accept' || context.decidedBy === 'default'
  const register = registerForFormat(format)
  const { content, contentType } = renderDocument(doc, format, { ...options, capabilities: context.capabilities })

  if (register) {
    const headers = await textRegisterHeaders(register, content, { vary: negotiated, tokenizer: options?.tokenizer })
    return new Response(content, { status: 200, headers })
  }

  const headers = new Headers({ 'Content-Type': contentType })
  if (negotiated) headers.set('Vary', 'Accept')
  return new Response(content, { status: 200, headers })
}

/**
 * Create a format-aware response
 */
export function formatResponse(c: Context, doc: MDXLDDocument, options?: DocumentResponseOptions): Promise<Response> {
  return documentResponse(doc, getFormat(c), options)
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

export type { Capabilities, TextRegister }

/**
 * Relationship extraction from MDX content
 *
 * Every link in MDX content creates a relationship (outbound edge).
 * References are inbound edges (tracked at the database level).
 *
 * Aligns with ai-database conventions for Things + Relationships model.
 */

import type { MDXLDDocument, MDXLDAst, MDXLDAstNode } from './types.js'
import { toAst } from './ast.js'

/**
 * A relationship extracted from document content
 * Represents an outbound link from one document to another
 */
export interface Relationship<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the relationship (auto-generated) */
  id: string
  /** Type of relationship (e.g., 'link', 'image', 'embed', 'mention') */
  type: RelationshipType
  /** Source document URL or ID */
  from: string
  /** Target URL (the link href) */
  to: string
  /** When the relationship was extracted/created */
  createdAt: Date
  /** Optional relationship metadata */
  data?: T
}

/**
 * Relationship types based on how the link appears in content
 */
export type RelationshipType =
  | 'link'      // Standard markdown link [text](url)
  | 'image'     // Image reference ![alt](url)
  | 'embed'     // MDX component embed <Component src="url" />
  | 'import'    // ESM import statement
  | 'mention'   // @mention or [[wiki-link]]
  | 'reference' // Reference-style link [text][ref]

/**
 * Link extracted from content with position and metadata
 */
export interface ExtractedLink {
  /** The target URL */
  url: string
  /** Link text or alt text */
  text?: string
  /** Type of link */
  type: RelationshipType
  /** Line number in source */
  line?: number
  /** Column in source */
  column?: number
  /** Additional attributes (for MDX components) */
  attributes?: Record<string, unknown>
}

/**
 * Options for relationship extraction
 */
export interface ExtractOptions {
  /** Base URL to resolve relative links against */
  baseUrl?: string
  /** Source document ID (used as 'from' in relationships) */
  sourceId?: string
  /** Include image links */
  includeImages?: boolean
  /** Include ESM imports */
  includeImports?: boolean
  /** Include MDX component embeds */
  includeEmbeds?: boolean
  /** Filter to only internal links (same domain) */
  internalOnly?: boolean
}

/**
 * Generate a unique relationship ID
 */
function generateRelationshipId(from: string, type: string, to: string): string {
  const hash = simpleHash(`${from}:${type}:${to}`)
  return `rel_${hash}`
}

/**
 * Simple hash function for generating IDs
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Resolve a potentially relative URL against a base
 */
function resolveUrl(url: string, baseUrl?: string): string {
  if (!baseUrl) return url
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
    return url
  }
  try {
    return new URL(url, baseUrl).href
  } catch {
    return url
  }
}

/**
 * Check if URL is internal (same domain as base)
 */
function isInternalUrl(url: string, baseUrl?: string): boolean {
  if (!baseUrl) return false
  try {
    const base = new URL(baseUrl)
    const target = new URL(url, baseUrl)
    return base.host === target.host
  } catch {
    return true // Treat relative URLs as internal
  }
}

/**
 * Walk AST and extract all links
 */
function walkAst(node: MDXLDAstNode, links: ExtractedLink[], options: ExtractOptions): void {
  switch (node.type) {
    case 'link':
      links.push({
        url: resolveUrl(node.url as string, options.baseUrl),
        text: getTextContent(node.children),
        type: 'link',
        line: node.position?.start?.line,
        column: node.position?.start?.column,
      })
      break

    case 'image':
      if (options.includeImages !== false) {
        links.push({
          url: resolveUrl(node.url as string, options.baseUrl),
          text: node.alt as string,
          type: 'image',
          line: node.position?.start?.line,
          column: node.position?.start?.column,
        })
      }
      break

    case 'mdxjsEsm':
      if (options.includeImports !== false) {
        const importUrl = extractImportUrl(node.value as string)
        if (importUrl) {
          links.push({
            url: importUrl,
            type: 'import',
            line: node.position?.start?.line,
            column: node.position?.start?.column,
          })
        }
      }
      break

    case 'mdxJsxFlowElement':
    case 'mdxJsxTextElement':
      if (options.includeEmbeds !== false) {
        const embedUrl = extractEmbedUrl(node)
        if (embedUrl) {
          links.push({
            url: resolveUrl(embedUrl, options.baseUrl),
            text: node.name as string,
            type: 'embed',
            line: node.position?.start?.line,
            column: node.position?.start?.column,
            attributes: extractAttributes(node),
          })
        }
      }
      break
  }

  // Recurse into children
  if (node.children) {
    for (const child of node.children) {
      walkAst(child, links, options)
    }
  }
}

/**
 * Get text content from child nodes
 */
function getTextContent(children?: MDXLDAstNode[]): string {
  if (!children) return ''
  return children
    .map(child => {
      if (child.type === 'text') return child.value || ''
      if (child.children) return getTextContent(child.children)
      return ''
    })
    .join('')
}

/**
 * Extract URL from import statement
 */
function extractImportUrl(value: string): string | null {
  // Match: import X from 'url' or import 'url'
  const match = value.match(/import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/)
  if (match) {
    const url = match[1]
    // Only include external URLs or relative paths that look like content
    if (url?.startsWith('http') || url?.startsWith('./') || url?.startsWith('../')) {
      return url
    }
  }
  return null
}

/**
 * Extract URL from MDX component embed
 */
function extractEmbedUrl(node: MDXLDAstNode): string | null {
  const attrs = node.attributes as Array<{ name: string; value?: unknown }> | undefined
  if (!attrs) return null

  // Look for common URL attributes: src, href, url, source
  for (const attr of attrs) {
    if (['src', 'href', 'url', 'source'].includes(attr.name) && typeof attr.value === 'string') {
      return attr.value
    }
  }
  return null
}

/**
 * Extract all attributes from MDX component
 */
function extractAttributes(node: MDXLDAstNode): Record<string, unknown> {
  const attrs = node.attributes as Array<{ name: string; value?: unknown }> | undefined
  if (!attrs) return {}

  const result: Record<string, unknown> = {}
  for (const attr of attrs) {
    result[attr.name] = attr.value
  }
  return result
}

/**
 * Extract all links from an MDX document
 *
 * @param doc - The MDX document to extract links from
 * @param options - Extraction options
 * @returns Array of extracted links
 *
 * @example
 * ```ts
 * const doc = parse(content)
 * const links = extractLinks(doc, { baseUrl: 'https://example.com' })
 * // Returns: [{ url: 'https://example.com/other', text: 'link text', type: 'link' }]
 * ```
 */
export function extractLinks(doc: MDXLDDocument, options: ExtractOptions = {}): ExtractedLink[] {
  const ast = toAst(doc)
  const links: ExtractedLink[] = []

  for (const node of ast.children) {
    walkAst(node, links, options)
  }

  // Filter internal only if requested
  if (options.internalOnly && options.baseUrl) {
    return links.filter(link => isInternalUrl(link.url, options.baseUrl))
  }

  return links
}

/**
 * Extract relationships from an MDX document
 *
 * Converts all links to relationship objects suitable for storage
 * in a graph database following ai-database conventions.
 *
 * @param doc - The MDX document to extract relationships from
 * @param options - Extraction options (sourceId is required)
 * @returns Array of relationships
 *
 * @example
 * ```ts
 * const doc = parse(content)
 * const relationships = extractRelationships(doc, {
 *   sourceId: 'https://example.com/posts/hello',
 *   baseUrl: 'https://example.com'
 * })
 * // Returns: [{
 * //   id: 'rel_abc123',
 * //   type: 'link',
 * //   from: 'https://example.com/posts/hello',
 * //   to: 'https://example.com/other',
 * //   createdAt: Date,
 * //   data: { text: 'link text' }
 * // }]
 * ```
 */
export function extractRelationships(
  doc: MDXLDDocument,
  options: ExtractOptions & { sourceId: string }
): Relationship[] {
  const links = extractLinks(doc, options)
  const now = new Date()

  return links.map(link => ({
    id: generateRelationshipId(options.sourceId, link.type, link.url),
    type: link.type,
    from: options.sourceId,
    to: link.url,
    createdAt: now,
    data: {
      text: link.text,
      line: link.line,
      column: link.column,
      ...(link.attributes || {}),
    },
  }))
}

/**
 * Get outbound relationships from a document (alias for extractRelationships)
 *
 * @param doc - The MDX document
 * @param sourceId - The source document ID/URL
 * @param options - Additional extraction options
 * @returns Array of outbound relationships
 */
export function relationships(
  doc: MDXLDDocument,
  sourceId: string,
  options: Omit<ExtractOptions, 'sourceId'> = {}
): Relationship[] {
  return extractRelationships(doc, { ...options, sourceId })
}

/**
 * Reference represents an inbound link to a document
 * This is the inverse of a relationship - tracked at the database level
 */
export interface Reference<T extends Record<string, unknown> = Record<string, unknown>> {
  /** The relationship that created this reference */
  relationship: Relationship<T>
  /** The source document that links to us */
  sourceUrl: string
  /** The source document type (if known) */
  sourceType?: string
  /** Context around the reference (surrounding text) */
  context?: string
}

/**
 * Document with extracted relationships
 */
export interface MDXLDDocumentWithRelationships<TData extends Record<string, unknown> = Record<string, unknown>>
  extends MDXLDDocument<TData> {
  /** Outbound relationships extracted from content */
  relationships: Relationship[]
}

/**
 * Parse document and extract relationships in one step
 *
 * @param doc - The MDX document
 * @param sourceId - The source document ID/URL
 * @param options - Extraction options
 * @returns Document with relationships attached
 */
export function withRelationships<TData extends Record<string, unknown> = Record<string, unknown>>(
  doc: MDXLDDocument<TData>,
  sourceId: string,
  options: Omit<ExtractOptions, 'sourceId'> = {}
): MDXLDDocumentWithRelationships<TData> {
  return {
    ...doc,
    relationships: extractRelationships(doc, { ...options, sourceId }),
  }
}

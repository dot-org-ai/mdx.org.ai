/**
 * @mdxld/pdf
 *
 * PDF format support for text and metadata extraction.
 * Read-only format - PDF generation is not supported.
 */

import pdfParse from 'pdf-parse'
import type { FormatFetchOptions } from '@mdxld/types'

// ============================================================================
// Types
// ============================================================================

export interface PDFParseOptions {
  /** Maximum number of pages to parse (default: all) */
  maxPages?: number
  /** Page separator string (default: '\n\n') */
  pageSeparator?: string
  /** Custom page render function */
  pageRender?: (pageData: PDFPageData) => string
  /** Password for encrypted PDFs */
  password?: string
}

export interface PDFPageData {
  pageIndex: number
  pageNumber: number
  text: string
}

export interface PDFDocument {
  /** Extracted text content */
  text: string
  /** Number of pages */
  numPages: number
  /** PDF metadata */
  metadata: PDFMetadata
  /** PDF info dictionary */
  info: PDFInfo
  /** Raw text per page */
  pages?: string[]
}

export interface PDFMetadata {
  /** PDF version */
  version?: string
  /** Is PDF/A compliant */
  isAcroFormPresent?: boolean
  /** Is XFA form */
  isXFAPresent?: boolean
  /** Custom metadata */
  [key: string]: unknown
}

export interface PDFInfo {
  /** Document title */
  Title?: string
  /** Document author */
  Author?: string
  /** Document subject */
  Subject?: string
  /** Keywords */
  Keywords?: string
  /** Creator application */
  Creator?: string
  /** Producer application */
  Producer?: string
  /** Creation date */
  CreationDate?: string
  /** Modification date */
  ModDate?: string
  /** Is linearized (fast web view) */
  IsLinearized?: boolean
  /** Is encrypted */
  IsEncrypted?: boolean
  /** Custom info fields */
  [key: string]: unknown
}

// ============================================================================
// Parse
// ============================================================================

/**
 * Parse PDF buffer to document object with text and metadata.
 *
 * @example
 * ```ts
 * const doc = await parse(buffer)
 * console.log(doc.text)
 * console.log(doc.metadata)
 * ```
 */
export async function parse(input: string | ArrayBuffer, options: PDFParseOptions = {}): Promise<PDFDocument> {
  const { maxPages, pageSeparator = '\n\n', pageRender, password } = options

  // Convert to Buffer for pdf-parse
  let buffer: Buffer
  if (typeof input === 'string') {
    buffer = Buffer.from(input, 'binary')
  } else {
    buffer = Buffer.from(input)
  }

  const parseOptions: Record<string, unknown> = {}

  if (maxPages !== undefined) {
    parseOptions.max = maxPages
  }

  if (password) {
    parseOptions.password = password
  }

  if (pageRender) {
    parseOptions.pagerender = (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string }> }> }) => {
      return pageData.getTextContent().then((textContent) => {
        const text = textContent.items.map((item) => item.str).join(' ')
        return pageRender({
          pageIndex: pageData.pageIndex,
          pageNumber: pageData.pageIndex + 1,
          text,
        })
      })
    }
  }

  const result = await pdfParse(buffer, parseOptions)

  // Split text into pages if separator provided
  const pages = result.text.split(pageSeparator).filter((p) => p.trim())

  return {
    text: result.text,
    numPages: result.numpages,
    metadata: result.metadata?._metadata ?? {},
    info: result.info ?? {},
    pages,
  }
}

/**
 * Alias for parse().
 */
export const fromPDF = parse

/**
 * Extract only text content from PDF.
 */
export async function extractText(input: string | ArrayBuffer, options: PDFParseOptions = {}): Promise<string> {
  const doc = await parse(input, options)
  return doc.text
}

/**
 * Extract metadata from PDF without parsing full text.
 */
export async function extractMetadata(input: string | ArrayBuffer, options: PDFParseOptions = {}): Promise<{
  metadata: PDFMetadata
  info: PDFInfo
  numPages: number
}> {
  // Parse with max 0 pages to only get metadata
  const doc = await parse(input, { ...options, maxPages: 0 })
  return {
    metadata: doc.metadata,
    info: doc.info,
    numPages: doc.numPages,
  }
}

// ============================================================================
// Fetch
// ============================================================================

/**
 * Fetch PDF from URL and parse.
 *
 * @example
 * ```ts
 * const doc = await fetchPDF('https://example.com/document.pdf')
 * ```
 */
export async function fetchPDF(
  url: string,
  options: FormatFetchOptions & PDFParseOptions = {}
): Promise<PDFDocument> {
  const { headers: requestHeaders, timeout, fetch: customFetch, ...parseOptions } = options
  const fetchFn = customFetch ?? globalThis.fetch

  const controller = new AbortController()
  const timeoutId = timeout ? setTimeout(() => controller.abort(), timeout) : undefined

  try {
    const response = await fetchFn(url, {
      headers: requestHeaders,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    return parse(buffer, parseOptions)
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

// ============================================================================
// Format Object
// ============================================================================

/**
 * Async ReadOnly Format interface for formats with async parsing (like PDF).
 */
export interface AsyncReadOnlyFormat<T, ParseOptions = unknown> {
  readonly name: string
  readonly mimeTypes: readonly string[]
  readonly extensions: readonly string[]
  readonly readonly: true
  parse(input: string | ArrayBuffer, options?: ParseOptions): Promise<T>
  fetch(url: string, options?: FormatFetchOptions & ParseOptions): Promise<T>
}

/**
 * PDF Format object implementing an async ReadOnly Format interface.
 *
 * @example
 * ```ts
 * import { PDF } from '@mdxld/pdf'
 *
 * const doc = await PDF.parse(buffer)
 * const remote = await PDF.fetch('https://example.com/doc.pdf')
 * ```
 */
export const PDF: AsyncReadOnlyFormat<PDFDocument, PDFParseOptions> = {
  name: 'pdf',
  mimeTypes: ['application/pdf'] as const,
  extensions: ['pdf'] as const,
  parse,
  fetch: fetchPDF,
  readonly: true,
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Convert PDF document to Markdown format.
 */
export function toMarkdown(doc: PDFDocument): string {
  const lines: string[] = []

  // Add title if available
  if (doc.info.Title) {
    lines.push(`# ${doc.info.Title}`)
    lines.push('')
  }

  // Add metadata as frontmatter-style comments
  if (doc.info.Author) {
    lines.push(`> Author: ${doc.info.Author}`)
  }
  if (doc.info.Subject) {
    lines.push(`> Subject: ${doc.info.Subject}`)
  }
  if (lines.length > 1) {
    lines.push('')
  }

  // Add text content
  lines.push(doc.text)

  return lines.join('\n')
}

/**
 * Convert PDF document to JSON-LD format.
 */
export function toJSONLD(doc: PDFDocument, options: { context?: string; id?: string } = {}): Record<string, unknown> {
  const { context = 'https://schema.org', id } = options

  return {
    '@context': context,
    '@type': 'DigitalDocument',
    ...(id && { '@id': id }),
    ...(doc.info.Title && { name: doc.info.Title }),
    ...(doc.info.Author && { author: { '@type': 'Person', name: doc.info.Author } }),
    ...(doc.info.Subject && { description: doc.info.Subject }),
    ...(doc.info.Keywords && { keywords: doc.info.Keywords }),
    ...(doc.info.CreationDate && { dateCreated: doc.info.CreationDate }),
    ...(doc.info.ModDate && { dateModified: doc.info.ModDate }),
    ...(doc.info.Creator && { encodingFormat: doc.info.Creator }),
    numberOfPages: doc.numPages,
    text: doc.text,
  }
}

/**
 * Convert PDF to plain text structured document.
 */
export function toDocument(doc: PDFDocument): {
  title?: string
  author?: string
  content: string
  pages: string[]
  metadata: Record<string, unknown>
} {
  return {
    title: doc.info.Title,
    author: doc.info.Author,
    content: doc.text,
    pages: doc.pages ?? [],
    metadata: {
      ...doc.metadata,
      ...doc.info,
      numPages: doc.numPages,
    },
  }
}

/**
 * Search for text in PDF.
 */
export function search(doc: PDFDocument, query: string, options: { caseSensitive?: boolean } = {}): {
  matches: Array<{ text: string; index: number; page?: number }>
  count: number
} {
  const { caseSensitive = false } = options
  const text = caseSensitive ? doc.text : doc.text.toLowerCase()
  const searchQuery = caseSensitive ? query : query.toLowerCase()

  const matches: Array<{ text: string; index: number; page?: number }> = []
  let index = 0

  while ((index = text.indexOf(searchQuery, index)) !== -1) {
    // Get surrounding context
    const start = Math.max(0, index - 50)
    const end = Math.min(doc.text.length, index + query.length + 50)
    const context = doc.text.slice(start, end)

    matches.push({
      text: context,
      index,
    })

    index += query.length
  }

  return { matches, count: matches.length }
}

// Default export
export default PDF

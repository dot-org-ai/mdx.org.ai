/**
 * @mdxdb/fumadocs - Fumadocs content source adapter for mdxdb
 *
 * Provides integration between mdxdb document stores and Fumadocs,
 * allowing you to use mdxdb as a content source for Fumadocs documentation sites.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'

/**
 * Virtual file types for Fumadocs source
 */
export interface VirtualFile {
  path: string
  type: 'page' | 'meta'
  data: Record<string, unknown>
  slugs?: string[]
}

export interface VirtualPage extends VirtualFile {
  type: 'page'
  data: PageData
}

export interface VirtualMeta extends VirtualFile {
  type: 'meta'
  data: MetaData
}

/**
 * Page data structure for Fumadocs
 */
export interface PageData {
  /** Page title */
  title: string
  /** Page description */
  description?: string
  /** Icon identifier */
  icon?: string
  /** Full MDX/markdown content */
  content: string
  /** Original mdxld document */
  doc: MDXLDDocument
  /** Last modified date */
  lastModified?: Date
  /** Additional frontmatter data */
  [key: string]: unknown
}

/**
 * Meta data structure for folder configuration
 */
export interface MetaData {
  /** Folder title */
  title?: string
  /** Icon identifier */
  icon?: string
  /** Whether this is a root folder */
  root?: boolean
  /** Ordered list of page slugs */
  pages?: string[]
  /** Whether folder is expanded by default */
  defaultOpen?: boolean
  /** Folder description */
  description?: string
  /** Allow additional properties */
  [key: string]: unknown
}

/**
 * Source configuration
 */
export interface FumadocsSourceConfig {
  pageData: PageData
  metaData: MetaData
}

/**
 * Fumadocs-compatible source object
 */
export interface FumadocsSource {
  files: VirtualFile[]
}

/**
 * Options for creating a Fumadocs source from mdxdb
 */
export interface CreateSourceOptions {
  /**
   * Base path for content (e.g., 'docs' for /docs/*)
   * @default ''
   */
  basePath?: string

  /**
   * Transform document data before adding to source
   */
  transform?: (doc: MDXLDDocument, path: string) => PageData

  /**
   * Filter documents to include
   */
  filter?: (doc: MDXLDDocument, path: string) => boolean

  /**
   * Custom slug generation from path
   */
  slugs?: (path: string) => string[]

  /**
   * Meta files configuration for folder ordering
   */
  meta?: Record<string, MetaData>
}

/**
 * Convert a path to slugs array
 */
function pathToSlugs(path: string, basePath: string = ''): string[] {
  // Normalize basePath - remove leading/trailing slashes
  const normalizedBasePath = basePath.replace(/^\/+|\/+$/g, '')

  // Remove leading slashes from path for comparison
  let cleanPath = path.replace(/^\/+/, '')

  // Remove base path prefix
  if (normalizedBasePath && cleanPath.startsWith(normalizedBasePath)) {
    cleanPath = cleanPath.slice(normalizedBasePath.length)
  }

  // Remove leading/trailing slashes and file extension
  cleanPath = cleanPath.replace(/^\/+|\/+$/g, '').replace(/\.(mdx?|md)$/i, '')

  // Handle index files
  if (cleanPath.endsWith('/index') || cleanPath === 'index') {
    cleanPath = cleanPath.replace(/\/?index$/, '')
  }

  // Split into slugs
  return cleanPath ? cleanPath.split('/') : []
}

/**
 * Extract title from document
 */
function extractTitle(doc: MDXLDDocument): string {
  // Check frontmatter
  if (doc.data.title && typeof doc.data.title === 'string') {
    return doc.data.title
  }

  // Extract from first heading in content
  const headingMatch = doc.content.match(/^#\s+(.+)$/m)
  if (headingMatch?.[1]) {
    return headingMatch[1].trim()
  }

  return 'Untitled'
}

/**
 * Default transform function
 */
function defaultTransform(doc: MDXLDDocument, path: string): PageData {
  return {
    title: extractTitle(doc),
    description: doc.data.description as string | undefined,
    icon: doc.data.icon as string | undefined,
    content: doc.content,
    doc,
    ...doc.data,
  }
}

/**
 * Create a Fumadocs source from an array of mdxld documents
 *
 * @param documents - Array of [path, document] tuples
 * @param options - Source configuration options
 * @returns Fumadocs-compatible source object
 *
 * @example
 * ```ts
 * import { createSource } from '@mdxdb/fumadocs'
 * import { loader } from 'fumadocs-core/source'
 *
 * const documents = [
 *   ['/docs/getting-started.mdx', doc1],
 *   ['/docs/api/reference.mdx', doc2],
 * ]
 *
 * const mdxdbSource = createSource(documents, {
 *   basePath: 'docs',
 * })
 *
 * export const source = loader({
 *   source: mdxdbSource,
 *   baseUrl: '/docs',
 * })
 * ```
 */
export function createSource(
  documents: Array<[string, MDXLDDocument]>,
  options: CreateSourceOptions = {}
): FumadocsSource {
  const {
    basePath = '',
    transform = defaultTransform,
    filter,
    slugs: customSlugs,
    meta = {},
  } = options

  const files: VirtualFile[] = []
  const folderPaths = new Set<string>()

  // Process documents
  for (const [path, doc] of documents) {
    // Apply filter
    if (filter && !filter(doc, path)) {
      continue
    }

    // Generate slugs
    const slugs = customSlugs ? customSlugs(path) : pathToSlugs(path, basePath)

    // Track folder paths for meta files
    if (slugs.length > 1) {
      for (let i = 1; i < slugs.length; i++) {
        folderPaths.add(slugs.slice(0, i).join('/'))
      }
    }

    // Transform document to page data
    const pageData = transform(doc, path)

    // Create virtual page file
    const page: VirtualPage = {
      path,
      type: 'page',
      data: pageData,
      slugs,
    }

    files.push(page)
  }

  // Add meta files for folders
  for (const folderPath of folderPaths) {
    const metaPath = `${basePath ? '/' + basePath : ''}/${folderPath}/meta.json`
    const metaData = meta[folderPath] || {}

    const metaFile: VirtualMeta = {
      path: metaPath,
      type: 'meta',
      data: {
        title: metaData.title,
        icon: metaData.icon,
        root: metaData.root,
        pages: metaData.pages,
        defaultOpen: metaData.defaultOpen,
        description: metaData.description,
      },
    }

    files.push(metaFile)
  }

  return { files }
}

/**
 * Options for the dynamic source adapter
 */
export interface DynamicSourceOptions extends CreateSourceOptions {
  /**
   * Function to fetch documents dynamically
   */
  fetchDocuments: () => Promise<Array<[string, MDXLDDocument]>>

  /**
   * Cache TTL in milliseconds
   * @default 60000 (1 minute)
   */
  cacheTTL?: number
}

/**
 * Create a dynamic Fumadocs source that fetches content on demand
 *
 * Useful for remote content sources or when you need to refresh content
 * without rebuilding the entire site.
 *
 * @param options - Dynamic source options
 * @returns Object with methods to get source and refresh cache
 *
 * @example
 * ```ts
 * import { createDynamicSource } from '@mdxdb/fumadocs'
 *
 * const dynamicSource = createDynamicSource({
 *   fetchDocuments: async () => {
 *     const response = await fetch('/api/docs')
 *     return response.json()
 *   },
 *   cacheTTL: 60000,
 * })
 *
 * // Get cached or fresh source
 * const source = await dynamicSource.getSource()
 *
 * // Force refresh
 * await dynamicSource.refresh()
 * ```
 */
export function createDynamicSource(options: DynamicSourceOptions) {
  const { fetchDocuments, cacheTTL = 60000, ...sourceOptions } = options

  let cachedSource: FumadocsSource | null = null
  let cacheTime = 0

  return {
    /**
     * Get the source, using cache if valid
     */
    async getSource(): Promise<FumadocsSource> {
      const now = Date.now()

      if (cachedSource && now - cacheTime < cacheTTL) {
        return cachedSource
      }

      const documents = await fetchDocuments()
      cachedSource = createSource(documents, sourceOptions)
      cacheTime = now

      return cachedSource
    },

    /**
     * Force refresh the cache
     */
    async refresh(): Promise<FumadocsSource> {
      const documents = await fetchDocuments()
      cachedSource = createSource(documents, sourceOptions)
      cacheTime = Date.now()
      return cachedSource
    },

    /**
     * Clear the cache
     */
    clearCache(): void {
      cachedSource = null
      cacheTime = 0
    },
  }
}

/**
 * Helper to convert mdxdb query results to Fumadocs source
 *
 * @example
 * ```ts
 * import { queryToSource } from '@mdxdb/fumadocs'
 * import { db } from '@mdxdb/fs'
 *
 * const docs = await db.query({ type: 'Documentation' })
 * const source = queryToSource(docs, { basePath: 'docs' })
 * ```
 */
export function queryToSource(
  documents: MDXLDDocument[],
  options: CreateSourceOptions = {}
): FumadocsSource {
  const docTuples: Array<[string, MDXLDDocument]> = documents.map((doc) => [
    doc.id || (doc.data.slug as string) || '',
    doc,
  ])
  return createSource(docTuples, options)
}

/**
 * Type guard to check if a virtual file is a page
 */
export function isPage(file: VirtualFile): file is VirtualPage {
  return file.type === 'page'
}

/**
 * Type guard to check if a virtual file is meta
 */
export function isMeta(file: VirtualFile): file is VirtualMeta {
  return file.type === 'meta'
}

// Re-export mdxld types for convenience
export type { MDXLDDocument } from 'mdxld'

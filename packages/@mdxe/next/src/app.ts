/**
 * @mdxe/next App Router Utilities
 *
 * Provides utilities for building Next.js App Router applications with MDX,
 * including Server Components support, async data loading, and layouts.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import { parse } from 'mdxld'
import * as fs from 'fs/promises'
import * as path from 'path'

/**
 * Content source configuration
 */
export interface ContentSource {
  /** Base directory for content */
  baseDir: string
  /** File extensions to match */
  extensions?: string[]
  /** URL base path */
  basePath?: string
}

/**
 * Content loader for Server Components
 */
export class ContentLoader {
  private baseDir: string
  private extensions: string[]
  private basePath: string
  private cache = new Map<string, MDXLDDocument>()

  constructor(options: ContentSource) {
    this.baseDir = options.baseDir
    this.extensions = options.extensions || ['.mdx', '.md']
    this.basePath = options.basePath || ''
  }

  /**
   * Get a document by slug
   */
  async getDocument<TData extends MDXLDData = MDXLDData>(slug: string[]): Promise<MDXLDDocument<TData> | null> {
    const slugStr = slug.join('/')

    if (this.cache.has(slugStr)) {
      return this.cache.get(slugStr) as MDXLDDocument<TData>
    }

    for (const ext of this.extensions) {
      const filePath = path.join(this.baseDir, ...slug) + ext
      try {
        const content = await fs.readFile(filePath, 'utf-8')
        const doc = parse(content) as MDXLDDocument<TData>
        this.cache.set(slugStr, doc)
        return doc
      } catch {
        // Try index file
        const indexPath = path.join(this.baseDir, ...slug, `index${ext}`)
        try {
          const content = await fs.readFile(indexPath, 'utf-8')
          const doc = parse(content) as MDXLDDocument<TData>
          this.cache.set(slugStr, doc)
          return doc
        } catch {
          continue
        }
      }
    }

    return null
  }

  /**
   * List all documents
   */
  async listDocuments<TData extends MDXLDData = MDXLDData>(): Promise<MDXLDDocument<TData>[]> {
    const documents: MDXLDDocument<TData>[] = []
    await this.scanDirectory(this.baseDir, documents)
    return documents
  }

  private async scanDirectory<TData extends MDXLDData>(dir: string, documents: MDXLDDocument<TData>[]): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          await this.scanDirectory(fullPath, documents)
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name)
          if (this.extensions.includes(ext)) {
            const content = await fs.readFile(fullPath, 'utf-8')
            const doc = parse(content) as MDXLDDocument<TData>

            // Add computed slug
            const relativePath = path.relative(this.baseDir, fullPath)
            const slug = relativePath
              .replace(/\\/g, '/')
              .replace(/\/index\.(mdx?|md)$/, '')
              .replace(/\.(mdx?|md)$/, '')

            doc.data = {
              ...doc.data,
              slug,
            } as TData

            documents.push(doc)
          }
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }

  /**
   * Get adjacent documents for navigation
   */
  async getAdjacentDocuments<TData extends MDXLDData = MDXLDData>(
    currentSlug: string[],
    sortField?: keyof TData
  ): Promise<{ previous?: MDXLDDocument<TData>; next?: MDXLDDocument<TData> }> {
    const documents = await this.listDocuments<TData>()

    // Sort by field if provided
    if (sortField) {
      documents.sort((a, b) => {
        const aVal = a.data[sortField]
        const bVal = b.data[sortField]
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return aVal - bVal
        }
        return String(aVal).localeCompare(String(bVal))
      })
    }

    const currentSlugStr = currentSlug.join('/')
    const currentIndex = documents.findIndex(doc => {
      const slug = doc.data['slug' as keyof TData]
      return slug === currentSlugStr
    })

    if (currentIndex === -1) {
      return {}
    }

    return {
      previous: currentIndex > 0 ? documents[currentIndex - 1] : undefined,
      next: currentIndex < documents.length - 1 ? documents[currentIndex + 1] : undefined,
    }
  }
}

/**
 * Create a content loader instance
 */
export function createContentLoader(options: ContentSource): ContentLoader {
  return new ContentLoader(options)
}

/**
 * Page layout type
 */
export type LayoutType = 'default' | 'docs' | 'blog' | 'landing'

/**
 * Page layout configuration
 */
export interface LayoutConfig {
  /** Layout type */
  type: LayoutType
  /** Show table of contents */
  showToc?: boolean
  /** Show sidebar navigation */
  showSidebar?: boolean
  /** Show breadcrumbs */
  showBreadcrumbs?: boolean
  /** Show previous/next navigation */
  showNavigation?: boolean
  /** Full width content */
  fullWidth?: boolean
}

/**
 * Get layout config from document
 */
export function getLayoutConfig<TData extends MDXLDData>(doc: MDXLDDocument<TData>): LayoutConfig {
  const layout = doc.data['layout' as keyof TData] as LayoutType | undefined
  const type = layout || 'default'

  // Default configurations per layout type
  const defaults: Record<LayoutType, LayoutConfig> = {
    default: {
      type: 'default',
      showToc: false,
      showSidebar: false,
      showBreadcrumbs: false,
      showNavigation: false,
      fullWidth: false,
    },
    docs: {
      type: 'docs',
      showToc: true,
      showSidebar: true,
      showBreadcrumbs: true,
      showNavigation: true,
      fullWidth: false,
    },
    blog: {
      type: 'blog',
      showToc: true,
      showSidebar: false,
      showBreadcrumbs: true,
      showNavigation: true,
      fullWidth: false,
    },
    landing: {
      type: 'landing',
      showToc: false,
      showSidebar: false,
      showBreadcrumbs: false,
      showNavigation: false,
      fullWidth: true,
    },
  }

  const config = defaults[type]

  // Override with document-specific settings
  if (typeof doc.data['showToc' as keyof TData] === 'boolean') {
    config.showToc = doc.data['showToc' as keyof TData] as boolean
  }
  if (typeof doc.data['showSidebar' as keyof TData] === 'boolean') {
    config.showSidebar = doc.data['showSidebar' as keyof TData] as boolean
  }
  if (typeof doc.data['showBreadcrumbs' as keyof TData] === 'boolean') {
    config.showBreadcrumbs = doc.data['showBreadcrumbs' as keyof TData] as boolean
  }
  if (typeof doc.data['showNavigation' as keyof TData] === 'boolean') {
    config.showNavigation = doc.data['showNavigation' as keyof TData] as boolean
  }
  if (typeof doc.data['fullWidth' as keyof TData] === 'boolean') {
    config.fullWidth = doc.data['fullWidth' as keyof TData] as boolean
  }

  return config
}

/**
 * Table of contents item
 */
export interface TocItem {
  /** Heading ID */
  id: string
  /** Heading text */
  text: string
  /** Heading depth (2, 3, 4) */
  depth: number
}

/**
 * Extract table of contents from MDX content
 */
export function extractToc(content: string): TocItem[] {
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  const items: TocItem[] = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const hashes = match[1]
    const rawText = match[2]
    if (!hashes || !rawText) continue

    const depth = hashes.length
    const text = rawText.trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')

    items.push({ id, text, depth })
  }

  return items
}

/**
 * Generate sitemap entries from documents
 */
export interface SitemapEntry {
  /** Page URL */
  url: string
  /** Last modified date */
  lastmod?: Date
  /** Change frequency */
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  /** Priority (0.0 - 1.0) */
  priority?: number
}

/**
 * Generate sitemap from documents
 */
export async function generateSitemap<TData extends MDXLDData>(
  loader: ContentLoader,
  options: { baseUrl: string; defaultPriority?: number }
): Promise<SitemapEntry[]> {
  const { baseUrl, defaultPriority = 0.5 } = options
  const documents = await loader.listDocuments<TData>()

  return documents.map(doc => {
    const slug = doc.data['slug' as keyof TData] as string || ''
    const priority = doc.data['priority' as keyof TData] as number || defaultPriority
    const lastModified = doc.data['lastModified' as keyof TData] as string | undefined

    return {
      url: `${baseUrl}/${slug}`,
      lastmod: lastModified ? new Date(lastModified) : undefined,
      priority,
    }
  })
}

/**
 * Render sitemap XML
 */
export function renderSitemapXML(entries: SitemapEntry[]): string {
  const urlset = entries
    .map(entry => {
      const parts = [`    <url>\n      <loc>${entry.url}</loc>`]
      if (entry.lastmod) {
        parts.push(`      <lastmod>${entry.lastmod.toISOString().split('T')[0]}</lastmod>`)
      }
      if (entry.changefreq) {
        parts.push(`      <changefreq>${entry.changefreq}</changefreq>`)
      }
      if (entry.priority !== undefined) {
        parts.push(`      <priority>${entry.priority}</priority>`)
      }
      parts.push('    </url>')
      return parts.join('\n')
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlset}
</urlset>`
}

/**
 * Create sitemap route handler
 */
export function createSitemapHandler(loader: ContentLoader, baseUrl: string) {
  return async (): Promise<Response> => {
    const entries = await generateSitemap(loader, { baseUrl })
    const xml = renderSitemapXML(entries)

    return new Response(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  }
}

/**
 * @mdxe/fumadocs - Next.js integration for MDX with Fumadocs
 *
 * Provides utilities and components for building documentation sites
 * with Fumadocs and mdxld documents.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'
import { parse, toAst } from 'mdxld'

// Re-export source adapter utilities
export {
  createSource,
  createDynamicSource,
  queryToSource,
  isPage,
  isMeta,
  type FumadocsSource,
  type FumadocsSourceConfig,
  type CreateSourceOptions,
  type DynamicSourceOptions,
  type PageData,
  type MetaData,
  type VirtualFile,
  type VirtualPage,
  type VirtualMeta,
} from '@mdxdb/fumadocs'

/**
 * Table of contents item
 */
export interface TOCItem {
  /** Heading title */
  title: string
  /** URL fragment (e.g., #heading-slug) */
  url: string
  /** Heading depth (1-6) */
  depth: number
  /** Nested items */
  items?: TOCItem[]
}

/**
 * Extract table of contents from mdxld document
 *
 * @param doc - MDXLDDocument or raw MDX content string
 * @returns Array of TOC items
 *
 * @example
 * ```ts
 * import { getTableOfContents } from '@mdxe/fumadocs'
 *
 * const toc = getTableOfContents(doc)
 * // [{ title: 'Introduction', url: '#introduction', depth: 2 }, ...]
 * ```
 */
export function getTableOfContents(doc: MDXLDDocument | string): TOCItem[] {
  const document = typeof doc === 'string' ? parse(doc) : doc
  const ast = toAst(document)
  const items: TOCItem[] = []

  for (const node of ast.children) {
    const depth = node.depth as number | undefined
    if (node.type === 'heading' && typeof depth === 'number' && depth >= 2) {
      // Extract text from heading
      const text = node.children
        ?.map((child: { value?: string }) => child.value || '')
        .join('')
        .trim() || ''

      // Generate slug from text
      const slug = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      items.push({
        title: text,
        url: `#${slug}`,
        depth,
      })
    }
  }

  return items
}

/**
 * Generate a nested table of contents structure
 *
 * Converts a flat list of TOC items into a nested structure
 * based on heading depth.
 *
 * @param items - Flat array of TOC items
 * @returns Nested TOC structure
 */
export function nestTableOfContents(items: TOCItem[]): TOCItem[] {
  const result: TOCItem[] = []
  const stack: TOCItem[] = []

  for (const item of items) {
    const newItem: TOCItem = { ...item, items: [] }

    // Pop items from stack until we find a parent or empty
    while (stack.length > 0) {
      const last = stack[stack.length - 1]
      if (last && last.depth >= item.depth) {
        stack.pop()
      } else {
        break
      }
    }

    if (stack.length === 0) {
      // Top-level item
      result.push(newItem)
    } else {
      // Add as child of last item in stack
      const parent = stack[stack.length - 1]
      if (parent) {
        if (!parent.items) parent.items = []
        parent.items.push(newItem)
      }
    }

    stack.push(newItem)
  }

  // Clean up empty items arrays
  const cleanup = (tocItems: TOCItem[]): TOCItem[] =>
    tocItems.map((item) => ({
      ...item,
      items: item.items && item.items.length > 0 ? cleanup(item.items) : undefined,
    }))

  return cleanup(result)
}

/**
 * Document page props for Next.js pages
 */
export interface DocumentPageProps {
  /** Page slug segments */
  slug: string[]
  /** Optional locale */
  locale?: string
}

/**
 * Generate static params for Next.js dynamic routes
 *
 * @param pages - Array of page objects with slugs
 * @returns Array of params objects for generateStaticParams
 *
 * @example
 * ```ts
 * // app/docs/[[...slug]]/page.tsx
 * import { generateStaticParams } from '@mdxe/fumadocs'
 *
 * export async function generateStaticParams() {
 *   const pages = source.getPages()
 *   return generateParams(pages)
 * }
 * ```
 */
export function generateParams<T extends { slugs: string[] }>(
  pages: T[],
  options: { slugParam?: string } = {}
): Array<Record<string, string[]>> {
  const { slugParam = 'slug' } = options

  return pages.map((page) => ({
    [slugParam]: page.slugs,
  }))
}

/**
 * Get breadcrumbs for a page
 *
 * @param slugs - Page slug segments
 * @param pages - All available pages
 * @returns Array of breadcrumb items
 */
export function getBreadcrumbs<T extends { slugs: string[]; data: { title: string } }>(
  slugs: string[],
  pages: T[]
): Array<{ title: string; href: string }> {
  const breadcrumbs: Array<{ title: string; href: string }> = []

  for (let i = 0; i < slugs.length; i++) {
    const partialSlug = slugs.slice(0, i + 1)
    const page = pages.find(
      (p) => p.slugs.length === partialSlug.length && p.slugs.every((s, j) => s === partialSlug[j])
    )

    if (page) {
      breadcrumbs.push({
        title: page.data.title,
        href: '/' + partialSlug.join('/'),
      })
    } else {
      // Use slug as title if no page found
      const slugPart = slugs[i] ?? ''
      breadcrumbs.push({
        title: slugPart.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        href: '/' + partialSlug.join('/'),
      })
    }
  }

  return breadcrumbs
}

/**
 * Search index entry
 */
export interface SearchIndexEntry {
  /** Unique identifier */
  id: string
  /** Page title */
  title: string
  /** Page description */
  description?: string
  /** Page URL */
  url: string
  /** Page content (for full-text search) */
  content: string
  /** Section/category */
  section?: string
}

/**
 * Generate a search index from pages
 *
 * @param pages - Array of pages with slugs and data
 * @param options - Index generation options
 * @returns Array of search index entries
 *
 * @example
 * ```ts
 * import { generateSearchIndex } from '@mdxe/fumadocs'
 *
 * const pages = source.getPages()
 * const index = generateSearchIndex(pages, { baseUrl: '/docs' })
 * ```
 */
export function generateSearchIndex<
  T extends { slugs: string[]; data: { title: string; description?: string; content: string } },
>(
  pages: T[],
  options: { baseUrl?: string; stripMarkdown?: boolean } = {}
): SearchIndexEntry[] {
  const { baseUrl = '', stripMarkdown = true } = options

  return pages.map((page) => {
    let content = page.data.content

    // Strip markdown syntax if requested
    if (stripMarkdown) {
      content = content
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        // Remove inline code
        .replace(/`[^`]+`/g, '')
        // Remove headers
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic
        .replace(/[*_]{1,2}([^*_]+)[*_]{1,2}/g, '$1')
        // Remove links
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove images
        .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
        // Remove blockquotes
        .replace(/^>\s+/gm, '')
        // Remove list markers
        .replace(/^[-*+]\s+/gm, '')
        .replace(/^\d+\.\s+/gm, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim()
    }

    return {
      id: page.slugs.join('/') || 'index',
      title: page.data.title,
      description: page.data.description,
      url: `${baseUrl}/${page.slugs.join('/')}`,
      content,
    }
  })
}

/**
 * Get previous and next pages for navigation
 *
 * @param currentSlugs - Current page slug segments
 * @param pages - All available pages (in order)
 * @returns Object with previous and next page, or undefined
 */
export function getPageNavigation<T extends { slugs: string[]; data: { title: string } }>(
  currentSlugs: string[],
  pages: T[]
): { previous?: T; next?: T } {
  const currentSlugStr = currentSlugs.join('/')
  const currentIndex = pages.findIndex((p) => p.slugs.join('/') === currentSlugStr)

  if (currentIndex === -1) {
    return {}
  }

  return {
    previous: currentIndex > 0 ? pages[currentIndex - 1] : undefined,
    next: currentIndex < pages.length - 1 ? pages[currentIndex + 1] : undefined,
  }
}

/**
 * Filter pages by type (using mdxld $type)
 *
 * @param pages - Array of pages
 * @param type - Type to filter by
 * @returns Filtered array of pages
 */
export function filterByType<T extends { data: { doc: MDXLDDocument } }>(
  pages: T[],
  type: string
): T[] {
  return pages.filter((page) => page.data.doc.type === type)
}

/**
 * Group pages by a field
 *
 * @param pages - Array of pages
 * @param field - Field to group by
 * @returns Map of field value to pages
 */
export function groupPages<T extends { data: Record<string, unknown> }>(
  pages: T[],
  field: string
): Map<string, T[]> {
  const groups = new Map<string, T[]>()

  for (const page of pages) {
    const value = String(page.data[field] || 'uncategorized')
    const existing = groups.get(value) || []
    existing.push(page)
    groups.set(value, existing)
  }

  return groups
}

// Re-export mdxld utilities
export { parse, stringify, toAst } from 'mdxld'
export type { MDXLDDocument, MDXLDAst, MDXLDAstNode } from 'mdxld'

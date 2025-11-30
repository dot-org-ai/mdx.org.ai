/**
 * @mdxe/next - Next.js integration for mdxe
 *
 * Provides utilities for building Next.js applications with mdxld documents,
 * including configuration helpers, route handlers, and server components support.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import { parse } from 'mdxld'

export { parse } from 'mdxld'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

/**
 * Next.js MDX configuration options
 */
export interface MDXENextConfig {
  /** File extensions to process */
  extensions?: string[]
  /** Enable MDX in pages directory */
  pageExtensions?: string[]
  /** Webpack configuration callback */
  webpack?: (config: unknown, options: unknown) => unknown
}

/**
 * Default configuration
 */
const defaultConfig: Required<MDXENextConfig> = {
  extensions: ['.mdx', '.md'],
  pageExtensions: ['tsx', 'ts', 'jsx', 'js', 'mdx', 'md'],
  webpack: (config) => config,
}

/**
 * Wrap Next.js config with MDX support
 *
 * @param nextConfig - Next.js configuration object
 * @param mdxeConfig - MDXE configuration options
 * @returns Enhanced Next.js configuration
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withMDXE } from '@mdxe/next'
 *
 * export default withMDXE({
 *   // your next.js config
 * })
 * ```
 */
export function withMDXE<T extends Record<string, unknown>>(
  nextConfig: T = {} as T,
  mdxeConfig: MDXENextConfig = {}
): T & { pageExtensions: string[] } {
  const config = { ...defaultConfig, ...mdxeConfig }

  return {
    ...nextConfig,
    pageExtensions: config.pageExtensions,
  }
}

/**
 * Route handler request context
 */
export interface RouteContext {
  /** URL parameters */
  params: Record<string, string | string[]>
  /** Search parameters */
  searchParams?: URLSearchParams
}

/**
 * MDX route handler options
 */
export interface MDXRouteHandlerOptions<TData extends MDXLDData = MDXLDData> {
  /** Function to load MDX document by slug */
  getDocument: (slug: string[]) => Promise<MDXLDDocument<TData> | null>
  /** Transform document before sending */
  transform?: (doc: MDXLDDocument<TData>) => unknown
  /** Handle not found */
  notFound?: () => Response
}

/**
 * Create a route handler for MDX documents
 *
 * @param options - Handler options
 * @returns Next.js route handler function
 *
 * @example
 * ```ts
 * // app/api/docs/[...slug]/route.ts
 * import { createMDXRouteHandler } from '@mdxe/next'
 * import { loadDocument } from './loader'
 *
 * export const GET = createMDXRouteHandler({
 *   getDocument: async (slug) => loadDocument(slug.join('/')),
 * })
 * ```
 */
export function createMDXRouteHandler<TData extends MDXLDData = MDXLDData>(
  options: MDXRouteHandlerOptions<TData>
): (request: Request, context: { params: Promise<{ slug?: string[] }> }) => Promise<Response> {
  const { getDocument, transform, notFound } = options

  return async (request: Request, context: { params: Promise<{ slug?: string[] }> }) => {
    const params = await context.params
    const slug = params.slug || []

    const document = await getDocument(slug)

    if (!document) {
      if (notFound) {
        return notFound()
      }
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const data = transform ? transform(document) : document

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

/**
 * Page props for MDX pages
 */
export interface MDXPageProps<TData extends MDXLDData = MDXLDData> {
  /** MDX document */
  doc: MDXLDDocument<TData>
  /** Page slug */
  slug: string[]
  /** Additional page data */
  meta?: Record<string, unknown>
}

/**
 * Static params for Next.js generateStaticParams
 */
export interface StaticParams {
  slug: string[]
}

/**
 * Generate static params from MDX documents
 *
 * @param documents - Array of documents or function to get documents
 * @param options - Generation options
 * @returns Array of static params
 *
 * @example
 * ```ts
 * // app/docs/[...slug]/page.tsx
 * import { generateStaticParams } from '@mdxe/next'
 *
 * export async function generateStaticParams() {
 *   return generateMDXStaticParams(getDocuments)
 * }
 * ```
 */
export async function generateMDXStaticParams<TData extends MDXLDData = MDXLDData>(
  documents: MDXLDDocument<TData>[] | (() => Promise<MDXLDDocument<TData>[]>),
  options: { slugField?: string } = {}
): Promise<StaticParams[]> {
  const { slugField = 'slug' } = options

  const docs = typeof documents === 'function' ? await documents() : documents

  return docs
    .map((doc) => {
      const slug = doc.data[slugField as keyof TData]
      if (typeof slug === 'string') {
        return { slug: slug.split('/').filter(Boolean) }
      }
      if (Array.isArray(slug)) {
        return { slug: slug.map(String) }
      }
      return null
    })
    .filter((p): p is StaticParams => p !== null)
}

/**
 * Metadata generator options
 */
export interface MetadataOptions {
  /** Base URL for canonical URLs */
  baseUrl?: string
  /** Default title template */
  titleTemplate?: string
  /** Default description */
  defaultDescription?: string
}

/**
 * Next.js metadata object (simplified)
 */
export interface Metadata {
  title?: string | { default: string; template?: string }
  description?: string
  openGraph?: {
    title?: string
    description?: string
    url?: string
    type?: string
  }
  twitter?: {
    card?: string
    title?: string
    description?: string
  }
}

/**
 * Generate metadata from MDX document
 *
 * @param doc - MDX document
 * @param options - Metadata options
 * @returns Next.js metadata object
 *
 * @example
 * ```ts
 * // app/docs/[...slug]/page.tsx
 * import { generateMDXMetadata } from '@mdxe/next'
 *
 * export async function generateMetadata({ params }) {
 *   const doc = await getDocument(params.slug)
 *   return generateMDXMetadata(doc, { baseUrl: 'https://example.com' })
 * }
 * ```
 */
export function generateMDXMetadata<TData extends MDXLDData = MDXLDData>(
  doc: MDXLDDocument<TData> | null,
  options: MetadataOptions = {}
): Metadata {
  const { baseUrl = '', titleTemplate, defaultDescription } = options

  if (!doc) {
    return {
      title: 'Not Found',
      description: defaultDescription,
    }
  }

  const title = getStringField(doc.data, 'title') || getStringField(doc.data, 'name') || 'Untitled'
  const description = getStringField(doc.data, 'description') || defaultDescription
  const slug = getStringField(doc.data, 'slug') || ''

  const metadata: Metadata = {
    title: titleTemplate ? { default: title, template: titleTemplate } : title,
    description,
  }

  if (baseUrl) {
    const url = `${baseUrl}/${slug}`
    metadata.openGraph = {
      title,
      description,
      url,
      type: 'article',
    }
    metadata.twitter = {
      card: 'summary_large_image',
      title,
      description,
    }
  }

  return metadata
}

/**
 * Safely get a string field from document data
 */
function getStringField(data: MDXLDData, field: string): string | undefined {
  const value = data[field as keyof MDXLDData]
  return typeof value === 'string' ? value : undefined
}

/**
 * Parse MDX content from a string
 *
 * @param content - Raw MDX content
 * @returns Parsed MDX document
 */
export function parseMDX(content: string): MDXLDDocument {
  return parse(content)
}

/**
 * Content loader configuration
 */
export interface ContentLoaderConfig {
  /** Base directory for content */
  contentDir?: string
  /** File extensions to match */
  extensions?: string[]
}

/**
 * Breadcrumb item
 */
export interface BreadcrumbItem {
  /** Display title */
  title: string
  /** Link href */
  href: string
}

/**
 * Generate breadcrumbs from slug
 *
 * @param slug - Page slug segments
 * @param options - Generation options
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(
  slug: string[],
  options: { basePath?: string; homeLabel?: string } = {}
): BreadcrumbItem[] {
  const { basePath = '', homeLabel = 'Home' } = options
  const breadcrumbs: BreadcrumbItem[] = [{ title: homeLabel, href: basePath || '/' }]

  for (let i = 0; i < slug.length; i++) {
    const segment = slug[i]
    if (!segment) continue

    const title = segment
      .replace(/-/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())

    breadcrumbs.push({
      title,
      href: `${basePath}/${slug.slice(0, i + 1).join('/')}`,
    })
  }

  return breadcrumbs
}

/**
 * Navigation item
 */
export interface NavigationItem<TData extends MDXLDData = MDXLDData> {
  /** Document reference */
  doc: MDXLDDocument<TData>
  /** Page title */
  title: string
  /** Page href */
  href: string
}

/**
 * Get previous and next pages for navigation
 *
 * @param currentSlug - Current page slug
 * @param documents - Array of documents in order
 * @param options - Navigation options
 * @returns Previous and next navigation items
 */
export function getNavigation<TData extends MDXLDData = MDXLDData>(
  currentSlug: string[],
  documents: MDXLDDocument<TData>[],
  options: { slugField?: string; basePath?: string } = {}
): { previous?: NavigationItem<TData>; next?: NavigationItem<TData> } {
  const { slugField = 'slug', basePath = '' } = options
  const currentSlugStr = currentSlug.join('/')

  const currentIndex = documents.findIndex((doc) => {
    const docSlug = doc.data[slugField as keyof TData]
    if (typeof docSlug === 'string') {
      return docSlug === currentSlugStr
    }
    if (Array.isArray(docSlug)) {
      return docSlug.join('/') === currentSlugStr
    }
    return false
  })

  if (currentIndex === -1) {
    return {}
  }

  const makeNavItem = (doc: MDXLDDocument<TData>): NavigationItem<TData> => {
    const slug = doc.data[slugField as keyof TData]
    const slugStr = typeof slug === 'string' ? slug : Array.isArray(slug) ? slug.join('/') : ''
    return {
      doc,
      title: getStringField(doc.data, 'title') || getStringField(doc.data, 'name') || 'Untitled',
      href: `${basePath}/${slugStr}`,
    }
  }

  return {
    previous: currentIndex > 0 ? makeNavItem(documents[currentIndex - 1]!) : undefined,
    next: currentIndex < documents.length - 1 ? makeNavItem(documents[currentIndex + 1]!) : undefined,
  }
}

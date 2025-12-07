/**
 * @mdxe/honox/client - Client utilities for HonoX + MDXLD
 *
 * Provides client-side utilities for hydrating MDXLD components
 * and managing islands with linked data context.
 *
 * @packageDocumentation
 */

import type { MDXLDData } from 'mdxld'

/**
 * Options for creating the MDXLD client
 */
export interface MDXLDClientOptions {
  /**
   * Custom hydration function
   */
  hydrate?: (element: unknown, root: Element) => void | Promise<void>

  /**
   * Enable JSON-LD structured data extraction
   * @default true
   */
  extractJsonLd?: boolean

  /**
   * Callback when frontmatter is extracted
   */
  onFrontmatter?: (data: MDXLDData) => void
}

/**
 * Extract JSON-LD data from the page
 *
 * Finds and parses all JSON-LD script tags in the document.
 *
 * @returns Array of parsed JSON-LD objects
 */
export function extractJsonLd(): Record<string, unknown>[] {
  if (typeof document === 'undefined') return []

  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  const results: Record<string, unknown>[] = []

  scripts.forEach((script) => {
    try {
      const data = JSON.parse(script.textContent || '{}')
      results.push(data)
    } catch {
      // Ignore invalid JSON-LD
    }
  })

  return results
}

/**
 * Extract frontmatter data from page metadata
 *
 * Looks for frontmatter data embedded in meta tags.
 *
 * @returns Frontmatter data object
 */
export function extractFrontmatter(): MDXLDData {
  if (typeof document === 'undefined') return {}

  const data: MDXLDData = {}

  // Extract from meta tags with mdxld: prefix
  const metas = document.querySelectorAll('meta[name^="mdxld:"]')
  metas.forEach((meta) => {
    const name = meta.getAttribute('name')?.replace('mdxld:', '')
    const content = meta.getAttribute('content')
    if (name && content) {
      try {
        data[name] = JSON.parse(content)
      } catch {
        data[name] = content
      }
    }
  })

  return data
}

/**
 * Create MDXLD client for HonoX
 *
 * This initializes the client-side handling for MDXLD documents,
 * including island hydration and JSON-LD extraction.
 *
 * @param options - Client options
 *
 * @example
 * ```ts
 * // app/client.ts
 * import { createMdxldClient } from '@mdxe/honox/client'
 *
 * createMdxldClient({
 *   onFrontmatter: (data) => {
 *     console.log('Page frontmatter:', data)
 *   }
 * })
 * ```
 */
export async function createMdxldClient(options: MDXLDClientOptions = {}): Promise<void> {
  const { extractJsonLd: shouldExtractJsonLd = true, onFrontmatter } = options

  // Initialize HonoX client
  const { createClient } = await import('honox/client')
  createClient(options.hydrate ? { hydrate: options.hydrate } : undefined)

  // Extract JSON-LD if enabled
  if (shouldExtractJsonLd) {
    const jsonldData = extractJsonLd()
    if (jsonldData.length > 0) {
      // Store in window for access by components
      ;(window as unknown as { __MDXLD_JSONLD__: Record<string, unknown>[] }).__MDXLD_JSONLD__ = jsonldData
    }
  }

  // Extract and callback with frontmatter
  if (onFrontmatter) {
    const frontmatter = extractFrontmatter()
    if (Object.keys(frontmatter).length > 0) {
      onFrontmatter(frontmatter)
    }
  }
}

/**
 * Get JSON-LD data from the page (client-side)
 *
 * @returns Array of JSON-LD objects or undefined if not available
 */
export function getPageJsonLd(): Record<string, unknown>[] | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { __MDXLD_JSONLD__?: Record<string, unknown>[] }).__MDXLD_JSONLD__
}

/**
 * Hook for accessing MDXLD context in islands
 *
 * This is a simple context provider pattern for use in island components.
 *
 * @example
 * ```tsx
 * // app/islands/content-meta.tsx
 * import { useMdxldContext } from '@mdxe/honox/client'
 *
 * export default function ContentMeta() {
 *   const jsonld = getPageJsonLd()
 *   return <div>{jsonld?.[0]?.['@type']}</div>
 * }
 * ```
 */
export function useMdxldContext() {
  return {
    jsonld: getPageJsonLd(),
    frontmatter: extractFrontmatter(),
  }
}

export default createMdxldClient

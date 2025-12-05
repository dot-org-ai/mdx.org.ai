/**
 * @mdxe/expo/router - Expo Router integration for MDX content
 *
 * Provides utilities for using MDX content with Expo Router's
 * file-based routing system.
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'

/**
 * Route metadata extracted from MDX frontmatter
 */
export interface MDXRouteMetadata {
  /**
   * Route title (for navigation headers)
   */
  title?: string

  /**
   * Route description (for SEO/meta)
   */
  description?: string

  /**
   * Whether to show in navigation
   */
  showInNav?: boolean

  /**
   * Navigation order (lower = higher priority)
   */
  order?: number

  /**
   * Route icon name (for navigation)
   */
  icon?: string

  /**
   * Additional route-specific metadata
   */
  [key: string]: unknown
}

/**
 * MDX route definition
 */
export interface MDXRoute {
  /**
   * Route path (e.g., '/blog/hello-world')
   */
  path: string

  /**
   * Route segment (e.g., 'hello-world')
   */
  segment: string

  /**
   * Parsed MDX document
   */
  document: MDXLDDocument

  /**
   * Route metadata from frontmatter
   */
  metadata: MDXRouteMetadata
}

/**
 * Extract route metadata from MDX document
 */
export function extractRouteMetadata(doc: MDXLDDocument): MDXRouteMetadata {
  const { data } = doc

  return {
    title: data.title as string | undefined,
    description: data.description as string | undefined,
    showInNav: data.showInNav as boolean | undefined,
    order: data.order as number | undefined,
    icon: data.icon as string | undefined,
    ...data,
  }
}

/**
 * Create an MDX route from content
 */
export function createMDXRoute(path: string, content: string): MDXRoute {
  const document = parse(content)
  const metadata = extractRouteMetadata(document)
  const segments = path.split('/').filter(Boolean)
  const segment = segments[segments.length - 1] || ''

  return {
    path,
    segment,
    document,
    metadata,
  }
}

/**
 * Configuration for MDX route loader
 */
export interface MDXRouteLoaderConfig {
  /**
   * Base path for routes
   */
  basePath?: string

  /**
   * File extension to match (default: '.mdx')
   */
  extension?: string

  /**
   * Transform route path before use
   */
  transformPath?: (path: string) => string
}

/**
 * Create a route loader for Expo Router
 *
 * @example
 * ```tsx
 * // In app/_layout.tsx
 * import { createRouteLoader } from '@mdxe/expo/router'
 *
 * const loader = createRouteLoader({
 *   basePath: '/content'
 * })
 *
 * export default function Layout() {
 *   // Use loader in your layout
 * }
 * ```
 */
export function createRouteLoader(config: MDXRouteLoaderConfig = {}) {
  const { basePath = '', extension = '.mdx', transformPath } = config

  return {
    /**
     * Get the base path
     */
    getBasePath(): string {
      return basePath
    },

    /**
     * Transform a file path to a route path
     */
    toRoutePath(filePath: string): string {
      let routePath = filePath
        .replace(new RegExp(`${extension}$`), '')
        .replace(/index$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1')

      if (transformPath) {
        routePath = transformPath(routePath)
      }

      return basePath + routePath
    },

    /**
     * Check if a path matches this loader
     */
    matches(path: string): boolean {
      return path.startsWith(basePath)
    },
  }
}

/**
 * Hook options for useMDXRoute
 */
export interface UseMDXRouteOptions {
  /**
   * Fallback content if route not found
   */
  fallback?: string
}

/**
 * Placeholder for useMDXRoute hook
 *
 * This will be implemented with actual React Native hooks
 * when integrated with Expo Router.
 */
export function useMDXRoute(_options: UseMDXRouteOptions = {}): MDXRoute | null {
  // Placeholder - would use useLocalSearchParams from expo-router
  // and load the corresponding MDX content
  return null
}

// Re-export types
export type { MDXLDDocument } from 'mdxld'

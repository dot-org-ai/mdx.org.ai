/**
 * @mdxe/expo - Expo/React Native runtime for MDXLD documents
 *
 * Provides utilities for rendering and evaluating MDX content in
 * Expo/React Native applications.
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'

export { parse, type MDXLDDocument }

/**
 * Configuration options for the Expo MDX runtime
 */
export interface ExpoMDXConfig {
  /**
   * Components to make available in MDX
   */
  components?: Record<string, React.ComponentType<unknown>>

  /**
   * Base URL for resolving relative imports
   */
  baseUrl?: string

  /**
   * Whether to use Expo Router for navigation
   */
  useRouter?: boolean

  /**
   * Custom scope variables available in MDX expressions
   */
  scope?: Record<string, unknown>
}

/**
 * Default configuration
 */
export const defaultConfig: ExpoMDXConfig = {
  components: {},
  useRouter: true,
  scope: {},
}

/**
 * Result of MDX evaluation
 */
export interface MDXEvaluateResult<T = unknown> {
  /**
   * The evaluated default export (React component)
   */
  default: React.ComponentType<T>

  /**
   * Named exports from the MDX file
   */
  exports: Record<string, unknown>

  /**
   * Parsed frontmatter data
   */
  data: Record<string, unknown>
}

/**
 * Create an MDX runtime for Expo
 *
 * @example
 * ```tsx
 * import { createMDXRuntime } from '@mdxe/expo'
 * import { Text, View } from 'react-native'
 *
 * const runtime = createMDXRuntime({
 *   components: { Text, View }
 * })
 *
 * const content = await runtime.evaluate(mdxString)
 * ```
 */
export function createMDXRuntime(config: ExpoMDXConfig = {}) {
  const mergedConfig = { ...defaultConfig, ...config }

  return {
    /**
     * Parse MDX content without evaluation
     */
    parse(content: string): MDXLDDocument {
      return parse(content)
    },

    /**
     * Get configuration
     */
    getConfig(): ExpoMDXConfig {
      return mergedConfig
    },

    /**
     * Get available components
     */
    getComponents(): Record<string, React.ComponentType<unknown>> {
      return mergedConfig.components || {}
    },
  }
}

/**
 * Load MDX content from a file path (Expo filesystem)
 *
 * @example
 * ```tsx
 * import { loadMDX } from '@mdxe/expo'
 *
 * const doc = await loadMDX('content/hello.mdx')
 * ```
 */
export async function loadMDX(path: string): Promise<MDXLDDocument> {
  // In a real implementation, this would use expo-file-system
  // For now, we provide a placeholder that works with bundled assets
  throw new Error(
    `loadMDX is not yet implemented. Path: ${path}. ` +
    'Use bundled assets or fetch from a remote source instead.'
  )
}

/**
 * Fetch MDX content from a URL
 *
 * @example
 * ```tsx
 * import { fetchMDX } from '@mdxe/expo'
 *
 * const doc = await fetchMDX('https://example.com/content.mdx')
 * ```
 */
export async function fetchMDX(url: string): Promise<MDXLDDocument> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch MDX from ${url}: ${response.statusText}`)
  }
  const content = await response.text()
  return parse(content)
}

// Re-export types
export type { MDXLDDocument } from 'mdxld'

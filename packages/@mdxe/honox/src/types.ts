/**
 * @mdxe/honox - Type definitions
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type { Plugin } from 'vite'

/**
 * Options for the MDXLD Vite plugin
 */
export interface MDXLDVitePluginOptions {
  /**
   * Enable JSON-LD context processing
   * @default true
   */
  jsonld?: boolean

  /**
   * Custom remark plugins to add
   */
  remarkPlugins?: unknown[]

  /**
   * Custom rehype plugins to add
   */
  rehypePlugins?: unknown[]

  /**
   * JSX import source
   * @default 'hono/jsx'
   */
  jsxImportSource?: string

  /**
   * Provider import source for wrapping MDX content
   */
  providerImportSource?: string

  /**
   * Transform frontmatter data before rendering
   */
  transformFrontmatter?: (data: MDXLDData) => MDXLDData | Promise<MDXLDData>
}

/**
 * Options for creating the HonoX app with MDXLD support
 */
export interface CreateAppOptions {
  /**
   * Base path for routes
   * @default '/'
   */
  basePath?: string

  /**
   * Content directory for MDX files
   * @default 'app/routes'
   */
  contentDir?: string

  /**
   * Enable tracing/logging
   * @default false
   */
  tracing?: boolean
}

/**
 * MDX route module export shape
 */
export interface MDXRouteModule {
  /**
   * The default export is the MDX component
   */
  default: (props: unknown) => unknown

  /**
   * Frontmatter data exported from the MDX file
   */
  frontmatter?: MDXLDData
}

/**
 * Props passed to MDX components in HonoX
 */
export interface MDXComponentProps {
  /**
   * Additional components to use in MDX
   */
  components?: Record<string, (props: unknown) => unknown>

  /**
   * The parsed MDXLD document data
   */
  document?: MDXLDDocument
}

/**
 * Context type for MDXLD documents in HonoX
 */
export interface MDXLDContext {
  /**
   * The parsed document
   */
  document: MDXLDDocument

  /**
   * JSON-LD representation
   */
  jsonld?: Record<string, unknown>

  /**
   * Route path
   */
  path: string
}


/**
 * Options for the MDXLD renderer middleware
 */
export interface MDXLDRendererOptions {
  /**
   * Default page title
   */
  defaultTitle?: string

  /**
   * Include default styles
   * @default true
   */
  defaultStyles?: boolean

  /**
   * Custom CSS to include
   */
  styles?: string

  /**
   * Custom head content
   */
  head?: string

  /**
   * Base URL for JSON-LD @id generation
   */
  baseUrl?: string
}

/**
 * Route handler options for MDXLD content
 */
export interface MDXLDRouteOptions {
  /**
   * Transform document before rendering
   */
  transform?: (doc: MDXLDDocument) => MDXLDDocument | Promise<MDXLDDocument>

  /**
   * Custom loader for MDX content
   */
  loader?: (path: string) => Promise<string | null> | string | null

  /**
   * Cache options
   */
  cache?: {
    enabled?: boolean
    ttl?: number
  }
}

// Re-export mdxld types
export type { MDXLDDocument, MDXLDData } from 'mdxld'

/**
 * @mdxe/honox - HonoX integration for MDXLD
 *
 * This package provides seamless integration between HonoX and MDXLD,
 * enabling file-based routing with MDX files containing linked data.
 *
 * Features:
 * - Vite plugin for MDXLD processing
 * - Server utilities for document loading and caching
 * - Client utilities for hydration and JSON-LD extraction
 * - Renderer middleware with JSON-LD structured data
 * - Islands architecture support
 *
 * @packageDocumentation
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite'
 * import honox from 'honox/vite'
 * import { mdxld } from '@mdxe/honox/vite'
 *
 * export default defineConfig({
 *   plugins: [honox(), mdxld()]
 * })
 * ```
 *
 * @example
 * ```tsx
 * // app/routes/_renderer.tsx
 * import { mdxldRenderer } from '@mdxe/honox/renderer'
 *
 * export default mdxldRenderer({
 *   defaultTitle: 'My Site',
 *   baseUrl: 'https://example.com'
 * })
 * ```
 *
 * @example
 * ```ts
 * // app/client.ts
 * import { createMdxldClient } from '@mdxe/honox/client'
 *
 * createMdxldClient()
 * ```
 */

// Re-export from vite
export { mdxld, createMdxldConfig, getDefaultRemarkPlugins } from './vite.js'

// Re-export from server
export {
  mdxldMiddleware,
  getMdxldContext,
  createJsonLd,
  createMdxldRoute,
  clearDocumentCache,
  invalidateDocumentCache,
  loadMdxldModules,
  createContentIndex,
  parse,
  stringify,
} from './server.js'

// Re-export from client
export { createMdxldClient, extractJsonLd, extractFrontmatter, getPageJsonLd, useMdxldContext } from './client.js'

// Re-export from renderer
export { mdxldRenderer, createDocumentRenderer, MDXProvider, StructuredData, Head } from './renderer.js'

// Re-export types
export type {
  MDXLDVitePluginOptions,
  CreateAppOptions,
  MDXRouteModule,
  MDXComponentProps,
  MDXLDContext,
  MDXLDRendererOptions,
  MDXLDRouteOptions,
  MDXLDDocument,
  MDXLDData,
} from './types.js'

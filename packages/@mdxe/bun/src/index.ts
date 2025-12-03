/**
 * @mdxe/bun - Bun runtime for mdxe
 *
 * Fast MDX server using Bun's native APIs with Hono for routing.
 * Optimized for Bun's performance characteristics.
 *
 * @packageDocumentation
 */

export { parse, stringify } from 'mdxld'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

export {
  createApp,
  createDevServer,
  createServer,
  type ServerOptions,
  type BuildOptions,
  type SiteConfig,
} from './server.js'

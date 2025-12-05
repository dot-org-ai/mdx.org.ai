/**
 * @mdxe/payload - Generate and run Payload CMS on Cloudflare Workers
 *
 * This package provides:
 * - Worker handler for running Payload on Cloudflare Workers
 * - Configuration builder for mdxdb-backed Payload apps
 * - Collection generator from MDX type definitions
 *
 * @example Quick Start
 * ```ts
 * // worker.ts
 * import { createPayloadWorker } from '@mdxe/payload'
 * import { MDXDatabase } from '@mdxdb/sqlite'
 *
 * export { MDXDatabase }
 * export default createPayloadWorker({
 *   namespace: 'example.com',
 *   database: 'sqlite',
 * })
 * ```
 *
 * @example With Custom Collections
 * ```ts
 * import { createPayloadWorker, createContentCollections } from '@mdxe/payload'
 * import { MDXDatabase } from '@mdxdb/sqlite'
 *
 * export { MDXDatabase }
 * export default createPayloadWorker({
 *   namespace: 'example.com',
 *   database: 'sqlite',
 *   collections: createContentCollections(),
 * })
 * ```
 *
 * @example Generate Collections from MDX
 * ```ts
 * import { generateCollections } from '@mdxe/payload/generate'
 *
 * const collections = await generateCollections({
 *   source: './content',
 *   types: [
 *     { name: 'Post', slug: 'posts', fields: [...] },
 *     { name: 'Author', slug: 'authors', fields: [...] },
 *   ],
 * })
 * ```
 *
 * @packageDocumentation
 */

export const name = '@mdxe/payload'

// Worker
export { createPayloadWorker } from './worker.js'
export { default as defaultWorker } from './worker.js'

// Config builder
export {
  createPayloadConfig,
  createMinimalConfig,
  createContentCollections,
  createCommerceCollections,
  UsersCollection,
  MediaCollection,
} from './config.js'

// Generator
export {
  generateCollections,
  parseTypeFromMDX,
  processContentDirectory,
  typeToCollection,
} from './generate.js'

// CLI (for mdxe integration)
export { adminCommand } from './cli.js'
export type { AdminCommandOptions } from './cli.js'

// Re-export from @mdxdb/payload for convenience
export {
  sqliteAdapter,
  clickhouseAdapter,
  getNativeCollections,
  createVirtualCollection,
  ThingsCollection,
  RelationshipsCollection,
  SearchCollection,
  EventsCollection,
  ActionsCollection,
  ArtifactsCollection,
} from '@mdxdb/payload'

// Types
export type {
  // Worker types
  PayloadWorkerEnv,
  PayloadAppConfig,
  PayloadPluginConfig,
  PayloadHandler,
  PayloadWorker,

  // Generation types
  GenerateCollectionsOptions,
  TypeDefinition,
  FieldDefinition,
  RelationshipDefinition,

  // Cloudflare types
  ExecutionContext,
} from './types.js'

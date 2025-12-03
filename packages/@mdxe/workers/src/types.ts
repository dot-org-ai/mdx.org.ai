/**
 * @mdxe/workers Types
 *
 * Types for building and publishing Workers from MDX content
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'

/**
 * Complete namespace bundle ready for deployment
 */
export interface NamespaceBundle {
  /** Worker entry point (bundled Hono app) */
  worker: WorkerBundle

  /** MDX content (documents + functions) */
  content: ContentBundle

  /** Static assets */
  assets?: AssetBundle

  /** Namespace metadata */
  meta: NamespaceMeta
}

/**
 * Bundled worker code
 */
export interface WorkerBundle {
  /** Main module code (bundled worker) */
  main: string

  /** Entry point filename */
  entrypoint: string

  /** Additional ESM modules */
  modules?: WorkerModule[]

  /** Source map (optional) */
  sourceMap?: string
}

/**
 * Worker module for ESM bundles
 */
export interface WorkerModule {
  name: string
  code: string
  type: 'esm' | 'commonjs' | 'text' | 'json' | 'wasm'
}

/**
 * Content bundle with all MDX documents
 */
export interface ContentBundle {
  /** Documents keyed by path (/docs/intro, /blog/post-1) */
  documents: Record<string, ContentDocument>

  /** Exported functions from MDX (for RPC) */
  functions?: Record<string, ContentFunction>

  /** Content manifest hash */
  hash: string

  /** Total document count */
  count: number
}

/**
 * Individual content document
 */
export interface ContentDocument {
  /** URL path */
  path: string

  /** Frontmatter data */
  data: Record<string, unknown>

  /** Markdown content */
  content: string

  /** Compiled JS (if has code blocks) */
  compiled?: string

  /** Content hash for caching */
  hash: string
}

/**
 * Exported function from MDX
 */
export interface ContentFunction {
  /** Function name */
  name: string

  /** Source document path */
  source: string

  /** Compiled function code */
  compiled: string

  /** Function signature (for TypeScript) */
  signature?: string
}

/**
 * Asset bundle for static files
 */
export interface AssetBundle {
  /** Static files keyed by path */
  files: Record<string, AssetFile>

  /** Asset manifest hash */
  hash: string

  /** Total size in bytes */
  totalSize: number
}

/**
 * Individual asset file
 */
export interface AssetFile {
  /** File content (base64 for binary) */
  content: string

  /** Content type */
  contentType: string

  /** File size in bytes */
  size: number

  /** Content hash */
  hash: string

  /** Is binary (base64 encoded) */
  binary: boolean
}

/**
 * Namespace metadata
 */
export interface NamespaceMeta {
  /** Namespace name (domain) */
  name: string

  /** Version identifier */
  version?: string

  /** Build timestamp */
  built: string

  /** Worker configuration */
  config: WorkerConfig

  /** Build info */
  build: BuildInfo
}

/**
 * Worker runtime configuration
 */
export interface WorkerConfig {
  /** Compatibility date */
  compatibilityDate: string

  /** Compatibility flags */
  compatibilityFlags?: string[]

  /** Bindings */
  bindings?: BindingConfig[]
}

/**
 * Binding configuration
 */
export type BindingConfig =
  | { type: 'kv_namespace'; name: string; namespaceId?: string }
  | { type: 'd1'; name: string; databaseId?: string }
  | { type: 'r2_bucket'; name: string; bucketName?: string }
  | { type: 'service'; name: string; service: string; environment?: string }
  | { type: 'var'; name: string; value: string }
  | { type: 'secret'; name: string }

/**
 * Build information
 */
export interface BuildInfo {
  /** Build tool version */
  version: string

  /** Build timestamp */
  timestamp: string

  /** Build target */
  target: 'workers' | 'node' | 'bun'

  /** Minified */
  minified: boolean

  /** Source maps included */
  sourceMaps: boolean
}

/**
 * Build options
 */
export interface BuildOptions {
  /** Project directory */
  projectDir: string

  /** Output directory (optional, for file output) */
  outDir?: string

  /** Build target */
  target?: 'workers' | 'node' | 'bun'

  /** Minify output */
  minify?: boolean

  /** Generate source maps */
  sourceMaps?: boolean

  /** Content storage strategy */
  contentStorage?: 'embedded' | 'kv' | 'r2' | 'assets'

  /** Include static assets */
  includeAssets?: boolean

  /** Asset directory (relative to projectDir) */
  assetDir?: string

  /** Compatibility date */
  compatibilityDate?: string

  /** Compatibility flags */
  compatibilityFlags?: string[]

  /** Environment variables to embed */
  env?: Record<string, string>

  /** Verbose logging */
  verbose?: boolean
}

/**
 * Build result
 */
export interface BuildResult {
  /** Whether build succeeded */
  success: boolean

  /** The namespace bundle (if successful) */
  bundle?: NamespaceBundle

  /** Error message (if failed) */
  error?: string

  /** Build logs */
  logs: string[]

  /** Build duration in ms */
  duration: number
}

/**
 * Publish options
 */
export interface PublishOptions {
  /** Target namespace (domain like "docs.example.com") */
  namespace: string

  /** Authentication token (optional - falls back to wrangler OAuth) */
  token?: string

  /** Content storage strategy */
  contentStorage?: 'embedded' | 'kv' | 'r2' | 'assets'

  /** Workers for Platforms dispatch namespace */
  dispatchNamespace?: string

  /** Override Cloudflare account ID */
  accountId?: string

  /** Override API base URL (for proxy) */
  apiBaseUrl?: string

  /** KV namespace ID for content (if contentStorage = 'kv') */
  kvNamespaceId?: string

  /** R2 bucket name for assets */
  r2BucketName?: string

  /** Environment variables */
  env?: Record<string, string>

  /** Dry run - don't actually deploy */
  dryRun?: boolean

  /** Verbose logging */
  verbose?: boolean
}

/**
 * Publish result
 */
export interface PublishResult {
  /** Whether publish succeeded */
  success: boolean

  /** Deployed URL */
  url?: string

  /** Script identifier */
  scriptId?: string

  /** Content hash (for cache invalidation) */
  contentHash?: string

  /** Asset hash */
  assetHash?: string

  /** Error message if failed */
  error?: string

  /** Detailed logs */
  logs: string[]

  /** Publish duration in ms */
  duration: number
}

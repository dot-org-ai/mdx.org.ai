/**
 * @mdxdb/do Types
 *
 * Extended type definitions for Durable Object with hierarchy support.
 *
 * @packageDocumentation
 */

// Re-export base types from @mdxdb/sqlite
export type {
  Thing,
  Relationship,
  Provenance,
  ListOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  RelationshipQueryOptions,
  DataRow,
  RelsRow,
  MDXDatabaseRPC,
  Env as BaseEnv,
  MDXClientConfig as BaseMDXClientConfig,
} from '@mdxdb/sqlite'

/**
 * Parquet export options
 */
export interface ExportOptions {
  /** Include child DOs recursively */
  includeChildren?: boolean
  /** Maximum depth for recursive export */
  maxDepth?: number
  /** Filter by thing types */
  types?: string[]
  /** Only things updated since this date */
  since?: Date
  /** Compression for parquet output */
  compression?: 'UNCOMPRESSED' | 'SNAPPY' | 'GZIP' | 'ZSTD'
}

/**
 * Extended environment with DO bindings
 */
export interface Env {
  /** MDXDurableObject namespace */
  MDXDB: DurableObjectNamespace<MDXDurableObjectRPC>
  /** Optional R2 bucket for caching */
  CACHE?: R2Bucket
}

/**
 * Child DO info
 */
export interface ChildInfo {
  /** Child's $id URL */
  id: string
  /** Path on parent (e.g., '/headless.ly') */
  path: string
  /** DO stub ID for direct access */
  doId: string
}

/**
 * Extended RPC interface for MDXDurableObject
 */
export interface MDXDurableObjectRPC extends import('@mdxdb/sqlite').MDXDatabaseRPC {
  // Context (parent DO relationship)
  /** Get parent DO's $id (null if root) */
  $context(): Promise<string | null>
  /** Get parent DO's stub ID */
  $contextDoId(): Promise<string | null>

  // Child management
  /** Get all child DOs */
  getChildren(): Promise<ChildInfo[]>
  /** Get child by path */
  getChild(path: string): Promise<ChildInfo | null>

  // Parquet export
  /** Export this namespace to parquet */
  exportToParquet(options?: ExportOptions): Promise<ArrayBuffer>

  // WebSocket
  /** Handle incoming fetch (including WS upgrade) */
  fetch(request: Request): Promise<Response>
}

/**
 * Client configuration for MDXDurableObject
 */
export interface MDXDOClientConfig {
  /** The canonical URL ($id) of the target DO */
  $id: string
  /** DO namespace binding */
  binding: DurableObjectNamespace<MDXDurableObjectRPC>
}

/**
 * Serializable Thing (Date converted to ISO string)
 * Used for RPC transport where Date objects aren't serializable
 */
export interface SerializableThing<TData = Record<string, unknown>> {
  url: string
  type: string
  id: string
  data: TData
  content?: string
  '@context'?: string | Record<string, unknown>
  code?: string
  hash?: string
  at: string // ISO string instead of Date
  by?: string
  in?: string
  version: number
}

/**
 * Serializable Relationship (Date converted to ISO string)
 * Used for RPC transport where Date objects aren't serializable
 */
export interface SerializableRelationship<TData = Record<string, unknown>> {
  id: string
  predicate: string
  reverse?: string
  from: string
  to: string
  data?: TData
  at: string // ISO string instead of Date
  by?: string
  in?: string
  do?: string
}

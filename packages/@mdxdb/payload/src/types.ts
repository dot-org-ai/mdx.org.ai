/**
 * Types for @mdxdb/payload adapter
 *
 * Bridges Payload CMS's collection-based model with mdxdb's graph-based model.
 * Supports both SQLite (Durable Objects) and ClickHouse backends.
 *
 * @packageDocumentation
 */

import type { Payload, BaseDatabaseAdapter } from 'payload'

// =============================================================================
// Environment Types
// =============================================================================

/**
 * Environment bindings for SQLite mode (Durable Objects)
 */
export interface SQLiteEnv {
  /** Durable Object namespace binding for mdxdb */
  MDXDB: DurableObjectNamespace
}

/**
 * Environment bindings for ClickHouse mode (HTTP)
 */
export interface ClickHouseEnv {
  /** ClickHouse HTTP URL */
  CLICKHOUSE_URL: string
  /** ClickHouse username */
  CLICKHOUSE_USERNAME?: string
  /** ClickHouse password */
  CLICKHOUSE_PASSWORD?: string
  /** ClickHouse database name */
  CLICKHOUSE_DATABASE?: string
}

/**
 * Combined environment for both modes
 */
export type MDXDBEnv = SQLiteEnv | ClickHouseEnv | (SQLiteEnv & ClickHouseEnv)

// =============================================================================
// Adapter Configuration
// =============================================================================

/**
 * Base configuration for all mdxdb adapters
 */
export interface BaseMDXDBAdapterConfig {
  /**
   * Default namespace for collections
   * Used to namespace data in multi-tenant scenarios
   */
  namespace?: string

  /**
   * Whether to use ID type as UUID (default) or number
   */
  idType?: 'uuid' | 'number'

  /**
   * Enable debug logging
   */
  debug?: boolean
}

/**
 * Configuration for SQLite adapter (Durable Objects)
 */
export interface SQLiteAdapterConfig extends BaseMDXDBAdapterConfig {
  /**
   * Durable Object namespace binding
   * Get this from env.MDXDB in your Worker
   */
  binding: DurableObjectNamespace
}

/**
 * Configuration for ClickHouse adapter (HTTP)
 */
export interface ClickHouseAdapterConfig extends BaseMDXDBAdapterConfig {
  /**
   * ClickHouse HTTP URL
   */
  url: string

  /**
   * ClickHouse username
   */
  username?: string

  /**
   * ClickHouse password
   */
  password?: string

  /**
   * ClickHouse database name (default: mdxdb)
   */
  database?: string

  /**
   * Cache TTL in seconds (default: 60)
   */
  cacheTtl?: number
}

// =============================================================================
// Database Adapter Interface
// =============================================================================

/**
 * Extended database adapter interface for mdxdb
 */
export interface MDXDBAdapter extends BaseDatabaseAdapter {
  /**
   * The underlying mdxdb client
   */
  readonly client: MDXDBClient

  /**
   * Get the namespace for this adapter
   */
  readonly namespace: string

  /**
   * Get a collection as a mdxdb type
   */
  getType(collectionSlug: string): string
}

/**
 * Abstract mdxdb client interface
 * Implemented by both SQLite and ClickHouse adapters
 */
export interface MDXDBClient {
  /**
   * List things with optional filters
   */
  list(options?: QueryOptions): Promise<Thing[]>

  /**
   * Get a thing by URL
   */
  get(url: string): Promise<Thing | null>

  /**
   * Create a new thing
   */
  create<T = Record<string, unknown>>(options: CreateOptions<T>): Promise<Thing<T>>

  /**
   * Update an existing thing
   */
  update<T = Record<string, unknown>>(url: string, options: UpdateOptions<T>): Promise<Thing<T>>

  /**
   * Delete a thing
   */
  delete(url: string): Promise<boolean>

  /**
   * Search things
   */
  search(options: SearchOptions): Promise<Thing[]>

  /**
   * Create a relationship between things
   */
  relate<T = Record<string, unknown>>(options: RelateOptions<T>): Promise<Relationship<T>>

  /**
   * Remove a relationship
   */
  unrelate(from: string, type: string, to: string): Promise<boolean>

  /**
   * Get related things
   */
  related(url: string, type?: string, direction?: 'from' | 'to' | 'both'): Promise<Thing[]>
}

// =============================================================================
// Entity Types
// =============================================================================

/**
 * A Thing represents a node in the graph
 * Maps to a Payload document
 */
export interface Thing<TData = Record<string, unknown>> {
  ns: string
  type: string
  id: string
  url: string
  data: TData
  content?: string
  createdAt: Date
  updatedAt: Date
  '@context'?: string | Record<string, unknown>
}

/**
 * A Relationship represents an edge between things
 * Maps to Payload relationships/joins
 */
export interface Relationship<TData = Record<string, unknown>> {
  id: string
  type: string
  from: string
  to: string
  data?: TData
  createdAt: Date
}

// =============================================================================
// Query Options
// =============================================================================

export interface QueryOptions {
  ns?: string
  type?: string
  where?: Record<string, unknown>
  orderBy?: string
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

export interface SearchOptions {
  query: string
  type?: string
  limit?: number
  offset?: number
}

export interface CreateOptions<T = Record<string, unknown>> {
  ns: string
  type: string
  id?: string
  url?: string
  data: T
  content?: string
  '@context'?: string | Record<string, unknown>
}

export interface UpdateOptions<T = Record<string, unknown>> {
  data: Partial<T>
  content?: string
}

export interface RelateOptions<T = Record<string, unknown>> {
  from: string
  to: string
  type: string
  data?: T
}

// =============================================================================
// Cloudflare Types (subset for type safety)
// =============================================================================

export interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  idFromString(id: string): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
  newUniqueId(): DurableObjectId
}

export interface DurableObjectId {
  toString(): string
  name?: string
}

export interface DurableObjectStub {
  id: DurableObjectId
  name?: string
}

// =============================================================================
// Payload Integration Types
// =============================================================================

/**
 * Mapping configuration for Payload collections to mdxdb types
 */
export interface CollectionMapping {
  /**
   * The Payload collection slug
   */
  slug: string

  /**
   * The mdxdb type name (defaults to slug)
   */
  type?: string

  /**
   * Fields to include in the mdxdb data object
   * If not specified, all fields are included
   */
  fields?: string[]

  /**
   * Fields to use for full-text search indexing
   */
  searchFields?: string[]

  /**
   * Relationship fields to map to mdxdb relationships
   */
  relationships?: RelationshipMapping[]
}

/**
 * Configuration for mapping Payload relationships to mdxdb relationships
 */
export interface RelationshipMapping {
  /**
   * The Payload field name
   */
  field: string

  /**
   * The mdxdb relationship type
   */
  type: string

  /**
   * The target collection slug
   */
  to: string
}

/**
 * Result from a migration operation
 */
export interface MigrationResult {
  success: boolean
  message?: string
  error?: Error
  migrations?: string[]
}

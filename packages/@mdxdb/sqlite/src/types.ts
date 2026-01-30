/**
 * @mdxdb/sqlite Types
 *
 * Clean type definitions for _data and _rels tables.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Thing (graph node) - stored in _data table
 */
export interface Thing<TData = Record<string, unknown>> {
  /** Full URL: $id/type/id */
  url: string
  /** Entity type */
  type: string
  /** Local identifier within type */
  id: string
  /** JSON data payload */
  data: TData
  /** Markdown/text content */
  content?: string
  /** JSON-LD @context */
  '@context'?: string | Record<string, unknown>
  /** Last modified timestamp */
  at: Date
  /** Who made this change */
  by?: string
  /** Request/transaction context */
  in?: string
  /** Optimistic locking version */
  version: number
}

/**
 * Relationship (graph edge) - stored in _rels table
 */
export interface Relationship<TData = Record<string, unknown>> {
  /** Unique identifier */
  id: string
  /** Forward property name (e.g., 'author') */
  predicate: string
  /** Reverse property name (e.g., 'posts') */
  reverse?: string
  /** Source thing URL */
  from: string
  /** Target thing URL */
  to: string
  /** JSON data payload */
  data?: TData
  /** Timestamp */
  at: Date
  /** Who created this */
  by?: string
  /** Request/transaction context */
  in?: string
  /** Remote DO ID (for cross-DO relationships) */
  do?: string
}

// =============================================================================
// Provenance Context
// =============================================================================

/**
 * Provenance context for tracking who/when/where
 */
export interface Provenance {
  /** Who is making this change (user, agent, service) */
  by?: string
  /** Request/transaction context */
  in?: string
}

// =============================================================================
// Query Options
// =============================================================================

/**
 * Options for listing things
 */
export interface ListOptions {
  /** Filter by type */
  type?: string
  /** Filter by data fields */
  where?: Record<string, unknown>
  /** Order by field */
  orderBy?: string
  /** Order direction */
  order?: 'asc' | 'desc'
  /** Maximum results */
  limit?: number
  /** Skip results */
  offset?: number
}

/**
 * Options for creating a thing
 */
export interface CreateOptions<TData = Record<string, unknown>> extends Provenance {
  /** Entity type */
  type: string
  /** Local identifier (auto-generated if not provided) */
  id?: string
  /** JSON data payload */
  data: TData
  /** Markdown/text content */
  content?: string
  /** JSON-LD @context */
  '@context'?: string | Record<string, unknown>
}

/**
 * Options for updating a thing
 */
export interface UpdateOptions<TData = Record<string, unknown>> extends Provenance {
  /** Partial data to merge */
  data?: Partial<TData>
  /** New content */
  content?: string
  /** Expected version for optimistic locking */
  version?: number
}

/**
 * Options for creating a relationship
 */
export interface RelateOptions<TData = Record<string, unknown>> extends Provenance {
  /** Forward property name */
  predicate: string
  /** Reverse property name */
  reverse?: string
  /** Source thing URL */
  from: string
  /** Target thing URL */
  to: string
  /** JSON data payload */
  data?: TData
  /** Remote DO ID (for cross-DO relationships) */
  do?: string
}

/**
 * Options for querying relationships
 */
export interface RelationshipQueryOptions {
  /** Filter by predicate (forward direction) */
  predicate?: string
  /** Filter by reverse (reverse direction) */
  reverse?: string
  /** Limit results */
  limit?: number
  /** Skip results */
  offset?: number
}

// =============================================================================
// Row Types (internal SQLite representation)
// =============================================================================

/**
 * _data row in SQLite
 */
export interface DataRow {
  url: string
  type: string
  id: string
  data: string
  content: string | null
  context: string | null
  at: string
  by: string | null
  in: string | null
  version: number
}

/**
 * _rels row in SQLite
 */
export interface RelsRow {
  id: string
  predicate: string
  reverse: string | null
  from: string
  to: string
  data: string | null
  at: string
  by: string | null
  in: string | null
  do: string | null
}

// =============================================================================
// RPC Interface
// =============================================================================

/**
 * MDXDatabase RPC interface - methods callable on the DO stub
 */
export interface MDXDatabaseRPC {
  // Identity
  /** Get the DO's canonical $id */
  $id(): string

  // Thing operations
  list(options?: ListOptions): Promise<Thing[]>
  get(url: string): Promise<Thing | null>
  getById(type: string, id: string): Promise<Thing | null>
  create<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>>
  update<TData = Record<string, unknown>>(url: string, options: UpdateOptions<TData>): Promise<Thing<TData>>
  upsert<TData = Record<string, unknown>>(options: CreateOptions<TData>): Promise<Thing<TData>>
  delete(url: string): Promise<boolean>

  // Relationship operations
  relate<TData = Record<string, unknown>>(options: RelateOptions<TData>): Promise<Relationship<TData>>
  unrelate(from: string, predicate: string, to: string): Promise<boolean>

  /** Get related things via predicate (forward: from's predicate -> to) */
  related(url: string, predicate: string): Promise<Thing[]>
  /** Get related things via reverse (reverse: to's reverse -> from) */
  relatedBy(url: string, reverse: string): Promise<Thing[]>
  /** Get relationships from a thing */
  relationships(url: string, options?: RelationshipQueryOptions): Promise<Relationship[]>

  // Database info
  getDatabaseSize(): number
}

// =============================================================================
// Environment
// =============================================================================

/**
 * Environment with MDXDatabase binding
 */
export interface Env {
  /** MDXDatabase Durable Object namespace */
  MDXDB: DurableObjectNamespace<MDXDatabaseRPC>
}

/**
 * Client configuration
 */
export interface MDXClientConfig {
  /** The $id (canonical URL) for this database */
  $id: string
  /** DO namespace binding (for Workers) */
  binding?: DurableObjectNamespace<MDXDatabaseRPC>
  /** Use miniflare (for Node.js) */
  miniflare?: boolean
  /** Miniflare persistence path */
  persistPath?: string
}

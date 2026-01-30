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
  /** Markdown/text content (MDX source) */
  content?: string
  /** JSON-LD @context */
  '@context'?: string | Record<string, unknown>
  /** Compiled JavaScript code (from MDX) */
  code?: string
  /** Content hash for cache invalidation */
  hash?: string
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
  /** Markdown/text content (MDX source) */
  content?: string
  /** JSON-LD @context */
  '@context'?: string | Record<string, unknown>
  /** Pre-compiled JavaScript code */
  code?: string
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

/**
 * Options for calling a function on a thing
 */
export interface CallOptions {
  /** Function name to call */
  fn: string
  /** Arguments to pass */
  args?: unknown[]
  /** Timeout in milliseconds */
  timeout?: number
}

/**
 * Result of calling a function
 */
export interface CallResult<T = unknown> {
  /** Return value */
  result: T
  /** Execution time in ms */
  duration: number
  /** Logs captured during execution */
  logs?: string[]
}

/**
 * Metadata about exports from a thing's code
 */
export interface ExportMeta {
  /** Exported function names */
  functions: string[]
  /** Has default export (MDX component) */
  hasDefault: boolean
  /** Other named exports */
  exports: string[]
}

/**
 * Compiled module structure (matches @mdxe/isolate)
 */
export interface CompiledModule {
  /** Main entry module name */
  mainModule: string
  /** Module map: filename -> code */
  modules: Record<string, string>
  /** Frontmatter data */
  data: Record<string, unknown>
  /** Content hash */
  hash: string
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
  code: string | null
  hash: string | null
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

  // Code execution operations
  /** Compile MDX content to executable code */
  compile(url: string): Promise<CompiledModule>
  /** Call a function exported by a thing's code */
  call<T = unknown>(url: string, options: CallOptions): Promise<CallResult<T>>
  /** Get metadata about a thing's exports */
  meta(url: string): Promise<ExportMeta>
  /** Render a thing's default export (MDX component) */
  render(url: string, props?: Record<string, unknown>): Promise<string>

  // Database info
  getDatabaseSize(): number
}

// =============================================================================
// Environment
// =============================================================================

/**
 * Worker loader interface for dynamic worker creation
 */
export interface WorkerLoader {
  get(
    id: string,
    factory: () => Promise<WorkerConfig> | WorkerConfig
  ): Promise<WorkerInstance>
}

/**
 * Worker configuration for loader
 */
export interface WorkerConfig {
  modules: Array<{ name: string; esModule: string }>
  bindings?: Record<string, unknown>
  compatibilityDate?: string
  compatibilityFlags?: string[]
}

/**
 * Worker instance from loader
 */
export interface WorkerInstance {
  fetch(request: Request): Promise<Response>
  scheduled?(event: ScheduledEvent): Promise<void>
}

/**
 * Environment with MDXDatabase binding
 */
export interface Env {
  /** MDXDatabase Durable Object namespace */
  MDXDB: DurableObjectNamespace<MDXDatabaseRPC>
  /** Worker loader for dynamic code execution */
  LOADER?: WorkerLoader
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

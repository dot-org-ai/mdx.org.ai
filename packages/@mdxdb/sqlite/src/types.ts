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
//
// These are type aliases rather than interfaces on purpose: `SqlStorage.exec<T>`
// constrains `T extends Record<string, SqlStorageValue>`, and only object-literal
// types (not interfaces) get the implicit index signature that satisfies it.

/**
 * _data row in SQLite
 */
export type DataRow = {
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
export type RelsRow = {
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

/**
 * _meta row in SQLite
 */
export type MetaRow = {
  key: string
  value: string
}

// =============================================================================
// RPC Interface
// =============================================================================

/**
 * MDXDatabase RPC interface - methods callable on the DO stub
 */
export interface MDXDatabaseRPC {
  // Identity
  /**
   * Tell the object its name so it can derive its canonical $id.
   *
   * A Durable Object cannot read its own name (`ctx.id.name` is undefined
   * inside the object in workerd), so the caller that resolved the stub via
   * `idFromName(name)` passes the same name here. The derived $id is
   * persisted in `_meta` and survives re-instantiation; later calls with the
   * same name are no-ops, and a different name is rejected.
   *
   * `MDXClient` calls this automatically before its first RPC.
   *
   * @returns the canonical $id (`https://<name>`, no trailing slash)
   */
  $init(name: string): string
  /** Get the DO's canonical $id (throws until `$init()` has run) */
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

/**
 * RPC target type for Durable Object bindings.
 *
 * `@cloudflare/workers-types` constrains the generic on
 * `DurableObjectNamespace<T>` / `DurableObjectStub<T>` to
 * `Rpc.DurableObjectBranded` (nominal typing for classes that extend
 * `DurableObject` from `cloudflare:workers`), so the plain structural
 * `MDXDatabaseRPC` contract cannot be used there directly. This alias attaches
 * the brand to the contract so bindings, stubs and the `MDXDatabase` class all
 * share one method surface. Use `MDXDatabaseRPC` for anything that merely
 * *implements* the methods (clients, in-memory shims, adapters).
 */
export type MDXDatabaseTarget = MDXDatabaseRPC & Rpc.DurableObjectBranded

/** Durable Object namespace binding for `MDXDatabase` */
export type MDXDatabaseNamespace = DurableObjectNamespace<MDXDatabaseTarget>

/** Durable Object stub for a single `MDXDatabase` instance */
export type MDXDatabaseStub = DurableObjectStub<MDXDatabaseTarget>

// =============================================================================
// Environment
// =============================================================================

/**
 * Worker Loader binding (Cloudflare Dynamic Workers).
 *
 * Mirrors the runtime's `WorkerLoader` interface: `get()` returns a stub
 * synchronously; the code callback runs only when the isolate is not already
 * cached under `id`. Declared in wrangler as a `worker_loaders` binding (or
 * `unsafe.bindings[{ type: "worker-loader" }]` on older wrangler releases).
 */
export interface WorkerLoader {
  get(
    id: string | null,
    getCode: () => Promise<WorkerLoaderCode> | WorkerLoaderCode
  ): WorkerStub
}

/**
 * Code passed to `WorkerLoader.get()`.
 */
export interface WorkerLoaderCode {
  compatibilityDate: string
  compatibilityFlags?: string[]
  mainModule: string
  /** Module name -> ES module source (or a typed module descriptor) */
  modules: Record<string, string | WorkerLoaderModule>
  env?: Record<string, unknown>
  /** `null` blocks all outbound network access from the loaded worker */
  globalOutbound?: WorkerFetcher | null
}

/**
 * Typed module descriptor for `WorkerLoaderCode.modules`
 */
export interface WorkerLoaderModule {
  js?: string
  cjs?: string
  text?: string
  json?: unknown
}

/**
 * Stub returned by `WorkerLoader.get()`
 */
export interface WorkerStub {
  getEntrypoint(name?: string, options?: { props?: unknown }): WorkerFetcher
}

/**
 * Minimal fetch-capable entrypoint (a `Fetcher`)
 */
export interface WorkerFetcher {
  fetch(request: Request): Promise<Response>
}

/**
 * @deprecated Use `WorkerLoaderCode`; kept as an alias for older imports.
 */
export type WorkerConfig = WorkerLoaderCode

/**
 * @deprecated Use `WorkerFetcher`; kept as an alias for older imports.
 */
export type WorkerInstance = WorkerFetcher

/**
 * Environment with MDXDatabase binding
 */
export interface Env {
  /** MDXDatabase Durable Object namespace */
  MDXDB: MDXDatabaseNamespace
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
  binding?: MDXDatabaseNamespace
  /** Use miniflare (for Node.js) */
  miniflare?: boolean
  /** Miniflare persistence path */
  persistPath?: string
}

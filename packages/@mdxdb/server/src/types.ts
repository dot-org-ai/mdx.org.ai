/**
 * @mdxdb/server Types
 *
 * @packageDocumentation
 */

import type { MDXLDData } from 'mdxld'

// Re-export ai-database types for convenience
export type {
  DBClient,
  DBClientExtended,
  Thing,
  Relationship,
  QueryOptions,
  ThingSearchOptions,
  CreateOptions,
  UpdateOptions,
  RelateOptions,
  Event,
  Action,
  Artifact,
  CreateEventOptions,
  CreateActionOptions,
  StoreArtifactOptions,
  EventQueryOptions,
  ActionQueryOptions,
  ArtifactType,
  ActionStatus,
} from 'ai-database'

// =============================================================================
// Original Database interface (for backward compatibility)
// =============================================================================

/**
 * Query options for listing documents (simple interface)
 */
export interface ListOptions {
  limit?: number
  offset?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  type?: string | string[]
  prefix?: string
}

/**
 * Query result with pagination info
 */
export interface ListResult<TData extends MDXLDData = MDXLDData> {
  documents: Array<{ type?: string; id?: string; data?: TData; content?: string }>
  total: number
  hasMore: boolean
}

/**
 * Search options
 */
export interface SearchOptions extends ListOptions {
  query: string
  fields?: string[]
  semantic?: boolean
}

/**
 * Search result with relevance info
 */
export interface SearchResult<TData extends MDXLDData = MDXLDData> extends ListResult<TData> {
  documents: Array<{ type?: string; id?: string; data?: TData; content?: string; score?: number }>
}

/**
 * Get options
 */
export interface GetOptions {
  includeAst?: boolean
  includeCode?: boolean
}

/**
 * Set options
 */
export interface SetOptions {
  createOnly?: boolean
  updateOnly?: boolean
  version?: string
}

/**
 * Set result
 */
export interface SetResult {
  id: string
  version?: string
  created: boolean
}

/**
 * Delete options
 */
export interface DeleteOptions {
  soft?: boolean
  version?: string
}

/**
 * Delete result
 */
export interface DeleteResult {
  id: string
  deleted: boolean
}

/**
 * Simple Database interface for MDX documents
 */
export interface Database<TData extends MDXLDData = MDXLDData> {
  list(options?: ListOptions): Promise<ListResult<TData>>
  search(options: SearchOptions): Promise<SearchResult<TData>>
  get(id: string, options?: GetOptions): Promise<{ type?: string; id?: string; data?: TData; content?: string } | null>
  set(id: string, document: { type?: string; data?: TData; content?: string }, options?: SetOptions): Promise<SetResult>
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>
  close?(): Promise<void>
}

// =============================================================================
// Server Configuration
// =============================================================================

import type { DBClient, DBClientExtended } from 'ai-database'

/**
 * Configuration for the API server (simple Database interface)
 */
export interface ServerConfig<TData extends MDXLDData = MDXLDData> {
  /** Database instance to expose via API */
  database: Database<TData>
  /** Base path for the API routes (default: '/api/mdxdb') */
  basePath?: string
  /** Enable CORS (default: true) */
  cors?: boolean
  /** API key for authentication (optional) */
  apiKey?: string
}

/**
 * Configuration for the DBClient server (ai-database compatible)
 */
export interface DBServerConfig<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** DBClient instance to expose via API */
  client: DBClient<TData> | DBClientExtended<TData>
  /** Base path for the API routes (default: '/api/db') */
  basePath?: string
  /** Enable CORS (default: true) */
  cors?: boolean
  /** API key for authentication (optional) */
  apiKey?: string
}

/**
 * @deprecated Use ServerConfig instead
 */
export type ApiServerConfig<TData extends MDXLDData = MDXLDData> = ServerConfig<TData>

/**
 * API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * List request query parameters
 */
export interface ListQuery {
  limit?: string
  offset?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  type?: string
  prefix?: string
}

/**
 * Search request query parameters
 */
export interface SearchQuery extends ListQuery {
  q: string
  fields?: string
  semantic?: string
}

/**
 * Set request body
 */
export interface SetBody {
  type?: string
  context?: unknown
  data?: Record<string, unknown>
  content: string
  createOnly?: boolean
  updateOnly?: boolean
  version?: string
}

/**
 * Delete request query parameters
 */
export interface DeleteQuery {
  soft?: string
  version?: string
}

// =============================================================================
// DBClient API Types
// =============================================================================

/**
 * Thing query parameters
 */
export interface ThingQuery {
  ns?: string
  type?: string
  limit?: string
  offset?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}

/**
 * Thing where clause (JSON string)
 */
export interface ThingFindQuery extends ThingQuery {
  where?: string // JSON string
}

/**
 * Thing search query
 */
export interface ThingSearchQuery extends ThingQuery {
  query: string
  fields?: string
  minScore?: string
}

/**
 * Create thing body
 */
export interface CreateThingBody {
  ns: string
  type: string
  id?: string
  url?: string
  data: Record<string, unknown>
  '@context'?: string | Record<string, unknown>
}

/**
 * Update thing body
 */
export interface UpdateThingBody {
  data: Record<string, unknown>
}

/**
 * Relate body
 */
export interface RelateBody {
  type: string
  from: string
  to: string
  data?: Record<string, unknown>
}

/**
 * Event query parameters
 */
export interface EventQuery {
  type?: string
  source?: string
  correlationId?: string
  after?: string // ISO date string
  before?: string // ISO date string
  limit?: string
  offset?: string
}

/**
 * Create event body
 */
export interface CreateEventBody {
  type: string
  source: string
  data: Record<string, unknown>
  correlationId?: string
  causationId?: string
}

/**
 * Action query parameters
 */
export interface ActionQuery {
  actor?: string
  object?: string
  action?: string
  status?: string // comma-separated statuses
  limit?: string
  offset?: string
}

/**
 * Create action body
 */
export interface CreateActionBody {
  actor: string
  object: string
  action: string
  status?: string
  metadata?: Record<string, unknown>
}

/**
 * Complete action body
 */
export interface CompleteActionBody {
  result?: unknown
}

/**
 * Fail action body
 */
export interface FailActionBody {
  error: string
}

/**
 * Store artifact body
 */
export interface StoreArtifactBody {
  key: string
  type: string
  source: string
  sourceHash: string
  content: unknown
  ttl?: number
  metadata?: Record<string, unknown>
}

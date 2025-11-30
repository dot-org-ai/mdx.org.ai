/**
 * @mdxdb/api Types
 *
 * @packageDocumentation
 */

import type { Database } from 'mdxdb'
import type { MDXLDData } from 'mdxld'

/**
 * Configuration for the API server
 */
export interface ApiServerConfig<TData extends MDXLDData = MDXLDData> {
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

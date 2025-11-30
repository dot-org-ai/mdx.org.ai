/**
 * MDXDB API Client
 *
 * HTTP client for connecting to a remote mdxdb API server
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
  Database,
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
} from './types.js'

/**
 * Configuration for the API client
 */
export interface ApiClientConfig {
  /** Base URL of the mdxdb API server (e.g., 'https://api.example.com/api/mdxdb') */
  baseUrl: string
  /** API key for authentication (optional) */
  apiKey?: string
  /** Custom fetch implementation (for Node.js < 18 or custom handling) */
  fetch?: typeof fetch
  /** Default request headers */
  headers?: Record<string, string>
}

/**
 * API response wrapper
 */
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * HTTP client for mdxdb API server
 *
 * Implements the Database interface to connect to a remote mdxdb API.
 *
 * @example
 * ```ts
 * import { createApiClient } from 'mdxdb'
 *
 * const db = createApiClient({
 *   baseUrl: 'https://api.example.com/api/mdxdb',
 *   apiKey: 'your-api-key'
 * })
 *
 * // Use like any other Database implementation
 * const docs = await db.list({ type: 'Post' })
 * const doc = await db.get('posts/hello-world')
 * ```
 */
export class ApiClient<TData extends MDXLDData = MDXLDData> implements Database<TData> {
  private readonly baseUrl: string
  private readonly apiKey?: string
  private readonly fetchFn: typeof fetch
  private readonly defaultHeaders: Record<string, string>

  constructor(config: ApiClientConfig) {
    // Remove trailing slash from base URL
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.fetchFn = config.fetch ?? globalThis.fetch
    this.defaultHeaders = config.headers ?? {}

    if (!this.fetchFn) {
      throw new Error('fetch is not available. Please provide a fetch implementation.')
    }
  }

  /**
   * Make an API request
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | undefined>
  ): Promise<T> {
    // Build URL with query params
    let url = `${this.baseUrl}${path}`
    if (query) {
      const params = new URLSearchParams()
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          params.set(key, value)
        }
      }
      const queryString = params.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.defaultHeaders,
    }

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    // Make request
    const response = await this.fetchFn(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    const result = (await response.json()) as ApiResponse<T>

    if (!result.success) {
      throw new Error(result.error ?? 'Unknown API error')
    }

    return result.data as T
  }

  /**
   * List documents with optional filtering and pagination
   */
  async list(options: ListOptions = {}): Promise<ListResult<TData>> {
    return this.request<ListResult<TData>>('GET', '', undefined, {
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
      sortBy: options.sortBy,
      sortOrder: options.sortOrder,
      type: Array.isArray(options.type) ? options.type.join(',') : options.type,
      prefix: options.prefix,
    })
  }

  /**
   * Search documents by query
   */
  async search(options: SearchOptions): Promise<SearchResult<TData>> {
    return this.request<SearchResult<TData>>('GET', '/search', undefined, {
      q: options.query,
      limit: options.limit?.toString(),
      offset: options.offset?.toString(),
      fields: options.fields?.join(','),
      semantic: options.semantic?.toString(),
      type: Array.isArray(options.type) ? options.type.join(',') : options.type,
    })
  }

  /**
   * Get a document by ID
   */
  async get(id: string, _options: GetOptions = {}): Promise<MDXLDDocument<TData> | null> {
    try {
      return await this.request<MDXLDDocument<TData>>('GET', `/${encodeURIComponent(id)}`)
    } catch (error) {
      if (String(error).includes('not found')) {
        return null
      }
      throw error
    }
  }

  /**
   * Set/create a document
   */
  async set(id: string, document: MDXLDDocument<TData>, options: SetOptions = {}): Promise<SetResult> {
    return this.request<SetResult>('PUT', `/${encodeURIComponent(id)}`, {
      type: document.type,
      context: document.context,
      data: document.data,
      content: document.content,
      createOnly: options.createOnly,
      updateOnly: options.updateOnly,
      version: options.version,
    })
  }

  /**
   * Delete a document
   */
  async delete(id: string, options: DeleteOptions = {}): Promise<DeleteResult> {
    try {
      return await this.request<DeleteResult>('DELETE', `/${encodeURIComponent(id)}`, undefined, {
        soft: options.soft?.toString(),
        version: options.version,
      })
    } catch (error) {
      if (String(error).includes('not found')) {
        return { id, deleted: false }
      }
      throw error
    }
  }

  /**
   * Close the client (no-op for HTTP client)
   */
  async close(): Promise<void> {
    // No cleanup needed for HTTP client
  }
}

/**
 * Create an API client instance
 *
 * @example
 * ```ts
 * import { createApiClient } from 'mdxdb'
 *
 * // Connect to remote mdxdb API
 * const db = createApiClient({
 *   baseUrl: 'https://api.example.com/api/mdxdb',
 *   apiKey: process.env.MDXDB_API_KEY
 * })
 *
 * // List documents
 * const { documents } = await db.list({ type: 'BlogPost' })
 *
 * // Search
 * const results = await db.search({ query: 'hello world' })
 *
 * // Get a document
 * const doc = await db.get('posts/hello-world')
 *
 * // Create/update
 * await db.set('posts/new-post', {
 *   type: 'BlogPost',
 *   data: { title: 'New Post' },
 *   content: '# Hello!'
 * })
 *
 * // Delete
 * await db.delete('posts/old-post')
 * ```
 */
export function createApiClient<TData extends MDXLDData = MDXLDData>(
  config: ApiClientConfig
): Database<TData> {
  return new ApiClient<TData>(config)
}

/**
 * @mdxdb/api Client Implementation
 *
 * Fetch-based HTTP client for mdxdb API server
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
  ClientConfig,
  ApiResponse,
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
 * HTTP client for mdxdb API server
 *
 * Implements the Database interface to connect to a remote mdxdb API.
 *
 * @example
 * ```ts
 * import { createClient } from '@mdxdb/api'
 *
 * const db = createClient({
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
  private readonly timeout: number

  constructor(config: ClientConfig) {
    // Remove trailing slash from base URL
    this.baseUrl = config.baseUrl.replace(/\/$/, '')
    this.apiKey = config.apiKey
    this.fetchFn = config.fetch ?? globalThis.fetch
    this.defaultHeaders = config.headers ?? {}
    this.timeout = config.timeout ?? 30000

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

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      // Make request
      const response = await this.fetchFn(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      const result = (await response.json()) as ApiResponse<T>

      if (!result.success) {
        throw new Error(result.error ?? 'Unknown API error')
      }

      return result.data as T
    } finally {
      clearTimeout(timeoutId)
    }
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
 * import { createClient } from '@mdxdb/api'
 *
 * // Connect to remote mdxdb API
 * const db = createClient({
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
export function createClient<TData extends MDXLDData = MDXLDData>(
  config: ClientConfig
): Database<TData> {
  return new ApiClient<TData>(config)
}

/**
 * @deprecated Use createClient instead
 */
export const createApiClient = createClient

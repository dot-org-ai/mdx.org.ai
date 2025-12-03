/**
 * @mdxdb/sources - REST API source adapter
 */

import type {
  RestSourceConfig,
  RestEndpointConfig,
  SourceRequest,
  SourceResponse,
  SourceClient,
  AuthConfig,
  CacheConfig,
  TransformConfig,
  TransformContext,
} from './types.js'
import { CacheManager, createCacheConfig, defaultCache } from './cache.js'
import { createProxyFetch } from './proxy.js'

/**
 * REST source client
 */
export class RestSource implements SourceClient<RestSourceConfig> {
  readonly config: RestSourceConfig
  private fetchFn: typeof fetch
  private cache: CacheManager
  private rateLimitState = {
    tokens: 0,
    lastRefill: Date.now(),
  }

  constructor(config: RestSourceConfig, cache?: CacheManager) {
    this.config = config
    this.cache = cache || defaultCache

    // Set up fetch with proxy if configured
    this.fetchFn = config.proxy
      ? createProxyFetch(config.proxy)
      : fetch.bind(globalThis)
  }

  /**
   * Execute a request
   */
  async request<R = unknown>(req: SourceRequest): Promise<SourceResponse<R>> {
    // Apply rate limiting
    await this.checkRateLimit()

    // Build full URL
    const url = this.buildUrl(req)

    // Build request options
    const options = await this.buildRequestOptions(req)

    // Check cache
    const cacheConfig = this.getCacheConfig(req)
    if (cacheConfig && req.method === 'GET') {
      const cacheKey = this.cache.generateKey(req, cacheConfig)

      const result = await this.cache.get<R>(
        cacheKey,
        () => this.executeRequest<R>(url, options, req),
        cacheConfig
      )

      return {
        data: result.data,
        status: 200,
        headers: new Headers(),
        cached: result.cached,
        stale: result.stale,
        cacheKey,
      }
    }

    // Execute request directly
    const data = await this.executeRequest<R>(url, options, req)

    return {
      data,
      status: 200,
      headers: new Headers(),
      cached: false,
      stale: false,
    }
  }

  /**
   * Execute request with retries
   */
  private async executeRequest<R>(
    url: string,
    options: RequestInit,
    sourceRequest: SourceRequest
  ): Promise<R> {
    const { retry } = this.config
    let lastError: Error | null = null
    const maxAttempts = (retry?.maxRetries ?? 0) + 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchFn(url, options)

        // Check if we should retry this status
        if (!response.ok) {
          const shouldRetry =
            retry &&
            (retry.retryOn?.includes(response.status) ||
              (response.status >= 500 && !retry.retryOn))

          if (shouldRetry && attempt < maxAttempts) {
            lastError = new Error(`HTTP ${response.status}: ${response.statusText}`)
            await this.delay(this.getRetryDelay(attempt))
            continue
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Parse response
        const contentType = response.headers.get('Content-Type') || ''
        let data: unknown

        if (contentType.includes('application/json')) {
          data = await response.json()
        } else if (contentType.includes('text/')) {
          data = await response.text()
        } else {
          data = await response.arrayBuffer()
        }

        // Apply transform
        const transformConfig = this.getTransformConfig(sourceRequest)
        if (transformConfig?.response) {
          const context: TransformContext = {
            request: sourceRequest,
            response,
            source: this.config,
          }
          data = await transformConfig.response(data, context)
        }

        return data as R
      } catch (error) {
        lastError = error as Error

        // Check custom retry condition
        if (retry?.shouldRetry && !retry.shouldRetry(lastError, attempt)) {
          throw lastError
        }

        if (attempt < maxAttempts) {
          await this.delay(this.getRetryDelay(attempt))
          continue
        }
      }
    }

    throw lastError || new Error('Request failed')
  }

  /**
   * Build full URL from request
   */
  private buildUrl(req: SourceRequest): string {
    let path = req.path

    // Replace path parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
      }
    }

    // Build URL
    const url = new URL(path, this.config.baseUrl)

    // Add query parameters
    if (req.query) {
      for (const [key, value] of Object.entries(req.query)) {
        if (Array.isArray(value)) {
          for (const v of value) {
            url.searchParams.append(key, v)
          }
        } else {
          url.searchParams.set(key, value)
        }
      }
    }

    return url.toString()
  }

  /**
   * Build request options
   */
  private async buildRequestOptions(req: SourceRequest): Promise<RequestInit> {
    const headers = new Headers(this.config.headers)

    // Add request-specific headers
    if (req.headers) {
      for (const [key, value] of Object.entries(req.headers)) {
        headers.set(key, value)
      }
    }

    // Apply authentication
    await this.applyAuth(headers)

    // Build request init
    const init: RequestInit = {
      method: req.method,
      headers,
    }

    // Add body for non-GET requests
    if (req.body && req.method !== 'GET') {
      if (typeof req.body === 'string') {
        init.body = req.body
      } else {
        init.body = JSON.stringify(req.body)
        headers.set('Content-Type', 'application/json')
      }
    }

    return init
  }

  /**
   * Apply authentication to headers
   */
  private async applyAuth(headers: Headers): Promise<void> {
    const auth = this.config.auth
    if (!auth) return

    switch (auth.type) {
      case 'bearer': {
        const token = typeof auth.token === 'function' ? await auth.token() : auth.token
        headers.set('Authorization', `Bearer ${token}`)
        break
      }

      case 'basic': {
        const credentials = btoa(`${auth.username}:${auth.password}`)
        headers.set('Authorization', `Basic ${credentials}`)
        break
      }

      case 'api-key': {
        if (auth.header) {
          headers.set(auth.header, auth.key)
        }
        // Query param handled in buildUrl
        break
      }

      case 'oauth2': {
        // Token should be obtained via token endpoint
        // This is a simplified implementation
        const token = await this.getOAuth2Token(auth)
        headers.set('Authorization', `Bearer ${token}`)
        break
      }

      case 'custom': {
        const req = new Request('http://temp', { headers })
        const modified = await auth.handler(req)
        modified.headers.forEach((value, key) => headers.set(key, value))
        break
      }
    }
  }

  /**
   * Get OAuth2 access token
   */
  private async getOAuth2Token(
    auth: Extract<AuthConfig, { type: 'oauth2' }>
  ): Promise<string> {
    // This would be cached in a real implementation
    const response = await fetch(auth.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: auth.clientId,
        client_secret: auth.clientSecret,
        scope: auth.scopes?.join(' ') || '',
      }),
    })

    if (!response.ok) {
      throw new Error(`OAuth2 token request failed: ${response.status}`)
    }

    const data = (await response.json()) as { access_token: string }
    return data.access_token
  }

  /**
   * Get cache config for request
   */
  private getCacheConfig(req: SourceRequest): CacheConfig | null {
    // Check endpoint-specific config
    const endpoint = this.findEndpoint(req.path)
    if (endpoint?.cache) {
      return createCacheConfig(endpoint.cache)
    }

    // Use source-level cache config
    if (this.config.cache) {
      return createCacheConfig(this.config.cache)
    }

    return null
  }

  /**
   * Get transform config for request
   */
  private getTransformConfig(req: SourceRequest): TransformConfig | null {
    // Check endpoint-specific config
    const endpoint = this.findEndpoint(req.path)
    if (endpoint?.transform) {
      return endpoint.transform
    }

    // Use source-level transform config
    return this.config.transform || null
  }

  /**
   * Find endpoint config by path
   */
  private findEndpoint(path: string): RestEndpointConfig | null {
    if (!this.config.endpoints) return null

    for (const [name, endpoint] of Object.entries(this.config.endpoints)) {
      // Simple path matching (could be enhanced with path-to-regexp)
      const pattern = endpoint.path.replace(/:\w+/g, '[^/]+')
      if (new RegExp(`^${pattern}$`).test(path)) {
        return endpoint
      }
    }

    return null
  }

  /**
   * Check rate limit and wait if necessary
   */
  private async checkRateLimit(): Promise<void> {
    const limit = this.config.rateLimit
    if (!limit) return

    const now = Date.now()
    const elapsed = now - this.rateLimitState.lastRefill

    // Refill tokens
    if (elapsed >= limit.window * 1000) {
      this.rateLimitState.tokens = limit.limit
      this.rateLimitState.lastRefill = now
    }

    // Check if we have tokens
    if (this.rateLimitState.tokens <= 0) {
      switch (limit.strategy) {
        case 'throw':
          throw new Error('Rate limit exceeded')

        case 'wait':
        case 'queue':
          const waitTime = limit.window * 1000 - elapsed
          await this.delay(waitTime)
          this.rateLimitState.tokens = limit.limit
          this.rateLimitState.lastRefill = Date.now()
          break
      }
    }

    this.rateLimitState.tokens--
  }

  /**
   * Get retry delay with exponential backoff
   */
  private getRetryDelay(attempt: number): number {
    const { retry } = this.config
    if (!retry) return 0

    const baseDelay = retry.baseDelay ?? 1000
    const maxDelay = retry.maxDelay ?? 30000

    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)

    // Add jitter
    return delay + Math.random() * delay * 0.1
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(key?: string, tags?: string[]): Promise<void> {
    await this.cache.invalidate(key, tags)
  }

  /**
   * Execute a named endpoint
   */
  async endpoint<R = unknown>(
    name: string,
    params?: Record<string, string>,
    query?: Record<string, string>,
    body?: unknown
  ): Promise<SourceResponse<R>> {
    const endpoint = this.config.endpoints?.[name]
    if (!endpoint) {
      throw new Error(`Endpoint "${name}" not found`)
    }

    return this.request<R>({
      method: endpoint.method || 'GET',
      path: endpoint.path,
      params,
      query,
      body,
    })
  }

  // Convenience methods
  async get<R = unknown>(path: string, query?: Record<string, string>): Promise<R> {
    const response = await this.request<R>({ method: 'GET', path, query })
    return response.data
  }

  async post<R = unknown>(path: string, body?: unknown): Promise<R> {
    const response = await this.request<R>({ method: 'POST', path, body })
    return response.data
  }

  async put<R = unknown>(path: string, body?: unknown): Promise<R> {
    const response = await this.request<R>({ method: 'PUT', path, body })
    return response.data
  }

  async patch<R = unknown>(path: string, body?: unknown): Promise<R> {
    const response = await this.request<R>({ method: 'PATCH', path, body })
    return response.data
  }

  async delete<R = unknown>(path: string): Promise<R> {
    const response = await this.request<R>({ method: 'DELETE', path })
    return response.data
  }
}

/**
 * Create a REST source from configuration
 */
export function createRestSource(config: RestSourceConfig, cache?: CacheManager): RestSource {
  return new RestSource(config, cache)
}

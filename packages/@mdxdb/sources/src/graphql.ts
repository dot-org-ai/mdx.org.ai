/**
 * @mdxdb/sources - GraphQL API source adapter
 */

import type {
  GraphQLSourceConfig,
  GraphQLQueryConfig,
  SourceRequest,
  SourceResponse,
  SourceClient,
  CacheConfig,
  TransformConfig,
  TransformContext,
} from './types.js'
import { CacheManager, createCacheConfig, defaultCache } from './cache.js'
import { createProxyFetch } from './proxy.js'

/**
 * GraphQL request payload
 */
export interface GraphQLRequest {
  query: string
  variables?: Record<string, unknown>
  operationName?: string
}

/**
 * GraphQL response format
 */
export interface GraphQLResponse<T = unknown> {
  data?: T
  errors?: GraphQLError[]
}

/**
 * GraphQL error format
 */
export interface GraphQLError {
  message: string
  locations?: Array<{ line: number; column: number }>
  path?: Array<string | number>
  extensions?: Record<string, unknown>
}

/**
 * GraphQL source client
 */
export class GraphQLSource implements SourceClient<GraphQLSourceConfig> {
  readonly config: GraphQLSourceConfig
  private fetchFn: typeof fetch
  private cache: CacheManager
  private endpoint: string

  constructor(config: GraphQLSourceConfig, cache?: CacheManager) {
    this.config = config
    this.cache = cache || defaultCache
    this.endpoint = config.endpoint || '/graphql'

    // Set up fetch with proxy if configured
    this.fetchFn = config.proxy
      ? createProxyFetch(config.proxy)
      : fetch.bind(globalThis)
  }

  /**
   * Execute a GraphQL request
   */
  async request<R = unknown>(req: SourceRequest): Promise<SourceResponse<R>> {
    // GraphQL always uses POST to the endpoint
    const body = req.body as GraphQLRequest
    if (!body?.query) {
      throw new Error('GraphQL request requires a query')
    }

    return this.execute<R>(body.query, body.variables, body.operationName)
  }

  /**
   * Execute a GraphQL query
   */
  async query<T = unknown>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<T> {
    const response = await this.execute<T>(query, variables, operationName)
    return response.data
  }

  /**
   * Execute a GraphQL mutation
   */
  async mutate<T = unknown>(
    mutation: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): Promise<T> {
    // Mutations bypass cache
    const response = await this.executeRequest<T>(mutation, variables, operationName)
    return response.data
  }

  /**
   * Execute a named query from configuration
   */
  async namedQuery<T = unknown>(
    name: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const queryConfig = this.config.queries?.[name]
    if (!queryConfig) {
      throw new Error(`Query "${name}" not found`)
    }

    // Merge default variables
    const mergedVariables = {
      ...getDefaultVariables(queryConfig.variables),
      ...variables,
    }

    // Validate required variables
    validateVariables(queryConfig.variables, mergedVariables)

    const response = await this.execute<T>(
      queryConfig.query,
      mergedVariables,
      name,
      queryConfig.cache,
      queryConfig.transform
    )

    return response.data
  }

  /**
   * Execute a named mutation from configuration
   */
  async namedMutation<T = unknown>(
    name: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const mutationConfig = this.config.mutations?.[name]
    if (!mutationConfig) {
      throw new Error(`Mutation "${name}" not found`)
    }

    // Merge default variables
    const mergedVariables = {
      ...getDefaultVariables(mutationConfig.variables),
      ...variables,
    }

    // Validate required variables
    validateVariables(mutationConfig.variables, mergedVariables)

    const response = await this.executeRequest<T>(
      mutationConfig.query,
      mergedVariables,
      name,
      mutationConfig.transform
    )

    return response.data
  }

  /**
   * Execute GraphQL with caching
   */
  private async execute<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string,
    cacheConfigOverride?: CacheConfig,
    transformOverride?: TransformConfig
  ): Promise<SourceResponse<T>> {
    // Determine if this is a mutation (skip cache)
    const isMutation = query.trim().startsWith('mutation')

    // Get cache config
    const cacheConfig = isMutation
      ? null
      : cacheConfigOverride
        ? createCacheConfig(cacheConfigOverride)
        : this.config.cache
          ? createCacheConfig(this.config.cache)
          : null

    // Generate cache key
    if (cacheConfig) {
      const cacheKey = this.generateCacheKey(query, variables, operationName)

      const result = await this.cache.get<T>(
        cacheKey,
        () => this.executeAndTransform<T>(query, variables, operationName, transformOverride),
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

    // Execute without cache
    const data = await this.executeAndTransform<T>(
      query,
      variables,
      operationName,
      transformOverride
    )

    return {
      data,
      status: 200,
      headers: new Headers(),
      cached: false,
      stale: false,
    }
  }

  /**
   * Execute and apply transform
   */
  private async executeAndTransform<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string,
    transformOverride?: TransformConfig
  ): Promise<T> {
    const response = await this.executeRequest<T>(
      query,
      variables,
      operationName,
      transformOverride
    )
    return response.data
  }

  /**
   * Execute the GraphQL request
   */
  private async executeRequest<T>(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string,
    transformOverride?: TransformConfig
  ): Promise<SourceResponse<T>> {
    const url = new URL(this.endpoint, this.config.baseUrl)

    // Build headers
    const headers = new Headers(this.config.headers)
    headers.set('Content-Type', 'application/json')

    // Apply authentication
    await this.applyAuth(headers)

    // Build request body
    const body: GraphQLRequest = { query }
    if (variables) body.variables = variables
    if (operationName) body.operationName = operationName

    // Execute request with retries
    let lastError: Error | null = null
    const maxAttempts = (this.config.retry?.maxRetries ?? 0) + 1

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.fetchFn(url.toString(), {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const result = (await response.json()) as GraphQLResponse<T>

        // Check for GraphQL errors
        if (result.errors?.length) {
          const errorMessages = result.errors.map((e) => e.message).join(', ')
          throw new GraphQLExecutionError(errorMessages, result.errors)
        }

        if (result.data === undefined) {
          throw new Error('GraphQL response missing data')
        }

        // Apply transform
        let data: T = result.data
        const transform = transformOverride || this.config.transform
        if (transform?.response) {
          const context: TransformContext = {
            request: { method: 'POST', path: this.endpoint, body },
            response,
            source: this.config,
          }
          data = await transform.response(data, context) as T
        }

        return {
          data,
          status: response.status,
          headers: response.headers,
          cached: false,
          stale: false,
        }
      } catch (error) {
        lastError = error as Error

        // Don't retry GraphQL execution errors
        if (error instanceof GraphQLExecutionError) {
          throw error
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
   * Generate cache key for GraphQL query
   */
  private generateCacheKey(
    query: string,
    variables?: Record<string, unknown>,
    operationName?: string
  ): string {
    const parts = [
      'graphql',
      operationName || hashString(query),
      variables ? JSON.stringify(sortObject(variables)) : '',
    ]
    return parts.filter(Boolean).join(':')
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
   * Create a subscription (requires subscriptionUrl)
   */
  subscribe<T = unknown>(
    subscription: string,
    variables?: Record<string, unknown>,
    onData?: (data: T) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.config.subscriptionUrl) {
      throw new Error('Subscription URL not configured')
    }

    const ws = new WebSocket(this.config.subscriptionUrl, 'graphql-ws')
    let unsubscribed = false

    ws.onopen = () => {
      // Connection init
      ws.send(JSON.stringify({ type: 'connection_init' }))

      // Start subscription
      ws.send(
        JSON.stringify({
          type: 'start',
          id: '1',
          payload: { query: subscription, variables },
        })
      )
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)

      if (message.type === 'data') {
        onData?.(message.payload.data)
      } else if (message.type === 'error') {
        onError?.(new Error(message.payload.message))
      }
    }

    ws.onerror = (error) => {
      onError?.(new Error('WebSocket error'))
    }

    // Return unsubscribe function
    return () => {
      if (!unsubscribed) {
        unsubscribed = true
        ws.send(JSON.stringify({ type: 'stop', id: '1' }))
        ws.close()
      }
    }
  }
}

/**
 * GraphQL execution error
 */
export class GraphQLExecutionError extends Error {
  constructor(
    message: string,
    public errors: GraphQLError[]
  ) {
    super(message)
    this.name = 'GraphQLExecutionError'
  }
}

/**
 * Get default variable values
 */
function getDefaultVariables(
  schema?: Record<string, { type: string; required?: boolean; default?: unknown }>
): Record<string, unknown> {
  if (!schema) return {}

  const defaults: Record<string, unknown> = {}
  for (const [name, config] of Object.entries(schema)) {
    if (config.default !== undefined) {
      defaults[name] = config.default
    }
  }
  return defaults
}

/**
 * Validate required variables
 */
function validateVariables(
  schema?: Record<string, { type: string; required?: boolean; default?: unknown }>,
  variables?: Record<string, unknown>
): void {
  if (!schema) return

  for (const [name, config] of Object.entries(schema)) {
    if (config.required && variables?.[name] === undefined) {
      throw new Error(`Required variable "${name}" is missing`)
    }
  }
}

/**
 * Simple string hash
 */
function hashString(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

/**
 * Sort object keys for consistent hashing
 */
function sortObject<T extends Record<string, unknown>>(obj: T): T {
  const sorted = {} as T
  for (const key of Object.keys(obj).sort()) {
    sorted[key as keyof T] = obj[key as keyof T]
  }
  return sorted
}

/**
 * Create a GraphQL source from configuration
 */
export function createGraphQLSource(
  config: GraphQLSourceConfig,
  cache?: CacheManager
): GraphQLSource {
  return new GraphQLSource(config, cache)
}

/**
 * GraphQL query builder helper
 */
export function gql(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] || '')
  }, '')
}

/**
 * @mdxdb/sources - JSON-LD source adapter
 * Converts JSON-LD to MDXLD format
 */

import type {
  JSONLDSourceConfig,
  JSONLDNode,
  JSONLDEndpointConfig,
  MDXLDDocument,
  SourceRequest,
  SourceResponse,
  SourceClient,
  TransformContext,
} from './types.js'
import { CacheManager, createCacheConfig, defaultCache } from './cache.js'
import { createProxyFetch } from './proxy.js'

/**
 * JSON-LD to MDXLD conversion result
 */
export interface JSONLDConversionResult {
  documents: MDXLDDocument[]
  context?: string | Record<string, unknown>
  errors?: JSONLDConversionError[]
}

export interface JSONLDConversionError {
  path: string
  message: string
  node?: unknown
}

/**
 * JSON-LD source client
 */
export class JSONLDSource implements SourceClient<JSONLDSourceConfig> {
  readonly config: JSONLDSourceConfig
  private fetchFn: typeof fetch
  private cache: CacheManager

  constructor(config: JSONLDSourceConfig, cache?: CacheManager) {
    this.config = {
      ...config,
      context: config.context || 'https://schema.org',
    }
    this.cache = cache || defaultCache

    this.fetchFn = config.proxy
      ? createProxyFetch(config.proxy)
      : fetch.bind(globalThis)
  }

  /**
   * Execute a request
   */
  async request<R = unknown>(req: SourceRequest): Promise<SourceResponse<R>> {
    const url = this.buildUrl(req)

    // Find endpoint config
    const endpointConfig = this.findEndpointConfig(req.path)
    const cacheConfig = endpointConfig?.cache
      ? createCacheConfig(endpointConfig.cache)
      : this.config.cache
        ? createCacheConfig(this.config.cache)
        : null

    // Check cache
    if (cacheConfig && req.method === 'GET') {
      const cacheKey = this.cache.generateKey(req, cacheConfig)

      const result = await this.cache.get<R>(
        cacheKey,
        () => this.fetchAndConvert<R>(url),
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

    const data = await this.fetchAndConvert<R>(url)

    return {
      data,
      status: 200,
      headers: new Headers(),
      cached: false,
      stale: false,
    }
  }

  /**
   * Fetch JSON-LD and convert to MDXLD
   */
  private async fetchAndConvert<R>(url: string): Promise<R> {
    const headers = new Headers(this.config.headers)
    headers.set('Accept', 'application/ld+json, application/json')

    const response = await this.fetchFn(url, { headers })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const jsonld = await response.json() as JSONLDNode

    // Convert JSON-LD to MDXLD
    const result = this.convertToMDXLD(jsonld)

    // Apply transform if configured
    const transform = this.config.transform
    if (transform?.response) {
      const context: TransformContext = {
        request: { method: 'GET', path: url },
        response,
        source: this.config,
      }
      return await transform.response(result, context) as R
    }

    return result as R
  }

  /**
   * Convert JSON-LD to MDXLD format
   */
  convertToMDXLD(node: JSONLDNode): JSONLDConversionResult {
    const documents: MDXLDDocument[] = []
    const errors: JSONLDConversionError[] = []

    // Handle @graph
    if (node['@graph'] && Array.isArray(node['@graph'])) {
      for (const graphNode of node['@graph']) {
        try {
          const doc = this.convertNode(graphNode)
          if (doc) documents.push(doc)
        } catch (e) {
          errors.push({
            path: `@graph[${documents.length}]`,
            message: e instanceof Error ? e.message : 'Unknown error',
            node: graphNode,
          })
        }
      }
    } else {
      // Single node
      try {
        const doc = this.convertNode(node)
        if (doc) documents.push(doc)
      } catch (e) {
        errors.push({
          path: '@root',
          message: e instanceof Error ? e.message : 'Unknown error',
          node,
        })
      }
    }

    return {
      documents,
      context: node['@context'] || this.config.context,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  /**
   * Convert a single JSON-LD node to MDXLD document
   */
  private convertNode(node: JSONLDNode): MDXLDDocument | null {
    if (!node || typeof node !== 'object') return null

    const mapping = this.config.mapping || {}

    // Get $type
    let $type: string
    if (typeof mapping.$type === 'function') {
      $type = mapping.$type(node)
    } else if (typeof mapping.$type === 'string') {
      $type = mapping.$type
    } else {
      const nodeType = node['@type']
      $type = Array.isArray(nodeType) ? nodeType[0] || 'Thing' : nodeType || 'Thing'
    }

    // Get $id
    let $id: string
    if (typeof mapping.$id === 'function') {
      $id = mapping.$id(node)
    } else if (typeof mapping.$id === 'string') {
      $id = mapping.$id
    } else {
      $id = node['@id'] || `urn:uuid:${crypto.randomUUID()}`
    }

    // Build document
    const doc: MDXLDDocument = {
      $type,
      $id,
    }

    // Add context if available
    const context = node['@context'] || this.config.context
    if (context) {
      doc.$context = typeof context === 'string' ? context : JSON.stringify(context)
    }

    // Copy properties (excluding JSON-LD keywords)
    for (const [key, value] of Object.entries(node)) {
      if (key.startsWith('@')) continue

      // Check for custom mapping
      const customMapping = mapping[key]
      if (typeof customMapping === 'function') {
        doc[key] = customMapping(node)
      } else if (typeof customMapping === 'string') {
        doc[customMapping] = value
      } else {
        // Recursively convert nested nodes
        doc[key] = this.convertValue(value)
      }
    }

    return doc
  }

  /**
   * Convert a JSON-LD value (may be nested)
   */
  private convertValue(value: unknown): unknown {
    if (value === null || value === undefined) return value

    if (Array.isArray(value)) {
      return value.map(v => this.convertValue(v))
    }

    if (typeof value === 'object') {
      const obj = value as JSONLDNode
      // Check if it's a JSON-LD node
      if (obj['@type'] || obj['@id'] || obj['@value']) {
        // Handle @value (literal with type/language)
        if ('@value' in obj) {
          return obj['@value']
        }
        // Convert nested node
        return this.convertNode(obj)
      }
      // Regular object
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(obj)) {
        if (!k.startsWith('@')) {
          result[k] = this.convertValue(v)
        }
      }
      return result
    }

    return value
  }

  /**
   * Build URL from request
   */
  private buildUrl(req: SourceRequest): string {
    let path = req.path

    // Replace path parameters
    if (req.params) {
      for (const [key, value] of Object.entries(req.params)) {
        path = path.replace(`:${key}`, encodeURIComponent(value))
      }
    }

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
   * Find endpoint config by path
   */
  private findEndpointConfig(path: string): JSONLDEndpointConfig | null {
    if (!this.config.endpoints) return null

    for (const [, config] of Object.entries(this.config.endpoints)) {
      const pattern = config.path.replace(/:\w+/g, '[^/]+')
      if (new RegExp(`^${pattern}$`).test(path)) {
        return config
      }
    }

    return null
  }

  /**
   * Invalidate cache
   */
  async invalidateCache(key?: string, tags?: string[]): Promise<void> {
    await this.cache.invalidate(key, tags)
  }

  /**
   * Fetch from a named endpoint
   */
  async endpoint<R = JSONLDConversionResult>(
    name: string,
    params?: Record<string, string>,
    query?: Record<string, string>
  ): Promise<R> {
    const endpointConfig = this.config.endpoints?.[name]
    if (!endpointConfig) {
      throw new Error(`Endpoint "${name}" not found`)
    }

    const response = await this.request<R>({
      method: 'GET',
      path: endpointConfig.path,
      params,
      query,
    })

    return response.data
  }
}

/**
 * Create a JSON-LD source from configuration
 */
export function createJSONLDSource(
  config: JSONLDSourceConfig,
  cache?: CacheManager
): JSONLDSource {
  return new JSONLDSource(config, cache)
}

/**
 * Convert JSON-LD to MDXLD (standalone function)
 */
export function jsonldToMDXLD(
  jsonld: JSONLDNode,
  options?: {
    context?: string
    mapping?: JSONLDSourceConfig['mapping']
  }
): JSONLDConversionResult {
  const source = new JSONLDSource({
    type: 'jsonld',
    id: 'temp',
    baseUrl: '',
    context: options?.context,
    mapping: options?.mapping,
  })

  return source.convertToMDXLD(jsonld)
}

/**
 * Extract JSON-LD from HTML
 */
export async function extractJSONLD(html: string): Promise<JSONLDNode[]> {
  const { parseHTML } = await import('linkedom')
  const { document } = parseHTML(html) as { document: { querySelectorAll(selector: string): { textContent: string | null }[] } }

  const scripts = document.querySelectorAll('script[type="application/ld+json"]')
  const results: JSONLDNode[] = []

  for (const script of scripts) {
    try {
      const content = script.textContent
      if (content) {
        const jsonld = JSON.parse(content) as JSONLDNode
        results.push(jsonld)
      }
    } catch {
      // Skip invalid JSON
    }
  }

  return results
}

/**
 * Validate JSON-LD against Schema.org
 */
export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
}

export interface ValidationError {
  path: string
  message: string
  type: 'missing_required' | 'invalid_type' | 'unknown_property'
}

export interface ValidationWarning {
  path: string
  message: string
  type: 'deprecated' | 'recommended'
}

export async function validateJSONLD(
  data: MDXLDDocument | JSONLDNode,
  _options?: {
    schema?: string
    strict?: boolean
  }
): Promise<ValidationResult> {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Basic validation
  const node = data as JSONLDNode
  const $type = node.$type || node['@type']
  const $id = node.$id || node['@id']

  if (!$type) {
    errors.push({
      path: '$type',
      message: 'Missing $type or @type',
      type: 'missing_required',
    })
  }

  if (!$id) {
    warnings.push({
      path: '$id',
      message: 'Missing $id or @id - recommended for linked data',
      type: 'recommended',
    })
  }

  // TODO: Fetch and validate against actual Schema.org types
  // This would require loading the schema vocabulary

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Convert MDXLD back to JSON-LD
 */
export function mdxldToJSONLD(
  doc: MDXLDDocument,
  options?: {
    context?: string | Record<string, unknown>
  }
): JSONLDNode {
  const jsonld: JSONLDNode = {
    '@context': options?.context || doc.$context || 'https://schema.org',
    '@type': doc.$type,
    '@id': doc.$id,
  }

  // Copy properties
  for (const [key, value] of Object.entries(doc)) {
    if (key.startsWith('$')) continue
    jsonld[key] = convertMDXLDValue(value)
  }

  return jsonld
}

function convertMDXLDValue(value: unknown): unknown {
  if (value === null || value === undefined) return value

  if (Array.isArray(value)) {
    return value.map(convertMDXLDValue)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (obj.$type && obj.$id) {
      // Nested MDXLD document
      return mdxldToJSONLD(obj as MDXLDDocument)
    }
    // Regular object
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      result[k] = convertMDXLDValue(v)
    }
    return result
  }

  return value
}

/**
 * @mdxdb/sources - External data source adapters for mdxdb
 *
 * Provides unified access to REST APIs, GraphQL endpoints, and web scraping
 * with built-in caching, retries, and proxy support.
 *
 * @example
 * ```yaml
 * # MDX frontmatter source definition
 * $type: RestSource
 * $id: https://api.example.com
 * baseUrl: https://api.example.com/v1
 * auth:
 *   type: bearer
 *   token: ${env.API_TOKEN}
 * cache:
 *   ttl: 300
 *   staleWhileRevalidate: 60
 * ```
 *
 * @example
 * ```ts
 * // TypeScript usage
 * import { createRestSource, createGraphQLSource, createScraperSource } from '@mdxdb/sources'
 *
 * const api = createRestSource({
 *   type: 'rest',
 *   id: 'my-api',
 *   baseUrl: 'https://api.example.com',
 *   cache: { ttl: 60 }
 * })
 *
 * const data = await api.get('/users')
 * ```
 */

// Type exports
export type {
  // Base types
  BaseSourceConfig,
  AuthConfig,
  CacheConfig,
  CacheStorage,
  CacheEntry,
  ProxyConfig,
  RateLimitConfig,
  RetryConfig,
  TransformConfig,
  TransformContext,
  DocumentData,
  SourceRequest,
  SourceResponse,
  SourceClient,
  SourceConfig,
  MDXSourceDefinition,
  MDXLDDocument,
  // REST types
  RestSourceConfig,
  RestEndpointConfig,
  // GraphQL types
  GraphQLSourceConfig,
  GraphQLQueryConfig,
  // Scraper types
  ScraperSourceConfig,
  SelectorConfig,
  PageConfig,
  // JSON-LD types
  JSONLDSourceConfig,
  JSONLDEndpointConfig,
  JSONLDNode,
  // CSV types
  CSVSourceConfig,
  CSVColumnConfig,
} from './types.js'

// Cache exports
export {
  CacheManager,
  MemoryCache,
  KVCache,
  createCacheConfig,
  defaultCache,
  type CacheResult,
} from './cache.js'

// Proxy exports
export {
  ProxyManager,
  createProxyFetch,
  isCloudflareWorkers,
  type SocketOptions,
  type Socket,
  type ConnectFn,
  type SocketAddress,
} from './proxy.js'

// REST exports
export { RestSource, createRestSource } from './rest.js'

// GraphQL exports
export {
  GraphQLSource,
  createGraphQLSource,
  GraphQLExecutionError,
  gql,
  type GraphQLRequest,
  type GraphQLResponse,
  type GraphQLError,
} from './graphql.js'

// Scraper exports
export {
  ScraperSource,
  createScraperSource,
  select,
  transforms,
  type ScrapedData,
} from './scraper.js'

// JSON-LD exports
export {
  JSONLDSource,
  createJSONLDSource,
  jsonldToMDXLD,
  mdxldToJSONLD,
  extractJSONLD,
  validateJSONLD,
  type JSONLDConversionResult,
  type JSONLDConversionError,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
} from './jsonld.js'

// CSV exports
export {
  CSVSource,
  createCSVSource,
  parseCSV,
  csvToMDXLD,
  mdxldToCSV,
  type CSVParseResult,
  type CSVParseError,
} from './csv.js'

// Source factory
import type { SourceConfig, SourceClient } from './types.js'
import { RestSource } from './rest.js'
import { GraphQLSource } from './graphql.js'
import { ScraperSource } from './scraper.js'
import { JSONLDSource } from './jsonld.js'
import { CSVSource } from './csv.js'
import { CacheManager } from './cache.js'

/**
 * Create a source from configuration
 */
export function createSource(config: SourceConfig, cache?: CacheManager): SourceClient {
  switch (config.type) {
    case 'rest':
      return new RestSource(config, cache)
    case 'graphql':
      return new GraphQLSource(config, cache)
    case 'scraper':
      return new ScraperSource(config, cache)
    case 'jsonld':
      return new JSONLDSource(config, cache)
    case 'csv':
      return new CSVSource(config, cache)
    default:
      throw new Error(`Unknown source type: ${(config as { type: string }).type}`)
  }
}

/**
 * Source registry for managing multiple sources
 */
export class SourceRegistry {
  private sources = new Map<string, SourceClient>()
  private cache: CacheManager

  constructor(cache?: CacheManager) {
    this.cache = cache || new CacheManager()
  }

  /**
   * Register a source
   */
  register(config: SourceConfig): SourceClient {
    const source = createSource(config, this.cache)
    this.sources.set(config.id, source)
    return source
  }

  /**
   * Get a registered source
   */
  get<T extends SourceClient = SourceClient>(id: string): T {
    const source = this.sources.get(id)
    if (!source) {
      throw new Error(`Source "${id}" not found`)
    }
    return source as T
  }

  /**
   * Check if source exists
   */
  has(id: string): boolean {
    return this.sources.has(id)
  }

  /**
   * Remove a source
   */
  remove(id: string): boolean {
    return this.sources.delete(id)
  }

  /**
   * List all source IDs
   */
  list(): string[] {
    return Array.from(this.sources.keys())
  }

  /**
   * Clear all sources
   */
  clear(): void {
    this.sources.clear()
  }

  /**
   * Invalidate cache across all sources
   */
  async invalidateCache(tags?: string[]): Promise<void> {
    await this.cache.invalidate(undefined, tags)
  }
}

/**
 * Default source registry
 */
export const sources = new SourceRegistry()

/**
 * Parse MDX frontmatter source definition
 */
export function parseSourceDefinition(frontmatter: Record<string, unknown>): SourceConfig | null {
  const type = frontmatter.$type as string
  if (!type) return null

  // Map MDX $type to source type
  const typeMap: Record<string, string> = {
    Source: 'rest', // Default
    RestSource: 'rest',
    GraphQLSource: 'graphql',
    ScraperSource: 'scraper',
    JSONLDSource: 'jsonld',
    CSVSource: 'csv',
  }

  const sourceType = typeMap[type]
  if (!sourceType) return null

  const id = (frontmatter.$id as string) || frontmatter.id as string
  if (!id) return null

  const config = frontmatter.config as Record<string, unknown> || frontmatter

  return {
    type: sourceType,
    id,
    ...config,
  } as SourceConfig
}

/**
 * Define a source with TypeScript helper
 */
export function defineSource<T extends SourceConfig>(config: T): T {
  return config
}

/**
 * Define REST source
 */
export function defineRestSource(
  config: Omit<import('./types.js').RestSourceConfig, 'type'>
): import('./types.js').RestSourceConfig {
  return { type: 'rest', ...config }
}

/**
 * Define GraphQL source
 */
export function defineGraphQLSource(
  config: Omit<import('./types.js').GraphQLSourceConfig, 'type'>
): import('./types.js').GraphQLSourceConfig {
  return { type: 'graphql', ...config }
}

/**
 * Define Scraper source
 */
export function defineScraperSource(
  config: Omit<import('./types.js').ScraperSourceConfig, 'type'>
): import('./types.js').ScraperSourceConfig {
  return { type: 'scraper', ...config }
}

/**
 * Define JSON-LD source
 */
export function defineJSONLDSource(
  config: Omit<import('./types.js').JSONLDSourceConfig, 'type'>
): import('./types.js').JSONLDSourceConfig {
  return { type: 'jsonld', ...config }
}

/**
 * Define CSV source
 */
export function defineCSVSource(
  config: Omit<import('./types.js').CSVSourceConfig, 'type'>
): import('./types.js').CSVSourceConfig {
  return { type: 'csv', ...config }
}

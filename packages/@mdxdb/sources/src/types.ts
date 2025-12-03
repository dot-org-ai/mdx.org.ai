/**
 * @mdxdb/sources - External data source types
 */

// Base configuration shared by all sources
export interface BaseSourceConfig {
  /** Unique identifier for this source */
  id: string
  /** Human-readable name */
  name?: string
  /** Source description */
  description?: string
  /** Base URL for the source */
  baseUrl: string
  /** Default headers to include with requests */
  headers?: Record<string, string>
  /** Authentication configuration */
  auth?: AuthConfig
  /** Caching configuration */
  cache?: CacheConfig
  /** Proxy configuration for requests */
  proxy?: ProxyConfig
  /** Rate limiting configuration */
  rateLimit?: RateLimitConfig
  /** Retry configuration */
  retry?: RetryConfig
  /** Transform function to apply to all responses */
  transform?: TransformConfig
}

// Authentication types
export type AuthConfig =
  | { type: 'bearer'; token: string | (() => string | Promise<string>) }
  | { type: 'basic'; username: string; password: string }
  | { type: 'api-key'; key: string; header?: string; query?: string }
  | { type: 'oauth2'; clientId: string; clientSecret: string; tokenUrl: string; scopes?: string[] }
  | { type: 'custom'; handler: (request: Request) => Request | Promise<Request> }

// Cache configuration
export interface CacheConfig {
  /** Time-to-live in seconds (how long until cache is stale) */
  ttl: number
  /** Stale-while-revalidate window in seconds */
  staleWhileRevalidate?: number
  /** Cache key generator */
  key?: (request: SourceRequest) => string
  /** Cache storage adapter */
  storage?: CacheStorage
  /** Tags for cache invalidation */
  tags?: string[] | ((response: unknown) => string[])
}

// Cache storage interface
export interface CacheStorage {
  get<T>(key: string): Promise<CacheEntry<T> | null>
  set<T>(key: string, entry: CacheEntry<T>): Promise<void>
  delete(key: string): Promise<void>
  invalidateByTag(tag: string): Promise<void>
}

export interface CacheEntry<T> {
  data: T
  cachedAt: number
  ttl: number
  staleWhileRevalidate?: number
  tags?: string[]
}

// Proxy configuration
export interface ProxyConfig {
  /** Proxy server URL (supports http://, https://, socks5://) */
  url: string
  /** Authentication for proxy */
  auth?: { username: string; password: string }
  /** Use Cloudflare TCP sockets (for Workers) */
  cloudflare?: {
    /** Hostname to connect through */
    hostname: string
    /** Port number */
    port: number
    /** Enable TLS */
    tls?: boolean
  }
}

// Rate limiting
export interface RateLimitConfig {
  /** Maximum requests per window */
  limit: number
  /** Window size in seconds */
  window: number
  /** Strategy when rate limited */
  strategy?: 'throw' | 'queue' | 'wait'
}

// Retry configuration
export interface RetryConfig {
  /** Maximum number of retries */
  maxRetries: number
  /** Base delay in ms (exponential backoff) */
  baseDelay?: number
  /** Maximum delay in ms */
  maxDelay?: number
  /** HTTP status codes to retry */
  retryOn?: number[]
  /** Custom retry condition */
  shouldRetry?: (error: Error, attempt: number) => boolean
}

// Transform configuration
export interface TransformConfig {
  /** Transform function for response data */
  response?: <T, R>(data: T, context: TransformContext) => R | Promise<R>
  /** Extract ID from response */
  id?: (data: unknown) => string
  /** Extract type from response */
  type?: (data: unknown) => string
  /** Map response to mdxdb document format */
  toDocument?: (data: unknown) => DocumentData
}

export interface TransformContext {
  request: SourceRequest
  response: Response
  source: BaseSourceConfig
}

export interface DocumentData {
  $id?: string
  $type?: string
  [key: string]: unknown
}

// Request types
export interface SourceRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  path: string
  params?: Record<string, string>
  query?: Record<string, string | string[]>
  headers?: Record<string, string>
  body?: unknown
}

// Response types
export interface SourceResponse<T = unknown> {
  data: T
  status: number
  headers: Headers
  cached: boolean
  stale: boolean
  cacheKey?: string
}

// REST source configuration
export interface RestSourceConfig extends BaseSourceConfig {
  type: 'rest'
  /** Endpoint definitions */
  endpoints?: Record<string, RestEndpointConfig>
}

export interface RestEndpointConfig {
  /** HTTP method */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Path (can include :params) */
  path: string
  /** Query parameters schema */
  query?: Record<string, { type: string; required?: boolean; default?: unknown }>
  /** Request body schema */
  body?: Record<string, unknown>
  /** Response transform */
  transform?: TransformConfig
  /** Endpoint-specific cache config */
  cache?: CacheConfig
}

// GraphQL source configuration
export interface GraphQLSourceConfig extends BaseSourceConfig {
  type: 'graphql'
  /** GraphQL endpoint path (default: /graphql) */
  endpoint?: string
  /** Predefined queries */
  queries?: Record<string, GraphQLQueryConfig>
  /** Predefined mutations */
  mutations?: Record<string, GraphQLQueryConfig>
  /** WebSocket URL for subscriptions */
  subscriptionUrl?: string
}

export interface GraphQLQueryConfig {
  /** GraphQL query/mutation string */
  query: string
  /** Variable definitions */
  variables?: Record<string, { type: string; required?: boolean; default?: unknown }>
  /** Response transform */
  transform?: TransformConfig
  /** Query-specific cache config */
  cache?: CacheConfig
}

// Scraper source configuration
export interface ScraperSourceConfig extends BaseSourceConfig {
  type: 'scraper'
  /** Scraping engine to use */
  engine?: 'fetch' | 'htmlrewriter' | 'playwright'
  /** Selector definitions for extracting data */
  selectors: Record<string, SelectorConfig>
  /** Page-specific configurations */
  pages?: Record<string, PageConfig>
  /** JavaScript rendering options (for Playwright) */
  javascript?: {
    enabled: boolean
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle'
    timeout?: number
  }
  /** User agent string */
  userAgent?: string
}

export interface SelectorConfig {
  /** CSS selector */
  selector: string
  /** Attribute to extract (default: textContent) */
  attribute?: string
  /** Whether to select all matching elements */
  multiple?: boolean
  /** Nested selectors for complex structures */
  children?: Record<string, SelectorConfig>
  /** Transform extracted value */
  transform?: (value: string | string[] | null) => unknown
}

export interface PageConfig {
  /** Path pattern (can include :params) */
  path: string
  /** Selectors to use for this page */
  selectors: string[]
  /** Page-specific transform */
  transform?: TransformConfig
  /** Page-specific cache config */
  cache?: CacheConfig
}

// JSON-LD source configuration
export interface JSONLDSourceConfig extends BaseSourceConfig {
  type: 'jsonld'
  /** Default JSON-LD context */
  context?: string | Record<string, unknown>
  /** How to map JSON-LD properties to MDXLD */
  mapping?: {
    /** Map @type to $type */
    $type?: string | ((node: JSONLDNode) => string)
    /** Map @id to $id */
    $id?: string | ((node: JSONLDNode) => string)
    /** Additional property mappings */
    [key: string]: string | ((node: JSONLDNode) => unknown) | undefined
  }
  /** Whether to flatten nested JSON-LD */
  flatten?: boolean
  /** Whether to compact JSON-LD */
  compact?: boolean
  /** Endpoints that return JSON-LD */
  endpoints?: Record<string, JSONLDEndpointConfig>
}

export interface JSONLDEndpointConfig {
  path: string
  description?: string
  cache?: CacheConfig
  transform?: TransformConfig
}

export interface JSONLDNode {
  '@type'?: string | string[]
  '@id'?: string
  '@context'?: string | Record<string, unknown>
  '@graph'?: JSONLDNode[]
  [key: string]: unknown
}

// CSV source configuration
export interface CSVSourceConfig extends BaseSourceConfig {
  type: 'csv'
  /** URL to fetch CSV from */
  url?: string
  /** Local file path */
  file?: string
  /** CSV parsing options */
  delimiter?: string
  /** Whether first row contains column headers (true = auto-detect, string[] = explicit headers) */
  hasHeaders?: boolean | string[]
  /** Quote character */
  quote?: string
  /** Escape character */
  escape?: string
  /** Skip empty lines */
  skipEmptyLines?: boolean
  /** Number of rows to skip at start */
  skipRows?: number
  /** Maximum rows to process */
  maxRows?: number
  /** Batch size for streaming */
  batchSize?: number
  /** Column type definitions */
  columns?: Record<string, CSVColumnConfig>
  /** Row transform function to convert CSV row to MDXLD document */
  rowTransform?: (row: Record<string, string>) => MDXLDDocument | null
}

export interface CSVColumnConfig {
  /** Column type */
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'json'
  /** Required field */
  required?: boolean
  /** Default value if empty */
  default?: unknown
  /** Array delimiter (for type: 'array') */
  arrayDelimiter?: string
  /** Custom transform */
  transform?: (value: string) => unknown
}

export interface MDXLDDocument {
  $type: string
  $id: string
  $context?: string
  [key: string]: unknown
}

// Source type union
export type SourceConfig =
  | RestSourceConfig
  | GraphQLSourceConfig
  | ScraperSourceConfig
  | JSONLDSourceConfig
  | CSVSourceConfig

// Source client interface
export interface SourceClient<T extends SourceConfig = SourceConfig> {
  config: T
  request<R = unknown>(req: SourceRequest): Promise<SourceResponse<R>>
  invalidateCache(key?: string, tags?: string[]): Promise<void>
}

// MDX Source definition format
export interface MDXSourceDefinition {
  /** Source type and ID in $type format */
  $type: 'Source' | 'RestSource' | 'GraphQLSource' | 'ScraperSource' | 'JSONLDSource' | 'CSVSource'
  $id: string
  /** Source configuration */
  config: Partial<SourceConfig>
}

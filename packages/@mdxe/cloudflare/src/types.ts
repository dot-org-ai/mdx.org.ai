/**
 * @mdxe/cloudflare - Type Definitions
 *
 * @packageDocumentation
 */

/**
 * Cloudflare deployment options
 */
export interface CloudflareDeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Project name for Cloudflare */
  projectName?: string

  /** Cloudflare account ID */
  accountId?: string

  /** Cloudflare API token */
  apiToken?: string

  /** Deployment target: workers or pages */
  target?: 'workers' | 'pages'

  /** Deployment mode for Workers */
  mode?: 'static' | 'opennext'

  /** Compatibility date for Workers */
  compatibilityDate?: string

  /** Compatibility flags */
  compatibilityFlags?: string[]

  /** Environment variables */
  env?: Record<string, string>

  /** KV namespace bindings */
  kvNamespaces?: Record<string, string>

  /** D1 database bindings */
  d1Databases?: Record<string, string>

  /** R2 bucket bindings */
  r2Buckets?: Record<string, string>

  /** Custom routes configuration */
  routes?: string[]

  /** Dry run mode */
  dryRun?: boolean

  /** Force regeneration of config files */
  force?: boolean

  /** Use direct Cloudflare API instead of wrangler CLI */
  useApi?: boolean

  /** Custom Cloudflare API base URL */
  apiBaseUrl?: string

  /** Custom headers for API requests */
  apiHeaders?: Record<string, string>

  /** Deploy to a dispatch namespace for multi-tenant isolation */
  dispatchNamespace?: string

  /** Tenant/customer identifier */
  tenantId?: string

  /** Use managed workers.do API */
  useManagedApi?: boolean

  /** Managed API base URL */
  managedApiUrl?: string

  /** Custom domain to configure */
  customDomain?: string

  /** Zone ID for custom domain */
  zoneId?: string
}

/**
 * Cloudflare Pages deployment options
 */
export interface CloudflarePagesOptions extends CloudflareDeployOptions {
  target: 'pages'

  /** Branch name for deployment */
  branch?: string

  /** Production branch name */
  productionBranch?: string

  /** Build command */
  buildCommand?: string

  /** Output directory for built files */
  outputDir?: string

  /** Root directory containing the project */
  rootDir?: string
}

/**
 * Cloudflare Workers deployment options
 */
export interface CloudflareWorkersOptions extends CloudflareDeployOptions {
  target?: 'workers'

  /** Worker script entry point */
  entryPoint?: string

  /** Use Workers for Platforms (multi-tenant) */
  useDispatchNamespace?: boolean
}

/**
 * Deploy result
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean

  /** Deployment URL */
  url?: string

  /** Deployment ID */
  deploymentId?: string

  /** Error message if failed */
  error?: string

  /** Build/deployment logs */
  logs?: string[]

  /** Deployment type */
  type?: 'workers' | 'pages'
}

/**
 * Source type detection result
 */
export interface SourceTypeInfo {
  /** Whether the source is static (fs-based) */
  isStatic: boolean

  /** Detected source adapter */
  adapter?: 'fs' | 'sqlite' | 'postgres' | 'mongo' | 'api' | 'clickhouse' | 'unknown'

  /** Path to source configuration */
  configPath?: string
}

/**
 * Cloudflare API configuration
 */
export interface CloudflareApiConfig {
  /** Account ID */
  accountId: string

  /** API token for authentication */
  apiToken: string

  /** Base URL for the Cloudflare API */
  baseUrl?: string

  /** Custom headers to include in all requests */
  headers?: Record<string, string>

  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Worker script metadata
 */
export interface WorkerMetadata {
  /** Main module name */
  main_module: string

  /** Compatibility date */
  compatibility_date?: string

  /** Compatibility flags */
  compatibility_flags?: string[]

  /** Bindings */
  bindings?: WorkerBinding[]

  /** Tags for organization */
  tags?: string[]
}

/**
 * Worker binding types
 */
export type WorkerBinding =
  | { type: 'kv_namespace'; name: string; namespace_id: string }
  | { type: 'd1'; name: string; id: string }
  | { type: 'r2_bucket'; name: string; bucket_name: string }
  | { type: 'service'; name: string; service: string; environment?: string }
  | { type: 'dispatch_namespace'; name: string; namespace: string }
  | { type: 'vectorize'; name: string; index_name: string }
  | { type: 'plain_text'; name: string; text: string }
  | { type: 'secret_text'; name: string; text: string }
  | { type: 'json'; name: string; json: unknown }
  | { type: 'assets'; name: string }

/**
 * Vectorize index configuration
 */
export interface VectorizeIndexConfig {
  /** Index name */
  name: string
  /** Description */
  description?: string
  /** Dimensions of the embedding vectors */
  dimensions: number
  /** Distance metric */
  metric: 'cosine' | 'euclidean' | 'dot-product'
}

/**
 * Vectorize index info
 */
export interface VectorizeIndex {
  id: string
  name: string
  description?: string
  config: {
    dimensions: number
    metric: 'cosine' | 'euclidean' | 'dot-product'
  }
  created_on: string
  modified_on: string
}

/**
 * Vectorize vector with metadata
 */
export interface VectorizeVector {
  id: string
  values: number[]
  namespace?: string
  metadata?: Record<string, unknown>
}

/**
 * Vectorize query result
 */
export interface VectorizeMatch {
  id: string
  score: number
  values?: number[]
  metadata?: Record<string, unknown>
}

/**
 * Dispatch namespace configuration
 */
export interface DispatchNamespace {
  /** Namespace name */
  name: string

  /** Optional script limits */
  script_limits?: {
    max_scripts?: number
    max_script_size?: number
  }
}

/**
 * Upload result from API
 */
export interface UploadResult {
  success: boolean
  scriptId?: string
  url?: string
  errors?: Array<{ code: number; message: string }>
  messages?: string[]
}

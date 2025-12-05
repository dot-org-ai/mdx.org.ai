/**
 * @mdxe/do - .do Platform Deployment Types
 *
 * @packageDocumentation
 */

/**
 * Deployment mode
 */
export type DeployMode = 'static' | 'opennext'

/**
 * Deployment options for .do platform
 */
export interface DoDeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Worker/project name */
  projectName?: string

  /** Deployment mode */
  mode?: DeployMode

  /** Environment variables */
  env?: Record<string, string>

  /** API URL override */
  apiUrl?: string

  /** Custom domain */
  customDomain?: string

  /** Compatibility date for Workers runtime */
  compatibilityDate?: string

  /** Compatibility flags for Workers runtime */
  compatibilityFlags?: string[]

  /** KV namespace bindings */
  kvNamespaces?: Record<string, string>

  /** D1 database bindings */
  d1Databases?: Record<string, string>

  /** R2 bucket bindings */
  r2Buckets?: Record<string, string>

  /** Durable Object bindings */
  durableObjects?: Record<string, string>

  /** Dispatch namespace for multi-tenant deployments */
  dispatchNamespace?: string

  /** Tenant ID for multi-tenant deployments */
  tenantId?: string

  /** Build command override */
  buildCommand?: string

  /** Output directory override */
  outputDir?: string

  /** Dry run - show what would happen without deploying */
  dryRun?: boolean

  /** Force deployment */
  force?: boolean

  /** Verbose output */
  verbose?: boolean
}

/**
 * Deploy result
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean

  /** Deployment URL */
  url?: string

  /** Production/alias URL */
  productionUrl?: string

  /** Unique deployment ID */
  deploymentId?: string

  /** Worker ID */
  workerId?: string

  /** Error message if failed */
  error?: string

  /** Deployment state */
  state?: 'pending' | 'building' | 'deploying' | 'ready' | 'error'

  /** Build/deployment logs */
  logs?: string[]

  /** Timing information */
  timing?: {
    buildDuration?: number
    deployDuration?: number
    totalDuration?: number
  }
}

/**
 * Source type detection result
 */
export interface SourceTypeInfo {
  /** Whether the project is static */
  isStatic: boolean

  /** Detected adapter (opennext, static, etc.) */
  adapter?: string

  /** Framework detected */
  framework?: string

  /** Output directory */
  outputDir?: string
}

/**
 * Asset file to deploy
 */
export interface AssetFile {
  /** Relative path */
  path: string

  /** File content (base64 for binary) */
  content: string

  /** Content type */
  contentType?: string
}

/**
 * Deployment payload sent to the API
 */
export interface DeployPayload {
  /** Worker name */
  name: string

  /** Worker code */
  code: string

  /** Deployment mode */
  mode: DeployMode

  /** Compatibility date */
  compatibilityDate: string

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

  /** Durable Object bindings */
  durableObjects?: Record<string, string>

  /** Dispatch namespace */
  dispatchNamespace?: string

  /** Tenant ID */
  tenantId?: string

  /** Custom domain */
  customDomain?: string

  /** Static assets */
  assets?: AssetFile[]
}

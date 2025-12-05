/**
 * @mdxe/deploy - Unified Deployment Types
 *
 * Common interfaces for deploying MDX projects to any supported platform.
 *
 * @packageDocumentation
 */

/**
 * Supported deployment platforms
 * 'do' is the default platform - a managed serverless platform powered by Cloudflare Workers
 */
export type Platform = 'do' | 'cloudflare' | 'vercel' | 'github'

/**
 * Deployment target within a platform
 */
export type DeployTarget =
  | 'workers'      // Cloudflare Workers
  | 'pages'        // Cloudflare Pages or GitHub Pages
  | 'serverless'   // Vercel Serverless
  | 'edge'         // Vercel Edge
  | 'static'       // Static site (any platform)

/**
 * Deployment environment
 */
export type DeployEnvironment = 'production' | 'preview' | 'development'

/**
 * Common deployment options shared by all platforms
 */
export interface DeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Target platform */
  platform?: Platform

  /** Project/site name */
  name?: string

  /** Deployment environment */
  environment?: DeployEnvironment

  /** Environment variables */
  env?: Record<string, string>

  /** Build command override */
  buildCommand?: string

  /** Output directory override */
  outputDir?: string

  /** Custom domain(s) */
  domains?: string[]

  /** Dry run - show what would happen without deploying */
  dryRun?: boolean

  /** Force deployment (skip confirmations, overwrite configs) */
  force?: boolean

  /** Verbose output */
  verbose?: boolean
}

/**
 * Cloudflare-specific options
 */
export interface CloudflareOptions extends DeployOptions {
  platform: 'cloudflare'

  /** Deploy to Workers or Pages */
  target?: 'workers' | 'pages'

  /** Deployment mode for Workers */
  mode?: 'static' | 'opennext'

  /** Account ID */
  accountId?: string

  /** API token */
  apiToken?: string

  /** Compatibility date */
  compatibilityDate?: string

  /** Compatibility flags */
  compatibilityFlags?: string[]

  /** KV namespace bindings */
  kvNamespaces?: Record<string, string>

  /** D1 database bindings */
  d1Databases?: Record<string, string>

  /** R2 bucket bindings */
  r2Buckets?: Record<string, string>

  /** Dispatch namespace for Workers for Platforms */
  dispatchNamespace?: string

  /** Tenant ID for multi-tenant deployments */
  tenantId?: string
}

/**
 * Vercel-specific options
 */
export interface VercelOptions extends DeployOptions {
  platform: 'vercel'

  /** Team ID or slug */
  teamId?: string

  /** API token */
  token?: string

  /** Deploy to production */
  production?: boolean

  /** Framework override */
  framework?: 'nextjs' | 'vite' | 'remix' | 'astro' | 'gatsby' | 'nuxt' | 'svelte' | null

  /** Root directory (for monorepos) */
  rootDirectory?: string

  /** Regions to deploy to */
  regions?: string[]

  /** Serverless function configuration */
  functions?: Record<string, {
    maxDuration?: number
    memory?: number
    runtime?: string
  }>

  /** Git metadata */
  git?: {
    commitSha?: string
    commitMessage?: string
    commitAuthorName?: string
    branch?: string
  }
}

/**
 * GitHub-specific options
 */
export interface GitHubOptions extends DeployOptions {
  platform: 'github'

  /** Repository in format owner/repo */
  repository?: string

  /** Branch to deploy to (default: gh-pages) */
  branch?: string

  /** Source branch for content */
  sourceBranch?: string

  /** GitHub token */
  token?: string

  /** Commit message */
  commitMessage?: string

  /** Author name */
  authorName?: string

  /** Author email */
  authorEmail?: string

  /** Use GitHub Actions workflow instead of direct push */
  useActions?: boolean

  /** Clean target branch before deploy */
  clean?: boolean

  /** Files to preserve when cleaning */
  preserve?: string[]
}

/**
 * .do Platform-specific options
 * The default deployment target - managed serverless platform
 */
export interface DoOptions extends DeployOptions {
  platform: 'do'

  /** Deployment mode */
  mode?: 'static' | 'opennext'

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
}

/**
 * Union type of all platform-specific options
 */
export type PlatformOptions = DoOptions | CloudflareOptions | VercelOptions | GitHubOptions

/**
 * Deployment state
 */
export type DeployState =
  | 'pending'
  | 'queued'
  | 'building'
  | 'deploying'
  | 'ready'
  | 'error'
  | 'canceled'

/**
 * Deployment result returned by all platforms
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean

  /** Deployment URL */
  url?: string

  /** Production/alias URL (if different from deployment URL) */
  productionUrl?: string

  /** Unique deployment ID */
  deploymentId?: string

  /** Project/site ID */
  projectId?: string

  /** Error message if failed */
  error?: string

  /** Deployment state */
  state?: DeployState

  /** Platform that was deployed to */
  platform?: Platform

  /** Build/deployment logs */
  logs?: string[]

  /** Timing information */
  timing?: {
    /** Build duration in ms */
    buildDuration?: number
    /** Deploy duration in ms */
    deployDuration?: number
    /** Total duration in ms */
    totalDuration?: number
  }
}

/**
 * Deploy provider interface - implemented by each platform
 */
export interface DeployProvider {
  /** Platform identifier */
  readonly platform: Platform

  /** Human-readable name */
  readonly name: string

  /**
   * Deploy a project
   */
  deploy(options: DeployOptions): Promise<DeployResult>

  /**
   * Check if deployment is supported for the given options
   */
  supports?(options: DeployOptions): boolean

  /**
   * Get deployment status (if supported)
   */
  getStatus?(deploymentId: string): Promise<DeployResult>

  /**
   * Cancel a deployment (if supported)
   */
  cancel?(deploymentId: string): Promise<{ success: boolean; error?: string }>

  /**
   * Delete a deployment (if supported)
   */
  delete?(deploymentId: string): Promise<{ success: boolean; error?: string }>
}

/**
 * Provider factory function type
 */
export type CreateProvider = (config?: Record<string, unknown>) => DeployProvider

/**
 * Detection result for auto-detecting best platform
 */
export interface DetectionResult {
  /** Recommended platform */
  platform: Platform

  /** Confidence score (0-1) */
  confidence: number

  /** Reason for recommendation */
  reason: string

  /** Detected framework */
  framework?: string

  /** Whether the project is static */
  isStatic?: boolean
}

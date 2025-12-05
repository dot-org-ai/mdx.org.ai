/**
 * @mdxe/vercel - Type Definitions
 *
 * @packageDocumentation
 */

/**
 * Vercel deployment options
 */
export interface VercelDeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Vercel project name */
  projectName?: string

  /** Vercel team ID or slug */
  teamId?: string

  /** Vercel API token */
  token?: string

  /** Deploy to production (default: preview) */
  production?: boolean

  /** Build command override */
  buildCommand?: string

  /** Output directory override */
  outputDir?: string

  /** Install command override */
  installCommand?: string

  /** Development command override */
  devCommand?: string

  /** Framework override */
  framework?: 'nextjs' | 'vite' | 'remix' | 'astro' | 'gatsby' | 'nuxt' | 'svelte' | null

  /** Root directory (for monorepos) */
  rootDirectory?: string

  /** Environment variables */
  env?: Record<string, string>

  /** Environment variables for build only */
  buildEnv?: Record<string, string>

  /** Regions to deploy to */
  regions?: string[]

  /** Custom domains */
  domains?: string[]

  /** Serverless function configuration */
  functions?: Record<string, FunctionConfig>

  /** Headers configuration */
  headers?: HeaderConfig[]

  /** Redirects configuration */
  redirects?: RedirectConfig[]

  /** Rewrites configuration */
  rewrites?: RewriteConfig[]

  /** Dry run mode */
  dryRun?: boolean

  /** Force deployment */
  force?: boolean

  /** Use Vercel CLI */
  useCli?: boolean

  /** Public deployment (no auth required for preview) */
  public?: boolean

  /** Git metadata */
  git?: {
    commitSha?: string
    commitMessage?: string
    commitAuthorName?: string
    branch?: string
    dirty?: boolean
  }
}

/**
 * Serverless function configuration
 */
export interface FunctionConfig {
  /** Maximum duration in seconds */
  maxDuration?: number
  /** Memory allocation in MB */
  memory?: number
  /** Runtime */
  runtime?: string
  /** Regions */
  regions?: string[]
}

/**
 * Header configuration
 */
export interface HeaderConfig {
  source: string
  headers: Array<{
    key: string
    value: string
  }>
  has?: RouteCondition[]
  missing?: RouteCondition[]
}

/**
 * Redirect configuration
 */
export interface RedirectConfig {
  source: string
  destination: string
  permanent?: boolean
  statusCode?: number
  has?: RouteCondition[]
  missing?: RouteCondition[]
}

/**
 * Rewrite configuration
 */
export interface RewriteConfig {
  source: string
  destination: string
  has?: RouteCondition[]
  missing?: RouteCondition[]
}

/**
 * Route condition
 */
export interface RouteCondition {
  type: 'header' | 'cookie' | 'host' | 'query'
  key: string
  value?: string
}

/**
 * Deploy result
 */
export interface DeployResult {
  /** Whether deployment succeeded */
  success: boolean

  /** Deployment URL (preview or production) */
  url?: string

  /** Production URL (if production deployment) */
  productionUrl?: string

  /** Deployment ID */
  deploymentId?: string

  /** Project ID */
  projectId?: string

  /** Error message if failed */
  error?: string

  /** Build/deployment logs */
  logs?: string[]

  /** Deployment state */
  state?: 'QUEUED' | 'BUILDING' | 'ERROR' | 'INITIALIZING' | 'READY' | 'CANCELED'
}

/**
 * Vercel API configuration
 */
export interface VercelApiConfig {
  /** Vercel API token */
  token: string

  /** Team ID or slug */
  teamId?: string

  /** API base URL */
  baseUrl?: string

  /** Request timeout in milliseconds */
  timeout?: number
}

/**
 * Project configuration
 */
export interface ProjectConfig {
  name: string
  framework?: string
  buildCommand?: string
  outputDirectory?: string
  installCommand?: string
  devCommand?: string
  rootDirectory?: string
  nodeVersion?: string
  environmentVariables?: Array<{
    key: string
    value: string
    target?: ('production' | 'preview' | 'development')[]
    type?: 'plain' | 'encrypted' | 'secret' | 'system'
  }>
}

/**
 * Deployment info
 */
export interface DeploymentInfo {
  id: string
  url: string
  name: string
  state: string
  readyState: string
  createdAt: number
  buildingAt?: number
  ready?: number
  target?: 'production' | 'preview'
  creator?: {
    uid: string
    username: string
  }
  meta?: Record<string, string>
  aliasAssigned?: boolean
  aliasError?: {
    code: string
    message: string
  }
}

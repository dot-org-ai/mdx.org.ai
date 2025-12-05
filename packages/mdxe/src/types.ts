/**
 * MDXE Types - Executor interface for MDX document execution
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'

/**
 * Execution context for running MDX documents
 */
export interface ExecutionContext {
  /** Environment variables */
  env?: Record<string, string>
  /** Working directory */
  cwd?: string
  /** Timeout in milliseconds */
  timeout?: number
  /** Input data for the execution */
  input?: unknown
  /** Additional props/context */
  props?: Record<string, unknown>
}

/**
 * Execution result
 */
export interface ExecutionResult {
  /** Whether execution succeeded */
  success: boolean
  /** Output from execution */
  output?: unknown
  /** Error message if failed */
  error?: string
  /** Execution duration in ms */
  duration?: number
  /** Logs from execution */
  logs?: string[]
}

/**
 * Do options for executing/invoking an MDX document
 */
export interface DoOptions extends ExecutionContext {
  /** Action/method to invoke */
  action?: string
  /** Arguments for the action */
  args?: unknown[]
}

/**
 * Do result
 */
export interface DoResult extends ExecutionResult {
  /** Return value from the action */
  returnValue?: unknown
}

/**
 * Test options for running tests on MDX documents
 */
export interface TestOptions {
  /** Test pattern/filter */
  pattern?: string
  /** Run in watch mode */
  watch?: boolean
  /** Coverage report */
  coverage?: boolean
  /** Timeout per test in ms */
  timeout?: number
  /** Specific test file or document */
  target?: string
}

/**
 * Test result with detailed info
 */
export interface TestResult {
  /** Overall pass/fail */
  passed: boolean
  /** Total tests */
  total: number
  /** Passed tests */
  passed_count: number
  /** Failed tests */
  failed_count: number
  /** Skipped tests */
  skipped_count: number
  /** Duration in ms */
  duration: number
  /** Individual test results */
  tests?: Array<{
    name: string
    passed: boolean
    duration: number
    error?: string
  }>
  /** Coverage info if enabled */
  coverage?: {
    lines: number
    branches: number
    functions: number
    statements: number
  }
}

/**
 * Deploy options
 */
export interface DeployOptions {
  /** Target environment */
  target?: string
  /** Deployment platform */
  platform?: 'vercel' | 'cloudflare' | 'netlify' | 'custom'
  /** Environment variables for deployment */
  env?: Record<string, string>
  /** Dry run mode */
  dryRun?: boolean
  /** Force deployment */
  force?: boolean
}

/**
 * Cloudflare-specific deploy options
 */
export interface CloudflareDeployOptions extends DeployOptions {
  platform: 'cloudflare'
  /** Cloudflare account ID */
  accountId?: string
  /** Cloudflare API token */
  apiToken?: string
  /** Project name for Cloudflare */
  projectName?: string
  /** Use OpenNext for SSR (dynamic) or Static Assets */
  mode?: 'static' | 'opennext'
  /** Compatibility date for Workers */
  compatibilityDate?: string
  /** Compatibility flags */
  compatibilityFlags?: string[]
  /** Custom routes configuration */
  routes?: string[]
  /** KV namespace bindings */
  kvNamespaces?: Record<string, string>
  /** D1 database bindings */
  d1Databases?: Record<string, string>
  /** R2 bucket bindings */
  r2Buckets?: Record<string, string>

  /**
   * Use direct Cloudflare API instead of wrangler CLI
   * Enables custom auth and multi-tenant namespace support
   */
  useApi?: boolean

  /**
   * Custom Cloudflare API base URL
   * Use this to proxy requests through your own auth server
   * @default 'https://api.cloudflare.com/client/v4'
   */
  apiBaseUrl?: string

  /**
   * Custom headers to include in API requests
   * Useful for tenant-specific authentication
   */
  apiHeaders?: Record<string, string>

  /**
   * Deploy to a dispatch namespace for multi-tenant isolation
   * Creates isolated worker instances per tenant
   */
  dispatchNamespace?: string

  /**
   * Tenant/customer identifier for namespace isolation
   */
  tenantId?: string

  /**
   * Use managed workers.do API for deployment
   * Authenticates via oauth.do and POSTs to /workers endpoint
   * @default false
   */
  useManagedApi?: boolean

  /**
   * Managed API base URL (workers.do)
   * @default 'https://workers.do'
   */
  managedApiUrl?: string
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
  /** Build logs */
  logs?: string[]
}

/**
 * Executor interface for MDX document execution
 *
 * All runtime adapters (node, workers, isolate, etc.) implement this interface
 *
 * @example
 * ```ts
 * // Using Node.js executor
 * import { createNodeExecutor } from '@mdxe/node'
 * const executor = createNodeExecutor()
 *
 * // Using Cloudflare Workers executor
 * import { createWorkersExecutor } from '@mdxe/workers'
 * const executor = createWorkersExecutor()
 *
 * // Same interface regardless of runtime
 * const result = await executor.do(document, { action: 'generate' })
 * ```
 */
export interface Executor<TData extends MDXLDData = MDXLDData> {
  /**
   * Execute/invoke an MDX document
   */
  do(document: MDXLDDocument<TData>, options?: DoOptions): Promise<DoResult>

  /**
   * Run tests on MDX documents
   */
  test(documents: MDXLDDocument<TData>[] | string, options?: TestOptions): Promise<TestResult>

  /**
   * Deploy MDX documents
   */
  deploy(documents: MDXLDDocument<TData>[] | string, options?: DeployOptions): Promise<DeployResult>

  /**
   * Cleanup resources
   */
  close?(): Promise<void>
}

/**
 * Executor configuration base
 */
export interface ExecutorConfig {
  /** Runtime environment */
  runtime?: 'node' | 'worker' | 'edge' | 'browser'
  /** Default timeout in ms */
  timeout?: number
}

/**
 * Factory function type for creating executor instances
 */
export type CreateExecutor<TConfig extends ExecutorConfig = ExecutorConfig, TData extends MDXLDData = MDXLDData> = (
  config?: TConfig
) => Executor<TData>

/**
 * SDK Provider Types - Re-exported from sdk-provider.ts
 */

export type {
  SDKProviderConfig,
  SDKProvider,
  AIProvider,
  WorkflowProvider,
  ContextProvider,
} from './sdk-provider.js'

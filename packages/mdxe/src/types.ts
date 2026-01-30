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
 * Base fields shared by all execution results
 */
interface ExecutionResultBase {
  /** Execution duration in ms */
  duration?: number
  /** Logs from execution */
  logs?: string[]
}

/**
 * Successful execution result
 */
interface ExecutionSuccess extends ExecutionResultBase {
  /** Indicates successful execution */
  success: true
  /** Output from execution */
  output?: unknown
}

/**
 * Failed execution result
 */
interface ExecutionError extends ExecutionResultBase {
  /** Indicates failed execution */
  success: false
  /** Error message describing the failure */
  error: string
}

/**
 * Execution result - discriminated union type
 *
 * Use type narrowing via the `success` property to access type-specific fields:
 *
 * @example
 * ```ts
 * const result = await executor.do(document)
 *
 * if (result.success) {
 *   // TypeScript knows result.output is available here
 *   console.log('Output:', result.output)
 * } else {
 *   // TypeScript knows result.error is available here
 *   console.error('Error:', result.error)
 * }
 * ```
 */
export type ExecutionResult = ExecutionSuccess | ExecutionError

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
 * Base fields shared by all do results
 */
interface DoResultBase {
  /** Execution duration in ms */
  duration?: number
  /** Logs from execution */
  logs?: string[]
}

/**
 * Successful do result
 */
interface DoSuccess extends DoResultBase {
  /** Indicates successful execution */
  success: true
  /** Output from execution */
  output?: unknown
  /** Return value from the action */
  returnValue?: unknown
}

/**
 * Failed do result
 */
interface DoError extends DoResultBase {
  /** Indicates failed execution */
  success: false
  /** Error message describing the failure */
  error: string
}

/**
 * Do result - discriminated union type
 *
 * Use type narrowing via the `success` property to access type-specific fields:
 *
 * @example
 * ```ts
 * const result = await executor.do(document, { action: 'myAction' })
 *
 * if (result.success) {
 *   // TypeScript knows result.returnValue is available here
 *   console.log('Return value:', result.returnValue)
 * } else {
 *   // TypeScript knows result.error is available here
 *   console.error('Error:', result.error)
 * }
 * ```
 */
export type DoResult = DoSuccess | DoError

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
 * Base fields shared by all deploy results
 */
interface DeployResultBase {
  /** Build logs */
  logs?: string[]
}

/**
 * Successful deploy result
 */
interface DeploySuccess extends DeployResultBase {
  /** Indicates successful deployment */
  success: true
  /** Deployment URL */
  url?: string
  /** Deployment ID */
  deploymentId?: string
}

/**
 * Failed deploy result
 */
interface DeployError extends DeployResultBase {
  /** Indicates failed deployment */
  success: false
  /** Error message describing the failure */
  error: string
}

/**
 * Deploy result - discriminated union type
 *
 * Use type narrowing via the `success` property to access type-specific fields:
 *
 * @example
 * ```ts
 * const result = await deploy(projectDir, options)
 *
 * if (result.success) {
 *   // TypeScript knows result.url and result.deploymentId are available here
 *   console.log('Deployed to:', result.url)
 * } else {
 *   // TypeScript knows result.error is available here
 *   console.error('Deployment failed:', result.error)
 * }
 * ```
 */
export type DeployResult = DeploySuccess | DeployError

// ============================================================================
// Type Guards for Result Types
// ============================================================================

/**
 * Generic result type that can be narrowed via success property
 */
export type Result<TSuccess, TError> =
  | { success: true } & TSuccess
  | { success: false; error: string } & TError

/**
 * Type guard to check if an ExecutionResult is successful
 *
 * @example
 * ```ts
 * const result = await executor.do(document)
 *
 * if (isSuccess(result)) {
 *   // TypeScript knows result.output is available here
 *   console.log('Output:', result.output)
 * }
 * ```
 */
export function isSuccess<T extends { success: boolean }>(
  result: T
): result is T & { success: true } {
  return result.success === true
}

/**
 * Type guard to check if an ExecutionResult is an error
 *
 * @example
 * ```ts
 * const result = await executor.do(document)
 *
 * if (isError(result)) {
 *   // TypeScript knows result.error is available here
 *   console.error('Error:', result.error)
 * }
 * ```
 */
export function isError<T extends { success: boolean }>(
  result: T
): result is T & { success: false; error: string } {
  return result.success === false
}

/**
 * Type guard specifically for ExecutionResult
 *
 * @example
 * ```ts
 * const result = await executor.do(document)
 *
 * if (isExecutionSuccess(result)) {
 *   console.log('Output:', result.output)
 * }
 * ```
 */
export function isExecutionSuccess(result: ExecutionResult): result is ExecutionSuccess {
  return result.success === true
}

/**
 * Type guard specifically for ExecutionResult errors
 */
export function isExecutionError(result: ExecutionResult): result is ExecutionError {
  return result.success === false
}

/**
 * Type guard specifically for DoResult
 *
 * @example
 * ```ts
 * const result = await executor.do(document, { action: 'myAction' })
 *
 * if (isDoSuccess(result)) {
 *   console.log('Return value:', result.returnValue)
 * }
 * ```
 */
export function isDoSuccess(result: DoResult): result is DoSuccess {
  return result.success === true
}

/**
 * Type guard specifically for DoResult errors
 */
export function isDoError(result: DoResult): result is DoError {
  return result.success === false
}

/**
 * Type guard specifically for DeployResult
 *
 * @example
 * ```ts
 * const result = await deploy(projectDir, options)
 *
 * if (isDeploySuccess(result)) {
 *   console.log('Deployed to:', result.url)
 * }
 * ```
 */
export function isDeploySuccess(result: DeployResult): result is DeploySuccess {
  return result.success === true
}

/**
 * Type guard specifically for DeployResult errors
 */
export function isDeployError(result: DeployResult): result is DeployError {
  return result.success === false
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

/**
 * Workerd SDK Provider Types - Re-exported from sdk-workerd.ts
 */

export type {
  WorkerdSDKConfig,
  WorkerdSDKProvider,
  WorkerdSDKContext,
  WorkerdContext,
  WorkerdDBClient,
  WorkerdAIProvider,
  WorkerdWorkflowProvider,
  DatabaseBindings,
  WorkerEnv,
  D1Database,
  KVNamespace,
  R2Bucket,
} from './sdk-workerd.js'

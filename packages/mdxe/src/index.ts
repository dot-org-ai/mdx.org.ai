/**
 * MDXE - Execute, Test, & Deploy MDX-based Agents, Apps, APIs, and Sites
 *
 * @packageDocumentation
 */

export const name = 'mdxe'

// Export all types
export type {
  ExecutionContext,
  ExecutionResult,
  DoOptions,
  DoResult,
  TestOptions,
  TestResult,
  DeployOptions,
  DeployResult,
  CloudflareDeployOptions,
  SourceTypeInfo,
  Executor,
  ExecutorConfig,
  CreateExecutor,
} from './types.js'

// Export Cloudflare API client
export {
  CloudflareApi,
  createCloudflareApi,
  createCloudflareApiFromEnv,
  type CloudflareApiConfig,
  type WorkerMetadata,
  type WorkerBinding,
  type DispatchNamespace,
  type UploadResult,
} from './cloudflare/api.js'

// Export deploy command
export { deploy, detectSourceType } from './commands/deploy.js'

// Re-export mdxld types for convenience
export type { MDXLDDocument, MDXLDData } from 'mdxld'

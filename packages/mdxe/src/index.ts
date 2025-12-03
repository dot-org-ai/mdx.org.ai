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
  // SDK Provider types
  SDKProviderConfig,
  SDKProvider,
  AIProvider,
  WorkflowProvider,
  ContextProvider,
} from './types.js'

// Export SDK provider (programmatic access)
export {
  createSDKProvider,
  generateSDKInjectionCode,
} from './sdk-provider.js'

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

// Re-export ai-sandbox types and functions
export {
  evaluate,
  createEvaluator,
  type EvaluateOptions,
  type EvaluateResult,
  type LogEntry,
  type TestResults,
  type TestResult as SandboxTestResult,
  type SandboxEnv,
  type SDKConfig,
} from 'ai-sandbox'

// Re-export ai-workflows types (for use in MDX documents)
export type {
  WorkflowContext,
  EventHandler,
  ScheduleHandler,
  OnProxy,
  EveryProxy,
} from 'ai-workflows'

// Re-export ai-functions RPC types (for @mdxe/rpc integration)
export type {
  RPC,
  RPCPromise,
  RPCServer,
  RPCClient,
} from 'ai-functions'

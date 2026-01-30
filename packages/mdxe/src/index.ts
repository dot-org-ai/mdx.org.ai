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

// Export SDK provider (programmatic access) - legacy multi-runtime
export {
  createSDKProvider,
  generateSDKInjectionCode,
} from './sdk-provider.js'

// Export Workerd SDK provider - simplified workerd-based execution
export {
  createWorkerdSDKProvider,
  generateWorkerdSDKCode,
  createWorkerdContext,
  injectDatabaseBindings,
  isLocalContext,
  isRemoteContext,
  type WorkerdSDKConfig,
  type WorkerdSDKProvider,
  type WorkerdSDKContext,
  type WorkerdContext,
  type WorkerdDBClient,
  type WorkerdAIProvider,
  type WorkerdWorkflowProvider,
  type DatabaseBindings,
  type WorkerEnv,
} from './sdk-workerd.js'

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

// Export tail command types and functions
export {
  parseTailArgs,
  formatEvent,
  getColorForImportance,
  runTail,
  type TailCommandOptions,
} from './commands/tail.js'

// Re-export tail module types
export {
  type MdxeEvent,
  type EventImportance,
  type CreateEventOptions,
  createEvent,
  isValidImportance,
  IMPORTANCE_LEVELS,
} from './tail/types.js'

export {
  type EventFilter,
  matchesFilter,
  compareImportance,
} from './tail/filter.js'

export {
  TailClient,
  type TailClientOptions,
  type TailClientMetrics,
} from './tail/ws-client.js'

export {
  fetchHistoricalEvents,
  HistoricalTailPoller,
  type HistoricalTailOptions,
  type HistoricalTailResult,
  type PollingOptions,
} from './tail/historical.js'

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
} from 'ai-functions'

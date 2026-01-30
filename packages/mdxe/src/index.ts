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
  Result,
  // SDK Provider types
  SDKProviderConfig,
  SDKProvider,
  AIProvider,
  WorkflowProvider,
  ContextProvider,
} from './types.js'

// Export DBClient and StubDBClient types from sdk-provider
export type {
  DBClient,
  StubDBClient,
} from './sdk-provider.js'

// Export type guard utilities for discriminated union result types
export {
  isSuccess,
  isError,
  isExecutionSuccess,
  isExecutionError,
  isDoSuccess,
  isDoError,
  isDeploySuccess,
  isDeployError,
} from './types.js'

/**
 * SDK Provider (Multi-Runtime)
 *
 * Use for Node.js, Bun, or environments with flexible database backends.
 * Supports: memory, fs, sqlite, postgres, clickhouse, mongo
 *
 * @see {@link ./sdk-provider.ts} for implementation
 * @see README.md "SDK Provider" section for decision guide
 */
export {
  createSDKProvider,
  generateSDKInjectionCode,
} from './sdk-provider.js'

// Export environment utilities for context-aware env access
export {
  isWorkerContext,
  getEnvironment,
  extractStringEnvVars,
  getEnvVar,
  getAuthToken,
  type WorkerEnvBindings,
} from './env-utils.js'

/**
 * Workerd SDK Provider (Cloudflare Workers)
 *
 * Use for Cloudflare Workers deployments with native bindings (D1, KV, R2).
 * Optimized for workerd runtime with Worker Loader support.
 *
 * @see {@link ./sdk-workerd.ts} for implementation
 * @see README.md "SDK Provider" section for decision guide and migration
 */
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

// Export dev server for Miniflare-based development
export {
  createMiniflareDevServer,
  createMiniflareConfig,
  findAvailablePort,
  loadEnvFile,
  mergeEnvVars,
  watchFiles,
  reloadMiniflare,
  shutdownDevServer,
  cleanupWatchers,
  setupSignalHandlers,
  RUNTIME_TYPE,
  EXECUTION_CONTEXT,
  SUPPORTED_WORKER_APIS,
} from './commands/dev-server.js'

// Export dev server types
export type {
  DevServerConfig,
  MiniflareDevConfig,
  DevServerInstance,
  WatcherConfig,
  SupportedWorkerAPI,
  RuntimeType,
  ExecutionContext as DevExecutionContext,
} from './commands/dev-server-types.js'

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

// Export error utilities for safe error responses
export {
  isDevelopment,
  sanitizeError,
  createErrorResponse,
  type ErrorResponse,
  type SanitizeOptions,
  type SanitizedError,
} from './utils/errors.js'

// Re-export ai-evaluate types and functions (formerly ai-sandbox)
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
} from 'ai-evaluate'

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

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

/**
 * Zod Schemas for Runtime Validation
 *
 * Provides type-safe runtime validation for SDK configurations, CLI options,
 * and execution parameters. Use these for validating user input and config files.
 *
 * @see {@link ./schemas.ts} for full schema definitions
 *
 * @example
 * ```ts
 * import { SDKProviderConfigSchema, validateConfig } from 'mdxe'
 *
 * // Validate configuration
 * const config = validateConfig(SDKProviderConfigSchema, userInput)
 *
 * // Or use safe validation
 * const result = SDKProviderConfigSchema.safeParse(userInput)
 * if (!result.success) {
 *   console.error('Invalid config:', result.error)
 * }
 * ```
 */
export {
  // Schema exports
  SDKProviderConfigSchema,
  WorkerdSDKConfigSchema,
  EvaluateOptionsSchema,
  EvaluateSDKConfigSchema,
  ExecutionContextSchema,
  DeployOptionsSchema,
  TestOptionsSchema,
  CliOptionsSchema,
  DatabaseBindingsSchema,
  // Validation helpers
  validateConfig,
  validateSDKProviderConfig,
  validateWorkerdSDKConfig,
  validateEvaluateOptions,
  validateCliOptions,
  safeValidate,
  // Factory
  createSchemaFactory,
  // Error class
  ValidationError,
  // Constants
  DB_BACKENDS,
  CLI_DB_BACKENDS,
  CONTEXT_TYPES,
  AI_MODES,
  CLI_COMMANDS,
  PLATFORMS,
  TARGETS,
  CLI_CONTEXT_TYPES,
} from './schemas.js'

// Schema input/output types
export type {
  SDKProviderConfigInput,
  SDKProviderConfigOutput,
  WorkerdSDKConfigInput,
  WorkerdSDKConfigOutput,
  EvaluateOptionsInput,
  EvaluateOptionsOutput,
  ExecutionContextInput,
  ExecutionContextOutput,
  DeployOptionsInput,
  DeployOptionsOutput,
  TestOptionsInput,
  TestOptionsOutput,
  CliOptionsInput,
  CliOptionsOutput,
  SchemaFactory,
  DbBackend,
  CliDbBackend,
  ContextType,
  AiMode,
  CliCommand,
  Platform,
  Target,
  CliContextType,
} from './schemas.js'

// =============================================================================
// DO STORAGE
// =============================================================================

/**
 * Durable Object Storage Integration
 *
 * Functions for storing and managing MDX content in Cloudflare Durable Objects:
 * - DO-based content storage (store MDX in DO SQLite)
 * - R2 backup for large files (>1MB)
 * - Parquet storage for structured data
 * - Content retrieval via worker_loaders
 * - Content versioning and history
 *
 * @see {@link ./commands/do-storage.ts} for implementation
 */
export {
  // Core storage functions
  storeContentInDO,
  getContentFromDO,
  storeInR2,
  getFromR2,
  storeContentWithR2Backup,
  // Parquet storage
  storeMetadataAsParquet,
  exportToParquet,
  // Worker loader integration
  loadContentForWorker,
  // Versioning
  getVersionHistory,
  rollbackToVersion,
  diffVersions,
  // Tiered storage
  storeWithTiering,
  promoteToHot,
  getAccessStats,
  determineTier,
  // Content diffing
  computeDiff,
  applyDiff,
  storeWithDiff,
  // Garbage collection
  cleanupOldVersions,
  cleanupOrphanedR2,
  // Metrics
  getStorageMetrics,
  // Batch operations
  batchStore,
  batchGet,
  batchDelete,
  // Worker integration
  storeCompiledModules,
  getCompiledModule,
  // Utilities
  hashContentForStorage,
  shouldStoreInR2,
  getNamespaceFromUrl,
  // Constants
  R2_THRESHOLD,
  HOT_ACCESS_THRESHOLD,
  COLD_DAYS_THRESHOLD,
  DEFAULT_RETENTION_DAYS,
  DEFAULT_MIN_VERSIONS,
} from './commands/do-storage.js'

export type {
  StorageEnv as DOStorageEnv,
  ContentRecord,
  ContentVersion,
  StorageTier,
  TieredStorageResult,
  DiffOperation,
  ContentDiff,
  DiffStorageResult,
  CleanupOptions,
  CleanupResult,
  OrphanedR2Result,
  StorageMetrics,
  WorkerLoadResult,
  VersionHistoryOptions,
  DiffVersionsResult,
  ParquetExportResult,
  AccessStats,
} from './commands/do-storage.js'

// =============================================================================
// GITHUB SYNC
// =============================================================================

/**
 * GitHub Webhook Sync
 *
 * Keep deployed DOs in sync with GitHub repos via gitx:
 * - Webhook payload handling (parse GitHub push events)
 * - Post-receive hook triggers deployment
 * - Conflict resolution on concurrent edits
 * - Branch-based deployment (main -> production, other branches -> preview)
 * - Incremental deployment (only changed files)
 * - PR preview deployments
 *
 * @see {@link ./commands/github-sync.ts} for implementation
 */
export {
  // Webhook handling
  handleGitHubWebhook,
  computeWebhookSignature,
  // Push event parsing
  parseGitHubPushEvent,
  getChangedFiles,
  // Deployment
  triggerDeployment,
  incrementalDeploy,
  // Branch mapping
  mapBranchToEnvironment,
  // Conflict resolution
  resolveConflict,
  // Status reporting
  reportDeploymentStatus,
  // Sync status
  getSyncStatus,
  getSyncHistory,
  // PR previews
  deployPRPreview,
  cleanupPRPreview,
  commentPreviewUrl,
} from './commands/github-sync.js'

export type {
  StorageEnv as GitHubStorageEnv,
  GitHubPushEvent,
  GitHubCommit,
  ParsedPushEvent,
  DeploymentEnvironment,
  ChangedFilesResult,
  DeploymentResult,
  ConflictResolutionOptions,
  ConflictResolutionResult,
  LocalContent,
  RemoteContent,
  DeploymentStatusOptions,
  SyncStatusResult,
  SyncHistoryResult,
  PRPreviewOptions,
  PRPreviewResult,
  PRCleanupOptions,
  PRCleanupResult,
  PRCommentOptions,
  BranchMappingOptions,
  IncrementalDeployOptions,
} from './commands/github-sync.js'

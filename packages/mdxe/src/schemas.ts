/**
 * MDXE Zod Schemas for Runtime Validation
 *
 * Provides Zod schemas for validating SDK configurations, CLI options,
 * and execution parameters at runtime.
 *
 * @module mdxe/schemas
 */

import { z } from 'zod'

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Valid database backend types for SDKProviderConfig
 */
export const DB_BACKENDS = ['memory', 'fs', 'sqlite', 'postgres', 'clickhouse', 'mongo'] as const
export type DbBackend = (typeof DB_BACKENDS)[number]

/**
 * Valid CLI database backend types (includes sqlite-do and all)
 */
export const CLI_DB_BACKENDS = ['memory', 'fs', 'sqlite', 'sqlite-do', 'clickhouse', 'all'] as const
export type CliDbBackend = (typeof CLI_DB_BACKENDS)[number]

/**
 * Valid execution context types
 */
export const CONTEXT_TYPES = ['local', 'remote'] as const
export type ContextType = (typeof CONTEXT_TYPES)[number]

/**
 * Valid AI modes
 */
export const AI_MODES = ['local', 'remote'] as const
export type AiMode = (typeof AI_MODES)[number]

/**
 * Valid CLI commands
 */
export const CLI_COMMANDS = [
  'dev',
  'build',
  'start',
  'deploy',
  'test',
  'run',
  'admin',
  'notebook',
  'tail',
  'db',
  'db:server',
  'db:client',
  'db:publish',
  'help',
  'version',
] as const
export type CliCommand = (typeof CLI_COMMANDS)[number]

/**
 * Valid deployment platforms
 */
export const PLATFORMS = ['do', 'cloudflare', 'vercel', 'github'] as const
export type Platform = (typeof PLATFORMS)[number]

/**
 * Valid target runtimes
 */
export const TARGETS = ['node', 'bun', 'workers', 'all'] as const
export type Target = (typeof TARGETS)[number]

/**
 * Valid CLI context types (includes 'all')
 */
export const CLI_CONTEXT_TYPES = ['local', 'remote', 'all'] as const
export type CliContextType = (typeof CLI_CONTEXT_TYPES)[number]

// =============================================================================
// SDK PROVIDER CONFIG SCHEMA
// =============================================================================

/**
 * Schema for SDKProviderConfig
 *
 * Validates configuration for creating SDK providers with options for
 * context (local/remote), database backend, AI mode, and optional
 * namespace, paths, and authentication.
 */
export const SDKProviderConfigSchema = z.object({
  /** Execution context */
  context: z.enum(CONTEXT_TYPES),
  /** Database backend for local context */
  db: z.enum(DB_BACKENDS),
  /** AI mode */
  aiMode: z.enum(AI_MODES),
  /** Namespace (must be non-empty if provided) */
  ns: z.string().min(1).optional(),
  /** Database path (for fs/sqlite) */
  dbPath: z.string().optional(),
  /** RPC URL for remote context */
  rpcUrl: z.string().url().optional(),
  /** Auth token */
  token: z.string().optional(),
})

export type SDKProviderConfigInput = z.input<typeof SDKProviderConfigSchema>
export type SDKProviderConfigOutput = z.output<typeof SDKProviderConfigSchema>

// =============================================================================
// WORKERD SDK CONFIG SCHEMA
// =============================================================================

/**
 * Schema for database bindings
 */
export const DatabaseBindingsSchema = z
  .object({
    D1: z.unknown().optional(),
    KV: z.unknown().optional(),
    R2: z.unknown().optional(),
  })
  .passthrough()

/**
 * Schema for WorkerdSDKConfig
 *
 * Validates configuration for the workerd-based SDK provider.
 */
export const WorkerdSDKConfigSchema = z.object({
  /** Execution context */
  context: z.enum(CONTEXT_TYPES),
  /** Namespace for the application (must be non-empty) */
  ns: z.string().min(1),
  /** Worker environment (for remote context) */
  env: z.record(z.unknown()).optional(),
  /** Database bindings */
  bindings: DatabaseBindingsSchema.optional(),
  /** RPC URL for remote AI/workflow calls */
  rpcUrl: z.string().url().optional(),
  /** Authentication token */
  token: z.string().optional(),
})

export type WorkerdSDKConfigInput = z.input<typeof WorkerdSDKConfigSchema>
export type WorkerdSDKConfigOutput = z.output<typeof WorkerdSDKConfigSchema>

// =============================================================================
// EVALUATE OPTIONS SCHEMA
// =============================================================================

/**
 * Schema for SDK configuration within evaluate options
 */
export const EvaluateSDKConfigSchema = z.object({
  /** Execution context */
  context: z.enum(CONTEXT_TYPES).optional(),
  /** Namespace */
  ns: z.string().min(1).optional(),
  /** RPC URL */
  rpcUrl: z.string().url().optional(),
  /** Auth token */
  token: z.string().optional(),
  /** Database configuration */
  db: z
    .object({
      provider: z.string(),
      config: z.record(z.unknown()),
    })
    .optional(),
  /** Target runtime */
  target: z.string().optional(),
  /** AI Gateway URL */
  aiGatewayUrl: z.string().url().optional(),
  /** AI Gateway token */
  aiGatewayToken: z.string().optional(),
})

/**
 * Schema for EvaluateOptions
 *
 * Validates options passed to ai-sandbox evaluate function.
 */
export const EvaluateOptionsSchema = z.object({
  /** Test code to execute (must be non-empty) */
  tests: z.string().min(1),
  /** SDK configuration */
  sdk: EvaluateSDKConfigSchema.optional(),
  /** Import statements to hoist */
  imports: z.array(z.string()).optional(),
  /** Timeout in milliseconds (must be positive) */
  timeout: z.number().positive().optional(),
})

export type EvaluateOptionsInput = z.input<typeof EvaluateOptionsSchema>
export type EvaluateOptionsOutput = z.output<typeof EvaluateOptionsSchema>

// =============================================================================
// EXECUTION CONTEXT SCHEMA
// =============================================================================

/**
 * Schema for ExecutionContext
 *
 * Validates execution context for running MDX documents.
 */
export const ExecutionContextSchema = z.object({
  /** Environment variables */
  env: z.record(z.string()).optional(),
  /** Working directory */
  cwd: z.string().optional(),
  /** Timeout in milliseconds (must be positive) */
  timeout: z.number().positive().optional(),
  /** Input data for the execution */
  input: z.unknown().optional(),
  /** Additional props/context */
  props: z.record(z.unknown()).optional(),
})

export type ExecutionContextInput = z.input<typeof ExecutionContextSchema>
export type ExecutionContextOutput = z.output<typeof ExecutionContextSchema>

// =============================================================================
// DEPLOY OPTIONS SCHEMA
// =============================================================================

/**
 * Schema for DeployOptions
 *
 * Validates deployment options for various platforms.
 */
export const DeployOptionsSchema = z.object({
  /** Target environment */
  target: z.string().optional(),
  /** Deployment platform */
  platform: z.enum(['vercel', 'cloudflare', 'netlify', 'custom']).optional(),
  /** Environment variables for deployment */
  env: z.record(z.string()).optional(),
  /** Dry run mode */
  dryRun: z.boolean().optional(),
  /** Force deployment */
  force: z.boolean().optional(),
})

export type DeployOptionsInput = z.input<typeof DeployOptionsSchema>
export type DeployOptionsOutput = z.output<typeof DeployOptionsSchema>

// =============================================================================
// TEST OPTIONS SCHEMA
// =============================================================================

/**
 * Schema for TestOptions
 *
 * Validates test options for running MDX tests.
 */
export const TestOptionsSchema = z.object({
  /** Test pattern/filter */
  pattern: z.string().optional(),
  /** Run in watch mode */
  watch: z.boolean().optional(),
  /** Coverage report */
  coverage: z.boolean().optional(),
  /** Timeout per test in ms (must be positive) */
  timeout: z.number().positive().optional(),
  /** Specific test file or document */
  target: z.string().optional(),
})

export type TestOptionsInput = z.input<typeof TestOptionsSchema>
export type TestOptionsOutput = z.output<typeof TestOptionsSchema>

// =============================================================================
// CLI OPTIONS SCHEMA
// =============================================================================

/**
 * Port number validation (1-65535)
 */
const PortSchema = z.number().int().min(1).max(65535)

/**
 * Schema for CliOptions
 *
 * Validates CLI command options for mdxe.
 */
export const CliOptionsSchema = z.object({
  /** Command to execute */
  command: z.enum(CLI_COMMANDS),
  /** Project directory */
  projectDir: z.string(),
  /** Deployment platform */
  platform: z.enum(PLATFORMS).optional(),
  /** Deployment mode */
  mode: z.enum(['static', 'opennext']).optional(),
  /** Project name */
  projectName: z.string().optional(),
  /** Dry run mode */
  dryRun: z.boolean().optional(),
  /** Force regeneration */
  force: z.boolean().optional(),
  /** Verbose output */
  verbose: z.boolean().optional(),
  /** Environment variables */
  env: z.record(z.string()).optional(),
  /** Show help */
  help: z.boolean().optional(),
  /** Watch mode for tests */
  watch: z.boolean().optional(),
  /** Filter pattern for tests */
  filter: z.string().optional(),
  /** Enable coverage */
  coverage: z.boolean().optional(),
  /** Enable UI mode */
  ui: z.boolean().optional(),
  /** Execution context */
  context: z.enum(CLI_CONTEXT_TYPES).optional(),
  /** Target runtime */
  target: z.enum(TARGETS).optional(),
  /** Database backend */
  db: z.enum(CLI_DB_BACKENDS).optional(),
  /** AI mode */
  aiMode: z.enum(AI_MODES).optional(),
  /** Server port */
  port: PortSchema.optional(),
  /** Server host */
  host: z.string().optional(),
  /** ClickHouse URL */
  clickhouseUrl: z.string().optional(),
  /** HTTP port for ClickHouse */
  httpPort: PortSchema.optional(),
  /** Auto-open browser */
  open: z.boolean().optional(),
  /** Use worker loaders */
  workers: z.boolean().optional(),
  /** Subcommand (e.g., 'workers' for deploy) */
  subcommand: z.enum(['workers']).optional(),
  /** Use content hash for workers */
  contentHash: z.boolean().optional(),
  /** Compatibility date for workers */
  compatibilityDate: z.string().optional(),
})

export type CliOptionsInput = z.input<typeof CliOptionsSchema>
export type CliOptionsOutput = z.output<typeof CliOptionsSchema>

// =============================================================================
// VALIDATION HELPER
// =============================================================================

/**
 * Validation error with formatted message
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[]
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Format Zod validation errors into a readable message
 */
function formatZodErrors(errors: z.ZodError): string {
  return errors.issues
    .map((issue) => {
      const path = issue.path.join('.')
      return path ? `${path}: ${issue.message}` : issue.message
    })
    .join('\n')
}

/**
 * Validate configuration against a schema
 *
 * @param schema - Zod schema to validate against
 * @param config - Configuration object to validate
 * @returns Validated and typed configuration
 * @throws ValidationError if validation fails
 *
 * @example
 * ```ts
 * const config = validateConfig(SDKProviderConfigSchema, {
 *   context: 'local',
 *   db: 'memory',
 *   aiMode: 'local',
 * })
 * ```
 */
export function validateConfig<T extends z.ZodSchema>(schema: T, config: unknown): z.output<T> {
  const result = schema.safeParse(config)
  if (!result.success) {
    const message = formatZodErrors(result.error)
    throw new ValidationError(`Configuration validation failed:\n${message}`, result.error.issues)
  }
  return result.data
}

// =============================================================================
// SCHEMA FACTORY
// =============================================================================

/**
 * Schema factory for extending and composing schemas
 */
export interface SchemaFactory {
  /**
   * Extend a schema with additional fields
   */
  extend<T extends z.ZodObject<z.ZodRawShape>, U extends z.ZodRawShape>(
    schema: T,
    shape: U
  ): z.ZodObject<T['shape'] & U>

  /**
   * Create a partial version of a schema
   */
  partial<T extends z.ZodObject<z.ZodRawShape>>(schema: T): z.ZodObject<{ [K in keyof T['shape']]: z.ZodOptional<T['shape'][K]> }>

  /**
   * Create a strict version that rejects unknown fields
   */
  strict<T extends z.ZodObject<z.ZodRawShape>>(schema: T): z.ZodObject<T['shape'], 'strict'>
}

/**
 * Create a schema factory for extending and composing schemas
 *
 * @example
 * ```ts
 * const factory = createSchemaFactory()
 *
 * // Extend a schema
 * const ExtendedSchema = factory.extend(SDKProviderConfigSchema, {
 *   customField: z.string(),
 * })
 *
 * // Create partial schema
 * const PartialSchema = factory.partial(SDKProviderConfigSchema)
 *
 * // Create strict schema
 * const StrictSchema = factory.strict(SDKProviderConfigSchema)
 * ```
 */
export function createSchemaFactory(): SchemaFactory {
  return {
    extend<T extends z.ZodObject<z.ZodRawShape>, U extends z.ZodRawShape>(schema: T, shape: U) {
      return schema.extend(shape)
    },

    partial<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
      return schema.partial() as unknown as z.ZodObject<{
        [K in keyof T['shape']]: z.ZodOptional<T['shape'][K]>
      }>
    },

    strict<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
      return schema.strict() as z.ZodObject<T['shape'], 'strict'>
    },
  }
}

// =============================================================================
// INTEGRATION HELPERS
// =============================================================================

/**
 * Validate SDKProviderConfig and return typed result
 */
export function validateSDKProviderConfig(config: unknown): SDKProviderConfigOutput {
  return validateConfig(SDKProviderConfigSchema, config)
}

/**
 * Validate WorkerdSDKConfig and return typed result
 */
export function validateWorkerdSDKConfig(config: unknown): WorkerdSDKConfigOutput {
  return validateConfig(WorkerdSDKConfigSchema, config)
}

/**
 * Validate EvaluateOptions and return typed result
 */
export function validateEvaluateOptions(options: unknown): EvaluateOptionsOutput {
  return validateConfig(EvaluateOptionsSchema, options)
}

/**
 * Validate CliOptions and return typed result
 */
export function validateCliOptions(options: unknown): CliOptionsOutput {
  return validateConfig(CliOptionsSchema, options)
}

/**
 * Safe validation that returns result object instead of throwing
 */
export function safeValidate<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.output<T> } | { success: false; error: ValidationError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const message = formatZodErrors(result.error)
  return { success: false, error: new ValidationError(message, result.error.issues) }
}

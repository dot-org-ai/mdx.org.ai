/**
 * Environment Utilities
 *
 * Provides environment variable access that works in both local (Node.js) and
 * remote (Cloudflare Workers) contexts.
 *
 * In Workers, `process.env` is not available and will throw an error if accessed.
 * This module provides safe abstractions for environment access.
 *
 * @packageDocumentation
 */

/**
 * Check if running in a Worker context where process.env is not available
 */
export function isWorkerContext(): boolean {
  try {
    // Check if process is undefined (common in Workers)
    if (typeof process === 'undefined') {
      return true
    }

    // Check if process.env is undefined or throws
    if (typeof process.env === 'undefined') {
      return true
    }

    // Try to access a property - this will throw in some Worker environments
    // even if process is partially defined
    const _ = process.env.NODE_ENV
    return false
  } catch {
    // If accessing process.env throws, we're in a Worker context
    return true
  }
}

/**
 * Worker environment bindings type
 * These are passed to Workers as the `env` parameter in fetch handlers
 */
export interface WorkerEnvBindings {
  [key: string]: unknown
}

/**
 * Get environment variables based on execution context
 *
 * @param context - 'local' for Node.js/development, 'remote' for Workers/production
 * @param envBindings - Worker environment bindings (only used in remote context)
 * @returns Environment variables as a string record
 *
 * @example
 * ```ts
 * // Local context - uses process.env
 * const env = getEnvironment('local')
 * console.log(env.API_KEY)
 *
 * // Remote context - uses Worker env bindings
 * const env = getEnvironment('remote', workerEnv)
 * console.log(env.API_KEY)
 * ```
 */
export function getEnvironment(
  context: 'local' | 'remote',
  envBindings?: WorkerEnvBindings
): Record<string, string | undefined> {
  if (context === 'remote') {
    // In remote context, NEVER access process.env
    // Only use the provided Worker environment bindings
    return extractStringEnvVars(envBindings)
  }

  // In local context, use process.env
  // This is safe because we've already determined we're in a local context
  if (isWorkerContext()) {
    // Fallback: if we're somehow in a Worker context but asked for local,
    // return empty to prevent errors
    return {}
  }

  return { ...process.env } as Record<string, string | undefined>
}

/**
 * Extract string-only values from Worker environment bindings
 *
 * Worker env can contain various binding types (D1, KV, R2, etc.) which are objects.
 * This function filters to only include string values (actual environment variables).
 *
 * @param bindings - Worker environment bindings object
 * @returns Only the string values from the bindings
 */
export function extractStringEnvVars(
  bindings?: WorkerEnvBindings
): Record<string, string | undefined> {
  if (!bindings) {
    return {}
  }

  const result: Record<string, string | undefined> = {}

  for (const [key, value] of Object.entries(bindings)) {
    if (typeof value === 'string') {
      result[key] = value
    }
  }

  return result
}

/**
 * Safely get a single environment variable
 *
 * @param context - Execution context
 * @param key - Environment variable name
 * @param envBindings - Worker environment bindings (for remote context)
 * @param defaultValue - Default value if not found
 * @returns The environment variable value or default
 */
export function getEnvVar(
  context: 'local' | 'remote',
  key: string,
  envBindings?: WorkerEnvBindings,
  defaultValue?: string
): string | undefined {
  const env = getEnvironment(context, envBindings)
  return env[key] ?? defaultValue
}

/**
 * Get authentication token based on context
 *
 * In local context, falls back to process.env.DO_TOKEN if no explicit token provided.
 * In remote context, only uses the explicit token (never accesses process.env).
 *
 * @param context - Execution context
 * @param explicitToken - Explicitly provided token
 * @param envBindings - Worker environment bindings
 * @returns The token to use, or undefined if none available
 */
export function getAuthToken(
  context: 'local' | 'remote',
  explicitToken?: string,
  envBindings?: WorkerEnvBindings
): string | undefined {
  // If explicit token is provided, always use it
  if (explicitToken) {
    return explicitToken
  }

  // In remote context, never fall back to process.env
  if (context === 'remote') {
    // Try to get from Worker env bindings
    const env = getEnvironment('remote', envBindings)
    return env.DO_TOKEN
  }

  // In local context, fall back to process.env.DO_TOKEN
  const env = getEnvironment('local')
  return env.DO_TOKEN
}

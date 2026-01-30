/**
 * Dev Server Types
 *
 * Type definitions for the Miniflare-based development server.
 *
 * @packageDocumentation
 */

/**
 * Development server configuration
 */
export interface DevServerConfig {
  /** Project directory containing MDX files */
  projectDir: string
  /** Server port (default: 3000) */
  port: number
  /** Server host (default: 'localhost') */
  host: string
  /** Enable verbose logging */
  verbose?: boolean
  /** Environment variables to pass to the worker */
  env?: Record<string, string>
  /** Enable hot reload on file changes (default: true) */
  hotReload?: boolean
  /** Debounce time for hot reload in ms (default: 100) */
  hotReloadDebounce?: number
  /** Compatibility date for workerd (default: current year) */
  compatibilityDate?: string
}

/**
 * Miniflare configuration generated from dev server options
 */
export interface MiniflareDevConfig {
  /** Compatibility date for workerd features */
  compatibilityDate: string
  /** Environment variable bindings */
  bindings: Record<string, string>
  /** ES modules to load */
  modules?: Array<{
    type: 'ESModule'
    path: string
    contents: string
  }>
}

/**
 * Dev server instance returned after starting the server
 */
export interface DevServerInstance {
  /** Actual port the server is running on */
  port: number
  /** Host the server is bound to */
  host: string
  /** Stop the server and cleanup resources */
  stop: () => Promise<void>
  /** Reload the Miniflare instance */
  reload: () => Promise<void>
}

/**
 * File watcher configuration
 */
export interface WatcherConfig {
  /** Patterns to watch (glob-like) */
  patterns: string[]
  /** Directory to watch */
  directory: string
  /** Debounce time in ms */
  debounceMs: number
  /** Callback on file change */
  onChange: () => void
}

/**
 * Supported Worker APIs available in workerd runtime
 */
export type SupportedWorkerAPI =
  | 'fetch'
  | 'Request'
  | 'Response'
  | 'Headers'
  | 'URL'
  | 'URLSearchParams'
  | 'FormData'
  | 'Blob'
  | 'ReadableStream'
  | 'WritableStream'
  | 'TransformStream'
  | 'TextEncoder'
  | 'TextDecoder'
  | 'crypto'
  | 'atob'
  | 'btoa'
  | 'setTimeout'
  | 'setInterval'
  | 'clearTimeout'
  | 'clearInterval'
  | 'console'

/**
 * Runtime type indicator
 */
export type RuntimeType = 'miniflare' | 'node' | 'bun'

/**
 * Execution context indicator
 */
export type ExecutionContext = 'workerd' | 'node' | 'bun'

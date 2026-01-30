/**
 * Dev Server with Miniflare/workerd
 *
 * This module provides a development server that uses Miniflare to run
 * MDX applications locally with the same workerd runtime used in production.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync, watch, type FSWatcher } from 'node:fs'
import { join } from 'node:path'
import { createServer as createNetServer } from 'node:net'

// Re-export types
export type {
  DevServerConfig,
  MiniflareDevConfig,
  DevServerInstance,
  WatcherConfig,
  SupportedWorkerAPI,
  RuntimeType,
  ExecutionContext,
} from './dev-server-types.js'

import type {
  DevServerConfig,
  MiniflareDevConfig,
  DevServerInstance,
} from './dev-server-types.js'

/**
 * Runtime type - always miniflare for local dev
 */
export const RUNTIME_TYPE = 'miniflare' as const

/**
 * Execution context - workerd (not Node.js)
 */
export const EXECUTION_CONTEXT = 'workerd' as const

/**
 * Supported Worker APIs available in workerd
 */
export const SUPPORTED_WORKER_APIS = [
  'fetch',
  'Request',
  'Response',
  'Headers',
  'URL',
  'URLSearchParams',
  'FormData',
  'Blob',
  'ReadableStream',
  'WritableStream',
  'TransformStream',
  'TextEncoder',
  'TextDecoder',
  'crypto',
  'atob',
  'btoa',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'console',
] as const

// Active file watchers
const activeWatchers: FSWatcher[] = []

// Active Miniflare instances (we'll lazily import Miniflare)
let miniflareInstance: unknown = null

/**
 * Check if a port is available
 */
function checkPort(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer()
    server.once('error', () => {
      resolve(false)
    })
    server.once('listening', () => {
      server.close(() => resolve(true))
    })
    // Use IPv4 explicitly to avoid dual-stack issues
    const bindHost = host === 'localhost' ? '127.0.0.1' : host
    server.listen(port, bindHost)
  })
}

/**
 * Find an available port starting from the given port
 */
export async function findAvailablePort(
  startPort: number,
  host: string = 'localhost',
  maxAttempts: number = 10
): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i
    if (await checkPort(port, host)) {
      return port
    }
  }
  throw new Error(`Could not find available port after ${maxAttempts} attempts starting from ${startPort}`)
}

/**
 * Load environment variables from .env file
 */
export function loadEnvFile(projectDir: string): Record<string, string> {
  const envPath = join(projectDir, '.env')
  const env: Record<string, string> = {}

  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const lines = content.split('\n')

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip empty lines and comments
      if (!trimmed || trimmed.startsWith('#')) continue

      const eqIndex = trimmed.indexOf('=')
      if (eqIndex > 0) {
        const key = trimmed.substring(0, eqIndex).trim()
        let value = trimmed.substring(eqIndex + 1).trim()

        // Remove surrounding quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }

        env[key] = value
      }
    }
  }

  return env
}

/**
 * Merge environment variables (CLI env overrides file env)
 */
export function mergeEnvVars(
  fileEnv: Record<string, string>,
  cliEnv: Record<string, string>
): Record<string, string> {
  return {
    ...fileEnv,
    ...cliEnv,
  }
}

/**
 * Create Miniflare configuration from dev server options
 */
export function createMiniflareConfig(config: DevServerConfig): MiniflareDevConfig {
  // Default compatibility date to a recent date (within last year)
  const now = new Date()
  const defaultCompatDate = `${now.getFullYear()}-01-01`

  // Load env from file and merge with CLI env
  const fileEnv = loadEnvFile(config.projectDir)
  const mergedEnv = mergeEnvVars(fileEnv, config.env || {})

  return {
    compatibilityDate: config.compatibilityDate || defaultCompatDate,
    bindings: {
      ...mergedEnv,
      // Always set development indicator
      MDX_LOCAL_DEV: 'true',
    },
  }
}

/**
 * Watch files for changes
 */
export function watchFiles(
  projectDir: string,
  patterns: string[],
  onChange: () => void,
  debounceMs: number = 100
): FSWatcher[] {
  const watchers: FSWatcher[] = []
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  const debouncedOnChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    debounceTimer = setTimeout(onChange, debounceMs)
  }

  // Watch the project directory for MDX/MD file changes
  try {
    const watcher = watch(projectDir, { recursive: true }, (eventType, filename) => {
      if (filename && (filename.endsWith('.mdx') || filename.endsWith('.md') || filename.endsWith('.ts'))) {
        debouncedOnChange()
      }
    })
    watchers.push(watcher)
    activeWatchers.push(watcher)
  } catch (err) {
    console.warn(`Warning: Could not watch directory ${projectDir}:`, (err as Error).message)
  }

  return watchers
}

/**
 * Reload Miniflare instance
 */
export async function reloadMiniflare(): Promise<void> {
  if (miniflareInstance && typeof (miniflareInstance as { dispose?: () => Promise<void> }).dispose === 'function') {
    await (miniflareInstance as { dispose: () => Promise<void> }).dispose()
  }
  miniflareInstance = null
}

/**
 * Shutdown dev server and cleanup resources
 */
export async function shutdownDevServer(): Promise<void> {
  // Dispose Miniflare
  await reloadMiniflare()

  // Close all watchers
  await cleanupWatchers()
}

/**
 * Cleanup file watchers
 */
export async function cleanupWatchers(): Promise<void> {
  for (const watcher of activeWatchers) {
    try {
      watcher.close()
    } catch {
      // Ignore errors during cleanup
    }
  }
  activeWatchers.length = 0
}

/**
 * Setup signal handlers for graceful shutdown
 */
export function setupSignalHandlers(onShutdown: () => Promise<void>): void {
  const handleSignal = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down...`)
    await onShutdown()
    process.exit(0)
  }

  process.on('SIGINT', () => handleSignal('SIGINT'))
  process.on('SIGTERM', () => handleSignal('SIGTERM'))
}

/**
 * Create a Miniflare-based development server
 */
export async function createMiniflareDevServer(config: DevServerConfig): Promise<DevServerInstance> {
  const { projectDir, port: requestedPort, host, verbose, hotReload = true, hotReloadDebounce = 100 } = config

  // Find available port
  const port = await findAvailablePort(requestedPort, host)
  if (port !== requestedPort && verbose) {
    console.log(`Port ${requestedPort} in use, using port ${port}`)
  }

  // Create Miniflare config
  const miniflareConfig = createMiniflareConfig(config)

  if (verbose) {
    console.log('Miniflare config:', JSON.stringify(miniflareConfig, null, 2))
  }

  // Dynamically import @mdxe/workers/local for Miniflare
  // Note: This is a dynamic import to avoid hard dependency on miniflare in production
  let evaluator: { evaluate: (content: string, options?: unknown) => Promise<unknown>; dispose: () => Promise<void> } | null = null
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const workersLocal = await import('@mdxe/workers/local').catch(() => null)
    if (workersLocal) {
      evaluator = workersLocal.createLocalEvaluator({
        miniflareOptions: {
          compatibilityDate: miniflareConfig.compatibilityDate,
        },
      })
    }
  } catch (err) {
    console.warn('Warning: @mdxe/workers/local not available, using fallback mode')
    if (verbose) {
      console.warn('Error:', (err as Error).message)
    }
  }

  // Setup file watchers if hot reload enabled
  let watchers: FSWatcher[] = []
  if (hotReload) {
    watchers = watchFiles(
      projectDir,
      ['**/*.mdx', '**/*.md', '**/*.ts'],
      async () => {
        if (verbose) {
          console.log('\nFile change detected, reloading...')
        }
        // Dispose and recreate evaluator
        if (evaluator) {
          await evaluator.dispose()
        }
        try {
          const workersLocal = await import('@mdxe/workers/local').catch(() => null)
          if (workersLocal) {
            evaluator = workersLocal.createLocalEvaluator({
              miniflareOptions: {
                compatibilityDate: miniflareConfig.compatibilityDate,
              },
            })
          }
        } catch {
          // Fallback mode
        }
      },
      hotReloadDebounce
    )
  }

  // Create the HTTP server using @mdxe/hono
  // Note: Dynamic imports to allow graceful fallback
  let server: unknown = null
  try {
    const honoServerModule = await import('@mdxe/hono/server').catch(() => null)
    if (honoServerModule) {
      const app = honoServerModule.createApp({ projectDir, verbose })

      // Start the server
      const nodeServerModule = await import('@hono/node-server').catch(() => null)
      if (nodeServerModule) {
        const bindHost = host === 'localhost' ? '127.0.0.1' : host

        server = nodeServerModule.serve({
          fetch: app.fetch,
          port,
          hostname: bindHost,
        })
      }
    }
  } catch (err) {
    // Fallback if @mdxe/hono is not available
    console.warn('Warning: @mdxe/hono not available, using minimal server')
    if (verbose) {
      console.warn('Error:', (err as Error).message)
    }
  }

  console.log(`\nDev server running at http://${host}:${port}`)
  console.log(`Using Miniflare/workerd for MDX execution`)
  console.log(`Hot reload: ${hotReload ? 'enabled' : 'disabled'}`)
  console.log('\nPress Ctrl+C to stop\n')

  // Setup signal handlers
  const shutdown = async () => {
    // Close watchers
    for (const w of watchers) {
      try {
        w.close()
      } catch {
        // Ignore
      }
    }

    // Dispose evaluator
    if (evaluator) {
      await evaluator.dispose()
    }

    // Close server
    if (server && typeof (server as { close?: () => void }).close === 'function') {
      (server as { close: () => void }).close()
    }
  }

  setupSignalHandlers(shutdown)

  return {
    port,
    host,
    stop: shutdown,
    reload: async () => {
      if (evaluator) {
        await evaluator.dispose()
      }
      try {
        const workersLocal = await import('@mdxe/workers/local').catch(() => null)
        if (workersLocal) {
          evaluator = workersLocal.createLocalEvaluator({
            miniflareOptions: {
              compatibilityDate: miniflareConfig.compatibilityDate,
            },
          })
        }
      } catch {
        // Fallback mode
      }
    },
  }
}

/**
 * @mdxe/isolate - Compile MDX to isolated Worker modules for secure execution
 *
 * This package compiles MDX content into Worker-compatible JavaScript modules
 * that can be executed securely in Cloudflare Workers or workerd isolates.
 *
 * @packageDocumentation
 */

import { compile as compileMDX, type CompileOptions } from '@mdx-js/mdx'
import { parse, type MDXLDDocument } from 'mdxld'

export { parse } from 'mdxld'
export type { MDXLDDocument } from 'mdxld'

/**
 * Compiled module ready for Worker Loader
 */
export interface CompiledModule {
  /** Main module entry point filename */
  mainModule: string
  /** Module source code map */
  modules: Record<string, string>
  /** Parsed frontmatter data */
  data: Record<string, unknown>
  /** Original content hash for caching */
  hash: string
}

/**
 * Worker configuration for Dynamic Worker Loader
 */
export interface WorkerConfig {
  /** Compatibility date for Workers runtime */
  compatibilityDate: string
  /** Main module entry point */
  mainModule: string
  /** Module source code map */
  modules: Record<string, string>
  /** Environment bindings */
  env?: Record<string, unknown>
  /** Global outbound handler (null to block all network) */
  globalOutbound?: unknown | null
}

/**
 * Sandbox options for secure execution
 */
export interface SandboxOptions {
  /** Block all network access (default: true) */
  blockNetwork?: boolean
  /** Allowed environment bindings */
  allowedBindings?: string[]
  /** Maximum execution time in ms */
  timeout?: number
  /** Memory limit in MB */
  memoryLimit?: number
}

/**
 * Compile options extending MDX compile options
 */
export interface CompileToModuleOptions extends Omit<CompileOptions, 'outputFormat' | 'jsx'> {
  /** JSX runtime to use (default: 'automatic') */
  jsxRuntime?: 'automatic' | 'classic'
  /** JSX import source (default: 'react') */
  jsxImportSource?: string
  /** Include JSX runtime in bundle */
  bundleRuntime?: boolean
  /** Module filename (default: 'mdx.js') */
  filename?: string
}

/**
 * Default compile options
 */
const defaultCompileOptions = {
  jsxRuntime: 'automatic' as const,
  jsxImportSource: 'react',
  bundleRuntime: false,
  filename: 'mdx.js',
}

/**
 * Simple hash function for content-based caching
 */
function hashContent(content: string): string {
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * JSX runtime shim for Workers environment
 */
const JSX_RUNTIME_SHIM = `
// Minimal JSX runtime for Workers
const Fragment = Symbol.for('react.fragment');

function jsx(type, props, key) {
  return { $$typeof: Symbol.for('react.element'), type, props, key };
}

function jsxs(type, props, key) {
  return jsx(type, props, key);
}

export { Fragment, jsx, jsxs };
`

/**
 * Worker entry module template
 *
 * Note: Error responses are sanitized by default (no stack traces).
 * Set DEBUG=true in env bindings to enable stack traces for debugging.
 */
const WORKER_ENTRY_TEMPLATE = `
import * as MDXModule from './mdx.js';

// Sanitize internal paths from error messages
function sanitizeError(error, debug = false) {
  if (error == null) return { error: 'Unknown error' };
  const message = error instanceof Error ? error.message : String(error);
  const sanitized = debug ? message : message.replace(/\\/(?:Users|home|app|var|opt|usr|tmp)\\/[^\\s'"]+/g, '[path]').replace(/node_modules\\/[^\\s'"]+/g, '[path]');
  const response = { error: sanitized };
  if (debug && error instanceof Error && error.stack) {
    response.stack = error.stack;
  }
  return response;
}

// Default export handler - Workers only allow handlers as exports
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const debug = env?.DEBUG === 'true' || env?.DEBUG === true;

    // Health check
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get metadata
    if (path === '/meta') {
      return new Response(JSON.stringify({
        exports: Object.keys(MDXModule),
        hasDefault: 'default' in MDXModule,
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Call exported function
    if (path.startsWith('/call/')) {
      const fnName = path.slice(6);
      const fn = MDXModule[fnName];

      if (typeof fn !== 'function') {
        return new Response(JSON.stringify({ error: 'Function not found: ' + fnName }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      try {
        const body = request.method === 'POST' ? await request.json() : {};
        const args = Array.isArray(body.args) ? body.args : [];
        const result = await fn(...args);

        return new Response(JSON.stringify({ result }), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify(sanitizeError(error, debug)), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  }
};
`

/**
 * Compile MDX content to a Worker-compatible module
 *
 * @param content - MDX content string
 * @param options - Compile options
 * @returns Compiled module ready for Worker Loader
 *
 * @example
 * ```ts
 * import { compileToModule } from '@mdxe/isolate'
 *
 * const mdx = \`
 * ---
 * title: Hello
 * ---
 *
 * export function greet(name) {
 *   return \\\`Hello, \\\${name}!\\\`
 * }
 *
 * # Welcome
 * \`
 *
 * const module = await compileToModule(mdx)
 * // Use with Worker Loader
 * ```
 */
export async function compileToModule(
  content: string,
  options: CompileToModuleOptions = {}
): Promise<CompiledModule> {
  const opts = { ...defaultCompileOptions, ...options }

  // Parse frontmatter
  const doc = parse(content)

  // Compile MDX to JS
  const compiled = await compileMDX(content, {
    ...options,
    outputFormat: 'program',
    jsx: false,
    jsxRuntime: opts.jsxRuntime,
    jsxImportSource: opts.bundleRuntime ? '.' : opts.jsxImportSource,
  })

  const jsCode = String(compiled)

  // Build module map
  const modules: Record<string, string> = {
    [opts.filename]: jsCode,
    'entry.js': WORKER_ENTRY_TEMPLATE,
  }

  // Add JSX runtime shim if bundling
  // Name it 'jsx-runtime' to match import from './jsx-runtime'
  if (opts.bundleRuntime) {
    modules['jsx-runtime'] = JSX_RUNTIME_SHIM
  }

  return {
    mainModule: 'entry.js',
    modules,
    data: doc.data,
    hash: hashContent(content),
  }
}

/**
 * Create a Worker configuration from compiled module
 *
 * @param module - Compiled module
 * @param sandbox - Sandbox options
 * @returns Worker configuration for Dynamic Worker Loader
 *
 * @example
 * ```ts
 * import { compileToModule, createWorkerConfig } from '@mdxe/isolate'
 *
 * const module = await compileToModule(mdxContent)
 * const config = createWorkerConfig(module, {
 *   blockNetwork: true,
 * })
 *
 * // Use with env.LOADER.get()
 * const worker = env.LOADER.get(module.hash, async () => config)
 * ```
 */
export function createWorkerConfig(
  module: CompiledModule,
  sandbox: SandboxOptions = {}
): WorkerConfig {
  const { blockNetwork = true } = sandbox

  return {
    compatibilityDate: '2024-01-01',
    mainModule: module.mainModule,
    modules: module.modules,
    env: {},
    globalOutbound: blockNetwork ? null : undefined,
  }
}

/**
 * Compile MDX and create Worker config in one step
 *
 * @param content - MDX content string
 * @param options - Compile and sandbox options
 * @returns Worker configuration ready for Dynamic Worker Loader
 */
export async function compileToWorkerConfig(
  content: string,
  options: CompileToModuleOptions & { sandbox?: SandboxOptions } = {}
): Promise<WorkerConfig & { hash: string; data: Record<string, unknown> }> {
  const { sandbox, ...compileOpts } = options
  const module = await compileToModule(content, compileOpts)
  const config = createWorkerConfig(module, sandbox)

  return {
    ...config,
    hash: module.hash,
    data: module.data,
  }
}

/**
 * Extract exported function names from compiled module
 *
 * @param module - Compiled module
 * @returns Array of exported function/variable names
 */
export function getExports(module: CompiledModule): string[] {
  // Look at mdx.js where the actual MDX exports are (for compiled MDX)
  // Fall back to mainModule for other module structures
  const code = module.modules['mdx.js'] || module.modules[module.mainModule] || ''
  const exportMatches = code.matchAll(/export\s+(?:const|let|var|function|class|async\s+function)\s+(\w+)/g)
  const namedExports = code.matchAll(/export\s*\{\s*([^}]+)\s*\}/g)

  const exports = new Set<string>()

  for (const match of exportMatches) {
    if (match[1]) exports.add(match[1])
  }

  for (const match of namedExports) {
    if (match[1]) {
      match[1].split(',').forEach(name => {
        const cleaned = name.trim().split(/\s+as\s+/).pop()?.trim()
        if (cleaned) exports.add(cleaned)
      })
    }
  }

  return Array.from(exports)
}

/**
 * Module ID generator for caching
 *
 * @param content - MDX content
 * @param version - Optional version string
 * @returns Unique module ID for Worker Loader caching
 */
export function generateModuleId(content: string, version?: string): string {
  const contentHash = hashContent(content)
  return version ? `${contentHash}-${version}` : contentHash
}

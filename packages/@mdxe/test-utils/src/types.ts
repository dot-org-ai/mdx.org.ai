/**
 * Type definitions for @mdxe/test-utils
 */

/**
 * MDX fixture options for creating test MDX content
 */
export interface MDXFixtureOptions {
  /** Frontmatter data as key-value pairs */
  frontmatter?: Record<string, unknown>
  /** Main markdown/MDX content body */
  content?: string
  /** Code blocks to include */
  codeBlocks?: CodeBlockOptions[]
  /** Exports to include at the module level */
  exports?: ExportDefinition[]
  /** JSX components to include */
  components?: ComponentDefinition[]
}

/**
 * Code block configuration
 */
export interface CodeBlockOptions {
  /** Language tag (ts, js, typescript, etc.) */
  language: string
  /** Code content */
  code: string
  /** Code block meta string (e.g., 'test name="my test"') */
  meta?: string
  /** Whether this is an export block */
  export?: boolean
}

/**
 * Export definition for module-level exports
 */
export interface ExportDefinition {
  /** Export name */
  name: string
  /** Export type: 'function', 'const', 'class' */
  type: 'function' | 'const' | 'class'
  /** The export body/implementation */
  body: string
  /** Whether it's a default export */
  isDefault?: boolean
  /** Whether it's async (for functions) */
  async?: boolean
}

/**
 * Component definition for JSX components
 */
export interface ComponentDefinition {
  /** Component name */
  name: string
  /** Component props type (as string) */
  propsType?: string
  /** Component JSX body */
  body: string
}

/**
 * Parsed MDX document structure for assertions
 */
export interface ParsedMDXDocument {
  /** Parsed frontmatter data */
  data: Record<string, unknown>
  /** Raw content body */
  content: string
  /** Detected exports */
  exports: string[]
  /** Whether MDX compiled successfully */
  compiled: boolean
  /** Compilation error if any */
  error?: Error
  /** The original raw MDX string */
  raw: string
}

/**
 * Mock Miniflare configuration
 */
export interface MockMiniflareOptions {
  /** Worker script content */
  script?: string
  /** Module mode */
  modules?: boolean
  /** Compatibility date */
  compatibilityDate?: string
  /** KV namespaces to mock */
  kvNamespaces?: string[]
  /** D1 databases to mock */
  d1Databases?: string[]
  /** Environment variables */
  bindings?: Record<string, unknown>
}

/**
 * Mock Miniflare instance
 */
export interface MockMiniflare {
  /** Dispatch a fetch request to the worker */
  dispatchFetch: (url: string, init?: RequestInit) => Promise<Response>
  /** Dispose the mock */
  dispose: () => Promise<void>
  /** Get bound KV namespace */
  getKVNamespace: (name: string) => MockKVNamespace
  /** Get bound D1 database */
  getD1Database: (name: string) => MockD1Database
}

/**
 * Mock KV Namespace
 */
export interface MockKVNamespace {
  get: (key: string) => Promise<string | null>
  put: (key: string, value: string) => Promise<void>
  delete: (key: string) => Promise<void>
  list: () => Promise<{ keys: Array<{ name: string }> }>
}

/**
 * Mock D1 Database
 */
export interface MockD1Database {
  exec: (query: string) => Promise<void>
  prepare: (query: string) => MockD1Statement
}

/**
 * Mock D1 Statement
 */
export interface MockD1Statement {
  bind: (...values: unknown[]) => MockD1Statement
  first: <T = unknown>() => Promise<T | null>
  all: <T = unknown>() => Promise<{ results: T[] }>
  run: () => Promise<{ success: boolean }>
}

/**
 * Mock loader configuration
 */
export interface MockLoaderOptions {
  /** Modules to provide */
  modules?: Record<string, string>
  /** Data to include */
  data?: Record<string, unknown>
}

/**
 * Mock Worker Loader interface
 */
export interface MockWorkerLoader {
  /** Load a worker module */
  loadWorker: (config: { mainModule: string; modules: Record<string, string> }) => Promise<MockWorkerInstance>
}

/**
 * Mock Worker Instance
 */
export interface MockWorkerInstance {
  /** Call an exported function */
  call: <T = unknown>(name: string, ...args: unknown[]) => Promise<T>
  /** Get module exports */
  exports: () => Promise<string[]>
  /** Dispose the instance */
  dispose: () => Promise<void>
}

/**
 * Custom matcher result
 */
export interface MatcherResult {
  pass: boolean
  message: () => string
}

/**
 * Compiled MDX result for matcher assertions
 */
export interface CompiledMDXResult {
  code: string
  exports: string[]
  hasDefault: boolean
}

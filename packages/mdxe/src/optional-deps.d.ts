/**
 * Type declarations for optional dependencies
 * These modules may not be installed or may not have type declarations
 */

// Database interface (simplified for type declarations)
interface Database<TData = unknown> {
  list(options?: unknown): Promise<unknown>
  search(options?: unknown): Promise<unknown>
  get(id: string, options?: unknown): Promise<unknown>
  set(id: string, doc: unknown, options?: unknown): Promise<unknown>
  delete(id: string, options?: unknown): Promise<unknown>
  close?(): Promise<void>
}

// @mdxdb/sqlite - optional SQLite database (requires Cloudflare Workers types)
declare module '@mdxdb/sqlite' {
  import type { MDXLDData } from 'mdxld'
  export function createSqliteDatabase(config: { path: string }): Database<MDXLDData>
}

// @mdxdb/postgres - optional PostgreSQL database
declare module '@mdxdb/postgres' {
  import type { MDXLDData } from 'mdxld'
  export function createPostgresDatabase(config: { connectionString: string }): Database<MDXLDData>
}

// @mdxdb/mongo - optional MongoDB database
declare module '@mdxdb/mongo' {
  import type { MDXLDData } from 'mdxld'
  export function createMongoDatabase(config: { uri: string }): Database<MDXLDData>
}

// @mdxe/workers/local - optional Miniflare-backed evaluator used by the dev server.
// mdxe does not declare @mdxe/workers as a dependency; dev-server.ts imports it
// dynamically with `.catch(() => null)`, so only the shape it touches is declared.
declare module '@mdxe/workers/local' {
  export interface LocalEvaluator {
    evaluate(content: string, options?: unknown): Promise<unknown>
    dispose(): Promise<void>
  }
  export function createLocalEvaluator(defaultOptions?: {
    miniflareOptions?: { compatibilityDate?: string; [key: string]: unknown }
    [key: string]: unknown
  }): LocalEvaluator
}

// @hono/node-server - optional Node adapter for the Hono dev server.
// Same pattern: dynamic import guarded with `.catch(() => null)`; not a declared dependency.
declare module '@hono/node-server' {
  // Method syntax (not a function-typed property) so Hono's
  // `fetch(request, env?, executionCtx?)` is assignable under strictFunctionTypes.
  export function serve(options: {
    fetch(request: Request, env?: unknown, executionCtx?: unknown): Response | Promise<Response>
    port?: number
    hostname?: string
  }): { close(): void }
}

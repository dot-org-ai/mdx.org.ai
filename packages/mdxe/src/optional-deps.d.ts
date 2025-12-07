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

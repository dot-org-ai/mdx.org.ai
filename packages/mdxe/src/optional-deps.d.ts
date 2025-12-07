/**
 * Type declarations for optional dependencies
 * These modules may not be installed or may not have type declarations
 */

// @mdxdb/fs - optional filesystem database
declare module '@mdxdb/fs' {
  import type { Database } from 'mdxdb'
  import type { MDXLDData } from 'mdxld'
  export function createFsDatabase(config: { root: string }): Database<MDXLDData>
}

// @mdxdb/sqlite - optional SQLite database (requires Cloudflare Workers types)
declare module '@mdxdb/sqlite' {
  import type { Database } from 'mdxdb'
  import type { MDXLDData } from 'mdxld'
  export function createSqliteDatabase(config: { path: string }): Database<MDXLDData>
}

// @mdxdb/postgres - optional PostgreSQL database
declare module '@mdxdb/postgres' {
  import type { Database } from 'mdxdb'
  import type { MDXLDData } from 'mdxld'
  export function createPostgresDatabase(config: { connectionString: string }): Database<MDXLDData>
}

// @mdxdb/mongo - optional MongoDB database
declare module '@mdxdb/mongo' {
  import type { Database } from 'mdxdb'
  import type { MDXLDData } from 'mdxld'
  export function createMongoDatabase(config: { uri: string }): Database<MDXLDData>
}

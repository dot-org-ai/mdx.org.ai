/**
 * Type declarations for optional dependencies
 * These modules may not be installed or may not have type declarations
 */

// @mdxdb/sqlite - optional SQLite database (requires Cloudflare Workers types)
declare module '@mdxdb/sqlite' {
  import type { Database } from 'mdxdb'
  import type { MDXLDData } from 'mdxld'

  export interface SqliteDatabaseConfig {
    path?: string
    persist?: string
    ns?: string
    url?: string
  }

  export function createSqliteDatabase(config?: SqliteDatabaseConfig): Database<MDXLDData>
  export function createMiniflareDatabase(config?: SqliteDatabaseConfig): Promise<Database<MDXLDData>>
}

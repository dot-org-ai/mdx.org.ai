/**
 * mdxai - Manage, Deploy, & Run MDX-based AI Agents
 *
 * This package provides:
 * - Full re-export of ai-functions (AI primitives, RPC, generation, embeddings)
 * - Persistence provider using mdxdb for function storage
 * - MCP server for Claude integration
 * - Database factories for filesystem and SQLite storage
 *
 * @packageDocumentation
 */

export const name = 'mdxai'

// =============================================================================
// Re-export everything from ai-functions
// =============================================================================

// RPC primitives with capnweb promise pipelining
export * from 'ai-functions'

// =============================================================================
// Persistence Provider using mdxdb
// =============================================================================

export {
  createPersistentRegistry,
  PersistentFunctionRegistry,
  type PersistentRegistryConfig,
} from './persistence.js'

// =============================================================================
// MCP Server for Claude integration
// =============================================================================

export { createMcpServer, runMcpServer, McpServer, StdioServerTransport } from './server.js'
export type { McpServerConfig } from './server.js'

// =============================================================================
// Database factories and types
// =============================================================================

// Re-export database factories for convenience
export { createFsDatabase } from '@mdxdb/fs'
export { createSqliteDatabase } from '@mdxdb/sqlite'

// Re-export types
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions, DBClient, Thing } from 'mdxdb'
export type { FsDatabaseConfig } from '@mdxdb/fs'
export type { SqliteDatabaseConfig } from '@mdxdb/sqlite'
export type { MDXLDDocument, MDXLDData, Relationship } from 'mdxld'

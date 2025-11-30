/**
 * mdxai - Manage, Deploy, & Run MDX-based AI Agents
 *
 * @packageDocumentation
 */

export const name = 'mdxai'

// MCP Server
export { createMcpServer, runMcpServer, McpServer, StdioServerTransport } from './server.js'
export type { McpServerConfig } from './server.js'

// Re-export database factories for convenience
export { createFsDatabase } from '@mdxdb/fs'
export { createSqliteDatabase } from '@mdxdb/sqlite'

// Re-export types
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions } from 'mdxdb'
export type { FsDatabaseConfig } from '@mdxdb/fs'
export type { SqliteDatabaseConfig } from '@mdxdb/sqlite'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

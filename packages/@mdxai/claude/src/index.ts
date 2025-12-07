/**
 * @mdxai/claude - Claude Agent SDK integration for MDX
 *
 * Exposes mdxdb and mdxe operations as Claude Agent SDK tools
 *
 * @packageDocumentation
 */

export const name = '@mdxai/claude'

// Main server factory
export { createClaudeServer } from './server.js'

// Individual tool factories for custom configurations
export { createDatabaseTools, createExecutorTools } from './tools.js'

// Types
export type { ClaudeServerConfig, ToolResult, ToolContent, TextContent, ImageContent, ResourceContent } from './types.js'

// Re-export dependencies for convenience
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions } from '@mdxdb/fs'
export type { Executor, DoOptions, TestOptions, DeployOptions } from 'mdxe'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

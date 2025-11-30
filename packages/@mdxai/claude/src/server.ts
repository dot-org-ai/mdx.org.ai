/**
 * @mdxai/claude Server
 *
 * MCP server for Claude Agent SDK integration
 *
 * @packageDocumentation
 */

import { createSdkMcpServer } from '@anthropic-ai/claude-agent-sdk'
import type { MDXLDData } from 'mdxld'
import type { ClaudeServerConfig } from './types.js'
import { createDatabaseTools, createExecutorTools } from './tools.js'

/**
 * Create an MCP server with mdxdb and mdxe tools for Claude
 *
 * @example
 * ```ts
 * import { createClaudeServer } from '@mdxai/claude'
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { createNodeExecutor } from '@mdxe/node'
 *
 * const db = createFsDatabase({ root: './content' })
 * const executor = createNodeExecutor()
 *
 * const server = createClaudeServer({
 *   name: 'my-mdx-server',
 *   database: db,
 *   executor: executor,
 * })
 *
 * // Use with Claude Agent SDK query
 * query({
 *   prompt: 'List all blog posts',
 *   options: {
 *     mcpServers: {
 *       'my-mdx-server': {
 *         type: 'sdk',
 *         name: 'my-mdx-server',
 *         instance: server,
 *       },
 *     },
 *   },
 * })
 * ```
 */
export function createClaudeServer<TData extends MDXLDData = MDXLDData>(config: ClaudeServerConfig<TData>) {
  const { name = 'mdxai', version = '1.0.0', database, executor, enableDatabaseTools = true, enableExecutorTools = true } = config

  // Build tools array based on configuration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: any[] = []

  // Add database tools if enabled and database is provided
  if (enableDatabaseTools && database) {
    const dbTools = createDatabaseTools(database)
    tools.push(...dbTools)
  }

  // Add executor tools if enabled and executor is provided
  if (enableExecutorTools && executor && database) {
    const execTools = createExecutorTools(executor, database)
    tools.push(...execTools)
  }

  return createSdkMcpServer({
    name,
    version,
    tools,
  })
}

export type { ClaudeServerConfig }

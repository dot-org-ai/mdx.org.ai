/**
 * @mdxai/claude Types
 *
 * @packageDocumentation
 */

import type { Database } from 'mdxdb'
import type { Executor } from 'mdxe'
import type { MDXLDData } from 'mdxld'

/**
 * Configuration for the Claude MCP server
 */
export interface ClaudeServerConfig<TData extends MDXLDData = MDXLDData> {
  /** Name of the MCP server */
  name?: string
  /** Version of the server */
  version?: string
  /** Database instance for document operations */
  database: Database<TData>
  /** Executor instance for running operations */
  executor?: Executor<TData>
  /** Whether to enable database tools (list, search, get, set, delete) */
  enableDatabaseTools?: boolean
  /** Whether to enable executor tools (do, test, deploy) */
  enableExecutorTools?: boolean
}

/**
 * Tool result content types
 */
export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

export interface ResourceContent {
  type: 'resource'
  resource: {
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }
}

export type ToolContent = TextContent | ImageContent | ResourceContent

/**
 * Tool result structure
 */
export interface ToolResult {
  content: ToolContent[]
  isError?: boolean
}

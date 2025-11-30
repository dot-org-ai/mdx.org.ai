/**
 * MCP Server Implementation
 *
 * Creates an MCP server with mdxdb tools using @modelcontextprotocol/sdk
 *
 * @packageDocumentation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import type { Database } from 'mdxdb'
import type { MDXLDData } from 'mdxld'

export interface McpServerConfig {
  name?: string
  version?: string
  database: Database
}

/**
 * Create an MCP server with mdxdb tools
 */
export function createMcpServer<TData extends MDXLDData = MDXLDData>(
  config: McpServerConfig
): McpServer {
  const { name = 'mdxai', version = '1.0.0', database } = config

  const server = new McpServer({
    name,
    version,
  })

  // Register mdxdb_list tool
  server.tool(
    'mdxdb_list',
    'List MDX documents from the database with optional filtering and pagination',
    {
      limit: z.number().optional().describe('Maximum number of documents to return'),
      offset: z.number().optional().describe('Number of documents to skip'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      type: z.string().optional().describe('Filter by document type'),
      prefix: z.string().optional().describe('Filter by path prefix'),
    },
    async (args) => {
      try {
        const result = await database.list({
          limit: args.limit,
          offset: args.offset,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          type: args.type,
          prefix: args.prefix,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total: result.total,
                  hasMore: result.hasMore,
                  count: result.documents.length,
                  documents: result.documents.map((doc) => ({
                    id: doc.id,
                    type: doc.type,
                    data: doc.data,
                  })),
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error listing documents: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Register mdxdb_search tool
  server.tool(
    'mdxdb_search',
    'Search MDX documents by query string',
    {
      query: z.string().describe('Search query string'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip'),
      fields: z.array(z.string()).optional().describe('Fields to search in'),
      type: z.string().optional().describe('Filter by document type'),
    },
    async (args) => {
      try {
        const result = await database.search({
          query: args.query,
          limit: args.limit,
          offset: args.offset,
          fields: args.fields,
          type: args.type,
        })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  total: result.total,
                  hasMore: result.hasMore,
                  count: result.documents.length,
                  documents: result.documents.map((doc) => ({
                    id: doc.id,
                    type: doc.type,
                    score: doc.score,
                    data: doc.data,
                  })),
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error searching documents: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Register mdxdb_get tool
  server.tool(
    'mdxdb_get',
    'Get a single MDX document by ID',
    {
      id: z.string().describe('Document ID (path)'),
    },
    async (args) => {
      try {
        const doc = await database.get(args.id)

        if (!doc) {
          return {
            content: [{ type: 'text' as const, text: `Document not found: ${args.id}` }],
            isError: true,
          }
        }

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  id: doc.id,
                  type: doc.type,
                  context: doc.context,
                  data: doc.data,
                  content: doc.content,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error getting document: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Register mdxdb_set tool
  server.tool(
    'mdxdb_set',
    'Create or update an MDX document',
    {
      id: z.string().describe('Document ID (path)'),
      type: z.string().optional().describe('Document type ($type)'),
      context: z.union([z.string(), z.record(z.unknown()), z.array(z.string())]).optional().describe('JSON-LD context ($context)'),
      data: z.record(z.unknown()).optional().describe('Document frontmatter data'),
      content: z.string().describe('MDX content body'),
    },
    async (args) => {
      try {
        const document = {
          type: args.type,
          context: args.context,
          data: (args.data ?? {}) as TData,
          content: args.content,
        }

        const result = await database.set(args.id, document)

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: true,
                  id: result.id,
                  created: result.created,
                  version: result.version,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error setting document: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  // Register mdxdb_delete tool
  server.tool(
    'mdxdb_delete',
    'Delete an MDX document',
    {
      id: z.string().describe('Document ID (path) to delete'),
      soft: z.boolean().optional().describe('Perform soft delete instead of hard delete'),
    },
    async (args) => {
      try {
        const result = await database.delete(args.id, { soft: args.soft })

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.deleted,
                  id: result.id,
                  deleted: result.deleted,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error deleting document: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  return server
}

/**
 * Run the MCP server with stdio transport
 */
export async function runMcpServer(config: McpServerConfig): Promise<void> {
  const server = createMcpServer(config)
  const transport = new StdioServerTransport()

  await server.connect(transport)

  // Log to stderr (stdout is for MCP messages)
  console.error(`MCP server "${config.name || 'mdxai'}" connected via stdio`)
}

export { McpServer, StdioServerTransport }

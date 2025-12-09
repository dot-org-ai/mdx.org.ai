/**
 * @mdxai/mastra Tools
 *
 * Tool integration for Mastra agents
 *
 * @packageDocumentation
 */

import type { Database } from '@mdxdb/fs'
import type { MDXLDData } from 'mdxld'
import type { MastraTool } from './types.js'

/**
 * Create database tools for Mastra agents
 *
 * Provides tools for agents to interact with MDXDB:
 * - list: List documents
 * - search: Search documents
 * - get: Get a document
 * - set: Create/update a document
 * - delete: Delete a document
 *
 * @example
 * ```ts
 * import { createMastraDbTools } from '@mdxai/mastra'
 * import { createFsDatabase } from '@mdxdb/fs'
 *
 * const db = createFsDatabase({ root: './content' })
 * const tools = createMastraDbTools(db)
 *
 * const agent = createMastraAgent(doc, { tools })
 * ```
 */
export function createMastraDbTools(db: Database<MDXLDData>): MastraTool[] {
  return [
    {
      name: 'mdxdb_list',
      description: 'List documents from the database with optional filtering',
      schema: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            description: 'Filter by document type ($type)',
          },
          prefix: {
            type: 'string',
            description: 'Filter by path prefix',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of documents to return',
            default: 100,
          },
        },
      },
      async handler(input) {
        const result = await db.list({
          type: input.type as string | undefined,
          prefix: input.prefix as string | undefined,
          limit: (input.limit as number | undefined) ?? 100,
        })
        return {
          total: result.total,
          documents: result.documents.map((doc) => ({
            id: doc.id ?? doc.data.$id,
            type: doc.type ?? doc.data.$type,
            data: doc.data,
          })),
        }
      },
    },
    {
      name: 'mdxdb_search',
      description: 'Search documents by query string with optional semantic search',
      schema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: {
            type: 'string',
            description: 'Search query string',
          },
          type: {
            type: 'string',
            description: 'Filter by document type',
          },
          limit: {
            type: 'number',
            description: 'Maximum number of results',
            default: 10,
          },
          semantic: {
            type: 'boolean',
            description: 'Enable semantic/vector search',
            default: false,
          },
        },
      },
      async handler(input) {
        const result = await db.search({
          query: input.query as string,
          type: input.type as string | undefined,
          limit: (input.limit as number | undefined) ?? 10,
          semantic: (input.semantic as boolean | undefined) ?? false,
        })
        return {
          total: result.total,
          documents: result.documents.map((doc) => ({
            id: doc.id ?? doc.data.$id,
            type: doc.type ?? doc.data.$type,
            score: (doc as { score?: number }).score,
            data: doc.data,
            contentPreview: doc.content.slice(0, 200),
          })),
        }
      },
    },
    {
      name: 'mdxdb_get',
      description: 'Get a specific document by ID or path',
      schema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Document ID or path',
          },
        },
      },
      async handler(input) {
        const doc = await db.get(input.id as string)
        if (!doc) {
          throw new Error(`Document not found: ${input.id}`)
        }
        return {
          id: doc.id ?? doc.data.$id,
          type: doc.type ?? doc.data.$type,
          data: doc.data,
          content: doc.content,
        }
      },
    },
    {
      name: 'mdxdb_set',
      description: 'Create or update a document',
      schema: {
        type: 'object',
        required: ['id', 'content'],
        properties: {
          id: {
            type: 'string',
            description: 'Document ID or path',
          },
          type: {
            type: 'string',
            description: 'Document type ($type)',
          },
          data: {
            type: 'object',
            description: 'Document data/frontmatter',
          },
          content: {
            type: 'string',
            description: 'MDX content body',
          },
        },
      },
      async handler(input) {
        const result = await db.set(input.id as string, {
          type: input.type as string | undefined,
          data: (input.data as MDXLDData) ?? {},
          content: input.content as string,
        })
        return {
          success: true,
          id: result.id,
          created: result.created,
        }
      },
    },
    {
      name: 'mdxdb_delete',
      description: 'Delete a document by ID or path',
      schema: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Document ID or path to delete',
          },
        },
      },
      async handler(input) {
        const result = await db.delete(input.id as string)
        return {
          success: result.deleted,
          id: result.id,
        }
      },
    },
  ]
}

/**
 * Create custom tools from MDX documents
 *
 * @example
 * ```ts
 * import { createMastraToolsFromDocs } from '@mdxai/mastra'
 * import { parse } from 'mdxld'
 *
 * const toolDoc = parse(`---
 * $type: Tool
 * name: calculator
 * description: Perform mathematical calculations
 * schema:
 *   type: object
 *   properties:
 *     expression:
 *       type: string
 *       description: Mathematical expression to evaluate
 * ---
 *
 * function handler({ expression }) {
 *   return eval(expression)
 * }
 * `)
 *
 * const tools = await createMastraToolsFromDocs([toolDoc])
 * ```
 */
export async function createMastraToolsFromDocs(
  documents: Array<{ data: Record<string, unknown>; content: string }>
): Promise<MastraTool[]> {
  const tools: MastraTool[] = []

  for (const doc of documents) {
    if (doc.data.$type === 'Tool') {
      const tool: MastraTool = {
        name: doc.data.name as string,
        description: doc.data.description as string,
        schema: doc.data.schema as Record<string, unknown>,
        async handler(input) {
          // In real implementation, would evaluate the MDX content to get the handler function
          // For now, return a placeholder
          console.log(`Tool ${doc.data.name} called with:`, input)
          return { success: true, input }
        },
      }
      tools.push(tool)
    }
  }

  return tools
}

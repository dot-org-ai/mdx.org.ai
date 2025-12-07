/**
 * @mdxai/claude Tools
 *
 * Claude Agent SDK tools for mdxdb and mdxe operations
 *
 * @packageDocumentation
 */

import { z } from 'zod'
import { tool } from '@anthropic-ai/claude-agent-sdk'
import type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions } from '@mdxdb/fs'
import type { Executor, DoOptions, TestOptions, DeployOptions } from 'mdxe'
import type { MDXLDData, MDXLDDocument } from 'mdxld'

/**
 * Create database tools for an mdxdb Database instance
 */
export function createDatabaseTools<TData extends MDXLDData = MDXLDData>(db: Database<TData>) {
  const listTool = tool(
    'mdxdb_list',
    'List MDX documents from the database with optional filtering and pagination',
    {
      limit: z.number().optional().describe('Maximum number of documents to return'),
      offset: z.number().optional().describe('Number of documents to skip'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      type: z.string().optional().describe('Filter by document type ($type)'),
      prefix: z.string().optional().describe('Filter by path prefix'),
    },
    async (args) => {
      try {
        const options: ListOptions = {
          limit: args.limit,
          offset: args.offset,
          sortBy: args.sortBy,
          sortOrder: args.sortOrder,
          type: args.type,
          prefix: args.prefix,
        }
        const result = await db.list(options)
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
                    id: doc.id ?? doc.data.$id,
                    type: doc.type ?? doc.data.$type,
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

  const searchTool = tool(
    'mdxdb_search',
    'Search MDX documents by query string with optional semantic search',
    {
      query: z.string().describe('Search query string'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip'),
      fields: z.array(z.string()).optional().describe('Fields to search in'),
      semantic: z.boolean().optional().describe('Enable semantic/vector search'),
      type: z.string().optional().describe('Filter by document type'),
    },
    async (args) => {
      try {
        const options: SearchOptions = {
          query: args.query,
          limit: args.limit,
          offset: args.offset,
          fields: args.fields,
          semantic: args.semantic,
          type: args.type,
        }
        const result = await db.search(options)
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
                    id: doc.id ?? doc.data.$id,
                    type: doc.type ?? doc.data.$type,
                    score: doc.score,
                    data: doc.data,
                    contentPreview: doc.content.slice(0, 200),
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

  const getTool = tool(
    'mdxdb_get',
    'Get a specific MDX document by ID/path',
    {
      id: z.string().describe('Document ID or path'),
      includeAst: z.boolean().optional().describe('Include AST in response'),
      includeCode: z.boolean().optional().describe('Include compiled code in response'),
    },
    async (args) => {
      try {
        const options: GetOptions = {
          includeAst: args.includeAst,
          includeCode: args.includeCode,
        }
        const doc = await db.get(args.id, options)
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
                  id: doc.id ?? doc.data.$id,
                  type: doc.type ?? doc.data.$type,
                  context: doc.context ?? doc.data.$context,
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

  const setTool = tool(
    'mdxdb_set',
    'Create or update an MDX document',
    {
      id: z.string().describe('Document ID or path'),
      type: z.string().optional().describe('Document type ($type)'),
      context: z.string().optional().describe('JSON-LD context ($context)'),
      data: z.record(z.unknown()).optional().describe('Document data/frontmatter'),
      content: z.string().describe('MDX content body'),
      createOnly: z.boolean().optional().describe('Only create if document does not exist'),
      updateOnly: z.boolean().optional().describe('Only update if document exists'),
    },
    async (args) => {
      try {
        const document = {
          id: args.id,
          type: args.type,
          context: args.context,
          data: (args.data ?? {}) as TData,
          content: args.content,
        } as MDXLDDocument<TData>
        const options: SetOptions = {
          createOnly: args.createOnly,
          updateOnly: args.updateOnly,
        }
        const result = await db.set(args.id, document, options)
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

  const deleteTool = tool(
    'mdxdb_delete',
    'Delete an MDX document by ID/path',
    {
      id: z.string().describe('Document ID or path to delete'),
      soft: z.boolean().optional().describe('Soft delete (mark as deleted instead of removing)'),
    },
    async (args) => {
      try {
        const options: DeleteOptions = {
          soft: args.soft,
        }
        const result = await db.delete(args.id, options)
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

  return [listTool, searchTool, getTool, setTool, deleteTool] as const
}

/**
 * Create executor tools for an mdxe Executor instance
 */
export function createExecutorTools<TData extends MDXLDData = MDXLDData>(
  executor: Executor<TData>,
  db: Database<TData>
) {
  const doTool = tool(
    'mdxe_do',
    'Execute/invoke an action on an MDX document',
    {
      id: z.string().describe('Document ID or path to execute'),
      action: z.string().optional().describe('Action/method to invoke'),
      args: z.array(z.unknown()).optional().describe('Arguments for the action'),
      input: z.unknown().optional().describe('Input data for execution'),
      timeout: z.number().optional().describe('Timeout in milliseconds'),
    },
    async (args) => {
      try {
        const doc = await db.get(args.id)
        if (!doc) {
          return {
            content: [{ type: 'text' as const, text: `Document not found: ${args.id}` }],
            isError: true,
          }
        }
        const options: DoOptions = {
          action: args.action,
          args: args.args as unknown[],
          input: args.input,
          timeout: args.timeout,
        }
        const result = await executor.do(doc, options)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.success,
                  output: result.output,
                  returnValue: result.returnValue,
                  duration: result.duration,
                  error: result.error,
                  logs: result.logs,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error executing document: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  const testTool = tool(
    'mdxe_test',
    'Run tests on MDX documents',
    {
      target: z.string().optional().describe('Specific document ID/path or pattern to test'),
      pattern: z.string().optional().describe('Test name pattern/filter'),
      coverage: z.boolean().optional().describe('Enable coverage report'),
      timeout: z.number().optional().describe('Timeout per test in milliseconds'),
    },
    async (args) => {
      try {
        const options: TestOptions = {
          target: args.target,
          pattern: args.pattern,
          coverage: args.coverage,
          timeout: args.timeout,
        }
        const result = await executor.test(args.target ?? '', options)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  passed: result.passed,
                  total: result.total,
                  passed_count: result.passed_count,
                  failed_count: result.failed_count,
                  skipped_count: result.skipped_count,
                  duration: result.duration,
                  tests: result.tests,
                  coverage: result.coverage,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error running tests: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  const deployTool = tool(
    'mdxe_deploy',
    'Deploy MDX documents to a target environment',
    {
      target: z.string().optional().describe('Document ID/path or pattern to deploy'),
      platform: z
        .enum(['vercel', 'cloudflare', 'netlify', 'custom'])
        .optional()
        .describe('Deployment platform'),
      env: z.record(z.string()).optional().describe('Environment variables for deployment'),
      dryRun: z.boolean().optional().describe('Dry run mode (preview without deploying)'),
      force: z.boolean().optional().describe('Force deployment'),
    },
    async (args) => {
      try {
        const options: DeployOptions = {
          target: args.target,
          platform: args.platform,
          env: args.env,
          dryRun: args.dryRun,
          force: args.force,
        }
        const result = await executor.deploy(args.target ?? '', options)
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                {
                  success: result.success,
                  url: result.url,
                  deploymentId: result.deploymentId,
                  error: result.error,
                  logs: result.logs,
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Error deploying: ${String(error)}` }],
          isError: true,
        }
      }
    }
  )

  return [doTool, testTool, deployTool] as const
}

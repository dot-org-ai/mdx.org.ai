/**
 * @mdxdb/server Implementation
 *
 * Hono-based REST API server for mdxdb
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { MDXLDData } from 'mdxld'
import type { Database } from '@mdxdb/fs'
import type { ServerConfig, ApiResponse, ListQuery, SearchQuery, SetBody, DeleteQuery } from './types.js'

/**
 * Create a Hono app that exposes a Database as a REST API
 *
 * @example
 * ```ts
 * import { createServer } from '@mdxdb/server'
 * import { createFsDatabase } from '@mdxdb/fs'
 * import { serve } from '@hono/node-server'
 *
 * const db = createFsDatabase({ root: './content' })
 * const app = createServer({ database: db })
 *
 * serve({ fetch: app.fetch, port: 3000 })
 * ```
 *
 * ## API Endpoints
 *
 * - `GET /api/mdxdb` - List documents
 * - `GET /api/mdxdb/search` - Search documents
 * - `GET /api/mdxdb/:id` - Get document by ID
 * - `PUT /api/mdxdb/:id` - Create/update document
 * - `DELETE /api/mdxdb/:id` - Delete document
 */
export function createServer<TData extends MDXLDData = MDXLDData>(config: ServerConfig<TData>) {
  const { database, basePath = '/api/mdxdb', cors: enableCors = true, apiKey } = config

  const app = new Hono()

  // Enable CORS if configured
  if (enableCors) {
    app.use('*', cors())
  }

  // API key authentication middleware
  if (apiKey) {
    app.use(`${basePath}/*`, async (c, next) => {
      const authHeader = c.req.header('Authorization')
      const providedKey = authHeader?.replace('Bearer ', '')

      if (providedKey !== apiKey) {
        return c.json({ success: false, error: 'Unauthorized' } satisfies ApiResponse, 401)
      }

      return next()
    })
  }

  // List documents
  app.get(basePath, async (c) => {
    try {
      const query = c.req.query() as ListQuery

      // Parse comma-separated type into array if it contains commas
      const type = query.type?.includes(',') ? query.type.split(',') : query.type

      const result = await database.list({
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        type,
        prefix: query.prefix,
      })

      return c.json({
        success: true,
        data: result,
      } satisfies ApiResponse)
    } catch (error) {
      return c.json(
        { success: false, error: String(error) } satisfies ApiResponse,
        500
      )
    }
  })

  // Search documents
  app.get(`${basePath}/search`, async (c) => {
    try {
      const query = c.req.query() as unknown as SearchQuery

      if (!query.q) {
        return c.json(
          { success: false, error: 'Query parameter "q" is required' } satisfies ApiResponse,
          400
        )
      }

      // Parse comma-separated type into array if it contains commas
      const type = query.type?.includes(',') ? query.type.split(',') : query.type

      const result = await database.search({
        query: query.q,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        fields: query.fields ? query.fields.split(',') : undefined,
        semantic: query.semantic === 'true',
        type,
      })

      return c.json({
        success: true,
        data: result,
      } satisfies ApiResponse)
    } catch (error) {
      return c.json(
        { success: false, error: String(error) } satisfies ApiResponse,
        500
      )
    }
  })

  // Get document by ID (supports nested paths)
  app.get(`${basePath}/:id{.+}`, async (c) => {
    try {
      const id = c.req.param('id')
      const doc = await database.get(id)

      if (!doc) {
        return c.json(
          { success: false, error: 'Document not found' } satisfies ApiResponse,
          404
        )
      }

      return c.json({
        success: true,
        data: doc,
      } satisfies ApiResponse)
    } catch (error) {
      return c.json(
        { success: false, error: String(error) } satisfies ApiResponse,
        500
      )
    }
  })

  // Create/update document
  app.put(`${basePath}/:id{.+}`, async (c) => {
    try {
      const id = c.req.param('id')
      const body = await c.req.json<SetBody>()

      if (!body.content && body.content !== '') {
        return c.json(
          { success: false, error: 'Field "content" is required' } satisfies ApiResponse,
          400
        )
      }

      const document: { type?: string; data?: TData; content?: string } = {
        type: body.type,
        data: (body.data ?? {}) as TData,
        content: body.content,
      }

      const result = await database.set(id, document, {
        createOnly: body.createOnly,
        updateOnly: body.updateOnly,
        version: body.version,
      })

      return c.json({
        success: true,
        data: result,
      } satisfies ApiResponse, result.created ? 201 : 200)
    } catch (error) {
      const message = String(error)
      const status = message.includes('already exists') || message.includes('does not exist') ? 409 : 500
      return c.json(
        { success: false, error: message } satisfies ApiResponse,
        status
      )
    }
  })

  // Delete document
  app.delete(`${basePath}/:id{.+}`, async (c) => {
    try {
      const id = c.req.param('id')
      const query = c.req.query() as DeleteQuery

      const result = await database.delete(id, {
        soft: query.soft === 'true',
        version: query.version,
      })

      if (!result.deleted) {
        return c.json(
          { success: false, error: 'Document not found' } satisfies ApiResponse,
          404
        )
      }

      return c.json({
        success: true,
        data: result,
      } satisfies ApiResponse)
    } catch (error) {
      const message = String(error)
      const status = message.includes('Version mismatch') ? 409 : 500
      return c.json(
        { success: false, error: message } satisfies ApiResponse,
        status
      )
    }
  })

  return app
}

/**
 * @deprecated Use createServer instead
 */
export const createApiServer = createServer

/**
 * Type for the Hono app returned by createServer
 */
export type Server = ReturnType<typeof createServer>

/**
 * @deprecated Use Server instead
 */
export type ApiServer = Server

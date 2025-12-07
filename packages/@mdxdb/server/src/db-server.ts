/**
 * @mdxdb/server DBClient Implementation
 *
 * Hono-based REST API server exposing ai-database DBClient interface
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { DBClient, DBClientExtended } from 'ai-database'
import type {
  DBServerConfig,
  ApiResponse,
  ThingQuery,
  ThingFindQuery,
  ThingSearchQuery,
  CreateThingBody,
  UpdateThingBody,
  RelateBody,
  EventQuery,
  CreateEventBody,
  ActionQuery,
  CreateActionBody,
  CompleteActionBody,
  FailActionBody,
  StoreArtifactBody,
} from './types.js'

/**
 * Check if client is extended (has events, actions, artifacts)
 */
function isExtended(client: DBClient | DBClientExtended): client is DBClientExtended {
  return 'track' in client && 'send' in client && 'storeArtifact' in client
}

/**
 * Create a Hono app that exposes a DBClient as a REST API
 *
 * @example
 * ```ts
 * import { createDBServer } from '@mdxdb/server/db'
 * import { createClickHouseDatabase } from '@mdxdb/clickhouse'
 * import { serve } from '@hono/node-server'
 *
 * const db = await createClickHouseDatabase({ url: 'http://localhost:8123' })
 * const app = createDBServer({ client: db })
 *
 * serve({ fetch: app.fetch, port: 3000 })
 * ```
 *
 * ## API Endpoints
 *
 * ### Things
 * - `GET /api/db/things` - List things
 * - `GET /api/db/things/find` - Find things with where clause
 * - `GET /api/db/things/search` - Search things
 * - `GET /api/db/things/:url` - Get thing by URL (URL-encoded)
 * - `POST /api/db/things` - Create thing
 * - `PUT /api/db/things/:url` - Update thing
 * - `DELETE /api/db/things/:url` - Delete thing
 *
 * ### Relationships
 * - `POST /api/db/relationships` - Create relationship
 * - `DELETE /api/db/relationships` - Remove relationship
 * - `GET /api/db/things/:url/related` - Get related things
 * - `GET /api/db/things/:url/relationships` - Get relationships
 * - `GET /api/db/things/:url/references` - Get inbound references
 *
 * ### Events (Extended)
 * - `POST /api/db/events` - Track event
 * - `GET /api/db/events` - Query events
 * - `GET /api/db/events/:id` - Get event by ID
 *
 * ### Actions (Extended)
 * - `POST /api/db/actions/send` - Send action (pending)
 * - `POST /api/db/actions/do` - Do action (active)
 * - `GET /api/db/actions` - Query actions
 * - `GET /api/db/actions/:id` - Get action by ID
 * - `POST /api/db/actions/:id/start` - Start action
 * - `POST /api/db/actions/:id/complete` - Complete action
 * - `POST /api/db/actions/:id/fail` - Fail action
 * - `POST /api/db/actions/:id/cancel` - Cancel action
 *
 * ### Artifacts (Extended)
 * - `POST /api/db/artifacts` - Store artifact
 * - `GET /api/db/artifacts/:key` - Get artifact by key
 * - `GET /api/db/artifacts/source/:source/:type` - Get artifact by source
 * - `DELETE /api/db/artifacts/:key` - Delete artifact
 * - `POST /api/db/artifacts/clean` - Clean expired artifacts
 */
export function createDBServer<TData extends Record<string, unknown> = Record<string, unknown>>(
  config: DBServerConfig<TData>
) {
  const { client, basePath = '/api/db', cors: enableCors = true, apiKey } = config

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

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  // List things
  app.get(`${basePath}/things`, async (c) => {
    try {
      const query = c.req.query() as ThingQuery
      const things = await client.list({
        ns: query.ns,
        type: query.type,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        orderBy: query.orderBy,
        order: query.order,
      })

      return c.json({ success: true, data: things } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Find things with where clause
  app.get(`${basePath}/things/find`, async (c) => {
    try {
      const query = c.req.query() as ThingFindQuery
      const where = query.where ? JSON.parse(query.where) : undefined

      const things = await client.find({
        ns: query.ns,
        type: query.type,
        where,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        orderBy: query.orderBy,
        order: query.order,
      })

      return c.json({ success: true, data: things } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Search things
  app.get(`${basePath}/things/search`, async (c) => {
    try {
      const query = c.req.query() as Partial<ThingSearchQuery> & Record<string, string>

      if (!query.query) {
        return c.json({ success: false, error: 'Query parameter "query" is required' } satisfies ApiResponse, 400)
      }

      const things = await client.search({
        query: query.query,
        ns: query.ns,
        type: query.type,
        fields: query.fields?.split(','),
        minScore: query.minScore ? parseFloat(query.minScore) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
      })

      return c.json({ success: true, data: things } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Get thing by URL
  app.get(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const thing = await client.get(url)

      if (!thing) {
        return c.json({ success: false, error: 'Thing not found' } satisfies ApiResponse, 404)
      }

      return c.json({ success: true, data: thing } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Create thing
  app.post(`${basePath}/things`, async (c) => {
    try {
      const body = await c.req.json<CreateThingBody>()

      if (!body.ns || !body.type || !body.data) {
        return c.json({ success: false, error: 'Fields "ns", "type", and "data" are required' } satisfies ApiResponse, 400)
      }

      const thing = await client.create({
        ns: body.ns,
        type: body.type,
        id: body.id,
        url: body.url,
        data: body.data as TData,
        '@context': body['@context'],
      })

      return c.json({ success: true, data: thing } satisfies ApiResponse, 201)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Update thing
  app.put(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const body = await c.req.json<UpdateThingBody>()

      if (!body.data) {
        return c.json({ success: false, error: 'Field "data" is required' } satisfies ApiResponse, 400)
      }

      const thing = await client.update(url, { data: body.data as Partial<TData> })

      return c.json({ success: true, data: thing } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Upsert thing
  app.post(`${basePath}/things/upsert`, async (c) => {
    try {
      const body = await c.req.json<CreateThingBody>()

      if (!body.ns || !body.type || !body.data) {
        return c.json({ success: false, error: 'Fields "ns", "type", and "data" are required' } satisfies ApiResponse, 400)
      }

      const thing = await client.upsert({
        ns: body.ns,
        type: body.type,
        id: body.id,
        url: body.url,
        data: body.data as TData,
        '@context': body['@context'],
      })

      return c.json({ success: true, data: thing } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Delete thing
  app.delete(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const deleted = await client.delete(url)

      return c.json({ success: true, data: { deleted } } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // ===========================================================================
  // Relationship Operations
  // ===========================================================================

  // Create relationship
  app.post(`${basePath}/relationships`, async (c) => {
    try {
      const body = await c.req.json<RelateBody>()

      if (!body.type || !body.from || !body.to) {
        return c.json({ success: false, error: 'Fields "type", "from", and "to" are required' } satisfies ApiResponse, 400)
      }

      const rel = await client.relate({
        type: body.type,
        from: body.from,
        to: body.to,
        data: body.data,
      })

      return c.json({ success: true, data: rel } satisfies ApiResponse, 201)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Remove relationship
  app.delete(`${basePath}/relationships`, async (c) => {
    try {
      const { from, type, to } = c.req.query()

      if (!from || !type || !to) {
        return c.json({ success: false, error: 'Query parameters "from", "type", and "to" are required' } satisfies ApiResponse, 400)
      }

      const removed = await client.unrelate(from, type, to)

      return c.json({ success: true, data: { removed } } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Get related things
  app.get(`${basePath}/things/:url{.+}/related`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type, direction } = c.req.query()

      const things = await client.related(url, type, direction as 'from' | 'to' | 'both' | undefined)

      return c.json({ success: true, data: things } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Get relationships
  app.get(`${basePath}/things/:url{.+}/relationships`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type, direction } = c.req.query()

      const rels = await client.relationships(url, type, direction as 'from' | 'to' | 'both' | undefined)

      return c.json({ success: true, data: rels } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // Get references (inbound)
  app.get(`${basePath}/things/:url{.+}/references`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type } = c.req.query()

      const things = await client.references(url, type)

      return c.json({ success: true, data: things } satisfies ApiResponse)
    } catch (error) {
      return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
    }
  })

  // ===========================================================================
  // Extended Operations (Events, Actions, Artifacts)
  // ===========================================================================

  if (isExtended(client)) {
    // -------------------------------------------------------------------------
    // Event Operations
    // -------------------------------------------------------------------------

    // Track event
    app.post(`${basePath}/events`, async (c) => {
      try {
        const body = await c.req.json<CreateEventBody>()

        if (!body.type || !body.source || !body.data) {
          return c.json({ success: false, error: 'Fields "type", "source", and "data" are required' } satisfies ApiResponse, 400)
        }

        const event = await client.track({
          type: body.type,
          source: body.source,
          data: body.data,
          correlationId: body.correlationId,
          causationId: body.causationId,
        })

        return c.json({ success: true, data: event } satisfies ApiResponse, 201)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Query events
    app.get(`${basePath}/events`, async (c) => {
      try {
        const query = c.req.query() as EventQuery

        const events = await client.queryEvents({
          type: query.type,
          source: query.source,
          correlationId: query.correlationId,
          after: query.after ? new Date(query.after) : undefined,
          before: query.before ? new Date(query.before) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          offset: query.offset ? parseInt(query.offset, 10) : undefined,
        })

        return c.json({ success: true, data: events } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Get event by ID
    app.get(`${basePath}/events/:id`, async (c) => {
      try {
        const id = c.req.param('id')
        const event = await client.getEvent(id)

        if (!event) {
          return c.json({ success: false, error: 'Event not found' } satisfies ApiResponse, 404)
        }

        return c.json({ success: true, data: event } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // -------------------------------------------------------------------------
    // Action Operations
    // -------------------------------------------------------------------------

    // Send action (pending)
    app.post(`${basePath}/actions/send`, async (c) => {
      try {
        const body = await c.req.json<CreateActionBody>()

        if (!body.actor || !body.object || !body.action) {
          return c.json({ success: false, error: 'Fields "actor", "object", and "action" are required' } satisfies ApiResponse, 400)
        }

        const action = await client.send({
          actor: body.actor,
          object: body.object,
          action: body.action,
          metadata: body.metadata,
        })

        return c.json({ success: true, data: action } satisfies ApiResponse, 201)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Do action (active)
    app.post(`${basePath}/actions/do`, async (c) => {
      try {
        const body = await c.req.json<CreateActionBody>()

        if (!body.actor || !body.object || !body.action) {
          return c.json({ success: false, error: 'Fields "actor", "object", and "action" are required' } satisfies ApiResponse, 400)
        }

        const action = await client.do({
          actor: body.actor,
          object: body.object,
          action: body.action,
          metadata: body.metadata,
        })

        return c.json({ success: true, data: action } satisfies ApiResponse, 201)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Query actions
    app.get(`${basePath}/actions`, async (c) => {
      try {
        const query = c.req.query() as ActionQuery

        const actions = await client.queryActions({
          actor: query.actor,
          object: query.object,
          action: query.action,
          status: query.status?.split(',') as any,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          offset: query.offset ? parseInt(query.offset, 10) : undefined,
        })

        return c.json({ success: true, data: actions } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Get action by ID
    app.get(`${basePath}/actions/:id`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.getAction(id)

        if (!action) {
          return c.json({ success: false, error: 'Action not found' } satisfies ApiResponse, 404)
        }

        return c.json({ success: true, data: action } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Start action
    app.post(`${basePath}/actions/:id/start`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.startAction(id)

        return c.json({ success: true, data: action } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Complete action
    app.post(`${basePath}/actions/:id/complete`, async (c) => {
      try {
        const id = c.req.param('id')
        const body = await c.req.json<CompleteActionBody>().catch(() => ({} as CompleteActionBody))

        const action = await client.completeAction(id, body.result)

        return c.json({ success: true, data: action } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Fail action
    app.post(`${basePath}/actions/:id/fail`, async (c) => {
      try {
        const id = c.req.param('id')
        const body = await c.req.json<FailActionBody>()

        if (!body.error) {
          return c.json({ success: false, error: 'Field "error" is required' } satisfies ApiResponse, 400)
        }

        const action = await client.failAction(id, body.error)

        return c.json({ success: true, data: action } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Cancel action
    app.post(`${basePath}/actions/:id/cancel`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.cancelAction(id)

        return c.json({ success: true, data: action } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // -------------------------------------------------------------------------
    // Artifact Operations
    // -------------------------------------------------------------------------

    // Store artifact
    app.post(`${basePath}/artifacts`, async (c) => {
      try {
        const body = await c.req.json<StoreArtifactBody>()

        if (!body.key || !body.type || !body.source || !body.sourceHash || body.content === undefined) {
          return c.json({
            success: false,
            error: 'Fields "key", "type", "source", "sourceHash", and "content" are required'
          } satisfies ApiResponse, 400)
        }

        const artifact = await client.storeArtifact({
          key: body.key,
          type: body.type as any,
          source: body.source,
          sourceHash: body.sourceHash,
          content: body.content,
          ttl: body.ttl,
          metadata: body.metadata,
        })

        return c.json({ success: true, data: artifact } satisfies ApiResponse, 201)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Get artifact by key
    app.get(`${basePath}/artifacts/:key`, async (c) => {
      try {
        const key = c.req.param('key')
        const artifact = await client.getArtifact(key)

        if (!artifact) {
          return c.json({ success: false, error: 'Artifact not found' } satisfies ApiResponse, 404)
        }

        return c.json({ success: true, data: artifact } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Get artifact by source
    app.get(`${basePath}/artifacts/source/:source/:type`, async (c) => {
      try {
        const source = decodeURIComponent(c.req.param('source'))
        const type = c.req.param('type')
        const artifact = await client.getArtifactBySource(source, type as any)

        if (!artifact) {
          return c.json({ success: false, error: 'Artifact not found' } satisfies ApiResponse, 404)
        }

        return c.json({ success: true, data: artifact } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Delete artifact
    app.delete(`${basePath}/artifacts/:key`, async (c) => {
      try {
        const key = c.req.param('key')
        const deleted = await client.deleteArtifact(key)

        return c.json({ success: true, data: { deleted } } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })

    // Clean expired artifacts
    app.post(`${basePath}/artifacts/clean`, async (c) => {
      try {
        const count = await client.cleanExpiredArtifacts()

        return c.json({ success: true, data: { cleaned: count } } satisfies ApiResponse)
      } catch (error) {
        return c.json({ success: false, error: String(error) } satisfies ApiResponse, 500)
      }
    })
  }

  // ==========================================================================
  // JSON-RPC Endpoint
  // ==========================================================================

  interface JsonRpcRequest {
    jsonrpc: '2.0'
    id: string | number | null
    method: string
    params?: unknown
  }

  interface JsonRpcResponse<T = unknown> {
    jsonrpc: '2.0'
    id: string | number | null
    result?: T
    error?: {
      code: number
      message: string
      data?: unknown
    }
  }

  app.post(`${basePath}/rpc`, async (c) => {
    const request = await c.req.json<JsonRpcRequest>()
    const { id, method, params } = request

    const respond = (result: unknown): Response => {
      return c.json({ jsonrpc: '2.0', id, result } satisfies JsonRpcResponse)
    }

    const respondError = (code: number, message: string): Response => {
      return c.json({ jsonrpc: '2.0', id, error: { code, message } } satisfies JsonRpcResponse)
    }

    try {
      // Parse method name (e.g., "db.list" -> "list")
      const methodName = method.startsWith('db.') ? method.slice(3) : method
      const p = (params || {}) as Record<string, unknown>

      // Route to appropriate DBClient method
      switch (methodName) {
        // Thing operations
        case 'list':
          return respond(await client.list(p))
        case 'find':
          return respond(await client.find(p))
        case 'search':
          return respond(await client.search(p as any))
        case 'get':
          return respond(await client.get(p.url as string))
        case 'getById':
          return respond(await client.getById(p.ns as string, p.type as string, p.id as string))
        case 'set':
          return respond(await client.set(p.url as string, p.data as any))
        case 'create':
          return respond(await client.create(p as any))
        case 'update':
          return respond(await client.update(p.url as string, p as any))
        case 'upsert':
          return respond(await client.upsert(p as any))
        case 'delete':
          return respond(await client.delete(p.url as string))

        // Relationship operations
        case 'relate':
          return respond(await client.relate(p as any))
        case 'unrelate':
          return respond(await client.unrelate(p.from as string, p.type as string, p.to as string))
        case 'related':
          return respond(await client.related(p.url as string, p.type as string | undefined, p.direction as any))
        case 'relationships':
          return respond(await client.relationships(p.url as string, p.type as string | undefined, p.direction as any))
        case 'references':
          return respond(await client.references(p.url as string, p.type as string | undefined))

        // Extended operations (Events, Actions, Artifacts)
        default:
          if (!isExtended(client)) {
            return respondError(-32601, `Method not found: ${methodName}`)
          }

          switch (methodName) {
            // Event operations
            case 'track':
              return respond(await client.track(p as any))
            case 'getEvent':
              return respond(await client.getEvent(p.id as string))
            case 'queryEvents':
              return respond(await client.queryEvents(p as any))

            // Action operations
            case 'send':
              return respond(await client.send(p as any))
            case 'do':
              return respond(await client.do(p as any))
            case 'getAction':
              return respond(await client.getAction(p.id as string))
            case 'queryActions':
              return respond(await client.queryActions(p as any))
            case 'startAction':
              return respond(await client.startAction(p.id as string))
            case 'completeAction':
              return respond(await client.completeAction(p.id as string, p.result))
            case 'failAction':
              return respond(await client.failAction(p.id as string, p.error as string))
            case 'cancelAction':
              return respond(await client.cancelAction(p.id as string))

            // Artifact operations
            case 'storeArtifact':
              return respond(await client.storeArtifact(p as any))
            case 'getArtifact':
              return respond(await client.getArtifact(p.key as string))
            case 'getArtifactBySource':
              return respond(await client.getArtifactBySource(p.source as string, p.type as any))
            case 'deleteArtifact':
              return respond(await client.deleteArtifact(p.key as string))
            case 'cleanExpiredArtifacts':
              return respond(await client.cleanExpiredArtifacts())

            default:
              return respondError(-32601, `Method not found: ${methodName}`)
          }
      }
    } catch (error) {
      return respondError(-32000, String(error))
    }
  })

  return app
}

/**
 * Type for the Hono app returned by createDBServer
 */
export type DBServer = ReturnType<typeof createDBServer>

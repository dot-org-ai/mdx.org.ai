/**
 * @mdxdb/server DBClient Implementation
 *
 * Hono-based REST API server exposing ai-database DBClient interface
 * Uses JSON:API standard format (https://jsonapi.org/)
 *
 * @packageDocumentation
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createRpcHandler, bearerAuth, noAuth } from 'rpc.do/server'
import type { DBClient, DBClientExtended } from 'ai-database'
import type {
  DBServerConfig,
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
import {
  serializeThings,
  serializeRelationships,
  serializeEvents,
  serializeActions,
  serializeArtifacts,
  serializeError,
  JSONAPI_CONTENT_TYPE,
} from './serializers.js'

/**
 * Check if client is extended (has events, actions, artifacts)
 */
function isExtended(client: DBClient | DBClientExtended): client is DBClientExtended {
  return 'track' in client && 'send' in client && 'storeArtifact' in client
}

/**
 * Create a Hono app that exposes a DBClient as a REST API using JSON:API format
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
 * ## API Format
 *
 * All REST endpoints use JSON:API format (https://jsonapi.org/):
 * - Content-Type: application/vnd.api+json
 * - Response: `{ data, meta, links }` or `{ errors }`
 *
 * ## API Endpoints
 *
 * ### Things
 * - `GET /api/db/things` - List things
 * - `GET /api/db/things/find` - Find things with where clause
 * - `GET /api/db/things/search` - Search things
 * - `GET /api/db/things/:url` - Get thing by URL (URL-encoded)
 * - `POST /api/db/things` - Create thing
 * - `PATCH /api/db/things/:url` - Update thing
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
 *
 * ### RPC
 * - `POST /api/db/rpc` - JSON-RPC endpoint via rpc.do
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
        const error = await serializeError('Unauthorized', 401)
        return c.json(error, 401, { 'Content-Type': JSONAPI_CONTENT_TYPE })
      }

      return next()
    })
  }

  // Helper to return JSON:API response
  const jsonApi = (c: any, data: unknown, status = 200) => {
    return c.json(data, status, { 'Content-Type': JSONAPI_CONTENT_TYPE })
  }

  // Helper to return JSON:API error
  const jsonApiError = async (c: any, error: Error | string, status = 500) => {
    const serialized = await serializeError(error, status)
    return c.json(serialized, status, { 'Content-Type': JSONAPI_CONTENT_TYPE })
  }

  // Helper to parse JSON:API query parameters
  // Converts filter[ns]=value to { ns: value }, page[limit]=10 to { limit: 10 }, etc.
  const parseJsonApiQuery = (query: Record<string, string>) => {
    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(query)) {
      // Handle filter[...], page[...], etc.
      const bracketMatch = key.match(/^(filter|page)\[(.+)\]$/)
      if (bracketMatch && bracketMatch[2]) {
        result[bracketMatch[2]] = value
      } else {
        result[key] = value
      }
    }
    return result
  }

  // ===========================================================================
  // Thing Operations
  // ===========================================================================

  // List things
  app.get(`${basePath}/things`, async (c) => {
    try {
      const query = parseJsonApiQuery(c.req.query()) as ThingQuery
      // Parse JSON:API sort format: -field means desc, field means asc
      const rawSort = c.req.query('sort')
      let orderBy: string | undefined
      let order: 'asc' | 'desc' | undefined
      if (rawSort) {
        if (rawSort.startsWith('-')) {
          orderBy = rawSort.slice(1)
          order = 'desc'
        } else {
          orderBy = rawSort
          order = 'asc'
        }
      }
      const things = await client.list({
        ns: query.ns,
        type: query.type,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
        offset: query.offset ? parseInt(query.offset, 10) : undefined,
        orderBy: orderBy || query.orderBy,
        order: order || query.order,
      })

      return jsonApi(c, await serializeThings(things))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Find things with where clause
  app.get(`${basePath}/things/find`, async (c) => {
    try {
      const query = parseJsonApiQuery(c.req.query()) as ThingFindQuery
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

      return jsonApi(c, await serializeThings(things))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Search things
  app.get(`${basePath}/things/search`, async (c) => {
    try {
      const query = c.req.query() as Partial<ThingSearchQuery> & Record<string, string>

      if (!query.query) {
        return jsonApiError(c, 'Query parameter "query" is required', 400)
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

      return jsonApi(c, await serializeThings(things))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // NOTE: These relationship routes MUST be defined before the generic things/:url{.+} route
  // Get related things
  app.get(`${basePath}/things/:url{.+}/related`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type, direction } = c.req.query()

      const things = await client.related(url, type, direction as 'from' | 'to' | 'both' | undefined)

      return jsonApi(c, await serializeThings(things))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Get relationships
  app.get(`${basePath}/things/:url{.+}/relationships`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type, direction } = c.req.query()

      const rels = await client.relationships(url, type, direction as 'from' | 'to' | 'both' | undefined)

      return jsonApi(c, await serializeRelationships(rels))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Get references (inbound)
  app.get(`${basePath}/things/:url{.+}/references`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const { type } = c.req.query()

      const things = await client.references(url, type)

      return jsonApi(c, await serializeThings(things))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Get thing by URL (generic catch-all - must come AFTER more specific routes)
  app.get(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const thing = await client.get(url)

      if (!thing) {
        return jsonApiError(c, 'Thing not found', 404)
      }

      return jsonApi(c, await serializeThings(thing))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Create thing
  app.post(`${basePath}/things`, async (c) => {
    try {
      const body = await c.req.json<CreateThingBody>()

      if (!body.ns || !body.type || !body.data) {
        return jsonApiError(c, 'Fields "ns", "type", and "data" are required', 400)
      }

      const thing = await client.create({
        ns: body.ns,
        type: body.type,
        id: body.id,
        url: body.url,
        data: body.data as TData,
        '@context': body['@context'],
      })

      return jsonApi(c, await serializeThings(thing), 201)
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Update thing (PATCH for JSON:API compliance)
  app.patch(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const body = await c.req.json<UpdateThingBody>()

      if (!body.data) {
        return jsonApiError(c, 'Field "data" is required', 400)
      }

      const thing = await client.update(url, { data: body.data as Partial<TData> })

      return jsonApi(c, await serializeThings(thing))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Also support PUT for backwards compatibility
  app.put(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const body = await c.req.json<UpdateThingBody>()

      if (!body.data) {
        return jsonApiError(c, 'Field "data" is required', 400)
      }

      const thing = await client.update(url, { data: body.data as Partial<TData> })

      return jsonApi(c, await serializeThings(thing))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Upsert thing
  app.post(`${basePath}/things/upsert`, async (c) => {
    try {
      const body = await c.req.json<CreateThingBody>()

      if (!body.ns || !body.type || !body.data) {
        return jsonApiError(c, 'Fields "ns", "type", and "data" are required', 400)
      }

      const thing = await client.upsert({
        ns: body.ns,
        type: body.type,
        id: body.id,
        url: body.url,
        data: body.data as TData,
        '@context': body['@context'],
      })

      return jsonApi(c, await serializeThings(thing))
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Delete thing (returns 204 No Content per JSON:API spec, 404 if not found)
  app.delete(`${basePath}/things/:url{.+}`, async (c) => {
    try {
      const url = decodeURIComponent(c.req.param('url'))
      const deleted = await client.delete(url)

      if (!deleted) {
        return jsonApiError(c, 'Thing not found', 404)
      }

      return c.body(null, 204)
    } catch (error) {
      return jsonApiError(c, error as Error)
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
        return jsonApiError(c, 'Fields "type", "from", and "to" are required', 400)
      }

      const rel = await client.relate({
        type: body.type,
        from: body.from,
        to: body.to,
        data: body.data,
      })

      return jsonApi(c, await serializeRelationships(rel), 201)
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // Remove relationship (returns 204 No Content)
  app.delete(`${basePath}/relationships`, async (c) => {
    try {
      const { from, type, to } = c.req.query()

      if (!from || !type || !to) {
        return jsonApiError(c, 'Query parameters "from", "type", and "to" are required', 400)
      }

      await client.unrelate(from, type, to)

      return c.body(null, 204)
    } catch (error) {
      return jsonApiError(c, error as Error)
    }
  })

  // NOTE: Relationship GET routes (related, relationships, references) are defined
  // before the generic things/:url{.+} route to ensure correct route matching

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
          return jsonApiError(c, 'Fields "type", "source", and "data" are required', 400)
        }

        const event = await client.track({
          type: body.type,
          source: body.source,
          data: body.data,
          correlationId: body.correlationId,
          causationId: body.causationId,
        })

        return jsonApi(c, await serializeEvents(event), 201)
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Query events
    app.get(`${basePath}/events`, async (c) => {
      try {
        const query = parseJsonApiQuery(c.req.query()) as EventQuery

        const events = await client.queryEvents({
          type: query.type,
          source: query.source,
          correlationId: query.correlationId,
          after: query.after ? new Date(query.after) : undefined,
          before: query.before ? new Date(query.before) : undefined,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          offset: query.offset ? parseInt(query.offset, 10) : undefined,
        })

        return jsonApi(c, await serializeEvents(events))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Get event by ID
    app.get(`${basePath}/events/:id`, async (c) => {
      try {
        const id = c.req.param('id')
        const event = await client.getEvent(id)

        if (!event) {
          return jsonApiError(c, 'Event not found', 404)
        }

        return jsonApi(c, await serializeEvents(event))
      } catch (error) {
        return jsonApiError(c, error as Error)
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
          return jsonApiError(c, 'Fields "actor", "object", and "action" are required', 400)
        }

        const action = await client.send({
          actor: body.actor,
          object: body.object,
          action: body.action,
          metadata: body.metadata,
        })

        return jsonApi(c, await serializeActions(action), 201)
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Do action (active)
    app.post(`${basePath}/actions/do`, async (c) => {
      try {
        const body = await c.req.json<CreateActionBody>()

        if (!body.actor || !body.object || !body.action) {
          return jsonApiError(c, 'Fields "actor", "object", and "action" are required', 400)
        }

        const action = await client.do({
          actor: body.actor,
          object: body.object,
          action: body.action,
          metadata: body.metadata,
        })

        return jsonApi(c, await serializeActions(action), 201)
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Query actions
    app.get(`${basePath}/actions`, async (c) => {
      try {
        const query = parseJsonApiQuery(c.req.query()) as ActionQuery

        const actions = await client.queryActions({
          actor: query.actor,
          object: query.object,
          action: query.action,
          status: query.status?.split(',') as any,
          limit: query.limit ? parseInt(query.limit, 10) : undefined,
          offset: query.offset ? parseInt(query.offset, 10) : undefined,
        })

        return jsonApi(c, await serializeActions(actions))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Get action by ID
    app.get(`${basePath}/actions/:id`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.getAction(id)

        if (!action) {
          return jsonApiError(c, 'Action not found', 404)
        }

        return jsonApi(c, await serializeActions(action))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Start action
    app.post(`${basePath}/actions/:id/start`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.startAction(id)

        return jsonApi(c, await serializeActions(action))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Complete action
    app.post(`${basePath}/actions/:id/complete`, async (c) => {
      try {
        const id = c.req.param('id')
        const body = await c.req.json<CompleteActionBody>().catch(() => ({} as CompleteActionBody))

        const action = await client.completeAction(id, body.result)

        return jsonApi(c, await serializeActions(action))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Fail action
    app.post(`${basePath}/actions/:id/fail`, async (c) => {
      try {
        const id = c.req.param('id')
        const body = await c.req.json<FailActionBody>()

        if (!body.error) {
          return jsonApiError(c, 'Field "error" is required', 400)
        }

        const action = await client.failAction(id, body.error)

        return jsonApi(c, await serializeActions(action))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Cancel action
    app.post(`${basePath}/actions/:id/cancel`, async (c) => {
      try {
        const id = c.req.param('id')
        const action = await client.cancelAction(id)

        return jsonApi(c, await serializeActions(action))
      } catch (error) {
        return jsonApiError(c, error as Error)
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
          return jsonApiError(c, 'Fields "key", "type", "source", "sourceHash", and "content" are required', 400)
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

        return jsonApi(c, await serializeArtifacts(artifact), 201)
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Get artifact by key
    app.get(`${basePath}/artifacts/:key`, async (c) => {
      try {
        const key = c.req.param('key')
        const artifact = await client.getArtifact(key)

        if (!artifact) {
          return jsonApiError(c, 'Artifact not found', 404)
        }

        return jsonApi(c, await serializeArtifacts(artifact))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Get artifact by source
    app.get(`${basePath}/artifacts/source/:source/:type`, async (c) => {
      try {
        const source = decodeURIComponent(c.req.param('source'))
        const type = c.req.param('type')
        const artifact = await client.getArtifactBySource(source, type as any)

        if (!artifact) {
          return jsonApiError(c, 'Artifact not found', 404)
        }

        return jsonApi(c, await serializeArtifacts(artifact))
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Delete artifact (returns 204 No Content)
    app.delete(`${basePath}/artifacts/:key`, async (c) => {
      try {
        const key = c.req.param('key')
        await client.deleteArtifact(key)

        return c.body(null, 204)
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })

    // Clean expired artifacts
    app.post(`${basePath}/artifacts/clean`, async (c) => {
      try {
        const count = await client.cleanExpiredArtifacts()

        return jsonApi(c, { data: null, meta: { cleaned: count } })
      } catch (error) {
        return jsonApiError(c, error as Error)
      }
    })
  }

  // ==========================================================================
  // RPC Endpoint (using rpc.do)
  // ==========================================================================

  const rpcHandler = createRpcHandler({
    dispatch: async (method, args) => {
      // Method format: "db.methodName"
      const methodName = method.startsWith('db.') ? method.slice(3) : method
      // rpc.do passes args as an array, first element is the params object
      const p = (args[0] || {}) as Record<string, unknown>

      // Route to appropriate DBClient method
      switch (methodName) {
        // Thing operations
        case 'list':
          return client.list(p)
        case 'find':
          return client.find(p)
        case 'search':
          return client.search(p as any)
        case 'get':
          return client.get(args[0] as string)
        case 'getById':
          return client.getById(args[0] as string, args[1] as string, args[2] as string)
        case 'set':
          return client.set(args[0] as string, args[1] as any)
        case 'create':
          return client.create(p as any)
        case 'update':
          return client.update(args[0] as string, args[1] as any)
        case 'upsert':
          return client.upsert(p as any)
        case 'delete':
          return client.delete(args[0] as string)

        // Relationship operations
        case 'relate':
          return client.relate(p as any)
        case 'unrelate':
          return client.unrelate(args[0] as string, args[1] as string, args[2] as string)
        case 'related':
          return client.related(args[0] as string, args[1] as string | undefined, args[2] as any)
        case 'relationships':
          return client.relationships(args[0] as string, args[1] as string | undefined, args[2] as any)
        case 'references':
          return client.references(args[0] as string, args[1] as string | undefined)

        // Extended operations (Events, Actions, Artifacts)
        default:
          if (!isExtended(client)) {
            throw new Error(`Method not found: ${methodName}`)
          }

          switch (methodName) {
            // Event operations
            case 'track':
              return client.track(p as any)
            case 'getEvent':
              return client.getEvent(args[0] as string)
            case 'queryEvents':
              return client.queryEvents(p as any)

            // Action operations
            case 'send':
              return client.send(p as any)
            case 'do':
              return client.do(p as any)
            case 'getAction':
              return client.getAction(args[0] as string)
            case 'queryActions':
              return client.queryActions(p as any)
            case 'startAction':
              return client.startAction(args[0] as string)
            case 'completeAction':
              return client.completeAction(args[0] as string, args[1])
            case 'failAction':
              return client.failAction(args[0] as string, args[1] as string)
            case 'cancelAction':
              return client.cancelAction(args[0] as string)

            // Artifact operations
            case 'storeArtifact':
              return client.storeArtifact(p as any)
            case 'getArtifact':
              return client.getArtifact(args[0] as string)
            case 'getArtifactBySource':
              return client.getArtifactBySource(args[0] as string, args[1] as any)
            case 'deleteArtifact':
              return client.deleteArtifact(args[0] as string)
            case 'cleanExpiredArtifacts':
              return client.cleanExpiredArtifacts()

            default:
              throw new Error(`Method not found: ${methodName}`)
          }
      }
    },
    auth: apiKey ? bearerAuth(async (token) => {
      if (token === apiKey) {
        return { token }
      }
      return null
    }) : noAuth(),
  })

  // Mount the RPC handler
  app.post(`${basePath}/rpc`, async (c) => {
    return rpcHandler(c.req.raw)
  })

  return app
}

/**
 * Type for the Hono app returned by createDBServer
 */
export type DBServer = ReturnType<typeof createDBServer>

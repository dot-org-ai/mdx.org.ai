/**
 * Payload Worker for Cloudflare Workers
 *
 * Runs Payload CMS on Cloudflare Workers using mdxdb for storage.
 *
 * @example wrangler.toml
 * ```toml
 * name = "my-payload-app"
 * main = "src/worker.ts"
 *
 * [[durable_objects.bindings]]
 * name = "MDXDB"
 * class_name = "MDXDatabase"
 *
 * [[migrations]]
 * tag = "v1"
 * new_classes = ["MDXDatabase"]
 *
 * [vars]
 * PAYLOAD_SECRET = "your-secret"
 * NAMESPACE = "example.com"
 * ```
 *
 * @example worker.ts
 * ```ts
 * import { createPayloadWorker } from '@mdxe/payload/worker'
 * import { MDXDatabase } from '@mdxdb/sqlite'
 *
 * // Export Durable Object
 * export { MDXDatabase }
 *
 * // Export worker
 * export default createPayloadWorker({
 *   namespace: 'example.com',
 *   database: 'sqlite',
 *   collections: [Posts, Authors],
 * })
 * ```
 *
 * @packageDocumentation
 */

import type { PayloadAppConfig, PayloadWorkerEnv, PayloadHandler, ExecutionContext } from './types.js'
import { createPayloadConfig, createMinimalConfig } from './config.js'

// =============================================================================
// Worker Creator
// =============================================================================

/**
 * Create a Payload Worker handler
 *
 * @param appConfig - Application configuration (can be partial, rest from env)
 * @returns Worker fetch handler
 */
export function createPayloadWorker(
  appConfig?: Partial<PayloadAppConfig>
): { fetch: PayloadHandler } {
  // Lazy initialization
  let payloadPromise: Promise<any> | null = null

  return {
    async fetch(
      request: Request,
      env: PayloadWorkerEnv,
      ctx: ExecutionContext
    ): Promise<Response> {
      // Initialize Payload lazily
      if (!payloadPromise) {
        payloadPromise = initializePayload(appConfig, env)
      }

      try {
        const payload = await payloadPromise

        // Handle the request through Payload
        const url = new URL(request.url)

        // Admin UI routes
        if (url.pathname.startsWith('/admin')) {
          return handleAdminRequest(request, payload, env)
        }

        // API routes
        if (url.pathname.startsWith('/api')) {
          return handleAPIRequest(request, payload, env)
        }

        // GraphQL endpoint
        if (url.pathname === '/graphql') {
          return handleGraphQLRequest(request, payload, env)
        }

        // Health check
        if (url.pathname === '/health') {
          return new Response(JSON.stringify({
            status: 'ok',
            namespace: env.NAMESPACE ?? appConfig?.namespace ?? 'default',
            database: env.MDXDB ? 'sqlite' : 'clickhouse',
          }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        // 404 for unknown routes
        return new Response('Not Found', { status: 404 })
      } catch (error) {
        console.error('Payload Worker Error:', error)
        return new Response(
          JSON.stringify({
            error: error instanceof Error ? error.message : 'Internal Server Error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      }
    },
  }
}

// =============================================================================
// Initialization
// =============================================================================

async function initializePayload(
  appConfig: Partial<PayloadAppConfig> | undefined,
  env: PayloadWorkerEnv
): Promise<any> {
  // Dynamic import of Payload to avoid bundling issues
  const { getPayload } = await import('payload')

  // Build configuration
  const config = appConfig
    ? createPayloadConfig(
        {
          namespace: appConfig.namespace ?? env.NAMESPACE ?? 'default',
          database: env.MDXDB ? 'sqlite' : 'clickhouse',
          ...appConfig,
        },
        env
      )
    : createMinimalConfig(env)

  // Initialize Payload
  // Type assertion needed as Payload types expect SanitizedConfig but getPayload accepts Config
  const payload = await getPayload({ config } as any)

  return payload
}

// =============================================================================
// Request Handlers
// =============================================================================

async function handleAdminRequest(
  request: Request,
  payload: any,
  env: PayloadWorkerEnv
): Promise<Response> {
  // TODO: Implement admin UI handling
  // For now, return a placeholder
  return new Response('Admin UI - Coming Soon', {
    headers: { 'Content-Type': 'text/html' },
  })
}

async function handleAPIRequest(
  request: Request,
  payload: any,
  env: PayloadWorkerEnv
): Promise<Response> {
  const url = new URL(request.url)
  const method = request.method

  // Parse the API path: /api/{collection}/{id?}
  const pathParts = url.pathname.replace('/api/', '').split('/').filter(Boolean)
  const collection = pathParts[0]
  const id = pathParts[1]

  if (!collection) {
    return new Response(JSON.stringify({ error: 'Collection required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    let result: any

    switch (method) {
      case 'GET':
        if (id) {
          // Find by ID
          result = await payload.findByID({
            collection,
            id,
          })
        } else {
          // Find all with query params
          const page = parseInt(url.searchParams.get('page') ?? '1')
          const limit = parseInt(url.searchParams.get('limit') ?? '10')
          const sort = url.searchParams.get('sort') ?? undefined
          const where = url.searchParams.get('where')
            ? JSON.parse(url.searchParams.get('where')!)
            : undefined

          result = await payload.find({
            collection,
            page,
            limit,
            sort,
            where,
          })
        }
        break

      case 'POST':
        // Create
        const createData = await request.json()
        result = await payload.create({
          collection,
          data: createData,
        })
        break

      case 'PATCH':
      case 'PUT':
        // Update
        if (!id) {
          return new Response(JSON.stringify({ error: 'ID required for update' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        const updateData = await request.json()
        result = await payload.update({
          collection,
          id,
          data: updateData,
        })
        break

      case 'DELETE':
        // Delete
        if (!id) {
          return new Response(JSON.stringify({ error: 'ID required for delete' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        result = await payload.delete({
          collection,
          id,
        })
        break

      default:
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('API Error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'API Error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

async function handleGraphQLRequest(
  request: Request,
  payload: any,
  env: PayloadWorkerEnv
): Promise<Response> {
  // TODO: Implement GraphQL handling
  return new Response(JSON.stringify({ error: 'GraphQL not implemented yet' }), {
    status: 501,
    headers: { 'Content-Type': 'application/json' },
  })
}

// =============================================================================
// Simple Worker Export
// =============================================================================

/**
 * Default minimal worker for quick setup
 * Uses environment variables for all configuration
 */
export default createPayloadWorker()

export { createPayloadConfig, createMinimalConfig }

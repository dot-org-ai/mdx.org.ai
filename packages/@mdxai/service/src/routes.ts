/**
 * Route handlers for @mdxai/service
 *
 * Organized route handlers for session management.
 * These can be used standalone or composed into the main Hono app.
 */

import { Hono } from 'hono'
import type { Env, SessionConfig } from './types'

/**
 * Create session routes
 */
export function createSessionRoutes() {
  const routes = new Hono<{ Bindings: Env }>()

  // Create session
  routes.post('/', async (c) => {
    const config = await c.req.json<SessionConfig>()
    const sessionId = config.sessionId || crypto.randomUUID()

    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    // Initialize session
    const initUrl = new URL(c.req.url)
    initUrl.pathname = '/state'
    await stub.fetch(new Request(initUrl))

    return c.json({
      sessionId,
      url: `/sessions/${sessionId}`,
      wsUrl: `/sessions/${sessionId}/ws`,
    })
  })

  // List sessions
  routes.get('/', async (c) => {
    // TODO: Implement session listing
    return c.json([])
  })

  // Get session state
  routes.get('/:id', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    const url = new URL(c.req.url)
    url.pathname = '/state'
    return stub.fetch(new Request(url))
  })

  // Get session MDX
  routes.get('/:id/mdx', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    const url = new URL(c.req.url)
    url.pathname = '/mdx'
    return stub.fetch(new Request(url))
  })

  // Get session markdown
  routes.get('/:id/markdown', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    const url = new URL(c.req.url)
    url.pathname = '/markdown'
    return stub.fetch(new Request(url))
  })

  // Post event to session
  routes.post('/:id/event', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    const url = new URL(c.req.url)
    url.pathname = '/event'
    return stub.fetch(new Request(url, {
      method: 'POST',
      body: c.req.raw.body,
      headers: c.req.raw.headers,
    }))
  })

  // WebSocket endpoint
  routes.get('/:id/ws', async (c) => {
    const sessionId = c.req.param('id')

    if (c.req.header('Upgrade') !== 'websocket') {
      return c.json({ error: 'Expected WebSocket upgrade' }, 400)
    }

    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId)

    return stub.fetch(c.req.raw)
  })

  return routes
}

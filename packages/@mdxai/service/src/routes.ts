/**
 * Route handlers for @mdxai/service
 *
 * Organized route handlers for session management.
 * These can be used standalone or composed into the main Hono app.
 *
 * Uses Workers RPC for direct method calls to SessionDO where possible.
 * WebSocket upgrades still use fetch() since they require HTTP upgrade handshake.
 */

import { Hono } from 'hono'
import type { Env, SessionConfig, StreamEvent } from './types'
import type { SessionStub } from './session-do'

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
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    // Initialize session via RPC
    await stub.getState()

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
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    return c.json(await stub.getState())
  })

  // Get session MDX
  routes.get('/:id/mdx', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    return new Response(await stub.getMDX(), {
      headers: { 'Content-Type': 'text/markdown' },
    })
  })

  // Get session markdown
  routes.get('/:id/markdown', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    return new Response(await stub.getMarkdown(), {
      headers: { 'Content-Type': 'text/markdown' },
    })
  })

  // Post event to session
  routes.post('/:id/event', async (c) => {
    const sessionId = c.req.param('id')
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    const event = await c.req.json<StreamEvent>()
    await stub.postEvent(event)

    return new Response('ok')
  })

  // WebSocket endpoint — must use fetch() for HTTP upgrade handshake
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

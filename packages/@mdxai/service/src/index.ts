/**
 * @mdxai/service - Agent Session Platform Worker
 *
 * Entry point for the Cloudflare Worker that orchestrates agent sessions.
 * Routes requests to the appropriate SessionDO and handles session creation.
 *
 * Uses Workers RPC for direct method calls to SessionDO where possible.
 * WebSocket upgrades still use fetch() since they require HTTP upgrade handshake.
 */

import { Hono } from 'hono'
import type { Env, SessionConfig, StreamEvent } from './types'
import { SessionDO } from './session-do'
import type { SessionStub } from './session-do'
import { validateToken } from './auth'

// Re-export for Wrangler
export { SessionDO }
export type { SessionStub }

// Create Hono app
const app = new Hono<{ Bindings: Env }>()

/**
 * Health check endpoint
 */
app.get('/', (c) => {
  return c.json({
    service: '@mdxai/service',
    version: '0.0.0',
    status: 'ok',
  })
})

/**
 * Create new session
 * POST /sessions
 */
app.post('/sessions', async (c) => {
  try {
    // Validate auth token
    const authHeader = c.req.header('Authorization')
    if (!authHeader) {
      return c.json({ error: 'Missing authorization header' }, 401)
    }

    // TODO: Implement proper token validation
    // const valid = await validateToken(authHeader, c.env)
    // if (!valid) {
    //   return c.json({ error: 'Invalid token' }, 401)
    // }

    // Parse request body
    const config = await c.req.json<SessionConfig>()

    // Generate session ID
    const sessionId = config.sessionId || crypto.randomUUID()

    // Get DO stub
    const doId = c.env.SESSIONS.idFromName(sessionId)
    const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

    // Initialize session state via RPC
    await stub.getState()

    return c.json({
      sessionId,
      url: `/sessions/${sessionId}`,
      wsUrl: `/sessions/${sessionId}/ws`,
    })
  } catch (error) {
    console.error('Error creating session:', error)
    return c.json({ error: 'Failed to create session' }, 500)
  }
})

/**
 * List sessions
 * GET /sessions
 * TODO: Implement session listing (requires DO listing API or separate storage)
 */
app.get('/sessions', async (c) => {
  // For now, return empty array
  // In production, we'd need to store session IDs in KV or use DO listing API
  return c.json([])
})

/**
 * Proxy requests to SessionDO
 * GET /sessions/:id/*
 * POST /sessions/:id/*
 *
 * Routes to RPC methods for known paths, falls back to fetch() for
 * WebSocket upgrades which require the HTTP upgrade handshake.
 */
app.all('/sessions/:id/*', async (c) => {
  const sessionId = c.req.param('id')
  const path = c.req.path.replace(`/sessions/${sessionId}`, '') || '/state'

  // Get DO stub
  const doId = c.env.SESSIONS.idFromName(sessionId)

  // WebSocket upgrades must use fetch() — they need the HTTP upgrade handshake
  if (c.req.header('Upgrade') === 'websocket') {
    const stub = c.env.SESSIONS.get(doId)
    return stub.fetch(c.req.raw)
  }

  // Use RPC for known paths
  const stub = c.env.SESSIONS.get(doId) as unknown as SessionStub

  switch (path) {
    case '/':
    case '/state':
      return c.json(await stub.getState())

    case '/mdx':
      return new Response(await stub.getMDX(), {
        headers: { 'Content-Type': 'text/markdown' },
      })

    case '/markdown':
      return new Response(await stub.getMarkdown(), {
        headers: { 'Content-Type': 'text/markdown' },
      })

    case '/event':
      if (c.req.method === 'POST') {
        const event = await c.req.json<StreamEvent>()
        await stub.postEvent(event)
        return new Response('ok')
      }
      break

    case '/run/native':
      if (c.req.method === 'POST') {
        const config = await c.req.json<SessionConfig>()
        return c.json(await stub.runNative(config))
      }
      break
  }

  return new Response('Not found', { status: 404 })
})

/**
 * WebSocket endpoint (alternative path)
 * GET /sessions/:id/ws
 *
 * WebSocket upgrades require fetch() — RPC cannot handle the HTTP upgrade handshake.
 */
app.get('/sessions/:id/ws', async (c) => {
  const sessionId = c.req.param('id')

  // Check for WebSocket upgrade
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 400)
  }

  // Get DO stub — must use fetch() for WebSocket upgrade
  const doId = c.env.SESSIONS.idFromName(sessionId)
  const stub = c.env.SESSIONS.get(doId)

  return stub.fetch(c.req.raw)
})

/**
 * Export Worker handler
 */
export default app

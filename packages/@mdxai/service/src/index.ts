/**
 * @mdxai/service - Agent Session Platform Worker
 *
 * Entry point for the Cloudflare Worker that orchestrates agent sessions.
 * Routes requests to the appropriate SessionDO and handles session creation.
 */

import { Hono } from 'hono'
import type { Env, SessionConfig } from './types'
import { SessionDO } from './session-do'
import { validateToken } from './auth'

// Re-export for Wrangler
export { SessionDO }

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
    const stub = c.env.SESSIONS.get(doId)

    // Initialize session state
    const initUrl = new URL(c.req.url)
    initUrl.pathname = '/state'
    await stub.fetch(new Request(initUrl))

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
 * WebSocket /sessions/:id/ws
 */
app.all('/sessions/:id/*', async (c) => {
  const sessionId = c.req.param('id')
  const path = c.req.path.replace(`/sessions/${sessionId}`, '')

  // Get DO stub
  const doId = c.env.SESSIONS.idFromName(sessionId)
  const stub = c.env.SESSIONS.get(doId)

  // Create new URL with path
  const url = new URL(c.req.url)
  url.pathname = path || '/state'

  // Forward request to DO
  return stub.fetch(new Request(url, c.req.raw))
})

/**
 * WebSocket endpoint (alternative path)
 * GET /sessions/:id/ws
 */
app.get('/sessions/:id/ws', async (c) => {
  const sessionId = c.req.param('id')

  // Check for WebSocket upgrade
  if (c.req.header('Upgrade') !== 'websocket') {
    return c.json({ error: 'Expected WebSocket upgrade' }, 400)
  }

  // Get DO stub
  const doId = c.env.SESSIONS.idFromName(sessionId)
  const stub = c.env.SESSIONS.get(doId)

  // Forward to DO
  return stub.fetch(c.req.raw)
})

/**
 * Export Worker handler
 */
export default app

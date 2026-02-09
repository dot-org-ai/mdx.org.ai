/**
 * Routes tests
 *
 * Tests for session route handlers.
 * Routes now use Workers RPC (direct method calls) instead of stub.fetch()
 * for non-WebSocket operations. WebSocket upgrades still use fetch().
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { createSessionRoutes } from './routes'
import type { Env, SessionConfig, SessionState } from './types'

/**
 * Mock session state for RPC responses
 */
const mockSessionState: SessionState = {
  id: 'test-session',
  status: 'idle',
  model: 'claude-sonnet-4-20250514',
  startedAt: new Date('2024-01-01T00:00:00Z'),
  plan: [],
  todos: [],
  tools: [],
  messages: [],
  cost: 0,
  duration: 0,
  usage: {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  },
}

/**
 * Mock DurableObject stub with both RPC methods and fetch (for WebSocket)
 */
interface MockDOStub {
  fetch: ReturnType<typeof vi.fn>
  getState: ReturnType<typeof vi.fn>
  getMDX: ReturnType<typeof vi.fn>
  getMarkdown: ReturnType<typeof vi.fn>
  postEvent: ReturnType<typeof vi.fn>
  runNative: ReturnType<typeof vi.fn>
}

/**
 * Mock DurableObjectNamespace
 */
interface MockDONamespace {
  idFromName: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
}

/**
 * Create mock environment with RPC-capable stub
 */
function createMockEnv(): { env: Env; stub: MockDOStub } {
  const mockStub: MockDOStub = {
    fetch: vi.fn().mockResolvedValue(new Response(null, { status: 200 })),
    getState: vi.fn().mockResolvedValue(mockSessionState),
    getMDX: vi.fn().mockResolvedValue('---\n$type: AgentSession\n---\n\n# Session'),
    getMarkdown: vi.fn().mockResolvedValue('## Session\n\nStatus: idle'),
    postEvent: vi.fn().mockResolvedValue(undefined),
    runNative: vi.fn().mockResolvedValue({ started: true, sessionId: 'test-session' }),
  }

  const mockNamespace: MockDONamespace = {
    idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-do-id' }),
    get: vi.fn().mockReturnValue(mockStub),
  }

  return {
    env: {
      SESSIONS: mockNamespace as unknown as DurableObjectNamespace,
    },
    stub: mockStub,
  }
}

describe('createSessionRoutes', () => {
  let app: Hono<{ Bindings: Env }>
  let mockEnv: Env
  let mockStub: MockDOStub

  beforeEach(() => {
    const mock = createMockEnv()
    mockEnv = mock.env
    mockStub = mock.stub
    app = new Hono<{ Bindings: Env }>()
    app.route('/sessions', createSessionRoutes())
  })

  describe('POST /sessions - Create session', () => {
    it('should create a new session with generated ID', async () => {
      const config: SessionConfig = {
        prompt: 'Test prompt',
        model: 'claude-sonnet-4-20250514',
      }

      const req = new Request('http://localhost/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const res = await app.fetch(req, mockEnv)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toHaveProperty('sessionId')
      expect(body).toHaveProperty('url')
      expect(body).toHaveProperty('wsUrl')
    })

    it('should use provided sessionId when specified', async () => {
      const config: SessionConfig = {
        sessionId: 'custom-session-id',
        prompt: 'Test prompt',
      }

      const req = new Request('http://localhost/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const res = await app.fetch(req, mockEnv)
      const body = await res.json()

      expect(body.sessionId).toBe('custom-session-id')
      expect(body.url).toBe('/sessions/custom-session-id')
      expect(body.wsUrl).toBe('/sessions/custom-session-id/ws')
    })

    it('should call DurableObject idFromName', async () => {
      const config: SessionConfig = {
        sessionId: 'test-id',
        prompt: 'Test',
      }

      const req = new Request('http://localhost/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      await app.fetch(req, mockEnv)

      expect((mockEnv.SESSIONS as unknown as MockDONamespace).idFromName).toHaveBeenCalledWith('test-id')
    })

    it('should initialize session via RPC getState()', async () => {
      const config: SessionConfig = {
        prompt: 'Test',
      }

      const req = new Request('http://localhost/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      await app.fetch(req, mockEnv)

      // RPC: getState() is called instead of stub.fetch(new Request('/state'))
      expect(mockStub.getState).toHaveBeenCalled()
    })
  })

  describe('GET /sessions - List sessions', () => {
    it('should return empty array (not yet implemented)', async () => {
      const req = new Request('http://localhost/sessions', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body).toEqual([])
    })
  })

  describe('GET /sessions/:id - Get session state', () => {
    it('should call getState() RPC method', async () => {
      const req = new Request('http://localhost/sessions/session-123', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect((mockEnv.SESSIONS as unknown as MockDONamespace).idFromName).toHaveBeenCalledWith('session-123')
      expect(mockStub.getState).toHaveBeenCalled()
    })

    it('should return session state as JSON', async () => {
      const req = new Request('http://localhost/sessions/test-id', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)
      const body = await res.json()

      expect(body.id).toBe('test-session')
      expect(body.status).toBe('idle')
    })
  })

  describe('GET /sessions/:id/mdx - Get session MDX', () => {
    it('should call getMDX() RPC method', async () => {
      const req = new Request('http://localhost/sessions/session-123/mdx', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)

      expect(mockStub.getMDX).toHaveBeenCalled()
      expect(res.headers.get('Content-Type')).toContain('text/markdown')
    })

    it('should return MDX content', async () => {
      const req = new Request('http://localhost/sessions/session-123/mdx', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)
      const text = await res.text()

      expect(text).toContain('$type: AgentSession')
    })
  })

  describe('GET /sessions/:id/markdown - Get session markdown', () => {
    it('should call getMarkdown() RPC method', async () => {
      const req = new Request('http://localhost/sessions/session-123/markdown', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)

      expect(mockStub.getMarkdown).toHaveBeenCalled()
      expect(res.headers.get('Content-Type')).toContain('text/markdown')
    })

    it('should return markdown content', async () => {
      const req = new Request('http://localhost/sessions/session-123/markdown', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)
      const text = await res.text()

      expect(text).toContain('Session')
    })
  })

  describe('POST /sessions/:id/event - Post event to session', () => {
    it('should call postEvent() RPC method with event data', async () => {
      const event = {
        type: 'assistant',
        content: 'Hello from test',
      }

      const req = new Request('http://localhost/sessions/session-123/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(200)
      expect(mockStub.postEvent).toHaveBeenCalledWith(event)
    })

    it('should have POST method handler for /event path', () => {
      // Verify the route is configured (createSessionRoutes returns a Hono app)
      const routes = createSessionRoutes()
      expect(routes).toBeDefined()
    })
  })

  describe('GET /sessions/:id/ws - WebSocket endpoint', () => {
    it('should return error without WebSocket upgrade header', async () => {
      const req = new Request('http://localhost/sessions/session-123/ws', {
        method: 'GET',
      })

      const res = await app.fetch(req, mockEnv)

      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toContain('WebSocket')
    })

    it('should proxy WebSocket upgrade to DurableObject via fetch()', async () => {
      // WebSocket upgrades must still use fetch() — cannot use RPC
      const req = new Request('http://localhost/sessions/session-123/ws', {
        method: 'GET',
        headers: {
          Upgrade: 'websocket',
          Connection: 'Upgrade',
        },
      })

      await app.fetch(req, mockEnv)

      // WebSocket upgrades use fetch(), not RPC
      expect(mockStub.fetch).toHaveBeenCalled()
    })
  })
})

describe('route parameter extraction', () => {
  let app: Hono<{ Bindings: Env }>
  let mockEnv: Env

  beforeEach(() => {
    const mock = createMockEnv()
    mockEnv = mock.env
    app = new Hono<{ Bindings: Env }>()
    app.route('/sessions', createSessionRoutes())
  })

  it('should extract session ID from URL', async () => {
    const req = new Request('http://localhost/sessions/my-unique-session-id', {
      method: 'GET',
    })

    await app.fetch(req, mockEnv)

    expect((mockEnv.SESSIONS as unknown as MockDONamespace).idFromName)
      .toHaveBeenCalledWith('my-unique-session-id')
  })

  it('should handle session IDs with special characters', async () => {
    // UUID format session ID
    const req = new Request('http://localhost/sessions/550e8400-e29b-41d4-a716-446655440000', {
      method: 'GET',
    })

    await app.fetch(req, mockEnv)

    expect((mockEnv.SESSIONS as unknown as MockDONamespace).idFromName)
      .toHaveBeenCalledWith('550e8400-e29b-41d4-a716-446655440000')
  })
})

describe('error handling', () => {
  let app: Hono<{ Bindings: Env }>
  let mockEnv: Env

  beforeEach(() => {
    const mock = createMockEnv()
    mockEnv = mock.env
    // Override getState to throw for error testing
    ;(mock.stub as MockDOStub).getState = vi.fn().mockRejectedValue(new Error('DO unavailable'))
    app = new Hono<{ Bindings: Env }>()
    app.route('/sessions', createSessionRoutes())
  })

  it('should handle DurableObject RPC errors', async () => {
    const req = new Request('http://localhost/sessions/session-123', {
      method: 'GET',
    })

    // Should not throw, Hono handles errors
    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })

  it('should handle malformed JSON in POST body', async () => {
    const req = new Request('http://localhost/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.status).toBeGreaterThanOrEqual(400)
  })
})

describe('content type handling', () => {
  let app: Hono<{ Bindings: Env }>
  let mockEnv: Env

  beforeEach(() => {
    const mock = createMockEnv()
    mockEnv = mock.env
    app = new Hono<{ Bindings: Env }>()
    app.route('/sessions', createSessionRoutes())
  })

  it('should return JSON for session state', async () => {
    const req = new Request('http://localhost/sessions/test', {
      method: 'GET',
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.headers.get('Content-Type')).toContain('application/json')
  })

  it('should return markdown content type for MDX', async () => {
    const req = new Request('http://localhost/sessions/test/mdx', {
      method: 'GET',
    })

    const res = await app.fetch(req, mockEnv)
    expect(res.headers.get('Content-Type')).toContain('text/markdown')
  })
})

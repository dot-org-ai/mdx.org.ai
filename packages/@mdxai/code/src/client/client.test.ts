import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiClient } from './api.js'
import { SessionClient } from './websocket.js'
import type { SessionState } from '../types.js'
import { wsInstances } from '../test-setup.js'

describe('Client Module', () => {
  describe('ApiClient', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    describe('createSession', () => {
      it('should POST request to /sessions', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify({ sessionId: 'new-session', status: 'created', url: 'http://test' }), {
            status: 200,
          })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.createSession({ prompt: 'Test prompt' })

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'https://agents.do/sessions',
          expect.objectContaining({
            method: 'POST',
          })
        )
      })

      it('should include auth header in request', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify({ sessionId: 'new-session', status: 'created', url: 'http://test' }), {
            status: 200,
          })
        )

        const client = new ApiClient({ authToken: 'my-token' })
        await client.createSession({ prompt: 'Test' })

        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({
              Authorization: 'Bearer my-token',
            }),
          })
        )
      })

      it('should send config in body', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify({ sessionId: 'new-session', status: 'created', url: 'http://test' }), {
            status: 200,
          })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.createSession({ prompt: 'Build feature', model: 'opus' })

        expect(globalThis.fetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            body: expect.stringContaining('Build feature'),
          })
        )
      })

      it('should throw on non-ok response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('Error', { status: 400, statusText: 'Bad Request' })
        )

        const client = new ApiClient({ authToken: 'test-token' })

        await expect(client.createSession({ prompt: 'Test' })).rejects.toThrow(
          'Failed to create session'
        )
      })

      it('should return session response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(
            JSON.stringify({
              sessionId: 'session-123',
              status: 'created',
              url: 'https://agents.do/sessions/session-123',
            }),
            { status: 200 }
          )
        )

        const client = new ApiClient({ authToken: 'test-token' })
        const response = await client.createSession({ prompt: 'Test' })

        expect(response.sessionId).toBe('session-123')
        expect(response.status).toBe('created')
      })
    })

    describe('getSession', () => {
      it('should GET request to /sessions/:id/state', async () => {
        const mockState: SessionState = {
          id: 'session-123',
          status: 'running',
          model: 'sonnet',
          cwd: '/test',
          startedAt: new Date(),
          plan: [],
          todos: [],
          tools: [],
          messages: [],
          cost: 0,
          duration: 0,
          usage: { input_tokens: 0, output_tokens: 0 },
        }

        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify(mockState), { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.getSession('session-123')

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'https://agents.do/sessions/session-123/state',
          expect.any(Object)
        )
      })

      it('should throw on non-ok response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('Not Found', { status: 404, statusText: 'Not Found' })
        )

        const client = new ApiClient({ authToken: 'test-token' })

        await expect(client.getSession('unknown')).rejects.toThrow('Failed to get session')
      })
    })

    describe('listSessions', () => {
      it('should GET request to /sessions', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify([]), { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.listSessions()

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'https://agents.do/sessions',
          expect.any(Object)
        )
      })

      it('should return array of sessions', async () => {
        const mockSessions = [
          { id: 'session-1', status: 'completed' },
          { id: 'session-2', status: 'running' },
        ]

        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify(mockSessions), { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        const sessions = await client.listSessions()

        expect(sessions).toHaveLength(2)
      })

      it('should throw on non-ok response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('Error', { status: 500, statusText: 'Server Error' })
        )

        const client = new ApiClient({ authToken: 'test-token' })

        await expect(client.listSessions()).rejects.toThrow('Failed to list sessions')
      })
    })

    describe('custom baseUrl', () => {
      it('should use custom baseUrl when provided', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(JSON.stringify([]), { status: 200 })
        )

        const client = new ApiClient({
          authToken: 'test-token',
          baseUrl: 'http://localhost:3000',
        })
        await client.listSessions()

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'http://localhost:3000/sessions',
          expect.any(Object)
        )
      })
    })

    describe('getSessionMDX', () => {
      it('should GET request to /sessions/:id/mdx', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('---\n$type: Session\n---\n# Session', { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.getSessionMDX('session-123')

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'https://agents.do/sessions/session-123/mdx',
          expect.any(Object)
        )
      })

      it('should return MDX content as string', async () => {
        const mdxContent = '---\n$type: Session\n---\n# Session Content'
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(mdxContent, { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        const result = await client.getSessionMDX('session-123')

        expect(result).toBe(mdxContent)
      })

      it('should throw on non-ok response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('Not Found', { status: 404, statusText: 'Not Found' })
        )

        const client = new ApiClient({ authToken: 'test-token' })

        await expect(client.getSessionMDX('unknown')).rejects.toThrow('Failed to get session MDX')
      })
    })

    describe('getSessionMarkdown', () => {
      it('should GET request to /sessions/:id/markdown', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('# Session\n\nContent here', { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        await client.getSessionMarkdown('session-123')

        expect(globalThis.fetch).toHaveBeenCalledWith(
          'https://agents.do/sessions/session-123/markdown',
          expect.any(Object)
        )
      })

      it('should return markdown content as string', async () => {
        const markdownContent = '# Session\n\n## Summary\n\nContent here'
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response(markdownContent, { status: 200 })
        )

        const client = new ApiClient({ authToken: 'test-token' })
        const result = await client.getSessionMarkdown('session-123')

        expect(result).toBe(markdownContent)
      })

      it('should throw on non-ok response', async () => {
        vi.mocked(globalThis.fetch).mockResolvedValue(
          new Response('Error', { status: 500, statusText: 'Server Error' })
        )

        const client = new ApiClient({ authToken: 'test-token' })

        await expect(client.getSessionMarkdown('session-123')).rejects.toThrow(
          'Failed to get session markdown'
        )
      })
    })
  })

  describe('SessionClient', () => {
    describe('constructor', () => {
      it('should store session ID', () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        // Access internal state via getState (returns null initially)
        expect(client.getState()).toBeNull()
      })

      it('should use default baseUrl', () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        client.connect()

        // WebSocket should be created with correct URL
        expect(globalThis.WebSocket).toHaveBeenCalledWith(
          'wss://agents.do/sessions/test-session/ws'
        )
      })

      it('should use custom baseUrl', () => {
        const client = new SessionClient({
          sessionId: 'test-session',
          baseUrl: 'http://localhost:3000',
        })
        client.connect()

        expect(globalThis.WebSocket).toHaveBeenCalledWith(
          'ws://localhost:3000/sessions/test-session/ws'
        )
      })
    })

    describe('subscribe', () => {
      it('should invoke callback on state update', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        const callback = vi.fn()

        client.onState(callback)
        client.connect()

        // Wait for WebSocket connection
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Simulate state message using wsInstances
        const ws = wsInstances[0]
        ws?.simulateMessage({
          type: 'state',
          state: { id: 'test-session', status: 'running' },
        })

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'test-session', status: 'running' })
        )
      })

      it('should invoke callback with current state if available', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        client.connect()

        // Wait for WebSocket connection
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Simulate state message first
        const ws = wsInstances[0]
        ws?.simulateMessage({
          type: 'state',
          state: { id: 'test-session', status: 'running' },
        })

        // Now subscribe - should be called immediately with current state
        const callback = vi.fn()
        client.onState(callback)

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'test-session' })
        )
      })

      it('should return unsubscribe function', () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        const callback = vi.fn()

        const unsubscribe = client.onState(callback)

        expect(typeof unsubscribe).toBe('function')
      })

      it('should stop calling callback after unsubscribe', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        const callback = vi.fn()

        const unsubscribe = client.onState(callback)
        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        unsubscribe()

        const ws = wsInstances[0]
        ws?.simulateMessage({
          type: 'state',
          state: { id: 'test-session', status: 'running' },
        })

        // Should not have been called with the new state
        expect(callback).not.toHaveBeenCalledWith(
          expect.objectContaining({ status: 'running' })
        )
      })
    })

    describe('onEvent', () => {
      it('should invoke callback on event', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        const callback = vi.fn()

        client.onEvent(callback)
        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        const ws = wsInstances[0]
        ws?.simulateMessage({
          type: 'event',
          event: { type: 'tool_use', tool: 'Read' },
        })

        expect(callback).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'tool_use', tool: 'Read' })
        )
      })
    })

    describe('reconnection', () => {
      it('should handle WebSocket close event', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        const ws = wsInstances[0]

        // Should not throw on close
        expect(() => ws?.close()).not.toThrow()
      })
    })

    describe('close', () => {
      it('should close WebSocket connection', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        const ws = wsInstances[0]
        const closeSpy = vi.spyOn(ws!, 'close')

        client.close()

        expect(closeSpy).toHaveBeenCalled()
      })

      it('should clear listeners on close', async () => {
        const client = new SessionClient({ sessionId: 'test-session' })
        const callback = vi.fn()

        client.onState(callback)
        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        client.close()

        // After close, state should be null
        expect(client.getState()).toBeNull()
      })
    })

    describe('auth', () => {
      it('should send auth message on connect if token provided', async () => {
        const client = new SessionClient({
          sessionId: 'test-session',
          authToken: 'test-token',
        })

        client.connect()

        await new Promise((resolve) => setTimeout(resolve, 10))

        const ws = wsInstances[0]
        const sendSpy = vi.spyOn(ws!, 'send')

        // Trigger onopen manually since our mock doesn't fire it reliably
        ws?.onopen?.(new Event('open'))

        expect(sendSpy).toHaveBeenCalledWith(
          expect.stringContaining('auth')
        )
        expect(sendSpy).toHaveBeenCalledWith(
          expect.stringContaining('test-token')
        )
      })
    })
  })
})

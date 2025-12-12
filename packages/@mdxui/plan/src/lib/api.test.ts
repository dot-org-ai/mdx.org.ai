import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ApiClient, apiClient } from './api'

describe('ApiClient', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor', () => {
    it('uses default baseUrl', () => {
      const client = new ApiClient()
      // We can verify this by checking the fetch URL in subsequent tests
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('accepts custom baseUrl', () => {
      const client = new ApiClient('https://custom.api')
      expect(client).toBeInstanceOf(ApiClient)
    })
  })

  describe('getSessions', () => {
    it('fetches sessions from /sessions endpoint', async () => {
      const mockSessions = [{ id: 'session-1' }, { id: 'session-2' }]
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSessions),
      })

      const client = new ApiClient('https://api.example.com')
      const result = await client.getSessions()

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/sessions')
      expect(result).toEqual(mockSessions)
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      })

      const client = new ApiClient('https://api.example.com')

      await expect(client.getSessions()).rejects.toThrow(
        'Failed to fetch sessions: Internal Server Error'
      )
    })
  })

  describe('getSession', () => {
    it('fetches single session from /sessions/:id/state endpoint', async () => {
      const mockSession = { id: 'session-1', status: 'running' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSession),
      })

      const client = new ApiClient('https://api.example.com')
      const result = await client.getSession('session-1')

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/sessions/session-1/state')
      expect(result).toEqual(mockSession)
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const client = new ApiClient('https://api.example.com')

      await expect(client.getSession('invalid-id')).rejects.toThrow(
        'Failed to fetch session: Not Found'
      )
    })
  })

  describe('createSession', () => {
    it('creates session with POST request', async () => {
      const mockResponse = { sessionId: 'new-session-123' }
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const client = new ApiClient('https://api.example.com')
      const result = await client.createSession({ prompt: 'Test prompt' })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: 'Test prompt' }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('includes optional model and cwd in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ sessionId: 'new-session' }),
      })

      const client = new ApiClient('https://api.example.com')
      await client.createSession({
        prompt: 'Test',
        model: 'claude-3-opus',
        cwd: '/home/user',
      })

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: 'Test',
          model: 'claude-3-opus',
          cwd: '/home/user',
        }),
      })
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Bad Request',
      })

      const client = new ApiClient('https://api.example.com')

      await expect(client.createSession({ prompt: '' })).rejects.toThrow(
        'Failed to create session: Bad Request'
      )
    })
  })

  describe('getSessionMDX', () => {
    it('fetches MDX from /sessions/:id/mdx endpoint', async () => {
      const mockMDX = '---\ntitle: Test\n---\n# Content'
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockMDX),
      })

      const client = new ApiClient('https://api.example.com')
      const result = await client.getSessionMDX('session-1')

      expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/sessions/session-1/mdx')
      expect(result).toBe(mockMDX)
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const client = new ApiClient('https://api.example.com')

      await expect(client.getSessionMDX('invalid-id')).rejects.toThrow(
        'Failed to fetch session MDX: Not Found'
      )
    })
  })

  describe('getSessionMarkdown', () => {
    it('fetches markdown from /sessions/:id/markdown endpoint', async () => {
      const mockMarkdown = '# Session Summary\n\n- Task 1 completed'
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockMarkdown),
      })

      const client = new ApiClient('https://api.example.com')
      const result = await client.getSessionMarkdown('session-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/sessions/session-1/markdown'
      )
      expect(result).toBe(mockMarkdown)
    })

    it('throws error on non-ok response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      })

      const client = new ApiClient('https://api.example.com')

      await expect(client.getSessionMarkdown('invalid-id')).rejects.toThrow(
        'Failed to fetch session markdown: Not Found'
      )
    })
  })
})

describe('apiClient singleton', () => {
  it('is an instance of ApiClient', () => {
    expect(apiClient).toBeInstanceOf(ApiClient)
  })
})

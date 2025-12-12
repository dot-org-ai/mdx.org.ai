import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSessions, useSessionState } from './useSessions'
import type { SessionState } from '../lib/client'
import React from 'react'

// Mock the API client
vi.mock('../lib/api', () => ({
  ApiClient: vi.fn().mockImplementation(() => ({
    getSessions: vi.fn(),
    getSession: vi.fn(),
  })),
}))

import { ApiClient } from '../lib/api'

const MockApiClient = vi.mocked(ApiClient)

// Create a wrapper with QueryClient
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children)
}

describe('useSessions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches sessions list', async () => {
    const mockSessions: Partial<SessionState>[] = [
      { id: 'session-1', status: 'running' },
      { id: 'session-2', status: 'completed' },
    ]

    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockResolvedValue(mockSessions),
          getSession: vi.fn(),
        }) as any
    )

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSessions)
    })
  })

  it('handles fetch errors', async () => {
    const mockError = new Error('Network error')

    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockRejectedValue(mockError),
          getSession: vi.fn(),
        }) as any
    )

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError)
    })
  })

  it('uses default baseUrl', async () => {
    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockResolvedValue([]),
          getSession: vi.fn(),
        }) as any
    )

    renderHook(() => useSessions(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(MockApiClient).toHaveBeenCalledWith('https://agents.do')
    })
  })

  it('uses custom baseUrl when provided', async () => {
    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockResolvedValue([]),
          getSession: vi.fn(),
        }) as any
    )

    renderHook(() => useSessions({ baseUrl: 'https://custom.api' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(MockApiClient).toHaveBeenCalledWith('https://custom.api')
    })
  })

  it('returns isLoading true while fetching', () => {
    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockImplementation(
            () => new Promise(() => {}) // Never resolves
          ),
          getSession: vi.fn(),
        }) as any
    )

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() })

    expect(result.current.isLoading).toBe(true)
  })

  it('returns isLoading false after data is fetched', async () => {
    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn().mockResolvedValue([]),
          getSession: vi.fn(),
        }) as any
    )

    const { result } = renderHook(() => useSessions(), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
  })
})

describe('useSessionState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches single session state', async () => {
    const mockSession: Partial<SessionState> = {
      id: 'test-session',
      status: 'running',
      model: 'claude-3',
    }

    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn(),
          getSession: vi.fn().mockResolvedValue(mockSession),
        }) as any
    )

    const { result } = renderHook(() => useSessionState('test-session'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSession)
    })
  })

  it('does not fetch when sessionId is empty', () => {
    const getSessionMock = vi.fn()

    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn(),
          getSession: getSessionMock,
        }) as any
    )

    renderHook(() => useSessionState(''), { wrapper: createWrapper() })

    // Should not call getSession when sessionId is empty
    expect(getSessionMock).not.toHaveBeenCalled()
  })

  it('uses custom baseUrl when provided', async () => {
    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn(),
          getSession: vi.fn().mockResolvedValue({}),
        }) as any
    )

    renderHook(() => useSessionState('test-session', { baseUrl: 'https://custom.api' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(MockApiClient).toHaveBeenCalledWith('https://custom.api')
    })
  })

  it('handles fetch errors for single session', async () => {
    const mockError = new Error('Session not found')

    MockApiClient.mockImplementation(
      () =>
        ({
          getSessions: vi.fn(),
          getSession: vi.fn().mockRejectedValue(mockError),
        }) as any
    )

    const { result } = renderHook(() => useSessionState('test-session'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.error).toEqual(mockError)
    })
  })
})

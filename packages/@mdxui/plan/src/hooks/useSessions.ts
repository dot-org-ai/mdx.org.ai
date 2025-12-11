import { useQuery } from '@tanstack/react-query'
import type { SessionState } from '../lib/client'

/**
 * Hook for fetching multiple sessions via REST API
 * Uses React Query for caching and automatic refetching
 */
export function useSessions(options?: {
  refetchInterval?: number
  baseUrl?: string
}) {
  const { refetchInterval = 5000, baseUrl = 'https://agents.do' } = options || {}

  return useQuery<SessionState[], Error>({
    queryKey: ['sessions', baseUrl],
    queryFn: async () => {
      const client = new (await import('../lib/api')).ApiClient(baseUrl)
      return client.getSessions()
    },
    refetchInterval,
    staleTime: 1000,
  })
}

/**
 * Hook for fetching a single session state via REST API
 */
export function useSessionState(
  sessionId: string,
  options?: {
    refetchInterval?: number
    baseUrl?: string
  }
) {
  const { refetchInterval = 5000, baseUrl = 'https://agents.do' } = options || {}

  return useQuery<SessionState, Error>({
    queryKey: ['session', sessionId, baseUrl],
    queryFn: async () => {
      const client = new (await import('../lib/api')).ApiClient(baseUrl)
      return client.getSession(sessionId)
    },
    refetchInterval,
    staleTime: 1000,
    enabled: !!sessionId,
  })
}

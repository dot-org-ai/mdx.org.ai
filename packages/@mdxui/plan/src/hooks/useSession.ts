import { useState, useEffect } from 'react'
import { SessionClient, type SessionState } from '../lib/client'

/**
 * Hook for subscribing to a single session via WebSocket
 */
export function useSession(sessionId: string, baseUrl: string = 'https://agents.do') {
  const [state, setState] = useState<SessionState | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      return
    }

    let client: SessionClient | null = null

    try {
      client = new SessionClient(sessionId, baseUrl)
      setIsConnected(true)

      const unsubscribe = client.subscribe((newState) => {
        setState(newState)
        setError(null)
      })

      return () => {
        unsubscribe()
        client?.close()
        setIsConnected(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'))
      setIsConnected(false)
    }
  }, [sessionId, baseUrl])

  return {
    state,
    error,
    isConnected,
  }
}

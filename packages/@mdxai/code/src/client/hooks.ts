/**
 * React hooks for session state
 * Requires React as a peer dependency
 */

import { useState, useEffect } from 'react'
import { SessionClient } from './websocket.js'
import type { SessionState, StreamEvent } from '../types.js'

export interface UseSessionOptions {
  baseUrl?: string
  authToken?: string
}

/**
 * Subscribe to a session's state via WebSocket
 */
export function useSession(
  sessionId: string,
  options: UseSessionOptions = {}
): SessionState | null {
  const [state, setState] = useState<SessionState | null>(null)

  useEffect(() => {
    const client = new SessionClient({
      sessionId,
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    })

    const unsubscribe = client.onState(setState)
    client.connect()

    return () => {
      unsubscribe()
      client.close()
    }
  }, [sessionId, options.baseUrl, options.authToken])

  return state
}

/**
 * Subscribe to a session's events via WebSocket
 */
export function useSessionEvents(
  sessionId: string,
  options: UseSessionOptions = {}
): StreamEvent[] {
  const [events, setEvents] = useState<StreamEvent[]>([])

  useEffect(() => {
    const client = new SessionClient({
      sessionId,
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    })

    const unsubscribe = client.onEvent((event) => {
      setEvents((prev) => [...prev, event])
    })

    client.connect()

    return () => {
      unsubscribe()
      client.close()
    }
  }, [sessionId, options.baseUrl, options.authToken])

  return events
}

/**
 * Subscribe to session state and events
 */
export function useSessionWithEvents(
  sessionId: string,
  options: UseSessionOptions = {}
): {
  state: SessionState | null
  events: StreamEvent[]
} {
  const [state, setState] = useState<SessionState | null>(null)
  const [events, setEvents] = useState<StreamEvent[]>([])

  useEffect(() => {
    const client = new SessionClient({
      sessionId,
      baseUrl: options.baseUrl,
      authToken: options.authToken,
    })

    const unsubscribeState = client.onState(setState)
    const unsubscribeEvents = client.onEvent((event) => {
      setEvents((prev) => [...prev, event])
    })

    client.connect()

    return () => {
      unsubscribeState()
      unsubscribeEvents()
      client.close()
    }
  }, [sessionId, options.baseUrl, options.authToken])

  return { state, events }
}

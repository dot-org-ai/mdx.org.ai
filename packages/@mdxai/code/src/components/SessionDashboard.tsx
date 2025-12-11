/**
 * SessionDashboard component
 * Displays multiple sessions in a grid
 */

import { useSession } from '../client/hooks.js'
import { SessionCard } from './SessionCard.js'

export interface SessionDashboardProps {
  sessionIds: string[]
  baseUrl?: string
  authToken?: string
  className?: string
}

export function SessionDashboard({
  sessionIds,
  baseUrl,
  authToken,
  className = '',
}: SessionDashboardProps) {
  return (
    <div className={`session-dashboard ${className}`}>
      <h1 className="text-2xl font-bold mb-6">Agent Sessions</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sessionIds.map((sessionId) => (
          <SessionCardWrapper
            key={sessionId}
            sessionId={sessionId}
            baseUrl={baseUrl}
            authToken={authToken}
          />
        ))}
      </div>
    </div>
  )
}

function SessionCardWrapper({
  sessionId,
  baseUrl,
  authToken,
}: {
  sessionId: string
  baseUrl?: string
  authToken?: string
}) {
  const state = useSession(sessionId, { baseUrl, authToken })

  if (!state) {
    return (
      <div className="border rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    )
  }

  return <SessionCard state={state} />
}

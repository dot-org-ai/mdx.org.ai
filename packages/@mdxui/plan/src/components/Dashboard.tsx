import { SessionCard } from './SessionCard'
import { useSessions } from '../hooks/useSessions'
import { cn } from '../lib/utils'
import { Loader } from 'lucide-react'

interface DashboardProps {
  baseUrl?: string
  className?: string
  showTools?: boolean
}

export function Dashboard({
  baseUrl = 'https://agents.do',
  className,
  showTools = false,
}: DashboardProps) {
  const { data: sessions, isLoading, error } = useSessions({ baseUrl })

  if (error) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-red-800 font-semibold mb-2">Error Loading Sessions</h3>
            <p className="text-sm text-red-600">{error.message}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <Loader className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
        <p className="text-gray-500">Loading sessions...</p>
      </div>
    )
  }

  if (!sessions || sessions.length === 0) {
    return (
      <div className={cn('p-8 text-center', className)}>
        <div className="max-w-md mx-auto">
          <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-gray-800 font-semibold mb-2">No Sessions Found</h3>
            <p className="text-sm text-gray-600">
              Create a new session to get started with agent execution.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('dashboard p-6', className)}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Agent Sessions</h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage your Claude agent execution sessions
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              sessionId={session.id}
              baseUrl={baseUrl}
              showTools={showTools}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

import { PlanViewer } from './PlanViewer'
import { TodoProgress } from './TodoProgress'
import { StatusIndicator } from './StatusIndicator'
import { CostMeter } from './CostMeter'
import { ToolTimeline } from './ToolTimeline'
import { useSession } from '../hooks/useSession'
import { cn } from '../lib/utils'
import { formatTimestamp } from '../lib/formatters'

interface SessionCardProps {
  sessionId: string
  baseUrl?: string
  className?: string
  showTools?: boolean
}

export function SessionCard({
  sessionId,
  baseUrl = 'https://agents.do',
  className,
  showTools = false,
}: SessionCardProps) {
  const { state, isConnected } = useSession(sessionId, baseUrl)

  if (!state) {
    return (
      <div className={cn('border rounded-lg p-4 animate-pulse', className)}>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
        <div className="h-20 bg-gray-200 rounded" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 bg-white',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <code className="text-xs text-gray-500 font-mono">
              {sessionId.slice(0, 8)}...
            </code>
            {!isConnected && (
              <span className="text-xs text-orange-500">Reconnecting...</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-sm">{state.model}</p>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-xs text-gray-500">
              {formatTimestamp(state.startedAt)}
            </span>
          </div>
        </div>
        <StatusIndicator status={state.status} showLabel={false} />
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Plan */}
        {state.plan.length > 0 && (
          <PlanViewer steps={state.plan} className="text-sm" />
        )}

        {/* Todos */}
        {state.todos.length > 0 && <TodoProgress todos={state.todos} />}

        {/* Tools - only show if explicitly enabled */}
        {showTools && state.tools.length > 0 && (
          <ToolTimeline tools={state.tools} />
        )}

        {/* Cost */}
        <CostMeter
          cost={state.cost}
          duration={state.duration}
          usage={state.usage}
        />
      </div>
    </div>
  )
}

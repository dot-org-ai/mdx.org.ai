import { ChevronDown, ChevronRight, Terminal, Check, X, Loader } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'
import { formatDuration } from '../lib/formatters'
import type { ToolExecution } from '../lib/client'

interface ToolTimelineProps {
  tools: ToolExecution[]
  className?: string
}

export function ToolTimeline({ tools, className }: ToolTimelineProps) {
  if (!tools || tools.length === 0) {
    return null
  }

  return (
    <div className={cn('tool-timeline space-y-2', className)}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Terminal className="w-5 h-5 text-primary" />
        Tool Executions
      </h3>
      {tools.map((tool) => (
        <ToolItem key={tool.id} tool={tool} />
      ))}
    </div>
  )
}

interface ToolItemProps {
  tool: ToolExecution
}

function ToolItem({ tool }: ToolItemProps) {
  const [expanded, setExpanded] = useState(false)

  const statusConfig: Record<string, {
    icon: typeof Loader
    color: string
    bg: string
    animate?: boolean
  }> = {
    running: {
      icon: Loader,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      animate: true,
    },
    success: {
      icon: Check,
      color: 'text-green-500',
      bg: 'bg-white',
    },
    error: {
      icon: X,
      color: 'text-red-500',
      bg: 'bg-red-50',
    },
  }

  const config = statusConfig[tool.status]
  const Icon = config.icon

  const duration =
    tool.completedAt && tool.startedAt
      ? new Date(tool.completedAt).getTime() - new Date(tool.startedAt).getTime()
      : 0

  return (
    <div className="border rounded-lg overflow-hidden animate-in">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors',
          config.bg
        )}
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 flex-shrink-0" />
        )}
        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
          {tool.tool}
        </code>
        <span className="flex-1" />
        <Icon
          className={cn(
            'w-4 h-4',
            config.color,
            config.animate && 'animate-spin'
          )}
        />
        {duration > 0 && (
          <span className="text-xs text-gray-500 font-medium">
            {formatDuration(duration)}
          </span>
        )}
      </button>

      {expanded && (
        <div className="border-t p-3 bg-gray-50 space-y-3 animate-slide-in">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Input
            </h4>
            <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40 font-mono">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.output !== undefined && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                Output
              </h4>
              <pre className="text-xs bg-white p-3 rounded border overflow-auto max-h-40 font-mono">
                {typeof tool.output === 'string'
                  ? tool.output.slice(0, 1000)
                  : JSON.stringify(tool.output, null, 2).slice(0, 1000)}
                {(typeof tool.output === 'string' ? tool.output : JSON.stringify(tool.output, null, 2)).length > 1000 && (
                  <span className="text-gray-400">... (truncated)</span>
                )}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

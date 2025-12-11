/**
 * ToolHistory component
 * Displays tool executions with expandable details
 */

import { useState } from 'react'
import type { ToolExecution } from '../types.js'

export interface ToolHistoryProps {
  tools: ToolExecution[]
  className?: string
}

export function ToolHistory({ tools, className = '' }: ToolHistoryProps) {
  if (tools.length === 0) {
    return null
  }

  return (
    <div className={`tool-history ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Tool Executions</h3>
      <div className="space-y-2">
        {tools.map((tool) => (
          <ToolItem key={tool.id} tool={tool} />
        ))}
      </div>
    </div>
  )
}

function ToolItem({ tool }: { tool: ToolExecution }) {
  const [expanded, setExpanded] = useState(false)

  const statusColors = {
    running: 'text-blue-500',
    success: 'text-green-500',
    error: 'text-red-500',
  }

  const statusSymbols = {
    running: '⏳',
    success: '✓',
    error: '✗',
  }

  const duration =
    tool.completedAt && tool.startedAt
      ? tool.completedAt.getTime() - tool.startedAt.getTime()
      : null

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50"
      >
        <span className={statusColors[tool.status]}>{statusSymbols[tool.status]}</span>
        <code className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">
          {tool.tool}
        </code>
        <span className="flex-1" />
        {duration && (
          <span className="text-xs text-gray-500">{Math.round(duration)}ms</span>
        )}
        <span className="text-gray-400">{expanded ? '▼' : '▶'}</span>
      </button>

      {expanded && (
        <div className="border-t p-3 bg-gray-50 space-y-3">
          <div>
            <h4 className="text-xs font-semibold text-gray-500 mb-1">Input</h4>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
              {JSON.stringify(tool.input, null, 2)}
            </pre>
          </div>
          {tool.output !== undefined && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 mb-1">Output</h4>
              <pre className="text-xs bg-white p-2 rounded border overflow-auto max-h-40">
                {typeof tool.output === 'string'
                  ? tool.output.slice(0, 1000)
                  : JSON.stringify(tool.output, null, 2).slice(0, 1000)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

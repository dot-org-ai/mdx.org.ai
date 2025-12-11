/**
 * SessionCard component
 * Displays session information in a card format
 */

import type { SessionState } from '../types.js'

export interface SessionCardProps {
  state: SessionState
  className?: string
}

export function SessionCard({ state, className = '' }: SessionCardProps) {
  const statusColors = {
    idle: 'bg-gray-100 text-gray-700',
    running: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    error: 'bg-red-100 text-red-700',
  }

  const completedTodos = state.todos.filter((t) => t.status === 'completed').length
  const totalTodos = state.todos.length

  return (
    <div className={`border rounded-lg overflow-hidden shadow-sm ${className}`}>
      <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
        <div>
          <code className="text-xs text-gray-500">{state.id.slice(0, 8)}...</code>
          <p className="font-medium text-sm mt-1">{state.model}</p>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusColors[state.status]}`}
        >
          {state.status}
        </span>
      </div>

      <div className="p-4">
        {totalTodos > 0 && (
          <div className="mb-3">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">Tasks</span>
              <span className="text-gray-900 font-medium">
                {completedTodos}/{totalTodos}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${(completedTodos / totalTodos) * 100}%` }}
              />
            </div>
          </div>
        )}

        {state.plan.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 mb-2">Current Step</p>
            {state.plan
              .filter((s) => s.status === 'active')
              .map((step) => (
                <p key={step.id} className="text-sm">
                  {step.description}
                </p>
              ))}
          </div>
        )}

        {state.status === 'completed' && (
          <div className="text-xs text-gray-500 mt-3 pt-3 border-t">
            <div className="flex justify-between">
              <span>Duration: {Math.round(state.duration / 1000)}s</span>
              <span>Cost: ${state.cost.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

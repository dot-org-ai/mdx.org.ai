/**
 * TodoList component
 * Displays todos with checkboxes and status
 */

import type { Todo } from '../types.js'

export interface TodoListProps {
  todos: Todo[]
  className?: string
}

export function TodoList({ todos, className = '' }: TodoListProps) {
  const statusSymbols = {
    pending: '[ ]',
    in_progress: '[-]',
    completed: '[x]',
  }

  const statusColors = {
    pending: 'text-gray-500',
    in_progress: 'text-blue-600',
    completed: 'text-green-600 line-through',
  }

  if (todos.length === 0) {
    return null
  }

  return (
    <div className={`todo-list ${className}`}>
      <h3 className="text-lg font-semibold mb-3">Tasks</h3>
      <ul className="space-y-2">
        {todos.map((todo, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="font-mono text-sm mt-0.5">{statusSymbols[todo.status]}</span>
            <span className={`flex-1 ${statusColors[todo.status]}`}>{todo.content}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

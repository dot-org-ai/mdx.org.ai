import { CheckSquare, Square, Loader2 } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Todo } from '../lib/client'

interface TodoProgressProps {
  todos: Todo[]
  className?: string
}

export function TodoProgress({ todos, className }: TodoProgressProps) {
  if (!todos || todos.length === 0) {
    return null
  }

  const completed = todos.filter((t) => t.status === 'completed').length
  const total = todos.length
  const progress = (completed / total) * 100

  return (
    <div className={cn('todo-progress', className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700">Tasks</h4>
        <span className="text-xs text-gray-500">
          {completed} / {total} completed
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className="bg-green-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Todo list */}
      <ul className="space-y-2">
        {todos.map((todo, index) => (
          <TodoItem key={index} todo={todo} />
        ))}
      </ul>
    </div>
  )
}

interface TodoItemProps {
  todo: Todo
}

function TodoItem({ todo }: TodoItemProps) {
  const statusConfig: Record<string, {
    icon: typeof Square
    color: string
    textColor: string
    animate?: boolean
    strikethrough?: boolean
  }> = {
    pending: {
      icon: Square,
      color: 'text-gray-400',
      textColor: 'text-gray-700',
    },
    in_progress: {
      icon: Loader2,
      color: 'text-blue-500',
      textColor: 'text-blue-700',
      animate: true,
    },
    completed: {
      icon: CheckSquare,
      color: 'text-green-500',
      textColor: 'text-gray-500',
      strikethrough: true,
    },
  }

  const config = statusConfig[todo.status]
  const Icon = config.icon

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon
        className={cn(
          'w-4 h-4 mt-0.5 flex-shrink-0',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <span
        className={cn(
          config.textColor,
          config.strikethrough && 'line-through'
        )}
      >
        {todo.status === 'in_progress' ? todo.activeForm : todo.content}
      </span>
    </li>
  )
}

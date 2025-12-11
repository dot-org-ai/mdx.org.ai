import { CheckCircle, Circle, Loader, XCircle } from 'lucide-react'
import { cn } from '../lib/utils'

interface StatusIndicatorProps {
  status: 'idle' | 'running' | 'completed' | 'error'
  className?: string
  showLabel?: boolean
}

export function StatusIndicator({ status, className, showLabel = true }: StatusIndicatorProps) {
  const statusConfig: Record<string, {
    icon: typeof Circle
    color: string
    bg: string
    label: string
    animate?: boolean
  }> = {
    idle: {
      icon: Circle,
      color: 'text-gray-400',
      bg: 'bg-gray-100',
      label: 'Idle',
    },
    running: {
      icon: Loader,
      color: 'text-blue-500',
      bg: 'bg-blue-100',
      label: 'Running',
      animate: true,
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-100',
      label: 'Completed',
    },
    error: {
      icon: XCircle,
      color: 'text-red-500',
      bg: 'bg-red-100',
      label: 'Error',
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium',
        config.bg,
        config.color,
        className
      )}
    >
      <Icon
        className={cn('w-4 h-4', config.animate && 'animate-spin')}
      />
      {showLabel && <span>{config.label}</span>}
    </div>
  )
}

import { CheckCircle, Circle, Loader, ChevronRight, MinusCircle } from 'lucide-react'
import { cn } from '../lib/utils'
import type { PlanStep } from '../lib/client'

interface PlanViewerProps {
  steps: PlanStep[]
  className?: string
}

export function PlanViewer({ steps, className }: PlanViewerProps) {
  if (!steps || steps.length === 0) {
    return null
  }

  return (
    <div className={cn('plan-viewer', className)}>
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <ChevronRight className="w-5 h-5 text-primary" />
        Execution Plan
      </h3>
      <ol className="space-y-2">
        {steps.map((step, index) => (
          <PlanStepItem key={step.id} step={step} index={index} />
        ))}
      </ol>
    </div>
  )
}

interface PlanStepItemProps {
  step: PlanStep
  index: number
}

function PlanStepItem({ step, index }: PlanStepItemProps) {
  const statusConfig: Record<string, {
    icon: typeof Circle
    color: string
    borderColor: string
    bgColor: string
    textColor: string
    animate?: boolean
    shadow?: boolean
    strikethrough?: boolean
    opacity?: boolean
  }> = {
    pending: {
      icon: Circle,
      color: 'text-gray-400',
      borderColor: 'border-gray-200',
      bgColor: 'bg-white',
      textColor: 'text-gray-700',
    },
    active: {
      icon: Loader,
      color: 'text-blue-500',
      borderColor: 'border-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      animate: true,
      shadow: true,
    },
    completed: {
      icon: CheckCircle,
      color: 'text-green-500',
      borderColor: 'border-green-200',
      bgColor: 'bg-green-50/50',
      textColor: 'text-gray-500',
      strikethrough: true,
    },
    skipped: {
      icon: MinusCircle,
      color: 'text-gray-300',
      borderColor: 'border-gray-100',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-400',
      opacity: true,
    },
  }

  const config = statusConfig[step.status]
  const Icon = config.icon

  return (
    <li
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-all duration-300',
        config.borderColor,
        config.bgColor,
        config.shadow && 'shadow-sm',
        config.opacity && 'opacity-50',
        'animate-in'
      )}
    >
      <span className="flex-shrink-0 mt-0.5">
        <Icon
          className={cn(
            'w-5 h-5',
            config.color,
            config.animate && 'animate-spin'
          )}
        />
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-sm text-gray-500 mr-2 font-medium">{index + 1}.</span>
        <span
          className={cn(
            'font-medium',
            config.textColor,
            config.strikethrough && 'line-through'
          )}
        >
          {step.description}
        </span>
      </div>
    </li>
  )
}

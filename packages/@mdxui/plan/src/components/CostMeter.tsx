import { DollarSign, Clock, Zap } from 'lucide-react'
import { cn } from '../lib/utils'
import { formatCost, formatDuration, formatTokens } from '../lib/formatters'
import type { Usage } from '../lib/client'

interface CostMeterProps {
  cost: number
  duration: number
  usage?: Usage
  className?: string
}

export function CostMeter({ cost, duration, usage, className }: CostMeterProps) {
  return (
    <div className={cn('cost-meter', className)}>
      <div className="grid grid-cols-2 gap-3">
        {/* Cost */}
        <div className="flex items-center gap-2 text-sm">
          <div className="p-2 bg-green-100 rounded-lg">
            <DollarSign className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Cost</div>
            <div className="font-semibold text-gray-900">{formatCost(cost)}</div>
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-2 text-sm">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Duration</div>
            <div className="font-semibold text-gray-900">{formatDuration(duration)}</div>
          </div>
        </div>
      </div>

      {/* Token usage */}
      {usage && (
        <div className="mt-3 pt-3 border-t">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Token Usage
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="text-gray-500">Input</div>
              <div className="font-mono font-semibold text-gray-900">
                {formatTokens(usage.inputTokens)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Output</div>
              <div className="font-mono font-semibold text-gray-900">
                {formatTokens(usage.outputTokens)}
              </div>
            </div>
            <div>
              <div className="text-gray-500">Total</div>
              <div className="font-mono font-semibold text-gray-900">
                {formatTokens(usage.totalTokens)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

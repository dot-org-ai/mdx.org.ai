/**
 * Progress indicators - Progress bars and trackers
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * ProgressBar
 * -----------------------------------------------------------------------------------------------*/

type ProgressBarElement = HTMLDivElement
interface ProgressBarProps extends ComponentPropsWithoutRef<'div'> {
  /** Progress value (0-100) */
  value?: number
  /** Maximum value */
  max?: number
  /** Progress color */
  color?: string
  /** Label */
  label?: string
  /** Show animation */
  showAnimation?: boolean
}

const ProgressBar = forwardRef<ProgressBarElement, ProgressBarProps>(
  ({
    className = '',
    value = 0,
    max = 100,
    color = 'bg-blue-500',
    label,
    showAnimation = false,
    ...props
  }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
      <Primitive.div ref={ref} className={`space-y-1 ${className}`.trim()} {...props}>
        {label && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium">{Math.round(percentage)}%</span>
          </div>
        )}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${color} ${showAnimation ? 'transition-all duration-500 ease-out' : ''}`.trim()}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Primitive.div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

/* -------------------------------------------------------------------------------------------------
 * ProgressCircle
 * -----------------------------------------------------------------------------------------------*/

type ProgressCircleElement = HTMLDivElement
interface ProgressCircleProps extends ComponentPropsWithoutRef<'div'> {
  /** Progress value (0-100) */
  value?: number
  /** Maximum value */
  max?: number
  /** Circle size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Progress color */
  color?: string
  /** Show value in center */
  showValue?: boolean
}

const circleSizeMap = {
  xs: { size: 24, strokeWidth: 2 },
  sm: { size: 40, strokeWidth: 3 },
  md: { size: 56, strokeWidth: 4 },
  lg: { size: 72, strokeWidth: 5 },
  xl: { size: 96, strokeWidth: 6 },
}

const ProgressCircle = forwardRef<ProgressCircleElement, ProgressCircleProps>(
  ({
    className = '',
    value = 0,
    max = 100,
    size = 'md',
    color = 'text-blue-500',
    showValue = true,
    children,
    ...props
  }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))
    const { size: circleSize, strokeWidth } = circleSizeMap[size]
    const radius = (circleSize - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const offset = circumference - (percentage / 100) * circumference

    return (
      <Primitive.div
        ref={ref}
        className={`relative inline-flex items-center justify-center ${className}`.trim()}
        {...props}
      >
        <svg
          width={circleSize}
          height={circleSize}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          {/* Progress circle */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={`transition-all duration-500 ease-out ${color}`}
          />
        </svg>
        {(showValue || children) && (
          <div className="absolute inset-0 flex items-center justify-center">
            {children || (
              <span className="text-sm font-medium">{Math.round(percentage)}%</span>
            )}
          </div>
        )}
      </Primitive.div>
    )
  }
)
ProgressCircle.displayName = 'ProgressCircle'

/* -------------------------------------------------------------------------------------------------
 * Tracker
 * -----------------------------------------------------------------------------------------------*/

interface TrackerItem {
  color?: string
  tooltip?: string
}

type TrackerElement = HTMLDivElement
interface TrackerProps extends ComponentPropsWithoutRef<'div'> {
  /** Tracker items */
  data: TrackerItem[]
}

const Tracker = forwardRef<TrackerElement, TrackerProps>(
  ({ className = '', data, ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        className={`flex w-full items-center gap-0.5 ${className}`.trim()}
        {...props}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className={`h-4 flex-1 first:rounded-l last:rounded-r ${item.color || 'bg-muted'}`}
            title={item.tooltip}
          />
        ))}
      </Primitive.div>
    )
  }
)
Tracker.displayName = 'Tracker'

export { ProgressBar, ProgressCircle, Tracker }
export type { ProgressBarProps, ProgressCircleProps, TrackerProps, TrackerItem }

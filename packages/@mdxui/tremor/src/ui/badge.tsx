/**
 * Badge components - Status and delta indicators
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Badge
 * -----------------------------------------------------------------------------------------------*/

type BadgeElement = HTMLSpanElement
interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** Badge color */
  color?: 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'
  /** Badge size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Badge icon */
  icon?: React.ComponentType<{ className?: string }>
}

const colorMap: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
  yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  lime: 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  teal: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
  sky: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
  purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  fuchsia: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900 dark:text-fuchsia-300',
  pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  rose: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
}

const sizeMap = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
  xl: 'px-3.5 py-2 text-base',
}

const Badge = forwardRef<BadgeElement, BadgeProps>(
  ({
    className = '',
    color = 'gray',
    size = 'sm',
    icon: Icon,
    children,
    ...props
  }, ref) => {
    return (
      <Primitive.span
        ref={ref}
        className={`inline-flex items-center gap-1 rounded-md font-medium ${colorMap[color]} ${sizeMap[size]} ${className}`.trim()}
        {...props}
      >
        {Icon && <Icon className="h-3 w-3" />}
        {children}
      </Primitive.span>
    )
  }
)
Badge.displayName = 'Badge'

/* -------------------------------------------------------------------------------------------------
 * BadgeDelta
 * -----------------------------------------------------------------------------------------------*/

type BadgeDeltaElement = HTMLSpanElement
interface BadgeDeltaProps extends ComponentPropsWithoutRef<'span'> {
  /** Delta type */
  deltaType?: 'increase' | 'moderateIncrease' | 'unchanged' | 'moderateDecrease' | 'decrease'
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Whether to show the icon */
  isIncreasePositive?: boolean
}

const deltaColorMap = {
  increase: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  moderateIncrease: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  unchanged: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  moderateDecrease: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
  decrease: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-300',
}

const deltaIconMap = {
  increase: '↑',
  moderateIncrease: '↗',
  unchanged: '→',
  moderateDecrease: '↘',
  decrease: '↓',
}

const BadgeDelta = forwardRef<BadgeDeltaElement, BadgeDeltaProps>(
  ({
    className = '',
    deltaType = 'unchanged',
    size = 'sm',
    isIncreasePositive = true,
    children,
    ...props
  }, ref) => {
    // Swap colors if increase is not positive
    let colorType = deltaType
    if (!isIncreasePositive) {
      if (deltaType === 'increase' || deltaType === 'moderateIncrease') {
        colorType = deltaType === 'increase' ? 'decrease' : 'moderateDecrease'
      } else if (deltaType === 'decrease' || deltaType === 'moderateDecrease') {
        colorType = deltaType === 'decrease' ? 'increase' : 'moderateIncrease'
      }
    }

    return (
      <Primitive.span
        ref={ref}
        className={`inline-flex items-center gap-1 rounded-md font-medium ${deltaColorMap[colorType]} ${sizeMap[size]} ${className}`.trim()}
        {...props}
      >
        <span>{deltaIconMap[deltaType]}</span>
        {children}
      </Primitive.span>
    )
  }
)
BadgeDelta.displayName = 'BadgeDelta'

export { Badge, BadgeDelta }
export type { BadgeProps, BadgeDeltaProps }

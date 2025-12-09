/**
 * Callout - Alert/info callout component
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Callout
 * -----------------------------------------------------------------------------------------------*/

type CalloutElement = HTMLDivElement
interface CalloutProps extends ComponentPropsWithoutRef<'div'> {
  /** Callout title */
  title?: string
  /** Callout icon */
  icon?: React.ComponentType<{ className?: string }>
  /** Callout color */
  color?: 'gray' | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'emerald' | 'teal' | 'cyan' | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'fuchsia' | 'pink' | 'rose'
}

const colorMap: Record<string, string> = {
  gray: 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900',
  red: 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900',
  orange: 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900',
  amber: 'border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900',
  yellow: 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900',
  lime: 'border-lime-200 bg-lime-50 dark:border-lime-800 dark:bg-lime-900',
  green: 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900',
  emerald: 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900',
  teal: 'border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-900',
  cyan: 'border-cyan-200 bg-cyan-50 dark:border-cyan-800 dark:bg-cyan-900',
  sky: 'border-sky-200 bg-sky-50 dark:border-sky-800 dark:bg-sky-900',
  blue: 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900',
  indigo: 'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900',
  violet: 'border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-900',
  purple: 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900',
  fuchsia: 'border-fuchsia-200 bg-fuchsia-50 dark:border-fuchsia-800 dark:bg-fuchsia-900',
  pink: 'border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-900',
  rose: 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-900',
}

const iconColorMap: Record<string, string> = {
  gray: 'text-gray-500',
  red: 'text-red-500',
  orange: 'text-orange-500',
  amber: 'text-amber-500',
  yellow: 'text-yellow-500',
  lime: 'text-lime-500',
  green: 'text-green-500',
  emerald: 'text-emerald-500',
  teal: 'text-teal-500',
  cyan: 'text-cyan-500',
  sky: 'text-sky-500',
  blue: 'text-blue-500',
  indigo: 'text-indigo-500',
  violet: 'text-violet-500',
  purple: 'text-purple-500',
  fuchsia: 'text-fuchsia-500',
  pink: 'text-pink-500',
  rose: 'text-rose-500',
}

const Callout = forwardRef<CalloutElement, CalloutProps>(
  ({ className = '', title, icon: Icon, color = 'blue', children, ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        className={`flex gap-3 rounded-md border p-4 ${colorMap[color]} ${className}`.trim()}
        role="alert"
        {...props}
      >
        {Icon && (
          <div className={`flex-shrink-0 ${iconColorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1">
          {title && (
            <h3 className="text-sm font-medium">{title}</h3>
          )}
          {children && (
            <div className={`text-sm ${title ? 'mt-1' : ''}`}>
              {children}
            </div>
          )}
        </div>
      </Primitive.div>
    )
  }
)
Callout.displayName = 'Callout'

export { Callout }
export type { CalloutProps }

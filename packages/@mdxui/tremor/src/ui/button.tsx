/**
 * Button - Dashboard button component
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Button as HeadlessButton } from '@mdxui/headless'

/* -------------------------------------------------------------------------------------------------
 * Button
 * -----------------------------------------------------------------------------------------------*/

type ButtonElement = HTMLButtonElement
interface ButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'light'
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Icon */
  icon?: React.ComponentType<{ className?: string }>
  /** Icon position */
  iconPosition?: 'left' | 'right'
  /** Loading state */
  loading?: boolean
  /** Loading text */
  loadingText?: string
  children?: React.ReactNode
}

const variantMap = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-transparent',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-secondary',
  light: 'bg-transparent text-foreground hover:bg-muted border-border',
}

const sizeMap = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2.5 py-1.5 text-sm',
  md: 'px-3 py-2 text-sm',
  lg: 'px-4 py-2.5 text-base',
  xl: 'px-5 py-3 text-base',
}

const Button = forwardRef<ButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'primary',
    size = 'md',
    icon: Icon,
    iconPosition = 'left',
    loading = false,
    loadingText,
    disabled,
    children,
    ...props
  }, ref) => {
    const isDisabled = disabled || loading

    return (
      <HeadlessButton
        ref={ref}
        disabled={isDisabled}
        className={`inline-flex items-center justify-center gap-2 rounded-md border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${variantMap[variant]} ${sizeMap[size]} ${className}`.trim()}
        {...props}
      >
        {loading && (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {Icon && iconPosition === 'left' && !loading && <Icon className="h-4 w-4" />}
        {loading ? loadingText || children : children}
        {Icon && iconPosition === 'right' && !loading && <Icon className="h-4 w-4" />}
      </HeadlessButton>
    )
  }
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps }

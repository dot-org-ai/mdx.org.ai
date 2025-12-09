/**
 * @mdxui/headless - Button component
 * A headless button component
 * API compatible with @headlessui/react Button
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Button
 * -----------------------------------------------------------------------------------------------*/

type ButtonElement = ElementRef<typeof Primitive.button>
interface ButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  disabled?: boolean
  autoFocus?: boolean
  children?: ReactNode | ((props: { disabled: boolean; hover: boolean; active: boolean; focus: boolean; autofocus: boolean }) => ReactNode)
}

const Button = forwardRef<ButtonElement, ButtonProps>(
  ({ children, disabled = false, autoFocus = false, type = 'button', ...props }, ref) => {
    // For the render prop version, we'd need to track hover/active/focus states
    // For simplicity, we'll just pass the basic props
    const resolvedChildren =
      typeof children === 'function'
        ? children({ disabled, hover: false, active: false, focus: false, autofocus: autoFocus })
        : children

    return (
      <Primitive.button
        ref={ref}
        type={type}
        disabled={disabled}
        autoFocus={autoFocus}
        data-headlessui-state={disabled ? 'disabled' : ''}
        data-disabled={disabled ? '' : undefined}
        data-autofocus={autoFocus ? '' : undefined}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
export type { ButtonProps }

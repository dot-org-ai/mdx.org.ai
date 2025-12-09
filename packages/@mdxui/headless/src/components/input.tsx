/**
 * @mdxui/headless - Input component
 * A headless input component
 * API compatible with @headlessui/react Input
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Input
 * -----------------------------------------------------------------------------------------------*/

type InputElement = ElementRef<typeof Primitive.input>
interface InputProps extends ComponentPropsWithoutRef<typeof Primitive.input> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  invalid?: boolean
}

const Input = forwardRef<InputElement, InputProps>(
  ({ invalid = false, disabled = false, autoFocus = false, ...props }, ref) => {
    return (
      <Primitive.input
        ref={ref}
        disabled={disabled}
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        data-headlessui-state={`${disabled ? 'disabled' : ''} ${invalid ? 'invalid' : ''}`.trim()}
        data-disabled={disabled ? '' : undefined}
        data-invalid={invalid ? '' : undefined}
        data-autofocus={autoFocus ? '' : undefined}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
export type { InputProps }

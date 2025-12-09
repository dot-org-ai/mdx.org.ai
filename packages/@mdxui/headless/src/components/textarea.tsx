/**
 * @mdxui/headless - Textarea component
 * A headless textarea component
 * API compatible with @headlessui/react Textarea
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'

/* -------------------------------------------------------------------------------------------------
 * Textarea
 * -----------------------------------------------------------------------------------------------*/

type TextareaElement = HTMLTextAreaElement
interface TextareaProps extends ComponentPropsWithoutRef<'textarea'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  invalid?: boolean
}

const Textarea = forwardRef<TextareaElement, TextareaProps>(
  ({ invalid = false, disabled = false, autoFocus = false, ...props }, ref) => {
    return (
      <textarea
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
Textarea.displayName = 'Textarea'

export { Textarea }
export type { TextareaProps }

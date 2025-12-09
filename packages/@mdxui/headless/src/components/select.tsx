/**
 * @mdxui/headless - Select component (native)
 * A headless native select component
 * API compatible with @headlessui/react Select (native)
 * Note: For custom selects, use Listbox
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'

/* -------------------------------------------------------------------------------------------------
 * Select
 * -----------------------------------------------------------------------------------------------*/

type SelectElement = HTMLSelectElement
interface SelectProps extends ComponentPropsWithoutRef<'select'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  invalid?: boolean
}

const Select = forwardRef<SelectElement, SelectProps>(
  ({ invalid = false, disabled = false, autoFocus = false, ...props }, ref) => {
    return (
      <select
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
Select.displayName = 'Select'

export { Select }
export type { SelectProps }

/**
 * Select components - Dropdown selects using @mdxui/headless
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import {
  Listbox,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
} from '@mdxui/headless'

/* -------------------------------------------------------------------------------------------------
 * Select (Listbox wrapper)
 * -----------------------------------------------------------------------------------------------*/

export { Listbox as Select, ListboxButton as SelectTrigger }

/* -------------------------------------------------------------------------------------------------
 * SelectContent
 * -----------------------------------------------------------------------------------------------*/

type SelectContentElement = HTMLUListElement
interface SelectContentProps extends ComponentPropsWithoutRef<'ul'> {}

const SelectContent = forwardRef<SelectContentElement, SelectContentProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <ListboxOptions
        ref={ref}
        className={`absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 ${className}`.trim()}
        {...props}
      />
    )
  }
)
SelectContent.displayName = 'SelectContent'

/* -------------------------------------------------------------------------------------------------
 * SelectItem
 * -----------------------------------------------------------------------------------------------*/

type SelectItemElement = HTMLLIElement
interface SelectItemProps extends Omit<ComponentPropsWithoutRef<'li'>, 'children'> {
  /** Item value */
  value: string
  /** Disabled */
  disabled?: boolean
  children?: React.ReactNode
}

const SelectItem = forwardRef<SelectItemElement, SelectItemProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <ListboxOption
        ref={ref}
        className={`relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[selected]:bg-accent data-[selected]:text-accent-foreground ${className}`.trim()}
        {...props}
      >
        {children}
      </ListboxOption>
    )
  }
)
SelectItem.displayName = 'SelectItem'

/* -------------------------------------------------------------------------------------------------
 * SelectNative (native HTML select wrapper)
 * -----------------------------------------------------------------------------------------------*/

type SelectNativeElement = HTMLSelectElement
interface SelectNativeProps extends ComponentPropsWithoutRef<'select'> {
  /** Enable search */
  enableClear?: boolean
  /** Placeholder */
  placeholder?: string
}

const SelectNative = forwardRef<SelectNativeElement, SelectNativeProps>(
  ({ className = '', placeholder, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${className}`.trim()}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
    )
  }
)
SelectNative.displayName = 'SelectNative'

export { SelectContent, SelectItem, SelectNative }
export type { SelectContentProps, SelectItemProps, SelectNativeProps }

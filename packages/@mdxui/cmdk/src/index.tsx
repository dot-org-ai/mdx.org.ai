/**
 * @mdxui/cmdk - Command palette component
 * A command palette/menu component built on @mdxui/jsx primitives
 * Port of cmdk (https://github.com/pacocoursey/cmdk) for Hono JSX compatibility
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'

type KeyboardEvent<T = Element> = React.KeyboardEvent<T>
type ChangeEvent<T = Element> = React.ChangeEvent<T>
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface CommandContextValue {
  search: string
  setSearch: (search: string) => void
  selectedValue: string
  setSelectedValue: (value: string) => void
  filter?: (value: string, search: string) => number
  loop: boolean
  listId: string
  inputId: string
  labelId: string
}

const CommandContext = createContext<CommandContextValue | null>(null)

function useCommandContext(component: string) {
  const context = useContext(CommandContext)
  if (!context) {
    throw new Error(`<Command.${component} /> must be used within <Command />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Command Root
 * -----------------------------------------------------------------------------------------------*/

type CommandElement = ElementRef<typeof Primitive.div>
interface CommandProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  label?: string
  shouldFilter?: boolean
  filter?: (value: string, search: string) => number
  value?: string
  onValueChange?: (value: string) => void
  loop?: boolean
  vimBindings?: boolean
}

const Command = forwardRef<CommandElement, CommandProps>(
  (
    {
      children,
      label,
      shouldFilter = true,
      filter,
      value,
      onValueChange,
      loop = false,
      vimBindings = false,
      ...props
    },
    ref
  ) => {
    const [search, setSearch] = useState('')
    const [selectedValue, setSelectedValueState] = useState(value || '')
    const listId = useId()
    const inputId = useId()
    const labelId = useId()

    const setSelectedValue = useCallback(
      (newValue: string) => {
        setSelectedValueState(newValue)
        onValueChange?.(newValue)
      },
      [onValueChange]
    )

    useEffect(() => {
      if (value !== undefined) {
        setSelectedValueState(value)
      }
    }, [value])

    const contextValue = useMemo(
      () => ({
        search,
        setSearch,
        selectedValue,
        setSelectedValue,
        filter: shouldFilter ? filter : undefined,
        loop,
        listId,
        inputId,
        labelId,
      }),
      [search, selectedValue, setSelectedValue, filter, shouldFilter, loop, listId, inputId, labelId]
    )

    return (
      <CommandContext.Provider value={contextValue}>
        <Primitive.div
          ref={ref}
          {...props}
          cmdk-root=""
          role="application"
          aria-label={label}
        >
          <label
            cmdk-label=""
            htmlFor={inputId}
            id={labelId}
            style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', borderWidth: 0 }}
          >
            {label}
          </label>
          {children}
        </Primitive.div>
      </CommandContext.Provider>
    )
  }
)
Command.displayName = 'Command'

/* -------------------------------------------------------------------------------------------------
 * Command Input
 * -----------------------------------------------------------------------------------------------*/

type CommandInputElement = ElementRef<typeof Primitive.input>
interface CommandInputProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.input>, 'value' | 'onChange'> {
  value?: string
  onValueChange?: (search: string) => void
}

const CommandInput = forwardRef<CommandInputElement, CommandInputProps>(
  ({ value, onValueChange, ...props }, ref) => {
    const context = useCommandContext('Input')
    const isControlled = value !== undefined

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        if (!isControlled) {
          context.setSearch(newValue)
        }
        onValueChange?.(newValue)
      },
      [isControlled, context, onValueChange]
    )

    return (
      <Primitive.input
        ref={ref}
        {...props}
        cmdk-input=""
        id={context.inputId}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-controls={context.listId}
        role="combobox"
        aria-expanded={true}
        value={isControlled ? value : context.search}
        onChange={handleChange}
      />
    )
  }
)
CommandInput.displayName = 'CommandInput'

/* -------------------------------------------------------------------------------------------------
 * Command List
 * -----------------------------------------------------------------------------------------------*/

type CommandListElement = ElementRef<typeof Primitive.div>
interface CommandListProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const CommandList = forwardRef<CommandListElement, CommandListProps>(
  ({ children, ...props }, ref) => {
    const context = useCommandContext('List')

    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-list=""
        role="listbox"
        id={context.listId}
        aria-labelledby={context.labelId}
      >
        {children}
      </Primitive.div>
    )
  }
)
CommandList.displayName = 'CommandList'

/* -------------------------------------------------------------------------------------------------
 * Command Empty
 * -----------------------------------------------------------------------------------------------*/

type CommandEmptyElement = ElementRef<typeof Primitive.div>
interface CommandEmptyProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const CommandEmpty = forwardRef<CommandEmptyElement, CommandEmptyProps>(
  ({ children, ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-empty=""
        role="presentation"
      >
        {children}
      </Primitive.div>
    )
  }
)
CommandEmpty.displayName = 'CommandEmpty'

/* -------------------------------------------------------------------------------------------------
 * Command Loading
 * -----------------------------------------------------------------------------------------------*/

type CommandLoadingElement = ElementRef<typeof Primitive.div>
interface CommandLoadingProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  progress?: number
}

const CommandLoading = forwardRef<CommandLoadingElement, CommandLoadingProps>(
  ({ children, progress, ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-loading=""
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Loading..."
      >
        {children}
      </Primitive.div>
    )
  }
)
CommandLoading.displayName = 'CommandLoading'

/* -------------------------------------------------------------------------------------------------
 * Command Group
 * -----------------------------------------------------------------------------------------------*/

type CommandGroupElement = ElementRef<typeof Primitive.div>
interface CommandGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  heading?: ReactNode
  value?: string
  forceMount?: boolean
}

const CommandGroup = forwardRef<CommandGroupElement, CommandGroupProps>(
  ({ children, heading, value, forceMount, ...props }, ref) => {
    const headingId = useId()

    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-group=""
        role="group"
        aria-labelledby={heading ? headingId : undefined}
      >
        {heading && (
          <Primitive.div cmdk-group-heading="" id={headingId} aria-hidden="true">
            {heading}
          </Primitive.div>
        )}
        <Primitive.div cmdk-group-items="">
          {children}
        </Primitive.div>
      </Primitive.div>
    )
  }
)
CommandGroup.displayName = 'CommandGroup'

/* -------------------------------------------------------------------------------------------------
 * Command Item
 * -----------------------------------------------------------------------------------------------*/

type CommandItemElement = ElementRef<typeof Primitive.div>
interface CommandItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  disabled?: boolean
  value?: string
  keywords?: string[]
  forceMount?: boolean
  onSelect?: (value: string) => void
}

const CommandItem = forwardRef<CommandItemElement, CommandItemProps>(
  ({ children, disabled, value, keywords, forceMount, onSelect, ...props }, ref) => {
    const context = useCommandContext('Item')
    const itemValue = value || (typeof children === 'string' ? children : '')
    const isSelected = context.selectedValue === itemValue

    const handleSelect = useCallback(() => {
      if (!disabled) {
        context.setSelectedValue(itemValue)
        onSelect?.(itemValue)
      }
    }, [disabled, itemValue, context, onSelect])

    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-item=""
        role="option"
        aria-disabled={disabled || undefined}
        aria-selected={isSelected}
        data-disabled={disabled ? '' : undefined}
        data-selected={isSelected ? '' : undefined}
        data-value={itemValue}
        onClick={handleSelect}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === 'Enter' && !disabled) {
            handleSelect()
          }
        }}
      >
        {children}
      </Primitive.div>
    )
  }
)
CommandItem.displayName = 'CommandItem'

/* -------------------------------------------------------------------------------------------------
 * Command Separator
 * -----------------------------------------------------------------------------------------------*/

type CommandSeparatorElement = ElementRef<typeof Primitive.div>
interface CommandSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  alwaysRender?: boolean
}

const CommandSeparator = forwardRef<CommandSeparatorElement, CommandSeparatorProps>(
  ({ alwaysRender, ...props }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        {...props}
        cmdk-separator=""
        role="separator"
      />
    )
  }
)
CommandSeparator.displayName = 'CommandSeparator'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

// Attach sub-components to Command for namespace pattern (cmdk-compatible)
const CommandWithSubComponents = Object.assign(Command, {
  Input: CommandInput,
  List: CommandList,
  Empty: CommandEmpty,
  Loading: CommandLoading,
  Group: CommandGroup,
  Item: CommandItem,
  Separator: CommandSeparator,
})

const Root = Command
const Input = CommandInput
const List = CommandList
const Empty = CommandEmpty
const Loading = CommandLoading
const Group = CommandGroup
const Item = CommandItem
const Separator = CommandSeparator

// Default export as namespace (cmdk-compatible)
export { CommandWithSubComponents as Command }

// Named exports for namespace pattern
export {
  Root,
  Input,
  List,
  Empty,
  Loading,
  Group,
  Item,
  Separator,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandLoading,
  CommandGroup,
  CommandItem,
  CommandSeparator,
}

export type {
  CommandProps,
  CommandInputProps,
  CommandListProps,
  CommandEmptyProps,
  CommandLoadingProps,
  CommandGroupProps,
  CommandItemProps,
  CommandSeparatorProps,
}

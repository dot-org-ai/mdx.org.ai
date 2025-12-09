/**
 * @mdxui/headless - Listbox component
 * A headless listbox/select component
 * API compatible with @headlessui/react Listbox
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type MouseEvent<T = Element> = React.MouseEvent<T>
type KeyboardEvent<T = Element> = React.KeyboardEvent<T>
type FocusEvent<T = Element> = React.FocusEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface ListboxContextValue<T = any> {
  open: boolean
  setOpen: (open: boolean) => void
  value: T
  onChange: (value: T) => void
  buttonId: string
  optionsId: string
  labelId: string
  activeIndex: number
  setActiveIndex: (index: number) => void
  options: HTMLElement[]
  registerOption: (element: HTMLElement) => void
  unregisterOption: (element: HTMLElement) => void
  multiple: boolean
  disabled: boolean
}

const ListboxContext = createContext<ListboxContextValue | null>(null)

function useListboxContext(component: string) {
  const context = useContext(ListboxContext)
  if (!context) {
    throw new Error(`<Listbox.${component} /> must be used within <Listbox />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Listbox Root
 * -----------------------------------------------------------------------------------------------*/

type ListboxElement = ElementRef<typeof Primitive.div>
interface ListboxProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'value' | 'defaultValue' | 'onChange' | 'children'> {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  name?: string
  disabled?: boolean
  horizontal?: boolean
  multiple?: boolean
  by?: string | ((a: T, b: T) => boolean)
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; disabled: boolean; value: T }) => ReactNode)
}

function ListboxRoot<T>({
  children,
  value: controlledValue,
  defaultValue,
  onChange: controlledOnChange,
  disabled = false,
  multiple = false,
  ...props
}: ListboxProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [options, setOptions] = useState<HTMLElement[]>([])
  const buttonId = useId()
  const optionsId = useId()
  const labelId = useId()

  const value = controlledValue !== undefined ? controlledValue : internalValue
  const onChange = useCallback(
    (newValue: T) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      controlledOnChange?.(newValue)
      if (!multiple) {
        setOpen(false)
      }
    },
    [controlledValue, controlledOnChange, multiple]
  )

  const registerOption = useCallback((element: HTMLElement) => {
    setOptions((prev) => [...prev, element])
  }, [])

  const unregisterOption = useCallback((element: HTMLElement) => {
    setOptions((prev) => prev.filter((opt) => opt !== element))
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handleClick = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`[data-headlessui-listbox]`)) {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      value,
      onChange,
      buttonId,
      optionsId,
      labelId,
      activeIndex,
      setActiveIndex,
      options,
      registerOption,
      unregisterOption,
      multiple,
      disabled,
    }),
    [open, value, onChange, buttonId, optionsId, labelId, activeIndex, options, registerOption, unregisterOption, multiple, disabled]
  )

  const resolvedChildren =
    typeof children === 'function' ? children({ open, disabled, value: value as T }) : children

  return (
    <ListboxContext.Provider value={contextValue as any}>
      <Primitive.div
        data-headlessui-listbox=""
        data-headlessui-state={`${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`.trim()}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    </ListboxContext.Provider>
  )
}
ListboxRoot.displayName = 'Listbox'

/* -------------------------------------------------------------------------------------------------
 * Listbox Label
 * -----------------------------------------------------------------------------------------------*/

type ListboxLabelElement = ElementRef<typeof Primitive.label>
interface ListboxLabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {}

const ListboxLabel = forwardRef<ListboxLabelElement, ListboxLabelProps>((props, ref) => {
  const context = useListboxContext('Label')

  return (
    <Primitive.label
      ref={ref}
      id={context.labelId}
      data-headlessui-state={context.open ? 'open' : ''}
      {...props}
    />
  )
})
ListboxLabel.displayName = 'ListboxLabel'

/* -------------------------------------------------------------------------------------------------
 * Listbox Button
 * -----------------------------------------------------------------------------------------------*/

type ListboxButtonElement = ElementRef<typeof Primitive.button>
interface ListboxButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; disabled: boolean; value: any }) => ReactNode)
}

const ListboxButton = forwardRef<ListboxButtonElement, ListboxButtonProps>(
  ({ children, onClick, onKeyDown, ...props }, ref) => {
    const context = useListboxContext('Button')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (context.disabled) return
        context.setOpen(!context.open)
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        if (context.disabled) return

        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          context.setOpen(true)
          context.setActiveIndex(0)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          context.setOpen(true)
          context.setActiveIndex(context.options.length - 1)
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    const resolvedChildren =
      typeof children === 'function'
        ? children({ open: context.open, disabled: context.disabled, value: context.value })
        : children

    return (
      <Primitive.button
        ref={ref}
        id={context.buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={context.open}
        aria-controls={context.optionsId}
        aria-labelledby={context.labelId}
        disabled={context.disabled}
        data-headlessui-state={`${context.open ? 'open' : ''} ${context.disabled ? 'disabled' : ''}`.trim()}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
ListboxButton.displayName = 'ListboxButton'

/* -------------------------------------------------------------------------------------------------
 * Listbox Options
 * -----------------------------------------------------------------------------------------------*/

type ListboxOptionsElement = ElementRef<typeof Primitive.ul>
interface ListboxOptionsProps extends ComponentPropsWithoutRef<typeof Primitive.ul> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  anchor?: 'top' | 'right' | 'bottom' | 'left'
}

const ListboxOptions = forwardRef<ListboxOptionsElement, ListboxOptionsProps>(
  ({ children, static: isStatic = false, unmount = true, onKeyDown, ...props }, ref) => {
    const context = useListboxContext('Options')

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLUListElement>) => {
        const { options, activeIndex, setActiveIndex, setOpen } = context

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setActiveIndex(Math.min(activeIndex + 1, options.length - 1))
            break
          case 'ArrowUp':
            e.preventDefault()
            setActiveIndex(Math.max(activeIndex - 1, 0))
            break
          case 'Home':
            e.preventDefault()
            setActiveIndex(0)
            break
          case 'End':
            e.preventDefault()
            setActiveIndex(options.length - 1)
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (activeIndex >= 0 && options[activeIndex]) {
              options[activeIndex].click()
            }
            break
          case 'Tab':
            e.preventDefault()
            setOpen(false)
            break
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    // Focus active option
    useEffect(() => {
      const activeOption = context.options[context.activeIndex]
      if (context.open && context.activeIndex >= 0 && activeOption) {
        activeOption.focus()
      }
    }, [context.open, context.activeIndex, context.options])

    if (!isStatic && !context.open && unmount) {
      return null
    }

    return (
      <Primitive.ul
        ref={ref}
        id={context.optionsId}
        role="listbox"
        aria-labelledby={context.buttonId}
        aria-orientation="vertical"
        aria-multiselectable={context.multiple || undefined}
        tabIndex={-1}
        data-headlessui-state={context.open ? 'open' : ''}
        hidden={!isStatic && !context.open ? true : undefined}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </Primitive.ul>
    )
  }
)
ListboxOptions.displayName = 'ListboxOptions'

/* -------------------------------------------------------------------------------------------------
 * Listbox Option
 * -----------------------------------------------------------------------------------------------*/

type ListboxOptionElement = ElementRef<typeof Primitive.li>
interface ListboxOptionProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.li>, 'value' | 'children'> {
  value: T
  disabled?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { active: boolean; selected: boolean; disabled: boolean }) => ReactNode)
}

function ListboxOption<T>({
  children,
  value,
  disabled = false,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: ListboxOptionProps<T>) {
  const context = useListboxContext('Option')
  const optionRef = useRef<HTMLLIElement>(null)
  const [index, setIndex] = useState(-1)

  const active = context.activeIndex === index
  const selected = context.multiple
    ? Array.isArray(context.value) && context.value.includes(value)
    : context.value === value

  // Register option
  useEffect(() => {
    const element = optionRef.current
    if (!element || disabled) return

    context.registerOption(element)
    setIndex(context.options.indexOf(element))

    return () => {
      context.unregisterOption(element)
    }
  }, [context, disabled])

  // Update index when options change
  useEffect(() => {
    const element = optionRef.current
    if (element) {
      setIndex(context.options.indexOf(element))
    }
  }, [context.options])

  const handleClick = useCallback(
    (e: MouseEvent<HTMLLIElement>) => {
      if (disabled) {
        e.preventDefault()
        return
      }

      if (context.multiple && Array.isArray(context.value)) {
        const newValue = selected
          ? context.value.filter((v: T) => v !== value)
          : [...context.value, value]
        context.onChange(newValue)
      } else {
        context.onChange(value)
      }
      ;(onClick as any)?.(e)
    },
    [context, disabled, value, selected, onClick]
  )

  const handleMouseEnter = useCallback(
    (e: MouseEvent<HTMLLIElement>) => {
      if (!disabled) {
        context.setActiveIndex(index)
      }
      ;(onMouseEnter as any)?.(e)
    },
    [context, disabled, index, onMouseEnter]
  )

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLLIElement>) => {
      if (!disabled) {
        context.setActiveIndex(index)
      }
      ;(onFocus as any)?.(e)
    },
    [context, disabled, index, onFocus]
  )

  const resolvedChildren =
    typeof children === 'function' ? children({ active, selected, disabled }) : children

  return (
    <Primitive.li
      ref={optionRef}
      role="option"
      tabIndex={-1}
      aria-disabled={disabled || undefined}
      aria-selected={selected}
      data-headlessui-state={`${active ? 'active' : ''} ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`.trim()}
      data-active={active ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      {...props}
    >
      {resolvedChildren}
    </Primitive.li>
  )
}
ListboxOption.displayName = 'ListboxOption'

/* -------------------------------------------------------------------------------------------------
 * Listbox Selected Option
 * -----------------------------------------------------------------------------------------------*/

type ListboxSelectedOptionElement = ElementRef<typeof Primitive.span>
interface ListboxSelectedOptionProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  options: any[]
  placeholder?: ReactNode
}

const ListboxSelectedOption = forwardRef<ListboxSelectedOptionElement, ListboxSelectedOptionProps>(
  ({ children, options, placeholder, ...props }, ref) => {
    const context = useListboxContext('SelectedOption')

    const selectedOption = options.find((opt) => opt.value === context.value)

    return (
      <Primitive.span ref={ref} {...props}>
        {selectedOption ? children : placeholder}
      </Primitive.span>
    )
  }
)
ListboxSelectedOption.displayName = 'ListboxSelectedOption'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Listbox = Object.assign(ListboxRoot, {
  Label: ListboxLabel,
  Button: ListboxButton,
  Options: ListboxOptions,
  Option: ListboxOption,
  SelectedOption: ListboxSelectedOption,
})

export {
  Listbox,
  ListboxLabel,
  ListboxButton,
  ListboxOptions,
  ListboxOption,
  ListboxSelectedOption,
}
export type {
  ListboxProps,
  ListboxLabelProps,
  ListboxButtonProps,
  ListboxOptionsProps,
  ListboxOptionProps,
  ListboxSelectedOptionProps,
}

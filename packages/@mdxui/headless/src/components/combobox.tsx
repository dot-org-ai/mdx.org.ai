/**
 * @mdxui/headless - Combobox component
 * A headless combobox/autocomplete component
 * API compatible with @headlessui/react Combobox
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

type KeyboardEvent<T = Element> = React.KeyboardEvent<T>
type ChangeEvent<T = Element> = React.ChangeEvent<T>
type FocusEvent<T = Element> = React.FocusEvent<T>
type MouseEvent<T = Element> = React.MouseEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface ComboboxContextValue<T = any> {
  open: boolean
  setOpen: (open: boolean) => void
  value: T
  onChange: (value: T) => void
  inputValue: string
  setInputValue: (value: string) => void
  inputId: string
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
  nullable: boolean
  displayValue: (value: T) => string
}

const ComboboxContext = createContext<ComboboxContextValue | null>(null)

function useComboboxContext(component: string) {
  const context = useContext(ComboboxContext)
  if (!context) {
    throw new Error(`<Combobox.${component} /> must be used within <Combobox />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Combobox Root
 * -----------------------------------------------------------------------------------------------*/

type ComboboxElement = ElementRef<typeof Primitive.div>
interface ComboboxProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'value' | 'defaultValue' | 'onChange' | 'children'> {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  name?: string
  disabled?: boolean
  multiple?: boolean
  nullable?: boolean
  by?: string | ((a: T, b: T) => boolean)
  immediate?: boolean
  virtual?: { options: T[] }
  onClose?: () => void
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; disabled: boolean; activeIndex: number; activeOption: T | null; value: T }) => ReactNode)
}

function ComboboxRoot<T>({
  children,
  value: controlledValue,
  defaultValue,
  onChange: controlledOnChange,
  disabled = false,
  multiple = false,
  nullable = false,
  onClose,
  ...props
}: ComboboxProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const [open, setOpenState] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [options, setOptions] = useState<HTMLElement[]>([])
  const inputId = useId()
  const buttonId = useId()
  const optionsId = useId()
  const labelId = useId()

  const value = controlledValue !== undefined ? controlledValue : internalValue

  const setOpen = useCallback(
    (newOpen: boolean) => {
      setOpenState(newOpen)
      if (!newOpen) {
        onClose?.()
        setActiveIndex(-1)
      }
    },
    [onClose]
  )

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
    [controlledValue, controlledOnChange, multiple, setOpen]
  )

  const displayValue = useCallback((val: T): string => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'string') return val
    if (typeof val === 'object' && 'name' in (val as any)) return (val as any).name
    return String(val)
  }, [])

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
      if (!target.closest(`[data-headlessui-combobox]`)) {
        setOpen(false)
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open, setOpen])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        setOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, setOpen])

  const activeOption = activeIndex >= 0 ? options[activeIndex] : null

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      value,
      onChange,
      inputValue,
      setInputValue,
      inputId,
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
      nullable,
      displayValue,
    }),
    [open, setOpen, value, onChange, inputValue, inputId, buttonId, optionsId, labelId, activeIndex, options, registerOption, unregisterOption, multiple, disabled, nullable, displayValue]
  )

  const resolvedChildren =
    typeof children === 'function'
      ? children({ open, disabled, activeIndex, activeOption: activeOption as any, value: value as T })
      : children

  return (
    <ComboboxContext.Provider value={contextValue as any}>
      <Primitive.div
        data-headlessui-combobox=""
        data-headlessui-state={`${open ? 'open' : ''} ${disabled ? 'disabled' : ''}`.trim()}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    </ComboboxContext.Provider>
  )
}
ComboboxRoot.displayName = 'Combobox'

/* -------------------------------------------------------------------------------------------------
 * Combobox Label
 * -----------------------------------------------------------------------------------------------*/

type ComboboxLabelElement = ElementRef<typeof Primitive.label>
interface ComboboxLabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {}

const ComboboxLabel = forwardRef<ComboboxLabelElement, ComboboxLabelProps>((props, ref) => {
  const context = useComboboxContext('Label')

  return (
    <Primitive.label
      ref={ref}
      id={context.labelId}
      htmlFor={context.inputId}
      data-headlessui-state={context.open ? 'open' : ''}
      {...props}
    />
  )
})
ComboboxLabel.displayName = 'ComboboxLabel'

/* -------------------------------------------------------------------------------------------------
 * Combobox Input
 * -----------------------------------------------------------------------------------------------*/

type ComboboxInputElement = ElementRef<typeof Primitive.input>
interface ComboboxInputProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.input>, 'onChange' | 'value'> {
  displayValue?: (value: T) => string
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

function ComboboxInput<T>({
  displayValue: customDisplayValue,
  onChange,
  onFocus,
  onKeyDown,
  ...props
}: ComboboxInputProps<T>) {
  const context = useComboboxContext('Input')
  const inputRef = useRef<HTMLInputElement>(null)

  const displayFn = customDisplayValue || context.displayValue
  const displayedValue = context.value ? displayFn(context.value) : context.inputValue

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      context.setInputValue(e.target.value)
      context.setOpen(true)
      onChange?.(e)
    },
    [context, onChange]
  )

  const handleFocus = useCallback(
    (e: FocusEvent<HTMLInputElement>) => {
      context.setOpen(true)
      ;(onFocus as any)?.(e)
    },
    [context, onFocus]
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const { options, activeIndex, setActiveIndex, setOpen, open } = context

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          if (!open) {
            setOpen(true)
            setActiveIndex(0)
          } else {
            setActiveIndex(Math.min(activeIndex + 1, options.length - 1))
          }
          break
        case 'ArrowUp':
          e.preventDefault()
          if (!open) {
            setOpen(true)
            setActiveIndex(options.length - 1)
          } else {
            setActiveIndex(Math.max(activeIndex - 1, 0))
          }
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
          if (open && activeIndex >= 0 && options[activeIndex]) {
            e.preventDefault()
            options[activeIndex].click()
          }
          break
        case 'Tab':
          setOpen(false)
          break
      }
      ;(onKeyDown as any)?.(e)
    },
    [context, onKeyDown]
  )

  return (
    <Primitive.input
      ref={inputRef}
      id={context.inputId}
      type="text"
      role="combobox"
      aria-controls={context.optionsId}
      aria-expanded={context.open}
      aria-activedescendant={context.activeIndex >= 0 ? context.options[context.activeIndex]?.id : undefined}
      aria-labelledby={context.labelId}
      aria-autocomplete="list"
      autoComplete="off"
      disabled={context.disabled}
      data-headlessui-state={`${context.open ? 'open' : ''} ${context.disabled ? 'disabled' : ''}`.trim()}
      value={displayedValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}
ComboboxInput.displayName = 'ComboboxInput'

/* -------------------------------------------------------------------------------------------------
 * Combobox Button
 * -----------------------------------------------------------------------------------------------*/

type ComboboxButtonElement = ElementRef<typeof Primitive.button>
interface ComboboxButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; disabled: boolean; value: any }) => ReactNode)
}

const ComboboxButton = forwardRef<ComboboxButtonElement, ComboboxButtonProps>(
  ({ children, onClick, ...props }, ref) => {
    const context = useComboboxContext('Button')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (context.disabled) return
        context.setOpen(!context.open)
        ;(onClick as any)?.(e)
      },
      [context, onClick]
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
        tabIndex={-1}
        aria-haspopup="listbox"
        aria-expanded={context.open}
        aria-controls={context.optionsId}
        aria-labelledby={context.labelId}
        disabled={context.disabled}
        data-headlessui-state={`${context.open ? 'open' : ''} ${context.disabled ? 'disabled' : ''}`.trim()}
        onClick={handleClick}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
ComboboxButton.displayName = 'ComboboxButton'

/* -------------------------------------------------------------------------------------------------
 * Combobox Options
 * -----------------------------------------------------------------------------------------------*/

type ComboboxOptionsElement = ElementRef<typeof Primitive.ul>
interface ComboboxOptionsProps extends ComponentPropsWithoutRef<typeof Primitive.ul> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  hold?: boolean
  anchor?: 'top' | 'right' | 'bottom' | 'left'
}

const ComboboxOptions = forwardRef<ComboboxOptionsElement, ComboboxOptionsProps>(
  ({ children, static: isStatic = false, unmount = true, ...props }, ref) => {
    const context = useComboboxContext('Options')

    // Focus active option
    useEffect(() => {
      const activeOption = context.options[context.activeIndex]
      if (context.open && context.activeIndex >= 0 && activeOption) {
        activeOption.scrollIntoView({ block: 'nearest' })
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
        aria-labelledby={context.inputId}
        aria-multiselectable={context.multiple || undefined}
        tabIndex={-1}
        data-headlessui-state={context.open ? 'open' : ''}
        hidden={!isStatic && !context.open ? true : undefined}
        {...props}
      >
        {children}
      </Primitive.ul>
    )
  }
)
ComboboxOptions.displayName = 'ComboboxOptions'

/* -------------------------------------------------------------------------------------------------
 * Combobox Option
 * -----------------------------------------------------------------------------------------------*/

type ComboboxOptionElement = ElementRef<typeof Primitive.li>
interface ComboboxOptionProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.li>, 'value' | 'children'> {
  value: T
  disabled?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { active: boolean; selected: boolean; disabled: boolean }) => ReactNode)
}

function ComboboxOption<T>({
  children,
  value,
  disabled = false,
  onClick,
  onMouseEnter,
  onFocus,
  ...props
}: ComboboxOptionProps<T>) {
  const context = useComboboxContext('Option')
  const optionRef = useRef<HTMLLIElement>(null)
  const [index, setIndex] = useState(-1)
  const optionId = useId()

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
        context.setInputValue(context.displayValue(value))
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
      id={optionId}
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
ComboboxOption.displayName = 'ComboboxOption'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Combobox = Object.assign(ComboboxRoot, {
  Label: ComboboxLabel,
  Input: ComboboxInput,
  Button: ComboboxButton,
  Options: ComboboxOptions,
  Option: ComboboxOption,
})

export {
  Combobox,
  ComboboxLabel,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption,
}
export type {
  ComboboxProps,
  ComboboxLabelProps,
  ComboboxInputProps,
  ComboboxButtonProps,
  ComboboxOptionsProps,
  ComboboxOptionProps,
}

/**
 * @mdxui/headless - RadioGroup component
 * A headless radio group component
 * API compatible with @headlessui/react RadioGroup
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

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface RadioGroupContextValue<T = any> {
  value: T
  onChange: (value: T) => void
  disabled: boolean
  name: string | undefined
  labelId: string
  descriptionId: string
  options: HTMLElement[]
  registerOption: (element: HTMLElement) => void
  unregisterOption: (element: HTMLElement) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null)

function useRadioGroupContext(component: string) {
  const context = useContext(RadioGroupContext)
  if (!context) {
    throw new Error(`<RadioGroup.${component} /> must be used within <RadioGroup />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Radio Option Context
 * -----------------------------------------------------------------------------------------------*/

interface RadioOptionContextValue {
  checked: boolean
  disabled: boolean
  optionId: string
  labelId: string
  descriptionId: string
}

const RadioOptionContext = createContext<RadioOptionContextValue | null>(null)

function useRadioOptionContext(component: string) {
  const context = useContext(RadioOptionContext)
  if (!context) {
    throw new Error(`<RadioGroup.${component} /> must be used within <RadioGroup.Option />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * RadioGroup
 * -----------------------------------------------------------------------------------------------*/

type RadioGroupElement = ElementRef<typeof Primitive.div>
interface RadioGroupProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'value' | 'defaultValue' | 'onChange' | 'children'> {
  value?: T
  defaultValue?: T
  onChange?: (value: T) => void
  name?: string
  disabled?: boolean
  by?: string | ((a: T, b: T) => boolean)
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { value: T }) => ReactNode)
}

function RadioGroupRoot<T>({
  children,
  value: controlledValue,
  defaultValue,
  onChange: controlledOnChange,
  name,
  disabled = false,
  onKeyDown,
  ...props
}: RadioGroupProps<T>) {
  const [internalValue, setInternalValue] = useState<T | undefined>(defaultValue)
  const [options, setOptions] = useState<HTMLElement[]>([])
  const labelId = useId()
  const descriptionId = useId()

  const value = controlledValue !== undefined ? controlledValue : internalValue

  const onChange = useCallback(
    (newValue: T) => {
      if (controlledValue === undefined) {
        setInternalValue(newValue)
      }
      controlledOnChange?.(newValue)
    },
    [controlledValue, controlledOnChange]
  )

  const registerOption = useCallback((element: HTMLElement) => {
    setOptions((prev) => [...prev, element])
  }, [])

  const unregisterOption = useCallback((element: HTMLElement) => {
    setOptions((prev) => prev.filter((opt) => opt !== element))
  }, [])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = options.findIndex((opt) => opt === document.activeElement)

      let nextIndex = currentIndex
      switch (e.key) {
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1
          break
        case 'Home':
          e.preventDefault()
          nextIndex = 0
          break
        case 'End':
          e.preventDefault()
          nextIndex = options.length - 1
          break
        case ' ':
        case 'Enter':
          e.preventDefault()
          if (currentIndex >= 0) {
            options[currentIndex]?.click()
          }
          return
        default:
          return
      }

      const nextOption = options[nextIndex]
      if (nextIndex !== currentIndex && nextOption) {
        nextOption.focus()
        nextOption.click()
      }

      ;(onKeyDown as any)?.(e)
    },
    [options, onKeyDown]
  )

  const contextValue = useMemo(
    () => ({
      value,
      onChange,
      disabled,
      name,
      labelId,
      descriptionId,
      options,
      registerOption,
      unregisterOption,
    }),
    [value, onChange, disabled, name, labelId, descriptionId, options, registerOption, unregisterOption]
  )

  const resolvedChildren =
    typeof children === 'function' ? children({ value: value as T }) : children

  return (
    <RadioGroupContext.Provider value={contextValue as any}>
      <Primitive.div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-disabled={disabled || undefined}
        data-headlessui-state={disabled ? 'disabled' : ''}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    </RadioGroupContext.Provider>
  )
}
RadioGroupRoot.displayName = 'RadioGroup'

/* -------------------------------------------------------------------------------------------------
 * RadioGroup Label
 * -----------------------------------------------------------------------------------------------*/

type RadioGroupLabelElement = ElementRef<typeof Primitive.label>
interface RadioGroupLabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {
  passive?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const RadioGroupLabel = forwardRef<RadioGroupLabelElement, RadioGroupLabelProps>(
  ({ passive = false, ...props }, ref) => {
    // Try option context first, then group context
    let labelId: string | undefined
    try {
      const optionContext = useRadioOptionContext('Label')
      labelId = optionContext.labelId
    } catch {
      try {
        const groupContext = useRadioGroupContext('Label')
        labelId = groupContext.labelId
      } catch {
        // Not in any context
      }
    }

    return (
      <Primitive.label
        ref={ref}
        id={labelId}
        {...props}
      />
    )
  }
)
RadioGroupLabel.displayName = 'RadioGroupLabel'

/* -------------------------------------------------------------------------------------------------
 * RadioGroup Description
 * -----------------------------------------------------------------------------------------------*/

type RadioGroupDescriptionElement = ElementRef<typeof Primitive.p>
interface RadioGroupDescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const RadioGroupDescription = forwardRef<RadioGroupDescriptionElement, RadioGroupDescriptionProps>(
  (props, ref) => {
    // Try option context first, then group context
    let descriptionId: string | undefined
    try {
      const optionContext = useRadioOptionContext('Description')
      descriptionId = optionContext.descriptionId
    } catch {
      try {
        const groupContext = useRadioGroupContext('Description')
        descriptionId = groupContext.descriptionId
      } catch {
        // Not in any context
      }
    }

    return (
      <Primitive.p
        ref={ref}
        id={descriptionId}
        {...props}
      />
    )
  }
)
RadioGroupDescription.displayName = 'RadioGroupDescription'

/* -------------------------------------------------------------------------------------------------
 * RadioGroup Option
 * -----------------------------------------------------------------------------------------------*/

type RadioGroupOptionElement = ElementRef<typeof Primitive.div>
interface RadioGroupOptionProps<T = any> extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'value' | 'children'> {
  value: T
  disabled?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { checked: boolean; disabled: boolean; active: boolean }) => ReactNode)
}

function RadioGroupOption<T>({
  children,
  value,
  disabled: optionDisabled = false,
  onClick,
  onFocus,
  ...props
}: RadioGroupOptionProps<T>) {
  const context = useRadioGroupContext('Option')
  const optionRef = useRef<HTMLDivElement>(null)
  const optionId = useId()
  const labelId = useId()
  const descriptionId = useId()
  const [active, setActive] = useState(false)

  const disabled = context.disabled || optionDisabled
  const checked = context.value === value

  // Register option
  useEffect(() => {
    const element = optionRef.current
    if (!element || disabled) return

    context.registerOption(element)

    return () => {
      context.unregisterOption(element)
    }
  }, [context, disabled])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) {
        e.preventDefault()
        return
      }
      context.onChange(value)
      ;(onClick as any)?.(e)
    },
    [context, disabled, value, onClick]
  )

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLDivElement>) => {
      setActive(true)
      ;(onFocus as any)?.(e)
    },
    [onFocus]
  )

  const handleBlur = useCallback(() => {
    setActive(false)
  }, [])

  const optionContextValue = useMemo(
    () => ({
      checked,
      disabled,
      optionId,
      labelId,
      descriptionId,
    }),
    [checked, disabled, optionId, labelId, descriptionId]
  )

  const resolvedChildren =
    typeof children === 'function' ? children({ checked, disabled, active }) : children

  return (
    <RadioOptionContext.Provider value={optionContextValue}>
      <Primitive.div
        ref={optionRef}
        id={optionId}
        role="radio"
        tabIndex={checked ? 0 : -1}
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-disabled={disabled || undefined}
        data-headlessui-state={`${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`.trim()}
        data-checked={checked ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        data-active={active ? '' : undefined}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
      {context.name && checked && (
        <input type="hidden" name={context.name} value={String(value)} />
      )}
    </RadioOptionContext.Provider>
  )
}
RadioGroupOption.displayName = 'RadioGroupOption'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const RadioGroup = Object.assign(RadioGroupRoot, {
  Label: RadioGroupLabel,
  Description: RadioGroupDescription,
  Option: RadioGroupOption,
})

const Radio = RadioGroupOption

export { RadioGroup, Radio, RadioGroupLabel, RadioGroupDescription, RadioGroupOption }
export type {
  RadioGroupProps,
  RadioGroupLabelProps,
  RadioGroupDescriptionProps,
  RadioGroupOptionProps,
}

/**
 * @mdxui/headless - Checkbox component
 * A headless checkbox component
 * API compatible with @headlessui/react Checkbox
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useId,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type KeyboardEvent<T = Element> = React.KeyboardEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface CheckboxContextValue {
  checked: boolean | 'indeterminate'
  disabled: boolean
  checkboxId: string
  labelId: string
  descriptionId: string
}

const CheckboxContext = createContext<CheckboxContextValue | null>(null)

function useCheckboxContext(component: string) {
  const context = useContext(CheckboxContext)
  if (!context) {
    throw new Error(`<Checkbox.${component} /> must be used within <Checkbox.Group /> or provide context`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Checkbox Group
 * -----------------------------------------------------------------------------------------------*/

type CheckboxGroupElement = ElementRef<typeof Primitive.div>
interface CheckboxGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const CheckboxGroup = forwardRef<CheckboxGroupElement, CheckboxGroupProps>(
  ({ children, ...props }, ref) => {
    return (
      <Primitive.div ref={ref} role="group" {...props}>
        {children}
      </Primitive.div>
    )
  }
)
CheckboxGroup.displayName = 'CheckboxGroup'

/* -------------------------------------------------------------------------------------------------
 * Checkbox
 * -----------------------------------------------------------------------------------------------*/

type CheckboxElement = ElementRef<typeof Primitive.span>
interface CheckboxProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.span>, 'onChange' | 'value' | 'defaultValue' | 'children'> {
  checked?: boolean | 'indeterminate'
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  name?: string
  value?: string
  disabled?: boolean
  indeterminate?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { checked: boolean | 'indeterminate'; disabled: boolean }) => ReactNode)
}

const CheckboxComponent = forwardRef<CheckboxElement, CheckboxProps>(
  (
    {
      children,
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      name,
      value = 'on',
      disabled = false,
      indeterminate = false,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked)
    const checkboxId = useId()
    const labelId = useId()
    const descriptionId = useId()

    const checked: boolean | 'indeterminate' = indeterminate
      ? 'indeterminate'
      : controlledChecked !== undefined
        ? controlledChecked
        : internalChecked

    const toggle = useCallback(() => {
      if (disabled) return
      const newChecked = checked === 'indeterminate' ? true : !checked
      if (controlledChecked === undefined) {
        setInternalChecked(newChecked)
      }
      onChange?.(newChecked)
    }, [checked, controlledChecked, disabled, onChange])

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLSpanElement>) => {
        e.preventDefault()
        toggle()
        ;(onClick as any)?.(e)
      },
      [toggle, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLSpanElement>) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          toggle()
        }
        ;(onKeyDown as any)?.(e)
      },
      [toggle, onKeyDown]
    )

    const contextValue = useMemo(
      () => ({
        checked,
        disabled,
        checkboxId,
        labelId,
        descriptionId,
      }),
      [checked, disabled, checkboxId, labelId, descriptionId]
    )

    const resolvedChildren = typeof children === 'function' ? children({ checked, disabled }) : children

    const dataState = checked === 'indeterminate' ? 'indeterminate' : checked ? 'checked' : 'unchecked'

    return (
      <CheckboxContext.Provider value={contextValue}>
        <Primitive.span
          ref={ref}
          id={checkboxId}
          role="checkbox"
          tabIndex={disabled ? undefined : 0}
          aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          aria-disabled={disabled || undefined}
          data-headlessui-state={`${dataState} ${disabled ? 'disabled' : ''}`.trim()}
          data-checked={checked === true ? '' : undefined}
          data-indeterminate={checked === 'indeterminate' ? '' : undefined}
          data-disabled={disabled ? '' : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {resolvedChildren}
        </Primitive.span>
        {name && (
          <input
            type="hidden"
            name={name}
            value={checked === true ? value : ''}
            disabled={disabled}
          />
        )}
      </CheckboxContext.Provider>
    )
  }
)
CheckboxComponent.displayName = 'Checkbox'

/* -------------------------------------------------------------------------------------------------
 * Checkbox Label (using Field components)
 * -----------------------------------------------------------------------------------------------*/

type CheckboxLabelElement = ElementRef<typeof Primitive.label>
interface CheckboxLabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const CheckboxLabel = forwardRef<CheckboxLabelElement, CheckboxLabelProps>((props, ref) => {
  let context: CheckboxContextValue | null = null
  try {
    context = useCheckboxContext('Label')
  } catch {
    // Not in a context, render without context
  }

  return (
    <Primitive.label
      ref={ref}
      id={context?.labelId}
      htmlFor={context?.checkboxId}
      data-headlessui-state={
        context
          ? `${context.checked === 'indeterminate' ? 'indeterminate' : context.checked ? 'checked' : 'unchecked'} ${context.disabled ? 'disabled' : ''}`.trim()
          : undefined
      }
      {...props}
    />
  )
})
CheckboxLabel.displayName = 'CheckboxLabel'

/* -------------------------------------------------------------------------------------------------
 * Checkbox Description
 * -----------------------------------------------------------------------------------------------*/

type CheckboxDescriptionElement = ElementRef<typeof Primitive.p>
interface CheckboxDescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const CheckboxDescription = forwardRef<CheckboxDescriptionElement, CheckboxDescriptionProps>(
  (props, ref) => {
    let context: CheckboxContextValue | null = null
    try {
      context = useCheckboxContext('Description')
    } catch {
      // Not in a context
    }

    return (
      <Primitive.p
        ref={ref}
        id={context?.descriptionId}
        data-headlessui-state={
          context
            ? `${context.checked === 'indeterminate' ? 'indeterminate' : context.checked ? 'checked' : 'unchecked'} ${context.disabled ? 'disabled' : ''}`.trim()
            : undefined
        }
        {...props}
      />
    )
  }
)
CheckboxDescription.displayName = 'CheckboxDescription'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Checkbox = Object.assign(CheckboxComponent, {
  Group: CheckboxGroup,
  Label: CheckboxLabel,
  Description: CheckboxDescription,
})

export { Checkbox, CheckboxGroup, CheckboxLabel, CheckboxDescription }
export type { CheckboxProps, CheckboxGroupProps, CheckboxLabelProps, CheckboxDescriptionProps }

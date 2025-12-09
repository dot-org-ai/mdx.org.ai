/**
 * @mdxui/headless - Switch component
 * A headless switch/toggle component
 * API compatible with @headlessui/react Switch
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

interface SwitchContextValue {
  checked: boolean
  disabled: boolean
  switchId: string
  labelId: string
  descriptionId: string
}

const SwitchContext = createContext<SwitchContextValue | null>(null)

function useSwitchContext(component: string) {
  const context = useContext(SwitchContext)
  if (!context) {
    throw new Error(`<Switch.${component} /> must be used within <Switch.Group />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Switch Group
 * -----------------------------------------------------------------------------------------------*/

type SwitchGroupElement = ElementRef<typeof Primitive.div>
interface SwitchGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const SwitchGroup = forwardRef<SwitchGroupElement, SwitchGroupProps>(
  ({ children, ...props }, ref) => {
    return (
      <Primitive.div ref={ref} {...props}>
        {children}
      </Primitive.div>
    )
  }
)
SwitchGroup.displayName = 'SwitchGroup'

/* -------------------------------------------------------------------------------------------------
 * Switch
 * -----------------------------------------------------------------------------------------------*/

type SwitchElement = ElementRef<typeof Primitive.button>
interface SwitchProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'onChange' | 'value' | 'defaultValue' | 'children'> {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
  name?: string
  value?: string
  disabled?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { checked: boolean }) => ReactNode)
}

const SwitchComponent = forwardRef<SwitchElement, SwitchProps>(
  (
    {
      children,
      checked: controlledChecked,
      defaultChecked = false,
      onChange,
      name,
      value = 'on',
      disabled = false,
      onClick,
      onKeyDown,
      ...props
    },
    ref
  ) => {
    const [internalChecked, setInternalChecked] = useState(defaultChecked)
    const switchId = useId()
    const labelId = useId()
    const descriptionId = useId()

    const checked = controlledChecked !== undefined ? controlledChecked : internalChecked

    const toggle = useCallback(() => {
      if (disabled) return
      const newChecked = !checked
      if (controlledChecked === undefined) {
        setInternalChecked(newChecked)
      }
      onChange?.(newChecked)
    }, [checked, controlledChecked, disabled, onChange])

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        toggle()
        ;(onClick as any)?.(e)
      },
      [toggle, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
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
        switchId,
        labelId,
        descriptionId,
      }),
      [checked, disabled, switchId, labelId, descriptionId]
    )

    const resolvedChildren = typeof children === 'function' ? children({ checked }) : children

    return (
      <SwitchContext.Provider value={contextValue}>
        <Primitive.button
          ref={ref}
          id={switchId}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={labelId}
          aria-describedby={descriptionId}
          disabled={disabled}
          data-headlessui-state={`${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}`.trim()}
          data-checked={checked ? '' : undefined}
          data-disabled={disabled ? '' : undefined}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          {...props}
        >
          {resolvedChildren}
        </Primitive.button>
        {name && (
          <input type="hidden" name={name} value={checked ? value : ''} />
        )}
      </SwitchContext.Provider>
    )
  }
)
SwitchComponent.displayName = 'Switch'

/* -------------------------------------------------------------------------------------------------
 * Switch Label
 * -----------------------------------------------------------------------------------------------*/

type SwitchLabelElement = ElementRef<typeof Primitive.label>
interface SwitchLabelProps extends ComponentPropsWithoutRef<typeof Primitive.label> {
  passive?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const SwitchLabel = forwardRef<SwitchLabelElement, SwitchLabelProps>(
  ({ passive = false, onClick, ...props }, ref) => {
    const context = useSwitchContext('Label')

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLLabelElement>) => {
        if (!passive) {
          e.preventDefault()
          document.getElementById(context.switchId)?.click()
        }
        ;(onClick as any)?.(e)
      },
      [context, passive, onClick]
    )

    return (
      <Primitive.label
        ref={ref}
        id={context.labelId}
        htmlFor={context.switchId}
        data-headlessui-state={`${context.checked ? 'checked' : ''} ${context.disabled ? 'disabled' : ''}`.trim()}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
SwitchLabel.displayName = 'SwitchLabel'

/* -------------------------------------------------------------------------------------------------
 * Switch Description
 * -----------------------------------------------------------------------------------------------*/

type SwitchDescriptionElement = ElementRef<typeof Primitive.p>
interface SwitchDescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const SwitchDescription = forwardRef<SwitchDescriptionElement, SwitchDescriptionProps>(
  (props, ref) => {
    const context = useSwitchContext('Description')

    return (
      <Primitive.p
        ref={ref}
        id={context.descriptionId}
        data-headlessui-state={`${context.checked ? 'checked' : ''} ${context.disabled ? 'disabled' : ''}`.trim()}
        {...props}
      />
    )
  }
)
SwitchDescription.displayName = 'SwitchDescription'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Switch = Object.assign(SwitchComponent, {
  Group: SwitchGroup,
  Label: SwitchLabel,
  Description: SwitchDescription,
})

export { Switch, SwitchGroup, SwitchLabel, SwitchDescription }
export type { SwitchProps, SwitchGroupProps, SwitchLabelProps, SwitchDescriptionProps }

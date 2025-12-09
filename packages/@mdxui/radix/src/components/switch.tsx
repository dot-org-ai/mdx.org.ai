import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'
import { useComposedRefs } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Switch
 * -----------------------------------------------------------------------------------------------*/

const SWITCH_NAME = 'Switch'

type ScopedProps<P> = P & { __scopeSwitch?: Scope }
const [createSwitchContext, createSwitchScope] = createContextScope(SWITCH_NAME)

type SwitchContextValue = {
  checked: boolean
  disabled?: boolean
}

const [SwitchProvider, useSwitchContext] =
  createSwitchContext<SwitchContextValue>(SWITCH_NAME)

type SwitchElement = ElementRef<typeof Primitive.button>
interface SwitchProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'checked' | 'defaultChecked'> {
  /**
   * The controlled checked state of the switch.
   */
  checked?: boolean
  /**
   * The checked state when initially rendered. Use when you do not need to control the state.
   */
  defaultChecked?: boolean
  /**
   * Whether the switch is required in a form.
   */
  required?: boolean
  /**
   * Event handler called when the checked state changes.
   */
  onCheckedChange?(checked: boolean): void
}

/**
 * Switch allows users to toggle between two states.
 *
 * @example
 * ```tsx
 * <Switch defaultChecked>
 *   <SwitchThumb />
 * </Switch>
 * ```
 */
const Switch = forwardRef<SwitchElement, ScopedProps<SwitchProps>>(
  (props, forwardedRef) => {
    const {
      __scopeSwitch,
      name,
      checked: checkedProp,
      defaultChecked,
      required,
      disabled,
      value = 'on',
      onCheckedChange,
      ...switchProps
    } = props

    const [button, setButton] = useState<HTMLButtonElement | null>(null)
    const composedRefs = useComposedRefs(forwardedRef, (node) => setButton(node))
    const hasConsumerStoppedPropagationRef = useRef(false)
    const isFormControl = button ? Boolean(button.closest('form')) : true

    const [checked = false, setChecked] = useControllableState({
      prop: checkedProp,
      defaultProp: defaultChecked,
      onChange: onCheckedChange,
    })

    return (
      <SwitchProvider scope={__scopeSwitch} checked={checked} disabled={disabled}>
        <Primitive.button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-required={required}
          data-state={getState(checked)}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
          value={value}
          {...switchProps}
          ref={composedRefs}
          onClick={composeEventHandlers(props.onClick, (event) => {
            setChecked((prevChecked) => !prevChecked)
            if (isFormControl) {
              hasConsumerStoppedPropagationRef.current = event.isPropagationStopped()
              if (!hasConsumerStoppedPropagationRef.current) event.stopPropagation()
            }
          })}
        />
        {isFormControl && (
          <BubbleInput
            control={button}
            bubbles={!hasConsumerStoppedPropagationRef.current}
            name={name}
            value={value}
            checked={checked}
            required={required}
            disabled={disabled}
            style={{ position: 'absolute', pointerEvents: 'none', opacity: 0, margin: 0 }}
          />
        )}
      </SwitchProvider>
    )
  }
)

Switch.displayName = SWITCH_NAME

/* -------------------------------------------------------------------------------------------------
 * SwitchThumb
 * -----------------------------------------------------------------------------------------------*/

const THUMB_NAME = 'SwitchThumb'

type SwitchThumbElement = ElementRef<typeof Primitive.span>
interface SwitchThumbProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}

const SwitchThumb = forwardRef<SwitchThumbElement, ScopedProps<SwitchThumbProps>>(
  (props, forwardedRef) => {
    const { __scopeSwitch, ...thumbProps } = props
    const context = useSwitchContext(THUMB_NAME, __scopeSwitch)

    return (
      <Primitive.span
        data-state={getState(context.checked)}
        data-disabled={context.disabled ? '' : undefined}
        {...thumbProps}
        ref={forwardedRef}
      />
    )
  }
)

SwitchThumb.displayName = THUMB_NAME

/* -------------------------------------------------------------------------------------------------
 * BubbleInput
 * -----------------------------------------------------------------------------------------------*/

interface BubbleInputProps extends ComponentPropsWithoutRef<'input'> {
  checked: boolean
  control: HTMLElement | null
  bubbles: boolean
}

const BubbleInput = (props: BubbleInputProps) => {
  const { control, checked, bubbles = true, ...inputProps } = props
  const ref = useRef<HTMLInputElement>(null)
  const prevChecked = useRef(checked)

  useEffect(() => {
    const input = ref.current!
    const inputProto = window.HTMLInputElement.prototype
    const descriptor = Object.getOwnPropertyDescriptor(
      inputProto,
      'checked'
    ) as PropertyDescriptor
    const setChecked = descriptor.set

    if (prevChecked.current !== checked && setChecked) {
      const event = new Event('click', { bubbles })
      setChecked.call(input, checked)
      input.dispatchEvent(event)
      prevChecked.current = checked
    }
  }, [checked, bubbles])

  return (
    <input
      type="checkbox"
      aria-hidden
      defaultChecked={checked}
      {...inputProps}
      tabIndex={-1}
      ref={ref}
      style={{
        ...inputProps.style,
        ...control ? { width: control.offsetWidth, height: control.offsetHeight } : {},
      }}
    />
  )
}

/* ---------------------------------------------------------------------------------------------- */

function getState(checked: boolean) {
  return checked ? 'checked' : 'unchecked'
}

const Root = Switch
const Thumb = SwitchThumb

export {
  createSwitchScope,
  Switch,
  SwitchThumb,
  Root,
  Thumb,
}
export type { SwitchProps, SwitchThumbProps }

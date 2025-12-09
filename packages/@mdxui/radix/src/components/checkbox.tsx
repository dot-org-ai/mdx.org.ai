import {
  forwardRef,
  useState,
  useRef,
  useEffect,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'
import { useComposedRefs } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Checkbox
 * -----------------------------------------------------------------------------------------------*/

const CHECKBOX_NAME = 'Checkbox'

type ScopedProps<P> = P & { __scopeCheckbox?: Scope }
const [createCheckboxContext, createCheckboxScope] = createContextScope(CHECKBOX_NAME)

type CheckedState = boolean | 'indeterminate'

type CheckboxContextValue = {
  state: CheckedState
  disabled?: boolean
}

const [CheckboxProvider, useCheckboxContext] =
  createCheckboxContext<CheckboxContextValue>(CHECKBOX_NAME)

type CheckboxElement = ElementRef<typeof Primitive.button>
interface CheckboxProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'checked' | 'defaultChecked'> {
  /**
   * The controlled checked state of the checkbox.
   */
  checked?: CheckedState
  /**
   * The checked state when initially rendered. Use when you do not need to control the state.
   */
  defaultChecked?: CheckedState
  /**
   * Whether the checkbox is required in a form.
   */
  required?: boolean
  /**
   * Event handler called when the checked state changes.
   */
  onCheckedChange?(checked: CheckedState): void
}

/**
 * Checkbox allows users to toggle between checked and unchecked states.
 *
 * @example
 * ```tsx
 * <Checkbox defaultChecked>
 *   <CheckboxIndicator>
 *     <CheckIcon />
 *   </CheckboxIndicator>
 * </Checkbox>
 * ```
 */
const Checkbox = forwardRef<CheckboxElement, ScopedProps<CheckboxProps>>(
  (props, forwardedRef) => {
    const {
      __scopeCheckbox,
      name,
      checked: checkedProp,
      defaultChecked,
      required,
      disabled,
      value = 'on',
      onCheckedChange,
      ...checkboxProps
    } = props

    const [button, setButton] = useState<HTMLButtonElement | null>(null)
    const composedRefs = useComposedRefs(forwardedRef, (node) => setButton(node))
    const hasConsumerStoppedPropagationRef = useRef(false)

    // We set this to true by default to indicate that the checkbox is rendered with a native input
    // If the consumer wraps our checkbox in a form, we need to render a native input
    const isFormControl = button ? Boolean(button.closest('form')) : true

    const [checked = false, setChecked] = useControllableState({
      prop: checkedProp,
      defaultProp: defaultChecked,
      onChange: onCheckedChange,
    })

    const initialCheckedStateRef = useRef(checked)
    useEffect(() => {
      const form = button?.form
      if (form) {
        const reset = () => setChecked(initialCheckedStateRef.current)
        form.addEventListener('reset', reset)
        return () => form.removeEventListener('reset', reset)
      }
      return undefined
    }, [button, setChecked])

    return (
      <CheckboxProvider scope={__scopeCheckbox} state={checked} disabled={disabled}>
        <Primitive.button
          type="button"
          role="checkbox"
          aria-checked={isIndeterminate(checked) ? 'mixed' : checked}
          aria-required={required}
          data-state={getState(checked)}
          data-disabled={disabled ? '' : undefined}
          disabled={disabled}
          value={value}
          {...checkboxProps}
          ref={composedRefs}
          onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
            // According to WAI ARIA, checkboxes don't activate on enter
            if (event.key === 'Enter') event.preventDefault()
          })}
          onClick={composeEventHandlers(props.onClick, (event) => {
            setChecked((prevChecked) =>
              isIndeterminate(prevChecked) ? true : !prevChecked
            )
            if (isFormControl) {
              hasConsumerStoppedPropagationRef.current = event.isPropagationStopped()
              // If checkbox is in a form, we need to stop propagation
              // so the form doesn't submit
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
            // We need to make the input hidden but still present for form submission
            style={{ position: 'absolute', pointerEvents: 'none', opacity: 0, margin: 0 }}
          />
        )}
      </CheckboxProvider>
    )
  }
)

Checkbox.displayName = CHECKBOX_NAME

/* -------------------------------------------------------------------------------------------------
 * CheckboxIndicator
 * -----------------------------------------------------------------------------------------------*/

const INDICATOR_NAME = 'CheckboxIndicator'

type CheckboxIndicatorElement = ElementRef<typeof Primitive.span>
interface CheckboxIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  /**
   * Used to force mounting when more control is needed. Useful when controlling animation with CSS.
   */
  forceMount?: true
}

const CheckboxIndicator = forwardRef<
  CheckboxIndicatorElement,
  ScopedProps<CheckboxIndicatorProps>
>((props, forwardedRef) => {
  const { __scopeCheckbox, forceMount, ...indicatorProps } = props
  const context = useCheckboxContext(INDICATOR_NAME, __scopeCheckbox)

  return forceMount || isIndeterminate(context.state) || context.state === true ? (
    <Primitive.span
      data-state={getState(context.state)}
      data-disabled={context.disabled ? '' : undefined}
      {...indicatorProps}
      ref={forwardedRef}
      style={{ pointerEvents: 'none', ...indicatorProps.style }}
    />
  ) : null
})

CheckboxIndicator.displayName = INDICATOR_NAME

/* -------------------------------------------------------------------------------------------------
 * BubbleInput
 * -----------------------------------------------------------------------------------------------*/

interface BubbleInputProps extends Omit<ComponentPropsWithoutRef<'input'>, 'checked'> {
  checked: CheckedState
  control: HTMLElement | null
  bubbles: boolean
}

const BubbleInput = (props: BubbleInputProps) => {
  const { control, checked, bubbles = true, ...inputProps } = props
  const ref = useRef<HTMLInputElement>(null)
  const prevChecked = useRef(checked)

  // Bubble the event to the parent form
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
      input.indeterminate = isIndeterminate(checked)
      setChecked.call(input, isIndeterminate(checked) ? false : checked)
      input.dispatchEvent(event)
      prevChecked.current = checked
    }
  }, [checked, bubbles])

  return (
    <input
      type="checkbox"
      aria-hidden
      defaultChecked={isIndeterminate(checked) ? false : checked}
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

function isIndeterminate(checked?: CheckedState): checked is 'indeterminate' {
  return checked === 'indeterminate'
}

function getState(checked: CheckedState) {
  return isIndeterminate(checked) ? 'indeterminate' : checked ? 'checked' : 'unchecked'
}

const Root = Checkbox
const Indicator = CheckboxIndicator

export {
  createCheckboxScope,
  Checkbox,
  CheckboxIndicator,
  Root,
  Indicator,
}
export type { CheckboxProps, CheckboxIndicatorProps, CheckedState }

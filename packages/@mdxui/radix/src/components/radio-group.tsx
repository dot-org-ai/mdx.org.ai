/**
 * @mdxui/radix - RadioGroup
 * A set of checkable buttons—known as radio buttons—where only one can be checked at a time.
 * TODO: Full implementation
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState, useDirection } from '@mdxui/jsx/hooks'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const RADIO_GROUP_NAME = 'RadioGroup'
type ScopedProps<P> = P & { __scopeRadioGroup?: Scope }
const [createRadioGroupContext, createRadioGroupScope] = createContextScope(RADIO_GROUP_NAME)

type RadioGroupContextValue = {
  value?: string
  onValueChange(value: string): void
  disabled?: boolean
  required?: boolean
}

const [RadioGroupProvider, useRadioGroupContext] =
  createRadioGroupContext<RadioGroupContextValue>(RADIO_GROUP_NAME)

type RadioGroupElement = ElementRef<typeof Primitive.div>
interface RadioGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  value?: string
  defaultValue?: string
  onValueChange?(value: string): void
  disabled?: boolean
  required?: boolean
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  loop?: boolean
}

const RadioGroup = forwardRef<RadioGroupElement, ScopedProps<RadioGroupProps>>((props, ref) => {
  const {
    __scopeRadioGroup,
    value: valueProp,
    defaultValue,
    onValueChange,
    disabled,
    required,
    orientation = 'vertical',
    dir,
    ...groupProps
  } = props

  const direction = useDirection(dir)
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  return (
    <RadioGroupProvider
      scope={__scopeRadioGroup}
      value={value}
      onValueChange={setValue}
      disabled={disabled}
      required={required}
    >
      <Primitive.div
        role="radiogroup"
        aria-required={required}
        aria-orientation={orientation}
        data-disabled={disabled ? '' : undefined}
        dir={direction}
        {...groupProps}
        ref={ref}
      />
    </RadioGroupProvider>
  )
})
RadioGroup.displayName = RADIO_GROUP_NAME

const RADIO_NAME = 'RadioGroupItem'

type RadioGroupItemElement = ElementRef<typeof Primitive.button>
interface RadioGroupItemProps extends ComponentPropsWithoutRef<typeof Primitive.button> {
  value: string
}

const RadioGroupItem = forwardRef<RadioGroupItemElement, ScopedProps<RadioGroupItemProps>>(
  (props, ref) => {
    const { __scopeRadioGroup, value, ...itemProps } = props
    const context = useRadioGroupContext(RADIO_NAME, __scopeRadioGroup)
    const checked = value === context.value
    const disabled = context.disabled || itemProps.disabled

    return (
      <Primitive.button
        type="button"
        role="radio"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        {...itemProps}
        ref={ref}
        onClick={() => {
          if (!disabled) {
            context.onValueChange(value)
          }
        }}
      />
    )
  }
)
RadioGroupItem.displayName = RADIO_NAME

type RadioGroupIndicatorElement = ElementRef<typeof Primitive.span>
interface RadioGroupIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  forceMount?: true
}

const RadioGroupIndicator = forwardRef<
  RadioGroupIndicatorElement,
  ScopedProps<RadioGroupIndicatorProps>
>((props, ref) => {
  const { __scopeRadioGroup, forceMount, ...indicatorProps } = props
  return <Primitive.span {...indicatorProps} ref={ref} />
})
RadioGroupIndicator.displayName = 'RadioGroupIndicator'

const Root = RadioGroup
const Item = RadioGroupItem
const Indicator = RadioGroupIndicator

export {
  createRadioGroupScope,
  RadioGroup,
  RadioGroupItem,
  RadioGroupIndicator,
  Root,
  Item,
  Indicator,
}
export type { RadioGroupProps, RadioGroupItemProps, RadioGroupIndicatorProps }

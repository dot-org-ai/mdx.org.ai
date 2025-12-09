/**
 * @mdxui/radix - ToggleGroup
 * A set of two-state buttons that can be toggled on or off.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState, useDirection } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'
import { Toggle } from './toggle'

const TOGGLE_GROUP_NAME = 'ToggleGroup'

type ScopedProps<P> = P & { __scopeToggleGroup?: Scope }
const [createToggleGroupContext, createToggleGroupScope] =
  createContextScope(TOGGLE_GROUP_NAME)

type ToggleGroupContextValue = {
  type: 'single' | 'multiple'
  value: string[]
  onItemActivate(value: string): void
  onItemDeactivate(value: string): void
  disabled?: boolean
}

const [ToggleGroupProvider, useToggleGroupContext] =
  createToggleGroupContext<ToggleGroupContextValue>(TOGGLE_GROUP_NAME)

type ToggleGroupElement = ElementRef<typeof Primitive.div>

interface ToggleGroupSingleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  type: 'single'
  value?: string
  defaultValue?: string
  onValueChange?(value: string): void
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
}

interface ToggleGroupMultipleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?(value: string[]): void
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
}

type ToggleGroupProps = ToggleGroupSingleProps | ToggleGroupMultipleProps

const ToggleGroup = forwardRef<ToggleGroupElement, ScopedProps<ToggleGroupProps>>(
  (props, forwardedRef) => {
    const { type, ...groupProps } = props

    if (type === 'single') {
      return <ToggleGroupImplSingle {...(groupProps as ToggleGroupSingleProps)} ref={forwardedRef} />
    }
    return <ToggleGroupImplMultiple {...(groupProps as ToggleGroupMultipleProps)} ref={forwardedRef} />
  }
)

ToggleGroup.displayName = TOGGLE_GROUP_NAME

const ToggleGroupImplSingle = forwardRef<
  ToggleGroupElement,
  ScopedProps<Omit<ToggleGroupSingleProps, 'type'>>
>((props, forwardedRef) => {
  const {
    __scopeToggleGroup,
    value: valueProp,
    defaultValue,
    onValueChange,
    ...groupProps
  } = props

  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  return (
    <ToggleGroupImpl
      {...groupProps}
      ref={forwardedRef}
      __scopeToggleGroup={__scopeToggleGroup}
      type="single"
      value={value ? [value] : []}
      onItemActivate={setValue}
      onItemDeactivate={() => setValue('')}
    />
  )
})

const ToggleGroupImplMultiple = forwardRef<
  ToggleGroupElement,
  ScopedProps<Omit<ToggleGroupMultipleProps, 'type'>>
>((props, forwardedRef) => {
  const {
    __scopeToggleGroup,
    value: valueProp,
    defaultValue,
    onValueChange,
    ...groupProps
  } = props

  const [value = [], setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  return (
    <ToggleGroupImpl
      {...groupProps}
      ref={forwardedRef}
      __scopeToggleGroup={__scopeToggleGroup}
      type="multiple"
      value={value}
      onItemActivate={(itemValue) => setValue([...value, itemValue])}
      onItemDeactivate={(itemValue) =>
        setValue(value.filter((v) => v !== itemValue))
      }
    />
  )
})

type ToggleGroupImplProps = ComponentPropsWithoutRef<typeof Primitive.div> & {
  type: 'single' | 'multiple'
  value: string[]
  onItemActivate(value: string): void
  onItemDeactivate(value: string): void
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
}

const ToggleGroupImpl = forwardRef<
  ToggleGroupElement,
  ScopedProps<ToggleGroupImplProps>
>((props, forwardedRef) => {
  const {
    __scopeToggleGroup,
    type,
    value,
    onItemActivate,
    onItemDeactivate,
    disabled,
    dir,
    ...groupProps
  } = props

  const direction = useDirection(dir)

  return (
    <ToggleGroupProvider
      scope={__scopeToggleGroup}
      type={type}
      value={value}
      onItemActivate={onItemActivate}
      onItemDeactivate={onItemDeactivate}
      disabled={disabled}
    >
      <Primitive.div
        role="group"
        dir={direction}
        {...groupProps}
        ref={forwardedRef}
      />
    </ToggleGroupProvider>
  )
})

/* -------------------------------------------------------------------------------------------------
 * ToggleGroupItem
 * -----------------------------------------------------------------------------------------------*/

const ITEM_NAME = 'ToggleGroupItem'

type ToggleGroupItemElement = ElementRef<typeof Toggle>
interface ToggleGroupItemProps extends ComponentPropsWithoutRef<typeof Toggle> {
  value: string
}

const ToggleGroupItem = forwardRef<
  ToggleGroupItemElement,
  ScopedProps<ToggleGroupItemProps>
>((props, forwardedRef) => {
  const { __scopeToggleGroup, value, ...itemProps } = props
  const context = useToggleGroupContext(ITEM_NAME, __scopeToggleGroup)
  const pressed = context.value.includes(value)
  const disabled = context.disabled || itemProps.disabled

  return (
    <Toggle
      {...itemProps}
      ref={forwardedRef}
      disabled={disabled}
      pressed={pressed}
      onPressedChange={(pressed) => {
        if (pressed) {
          context.onItemActivate(value)
        } else {
          context.onItemDeactivate(value)
        }
      }}
    />
  )
})

ToggleGroupItem.displayName = ITEM_NAME

const Root = ToggleGroup
const Item = ToggleGroupItem

export {
  createToggleGroupScope,
  ToggleGroup,
  ToggleGroupItem,
  Root,
  Item,
}
export type {
  ToggleGroupProps,
  ToggleGroupSingleProps,
  ToggleGroupMultipleProps,
  ToggleGroupItemProps,
}

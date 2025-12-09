/**
 * @mdxui/radix - Select
 * A dropdown select input.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'

const SELECT_NAME = 'Select'
type ScopedProps<P> = P & { __scopeSelect?: Scope }
const [createSelectContext, createSelectScope] = createContextScope(SELECT_NAME)

type SelectContextValue = { value?: string; onValueChange(value: string): void; open: boolean; onOpenChange(open: boolean): void; disabled?: boolean; required?: boolean }
const [SelectProvider, useSelectContext] = createSelectContext<SelectContextValue>(SELECT_NAME)

interface SelectProps { children?: ReactNode; value?: string; defaultValue?: string; onValueChange?(value: string): void; open?: boolean; defaultOpen?: boolean; onOpenChange?(open: boolean): void; disabled?: boolean; required?: boolean; dir?: 'ltr' | 'rtl' }

const Select = (props: ScopedProps<SelectProps>) => {
  const { __scopeSelect, children, value: valueProp, defaultValue, onValueChange, open: openProp, defaultOpen = false, onOpenChange, disabled, required } = props
  const [value, setValue] = useControllableState({ prop: valueProp, defaultProp: defaultValue, onChange: onValueChange })
  const [open, setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange })

  return <SelectProvider scope={__scopeSelect} value={value} onValueChange={setValue} open={open ?? false} onOpenChange={setOpen} disabled={disabled} required={required}>{children}</SelectProvider>
}

type SelectTriggerElement = ElementRef<typeof Primitive.button>
interface SelectTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const SelectTrigger = forwardRef<SelectTriggerElement, ScopedProps<SelectTriggerProps>>((props, ref) => {
  const { __scopeSelect, ...triggerProps } = props
  const context = useSelectContext('SelectTrigger', __scopeSelect)
  return (
    <Primitive.button type="button" role="combobox" aria-expanded={context.open} aria-required={context.required} disabled={context.disabled} data-state={context.open ? 'open' : 'closed'} data-disabled={context.disabled ? '' : undefined} {...triggerProps} ref={ref} onClick={composeEventHandlers(props.onClick, () => context.onOpenChange(!context.open))} />
  )
})

interface SelectValueProps extends ComponentPropsWithoutRef<typeof Primitive.span> { placeholder?: ReactNode }
const SelectValue = forwardRef<ElementRef<typeof Primitive.span>, ScopedProps<SelectValueProps>>((props, ref) => {
  const { __scopeSelect, placeholder, ...valueProps } = props
  const context = useSelectContext('SelectValue', __scopeSelect)
  return <Primitive.span {...valueProps} ref={ref}>{context.value || placeholder}</Primitive.span>
})

interface SelectIconProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SelectIcon = forwardRef<ElementRef<typeof Primitive.span>, ScopedProps<SelectIconProps>>((props, ref) => <Primitive.span aria-hidden {...props} ref={ref} />)

interface SelectPortalProps { children?: ReactNode; container?: HTMLElement | null }
const SelectPortal = (props: ScopedProps<SelectPortalProps>) => <PortalPrimitive container={props.container}>{props.children}</PortalPrimitive>

type SelectContentElement = ElementRef<typeof Primitive.div>
interface SelectContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  position?: 'item-aligned' | 'popper'
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  align?: 'start' | 'center' | 'end'
  alignOffset?: number
}
const SelectContent = forwardRef<SelectContentElement, ScopedProps<SelectContentProps>>((props, ref) => {
  const { __scopeSelect, position, side, sideOffset, align, alignOffset, ...contentProps } = props
  const context = useSelectContext('SelectContent', __scopeSelect)
  if (!context.open) return null
  return <Primitive.div role="listbox" data-side={side} data-align={align} {...contentProps} ref={ref} />
})

interface SelectViewportProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectViewport = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<SelectViewportProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

type SelectItemElement = ElementRef<typeof Primitive.div>
interface SelectItemProps extends ComponentPropsWithoutRef<typeof Primitive.div> { value: string; disabled?: boolean }
const SelectItem = forwardRef<SelectItemElement, ScopedProps<SelectItemProps>>((props, ref) => {
  const { __scopeSelect, value, disabled, ...itemProps } = props
  const context = useSelectContext('SelectItem', __scopeSelect)
  const isSelected = context.value === value
  return (
    <Primitive.div role="option" aria-selected={isSelected} data-state={isSelected ? 'checked' : 'unchecked'} aria-disabled={disabled} data-disabled={disabled ? '' : undefined} {...itemProps} ref={ref} onClick={composeEventHandlers(props.onClick, () => { if (!disabled) { context.onValueChange(value); context.onOpenChange(false) } })} />
  )
})

interface SelectItemTextProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SelectItemText = forwardRef<ElementRef<typeof Primitive.span>, ScopedProps<SelectItemTextProps>>((props, ref) => <Primitive.span {...props} ref={ref} />)

interface SelectItemIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {}
const SelectItemIndicator = forwardRef<ElementRef<typeof Primitive.span>, ScopedProps<SelectItemIndicatorProps>>((props, ref) => <Primitive.span aria-hidden {...props} ref={ref} />)

interface SelectGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectGroup = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<SelectGroupProps>>((props, ref) => <Primitive.div role="group" {...props} ref={ref} />)

interface SelectLabelProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectLabel = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<SelectLabelProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

interface SelectSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectSeparator = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<SelectSeparatorProps>>((props, ref) => <Primitive.div role="separator" aria-hidden {...props} ref={ref} />)

/* -------------------------------------------------------------------------------------------------
 * SelectScrollUpButton
 * -----------------------------------------------------------------------------------------------*/

type SelectScrollUpButtonElement = ElementRef<typeof Primitive.div>
interface SelectScrollUpButtonProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectScrollUpButton = forwardRef<SelectScrollUpButtonElement, ScopedProps<SelectScrollUpButtonProps>>((props, ref) => {
  const { __scopeSelect, ...buttonProps } = props
  return <Primitive.div aria-hidden {...buttonProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * SelectScrollDownButton
 * -----------------------------------------------------------------------------------------------*/

type SelectScrollDownButtonElement = ElementRef<typeof Primitive.div>
interface SelectScrollDownButtonProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const SelectScrollDownButton = forwardRef<SelectScrollDownButtonElement, ScopedProps<SelectScrollDownButtonProps>>((props, ref) => {
  const { __scopeSelect, ...buttonProps } = props
  return <Primitive.div aria-hidden {...buttonProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * Short name exports for namespace pattern compatibility
 * -----------------------------------------------------------------------------------------------*/

const Root = Select
const Trigger = SelectTrigger
const Value = SelectValue
const Icon = SelectIcon
const Portal = SelectPortal
const Content = SelectContent
const Viewport = SelectViewport
const Item = SelectItem
const ItemText = SelectItemText
const ItemIndicator = SelectItemIndicator
const Group = SelectGroup
const Label = SelectLabel
const Separator = SelectSeparator
const ScrollUpButton = SelectScrollUpButton
const ScrollDownButton = SelectScrollDownButton

export {
  createSelectScope,
  Select,
  SelectTrigger,
  SelectValue,
  SelectIcon,
  SelectPortal,
  SelectContent,
  SelectViewport,
  SelectItem,
  SelectItemText,
  SelectItemIndicator,
  SelectGroup,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
  Root,
  Trigger,
  Value,
  Icon,
  Portal,
  Content,
  Viewport,
  Item,
  ItemText,
  ItemIndicator,
  Group,
  Label,
  Separator,
  ScrollUpButton,
  ScrollDownButton,
}

export type {
  SelectProps,
  SelectTriggerProps,
  SelectValueProps,
  SelectIconProps,
  SelectPortalProps,
  SelectContentProps,
  SelectViewportProps,
  SelectItemProps,
  SelectItemTextProps,
  SelectItemIndicatorProps,
  SelectGroupProps,
  SelectLabelProps,
  SelectSeparatorProps,
  SelectScrollUpButtonProps,
  SelectScrollDownButtonProps,
}

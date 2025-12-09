/**
 * @mdxui/radix - ContextMenu
 * A menu that appears on right-click.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive } from '@mdxui/jsx/primitives'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'
import { useControllableState } from '@mdxui/jsx/hooks'

const CONTEXT_MENU_NAME = 'ContextMenu'
type ScopedProps<P> = P & { __scopeContextMenu?: Scope }
const [createContextMenuContext, createContextMenuScope] = createContextScope(CONTEXT_MENU_NAME)

type ContextMenuContextValue = {
  open: boolean
  onOpenChange(open: boolean): void
}

const [ContextMenuProvider, useContextMenuContext] = createContextMenuContext<ContextMenuContextValue>(CONTEXT_MENU_NAME)

interface ContextMenuProps { children?: ReactNode; onOpenChange?(open: boolean): void; dir?: 'ltr' | 'rtl'; modal?: boolean }
const ContextMenu = (props: ScopedProps<ContextMenuProps>) => {
  const { __scopeContextMenu, children, onOpenChange } = props
  const [open, setOpen] = useControllableState({ prop: undefined, defaultProp: false, onChange: onOpenChange })
  return (
    <ContextMenuProvider scope={__scopeContextMenu} open={open ?? false} onOpenChange={setOpen}>
      {children}
    </ContextMenuProvider>
  )
}

type ContextMenuTriggerElement = ElementRef<typeof Primitive.span>
interface ContextMenuTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.span> { disabled?: boolean }
const ContextMenuTrigger = forwardRef<ContextMenuTriggerElement, ScopedProps<ContextMenuTriggerProps>>((props, ref) => {
  const { __scopeContextMenu, ...triggerProps } = props
  return <Primitive.span {...triggerProps} ref={ref} />
})

interface ContextMenuPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const ContextMenuPortal = (props: ScopedProps<ContextMenuPortalProps>) => <PortalPrimitive container={props.container}>{props.children}</PortalPrimitive>

type ContextMenuContentElement = ElementRef<typeof Primitive.div>
interface ContextMenuContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const ContextMenuContent = forwardRef<ContextMenuContentElement, ScopedProps<ContextMenuContentProps>>((props, ref) => {
  const { __scopeContextMenu, ...contentProps } = props
  const context = useContextMenuContext('ContextMenuContent', __scopeContextMenu)
  if (!context.open) return null
  return <Primitive.div role="menu" data-state="open" {...contentProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuGroup
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuGroupElement = ElementRef<typeof Primitive.div>
interface ContextMenuGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const ContextMenuGroup = forwardRef<ContextMenuGroupElement, ScopedProps<ContextMenuGroupProps>>((props, ref) => {
  const { __scopeContextMenu, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuItem
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuItemElement = ElementRef<typeof Primitive.div>
interface ContextMenuItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> { disabled?: boolean; onSelect?(event: Event): void }
const ContextMenuItem = forwardRef<ContextMenuItemElement, ScopedProps<ContextMenuItemProps>>((props, ref) => {
  const { __scopeContextMenu, disabled, onSelect, ...itemProps } = props
  return <Primitive.div role="menuitem" aria-disabled={disabled} data-disabled={disabled ? '' : undefined} {...itemProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuCheckboxItem
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuCheckboxItemElement = ElementRef<typeof Primitive.div>
interface ContextMenuCheckboxItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  checked?: boolean | 'indeterminate'
  onCheckedChange?(checked: boolean): void
  disabled?: boolean
  onSelect?(event: Event): void
}
const ContextMenuCheckboxItem = forwardRef<ContextMenuCheckboxItemElement, ScopedProps<ContextMenuCheckboxItemProps>>((props, ref) => {
  const { __scopeContextMenu, checked, onCheckedChange, disabled, onSelect, ...itemProps } = props
  return (
    <Primitive.div
      role="menuitemcheckbox"
      aria-checked={checked === 'indeterminate' ? 'mixed' : checked}
      aria-disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      data-state={checked === true ? 'checked' : checked === 'indeterminate' ? 'indeterminate' : 'unchecked'}
      {...itemProps}
      ref={ref}
    />
  )
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuRadioGroup
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuRadioGroupElement = ElementRef<typeof Primitive.div>
interface ContextMenuRadioGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  value?: string
  onValueChange?(value: string): void
}
const ContextMenuRadioGroup = forwardRef<ContextMenuRadioGroupElement, ScopedProps<ContextMenuRadioGroupProps>>((props, ref) => {
  const { __scopeContextMenu, value, onValueChange, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuRadioItem
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuRadioItemElement = ElementRef<typeof Primitive.div>
interface ContextMenuRadioItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  value: string
  disabled?: boolean
  onSelect?(event: Event): void
}
const ContextMenuRadioItem = forwardRef<ContextMenuRadioItemElement, ScopedProps<ContextMenuRadioItemProps>>((props, ref) => {
  const { __scopeContextMenu, value, disabled, onSelect, ...itemProps } = props
  return (
    <Primitive.div
      role="menuitemradio"
      aria-disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      data-state="unchecked"
      {...itemProps}
      ref={ref}
    />
  )
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuItemIndicator
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuItemIndicatorElement = ElementRef<typeof Primitive.span>
interface ContextMenuItemIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  forceMount?: true
}
const ContextMenuItemIndicator = forwardRef<ContextMenuItemIndicatorElement, ScopedProps<ContextMenuItemIndicatorProps>>((props, ref) => {
  const { __scopeContextMenu, forceMount, ...indicatorProps } = props
  return <Primitive.span {...indicatorProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuLabel
 * -----------------------------------------------------------------------------------------------*/

interface ContextMenuLabelProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const ContextMenuLabel = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<ContextMenuLabelProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSeparator
 * -----------------------------------------------------------------------------------------------*/

interface ContextMenuSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const ContextMenuSeparator = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<ContextMenuSeparatorProps>>((props, ref) => <Primitive.div role="separator" {...props} ref={ref} />)

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSub
 * -----------------------------------------------------------------------------------------------*/

interface ContextMenuSubProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
}
const ContextMenuSub = (props: ScopedProps<ContextMenuSubProps>) => {
  return <>{props.children}</>
}

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSubTrigger
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuSubTriggerElement = ElementRef<typeof Primitive.div>
interface ContextMenuSubTriggerProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  disabled?: boolean
}
const ContextMenuSubTrigger = forwardRef<ContextMenuSubTriggerElement, ScopedProps<ContextMenuSubTriggerProps>>((props, ref) => {
  const { __scopeContextMenu, disabled, ...triggerProps } = props
  return (
    <Primitive.div
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded="false"
      aria-disabled={disabled}
      data-disabled={disabled ? '' : undefined}
      data-state="closed"
      {...triggerProps}
      ref={ref}
    />
  )
})

/* -------------------------------------------------------------------------------------------------
 * ContextMenuSubContent
 * -----------------------------------------------------------------------------------------------*/

type ContextMenuSubContentElement = ElementRef<typeof Primitive.div>
interface ContextMenuSubContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const ContextMenuSubContent = forwardRef<ContextMenuSubContentElement, ScopedProps<ContextMenuSubContentProps>>((props, ref) => {
  const { __scopeContextMenu, ...contentProps } = props
  return <Primitive.div role="menu" {...contentProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * Short name exports for namespace pattern compatibility
 * -----------------------------------------------------------------------------------------------*/

const Root = ContextMenu
const Trigger = ContextMenuTrigger
const Portal = ContextMenuPortal
const Content = ContextMenuContent
const Group = ContextMenuGroup
const Item = ContextMenuItem
const CheckboxItem = ContextMenuCheckboxItem
const RadioGroup = ContextMenuRadioGroup
const RadioItem = ContextMenuRadioItem
const ItemIndicator = ContextMenuItemIndicator
const Label = ContextMenuLabel
const Separator = ContextMenuSeparator
const Sub = ContextMenuSub
const SubTrigger = ContextMenuSubTrigger
const SubContent = ContextMenuSubContent

export {
  createContextMenuScope,
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuPortal,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuItemIndicator,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
  Root,
  Trigger,
  Portal,
  Content,
  Group,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  ItemIndicator,
  Label,
  Separator,
  Sub,
  SubTrigger,
  SubContent,
}

export type {
  ContextMenuProps,
  ContextMenuTriggerProps,
  ContextMenuPortalProps,
  ContextMenuContentProps,
  ContextMenuGroupProps,
  ContextMenuItemProps,
  ContextMenuCheckboxItemProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuItemIndicatorProps,
  ContextMenuLabelProps,
  ContextMenuSeparatorProps,
  ContextMenuSubProps,
  ContextMenuSubTriggerProps,
  ContextMenuSubContentProps,
}

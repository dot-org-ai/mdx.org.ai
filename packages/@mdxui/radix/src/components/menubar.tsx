/**
 * @mdxui/radix - Menubar
 * A horizontal menu typically at the top of a window.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive } from '@mdxui/jsx/primitives'
import { useControllableState, useId, useDirection } from '@mdxui/jsx/hooks'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const MENUBAR_NAME = 'Menubar'
type ScopedProps<P> = P & { __scopeMenubar?: Scope }
const [createMenubarContext, createMenubarScope] = createContextScope(MENUBAR_NAME)

type MenubarContextValue = { value: string; onValueChange(value: string): void; dir: 'ltr' | 'rtl' }
const [MenubarProvider, useMenubarContext] = createMenubarContext<MenubarContextValue>(MENUBAR_NAME)

interface MenubarProps extends ComponentPropsWithoutRef<typeof Primitive.div> { value?: string; defaultValue?: string; onValueChange?(value: string): void; dir?: 'ltr' | 'rtl'; loop?: boolean }

const Menubar = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<MenubarProps>>((props, ref) => {
  const { __scopeMenubar, value: valueProp, defaultValue, onValueChange, dir, loop = true, ...menubarProps } = props
  const direction = useDirection(dir)
  const [value = '', setValue] = useControllableState({ prop: valueProp, defaultProp: defaultValue, onChange: onValueChange })

  return (
    <MenubarProvider scope={__scopeMenubar} value={value} onValueChange={setValue} dir={direction}>
      <Primitive.div role="menubar" dir={direction} {...menubarProps} ref={ref} />
    </MenubarProvider>
  )
})

/* -------------------------------------------------------------------------------------------------
 * MenubarMenu
 * -----------------------------------------------------------------------------------------------*/

interface MenubarMenuProps { children?: ReactNode; value?: string }
const MenubarMenu = (props: ScopedProps<MenubarMenuProps>) => <>{props.children}</>

/* -------------------------------------------------------------------------------------------------
 * MenubarTrigger
 * -----------------------------------------------------------------------------------------------*/

type MenubarTriggerElement = ElementRef<typeof Primitive.button>
interface MenubarTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const MenubarTrigger = forwardRef<MenubarTriggerElement, ScopedProps<MenubarTriggerProps>>((props, ref) => {
  const { __scopeMenubar, ...triggerProps } = props
  return <Primitive.button type="button" role="menuitem" aria-haspopup="menu" {...triggerProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarPortal
 * -----------------------------------------------------------------------------------------------*/

interface MenubarPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const MenubarPortal = (props: ScopedProps<MenubarPortalProps>) => <PortalPrimitive container={props.container}>{props.children}</PortalPrimitive>

/* -------------------------------------------------------------------------------------------------
 * MenubarContent
 * -----------------------------------------------------------------------------------------------*/

type MenubarContentElement = ElementRef<typeof Primitive.div>
interface MenubarContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  sideOffset?: number
  alignOffset?: number
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
}
const MenubarContent = forwardRef<MenubarContentElement, ScopedProps<MenubarContentProps>>((props, ref) => {
  const { __scopeMenubar, ...contentProps } = props
  return <Primitive.div role="menu" {...contentProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarGroup
 * -----------------------------------------------------------------------------------------------*/

type MenubarGroupElement = ElementRef<typeof Primitive.div>
interface MenubarGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const MenubarGroup = forwardRef<MenubarGroupElement, ScopedProps<MenubarGroupProps>>((props, ref) => {
  const { __scopeMenubar, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarItem
 * -----------------------------------------------------------------------------------------------*/

type MenubarItemElement = ElementRef<typeof Primitive.div>
interface MenubarItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> { disabled?: boolean; onSelect?(event: Event): void }
const MenubarItem = forwardRef<MenubarItemElement, ScopedProps<MenubarItemProps>>((props, ref) => {
  const { __scopeMenubar, disabled, onSelect, ...itemProps } = props
  return <Primitive.div role="menuitem" aria-disabled={disabled} data-disabled={disabled ? '' : undefined} {...itemProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarCheckboxItem
 * -----------------------------------------------------------------------------------------------*/

type MenubarCheckboxItemElement = ElementRef<typeof Primitive.div>
interface MenubarCheckboxItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  checked?: boolean | 'indeterminate'
  onCheckedChange?(checked: boolean): void
  disabled?: boolean
  onSelect?(event: Event): void
}
const MenubarCheckboxItem = forwardRef<MenubarCheckboxItemElement, ScopedProps<MenubarCheckboxItemProps>>((props, ref) => {
  const { __scopeMenubar, checked, onCheckedChange, disabled, onSelect, ...itemProps } = props
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
 * MenubarRadioGroup
 * -----------------------------------------------------------------------------------------------*/

type MenubarRadioGroupElement = ElementRef<typeof Primitive.div>
interface MenubarRadioGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  value?: string
  onValueChange?(value: string): void
}
const MenubarRadioGroup = forwardRef<MenubarRadioGroupElement, ScopedProps<MenubarRadioGroupProps>>((props, ref) => {
  const { __scopeMenubar, value, onValueChange, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarRadioItem
 * -----------------------------------------------------------------------------------------------*/

type MenubarRadioItemElement = ElementRef<typeof Primitive.div>
interface MenubarRadioItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  value: string
  disabled?: boolean
  onSelect?(event: Event): void
}
const MenubarRadioItem = forwardRef<MenubarRadioItemElement, ScopedProps<MenubarRadioItemProps>>((props, ref) => {
  const { __scopeMenubar, value, disabled, onSelect, ...itemProps } = props
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
 * MenubarItemIndicator
 * -----------------------------------------------------------------------------------------------*/

type MenubarItemIndicatorElement = ElementRef<typeof Primitive.span>
interface MenubarItemIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  forceMount?: true
}
const MenubarItemIndicator = forwardRef<MenubarItemIndicatorElement, ScopedProps<MenubarItemIndicatorProps>>((props, ref) => {
  const { __scopeMenubar, forceMount, ...indicatorProps } = props
  return <Primitive.span {...indicatorProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * MenubarSeparator
 * -----------------------------------------------------------------------------------------------*/

interface MenubarSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const MenubarSeparator = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<MenubarSeparatorProps>>((props, ref) => <Primitive.div role="separator" {...props} ref={ref} />)

/* -------------------------------------------------------------------------------------------------
 * MenubarLabel
 * -----------------------------------------------------------------------------------------------*/

interface MenubarLabelProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const MenubarLabel = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<MenubarLabelProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

/* -------------------------------------------------------------------------------------------------
 * MenubarSub
 * -----------------------------------------------------------------------------------------------*/

interface MenubarSubProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
}
const MenubarSub = (props: ScopedProps<MenubarSubProps>) => {
  return <>{props.children}</>
}

/* -------------------------------------------------------------------------------------------------
 * MenubarSubTrigger
 * -----------------------------------------------------------------------------------------------*/

type MenubarSubTriggerElement = ElementRef<typeof Primitive.div>
interface MenubarSubTriggerProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  disabled?: boolean
}
const MenubarSubTrigger = forwardRef<MenubarSubTriggerElement, ScopedProps<MenubarSubTriggerProps>>((props, ref) => {
  const { __scopeMenubar, disabled, ...triggerProps } = props
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
 * MenubarSubContent
 * -----------------------------------------------------------------------------------------------*/

type MenubarSubContentElement = ElementRef<typeof Primitive.div>
interface MenubarSubContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const MenubarSubContent = forwardRef<MenubarSubContentElement, ScopedProps<MenubarSubContentProps>>((props, ref) => {
  const { __scopeMenubar, ...contentProps } = props
  return <Primitive.div role="menu" {...contentProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * Short name exports for namespace pattern compatibility
 * -----------------------------------------------------------------------------------------------*/

const Root = Menubar
const Menu = MenubarMenu
const Trigger = MenubarTrigger
const Portal = MenubarPortal
const Content = MenubarContent
const Group = MenubarGroup
const Item = MenubarItem
const CheckboxItem = MenubarCheckboxItem
const RadioGroup = MenubarRadioGroup
const RadioItem = MenubarRadioItem
const ItemIndicator = MenubarItemIndicator
const Separator = MenubarSeparator
const Label = MenubarLabel
const Sub = MenubarSub
const SubTrigger = MenubarSubTrigger
const SubContent = MenubarSubContent

export {
  createMenubarScope,
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarPortal,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarCheckboxItem,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarItemIndicator,
  MenubarSeparator,
  MenubarLabel,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
  Root,
  Menu,
  Trigger,
  Portal,
  Content,
  Group,
  Item,
  CheckboxItem,
  RadioGroup,
  RadioItem,
  ItemIndicator,
  Separator,
  Label,
  Sub,
  SubTrigger,
  SubContent,
}

export type {
  MenubarProps,
  MenubarMenuProps,
  MenubarTriggerProps,
  MenubarPortalProps,
  MenubarContentProps,
  MenubarGroupProps,
  MenubarItemProps,
  MenubarCheckboxItemProps,
  MenubarRadioGroupProps,
  MenubarRadioItemProps,
  MenubarItemIndicatorProps,
  MenubarSeparatorProps,
  MenubarLabelProps,
  MenubarSubProps,
  MenubarSubTriggerProps,
  MenubarSubContentProps,
}

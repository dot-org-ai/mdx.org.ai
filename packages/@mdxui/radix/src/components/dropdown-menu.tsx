/**
 * @mdxui/radix - DropdownMenu
 * A menu that appears when clicking a trigger.
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'

const DROPDOWN_MENU_NAME = 'DropdownMenu'
type ScopedProps<P> = P & { __scopeDropdownMenu?: Scope }
const [createDropdownMenuContext, createDropdownMenuScope] = createContextScope(DROPDOWN_MENU_NAME)

type DropdownMenuContextValue = {
  triggerId: string
  triggerRef: React.RefObject<HTMLButtonElement>
  contentId: string
  open: boolean
  onOpenChange(open: boolean): void
  onOpenToggle(): void
  modal: boolean
}

const [DropdownMenuProvider, useDropdownMenuContext] =
  createDropdownMenuContext<DropdownMenuContextValue>(DROPDOWN_MENU_NAME)

interface DropdownMenuProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
  modal?: boolean
  dir?: 'ltr' | 'rtl'
}

const DropdownMenu = (props: ScopedProps<DropdownMenuProps>) => {
  const { __scopeDropdownMenu, children, open: openProp, defaultOpen = false, onOpenChange, modal = true } = props
  const triggerRef = { current: null as HTMLButtonElement | null }
  const [open = false, setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange })

  return (
    <DropdownMenuProvider
      scope={__scopeDropdownMenu}
      triggerId={useId()}
      triggerRef={triggerRef}
      contentId={useId()}
      open={open}
      onOpenChange={setOpen}
      onOpenToggle={() => setOpen((prev) => !prev)}
      modal={modal}
    >
      {children}
    </DropdownMenuProvider>
  )
}

type DropdownMenuTriggerElement = ElementRef<typeof Primitive.button>
interface DropdownMenuTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}

const DropdownMenuTrigger = forwardRef<DropdownMenuTriggerElement, ScopedProps<DropdownMenuTriggerProps>>(
  (props, ref) => {
    const { __scopeDropdownMenu, ...triggerProps } = props
    const context = useDropdownMenuContext('DropdownMenuTrigger', __scopeDropdownMenu)
    return (
      <Primitive.button
        type="button"
        id={context.triggerId}
        aria-haspopup="menu"
        aria-expanded={context.open}
        data-state={context.open ? 'open' : 'closed'}
        {...triggerProps}
        ref={ref}
        onClick={composeEventHandlers(props.onClick, context.onOpenToggle)}
      />
    )
  }
)

interface DropdownMenuPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const DropdownMenuPortal = (props: ScopedProps<DropdownMenuPortalProps>) => {
  const { children, container } = props
  return <PortalPrimitive container={container}>{children}</PortalPrimitive>
}

type DropdownMenuContentElement = ElementRef<typeof Primitive.div>
interface DropdownMenuContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  sideOffset?: number; alignOffset?: number; side?: 'top' | 'right' | 'bottom' | 'left'; align?: 'start' | 'center' | 'end'
}

const DropdownMenuContent = forwardRef<DropdownMenuContentElement, ScopedProps<DropdownMenuContentProps>>(
  (props, ref) => {
    const { __scopeDropdownMenu, ...contentProps } = props
    const context = useDropdownMenuContext('DropdownMenuContent', __scopeDropdownMenu)
    if (!context.open) return null
    return <Primitive.div role="menu" id={context.contentId} data-state="open" {...contentProps} ref={ref} />
  }
)

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuGroup
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuGroupElement = ElementRef<typeof Primitive.div>
interface DropdownMenuGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const DropdownMenuGroup = forwardRef<DropdownMenuGroupElement, ScopedProps<DropdownMenuGroupProps>>((props, ref) => {
  const { __scopeDropdownMenu, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuItem
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuItemElement = ElementRef<typeof Primitive.div>
interface DropdownMenuItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> { disabled?: boolean; onSelect?(event: Event): void }

const DropdownMenuItem = forwardRef<DropdownMenuItemElement, ScopedProps<DropdownMenuItemProps>>(
  (props, ref) => {
    const { __scopeDropdownMenu, disabled, onSelect, ...itemProps } = props
    return <Primitive.div role="menuitem" aria-disabled={disabled} data-disabled={disabled ? '' : undefined} {...itemProps} ref={ref} />
  }
)

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuCheckboxItem
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuCheckboxItemElement = ElementRef<typeof Primitive.div>
interface DropdownMenuCheckboxItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  checked?: boolean | 'indeterminate'
  onCheckedChange?(checked: boolean): void
  disabled?: boolean
  onSelect?(event: Event): void
}
const DropdownMenuCheckboxItem = forwardRef<DropdownMenuCheckboxItemElement, ScopedProps<DropdownMenuCheckboxItemProps>>((props, ref) => {
  const { __scopeDropdownMenu, checked, onCheckedChange, disabled, onSelect, ...itemProps } = props
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
 * DropdownMenuRadioGroup
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuRadioGroupElement = ElementRef<typeof Primitive.div>
interface DropdownMenuRadioGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  value?: string
  onValueChange?(value: string): void
}
const DropdownMenuRadioGroup = forwardRef<DropdownMenuRadioGroupElement, ScopedProps<DropdownMenuRadioGroupProps>>((props, ref) => {
  const { __scopeDropdownMenu, value, onValueChange, ...groupProps } = props
  return <Primitive.div role="group" {...groupProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuRadioItem
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuRadioItemElement = ElementRef<typeof Primitive.div>
interface DropdownMenuRadioItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  value: string
  disabled?: boolean
  onSelect?(event: Event): void
}
const DropdownMenuRadioItem = forwardRef<DropdownMenuRadioItemElement, ScopedProps<DropdownMenuRadioItemProps>>((props, ref) => {
  const { __scopeDropdownMenu, value, disabled, onSelect, ...itemProps } = props
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
 * DropdownMenuItemIndicator
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuItemIndicatorElement = ElementRef<typeof Primitive.span>
interface DropdownMenuItemIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.span> {
  forceMount?: true
}
const DropdownMenuItemIndicator = forwardRef<DropdownMenuItemIndicatorElement, ScopedProps<DropdownMenuItemIndicatorProps>>((props, ref) => {
  const { __scopeDropdownMenu, forceMount, ...indicatorProps } = props
  return <Primitive.span {...indicatorProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuLabel
 * -----------------------------------------------------------------------------------------------*/

interface DropdownMenuLabelProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const DropdownMenuLabel = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<DropdownMenuLabelProps>>((props, ref) => {
  const { __scopeDropdownMenu, ...labelProps } = props
  return <Primitive.div {...labelProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSeparator
 * -----------------------------------------------------------------------------------------------*/

interface DropdownMenuSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const DropdownMenuSeparator = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<DropdownMenuSeparatorProps>>((props, ref) => {
  const { __scopeDropdownMenu, ...separatorProps } = props
  return <Primitive.div role="separator" {...separatorProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSub
 * -----------------------------------------------------------------------------------------------*/

interface DropdownMenuSubProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
}
const DropdownMenuSub = (props: ScopedProps<DropdownMenuSubProps>) => {
  return <>{props.children}</>
}

/* -------------------------------------------------------------------------------------------------
 * DropdownMenuSubTrigger
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuSubTriggerElement = ElementRef<typeof Primitive.div>
interface DropdownMenuSubTriggerProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onSelect'> {
  disabled?: boolean
}
const DropdownMenuSubTrigger = forwardRef<DropdownMenuSubTriggerElement, ScopedProps<DropdownMenuSubTriggerProps>>((props, ref) => {
  const { __scopeDropdownMenu, disabled, ...triggerProps } = props
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
 * DropdownMenuSubContent
 * -----------------------------------------------------------------------------------------------*/

type DropdownMenuSubContentElement = ElementRef<typeof Primitive.div>
interface DropdownMenuSubContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const DropdownMenuSubContent = forwardRef<DropdownMenuSubContentElement, ScopedProps<DropdownMenuSubContentProps>>((props, ref) => {
  const { __scopeDropdownMenu, ...contentProps } = props
  return <Primitive.div role="menu" {...contentProps} ref={ref} />
})

/* -------------------------------------------------------------------------------------------------
 * Short name exports for namespace pattern compatibility
 * -----------------------------------------------------------------------------------------------*/

const Root = DropdownMenu
const Trigger = DropdownMenuTrigger
const Portal = DropdownMenuPortal
const Content = DropdownMenuContent
const Group = DropdownMenuGroup
const Item = DropdownMenuItem
const CheckboxItem = DropdownMenuCheckboxItem
const RadioGroup = DropdownMenuRadioGroup
const RadioItem = DropdownMenuRadioItem
const ItemIndicator = DropdownMenuItemIndicator
const Label = DropdownMenuLabel
const Separator = DropdownMenuSeparator
const Sub = DropdownMenuSub
const SubTrigger = DropdownMenuSubTrigger
const SubContent = DropdownMenuSubContent

export {
  createDropdownMenuScope,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuItemIndicator,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
  DropdownMenuProps,
  DropdownMenuTriggerProps,
  DropdownMenuPortalProps,
  DropdownMenuContentProps,
  DropdownMenuGroupProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuItemIndicatorProps,
  DropdownMenuLabelProps,
  DropdownMenuSeparatorProps,
  DropdownMenuSubProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubContentProps,
}

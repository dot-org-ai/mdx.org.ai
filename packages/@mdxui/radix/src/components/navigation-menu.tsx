/**
 * @mdxui/radix - NavigationMenu
 * A collection of links for navigating websites.
 * TODO: Full implementation
 */

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState, useId, useDirection } from '@mdxui/jsx/hooks'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const NAVIGATION_MENU_NAME = 'NavigationMenu'
type ScopedProps<P> = P & { __scopeNavigationMenu?: Scope }
const [createNavigationMenuContext, createNavigationMenuScope] = createContextScope(NAVIGATION_MENU_NAME)

type NavigationMenuContextValue = { value?: string; onValueChange(value: string): void; baseId: string; dir: 'ltr' | 'rtl'; orientation: 'horizontal' | 'vertical' }
const [NavigationMenuProvider, useNavigationMenuContext] = createNavigationMenuContext<NavigationMenuContextValue>(NAVIGATION_MENU_NAME)

interface NavigationMenuProps extends ComponentPropsWithoutRef<typeof Primitive.nav> { value?: string; defaultValue?: string; onValueChange?(value: string): void; dir?: 'ltr' | 'rtl'; orientation?: 'horizontal' | 'vertical'; delayDuration?: number; skipDelayDuration?: number }

const NavigationMenu = forwardRef<ElementRef<typeof Primitive.nav>, ScopedProps<NavigationMenuProps>>((props, ref) => {
  const { __scopeNavigationMenu, value: valueProp, defaultValue, onValueChange, dir, orientation = 'horizontal', ...menuProps } = props
  const direction = useDirection(dir)
  const [value = '', setValue] = useControllableState({ prop: valueProp, defaultProp: defaultValue, onChange: onValueChange })

  return (
    <NavigationMenuProvider scope={__scopeNavigationMenu} value={value} onValueChange={setValue} baseId={useId()} dir={direction} orientation={orientation}>
      <Primitive.nav aria-label="Main" data-orientation={orientation} dir={direction} {...menuProps} ref={ref} />
    </NavigationMenuProvider>
  )
})

type NavigationMenuListElement = ElementRef<typeof Primitive.ul>
interface NavigationMenuListProps extends ComponentPropsWithoutRef<typeof Primitive.ul> {}
const NavigationMenuList = forwardRef<NavigationMenuListElement, ScopedProps<NavigationMenuListProps>>((props, ref) => {
  const { __scopeNavigationMenu, ...listProps } = props
  const context = useNavigationMenuContext('NavigationMenuList', __scopeNavigationMenu)
  return <Primitive.ul data-orientation={context.orientation} {...listProps} ref={ref} style={{ listStyle: 'none', ...listProps.style }} />
})

type NavigationMenuItemElement = ElementRef<typeof Primitive.li>
interface NavigationMenuItemProps extends ComponentPropsWithoutRef<typeof Primitive.li> { value?: string }
const NavigationMenuItem = forwardRef<NavigationMenuItemElement, ScopedProps<NavigationMenuItemProps>>((props, ref) => {
  const { __scopeNavigationMenu, value, ...itemProps } = props
  return <Primitive.li {...itemProps} ref={ref} />
})

type NavigationMenuTriggerElement = ElementRef<typeof Primitive.button>
interface NavigationMenuTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const NavigationMenuTrigger = forwardRef<NavigationMenuTriggerElement, ScopedProps<NavigationMenuTriggerProps>>((props, ref) => {
  const { __scopeNavigationMenu, ...triggerProps } = props
  return <Primitive.button type="button" aria-haspopup="menu" {...triggerProps} ref={ref} />
})

type NavigationMenuContentElement = ElementRef<typeof Primitive.div>
interface NavigationMenuContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> { forceMount?: true }
const NavigationMenuContent = forwardRef<NavigationMenuContentElement, ScopedProps<NavigationMenuContentProps>>((props, ref) => {
  const { __scopeNavigationMenu, forceMount, ...contentProps } = props
  return <Primitive.div {...contentProps} ref={ref} />
})

type NavigationMenuLinkElement = ElementRef<typeof Primitive.a>
interface NavigationMenuLinkProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.a>, 'onSelect'> { active?: boolean; onSelect?(event: Event): void }
const NavigationMenuLink = forwardRef<NavigationMenuLinkElement, ScopedProps<NavigationMenuLinkProps>>((props, ref) => {
  const { __scopeNavigationMenu, active, onSelect, ...linkProps } = props
  return <Primitive.a aria-current={active ? 'page' : undefined} data-active={active ? '' : undefined} {...linkProps} ref={ref} />
})

interface NavigationMenuIndicatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> { forceMount?: true }
const NavigationMenuIndicator = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<NavigationMenuIndicatorProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

interface NavigationMenuViewportProps extends ComponentPropsWithoutRef<typeof Primitive.div> { forceMount?: true }
const NavigationMenuViewport = forwardRef<ElementRef<typeof Primitive.div>, ScopedProps<NavigationMenuViewportProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

const Root = NavigationMenu; const List = NavigationMenuList; const Item = NavigationMenuItem; const Trigger = NavigationMenuTrigger; const Content = NavigationMenuContent; const Link = NavigationMenuLink; const Indicator = NavigationMenuIndicator; const Viewport = NavigationMenuViewport

export { createNavigationMenuScope, NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, NavigationMenuIndicator, NavigationMenuViewport, Root, List, Item, Trigger, Content, Link, Indicator, Viewport }
export type { NavigationMenuProps, NavigationMenuListProps, NavigationMenuItemProps, NavigationMenuTriggerProps, NavigationMenuContentProps, NavigationMenuLinkProps, NavigationMenuIndicatorProps, NavigationMenuViewportProps }

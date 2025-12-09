/**
 * @mdxui/headless - Menu component
 * A headless dropdown menu component
 * API compatible with @headlessui/react Menu
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useId,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type MouseEvent<T = Element> = React.MouseEvent<T>
type KeyboardEvent<T = Element> = React.KeyboardEvent<T>
type FocusEvent<T = Element> = React.FocusEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface MenuContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  buttonId: string
  itemsId: string
  activeIndex: number
  setActiveIndex: (index: number) => void
  items: HTMLElement[]
  registerItem: (element: HTMLElement) => void
  unregisterItem: (element: HTMLElement) => void
}

const MenuContext = createContext<MenuContextValue | null>(null)

function useMenuContext(component: string) {
  const context = useContext(MenuContext)
  if (!context) {
    throw new Error(`<Menu.${component} /> must be used within <Menu />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Menu Root
 * -----------------------------------------------------------------------------------------------*/

type MenuElement = ElementRef<typeof Primitive.div>
interface MenuProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; close: () => void }) => ReactNode)
}

const MenuRoot = forwardRef<MenuElement, MenuProps>(({ children, ...props }, ref) => {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [items, setItems] = useState<HTMLElement[]>([])
  const buttonId = useId()
  const itemsId = useId()

  const registerItem = useCallback((element: HTMLElement) => {
    setItems((prev) => [...prev, element])
  }, [])

  const unregisterItem = useCallback((element: HTMLElement) => {
    setItems((prev) => prev.filter((item) => item !== element))
  }, [])

  const close = useCallback(() => {
    setOpen(false)
    setActiveIndex(-1)
  }, [])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handleClick = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest(`[data-headlessui-menu]`)) {
        close()
      }
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [open, close])

  // Close on escape
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      buttonId,
      itemsId,
      activeIndex,
      setActiveIndex,
      items,
      registerItem,
      unregisterItem,
    }),
    [open, buttonId, itemsId, activeIndex, items, registerItem, unregisterItem]
  )

  const resolvedChildren = typeof children === 'function' ? children({ open, close }) : children

  return (
    <MenuContext.Provider value={contextValue}>
      <Primitive.div
        ref={ref}
        data-headlessui-menu=""
        data-headlessui-state={open ? 'open' : ''}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    </MenuContext.Provider>
  )
})
MenuRoot.displayName = 'Menu'

/* -------------------------------------------------------------------------------------------------
 * Menu Button
 * -----------------------------------------------------------------------------------------------*/

type MenuButtonElement = ElementRef<typeof Primitive.button>
interface MenuButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean }) => ReactNode)
}

const MenuButton = forwardRef<MenuButtonElement, MenuButtonProps>(
  ({ children, onClick, onKeyDown, ...props }, ref) => {
    const context = useMenuContext('Button')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        context.setOpen(!context.open)
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          context.setOpen(true)
          context.setActiveIndex(0)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          context.setOpen(true)
          context.setActiveIndex(context.items.length - 1)
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    const resolvedChildren = typeof children === 'function' ? children({ open: context.open }) : children

    return (
      <Primitive.button
        ref={ref}
        id={context.buttonId}
        type="button"
        aria-haspopup="menu"
        aria-expanded={context.open}
        aria-controls={context.itemsId}
        data-headlessui-state={context.open ? 'open' : ''}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
MenuButton.displayName = 'MenuButton'

/* -------------------------------------------------------------------------------------------------
 * Menu Items
 * -----------------------------------------------------------------------------------------------*/

type MenuItemsElement = ElementRef<typeof Primitive.div>
interface MenuItemsProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  anchor?: 'top' | 'right' | 'bottom' | 'left'
}

const MenuItems = forwardRef<MenuItemsElement, MenuItemsProps>(
  ({ children, static: isStatic = false, unmount = true, onKeyDown, ...props }, ref) => {
    const context = useMenuContext('Items')

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        const { items, activeIndex, setActiveIndex, setOpen } = context

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault()
            setActiveIndex(Math.min(activeIndex + 1, items.length - 1))
            break
          case 'ArrowUp':
            e.preventDefault()
            setActiveIndex(Math.max(activeIndex - 1, 0))
            break
          case 'Home':
            e.preventDefault()
            setActiveIndex(0)
            break
          case 'End':
            e.preventDefault()
            setActiveIndex(items.length - 1)
            break
          case 'Enter':
          case ' ':
            e.preventDefault()
            if (activeIndex >= 0 && items[activeIndex]) {
              items[activeIndex].click()
            }
            break
          case 'Tab':
            e.preventDefault()
            setOpen(false)
            break
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    // Focus active item
    useEffect(() => {
      const activeItem = context.items[context.activeIndex]
      if (context.open && context.activeIndex >= 0 && activeItem) {
        activeItem.focus()
      }
    }, [context.open, context.activeIndex, context.items])

    if (!isStatic && !context.open && unmount) {
      return null
    }

    return (
      <Primitive.div
        ref={ref}
        id={context.itemsId}
        role="menu"
        aria-labelledby={context.buttonId}
        aria-orientation="vertical"
        tabIndex={-1}
        data-headlessui-state={context.open ? 'open' : ''}
        hidden={!isStatic && !context.open ? true : undefined}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </Primitive.div>
    )
  }
)
MenuItems.displayName = 'MenuItems'

/* -------------------------------------------------------------------------------------------------
 * Menu Item
 * -----------------------------------------------------------------------------------------------*/

type MenuItemElement = ElementRef<typeof Primitive.button>
interface MenuItemProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  disabled?: boolean
  children?: ReactNode | ((props: { active: boolean; disabled: boolean; close: () => void }) => ReactNode)
}

const MenuItem = forwardRef<MenuItemElement, MenuItemProps>(
  ({ children, disabled = false, onClick, onMouseEnter, onFocus, ...props }, ref) => {
    const context = useMenuContext('Item')
    const itemRef = useRef<HTMLButtonElement>(null)
    const [index, setIndex] = useState(-1)

    const active = context.activeIndex === index

    // Register item
    useEffect(() => {
      const element = itemRef.current
      if (!element || disabled) return

      context.registerItem(element)
      setIndex(context.items.indexOf(element))

      return () => {
        context.unregisterItem(element)
      }
    }, [context, disabled])

    // Update index when items change
    useEffect(() => {
      const element = itemRef.current
      if (element) {
        setIndex(context.items.indexOf(element))
      }
    }, [context.items])

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
          e.preventDefault()
          return
        }
        context.setOpen(false)
        ;(onClick as any)?.(e)
      },
      [context, disabled, onClick]
    )

    const handleMouseEnter = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (!disabled) {
          context.setActiveIndex(index)
        }
        ;(onMouseEnter as any)?.(e)
      },
      [context, disabled, index, onMouseEnter]
    )

    const handleFocus = useCallback(
      (e: FocusEvent<HTMLButtonElement>) => {
        if (!disabled) {
          context.setActiveIndex(index)
        }
        ;(onFocus as any)?.(e)
      },
      [context, disabled, index, onFocus]
    )

    const close = useCallback(() => {
      context.setOpen(false)
    }, [context])

    const resolvedChildren =
      typeof children === 'function' ? children({ active, disabled, close }) : children

    return (
      <Primitive.button
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(itemRef as any).current = node
        }}
        role="menuitem"
        tabIndex={-1}
        disabled={disabled}
        aria-disabled={disabled || undefined}
        data-headlessui-state={`${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`.trim()}
        data-active={active ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
MenuItem.displayName = 'MenuItem'

/* -------------------------------------------------------------------------------------------------
 * Menu Section
 * -----------------------------------------------------------------------------------------------*/

type MenuSectionElement = ElementRef<typeof Primitive.div>
interface MenuSectionProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const MenuSection = forwardRef<MenuSectionElement, MenuSectionProps>((props, ref) => {
  return <Primitive.div ref={ref} role="group" {...props} />
})
MenuSection.displayName = 'MenuSection'

/* -------------------------------------------------------------------------------------------------
 * Menu Heading
 * -----------------------------------------------------------------------------------------------*/

type MenuHeadingElement = ElementRef<typeof Primitive.div>
interface MenuHeadingProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const MenuHeading = forwardRef<MenuHeadingElement, MenuHeadingProps>((props, ref) => {
  return <Primitive.div ref={ref} role="presentation" aria-hidden="true" {...props} />
})
MenuHeading.displayName = 'MenuHeading'

/* -------------------------------------------------------------------------------------------------
 * Menu Separator
 * -----------------------------------------------------------------------------------------------*/

type MenuSeparatorElement = ElementRef<typeof Primitive.div>
interface MenuSeparatorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}

const MenuSeparator = forwardRef<MenuSeparatorElement, MenuSeparatorProps>((props, ref) => {
  return <Primitive.div ref={ref} role="separator" aria-orientation="horizontal" {...props} />
})
MenuSeparator.displayName = 'MenuSeparator'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Menu = Object.assign(MenuRoot, {
  Button: MenuButton,
  Items: MenuItems,
  Item: MenuItem,
  Section: MenuSection,
  Heading: MenuHeading,
  Separator: MenuSeparator,
})

export {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  MenuSection,
  MenuHeading,
  MenuSeparator,
}
export type {
  MenuProps,
  MenuButtonProps,
  MenuItemsProps,
  MenuItemProps,
  MenuSectionProps,
  MenuHeadingProps,
  MenuSeparatorProps,
}

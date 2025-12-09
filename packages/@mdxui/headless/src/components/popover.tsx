/**
 * @mdxui/headless - Popover component
 * A headless popover component for floating content
 * API compatible with @headlessui/react Popover
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
  type RefObject,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type MouseEvent<T = Element> = React.MouseEvent<T>
type KeyboardEvent<T = Element> = React.KeyboardEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface PopoverContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  close: () => void
  buttonId: string
  panelId: string
  buttonRef: RefObject<HTMLButtonElement>
  panelRef: RefObject<HTMLDivElement>
}

const PopoverContext = createContext<PopoverContextValue | null>(null)

function usePopoverContext(component: string) {
  const context = useContext(PopoverContext)
  if (!context) {
    throw new Error(`<Popover.${component} /> must be used within <Popover />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Popover Group Context
 * -----------------------------------------------------------------------------------------------*/

interface PopoverGroupContextValue {
  registerPopover: (close: () => void) => void
  unregisterPopover: (close: () => void) => void
  closeOthers: (close: () => void) => void
}

const PopoverGroupContext = createContext<PopoverGroupContextValue | null>(null)

/* -------------------------------------------------------------------------------------------------
 * Popover Root
 * -----------------------------------------------------------------------------------------------*/

type PopoverElement = ElementRef<typeof Primitive.div>
interface PopoverProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean; close: () => void }) => ReactNode)
}

const PopoverRoot = forwardRef<PopoverElement, PopoverProps>(({ children, ...props }, ref) => {
  const [open, setOpen] = useState(false)
  const buttonId = useId()
  const panelId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const groupContext = useContext(PopoverGroupContext)

  const close = useCallback(() => {
    setOpen(false)
  }, [])

  // Register with group
  useEffect(() => {
    if (groupContext) {
      groupContext.registerPopover(close)
      return () => groupContext.unregisterPopover(close)
    }
    return undefined
  }, [groupContext, close])

  // Close others in group when opening
  useEffect(() => {
    if (open && groupContext) {
      groupContext.closeOthers(close)
    }
  }, [open, groupContext, close])

  // Close on outside click
  useEffect(() => {
    if (!open) return

    const handleClick = (e: globalThis.MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
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
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  const contextValue = useMemo(
    () => ({
      open,
      setOpen,
      close,
      buttonId,
      panelId,
      buttonRef,
      panelRef,
    }),
    [open, close, buttonId, panelId]
  )

  const resolvedChildren = typeof children === 'function' ? children({ open, close }) : children

  return (
    <PopoverContext.Provider value={contextValue}>
      <Primitive.div
        ref={ref}
        data-headlessui-state={open ? 'open' : ''}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    </PopoverContext.Provider>
  )
})
PopoverRoot.displayName = 'Popover'

/* -------------------------------------------------------------------------------------------------
 * Popover Button
 * -----------------------------------------------------------------------------------------------*/

type PopoverButtonElement = ElementRef<typeof Primitive.button>
interface PopoverButtonProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { open: boolean }) => ReactNode)
}

const PopoverButton = forwardRef<PopoverButtonElement, PopoverButtonProps>(
  ({ children, onClick, onKeyDown, ...props }, ref) => {
    const context = usePopoverContext('Button')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        context.setOpen(!context.open)
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          context.setOpen(!context.open)
        } else if (e.key === 'ArrowDown' && !context.open) {
          e.preventDefault()
          context.setOpen(true)
        }
        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    const resolvedChildren = typeof children === 'function' ? children({ open: context.open }) : children

    return (
      <Primitive.button
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(context.buttonRef as any).current = node
        }}
        id={context.buttonId}
        type="button"
        aria-expanded={context.open}
        aria-controls={context.panelId}
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
PopoverButton.displayName = 'PopoverButton'

/* -------------------------------------------------------------------------------------------------
 * Popover Backdrop
 * -----------------------------------------------------------------------------------------------*/

type PopoverBackdropElement = ElementRef<typeof Primitive.div>
interface PopoverBackdropProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const PopoverBackdrop = forwardRef<PopoverBackdropElement, PopoverBackdropProps>(
  ({ onClick, ...props }, ref) => {
    const context = usePopoverContext('Backdrop')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        context.close()
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

    if (!context.open) {
      return null
    }

    return (
      <Primitive.div
        ref={ref}
        aria-hidden="true"
        data-headlessui-state={context.open ? 'open' : ''}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
PopoverBackdrop.displayName = 'PopoverBackdrop'

/* -------------------------------------------------------------------------------------------------
 * Popover Panel
 * -----------------------------------------------------------------------------------------------*/

type PopoverPanelElement = ElementRef<typeof Primitive.div>
interface PopoverPanelProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'children'> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  focus?: boolean
  anchor?: 'top' | 'right' | 'bottom' | 'left'
  children?: ReactNode | ((props: { open: boolean; close: () => void }) => ReactNode)
}

const PopoverPanel = forwardRef<PopoverPanelElement, PopoverPanelProps>(
  ({ children, static: isStatic = false, unmount = true, focus = false, onClick, ...props }, ref) => {
    const context = usePopoverContext('Panel')

    // Focus panel when opened
    useEffect(() => {
      if (context.open && focus && context.panelRef.current) {
        context.panelRef.current.focus()
      }
    }, [context.open, focus, context.panelRef])

    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        ;(onClick as any)?.(e)
      },
      [onClick]
    )

    if (!isStatic && !context.open && unmount) {
      return null
    }

    const resolvedChildren =
      typeof children === 'function' ? children({ open: context.open, close: context.close }) : children

    return (
      <Primitive.div
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(context.panelRef as any).current = node
        }}
        id={context.panelId}
        aria-labelledby={context.buttonId}
        tabIndex={focus ? -1 : undefined}
        data-headlessui-state={context.open ? 'open' : ''}
        hidden={!isStatic && !context.open ? true : undefined}
        onClick={handleClick}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    )
  }
)
PopoverPanel.displayName = 'PopoverPanel'

/* -------------------------------------------------------------------------------------------------
 * Popover Group
 * -----------------------------------------------------------------------------------------------*/

type PopoverGroupElement = ElementRef<typeof Primitive.div>
interface PopoverGroupProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const PopoverGroup = forwardRef<PopoverGroupElement, PopoverGroupProps>(
  ({ children, ...props }, ref) => {
    const [popovers, setPopovers] = useState<(() => void)[]>([])

    const registerPopover = useCallback((close: () => void) => {
      setPopovers((prev) => [...prev, close])
    }, [])

    const unregisterPopover = useCallback((close: () => void) => {
      setPopovers((prev) => prev.filter((p) => p !== close))
    }, [])

    const closeOthers = useCallback(
      (close: () => void) => {
        popovers.forEach((p) => {
          if (p !== close) p()
        })
      },
      [popovers]
    )

    const groupContextValue = useMemo(
      () => ({
        registerPopover,
        unregisterPopover,
        closeOthers,
      }),
      [registerPopover, unregisterPopover, closeOthers]
    )

    return (
      <PopoverGroupContext.Provider value={groupContextValue}>
        <Primitive.div ref={ref} {...props}>
          {children}
        </Primitive.div>
      </PopoverGroupContext.Provider>
    )
  }
)
PopoverGroup.displayName = 'PopoverGroup'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Popover = Object.assign(PopoverRoot, {
  Button: PopoverButton,
  Backdrop: PopoverBackdrop,
  Panel: PopoverPanel,
  Group: PopoverGroup,
})

export { Popover, PopoverButton, PopoverBackdrop, PopoverPanel, PopoverGroup }
export type {
  PopoverProps,
  PopoverButtonProps,
  PopoverBackdropProps,
  PopoverPanelProps,
  PopoverGroupProps,
}

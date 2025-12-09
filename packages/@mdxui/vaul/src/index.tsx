/**
 * @mdxui/vaul - Drawer component
 * A drawer/sheet component built on @mdxui/radix Dialog
 * Port of vaul (https://github.com/emilkowalski/vaul) for Hono JSX compatibility
 */

import {
  forwardRef,
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Dialog } from '@mdxui/radix'
import { Primitive, Portal as PortalPrimitive } from '@mdxui/jsx/primitives'
import { useControllableState } from '@mdxui/jsx/hooks'

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

type Direction = 'top' | 'bottom' | 'left' | 'right'

interface DrawerContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
  direction: Direction
  modal: boolean
  dismissible: boolean
  snapPoints?: (number | string)[]
  activeSnapPoint?: number | string | null
  setActiveSnapPoint?: (snapPoint: number | string | null) => void
}

const DrawerContext = createContext<DrawerContextValue | null>(null)

function useDrawerContext(component: string) {
  const context = useContext(DrawerContext)
  if (!context) {
    throw new Error(`<${component} /> must be used within <Drawer.Root />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Drawer Root
 * -----------------------------------------------------------------------------------------------*/

interface DrawerRootProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  direction?: Direction
  modal?: boolean
  dismissible?: boolean
  snapPoints?: (number | string)[]
  activeSnapPoint?: number | string | null
  setActiveSnapPoint?: (snapPoint: number | string | null) => void
  shouldScaleBackground?: boolean
  nested?: boolean
}

function DrawerRoot({
  children,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  direction = 'bottom',
  modal = true,
  dismissible = true,
  snapPoints,
  activeSnapPoint,
  setActiveSnapPoint,
  shouldScaleBackground,
  nested,
}: DrawerRootProps) {
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  return (
    <DrawerContext.Provider
      value={{
        open,
        onOpenChange: setOpen,
        direction,
        modal,
        dismissible,
        snapPoints,
        activeSnapPoint,
        setActiveSnapPoint,
      }}
    >
      <Dialog.Root open={open} onOpenChange={setOpen} modal={modal}>
        {children}
      </Dialog.Root>
    </DrawerContext.Provider>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Drawer Trigger
 * -----------------------------------------------------------------------------------------------*/

type DrawerTriggerElement = ElementRef<typeof Dialog.Trigger>
interface DrawerTriggerProps extends ComponentPropsWithoutRef<typeof Dialog.Trigger> {}

const DrawerTrigger = forwardRef<DrawerTriggerElement, DrawerTriggerProps>(
  (props, ref) => {
    return <Dialog.Trigger {...props} ref={ref} />
  }
)
DrawerTrigger.displayName = 'DrawerTrigger'

/* -------------------------------------------------------------------------------------------------
 * Drawer Portal
 * -----------------------------------------------------------------------------------------------*/

interface DrawerPortalProps extends ComponentPropsWithoutRef<typeof Dialog.Portal> {}

function DrawerPortal({ children, ...props }: DrawerPortalProps) {
  return <Dialog.Portal {...props}>{children}</Dialog.Portal>
}

/* -------------------------------------------------------------------------------------------------
 * Drawer Close
 * -----------------------------------------------------------------------------------------------*/

type DrawerCloseElement = ElementRef<typeof Dialog.Close>
interface DrawerCloseProps extends ComponentPropsWithoutRef<typeof Dialog.Close> {}

const DrawerClose = forwardRef<DrawerCloseElement, DrawerCloseProps>(
  (props, ref) => {
    return <Dialog.Close {...props} ref={ref} />
  }
)
DrawerClose.displayName = 'DrawerClose'

/* -------------------------------------------------------------------------------------------------
 * Drawer Overlay
 * -----------------------------------------------------------------------------------------------*/

type DrawerOverlayElement = ElementRef<typeof Dialog.Overlay>
interface DrawerOverlayProps extends ComponentPropsWithoutRef<typeof Dialog.Overlay> {}

const DrawerOverlay = forwardRef<DrawerOverlayElement, DrawerOverlayProps>(
  (props, ref) => {
    const context = useDrawerContext('DrawerOverlay')
    if (!context.modal) return null
    return <Dialog.Overlay {...props} ref={ref} />
  }
)
DrawerOverlay.displayName = 'DrawerOverlay'

/* -------------------------------------------------------------------------------------------------
 * Drawer Content
 * -----------------------------------------------------------------------------------------------*/

type DrawerContentElement = ElementRef<typeof Dialog.Content>
interface DrawerContentProps extends ComponentPropsWithoutRef<typeof Dialog.Content> {
  onPointerDownOutside?: (event: Event) => void
  onInteractOutside?: (event: Event) => void
}

const DrawerContent = forwardRef<DrawerContentElement, DrawerContentProps>(
  ({ children, onPointerDownOutside, onInteractOutside, ...props }, ref) => {
    const context = useDrawerContext('DrawerContent')

    const handlePointerDownOutside = useCallback(
      (event: Event) => {
        if (!context.dismissible) {
          event.preventDefault()
        }
        onPointerDownOutside?.(event)
      },
      [context.dismissible, onPointerDownOutside]
    )

    return (
      <Dialog.Content
        {...props}
        ref={ref}
        data-vaul-drawer-direction={context.direction}
        onPointerDownOutside={handlePointerDownOutside}
        onInteractOutside={onInteractOutside}
      >
        {children}
      </Dialog.Content>
    )
  }
)
DrawerContent.displayName = 'DrawerContent'

/* -------------------------------------------------------------------------------------------------
 * Drawer Title
 * -----------------------------------------------------------------------------------------------*/

type DrawerTitleElement = ElementRef<typeof Dialog.Title>
interface DrawerTitleProps extends ComponentPropsWithoutRef<typeof Dialog.Title> {}

const DrawerTitle = forwardRef<DrawerTitleElement, DrawerTitleProps>(
  (props, ref) => {
    return <Dialog.Title {...props} ref={ref} />
  }
)
DrawerTitle.displayName = 'DrawerTitle'

/* -------------------------------------------------------------------------------------------------
 * Drawer Description
 * -----------------------------------------------------------------------------------------------*/

type DrawerDescriptionElement = ElementRef<typeof Dialog.Description>
interface DrawerDescriptionProps extends ComponentPropsWithoutRef<typeof Dialog.Description> {}

const DrawerDescription = forwardRef<DrawerDescriptionElement, DrawerDescriptionProps>(
  (props, ref) => {
    return <Dialog.Description {...props} ref={ref} />
  }
)
DrawerDescription.displayName = 'DrawerDescription'

/* -------------------------------------------------------------------------------------------------
 * Drawer Handle
 * -----------------------------------------------------------------------------------------------*/

type DrawerHandleElement = ElementRef<typeof Primitive.div>
interface DrawerHandleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  preventCycle?: boolean
}

const DrawerHandle = forwardRef<DrawerHandleElement, DrawerHandleProps>(
  ({ preventCycle, ...props }, ref) => {
    return (
      <Primitive.div
        data-vaul-handle=""
        aria-hidden="true"
        {...props}
        ref={ref}
      />
    )
  }
)
DrawerHandle.displayName = 'DrawerHandle'

/* -------------------------------------------------------------------------------------------------
 * Drawer NestedRoot (for nested drawers)
 * -----------------------------------------------------------------------------------------------*/

function DrawerNestedRoot(props: DrawerRootProps) {
  return <DrawerRoot {...props} nested />
}

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Root = DrawerRoot
const NestedRoot = DrawerNestedRoot
const Trigger = DrawerTrigger
const Portal = DrawerPortal
const Close = DrawerClose
const Overlay = DrawerOverlay
const Content = DrawerContent
const Title = DrawerTitle
const Description = DrawerDescription
const Handle = DrawerHandle

// Default export as namespace (vaul-compatible)
export const Drawer = {
  Root,
  NestedRoot,
  Trigger,
  Portal,
  Close,
  Overlay,
  Content,
  Title,
  Description,
  Handle,
}

// Named exports
export {
  DrawerRoot,
  DrawerNestedRoot,
  DrawerTrigger,
  DrawerPortal,
  DrawerClose,
  DrawerOverlay,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
  DrawerHandle,
  Root,
  NestedRoot,
  Trigger,
  Portal,
  Close,
  Overlay,
  Content,
  Title,
  Description,
  Handle,
}

export type {
  DrawerRootProps,
  DrawerTriggerProps,
  DrawerPortalProps,
  DrawerCloseProps,
  DrawerOverlayProps,
  DrawerContentProps,
  DrawerTitleProps,
  DrawerDescriptionProps,
  DrawerHandleProps,
}

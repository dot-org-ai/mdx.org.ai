/**
 * @mdxui/headless - Dialog component
 * A headless dialog/modal component
 * API compatible with @headlessui/react Dialog
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

interface DialogContextValue {
  open: boolean
  setOpen: (open: boolean) => void
  titleId: string
  descriptionId: string
  panelRef: RefObject<HTMLDivElement>
}

const DialogContext = createContext<DialogContextValue | null>(null)

function useDialogContext(component: string) {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error(`<Dialog.${component} /> must be used within <Dialog />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Dialog Root
 * -----------------------------------------------------------------------------------------------*/

type DialogElement = ElementRef<typeof Primitive.div>
interface DialogProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onClose' | 'children'> {
  open?: boolean
  onClose: (value: boolean) => void
  initialFocus?: RefObject<HTMLElement>
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  static?: boolean
  unmount?: boolean
  children?: ReactNode | ((props: { open: boolean }) => ReactNode)
}

const DialogRoot = forwardRef<DialogElement, DialogProps>(
  (
    {
      children,
      open = false,
      onClose,
      initialFocus,
      static: isStatic = false,
      unmount = true,
      ...props
    },
    ref
  ) => {
    const titleId = useId()
    const descriptionId = useId()
    const panelRef = useRef<HTMLDivElement>(null)
    const previousActiveElement = useRef<HTMLElement | null>(null)

    const setOpen = useCallback(
      (value: boolean) => {
        onClose(value)
      },
      [onClose]
    )

    // Handle escape key
    useEffect(() => {
      if (!open) return

      const handleKeyDown = (e: globalThis.KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          e.stopPropagation()
          onClose(false)
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open, onClose])

    // Handle focus management
    useEffect(() => {
      if (!open) return

      previousActiveElement.current = document.activeElement as HTMLElement

      // Focus initial element or panel
      const focusElement = initialFocus?.current || panelRef.current
      if (focusElement) {
        focusElement.focus()
      }

      return () => {
        // Restore focus on close
        previousActiveElement.current?.focus()
      }
    }, [open, initialFocus])

    // Handle scroll lock
    useEffect(() => {
      if (!open) return

      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }, [open])

    const contextValue = useMemo(
      () => ({
        open,
        setOpen,
        titleId,
        descriptionId,
        panelRef,
      }),
      [open, setOpen, titleId, descriptionId]
    )

    // Don't render if closed and unmount is true
    if (!isStatic && !open && unmount) {
      return null
    }

    const resolvedChildren = typeof children === 'function' ? children({ open }) : children

    return (
      <DialogContext.Provider value={contextValue}>
        <Primitive.div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          data-headlessui-state={open ? 'open' : ''}
          hidden={!isStatic && !open ? true : undefined}
          {...props}
        >
          {resolvedChildren}
        </Primitive.div>
      </DialogContext.Provider>
    )
  }
)
DialogRoot.displayName = 'Dialog'

/* -------------------------------------------------------------------------------------------------
 * Dialog Backdrop
 * -----------------------------------------------------------------------------------------------*/

type DialogBackdropElement = ElementRef<typeof Primitive.div>
interface DialogBackdropProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const DialogBackdrop = forwardRef<DialogBackdropElement, DialogBackdropProps>(
  ({ onClick, ...props }, ref) => {
    const context = useDialogContext('Backdrop')

    const handleClick = useCallback(
      (e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation()
        context.setOpen(false)
        ;(onClick as any)?.(e)
      },
      [context, onClick]
    )

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
DialogBackdrop.displayName = 'DialogBackdrop'

/* -------------------------------------------------------------------------------------------------
 * Dialog Panel
 * -----------------------------------------------------------------------------------------------*/

type DialogPanelElement = ElementRef<typeof Primitive.div>
interface DialogPanelProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const DialogPanel = forwardRef<DialogPanelElement, DialogPanelProps>(
  ({ onClick, ...props }, ref) => {
    const context = useDialogContext('Panel')

    const handleClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation()
      ;(onClick as any)?.(e)
    }, [onClick])

    return (
      <Primitive.div
        ref={(node) => {
          // Merge refs
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(context.panelRef as any).current = node
        }}
        data-headlessui-state={context.open ? 'open' : ''}
        tabIndex={-1}
        onClick={handleClick}
        {...props}
      />
    )
  }
)
DialogPanel.displayName = 'DialogPanel'

/* -------------------------------------------------------------------------------------------------
 * Dialog Title
 * -----------------------------------------------------------------------------------------------*/

type DialogTitleElement = ElementRef<typeof Primitive.h2>
interface DialogTitleProps extends ComponentPropsWithoutRef<typeof Primitive.h2> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const DialogTitle = forwardRef<DialogTitleElement, DialogTitleProps>((props, ref) => {
  const context = useDialogContext('Title')

  return (
    <Primitive.h2
      ref={ref}
      id={context.titleId}
      data-headlessui-state={context.open ? 'open' : ''}
      {...props}
    />
  )
})
DialogTitle.displayName = 'DialogTitle'

/* -------------------------------------------------------------------------------------------------
 * Dialog Description
 * -----------------------------------------------------------------------------------------------*/

type DialogDescriptionElement = ElementRef<typeof Primitive.p>
interface DialogDescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const DialogDescription = forwardRef<DialogDescriptionElement, DialogDescriptionProps>(
  (props, ref) => {
    const context = useDialogContext('Description')

    return (
      <Primitive.p
        ref={ref}
        id={context.descriptionId}
        data-headlessui-state={context.open ? 'open' : ''}
        {...props}
      />
    )
  }
)
DialogDescription.displayName = 'DialogDescription'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const Dialog = Object.assign(DialogRoot, {
  Backdrop: DialogBackdrop,
  Panel: DialogPanel,
  Title: DialogTitle,
  Description: DialogDescription,
})

export { Dialog, DialogBackdrop, DialogPanel, DialogTitle, DialogDescription }
export type {
  DialogProps,
  DialogBackdropProps,
  DialogPanelProps,
  DialogTitleProps,
  DialogDescriptionProps,
}

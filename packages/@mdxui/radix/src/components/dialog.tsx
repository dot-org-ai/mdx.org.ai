/**
 * @mdxui/radix - Dialog
 * A modal dialog that overlays the main content.
 */

import {
  forwardRef,
  useState,
  useRef,
  useCallback,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'
import { RemoveScroll } from '../scroll-lock'
import { hideOthers } from '../utils/aria-hidden'

const DIALOG_NAME = 'Dialog'

type ScopedProps<P> = P & { __scopeDialog?: Scope }
const [createDialogContext, createDialogScope] = createContextScope(DIALOG_NAME)

type DialogContextValue = {
  triggerRef: React.RefObject<HTMLButtonElement>
  contentRef: React.RefObject<HTMLDivElement>
  contentId: string
  titleId: string
  descriptionId: string
  open: boolean
  onOpenChange(open: boolean): void
  onOpenToggle(): void
  modal: boolean
}

const [DialogProvider, useDialogContext] = createDialogContext<DialogContextValue>(DIALOG_NAME)

interface DialogProps {
  children?: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?(open: boolean): void
  modal?: boolean
}

const Dialog = (props: ScopedProps<DialogProps>) => {
  const {
    __scopeDialog,
    children,
    open: openProp,
    defaultOpen = false,
    onOpenChange,
    modal = true,
  } = props

  const triggerRef = useRef<HTMLButtonElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [open = false, setOpen] = useControllableState({
    prop: openProp,
    defaultProp: defaultOpen,
    onChange: onOpenChange,
  })

  return (
    <DialogProvider
      scope={__scopeDialog}
      triggerRef={triggerRef}
      contentRef={contentRef}
      contentId={useId()}
      titleId={useId()}
      descriptionId={useId()}
      open={open}
      onOpenChange={setOpen}
      onOpenToggle={useCallback(() => setOpen((prev) => !prev), [setOpen])}
      modal={modal}
    >
      {children}
    </DialogProvider>
  )
}

Dialog.displayName = DIALOG_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'DialogTrigger'

type DialogTriggerElement = ElementRef<typeof Primitive.button>
interface DialogTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}

const DialogTrigger = forwardRef<DialogTriggerElement, ScopedProps<DialogTriggerProps>>(
  (props, forwardedRef) => {
    const { __scopeDialog, ...triggerProps } = props
    const context = useDialogContext(TRIGGER_NAME, __scopeDialog)

    return (
      <Primitive.button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={context.open}
        aria-controls={context.contentId}
        data-state={getState(context.open)}
        {...triggerProps}
        ref={forwardedRef}
        onClick={composeEventHandlers(props.onClick, context.onOpenToggle)}
      />
    )
  }
)

DialogTrigger.displayName = TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogPortal
 * -----------------------------------------------------------------------------------------------*/

const PORTAL_NAME = 'DialogPortal'

interface DialogPortalProps {
  children?: ReactNode
  container?: HTMLElement | null
  forceMount?: true
}

const DialogPortal = (props: ScopedProps<DialogPortalProps>) => {
  const { __scopeDialog, forceMount, children, container } = props
  const context = useDialogContext(PORTAL_NAME, __scopeDialog)

  return (
    <Presence present={forceMount || context.open}>
      <PortalPrimitive container={container}>{children}</PortalPrimitive>
    </Presence>
  )
}

DialogPortal.displayName = PORTAL_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogOverlay
 * -----------------------------------------------------------------------------------------------*/

const OVERLAY_NAME = 'DialogOverlay'

type DialogOverlayElement = ElementRef<typeof Primitive.div>
interface DialogOverlayProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  forceMount?: true
}

const DialogOverlay = forwardRef<DialogOverlayElement, ScopedProps<DialogOverlayProps>>(
  (props, forwardedRef) => {
    const { __scopeDialog, forceMount, ...overlayProps } = props
    const context = useDialogContext(OVERLAY_NAME, __scopeDialog)

    return context.modal ? (
      <Presence present={forceMount || context.open}>
        <Primitive.div
          data-state={getState(context.open)}
          {...overlayProps}
          ref={forwardedRef}
          style={{ pointerEvents: 'auto', ...overlayProps.style }}
        />
      </Presence>
    ) : null
  }
)

DialogOverlay.displayName = OVERLAY_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'DialogContent'

type DialogContentElement = ElementRef<typeof Primitive.div>
interface DialogContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  forceMount?: true
  onEscapeKeyDown?(event: KeyboardEvent): void
  onPointerDownOutside?(event: PointerEvent): void
  onInteractOutside?(event: Event): void
  onOpenAutoFocus?(event: Event): void
  onCloseAutoFocus?(event: Event): void
}

const DialogContent = forwardRef<DialogContentElement, ScopedProps<DialogContentProps>>(
  (props, forwardedRef) => {
    const {
      __scopeDialog,
      forceMount,
      onEscapeKeyDown,
      onPointerDownOutside,
      onInteractOutside,
      onOpenAutoFocus,
      onCloseAutoFocus,
      ...contentProps
    } = props
    const context = useDialogContext(CONTENT_NAME, __scopeDialog)

    return (
      <Presence present={forceMount || context.open}>
        {context.modal ? (
          <DialogContentModal
            {...contentProps}
            ref={forwardedRef}
            __scopeDialog={__scopeDialog}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
          />
        ) : (
          <DialogContentNonModal
            {...contentProps}
            ref={forwardedRef}
            __scopeDialog={__scopeDialog}
            onEscapeKeyDown={onEscapeKeyDown}
            onPointerDownOutside={onPointerDownOutside}
          />
        )}
      </Presence>
    )
  }
)

DialogContent.displayName = CONTENT_NAME

const DialogContentModal = forwardRef<
  DialogContentElement,
  ScopedProps<DialogContentProps>
>((props, forwardedRef) => {
  const { __scopeDialog, onEscapeKeyDown, onPointerDownOutside, ...contentProps } = props
  const context = useDialogContext(CONTENT_NAME, __scopeDialog)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <RemoveScroll enabled={context.open}>
      <Primitive.div
        role="dialog"
        id={context.contentId}
        aria-describedby={context.descriptionId}
        aria-labelledby={context.titleId}
        data-state={getState(context.open)}
        {...contentProps}
        ref={forwardedRef}
        onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
          if (event.key === 'Escape') {
            onEscapeKeyDown?.(event as unknown as KeyboardEvent)
            if (!event.defaultPrevented) {
              context.onOpenChange(false)
            }
          }
        })}
      />
    </RemoveScroll>
  )
})

const DialogContentNonModal = forwardRef<
  DialogContentElement,
  ScopedProps<DialogContentProps>
>((props, forwardedRef) => {
  const { __scopeDialog, onEscapeKeyDown, onPointerDownOutside, ...contentProps } = props
  const context = useDialogContext(CONTENT_NAME, __scopeDialog)

  return (
    <Primitive.div
      role="dialog"
      id={context.contentId}
      aria-describedby={context.descriptionId}
      aria-labelledby={context.titleId}
      data-state={getState(context.open)}
      {...contentProps}
      ref={forwardedRef}
      onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
        if (event.key === 'Escape') {
          onEscapeKeyDown?.(event as unknown as KeyboardEvent)
          if (!event.defaultPrevented) {
            context.onOpenChange(false)
          }
        }
      })}
    />
  )
})

/* -------------------------------------------------------------------------------------------------
 * DialogClose
 * -----------------------------------------------------------------------------------------------*/

const CLOSE_NAME = 'DialogClose'

type DialogCloseElement = ElementRef<typeof Primitive.button>
interface DialogCloseProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}

const DialogClose = forwardRef<DialogCloseElement, ScopedProps<DialogCloseProps>>(
  (props, forwardedRef) => {
    const { __scopeDialog, ...closeProps } = props
    const context = useDialogContext(CLOSE_NAME, __scopeDialog)

    return (
      <Primitive.button
        type="button"
        {...closeProps}
        ref={forwardedRef}
        onClick={composeEventHandlers(props.onClick, () => context.onOpenChange(false))}
      />
    )
  }
)

DialogClose.displayName = CLOSE_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogTitle
 * -----------------------------------------------------------------------------------------------*/

const TITLE_NAME = 'DialogTitle'

type DialogTitleElement = ElementRef<typeof Primitive.h2>
interface DialogTitleProps extends ComponentPropsWithoutRef<typeof Primitive.h2> {}

const DialogTitle = forwardRef<DialogTitleElement, ScopedProps<DialogTitleProps>>(
  (props, forwardedRef) => {
    const { __scopeDialog, ...titleProps } = props
    const context = useDialogContext(TITLE_NAME, __scopeDialog)

    return <Primitive.h2 id={context.titleId} {...titleProps} ref={forwardedRef} />
  }
)

DialogTitle.displayName = TITLE_NAME

/* -------------------------------------------------------------------------------------------------
 * DialogDescription
 * -----------------------------------------------------------------------------------------------*/

const DESCRIPTION_NAME = 'DialogDescription'

type DialogDescriptionElement = ElementRef<typeof Primitive.p>
interface DialogDescriptionProps extends ComponentPropsWithoutRef<typeof Primitive.p> {}

const DialogDescription = forwardRef<
  DialogDescriptionElement,
  ScopedProps<DialogDescriptionProps>
>((props, forwardedRef) => {
  const { __scopeDialog, ...descriptionProps } = props
  const context = useDialogContext(DESCRIPTION_NAME, __scopeDialog)

  return <Primitive.p id={context.descriptionId} {...descriptionProps} ref={forwardedRef} />
})

DialogDescription.displayName = DESCRIPTION_NAME

/* ---------------------------------------------------------------------------------------------- */

function getState(open: boolean) {
  return open ? 'open' : 'closed'
}

const Root = Dialog
const Trigger = DialogTrigger
const Portal = DialogPortal
const Overlay = DialogOverlay
const Content = DialogContent
const Close = DialogClose
const Title = DialogTitle
const Description = DialogDescription

export {
  createDialogScope,
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
  Root,
  Trigger,
  Portal,
  Overlay,
  Content,
  Close,
  Title,
  Description,
}
export type {
  DialogProps,
  DialogTriggerProps,
  DialogPortalProps,
  DialogOverlayProps,
  DialogContentProps,
  DialogCloseProps,
  DialogTitleProps,
  DialogDescriptionProps,
}

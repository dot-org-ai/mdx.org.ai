/**
 * @mdxui/radix - Popover
 * A popup that displays content on trigger click.
 * TODO: Full implementation with floating-ui positioning
 */

import { forwardRef, useRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'

const POPOVER_NAME = 'Popover'
type ScopedProps<P> = P & { __scopePopover?: Scope }
const [createPopoverContext, createPopoverScope] = createContextScope(POPOVER_NAME)

type PopoverContextValue = { triggerRef: React.RefObject<HTMLButtonElement>; contentId: string; open: boolean; onOpenChange(open: boolean): void; onOpenToggle(): void; modal: boolean }
const [PopoverProvider, usePopoverContext] = createPopoverContext<PopoverContextValue>(POPOVER_NAME)

interface PopoverProps { children?: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?(open: boolean): void; modal?: boolean }

const Popover = (props: ScopedProps<PopoverProps>) => {
  const { __scopePopover, children, open: openProp, defaultOpen = false, onOpenChange, modal = false } = props
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open = false, setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange })

  return (
    <PopoverProvider scope={__scopePopover} triggerRef={triggerRef} contentId={useId()} open={open} onOpenChange={setOpen} onOpenToggle={() => setOpen((prev) => !prev)} modal={modal}>
      {children}
    </PopoverProvider>
  )
}

type PopoverTriggerElement = ElementRef<typeof Primitive.button>
interface PopoverTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const PopoverTrigger = forwardRef<PopoverTriggerElement, ScopedProps<PopoverTriggerProps>>((props, ref) => {
  const { __scopePopover, ...triggerProps } = props
  const context = usePopoverContext('PopoverTrigger', __scopePopover)
  return (
    <Primitive.button type="button" aria-haspopup="dialog" aria-expanded={context.open} aria-controls={context.contentId} data-state={context.open ? 'open' : 'closed'} {...triggerProps} ref={ref} onClick={composeEventHandlers(props.onClick, context.onOpenToggle)} />
  )
})

interface PopoverPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const PopoverPortal = (props: ScopedProps<PopoverPortalProps>) => {
  const { __scopePopover, forceMount, children, container } = props
  const context = usePopoverContext('PopoverPortal', __scopePopover)
  return <Presence present={forceMount || context.open}><PortalPrimitive container={container}>{children}</PortalPrimitive></Presence>
}

type PopoverContentElement = ElementRef<typeof Primitive.div>
interface PopoverContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> { side?: 'top' | 'right' | 'bottom' | 'left'; sideOffset?: number; align?: 'start' | 'center' | 'end'; alignOffset?: number; forceMount?: true }
const PopoverContent = forwardRef<PopoverContentElement, ScopedProps<PopoverContentProps>>((props, ref) => {
  const { __scopePopover, forceMount, ...contentProps } = props
  const context = usePopoverContext('PopoverContent', __scopePopover)
  return (
    <Presence present={forceMount || context.open}>
      <Primitive.div role="dialog" id={context.contentId} data-state={context.open ? 'open' : 'closed'} {...contentProps} ref={ref} onKeyDown={composeEventHandlers(props.onKeyDown, (e) => { if (e.key === 'Escape') context.onOpenChange(false) })} />
    </Presence>
  )
})

type PopoverCloseElement = ElementRef<typeof Primitive.button>
interface PopoverCloseProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const PopoverClose = forwardRef<PopoverCloseElement, ScopedProps<PopoverCloseProps>>((props, ref) => {
  const { __scopePopover, ...closeProps } = props
  const context = usePopoverContext('PopoverClose', __scopePopover)
  return <Primitive.button type="button" {...closeProps} ref={ref} onClick={composeEventHandlers(props.onClick, () => context.onOpenChange(false))} />
})

type PopoverAnchorElement = ElementRef<typeof Primitive.div>
interface PopoverAnchorProps extends ComponentPropsWithoutRef<typeof Primitive.div> {}
const PopoverAnchor = forwardRef<PopoverAnchorElement, ScopedProps<PopoverAnchorProps>>((props, ref) => <Primitive.div {...props} ref={ref} />)

type PopoverArrowElement = ElementRef<typeof Primitive.svg>
interface PopoverArrowProps extends ComponentPropsWithoutRef<typeof Primitive.svg> {}
const PopoverArrow = forwardRef<PopoverArrowElement, ScopedProps<PopoverArrowProps>>((props, ref) => <Primitive.svg {...props} ref={ref} />)

const Root = Popover; const Trigger = PopoverTrigger; const Portal = PopoverPortal; const Content = PopoverContent; const Close = PopoverClose; const Anchor = PopoverAnchor; const Arrow = PopoverArrow

export { createPopoverScope, Popover, PopoverTrigger, PopoverPortal, PopoverContent, PopoverClose, PopoverAnchor, PopoverArrow, Root, Trigger, Portal, Content, Close, Anchor, Arrow }
export type { PopoverProps, PopoverTriggerProps, PopoverPortalProps, PopoverContentProps, PopoverCloseProps, PopoverAnchorProps, PopoverArrowProps }

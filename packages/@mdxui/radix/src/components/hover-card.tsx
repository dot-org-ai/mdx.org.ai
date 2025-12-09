/**
 * @mdxui/radix - HoverCard
 * A card that appears on hover.
 * TODO: Full implementation with floating-ui positioning
 */

import { forwardRef, useRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const HOVER_CARD_NAME = 'HoverCard'
type ScopedProps<P> = P & { __scopeHoverCard?: Scope }
const [createHoverCardContext, createHoverCardScope] = createContextScope(HOVER_CARD_NAME)

type HoverCardContextValue = { contentId: string; open: boolean; onOpenChange(open: boolean): void; openDelay: number; closeDelay: number }
const [HoverCardProvider, useHoverCardContext] = createHoverCardContext<HoverCardContextValue>(HOVER_CARD_NAME)

interface HoverCardProps { children?: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?(open: boolean): void; openDelay?: number; closeDelay?: number }

const HoverCard = (props: ScopedProps<HoverCardProps>) => {
  const { __scopeHoverCard, children, open: openProp, defaultOpen = false, onOpenChange, openDelay = 700, closeDelay = 300 } = props
  const [open = false, setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange })

  return (
    <HoverCardProvider scope={__scopeHoverCard} contentId={useId()} open={open} onOpenChange={setOpen} openDelay={openDelay} closeDelay={closeDelay}>
      {children}
    </HoverCardProvider>
  )
}

type HoverCardTriggerElement = ElementRef<typeof Primitive.a>
interface HoverCardTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.a> {}
const HoverCardTrigger = forwardRef<HoverCardTriggerElement, ScopedProps<HoverCardTriggerProps>>((props, ref) => {
  const { __scopeHoverCard, ...triggerProps } = props
  const context = useHoverCardContext('HoverCardTrigger', __scopeHoverCard)
  const openTimerRef = useRef<number>()
  const closeTimerRef = useRef<number>()

  return (
    <Primitive.a
      data-state={context.open ? 'open' : 'closed'}
      {...triggerProps}
      ref={ref}
      onMouseEnter={(e) => {
        props.onMouseEnter?.(e)
        window.clearTimeout(closeTimerRef.current)
        openTimerRef.current = window.setTimeout(() => context.onOpenChange(true), context.openDelay)
      }}
      onMouseLeave={(e) => {
        props.onMouseLeave?.(e)
        window.clearTimeout(openTimerRef.current)
        closeTimerRef.current = window.setTimeout(() => context.onOpenChange(false), context.closeDelay)
      }}
    />
  )
})

interface HoverCardPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const HoverCardPortal = (props: ScopedProps<HoverCardPortalProps>) => {
  const { __scopeHoverCard, forceMount, children, container } = props
  const context = useHoverCardContext('HoverCardPortal', __scopeHoverCard)
  return <Presence present={forceMount || context.open}><PortalPrimitive container={container}>{children}</PortalPrimitive></Presence>
}

type HoverCardContentElement = ElementRef<typeof Primitive.div>
interface HoverCardContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> { side?: 'top' | 'right' | 'bottom' | 'left'; sideOffset?: number; align?: 'start' | 'center' | 'end'; forceMount?: true }
const HoverCardContent = forwardRef<HoverCardContentElement, ScopedProps<HoverCardContentProps>>((props, ref) => {
  const { __scopeHoverCard, forceMount, ...contentProps } = props
  const context = useHoverCardContext('HoverCardContent', __scopeHoverCard)
  return (
    <Presence present={forceMount || context.open}>
      <Primitive.div data-state={context.open ? 'open' : 'closed'} {...contentProps} ref={ref} />
    </Presence>
  )
})

type HoverCardArrowElement = ElementRef<typeof Primitive.svg>
interface HoverCardArrowProps extends ComponentPropsWithoutRef<typeof Primitive.svg> {}
const HoverCardArrow = forwardRef<HoverCardArrowElement, ScopedProps<HoverCardArrowProps>>((props, ref) => <Primitive.svg {...props} ref={ref} />)

const Root = HoverCard; const Trigger = HoverCardTrigger; const Portal = HoverCardPortal; const Content = HoverCardContent; const Arrow = HoverCardArrow

export { createHoverCardScope, HoverCard, HoverCardTrigger, HoverCardPortal, HoverCardContent, HoverCardArrow, Root, Trigger, Portal, Content, Arrow }
export type { HoverCardProps, HoverCardTriggerProps, HoverCardPortalProps, HoverCardContentProps, HoverCardArrowProps }

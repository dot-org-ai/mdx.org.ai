/**
 * @mdxui/radix - Tooltip
 * A popup that displays content on hover/focus.
 * TODO: Full implementation with floating-ui positioning
 */

import { forwardRef, useState, useRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from '@mdxui/jsx'
import { Primitive, Portal as PortalPrimitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, type Scope } from '@mdxui/jsx/utils'

const TOOLTIP_NAME = 'Tooltip'
type ScopedProps<P> = P & { __scopeTooltip?: Scope }
const [createTooltipContext, createTooltipScope] = createContextScope(TOOLTIP_NAME)

type TooltipContextValue = { contentId: string; open: boolean; onOpenChange(open: boolean): void; triggerRef: React.RefObject<HTMLButtonElement>; disableHoverableContent: boolean; delayDuration: number }
const [TooltipProvider, useTooltipContext] = createTooltipContext<TooltipContextValue>(TOOLTIP_NAME)

// Provider
interface TooltipProviderProps { children?: ReactNode; delayDuration?: number; skipDelayDuration?: number; disableHoverableContent?: boolean }
const TooltipProviderImpl = (props: TooltipProviderProps) => <>{props.children}</>

interface TooltipProps { children?: ReactNode; open?: boolean; defaultOpen?: boolean; onOpenChange?(open: boolean): void; delayDuration?: number; disableHoverableContent?: boolean }

const Tooltip = (props: ScopedProps<TooltipProps>) => {
  const { __scopeTooltip, children, open: openProp, defaultOpen = false, onOpenChange, delayDuration = 700, disableHoverableContent = false } = props
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open = false, setOpen] = useControllableState({ prop: openProp, defaultProp: defaultOpen, onChange: onOpenChange })

  return (
    <TooltipProvider scope={__scopeTooltip} contentId={useId()} open={open} onOpenChange={setOpen} triggerRef={triggerRef} disableHoverableContent={disableHoverableContent} delayDuration={delayDuration}>
      {children}
    </TooltipProvider>
  )
}

type TooltipTriggerElement = ElementRef<typeof Primitive.button>
interface TooltipTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {}
const TooltipTrigger = forwardRef<TooltipTriggerElement, ScopedProps<TooltipTriggerProps>>((props, ref) => {
  const { __scopeTooltip, ...triggerProps } = props
  const context = useTooltipContext('TooltipTrigger', __scopeTooltip)
  const openTimerRef = useRef<number>()

  return (
    <Primitive.button
      type="button"
      aria-describedby={context.open ? context.contentId : undefined}
      data-state={context.open ? 'open' : 'closed'}
      {...triggerProps}
      ref={ref}
      onMouseEnter={(e) => {
        props.onMouseEnter?.(e)
        openTimerRef.current = window.setTimeout(() => context.onOpenChange(true), context.delayDuration)
      }}
      onMouseLeave={(e) => {
        props.onMouseLeave?.(e)
        window.clearTimeout(openTimerRef.current)
        context.onOpenChange(false)
      }}
      onFocus={(e) => {
        props.onFocus?.(e)
        context.onOpenChange(true)
      }}
      onBlur={(e) => {
        props.onBlur?.(e)
        context.onOpenChange(false)
      }}
    />
  )
})

interface TooltipPortalProps { children?: ReactNode; container?: HTMLElement | null; forceMount?: true }
const TooltipPortal = (props: ScopedProps<TooltipPortalProps>) => {
  const { __scopeTooltip, forceMount, children, container } = props
  const context = useTooltipContext('TooltipPortal', __scopeTooltip)
  return <Presence present={forceMount || context.open}><PortalPrimitive container={container}>{children}</PortalPrimitive></Presence>
}

type TooltipContentElement = ElementRef<typeof Primitive.div>
interface TooltipContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> { side?: 'top' | 'right' | 'bottom' | 'left'; sideOffset?: number; align?: 'start' | 'center' | 'end'; alignOffset?: number; forceMount?: true }
const TooltipContent = forwardRef<TooltipContentElement, ScopedProps<TooltipContentProps>>((props, ref) => {
  const { __scopeTooltip, forceMount, sideOffset = 0, ...contentProps } = props
  const context = useTooltipContext('TooltipContent', __scopeTooltip)
  return (
    <Presence present={forceMount || context.open}>
      <Primitive.div role="tooltip" id={context.contentId} data-state={context.open ? 'open' : 'closed'} {...contentProps} ref={ref} style={{ ...contentProps.style, '--radix-tooltip-trigger-width': 'auto', '--radix-tooltip-trigger-height': 'auto', '--radix-tooltip-content-transform-origin': 'var(--radix-popper-transform-origin)' } as React.CSSProperties} />
    </Presence>
  )
})

type TooltipArrowElement = ElementRef<typeof Primitive.svg>
interface TooltipArrowProps extends ComponentPropsWithoutRef<typeof Primitive.svg> {}
const TooltipArrow = forwardRef<TooltipArrowElement, ScopedProps<TooltipArrowProps>>((props, ref) => <Primitive.svg {...props} ref={ref} />)

const Provider = TooltipProviderImpl; const Root = Tooltip; const Trigger = TooltipTrigger; const Portal = TooltipPortal; const Content = TooltipContent; const Arrow = TooltipArrow

export { createTooltipScope, TooltipProviderImpl as TooltipProvider, Tooltip, TooltipTrigger, TooltipPortal, TooltipContent, TooltipArrow, Provider, Root, Trigger, Portal, Content, Arrow }
export type { TooltipProviderProps, TooltipProps, TooltipTriggerProps, TooltipPortalProps, TooltipContentProps, TooltipArrowProps }

import {
  forwardRef,
  useRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'

/* -------------------------------------------------------------------------------------------------
 * Collapsible
 * -----------------------------------------------------------------------------------------------*/

const COLLAPSIBLE_NAME = 'Collapsible'

type ScopedProps<P> = P & { __scopeCollapsible?: Scope }
const [createCollapsibleContext, createCollapsibleScope] =
  createContextScope(COLLAPSIBLE_NAME)

type CollapsibleContextValue = {
  contentId: string
  disabled?: boolean
  open: boolean
  onOpenToggle(): void
}

const [CollapsibleProvider, useCollapsibleContext] =
  createCollapsibleContext<CollapsibleContextValue>(COLLAPSIBLE_NAME)

type CollapsibleElement = ElementRef<typeof Primitive.div>
interface CollapsibleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * The open state when initially rendered. Use when you do not need to control the state.
   */
  defaultOpen?: boolean
  /**
   * The controlled open state.
   */
  open?: boolean
  /**
   * Whether the collapsible is disabled.
   */
  disabled?: boolean
  /**
   * Event handler called when the open state changes.
   */
  onOpenChange?(open: boolean): void
}

/**
 * Collapsible displays a panel that can be toggled open or closed.
 *
 * @example
 * ```tsx
 * <Collapsible>
 *   <CollapsibleTrigger>Toggle</CollapsibleTrigger>
 *   <CollapsibleContent>Content</CollapsibleContent>
 * </Collapsible>
 * ```
 */
const Collapsible = forwardRef<CollapsibleElement, ScopedProps<CollapsibleProps>>(
  (props, forwardedRef) => {
    const {
      __scopeCollapsible,
      open: openProp,
      defaultOpen,
      disabled,
      onOpenChange,
      ...collapsibleProps
    } = props

    const [open = false, setOpen] = useControllableState({
      prop: openProp,
      defaultProp: defaultOpen,
      onChange: onOpenChange,
    })

    return (
      <CollapsibleProvider
        scope={__scopeCollapsible}
        disabled={disabled}
        contentId={useId()}
        open={open}
        onOpenToggle={() => setOpen((prevOpen) => !prevOpen)}
      >
        <Primitive.div
          data-state={getState(open)}
          data-disabled={disabled ? '' : undefined}
          {...collapsibleProps}
          ref={forwardedRef}
        />
      </CollapsibleProvider>
    )
  }
)

Collapsible.displayName = COLLAPSIBLE_NAME

/* -------------------------------------------------------------------------------------------------
 * CollapsibleTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'CollapsibleTrigger'

type CollapsibleTriggerElement = ElementRef<typeof Primitive.button>
interface CollapsibleTriggerProps
  extends ComponentPropsWithoutRef<typeof Primitive.button> {}

const CollapsibleTrigger = forwardRef<
  CollapsibleTriggerElement,
  ScopedProps<CollapsibleTriggerProps>
>((props, forwardedRef) => {
  const { __scopeCollapsible, ...triggerProps } = props
  const context = useCollapsibleContext(TRIGGER_NAME, __scopeCollapsible)

  return (
    <Primitive.button
      type="button"
      aria-controls={context.contentId}
      aria-expanded={context.open}
      data-state={getState(context.open)}
      data-disabled={context.disabled ? '' : undefined}
      disabled={context.disabled}
      {...triggerProps}
      ref={forwardedRef}
      onClick={composeEventHandlers(props.onClick, context.onOpenToggle)}
    />
  )
})

CollapsibleTrigger.displayName = TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * CollapsibleContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'CollapsibleContent'

type CollapsibleContentElement = ElementRef<typeof Primitive.div>
interface CollapsibleContentProps
  extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * Used to force mounting when more control is needed.
   */
  forceMount?: true
}

const CollapsibleContent = forwardRef<
  CollapsibleContentElement,
  ScopedProps<CollapsibleContentProps>
>((props, forwardedRef) => {
  const { __scopeCollapsible, forceMount, ...contentProps } = props
  const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible)

  return (
    <Presence present={forceMount || context.open}>
      {({ present }) =>
        present ? (
          <CollapsibleContentImpl
            {...contentProps}
            ref={forwardedRef}
            __scopeCollapsible={__scopeCollapsible}
          />
        ) : null
      }
    </Presence>
  )
})

CollapsibleContent.displayName = CONTENT_NAME

/* -------------------------------------------------------------------------------------------------
 * CollapsibleContentImpl
 * -----------------------------------------------------------------------------------------------*/

const CollapsibleContentImpl = forwardRef<
  CollapsibleContentElement,
  ScopedProps<ComponentPropsWithoutRef<typeof Primitive.div>>
>((props, forwardedRef) => {
  const { __scopeCollapsible, style, ...contentProps } = props
  const context = useCollapsibleContext(CONTENT_NAME, __scopeCollapsible)
  const isOpen = context.open

  return (
    <Primitive.div
      id={context.contentId}
      data-state={getState(isOpen)}
      data-disabled={context.disabled ? '' : undefined}
      hidden={!isOpen}
      {...contentProps}
      ref={forwardedRef}
      style={{
        ...style,
      }}
    />
  )
})

/* ---------------------------------------------------------------------------------------------- */

function getState(open?: boolean) {
  return open ? 'open' : 'closed'
}

const Root = Collapsible
const Trigger = CollapsibleTrigger
const Content = CollapsibleContent

export {
  createCollapsibleScope,
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  Root,
  Trigger,
  Content,
}
export type {
  CollapsibleProps,
  CollapsibleTriggerProps,
  CollapsibleContentProps,
}

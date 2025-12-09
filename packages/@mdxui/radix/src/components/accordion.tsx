/**
 * @mdxui/radix - Accordion
 *
 * A vertically stacked set of interactive headings that reveal associated content.
 * Built on top of Collapsible.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive, Presence } from '@mdxui/jsx/primitives'
import { useControllableState, useId } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
  createCollapsibleScope,
} from './collapsible'

/* -------------------------------------------------------------------------------------------------
 * Accordion
 * -----------------------------------------------------------------------------------------------*/

const ACCORDION_NAME = 'Accordion'

type ScopedProps<P> = P & { __scopeAccordion?: Scope }
const [createAccordionContext, createAccordionScope] = createContextScope(ACCORDION_NAME, [
  createCollapsibleScope,
])
const useCollapsibleScope = createCollapsibleScope()

type AccordionContextValue = {
  disabled?: boolean
  direction: 'ltr' | 'rtl'
  orientation: 'horizontal' | 'vertical'
}

const [AccordionProvider, useAccordionContext] =
  createAccordionContext<AccordionContextValue>(ACCORDION_NAME)

type AccordionValueContextValue = {
  value: string[]
  onItemOpen(value: string): void
  onItemClose(value: string): void
}

const [AccordionValueProvider, useAccordionValueContext] =
  createAccordionContext<AccordionValueContextValue>(ACCORDION_NAME)

type AccordionElement = ElementRef<typeof Primitive.div>
interface AccordionSingleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  type: 'single'
  value?: string
  defaultValue?: string
  onValueChange?(value: string): void
  collapsible?: boolean
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
  orientation?: 'horizontal' | 'vertical'
}

interface AccordionMultipleProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  type: 'multiple'
  value?: string[]
  defaultValue?: string[]
  onValueChange?(value: string[]): void
  disabled?: boolean
  dir?: 'ltr' | 'rtl'
  orientation?: 'horizontal' | 'vertical'
}

type AccordionProps = AccordionSingleProps | AccordionMultipleProps

const Accordion = forwardRef<AccordionElement, ScopedProps<AccordionProps>>(
  (props, forwardedRef) => {
    const {
      __scopeAccordion,
      type,
      disabled = false,
      dir = 'ltr',
      orientation = 'vertical',
      ...accordionProps
    } = props

    if (type === 'single') {
      return (
        <AccordionImplSingle
          {...(accordionProps as AccordionSingleProps)}
          ref={forwardedRef}
          disabled={disabled}
          dir={dir}
          orientation={orientation}
          __scopeAccordion={__scopeAccordion}
        />
      )
    }

    return (
      <AccordionImplMultiple
        {...(accordionProps as AccordionMultipleProps)}
        ref={forwardedRef}
        disabled={disabled}
        dir={dir}
        orientation={orientation}
        __scopeAccordion={__scopeAccordion}
      />
    )
  }
)

Accordion.displayName = ACCORDION_NAME

/* -------------------------------------------------------------------------------------------------
 * AccordionImplSingle
 * -----------------------------------------------------------------------------------------------*/

const AccordionImplSingle = forwardRef<
  AccordionElement,
  ScopedProps<Omit<AccordionSingleProps, 'type'>>
>((props, forwardedRef) => {
  const {
    __scopeAccordion,
    value: valueProp,
    defaultValue,
    onValueChange,
    collapsible = false,
    disabled,
    dir,
    orientation,
    ...accordionProps
  } = props

  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  return (
    <AccordionProvider
      scope={__scopeAccordion}
      disabled={disabled}
      direction={dir!}
      orientation={orientation!}
    >
      <AccordionValueProvider
        scope={__scopeAccordion}
        value={value ? [value] : []}
        onItemOpen={setValue}
        onItemClose={() => collapsible && setValue('')}
      >
        <AccordionImpl
          {...accordionProps}
          ref={forwardedRef}
          __scopeAccordion={__scopeAccordion}
        />
      </AccordionValueProvider>
    </AccordionProvider>
  )
})

/* -------------------------------------------------------------------------------------------------
 * AccordionImplMultiple
 * -----------------------------------------------------------------------------------------------*/

const AccordionImplMultiple = forwardRef<
  AccordionElement,
  ScopedProps<Omit<AccordionMultipleProps, 'type'>>
>((props, forwardedRef) => {
  const {
    __scopeAccordion,
    value: valueProp,
    defaultValue,
    onValueChange,
    disabled,
    dir,
    orientation,
    ...accordionProps
  } = props

  const [value = [], setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })

  return (
    <AccordionProvider
      scope={__scopeAccordion}
      disabled={disabled}
      direction={dir!}
      orientation={orientation!}
    >
      <AccordionValueProvider
        scope={__scopeAccordion}
        value={value}
        onItemOpen={(itemValue) => setValue([...value, itemValue])}
        onItemClose={(itemValue) =>
          setValue(value.filter((v) => v !== itemValue))
        }
      >
        <AccordionImpl
          {...accordionProps}
          ref={forwardedRef}
          __scopeAccordion={__scopeAccordion}
        />
      </AccordionValueProvider>
    </AccordionProvider>
  )
})

/* -------------------------------------------------------------------------------------------------
 * AccordionImpl
 * -----------------------------------------------------------------------------------------------*/

const AccordionImpl = forwardRef<
  AccordionElement,
  ScopedProps<ComponentPropsWithoutRef<typeof Primitive.div>>
>((props, forwardedRef) => {
  const { __scopeAccordion, ...accordionProps } = props
  const context = useAccordionContext(ACCORDION_NAME, __scopeAccordion)

  return (
    <Primitive.div
      {...accordionProps}
      ref={forwardedRef}
      data-orientation={context.orientation}
    />
  )
})

/* -------------------------------------------------------------------------------------------------
 * AccordionItem
 * -----------------------------------------------------------------------------------------------*/

const ITEM_NAME = 'AccordionItem'

type AccordionItemContextValue = { open: boolean; disabled: boolean; triggerId: string }
const [AccordionItemProvider, useAccordionItemContext] =
  createAccordionContext<AccordionItemContextValue>(ITEM_NAME)

type AccordionItemElement = ElementRef<typeof Collapsible>
interface AccordionItemProps extends ComponentPropsWithoutRef<typeof Collapsible> {
  value: string
}

const AccordionItem = forwardRef<AccordionItemElement, ScopedProps<AccordionItemProps>>(
  (props, forwardedRef) => {
    const { __scopeAccordion, value, ...itemProps } = props
    const accordionContext = useAccordionContext(ITEM_NAME, __scopeAccordion)
    const valueContext = useAccordionValueContext(ITEM_NAME, __scopeAccordion)
    const collapsibleScope = useCollapsibleScope(__scopeAccordion)
    const triggerId = useId()
    const open = valueContext.value.includes(value)
    const disabled = accordionContext.disabled || itemProps.disabled

    return (
      <AccordionItemProvider
        scope={__scopeAccordion}
        open={open}
        disabled={!!disabled}
        triggerId={triggerId}
      >
        <Collapsible
          data-orientation={accordionContext.orientation}
          data-state={open ? 'open' : 'closed'}
          {...collapsibleScope}
          {...itemProps}
          ref={forwardedRef}
          disabled={disabled}
          open={open}
          onOpenChange={(open) => {
            if (open) {
              valueContext.onItemOpen(value)
            } else {
              valueContext.onItemClose(value)
            }
          }}
        />
      </AccordionItemProvider>
    )
  }
)

AccordionItem.displayName = ITEM_NAME

/* -------------------------------------------------------------------------------------------------
 * AccordionHeader
 * -----------------------------------------------------------------------------------------------*/

const HEADER_NAME = 'AccordionHeader'

type AccordionHeaderElement = ElementRef<typeof Primitive.h3>
interface AccordionHeaderProps extends ComponentPropsWithoutRef<typeof Primitive.h3> {}

const AccordionHeader = forwardRef<
  AccordionHeaderElement,
  ScopedProps<AccordionHeaderProps>
>((props, forwardedRef) => {
  const { __scopeAccordion, ...headerProps } = props
  const context = useAccordionContext(HEADER_NAME, __scopeAccordion)
  const itemContext = useAccordionItemContext(HEADER_NAME, __scopeAccordion)

  return (
    <Primitive.h3
      data-orientation={context.orientation}
      data-state={itemContext.open ? 'open' : 'closed'}
      data-disabled={itemContext.disabled ? '' : undefined}
      {...headerProps}
      ref={forwardedRef}
    />
  )
})

AccordionHeader.displayName = HEADER_NAME

/* -------------------------------------------------------------------------------------------------
 * AccordionTrigger
 * -----------------------------------------------------------------------------------------------*/

const TRIGGER_NAME = 'AccordionTrigger'

type AccordionTriggerElement = ElementRef<typeof CollapsibleTrigger>
interface AccordionTriggerProps
  extends ComponentPropsWithoutRef<typeof CollapsibleTrigger> {}

const AccordionTrigger = forwardRef<
  AccordionTriggerElement,
  ScopedProps<AccordionTriggerProps>
>((props, forwardedRef) => {
  const { __scopeAccordion, ...triggerProps } = props
  const context = useAccordionContext(TRIGGER_NAME, __scopeAccordion)
  const itemContext = useAccordionItemContext(TRIGGER_NAME, __scopeAccordion)
  const collapsibleScope = useCollapsibleScope(__scopeAccordion)

  return (
    <CollapsibleTrigger
      aria-disabled={itemContext.open && !context.disabled ? undefined : undefined}
      data-orientation={context.orientation}
      id={itemContext.triggerId}
      {...collapsibleScope}
      {...triggerProps}
      ref={forwardedRef}
    />
  )
})

AccordionTrigger.displayName = TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * AccordionContent
 * -----------------------------------------------------------------------------------------------*/

const CONTENT_NAME = 'AccordionContent'

type AccordionContentElement = ElementRef<typeof CollapsibleContent>
interface AccordionContentProps
  extends ComponentPropsWithoutRef<typeof CollapsibleContent> {}

const AccordionContent = forwardRef<
  AccordionContentElement,
  ScopedProps<AccordionContentProps>
>((props, forwardedRef) => {
  const { __scopeAccordion, ...contentProps } = props
  const context = useAccordionContext(CONTENT_NAME, __scopeAccordion)
  const itemContext = useAccordionItemContext(CONTENT_NAME, __scopeAccordion)
  const collapsibleScope = useCollapsibleScope(__scopeAccordion)

  return (
    <CollapsibleContent
      role="region"
      aria-labelledby={itemContext.triggerId}
      data-orientation={context.orientation}
      {...collapsibleScope}
      {...contentProps}
      ref={forwardedRef}
    />
  )
})

AccordionContent.displayName = CONTENT_NAME

/* ---------------------------------------------------------------------------------------------- */

const Root = Accordion
const Item = AccordionItem
const Header = AccordionHeader
const Trigger = AccordionTrigger
const Content = AccordionContent

export {
  createAccordionScope,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  Root,
  Item,
  Header,
  Trigger,
  Content,
}
export type {
  AccordionProps,
  AccordionSingleProps,
  AccordionMultipleProps,
  AccordionItemProps,
  AccordionHeaderProps,
  AccordionTriggerProps,
  AccordionContentProps,
}

import {
  forwardRef,
  useState,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { useControllableState, useId, useDirection } from '@mdxui/jsx/hooks'
import { createContextScope, composeEventHandlers, type Scope } from '@mdxui/jsx/utils'

/* -------------------------------------------------------------------------------------------------
 * Tabs
 * -----------------------------------------------------------------------------------------------*/

const TABS_NAME = 'Tabs'

type ScopedProps<P> = P & { __scopeTabs?: Scope }
const [createTabsContext, createTabsScope] = createContextScope(TABS_NAME)

type TabsContextValue = {
  baseId: string
  value?: string
  onValueChange(value: string): void
  orientation?: 'horizontal' | 'vertical'
  dir?: 'ltr' | 'rtl'
  activationMode?: 'automatic' | 'manual'
}

const [TabsProvider, useTabsContext] = createTabsContext<TabsContextValue>(TABS_NAME)

type TabsElement = ElementRef<typeof Primitive.div>
interface TabsProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * The value of the tab that should be active when initially rendered.
   */
  defaultValue?: string
  /**
   * The controlled value of the tab to activate.
   */
  value?: string
  /**
   * Event handler called when the value changes.
   */
  onValueChange?(value: string): void
  /**
   * The orientation of the tabs.
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical'
  /**
   * The reading direction of the tabs.
   */
  dir?: 'ltr' | 'rtl'
  /**
   * How the activation of tabs occurs.
   * @default 'automatic'
   */
  activationMode?: 'automatic' | 'manual'
}

/**
 * Tabs organize content into multiple sections with tabbed navigation.
 *
 * @example
 * ```tsx
 * <Tabs defaultValue="tab1">
 *   <TabsList>
 *     <TabsTrigger value="tab1">Tab 1</TabsTrigger>
 *     <TabsTrigger value="tab2">Tab 2</TabsTrigger>
 *   </TabsList>
 *   <TabsContent value="tab1">Content 1</TabsContent>
 *   <TabsContent value="tab2">Content 2</TabsContent>
 * </Tabs>
 * ```
 */
const Tabs = forwardRef<TabsElement, ScopedProps<TabsProps>>(
  (props, forwardedRef) => {
    const {
      __scopeTabs,
      value: valueProp,
      onValueChange,
      defaultValue,
      orientation = 'horizontal',
      dir,
      activationMode = 'automatic',
      ...tabsProps
    } = props

    const direction = useDirection(dir)
    const [value, setValue] = useControllableState({
      prop: valueProp,
      onChange: onValueChange,
      defaultProp: defaultValue,
    })

    return (
      <TabsProvider
        scope={__scopeTabs}
        baseId={useId()}
        value={value}
        onValueChange={setValue}
        orientation={orientation}
        dir={direction}
        activationMode={activationMode}
      >
        <Primitive.div
          dir={direction}
          data-orientation={orientation}
          {...tabsProps}
          ref={forwardedRef}
        />
      </TabsProvider>
    )
  }
)

Tabs.displayName = TABS_NAME

/* -------------------------------------------------------------------------------------------------
 * TabsList
 * -----------------------------------------------------------------------------------------------*/

const TABS_LIST_NAME = 'TabsList'

type TabsListElement = ElementRef<typeof Primitive.div>
interface TabsListProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * Whether the tabs list should loop when keyboard navigating.
   * @default true
   */
  loop?: boolean
}

const TabsList = forwardRef<TabsListElement, ScopedProps<TabsListProps>>(
  (props, forwardedRef) => {
    const { __scopeTabs, loop = true, ...listProps } = props
    const context = useTabsContext(TABS_LIST_NAME, __scopeTabs)

    return (
      <Primitive.div
        role="tablist"
        aria-orientation={context.orientation}
        data-orientation={context.orientation}
        {...listProps}
        ref={forwardedRef}
      />
    )
  }
)

TabsList.displayName = TABS_LIST_NAME

/* -------------------------------------------------------------------------------------------------
 * TabsTrigger
 * -----------------------------------------------------------------------------------------------*/

const TABS_TRIGGER_NAME = 'TabsTrigger'

type TabsTriggerElement = ElementRef<typeof Primitive.button>
interface TabsTriggerProps extends ComponentPropsWithoutRef<typeof Primitive.button> {
  /**
   * A unique value that associates the trigger with a content.
   */
  value: string
}

const TabsTrigger = forwardRef<TabsTriggerElement, ScopedProps<TabsTriggerProps>>(
  (props, forwardedRef) => {
    const { __scopeTabs, value, disabled = false, ...triggerProps } = props
    const context = useTabsContext(TABS_TRIGGER_NAME, __scopeTabs)
    const triggerId = makeTriggerId(context.baseId, value)
    const contentId = makeContentId(context.baseId, value)
    const isSelected = value === context.value

    return (
      <Primitive.button
        type="button"
        role="tab"
        aria-selected={isSelected}
        aria-controls={contentId}
        data-state={isSelected ? 'active' : 'inactive'}
        data-disabled={disabled ? '' : undefined}
        disabled={disabled}
        id={triggerId}
        {...triggerProps}
        ref={forwardedRef}
        onMouseDown={composeEventHandlers(props.onMouseDown, (event) => {
          // Only allow left clicks
          if (!disabled && event.button === 0 && event.ctrlKey === false) {
            context.onValueChange(value)
          } else {
            // Prevent focus to avoid tab selection
            event.preventDefault()
          }
        })}
        onKeyDown={composeEventHandlers(props.onKeyDown, (event) => {
          if ([' ', 'Enter'].includes(event.key)) {
            context.onValueChange(value)
          }
        })}
        onFocus={composeEventHandlers(props.onFocus, () => {
          // Handle `automatic` activation when focus moves to this trigger
          const isAutomaticActivation = context.activationMode !== 'manual'
          if (!isSelected && !disabled && isAutomaticActivation) {
            context.onValueChange(value)
          }
        })}
      />
    )
  }
)

TabsTrigger.displayName = TABS_TRIGGER_NAME

/* -------------------------------------------------------------------------------------------------
 * TabsContent
 * -----------------------------------------------------------------------------------------------*/

const TABS_CONTENT_NAME = 'TabsContent'

type TabsContentElement = ElementRef<typeof Primitive.div>
interface TabsContentProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  /**
   * A unique value that associates the content with a trigger.
   */
  value: string
  /**
   * Used to force mounting when more control is needed.
   */
  forceMount?: true
}

const TabsContent = forwardRef<TabsContentElement, ScopedProps<TabsContentProps>>(
  (props, forwardedRef) => {
    const { __scopeTabs, value, forceMount, ...contentProps } = props
    const context = useTabsContext(TABS_CONTENT_NAME, __scopeTabs)
    const triggerId = makeTriggerId(context.baseId, value)
    const contentId = makeContentId(context.baseId, value)
    const isSelected = value === context.value

    return (
      <Primitive.div
        id={contentId}
        role="tabpanel"
        aria-labelledby={triggerId}
        data-state={isSelected ? 'active' : 'inactive'}
        data-orientation={context.orientation}
        hidden={!forceMount && !isSelected}
        tabIndex={0}
        {...contentProps}
        ref={forwardedRef}
        style={{
          ...contentProps.style,
          // Prevent content from being announced by screen readers when hidden
          ...((!forceMount && !isSelected) && { display: 'none' }),
        }}
      />
    )
  }
)

TabsContent.displayName = TABS_CONTENT_NAME

/* ---------------------------------------------------------------------------------------------- */

function makeTriggerId(baseId: string, value: string) {
  return `${baseId}-trigger-${value}`
}

function makeContentId(baseId: string, value: string) {
  return `${baseId}-content-${value}`
}

const Root = Tabs
const List = TabsList
const Trigger = TabsTrigger
const Content = TabsContent

export {
  createTabsScope,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Root,
  List,
  Trigger,
  Content,
}
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps }

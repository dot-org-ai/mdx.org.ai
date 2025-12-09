/**
 * @mdxui/headless - Tabs component
 * A headless tabs component
 * API compatible with @headlessui/react Tab
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
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

type KeyboardEvent<T = Element> = React.KeyboardEvent<T>

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface TabContextValue {
  selectedIndex: number
  setSelectedIndex: (index: number) => void
  orientation: 'horizontal' | 'vertical'
  manual: boolean
  tabs: HTMLElement[]
  panels: HTMLElement[]
  registerTab: (element: HTMLElement) => void
  unregisterTab: (element: HTMLElement) => void
  registerPanel: (element: HTMLElement) => void
  unregisterPanel: (element: HTMLElement) => void
}

const TabContext = createContext<TabContextValue | null>(null)

function useTabContext(component: string) {
  const context = useContext(TabContext)
  if (!context) {
    throw new Error(`<Tab.${component} /> must be used within <Tab.Group />`)
  }
  return context
}

/* -------------------------------------------------------------------------------------------------
 * Tab Group
 * -----------------------------------------------------------------------------------------------*/

type TabGroupElement = ElementRef<typeof Primitive.div>
interface TabGroupProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'onChange' | 'defaultValue' | 'children'> {
  defaultIndex?: number
  selectedIndex?: number
  onChange?: (index: number) => void
  vertical?: boolean
  manual?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { selectedIndex: number }) => ReactNode)
}

const TabGroup = forwardRef<TabGroupElement, TabGroupProps>(
  (
    {
      children,
      defaultIndex = 0,
      selectedIndex: controlledIndex,
      onChange,
      vertical = false,
      manual = false,
      ...props
    },
    ref
  ) => {
    const [internalIndex, setInternalIndex] = useState(defaultIndex)
    const [tabs, setTabs] = useState<HTMLElement[]>([])
    const [panels, setPanels] = useState<HTMLElement[]>([])

    const selectedIndex = controlledIndex !== undefined ? controlledIndex : internalIndex

    const setSelectedIndex = useCallback(
      (index: number) => {
        if (controlledIndex === undefined) {
          setInternalIndex(index)
        }
        onChange?.(index)
      },
      [controlledIndex, onChange]
    )

    const registerTab = useCallback((element: HTMLElement) => {
      setTabs((prev) => [...prev, element])
    }, [])

    const unregisterTab = useCallback((element: HTMLElement) => {
      setTabs((prev) => prev.filter((tab) => tab !== element))
    }, [])

    const registerPanel = useCallback((element: HTMLElement) => {
      setPanels((prev) => [...prev, element])
    }, [])

    const unregisterPanel = useCallback((element: HTMLElement) => {
      setPanels((prev) => prev.filter((panel) => panel !== element))
    }, [])

    const contextValue = useMemo(
      () => ({
        selectedIndex,
        setSelectedIndex,
        orientation: vertical ? 'vertical' as const : 'horizontal' as const,
        manual,
        tabs,
        panels,
        registerTab,
        unregisterTab,
        registerPanel,
        unregisterPanel,
      }),
      [selectedIndex, setSelectedIndex, vertical, manual, tabs, panels, registerTab, unregisterTab, registerPanel, unregisterPanel]
    )

    const resolvedChildren =
      typeof children === 'function' ? children({ selectedIndex }) : children

    return (
      <TabContext.Provider value={contextValue}>
        <Primitive.div
          ref={ref}
          data-headlessui-state={`selected-${selectedIndex}`}
          {...props}
        >
          {resolvedChildren}
        </Primitive.div>
      </TabContext.Provider>
    )
  }
)
TabGroup.displayName = 'TabGroup'

/* -------------------------------------------------------------------------------------------------
 * Tab List
 * -----------------------------------------------------------------------------------------------*/

type TabListElement = ElementRef<typeof Primitive.div>
interface TabListProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const TabList = forwardRef<TabListElement, TabListProps>(
  ({ children, onKeyDown, ...props }, ref) => {
    const context = useTabContext('List')

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLDivElement>) => {
        const { tabs, selectedIndex, setSelectedIndex, orientation, manual } = context

        let nextIndex = selectedIndex
        const isHorizontal = orientation === 'horizontal'

        switch (e.key) {
          case isHorizontal ? 'ArrowRight' : 'ArrowDown':
            e.preventDefault()
            nextIndex = Math.min(selectedIndex + 1, tabs.length - 1)
            break
          case isHorizontal ? 'ArrowLeft' : 'ArrowUp':
            e.preventDefault()
            nextIndex = Math.max(selectedIndex - 1, 0)
            break
          case 'Home':
            e.preventDefault()
            nextIndex = 0
            break
          case 'End':
            e.preventDefault()
            nextIndex = tabs.length - 1
            break
          default:
            return
        }

        if (nextIndex !== selectedIndex) {
          if (!manual) {
            setSelectedIndex(nextIndex)
          }
          tabs[nextIndex]?.focus()
        }

        ;(onKeyDown as any)?.(e)
      },
      [context, onKeyDown]
    )

    return (
      <Primitive.div
        ref={ref}
        role="tablist"
        aria-orientation={context.orientation}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </Primitive.div>
    )
  }
)
TabList.displayName = 'TabList'

/* -------------------------------------------------------------------------------------------------
 * Tab
 * -----------------------------------------------------------------------------------------------*/

type TabElement = ElementRef<typeof Primitive.button>
interface TabProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.button>, 'children'> {
  disabled?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { selected: boolean }) => ReactNode)
}

const Tab = forwardRef<TabElement, TabProps>(
  ({ children, disabled = false, onClick, onFocus, ...props }, ref) => {
    const context = useTabContext('Tab')
    const tabRef = useRef<HTMLButtonElement>(null)
    const [index, setIndex] = useState(-1)
    const tabId = useId()
    const panelId = useId()

    const selected = context.selectedIndex === index

    // Register tab
    useEffect(() => {
      const element = tabRef.current
      if (!element) return

      context.registerTab(element)
      setIndex(context.tabs.indexOf(element))

      return () => {
        context.unregisterTab(element)
      }
    }, [context])

    // Update index when tabs change
    useEffect(() => {
      const element = tabRef.current
      if (element) {
        setIndex(context.tabs.indexOf(element))
      }
    }, [context.tabs])

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (disabled) {
          e.preventDefault()
          return
        }
        context.setSelectedIndex(index)
        ;(onClick as any)?.(e)
      },
      [context, disabled, index, onClick]
    )

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLButtonElement>) => {
        if (!disabled && !context.manual) {
          context.setSelectedIndex(index)
        }
        ;(onFocus as any)?.(e)
      },
      [context, disabled, index, onFocus]
    )

    const resolvedChildren = typeof children === 'function' ? children({ selected }) : children

    return (
      <Primitive.button
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(tabRef as any).current = node
        }}
        id={tabId}
        role="tab"
        type="button"
        tabIndex={selected ? 0 : -1}
        aria-selected={selected}
        aria-controls={panelId}
        aria-disabled={disabled || undefined}
        disabled={disabled}
        data-headlessui-state={`${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`.trim()}
        data-selected={selected ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        onClick={handleClick}
        onFocus={handleFocus}
        {...props}
      >
        {resolvedChildren}
      </Primitive.button>
    )
  }
)
Tab.displayName = 'Tab'

/* -------------------------------------------------------------------------------------------------
 * Tab Panels
 * -----------------------------------------------------------------------------------------------*/

type TabPanelsElement = ElementRef<typeof Primitive.div>
interface TabPanelsProps extends ComponentPropsWithoutRef<typeof Primitive.div> {
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
}

const TabPanels = forwardRef<TabPanelsElement, TabPanelsProps>(({ children, ...props }, ref) => {
  return (
    <Primitive.div ref={ref} {...props}>
      {children}
    </Primitive.div>
  )
})
TabPanels.displayName = 'TabPanels'

/* -------------------------------------------------------------------------------------------------
 * Tab Panel
 * -----------------------------------------------------------------------------------------------*/

type TabPanelElement = ElementRef<typeof Primitive.div>
interface TabPanelProps extends Omit<ComponentPropsWithoutRef<typeof Primitive.div>, 'children'> {
  static?: boolean
  unmount?: boolean
  as?: keyof JSX.IntrinsicElements | React.ComponentType<any>
  children?: ReactNode | ((props: { selected: boolean }) => ReactNode)
}

const TabPanel = forwardRef<TabPanelElement, TabPanelProps>(
  ({ children, static: isStatic = false, unmount = true, ...props }, ref) => {
    const context = useTabContext('Panel')
    const panelRef = useRef<HTMLDivElement>(null)
    const [index, setIndex] = useState(-1)
    const panelId = useId()

    const selected = context.selectedIndex === index

    // Register panel
    useEffect(() => {
      const element = panelRef.current
      if (!element) return

      context.registerPanel(element)
      setIndex(context.panels.indexOf(element))

      return () => {
        context.unregisterPanel(element)
      }
    }, [context])

    // Update index when panels change
    useEffect(() => {
      const element = panelRef.current
      if (element) {
        setIndex(context.panels.indexOf(element))
      }
    }, [context.panels])

    if (!isStatic && !selected && unmount) {
      return null
    }

    const resolvedChildren = typeof children === 'function' ? children({ selected }) : children

    return (
      <Primitive.div
        ref={(node) => {
          if (typeof ref === 'function') ref(node)
          else if (ref) ref.current = node
          ;(panelRef as any).current = node
        }}
        id={panelId}
        role="tabpanel"
        tabIndex={selected ? 0 : -1}
        aria-labelledby={context.tabs[index]?.id}
        data-headlessui-state={selected ? 'selected' : ''}
        data-selected={selected ? '' : undefined}
        hidden={!isStatic && !selected ? true : undefined}
        {...props}
      >
        {resolvedChildren}
      </Primitive.div>
    )
  }
)
TabPanel.displayName = 'TabPanel'

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

const TabComponent = Object.assign(Tab, {
  Group: TabGroup,
  List: TabList,
  Panels: TabPanels,
  Panel: TabPanel,
})

export {
  TabComponent as Tab,
  TabGroup,
  TabList,
  TabPanels,
  TabPanel,
}
export type {
  TabGroupProps,
  TabListProps,
  TabProps,
  TabPanelsProps,
  TabPanelProps,
}

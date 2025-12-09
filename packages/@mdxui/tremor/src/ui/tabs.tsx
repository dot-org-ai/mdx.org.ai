/**
 * Tabs - Tab navigation component using @mdxui/headless
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import {
  Tab as HeadlessTab,
  TabGroup,
  TabList as HeadlessTabList,
  TabPanels as HeadlessTabPanels,
  TabPanel as HeadlessTabPanel,
} from '@mdxui/headless'

/* -------------------------------------------------------------------------------------------------
 * TabGroup (re-export)
 * -----------------------------------------------------------------------------------------------*/

export { TabGroup }

/* -------------------------------------------------------------------------------------------------
 * TabList
 * -----------------------------------------------------------------------------------------------*/

type TabListElement = HTMLDivElement
interface TabListProps extends ComponentPropsWithoutRef<'div'> {
  /** Tab variant */
  variant?: 'line' | 'solid'
  /** Tab color */
  color?: string
}

const TabList = forwardRef<TabListElement, TabListProps>(
  ({ className = '', variant = 'line', ...props }, ref) => {
    const variantClass =
      variant === 'line'
        ? 'border-b border-border'
        : 'bg-muted p-1 rounded-lg'

    return (
      <HeadlessTabList
        ref={ref}
        className={`flex gap-1 ${variantClass} ${className}`.trim()}
        {...props}
      />
    )
  }
)
TabList.displayName = 'TabList'

/* -------------------------------------------------------------------------------------------------
 * Tab
 * -----------------------------------------------------------------------------------------------*/

type TabElement = HTMLButtonElement
interface TabProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  /** Tab icon */
  icon?: React.ComponentType<{ className?: string }>
  children?: React.ReactNode
}

const Tab = forwardRef<TabElement, TabProps>(
  ({ className = '', icon: Icon, children, ...props }, ref) => {
    return (
      <HeadlessTab
        ref={ref}
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow-sm ${className}`.trim()}
        {...props}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {children}
      </HeadlessTab>
    )
  }
)
Tab.displayName = 'Tab'

/* -------------------------------------------------------------------------------------------------
 * TabPanels
 * -----------------------------------------------------------------------------------------------*/

type TabPanelsElement = HTMLDivElement
interface TabPanelsProps extends ComponentPropsWithoutRef<'div'> {}

const TabPanels = forwardRef<TabPanelsElement, TabPanelsProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <HeadlessTabPanels
        ref={ref}
        className={`mt-2 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TabPanels.displayName = 'TabPanels'

/* -------------------------------------------------------------------------------------------------
 * TabPanel
 * -----------------------------------------------------------------------------------------------*/

type TabPanelElement = HTMLDivElement
interface TabPanelProps extends ComponentPropsWithoutRef<'div'> {}

const TabPanel = forwardRef<TabPanelElement, TabPanelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <HeadlessTabPanel
        ref={ref}
        className={`ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TabPanel.displayName = 'TabPanel'

export { TabList, Tab, TabPanels, TabPanel }
export type { TabListProps, TabProps, TabPanelsProps, TabPanelProps }

/**
 * Analytics Template
 *
 * Analytics dashboard focused on metrics and charts.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { Card } from '../ui/card'
import { Title } from '../ui/text'
import { TabGroup, TabList, Tab } from '../ui/tabs'

export interface AnalyticsTemplateProps extends ComponentPropsWithoutRef<'div'> {
  title?: string
  /** Time period tabs */
  periods?: Array<{
    label: string
    value: string
  }>
  /** Current period */
  activePeriod?: string
  /** Period change handler */
  onPeriodChange?: (period: string) => void
  /** Overview stats */
  overview?: ReactNode
  /** Charts section */
  charts?: ReactNode
  /** Breakdown/details section */
  breakdown?: ReactNode
  children?: ReactNode
}

type AnalyticsTemplateElement = HTMLDivElement

const AnalyticsTemplate = forwardRef<AnalyticsTemplateElement, AnalyticsTemplateProps>(
  ({
    title = 'Analytics',
    periods = [
      { label: '7 days', value: '7d' },
      { label: '30 days', value: '30d' },
      { label: '90 days', value: '90d' },
      { label: 'Year', value: '1y' },
    ],
    activePeriod = '30d',
    onPeriodChange,
    overview,
    charts,
    breakdown,
    children,
    className = '',
    ...props
  }, ref) => {
    const activeIndex = periods.findIndex((p) => p.value === activePeriod)

    return (
      <Primitive.div
        ref={ref}
        data-layout="dashboard"
        className={`min-h-screen ${className}`.trim()}
        {...props}
      >
        {/* Header */}
        <header className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <Title>{title}</Title>
            <TabGroup
              defaultIndex={activeIndex >= 0 ? activeIndex : 0}
              onChange={(i) => onPeriodChange?.(periods[i]?.value || '30d')}
            >
              <TabList variant="solid">
                {periods.map((period) => (
                  <Tab key={period.value}>{period.label}</Tab>
                ))}
              </TabList>
            </TabGroup>
          </div>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overview section */}
          {overview && (
            <section aria-label="Overview">
              {overview}
            </section>
          )}

          {/* Charts section */}
          {charts && (
            <section aria-label="Charts">
              <Card>
                {charts}
              </Card>
            </section>
          )}

          {/* Breakdown section */}
          {breakdown && (
            <section aria-label="Breakdown">
              <Card>
                {breakdown}
              </Card>
            </section>
          )}

          {/* Additional content */}
          {children}
        </div>
      </Primitive.div>
    )
  }
)
AnalyticsTemplate.displayName = 'AnalyticsTemplate'

export { AnalyticsTemplate }

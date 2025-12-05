/**
 * Analytics Template
 *
 * Analytics dashboard focused on metrics and charts.
 */

import * as React from 'react'
import { Card, Title, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@tremor/react'

export interface AnalyticsTemplateProps {
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
  overview?: React.ReactNode
  /** Charts section */
  charts?: React.ReactNode
  /** Breakdown/details section */
  breakdown?: React.ReactNode
  children?: React.ReactNode
}

export function AnalyticsTemplate({
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
}: AnalyticsTemplateProps) {
  const activeIndex = periods.findIndex((p) => p.value === activePeriod)

  return (
    <div data-layout="dashboard" className="min-h-screen">
      {/* Header */}
      <header className="border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <Title>{title}</Title>
          <TabGroup
            index={activeIndex >= 0 ? activeIndex : 0}
            onIndexChange={(i) => onPeriodChange?.(periods[i]?.value || '30d')}
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
    </div>
  )
}

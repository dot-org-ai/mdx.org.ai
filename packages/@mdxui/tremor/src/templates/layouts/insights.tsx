/**
 * Insights Layout
 *
 * Data visualization and analytics layout based on Tremor's Insights template.
 * Optimized for exploring data through interactive charts and tables.
 *
 * @see https://github.com/tremorlabs/template-insights
 */

import * as React from 'react'
import { Card, Title, Text, TabGroup, TabList, Tab, Divider } from '@tremor/react'
import type { KPICardProps } from '../../types'

/**
 * Filter option
 */
export interface FilterOption {
  label: string
  value: string
  count?: number
}

/**
 * Filter group
 */
export interface FilterGroup {
  id: string
  label: string
  type: 'select' | 'multiselect' | 'daterange' | 'search'
  options?: FilterOption[]
  value?: string | string[] | { start: Date; end: Date }
  onChange?: (value: unknown) => void
  placeholder?: string
}

/**
 * Tab configuration
 */
export interface TabConfig {
  label: string
  value: string
  /** Content for this tab */
  content?: React.ReactNode
  /** Badge count */
  badge?: number
}

/**
 * Chart section
 */
export interface ChartSection {
  id: string
  title: string
  description?: string
  /** Chart component */
  chart: React.ReactNode
  /** Optional comparison chart */
  comparison?: React.ReactNode
  /** Download/export actions */
  actions?: React.ReactNode
}

/**
 * Data table section
 */
export interface DataTableSection {
  id: string
  title: string
  description?: string
  /** Table component */
  table: React.ReactNode
  /** Pagination controls */
  pagination?: React.ReactNode
  /** Table actions (export, filter, etc.) */
  actions?: React.ReactNode
}

/**
 * Insight card for key findings
 */
export interface InsightCard {
  title: string
  description: string
  /** Trend indicator */
  trend?: {
    value: string | number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  /** Visual (chart, icon, etc.) */
  visual?: React.ReactNode
  /** Link to detailed view */
  link?: {
    href: string
    label: string
  }
}

/**
 * Insights Layout Props
 *
 * Unified interface for data exploration dashboards:
 * - Filters sidebar for data slicing
 * - Tabs for different views/dimensions
 * - KPIs for high-level metrics
 * - Charts for visualization
 * - Tables for detailed data
 * - Insights cards for AI-generated findings
 */
export interface InsightsLayoutProps {
  /** Page title */
  title?: string
  /** Description or subtitle */
  description?: string
  /** Filter groups (sidebar or top bar) */
  filters?: FilterGroup[]
  /** Tab configurations for different views */
  tabs?: TabConfig[]
  /** Active tab value */
  activeTab?: string
  /** Tab change handler */
  onTabChange?: (tab: string) => void
  /** KPI metrics */
  kpis?: KPICardProps[]
  /** Chart sections */
  charts?: ChartSection[]
  /** Data table sections */
  tables?: DataTableSection[]
  /** AI-generated insights */
  insights?: InsightCard[]
  /** Additional sections */
  sections?: Array<{
    id?: string
    title?: string
    component: React.ReactNode
  }>
  /** Layout variant */
  variant?: 'default' | 'sidebar-filters' | 'top-filters'
  /** Additional content */
  children?: React.ReactNode
}

/**
 * Insights Layout Component
 *
 * Renders a data exploration dashboard with:
 * - Filters for data slicing (sidebar or top)
 * - Tabs for different perspectives
 * - KPI overview
 * - Interactive charts
 * - Detailed data tables
 * - AI-generated insights
 *
 * Uses semantic markup and data attributes:
 * - data-layout="insights"
 * - data-region for specific areas
 */
export function InsightsLayout({
  title = 'Insights',
  description,
  filters,
  tabs,
  activeTab,
  onTabChange,
  kpis,
  charts,
  tables,
  insights,
  sections,
  variant = 'default',
  children,
}: InsightsLayoutProps) {
  const hasFilters = filters && filters.length > 0
  const hasTabs = tabs && tabs.length > 0
  const hasKPIs = kpis && kpis.length > 0
  const hasCharts = charts && charts.length > 0
  const hasTables = tables && tables.length > 0
  const hasInsights = insights && insights.length > 0
  const hasSections = sections && sections.length > 0
  const showSidebarFilters = hasFilters && variant === 'sidebar-filters'

  // Find active tab content
  const activeTabContent = hasTabs
    ? tabs.find((t) => t.value === activeTab)?.content
    : null

  return (
    <div
      data-layout="insights"
      data-variant={variant}
      className="flex min-h-screen bg-background"
    >
      {/* Sidebar Filters */}
      {showSidebarFilters && (
        <aside
          data-region="filters"
          className="w-72 border-r border-border bg-muted/30 flex-shrink-0"
        >
          <div className="sticky top-0 p-6">
            <Title className="mb-4">Filters</Title>
            <div className="space-y-6">
              {filters.map((filter) => (
                <div key={filter.id}>
                  <label className="text-sm font-medium mb-2 block">
                    {filter.label}
                  </label>
                  {filter.type === 'search' ? (
                    <input
                      type="search"
                      placeholder={filter.placeholder || 'Search...'}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      onChange={(e) => filter.onChange?.(e.target.value)}
                    />
                  ) : filter.type === 'select' ? (
                    <select
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      value={filter.value as string}
                      onChange={(e) => filter.onChange?.(e.target.value)}
                    >
                      {filter.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                          {opt.count !== undefined ? ` (${opt.count})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      {filter.type} filter
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header data-region="header" className="border-b border-border bg-background">
          <div className="px-6 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <Title className="truncate">{title}</Title>
                {description && (
                  <Text className="mt-1 text-muted-foreground">
                    {description}
                  </Text>
                )}
              </div>
            </div>

            {/* Top Filters */}
            {hasFilters && variant === 'top-filters' && (
              <div className="mt-4 flex flex-wrap gap-4">
                {filters.map((filter) => (
                  <div key={filter.id} className="flex-1 min-w-[200px]">
                    <label className="text-sm font-medium mb-1 block">
                      {filter.label}
                    </label>
                    {filter.type === 'search' ? (
                      <input
                        type="search"
                        placeholder={filter.placeholder || 'Search...'}
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        onChange={(e) => filter.onChange?.(e.target.value)}
                      />
                    ) : filter.type === 'select' ? (
                      <select
                        className="w-full px-3 py-2 border rounded-md text-sm"
                        value={filter.value as string}
                        onChange={(e) => filter.onChange?.(e.target.value)}
                      >
                        {filter.options?.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            )}

            {/* Tabs */}
            {hasTabs && (
              <div className="mt-4">
                <TabGroup
                  index={tabs.findIndex((t) => t.value === activeTab)}
                  onIndexChange={(i) => onTabChange?.(tabs[i]?.value || '')}
                >
                  <TabList variant="line">
                    {tabs.map((tab) => (
                      <Tab key={tab.value}>
                        {tab.label}
                        {tab.badge !== undefined && (
                          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                            {tab.badge}
                          </span>
                        )}
                      </Tab>
                    ))}
                  </TabList>
                </TabGroup>
              </div>
            )}
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* Tab Content */}
          {activeTabContent && (
            <div data-region="tab-content">{activeTabContent}</div>
          )}

          {/* KPIs */}
          {hasKPIs && (
            <section data-region="kpis" aria-label="Key Metrics">
              <div
                className={`grid gap-4 ${
                  kpis.length === 2
                    ? 'md:grid-cols-2'
                    : kpis.length === 3
                    ? 'md:grid-cols-3'
                    : 'md:grid-cols-2 lg:grid-cols-4'
                }`}
              >
                {kpis.map((kpi, i) => (
                  <Card key={i} decoration="top" decorationColor="indigo">
                    <Text className="text-muted-foreground">{kpi.title}</Text>
                    <div className="mt-2 flex items-baseline gap-2">
                      <p className="text-3xl font-bold">{kpi.value}</p>
                    </div>
                    {kpi.trend && (
                      <div className="mt-3 flex items-center gap-2">
                        <span
                          className={`text-sm font-medium ${
                            kpi.trend.direction === 'up'
                              ? 'text-green-600'
                              : kpi.trend.direction === 'down'
                              ? 'text-red-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {kpi.trend.direction === 'up' && '↑'}
                          {kpi.trend.direction === 'down' && '↓'}
                          {kpi.trend.direction === 'neutral' && '→'}
                          {' '}
                          {kpi.trend.value}
                        </span>
                        {kpi.trend.label && (
                          <Text className="text-xs">{kpi.trend.label}</Text>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* AI Insights */}
          {hasInsights && (
            <section data-region="insights" aria-label="Key Insights">
              <Title className="mb-4">Key Insights</Title>
              <div className="grid md:grid-cols-2 gap-4">
                {insights.map((insight, i) => (
                  <Card key={i}>
                    <div className="flex gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold mb-2">{insight.title}</h3>
                        <Text className="text-sm text-muted-foreground mb-3">
                          {insight.description}
                        </Text>
                        {insight.trend && (
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className={`text-sm font-medium ${
                                insight.trend.direction === 'up'
                                  ? 'text-green-600'
                                  : insight.trend.direction === 'down'
                                  ? 'text-red-600'
                                  : 'text-gray-600'
                              }`}
                            >
                              {insight.trend.direction === 'up' && '↑'}
                              {insight.trend.direction === 'down' && '↓'}
                              {insight.trend.direction === 'neutral' && '→'}
                              {' '}
                              {insight.trend.value}
                            </span>
                            {insight.trend.label && (
                              <Text className="text-xs">{insight.trend.label}</Text>
                            )}
                          </div>
                        )}
                        {insight.link && (
                          <a
                            href={insight.link.href}
                            className="text-sm text-primary hover:underline"
                          >
                            {insight.link.label} →
                          </a>
                        )}
                      </div>
                      {insight.visual && (
                        <div className="flex-shrink-0">{insight.visual}</div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Charts */}
          {hasCharts && (
            <section data-region="charts" aria-label="Visualizations">
              <div className="space-y-6">
                {charts.map((chartSection) => (
                  <Card key={chartSection.id}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Title>{chartSection.title}</Title>
                        {chartSection.description && (
                          <Text className="mt-1">{chartSection.description}</Text>
                        )}
                      </div>
                      {chartSection.actions && (
                        <div className="flex gap-2">{chartSection.actions}</div>
                      )}
                    </div>
                    <Divider />
                    <div className="mt-4">
                      {chartSection.chart}
                      {chartSection.comparison && (
                        <div className="mt-6 pt-6 border-t">
                          {chartSection.comparison}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Data Tables */}
          {hasTables && (
            <section data-region="tables" aria-label="Data Tables">
              <div className="space-y-6">
                {tables.map((tableSection) => (
                  <Card key={tableSection.id}>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <Title>{tableSection.title}</Title>
                        {tableSection.description && (
                          <Text className="mt-1">{tableSection.description}</Text>
                        )}
                      </div>
                      {tableSection.actions && (
                        <div className="flex gap-2">{tableSection.actions}</div>
                      )}
                    </div>
                    <Divider />
                    <div className="mt-4">
                      {tableSection.table}
                      {tableSection.pagination && (
                        <div className="mt-4 pt-4 border-t">
                          {tableSection.pagination}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          {/* Additional Sections */}
          {hasSections && (
            <div data-region="sections" className="space-y-6">
              {sections.map((section, i) => (
                <Card key={i} id={section.id}>
                  {section.title && <Title className="mb-4">{section.title}</Title>}
                  {section.title && <Divider className="mb-4" />}
                  {section.component}
                </Card>
              ))}
            </div>
          )}

          {/* Children */}
          {children}
        </div>
      </main>
    </div>
  )
}

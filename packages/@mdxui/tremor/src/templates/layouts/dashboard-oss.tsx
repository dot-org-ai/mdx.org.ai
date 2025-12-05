/**
 * Dashboard OSS Layout
 *
 * Main analytics dashboard layout based on Tremor's open-source template.
 * Maps to unified DashboardLayout types with semantic naming.
 *
 * @see https://github.com/tremorlabs/template-dashboard-oss
 */

import * as React from 'react'
import { Card, Title, Text, Grid, Col, Divider } from '@tremor/react'
import type { KPICardProps } from '../../types'

/**
 * Date range picker props
 */
export interface DateRangeProps {
  start: Date
  end: Date
  /** Preset options */
  presets?: Array<{
    label: string
    value: { start: Date; end: Date }
  }>
  /** Change handler */
  onChange?: (range: { start: Date; end: Date }) => void
}

/**
 * Navigation item
 */
export interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  active?: boolean
  badge?: string | number
}

/**
 * Widget props for sidebar or additional content areas
 */
export interface WidgetProps {
  title: string
  description?: string
  component: React.ReactNode
  /** Optional footer actions */
  footer?: React.ReactNode
}

/**
 * Main chart area props
 */
export interface ChartWidgetProps {
  title: string
  description?: string
  component: React.ReactNode
  /** Tab options for chart variants */
  tabs?: Array<{
    label: string
    value: string
  }>
  /** Active tab */
  activeTab?: string
  /** Tab change handler */
  onTabChange?: (tab: string) => void
}

/**
 * Dashboard OSS Layout Props
 *
 * Unified interface matching @mdxui Layout conventions:
 * - kpis (not metrics)
 * - sections (not blocks)
 * - navigation (for sidebar)
 */
export interface DashboardOSSLayoutProps {
  /** Page title */
  title?: string
  /** Subtitle or description */
  description?: string
  /** Date range selector */
  dateRange?: DateRangeProps
  /** Toolbar actions (buttons, filters, etc.) */
  actions?: React.ReactNode
  /** Sidebar navigation items */
  navigation?: NavItem[]
  /** KPI cards for overview section */
  kpis?: KPICardProps[]
  /** Main chart/visualization area */
  mainChart?: ChartWidgetProps
  /** Side widgets (top performers, recent activity, etc.) */
  widgets?: WidgetProps[]
  /** Additional content sections */
  sections?: Array<{
    title?: string
    component: React.ReactNode
  }>
  /** Footer content */
  footer?: React.ReactNode
  /** Additional child content */
  children?: React.ReactNode
  /** Layout variant */
  variant?: 'default' | 'condensed' | 'wide'
}

/**
 * Dashboard OSS Layout Component
 *
 * Renders a full-featured analytics dashboard with:
 * - Optional sidebar navigation
 * - Header with title, date range, and actions
 * - KPI cards grid
 * - Main chart area with optional tabs
 * - Side widgets column
 * - Additional content sections
 *
 * Uses semantic data attributes for styling and testing:
 * - data-layout="dashboard-oss"
 * - data-region="sidebar|header|kpis|main|widgets|sections"
 */
export function DashboardOSSLayout({
  title = 'Dashboard',
  description,
  dateRange,
  actions,
  navigation,
  kpis,
  mainChart,
  widgets,
  sections,
  footer,
  children,
  variant = 'default',
}: DashboardOSSLayoutProps) {
  const hasNavigation = navigation && navigation.length > 0
  const hasKPIs = kpis && kpis.length > 0
  const hasWidgets = widgets && widgets.length > 0
  const hasSections = sections && sections.length > 0

  return (
    <div
      data-layout="dashboard-oss"
      data-variant={variant}
      className="flex min-h-screen bg-background"
    >
      {/* Sidebar Navigation */}
      {hasNavigation && (
        <aside
          data-region="sidebar"
          className="w-64 border-r border-border bg-muted/30 flex-shrink-0"
        >
          <div className="sticky top-0 p-4">
            <nav className="space-y-1">
              {navigation.map((item, i) => (
                <a
                  key={i}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    item.active
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="rounded-full bg-background px-2 py-0.5 text-xs">
                      {item.badge}
                    </span>
                  )}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-w-0">
        {/* Header */}
        <header
          data-region="header"
          className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        >
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
              <div className="flex items-center gap-4 flex-shrink-0">
                {dateRange && (
                  <div className="text-sm text-muted-foreground whitespace-nowrap">
                    {dateRange.start.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    -{' '}
                    {dateRange.end.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                )}
                {actions}
              </div>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 space-y-6">
          {/* KPI Cards Section */}
          {hasKPIs && (
            <section data-region="kpis" aria-label="Key Performance Indicators">
              <Grid
                numItemsSm={2}
                numItemsLg={kpis.length > 4 ? 4 : kpis.length}
                className="gap-4"
              >
                {kpis.map((kpi, i) => (
                  <Col key={i}>
                    <Card decoration="top" decorationColor="blue">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <Text className="text-muted-foreground">{kpi.title}</Text>
                          <div className="mt-2 flex items-baseline gap-2">
                            <p className="text-3xl font-bold tracking-tight">
                              {kpi.value}
                            </p>
                          </div>
                          {kpi.comparison && (
                            <Text className="mt-2 text-xs text-muted-foreground">
                              vs {kpi.comparison.value} {kpi.comparison.label}
                            </Text>
                          )}
                        </div>
                        {kpi.icon && (
                          <div className="text-muted-foreground flex-shrink-0">
                            {kpi.icon}
                          </div>
                        )}
                      </div>
                      {kpi.trend && (
                        <div className="mt-4 flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                              kpi.trend.direction === 'up'
                                ? 'bg-green-50 text-green-700 ring-green-600/20'
                                : kpi.trend.direction === 'down'
                                ? 'bg-red-50 text-red-700 ring-red-600/20'
                                : 'bg-gray-50 text-gray-700 ring-gray-600/20'
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
                  </Col>
                ))}
              </Grid>
            </section>
          )}

          {/* Main Chart and Widgets Grid */}
          {(mainChart || hasWidgets) && (
            <Grid numItemsLg={hasWidgets ? 3 : 1} className="gap-6">
              {/* Main Chart Area */}
              {mainChart && (
                <Col numColSpanLg={hasWidgets ? 2 : 3}>
                  <Card data-region="main">
                    <div className="flex items-start justify-between">
                      <div>
                        <Title>{mainChart.title}</Title>
                        {mainChart.description && (
                          <Text className="mt-1">{mainChart.description}</Text>
                        )}
                      </div>
                      {mainChart.tabs && mainChart.tabs.length > 0 && (
                        <div className="flex gap-2">
                          {mainChart.tabs.map((tab) => (
                            <button
                              key={tab.value}
                              onClick={() => mainChart.onTabChange?.(tab.value)}
                              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                                mainChart.activeTab === tab.value
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {tab.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Divider />
                    <div className="mt-4">{mainChart.component}</div>
                  </Card>
                </Col>
              )}

              {/* Side Widgets */}
              {hasWidgets && (
                <Col data-region="widgets">
                  <div className="space-y-6">
                    {widgets.map((widget, i) => (
                      <Card key={i}>
                        <Title>{widget.title}</Title>
                        {widget.description && (
                          <Text className="mt-1">{widget.description}</Text>
                        )}
                        <Divider />
                        <div className="mt-4">{widget.component}</div>
                        {widget.footer && (
                          <>
                            <Divider />
                            <div className="mt-4">{widget.footer}</div>
                          </>
                        )}
                      </Card>
                    ))}
                  </div>
                </Col>
              )}
            </Grid>
          )}

          {/* Additional Content Sections */}
          {hasSections && (
            <div data-region="sections" className="space-y-6">
              {sections.map((section, i) => (
                <Card key={i}>
                  {section.title && <Title>{section.title}</Title>}
                  {section.title && <Divider />}
                  <div className={section.title ? 'mt-4' : ''}>
                    {section.component}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Children */}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <footer className="border-t border-border px-6 py-4 mt-auto">
            {footer}
          </footer>
        )}
      </main>
    </div>
  )
}

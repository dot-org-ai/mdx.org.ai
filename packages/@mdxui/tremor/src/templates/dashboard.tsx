/**
 * Dashboard Template
 *
 * Complete dashboard layout with sidebar, KPIs, and charts.
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import { Card } from '../ui/card'
import { Title, Text } from '../ui/text'
import { Grid, Col } from '../ui/grid'
import type { KPICardProps, DashboardLayoutProps } from '../types'

export interface DashboardTemplateProps extends DashboardLayoutProps {
  /** KPI cards for overview */
  kpis?: KPICardProps[]
  /** Main chart data */
  mainChart?: {
    title: string
    component: ReactNode
  }
  /** Side widgets */
  widgets?: Array<{
    title: string
    component: ReactNode
  }>
}

type DashboardTemplateElement = HTMLDivElement

const DashboardTemplate = forwardRef<DashboardTemplateElement, DashboardTemplateProps & ComponentPropsWithoutRef<'div'>>(
  ({
    title,
    dateRange,
    actions,
    navigation,
    kpis,
    mainChart,
    widgets,
    children,
    className = '',
    ...props
  }, ref) => {
    return (
      <Primitive.div
        ref={ref}
        data-layout="dashboard"
        className={`flex min-h-screen ${className}`.trim()}
        {...props}
      >
        {/* Sidebar */}
        {navigation && (
          <aside className="w-64 border-r bg-muted/50">
            <div className="p-4">
              <nav className="space-y-1">
                {navigation.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                      item.active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1">
          {/* Header */}
          <header className="border-b px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                {title && <Title>{title}</Title>}
              </div>
              <div className="flex items-center gap-4">
                {dateRange && (
                  <Text className="text-sm">
                    {dateRange.start.toLocaleDateString()} - {dateRange.end.toLocaleDateString()}
                  </Text>
                )}
                {actions}
              </div>
            </div>
          </header>

          {/* Dashboard content */}
          <div className="p-6">
            {/* KPIs */}
            {kpis && kpis.length > 0 && (
              <Grid numItemsLg={4} className="gap-4">
                {kpis.map((kpi, i) => (
                  <Col key={i}>
                    <Card>
                      <Text>{kpi.title}</Text>
                      <p className="mt-2 text-2xl font-bold">{kpi.value}</p>
                      {kpi.trend && (
                        <p
                          className={`mt-2 text-sm ${
                            kpi.trend.direction === 'up'
                              ? 'text-green-600'
                              : kpi.trend.direction === 'down'
                              ? 'text-red-600'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {kpi.trend.direction === 'up' ? '↑' : kpi.trend.direction === 'down' ? '↓' : '→'}{' '}
                          {kpi.trend.value}
                        </p>
                      )}
                    </Card>
                  </Col>
                ))}
              </Grid>
            )}

            {/* Main chart and widgets */}
            <Grid numItemsLg={3} className="mt-6 gap-6">
              {mainChart && (
                <Col numColSpanLg={2}>
                  <Card>
                    <Title>{mainChart.title}</Title>
                    <div className="mt-4">{mainChart.component}</div>
                  </Card>
                </Col>
              )}
              {widgets && widgets.length > 0 && (
                <Col>
                  <div className="space-y-6">
                    {widgets.map((widget, i) => (
                      <Card key={i}>
                        <Title>{widget.title}</Title>
                        <div className="mt-4">{widget.component}</div>
                      </Card>
                    ))}
                  </div>
                </Col>
              )}
            </Grid>

            {/* Additional content */}
            {children}
          </div>
        </main>
      </Primitive.div>
    )
  }
)
DashboardTemplate.displayName = 'DashboardTemplate'

export { DashboardTemplate }

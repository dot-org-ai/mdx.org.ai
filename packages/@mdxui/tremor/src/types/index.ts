/**
 * Shared Types for Tremor
 *
 * Types for dashboard components, charts, and analytics blocks.
 * Maps to DashboardLayout/AppLayout from @mdxui/html.
 */

import type { ReactNode } from 'react'

/**
 * Chart data point
 */
export interface DataPoint {
  [key: string]: string | number
}

/**
 * KPI Card (maps to DashboardStatProps)
 */
export interface KPICardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: string | number
    direction: 'up' | 'down' | 'neutral'
    label?: string
  }
  /** Comparison period */
  comparison?: {
    value: string | number
    label: string
  }
  /** Sparkline data */
  sparkline?: number[]
}

/**
 * Chart props base
 */
export interface ChartProps {
  data: DataPoint[]
  index: string
  categories: string[]
  colors?: string[]
  /** Show legend */
  showLegend?: boolean
  /** Show grid lines */
  showGrid?: boolean
  /** Show tooltip */
  showTooltip?: boolean
  /** Chart height */
  height?: number | string
  /** Animation duration */
  animationDuration?: number
}

/**
 * Line Chart props
 */
export interface LineChartProps extends ChartProps {
  /** Curve type */
  curveType?: 'linear' | 'natural' | 'monotone' | 'step'
  /** Connect nulls */
  connectNulls?: boolean
}

/**
 * Bar Chart props
 */
export interface BarChartProps extends ChartProps {
  /** Stack bars */
  stack?: boolean
  /** Horizontal layout */
  layout?: 'vertical' | 'horizontal'
  /** Relative mode (100% stacked) */
  relative?: boolean
}

/**
 * Area Chart props
 */
export interface AreaChartProps extends ChartProps {
  /** Stack areas */
  stack?: boolean
  /** Gradient fill */
  gradient?: boolean
}

/**
 * Donut Chart props
 */
export interface DonutChartProps {
  data: Array<{
    name: string
    value: number
  }>
  category: string
  index: string
  colors?: string[]
  /** Center label */
  label?: string
  /** Show legend */
  showLegend?: boolean
  /** Variant */
  variant?: 'donut' | 'pie'
}

/**
 * Sparkline props
 */
export interface SparklineProps {
  data: number[]
  color?: string
  height?: number
}

/**
 * Progress props
 */
export interface ProgressProps {
  value: number
  max?: number
  label?: string
  color?: string
  /** Show percentage */
  showPercentage?: boolean
}

/**
 * Data table column
 */
export interface TableColumn<T> {
  key: keyof T
  header: string
  /** Cell renderer */
  render?: (value: T[keyof T], row: T) => ReactNode
  /** Sortable */
  sortable?: boolean
  /** Alignment */
  align?: 'left' | 'center' | 'right'
}

/**
 * Data table props
 */
export interface DataTableProps<T extends object> {
  data: T[]
  columns: TableColumn<T>[]
  /** Row click handler */
  onRowClick?: (row: T) => void
  /** Selected rows */
  selectedRows?: T[]
  /** Pagination */
  pagination?: {
    page: number
    pageSize: number
    total: number
    onPageChange: (page: number) => void
  }
}

/**
 * Dashboard block categories from Tremor Blocks
 */
export type DashboardBlockCategory =
  | 'kpi'           // KPI cards
  | 'chart'         // Charts (line, bar, area, donut)
  | 'table'         // Data tables
  | 'list'          // List views
  | 'stat'          // Statistics displays
  | 'progress'      // Progress indicators
  | 'filter'        // Filter controls
  | 'date-picker'   // Date range pickers
  | 'search'        // Search inputs
  | 'billing'       // Billing/usage displays (GAP)
  | 'activity'      // Activity feeds (GAP)
  | 'notification'  // Notification panels (GAP)

/**
 * Dashboard Layout props (maps to DashboardLayout)
 */
export interface DashboardLayoutProps {
  /** Page title */
  title?: string
  /** Date range or time period selector */
  dateRange?: {
    start: Date
    end: Date
    presets?: Array<{
      label: string
      value: { start: Date; end: Date }
    }>
    onChange?: (range: { start: Date; end: Date }) => void
  }
  /** Toolbar actions */
  actions?: ReactNode
  /** Sidebar navigation */
  navigation?: Array<{
    label: string
    href: string
    icon?: ReactNode
    active?: boolean
  }>
  children: ReactNode
}

// =============================================================================
// GAPS IDENTIFIED:
// =============================================================================
//
// Missing from @mdxui/html views:
// - Billing/Usage view
// - Activity feed view
// - Notification panel
// - Analytics/Metrics view (specialized dashboard)
//
// Missing chart types from current implementation:
// - Sparkline (only have Stat with trend)
// - Funnel chart
// - Radar chart
// - Scatter plot
// - Treemap
// - Heatmap
//
// Missing from DashboardStatProps:
// - Icon support
// - Sparkline
// - Comparison period
// - Color theming
//
// Missing interactions:
// - Date range picker component
// - Filter/facet controls
// - Dashboard grid layout system
// - Widget resize/drag
//
// =============================================================================

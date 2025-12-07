# @mdxui/tremor

35+ Tremor dashboard components and 300+ blocks for data visualization, mapped to MDXUI abstract types. Build analytics dashboards and data-rich applications.

## Installation

```bash
pnpm add @mdxui/tremor @tremor/react
```

Requires peer dependencies:

```bash
pnpm add react react-dom
```

## Usage

### Charts

```tsx
import { LineChart, BarChart, DonutChart } from '@mdxui/tremor/charts'

function Dashboard() {
  const data = [
    { month: 'Jan', sales: 2400, revenue: 1800 },
    { month: 'Feb', sales: 1398, revenue: 2100 },
    { month: 'Mar', sales: 9800, revenue: 4300 }
  ]

  return (
    <>
      <LineChart
        data={data}
        index="month"
        categories={['sales', 'revenue']}
        colors={['blue', 'green']}
      />

      <BarChart
        data={data}
        index="month"
        categories={['sales']}
        colors={['indigo']}
      />

      <DonutChart
        data={[
          { name: 'Direct', value: 453 },
          { name: 'Organic', value: 351 }
        ]}
        category="value"
        index="name"
      />
    </>
  )
}
```

### Dashboard Blocks

```tsx
import { KPICard, MetricGrid, DataTable } from '@mdxui/tremor/blocks'

function Analytics() {
  return (
    <>
      <MetricGrid
        metrics={[
          { title: 'Revenue', value: '$45,231', change: '+12%', trend: 'up' },
          { title: 'Users', value: '2,456', change: '+8%', trend: 'up' }
        ]}
      />

      <KPICard
        title="Total Sales"
        value="$71,897"
        change={4.3}
        changeType="increase"
      >
        <LineChart data={salesData} />
      </KPICard>
    </>
  )
}
```

### Dashboard Templates

```tsx
import { DashboardLayout } from '@mdxui/tremor/templates/layouts'

function AnalyticsDashboard() {
  return (
    <DashboardLayout
      sidebar={<Sidebar />}
      header={<Header />}
    >
      {/* Dashboard content */}
    </DashboardLayout>
  )
}
```

## Chart Types

- **LineChart** - Time-series and trend visualization
- **BarChart** - Categorical comparisons
- **AreaChart** - Stacked area charts
- **DonutChart** - Part-to-whole relationships
- **Sparkline** - Compact trend indicators

## Dashboard Components

- **KPICard** - Key performance indicator cards
- **MetricGrid** - Multi-metric overview grids
- **DataTable** - Sortable, filterable tables
- **StatCard** - Statistic display cards
- **ProgressBar** - Progress and completion indicators
- **BadgeList** - Categorized badges and tags

## Exports

```ts
// Chart components
import * from '@mdxui/tremor/charts'

// Dashboard blocks
import * from '@mdxui/tremor/blocks'

// Page templates
import * from '@mdxui/tremor/templates'

// Layout components
import * from '@mdxui/tremor/templates/layouts'

// TypeScript types
import type { ChartData, MetricProps } from '@mdxui/tremor'
```

## Theming

Tremor components support Tailwind CSS theming and can be customized via the Tremor configuration.

Built on `@tremor/react` v3.18+ with full TypeScript support.

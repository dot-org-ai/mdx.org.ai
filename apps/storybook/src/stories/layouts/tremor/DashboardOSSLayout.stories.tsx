import type { Meta, StoryObj } from '@storybook/react'
import { DashboardOSSLayout } from '@mdxui/tremor/templates'
import { sampleKPIs } from '../../../data/sample-data'
import * as React from 'react'

const meta: Meta<typeof DashboardOSSLayout> = {
  title: 'Layouts/Tremor/DashboardOSSLayout',
  component: DashboardOSSLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Dashboard OSS Layout

An analytics dashboard layout based on Tremor's open-source dashboard template. Features KPI cards, charts, and data tables.

### Key Components
- KPI cards with trends
- Main chart area
- Data tables
- Date range selector
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DashboardOSSLayout>

// Mock chart component
const MockChart = ({ title }: { title: string }) => (
  <div
    style={{
      height: '300px',
      background: 'var(--muted)',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted-foreground)',
    }}
  >
    {title} Chart
  </div>
)

// Mock table component
const MockTable = () => (
  <div
    style={{
      background: 'var(--card)',
      borderRadius: '0.5rem',
      overflow: 'hidden',
    }}
  >
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Name</th>
          <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Status</th>
          <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Revenue</th>
        </tr>
      </thead>
      <tbody>
        {['Acme Corp', 'TechStart', 'DevCorp', 'ScaleUp', 'CloudBase'].map((name) => (
          <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '0.75rem 1rem' }}>{name}</td>
            <td style={{ padding: '0.75rem 1rem' }}>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                }}
              >
                Active
              </span>
            </td>
            <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
              ${(Math.random() * 10000).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const Default: Story = {
  args: {
    title: 'Analytics Dashboard',
    description: 'Overview of your business metrics',
    kpis: sampleKPIs,
    mainChart: {
      title: 'Revenue Over Time',
      component: <MockChart title="Revenue" />,
    },
    secondaryCharts: [
      { title: 'Users', component: <MockChart title="Users" /> },
      { title: 'Sessions', component: <MockChart title="Sessions" /> },
    ],
    table: {
      title: 'Top Customers',
      component: <MockTable />,
    },
    dateRange: {
      value: 'last-30-days',
      onChange: (value) => console.log('Date range:', value),
    },
  },
}

export const SalesOverview: Story = {
  name: 'Sales Overview',
  args: {
    title: 'Sales Dashboard',
    description: 'Track your sales performance',
    kpis: [
      { title: 'Total Sales', value: '$128,430', trend: { value: '+15.2%', direction: 'up' } },
      { title: 'Orders', value: '1,429', trend: { value: '+8.1%', direction: 'up' } },
      { title: 'Avg Order Value', value: '$89.84', trend: { value: '+2.3%', direction: 'up' } },
      { title: 'Refunds', value: '$2,340', trend: { value: '-12.5%', direction: 'down' } },
    ],
    mainChart: {
      title: 'Sales by Month',
      component: <MockChart title="Sales" />,
    },
    table: {
      title: 'Recent Orders',
      component: <MockTable />,
    },
  },
}

export const MarketingMetrics: Story = {
  name: 'Marketing Metrics',
  args: {
    title: 'Marketing Dashboard',
    description: 'Campaign performance and ROI',
    kpis: [
      { title: 'Impressions', value: '2.4M', trend: { value: '+32%', direction: 'up' } },
      { title: 'Clicks', value: '48.2K', trend: { value: '+18%', direction: 'up' } },
      { title: 'CTR', value: '2.01%', trend: { value: '+0.3%', direction: 'up' } },
      { title: 'Cost per Click', value: '$0.42', trend: { value: '-8%', direction: 'down' } },
    ],
    mainChart: {
      title: 'Campaign Performance',
      component: <MockChart title="Campaigns" />,
    },
    secondaryCharts: [
      { title: 'Traffic Sources', component: <MockChart title="Sources" /> },
      { title: 'Conversions', component: <MockChart title="Conversions" /> },
    ],
  },
}

export const MinimalKPIs: Story = {
  name: 'Minimal (KPIs Only)',
  args: {
    title: 'Quick Overview',
    kpis: sampleKPIs,
  },
}

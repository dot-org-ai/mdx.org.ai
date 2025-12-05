import type { Meta, StoryObj } from '@storybook/react'
import { InsightsLayout } from '@mdxui/tremor/templates'
import * as React from 'react'

const meta: Meta<typeof InsightsLayout> = {
  title: 'Layouts/Tremor/InsightsLayout',
  component: InsightsLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Insights Layout

A data exploration dashboard from Tremor's template collection. Features filters, charts, and detailed data views.

### Key Features
- Advanced filtering
- Multiple chart types
- Data drill-down
- Export capabilities
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof InsightsLayout>

const MockFilterPanel = () => (
  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
    <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}>
      <option>All Categories</option>
      <option>Electronics</option>
      <option>Clothing</option>
      <option>Food</option>
    </select>
    <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}>
      <option>Last 7 days</option>
      <option>Last 30 days</option>
      <option>Last 90 days</option>
    </select>
    <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}>
      <option>All Regions</option>
      <option>North America</option>
      <option>Europe</option>
      <option>Asia</option>
    </select>
  </div>
)

const MockVisualization = ({ title }: { title: string }) => (
  <div
    style={{
      height: '400px',
      background: 'var(--muted)',
      borderRadius: '0.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--muted-foreground)',
    }}
  >
    {title}
  </div>
)

const MockSidebar = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Quick Stats</h4>
    <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Total Records</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>24,847</div>
    </div>
    <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Unique Users</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>8,429</div>
    </div>
    <div style={{ padding: '1rem', background: 'var(--muted)', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Conversion Rate</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>3.2%</div>
    </div>
  </div>
)

export const Default: Story = {
  args: {
    title: 'Data Insights',
    description: 'Explore and analyze your data with powerful visualizations.',
    filters: <MockFilterPanel />,
    visualization: <MockVisualization title="Interactive Data Visualization" />,
    sidebar: <MockSidebar />,
  },
}

export const SalesAnalytics: Story = {
  name: 'Sales Analytics',
  args: {
    title: 'Sales Analytics',
    description: 'Deep dive into your sales performance across regions and products.',
    filters: (
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}>
          <option>All Products</option>
          <option>SaaS</option>
          <option>Services</option>
          <option>Hardware</option>
        </select>
        <select style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid var(--border)' }}>
          <option>Q4 2024</option>
          <option>Q3 2024</option>
          <option>Q2 2024</option>
        </select>
        <button
          style={{
            padding: '0.5rem 1rem',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
            borderRadius: '0.375rem',
            border: 'none',
          }}
        >
          Export
        </button>
      </div>
    ),
    visualization: <MockVisualization title="Sales by Region (Heatmap)" />,
    sidebar: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <h4 style={{ fontWeight: 600 }}>Top Performers</h4>
        {['West Coast', 'Northeast', 'Midwest', 'Southeast', 'Southwest'].map((region, i) => (
          <div
            key={region}
            style={{
              padding: '0.75rem',
              background: 'var(--muted)',
              borderRadius: '0.375rem',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{region}</span>
            <span style={{ fontWeight: 600 }}>${((5 - i) * 12340).toLocaleString()}</span>
          </div>
        ))}
      </div>
    ),
  },
}

export const UserBehavior: Story = {
  name: 'User Behavior Analysis',
  args: {
    title: 'User Behavior',
    description: 'Understand how users interact with your product.',
    filters: (
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <span style={{ color: 'var(--muted-foreground)' }}>Segment:</span>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: '0.375rem', border: 'none' }}>
          All Users
        </button>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--muted)', borderRadius: '0.375rem', border: 'none' }}>
          New Users
        </button>
        <button style={{ padding: '0.5rem 1rem', background: 'var(--muted)', borderRadius: '0.375rem', border: 'none' }}>
          Power Users
        </button>
      </div>
    ),
    visualization: <MockVisualization title="User Journey Funnel" />,
    sidebar: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Engagement Score</h4>
          <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary)' }}>7.8</div>
          <div style={{ color: 'var(--muted-foreground)', fontSize: '0.875rem' }}>+0.4 from last week</div>
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>Top Actions</h4>
          <ol style={{ paddingLeft: '1.25rem', color: 'var(--muted-foreground)' }}>
            <li>Page View</li>
            <li>Click CTA</li>
            <li>Sign Up</li>
            <li>Upgrade</li>
          </ol>
        </div>
      </div>
    ),
  },
}

import type { Meta, StoryObj } from '@storybook/react'
import { AdminLayout } from '@mdxui/mantine/templates'
import { sampleAdminNavigation, sampleSpotlightActions, sampleKPIs } from '../../../data/sample-data'
import * as React from 'react'

const meta: Meta<typeof AdminLayout> = {
  title: 'Layouts/Mantine/AdminLayout',
  component: AdminLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Admin Layout

A full-featured admin dashboard layout based on Mantine's AppShell. Includes sidebar navigation, command palette (Spotlight), and notifications system.

### Key Features
- Responsive sidebar with nested navigation
- Command palette (⌘K) for power users
- Toast notifications system
- Theme customization
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof AdminLayout>

const DashboardContent = () => (
  <div style={{ padding: '2rem' }}>
    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Dashboard</h1>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
      {sampleKPIs.map((kpi) => (
        <div
          key={kpi.title}
          style={{
            padding: '1.5rem',
            background: 'var(--card)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>{kpi.title}</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.25rem' }}>{kpi.value}</div>
          <div
            style={{
              fontSize: '0.75rem',
              color: kpi.trend?.direction === 'up' ? 'green' : 'red',
              marginTop: '0.25rem',
            }}
          >
            {kpi.change}
          </div>
        </div>
      ))}
    </div>
    <div
      style={{
        marginTop: '2rem',
        padding: '2rem',
        background: 'var(--muted)',
        borderRadius: '0.5rem',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--muted-foreground)',
      }}
    >
      Chart Placeholder
    </div>
  </div>
)

const UsersContent = () => (
  <div style={{ padding: '2rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Users</h1>
      <button
        style={{
          padding: '0.5rem 1rem',
          background: 'var(--primary)',
          color: 'var(--primary-foreground)',
          borderRadius: '0.375rem',
          border: 'none',
        }}
      >
        Add User
      </button>
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--border)' }}>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Name</th>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Role</th>
          <th style={{ padding: '0.75rem', textAlign: 'left' }}>Status</th>
        </tr>
      </thead>
      <tbody>
        {[
          { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
          { name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active' },
          { name: 'Bob Wilson', email: 'bob@example.com', role: 'Viewer', status: 'Inactive' },
        ].map((user) => (
          <tr key={user.email} style={{ borderBottom: '1px solid var(--border)' }}>
            <td style={{ padding: '0.75rem' }}>{user.name}</td>
            <td style={{ padding: '0.75rem' }}>{user.email}</td>
            <td style={{ padding: '0.75rem' }}>{user.role}</td>
            <td style={{ padding: '0.75rem' }}>
              <span
                style={{
                  padding: '0.25rem 0.5rem',
                  background: user.status === 'Active' ? 'green' : 'var(--muted)',
                  color: user.status === 'Active' ? 'white' : 'var(--muted-foreground)',
                  borderRadius: '9999px',
                  fontSize: '0.75rem',
                }}
              >
                {user.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const Default: Story = {
  args: {
    brand: <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Admin</span>,
    navigation: sampleAdminNavigation,
    spotlight: {
      actions: sampleSpotlightActions,
    },
    headerContent: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <input
          type="search"
          placeholder="Search..."
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '0.375rem',
            border: '1px solid var(--border)',
            background: 'var(--background)',
          }}
        />
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'var(--primary)',
          }}
        />
      </div>
    ),
    children: <DashboardContent />,
  },
}

export const UsersPage: Story = {
  name: 'Users Page',
  args: {
    brand: <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Admin</span>,
    navigation: sampleAdminNavigation.map((item) => ({
      ...item,
      active: item.label === 'Users',
    })),
    spotlight: {
      actions: sampleSpotlightActions,
    },
    children: <UsersContent />,
  },
}

export const WithoutSpotlight: Story = {
  name: 'Without Spotlight',
  args: {
    brand: <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Simple Admin</span>,
    navigation: sampleAdminNavigation.slice(0, 3),
    children: <DashboardContent />,
  },
}

export const CustomTheme: Story = {
  name: 'Custom Theme',
  args: {
    brand: <span style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>Branded</span>,
    navigation: sampleAdminNavigation,
    theme: {
      primaryColor: 'violet',
      radius: 'lg',
      colorScheme: 'light',
    },
    spotlight: {
      actions: sampleSpotlightActions,
    },
    children: <DashboardContent />,
  },
}

export const CollapsedSidebar: Story = {
  name: 'E-commerce Admin',
  args: {
    brand: <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Shop Admin</span>,
    navigation: [
      { label: 'Dashboard', href: '/', active: true },
      { label: 'Orders', href: '/orders' },
      { label: 'Products', href: '/products' },
      { label: 'Customers', href: '/customers' },
      { label: 'Analytics', href: '/analytics' },
      { label: 'Settings', href: '/settings' },
    ],
    headerContent: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>Store:</span>
        <select style={{ padding: '0.25rem 0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}>
          <option>Main Store</option>
          <option>EU Store</option>
          <option>Asia Store</option>
        </select>
      </div>
    ),
    children: (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Orders Today</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>47</div>
            <div style={{ color: 'var(--muted-foreground)' }}>New Orders</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>$3,429</div>
            <div style={{ color: 'var(--muted-foreground)' }}>Revenue</div>
          </div>
          <div style={{ padding: '1rem', background: 'var(--card)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>12</div>
            <div style={{ color: 'var(--muted-foreground)' }}>Pending</div>
          </div>
        </div>
      </div>
    ),
  },
}

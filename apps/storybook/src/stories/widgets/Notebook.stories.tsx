import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'

// Notebook component mock for storybook (actual component requires build)
const NotebookMock = ({
  title,
  cells,
  executionMode,
}: {
  title?: string
  cells: Array<{
    type: 'code' | 'markdown'
    source: string
    language?: string
    output?: string
  }>
  executionMode?: 'browser' | 'rpc'
}) => (
  <div
    style={{
      fontFamily: 'system-ui, -apple-system, sans-serif',
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      overflow: 'hidden',
    }}
  >
    {/* Toolbar */}
    <div
      style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb',
      }}
    >
      <button
        style={{
          padding: '0.375rem 0.75rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
        }}
      >
        + Code
      </button>
      <button
        style={{
          padding: '0.375rem 0.75rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
        }}
      >
        + Markdown
      </button>
      <div style={{ flex: 1 }} />
      <button
        style={{
          padding: '0.375rem 0.75rem',
          border: 'none',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          backgroundColor: '#10b981',
          color: 'white',
          cursor: 'pointer',
        }}
      >
        ▶▶ Run All
      </button>
      <select
        value={executionMode}
        style={{
          padding: '0.375rem 0.5rem',
          border: '1px solid #e5e7eb',
          borderRadius: '0.375rem',
          fontSize: '0.875rem',
          backgroundColor: '#ffffff',
        }}
      >
        <option value="browser">Browser</option>
        <option value="rpc">RPC</option>
      </select>
    </div>

    {/* Cells */}
    <div style={{ padding: '0.5rem' }}>
      {cells.map((cell, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            gap: '0.5rem',
            padding: '0.5rem 0',
            borderLeft: index === 0 ? '3px solid #3b82f6' : '3px solid transparent',
            backgroundColor: index === 0 ? '#f0f9ff' : 'transparent',
          }}
        >
          {/* Gutter */}
          <div
            style={{
              width: '4rem',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              paddingRight: '0.5rem',
              fontFamily: 'ui-monospace, monospace',
              fontSize: '0.75rem',
              color: cell.output ? '#10b981' : '#9ca3af',
            }}
          >
            [{cell.output ? index + 1 : ' '}]
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Cell type indicator */}
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.25rem',
                fontSize: '0.75rem',
              }}
            >
              <span
                style={{
                  padding: '0.125rem 0.25rem',
                  backgroundColor: cell.type === 'code' ? '#dbeafe' : '#fef3c7',
                  borderRadius: '0.25rem',
                  color: cell.type === 'code' ? '#1d4ed8' : '#92400e',
                }}
              >
                {cell.type === 'code' ? cell.language || 'javascript' : 'markdown'}
              </span>
            </div>

            {/* Code/Markdown input */}
            <div
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.375rem',
                overflow: 'hidden',
              }}
            >
              <pre
                style={{
                  margin: 0,
                  padding: '0.75rem',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                  backgroundColor: '#fafafa',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {cell.source}
              </pre>
            </div>

            {/* Output */}
            {cell.output && (
              <div
                style={{
                  marginTop: '0.5rem',
                  padding: '0.5rem',
                  backgroundColor: '#f9fafb',
                  borderRadius: '0.25rem',
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: '0.875rem',
                }}
              >
                {cell.output}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)

const meta: Meta<typeof NotebookMock> = {
  title: 'Widgets/Notebook',
  component: NotebookMock,
  parameters: {
    layout: 'padded',
  },
}

export default meta
type Story = StoryObj<typeof NotebookMock>

export const Default: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'code',
        language: 'javascript',
        source: `const greeting = "Hello, World!"
console.log(greeting)`,
        output: 'Hello, World!',
      },
      {
        type: 'code',
        language: 'javascript',
        source: `const numbers = [1, 2, 3, 4, 5]
const sum = numbers.reduce((a, b) => a + b, 0)
sum`,
        output: '15',
      },
    ],
  },
}

export const WithMarkdown: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'markdown',
        source: `# Data Analysis Notebook

This notebook demonstrates basic data analysis with JavaScript.`,
      },
      {
        type: 'code',
        language: 'javascript',
        source: `const data = [
  { name: "Alice", age: 30, city: "NYC" },
  { name: "Bob", age: 25, city: "LA" },
  { name: "Charlie", age: 35, city: "Chicago" }
]

data`,
        output: `[
  { name: "Alice", age: 30, city: "NYC" },
  { name: "Bob", age: 25, city: "LA" },
  { name: "Charlie", age: 35, city: "Chicago" }
]`,
      },
      {
        type: 'code',
        language: 'javascript',
        source: `const avgAge = data.reduce((sum, p) => sum + p.age, 0) / data.length
avgAge`,
        output: '30',
      },
    ],
  },
}

export const TypeScript: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'code',
        language: 'typescript',
        source: `interface User {
  id: number
  name: string
  email: string
}

const users: User[] = [
  { id: 1, name: "Alice", email: "alice@example.com" },
  { id: 2, name: "Bob", email: "bob@example.com" }
]

users.map(u => u.name)`,
        output: '["Alice", "Bob"]',
      },
    ],
  },
}

export const MDXWithJSX: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'markdown',
        source: `# MDX with JSX Components

Interactive components rendered inline with your content.`,
      },
      {
        type: 'code',
        language: 'tsx',
        source: `const Button = ({ children, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.5rem 1rem',
      backgroundColor: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '0.375rem',
      cursor: 'pointer'
    }}
  >
    {children}
  </button>
)

<Button onClick={() => alert('Clicked!')}>
  Click Me
</Button>`,
        output: '<Button>Click Me</Button>',
      },
    ],
  },
}

export const ServerSideExecution: Story = {
  args: {
    executionMode: 'rpc',
    cells: [
      {
        type: 'markdown',
        source: `# Server-Side Execution

Execute TypeScript on the server via rpc.do for API access and secrets.`,
      },
      {
        type: 'code',
        language: 'typescript',
        source: `// This runs on the server via rpc.do
const response = await fetch('https://api.example.com/data')
const data = await response.json()

data`,
        output: `{ "status": "ok", "data": [...] }`,
      },
    ],
  },
}

export const DataVisualization: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'markdown',
        source: `# Sales Data Visualization

Analyzing monthly sales data with charts.`,
      },
      {
        type: 'code',
        language: 'javascript',
        source: `const salesData = {
  type: 'bar',
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  datasets: [{
    label: 'Sales',
    data: [120, 190, 150, 220, 180],
    color: '#3b82f6'
  }]
}

salesData`,
        output: `Chart: Bar chart with 5 data points
- Jan: 120
- Feb: 190
- Mar: 150
- Apr: 220
- May: 180`,
      },
    ],
  },
}

export const Empty: Story = {
  args: {
    executionMode: 'browser',
    cells: [],
  },
  render: () => (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <button
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
          }}
        >
          + Code
        </button>
        <button
          style={{
            padding: '0.375rem 0.75rem',
            border: '1px solid #e5e7eb',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            backgroundColor: '#ffffff',
          }}
        >
          + Markdown
        </button>
      </div>

      {/* Empty state */}
      <div
        style={{
          padding: '3rem',
          textAlign: 'center',
          color: '#6b7280',
        }}
      >
        <p>No cells yet. Add a code or markdown cell to get started.</p>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.5rem',
            marginTop: '1rem',
          }}
        >
          <button
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            + Code Cell
          </button>
          <button
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            + Markdown Cell
          </button>
        </div>
      </div>
    </div>
  ),
}

export const Error: Story = {
  args: {
    executionMode: 'browser',
    cells: [
      {
        type: 'code',
        language: 'javascript',
        source: `const x = undefined
x.toString()`,
      },
    ],
  },
  render: () => (
    <div
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        backgroundColor: '#ffffff',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        overflow: 'hidden',
      }}
    >
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}
      >
        <button style={{ padding: '0.375rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#ffffff' }}>+ Code</button>
        <button style={{ padding: '0.375rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#ffffff' }}>+ Markdown</button>
        <div style={{ flex: 1 }} />
        <button style={{ padding: '0.375rem 0.75rem', border: 'none', borderRadius: '0.375rem', fontSize: '0.875rem', backgroundColor: '#10b981', color: 'white' }}>▶▶ Run All</button>
      </div>

      {/* Cell with error */}
      <div style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0.5rem 0', borderLeft: '3px solid #ef4444' }}>
          <div style={{ width: '4rem', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', paddingRight: '0.5rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.75rem', color: '#ef4444' }}>[1]</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '0.375rem', overflow: 'hidden' }}>
              <pre style={{ margin: 0, padding: '0.75rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem', backgroundColor: '#fafafa', whiteSpace: 'pre-wrap' }}>
{`const x = undefined
x.toString()`}
              </pre>
            </div>
            <div style={{ marginTop: '0.5rem', padding: '0.75rem', backgroundColor: '#fef2f2', borderRadius: '0.25rem', border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '0.25rem', fontFamily: 'ui-monospace, monospace', fontSize: '0.875rem' }}>
                TypeError: Cannot read properties of undefined (reading 'toString')
              </div>
              <pre style={{ margin: 0, marginTop: '0.5rem', padding: '0.5rem', fontSize: '0.75rem', whiteSpace: 'pre-wrap', color: '#9b1c1c', backgroundColor: '#fee2e2', borderRadius: '0.25rem', opacity: 0.9, fontFamily: 'ui-monospace, monospace' }}>
{`    at <anonymous>:2:3
    at eval (eval at execute)`}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
}

/**
 * Counter Component
 *
 * A simple counter demonstration component with increment/decrement buttons.
 */

import { useState } from 'hono/jsx'

export interface CounterProps {
  initial?: number
}

export function Counter({ initial = 0 }: CounterProps) {
  const [count, setCount] = useState(initial)

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <button
        onClick={() => setCount(c => c - 1)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius, 0.5rem)',
          border: '1px solid var(--border)',
          background: 'var(--background)',
          cursor: 'pointer',
        }}
      >
        -
      </button>
      <span style={{ minWidth: '3rem', textAlign: 'center' }}>{count}</span>
      <button
        onClick={() => setCount(c => c + 1)}
        style={{
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius, 0.5rem)',
          border: '1px solid var(--border)',
          background: 'var(--background)',
          cursor: 'pointer',
        }}
      >
        +
      </button>
    </div>
  )
}

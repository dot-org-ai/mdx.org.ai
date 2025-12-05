/**
 * Accordion/Collapsible Component
 *
 * A collapsible content panel with smooth animations.
 */

import { useState } from 'hono/jsx'

export interface AccordionProps {
  title: string
  children: any
  defaultOpen?: boolean
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius, 0.5rem)',
        overflow: 'hidden',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'var(--muted)',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </button>
      {open && <div style={{ padding: '1rem' }}>{children}</div>}
    </div>
  )
}

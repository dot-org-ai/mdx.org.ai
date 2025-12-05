'use client'
/**
 * View Toggle Component
 *
 * Provides UI for switching between table and card views.
 */

import type { ListViewMode } from './types.js'

interface ViewToggleProps {
  mode: ListViewMode
  onChange: (mode: ListViewMode) => void
  disabled?: boolean
}

/**
 * Icon components for view modes
 */
function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="14" height="3" rx="0.5" />
      <rect x="1" y="6" width="14" height="3" rx="0.5" />
      <rect x="1" y="11" width="14" height="3" rx="0.5" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  )
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <rect x="1" y="1" width="4" height="4" rx="0.5" />
      <rect x="6" y="1" width="4" height="4" rx="0.5" />
      <rect x="11" y="1" width="4" height="4" rx="0.5" />
      <rect x="1" y="6" width="4" height="4" rx="0.5" />
      <rect x="6" y="6" width="4" height="4" rx="0.5" />
      <rect x="11" y="6" width="4" height="4" rx="0.5" />
      <rect x="1" y="11" width="4" height="4" rx="0.5" />
      <rect x="6" y="11" width="4" height="4" rx="0.5" />
      <rect x="11" y="11" width="4" height="4" rx="0.5" />
    </svg>
  )
}

const icons: Record<ListViewMode, () => JSX.Element> = {
  table: TableIcon,
  card: CardIcon,
  grid: GridIcon,
}

const labels: Record<ListViewMode, string> = {
  table: 'Table',
  card: 'Cards',
  grid: 'Grid',
}

/**
 * ViewToggle Component
 *
 * Segmented control for switching between view modes.
 */
export function ViewToggle({ mode, onChange, disabled }: ViewToggleProps) {
  const modes: ListViewMode[] = ['table', 'card']

  const containerStyle: React.CSSProperties = {
    display: 'inline-flex',
    border: '1px solid var(--theme-elevation-200, #e0e0e0)',
    borderRadius: '6px',
    overflow: 'hidden',
    backgroundColor: 'var(--theme-elevation-50, #fafafa)',
  }

  const buttonStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    border: 'none',
    backgroundColor: isActive ? 'var(--theme-elevation-0, #fff)' : 'transparent',
    color: isActive ? 'var(--theme-elevation-900, #333)' : 'var(--theme-elevation-500, #888)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: isActive ? 500 : 400,
    transition: 'background-color 0.15s, color 0.15s',
    boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
    opacity: disabled ? 0.5 : 1,
  })

  return (
    <div style={containerStyle}>
      {modes.map((m) => {
        const Icon = icons[m]
        return (
          <button
            key={m}
            type="button"
            style={buttonStyle(mode === m)}
            onClick={() => !disabled && onChange(m)}
            disabled={disabled}
            title={labels[m]}
          >
            <Icon />
            <span>{labels[m]}</span>
          </button>
        )
      })}
    </div>
  )
}

export default ViewToggle

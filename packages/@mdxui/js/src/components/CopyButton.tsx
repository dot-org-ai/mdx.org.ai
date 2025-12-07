/**
 * Copy Button Component
 *
 * A button that copies text to clipboard with visual feedback.
 */

import { useState } from 'hono/jsx'

export interface CopyButtonProps {
  text: string
  children?: any
}

export function CopyButton({ text, children }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <button
      onClick={copy}
      style={{
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius, 0.5rem)',
        border: '1px solid var(--border)',
        background: copied ? 'var(--primary)' : 'var(--background)',
        color: copied ? 'var(--primary-foreground)' : 'var(--foreground)',
        cursor: 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {copied ? '✓ Copied!' : children || 'Copy'}
    </button>
  )
}

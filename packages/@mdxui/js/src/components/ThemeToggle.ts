/**
 * Theme Toggle Component
 *
 * A button that toggles between light and dark themes.
 * Uses the global __mdxui_theme API injected by the theme script.
 */

import { useState, useEffect } from 'hono/jsx'

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  // Sync with global theme API
  useEffect(() => {
    const api = (window as any).__mdxui_theme
    if (api) {
      setTheme(api.get())

      // Listen for theme changes
      const handler = (e: CustomEvent) => {
        setTheme(e.detail.theme)
      }
      window.addEventListener('themechange', handler as EventListener)
      return () => window.removeEventListener('themechange', handler as EventListener)
    }
  }, [])

  const toggle = () => {
    const api = (window as any).__mdxui_theme
    if (api) {
      api.toggle()
    } else {
      // Fallback if theme API not available
      const newTheme = theme === 'light' ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', newTheme === 'dark')
      setTheme(newTheme)
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        padding: '0.5rem',
        borderRadius: 'var(--radius, 0.5rem)',
        border: '1px solid var(--border)',
        background: 'var(--background)',
        cursor: 'pointer',
      }}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  )
}

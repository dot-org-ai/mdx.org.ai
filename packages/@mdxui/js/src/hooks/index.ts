/**
 * Custom Hooks for Client-Side Interactivity
 *
 * Lightweight hooks using Hono JSX.
 */

import { useState, useEffect, useCallback } from 'hono/jsx'

/**
 * Theme hook - toggles between light and dark mode
 */
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    // Check initial theme
    const isDark = document.documentElement.classList.contains('dark') ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(isDark ? 'dark' : 'light')

    // Listen for changes
    const observer = new MutationObserver(() => {
      setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

    return () => observer.disconnect()
  }, [])

  const toggle = useCallback(() => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    setTheme(newTheme)
  }, [theme])

  return { theme, toggle, setTheme }
}

/**
 * Copy to clipboard hook
 */
export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      return true
    } catch {
      return false
    }
  }, [])

  return { copied, copy }
}

/**
 * Local storage hook with SSR safety
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Ignore write errors
    }
  }, [key, value])

  return [value, setValue] as const
}

/**
 * Media query hook
 */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

/**
 * Intersection observer hook for lazy loading
 */
export function useInView(options?: IntersectionObserverInit) {
  const [ref, setRef] = useState<Element | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!ref) return

    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
    }, options)

    observer.observe(ref)
    return () => observer.disconnect()
  }, [ref, options])

  return { ref: setRef, inView }
}

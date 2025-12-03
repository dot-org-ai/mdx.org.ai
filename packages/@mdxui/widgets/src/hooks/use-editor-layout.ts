'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Layout } from '@/lib/types'

const LAYOUT_KEY = 'editor-layout'

export function useEditorLayout(defaultLayout: Layout = 'split') {
  const [layout, setLayoutState] = useState<Layout>(defaultLayout)

  // Load saved layout preference
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(LAYOUT_KEY) as Layout | null
    if (saved && ['split', 'drawer-right', 'drawer-left'].includes(saved)) {
      setLayoutState(saved)
    }
  }, [])

  // Save layout preference
  const setLayout = useCallback((newLayout: Layout) => {
    setLayoutState(newLayout)
    localStorage.setItem(LAYOUT_KEY, newLayout)
  }, [])

  return { layout, setLayout }
}

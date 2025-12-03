'use client'

import { useState, useEffect, useCallback } from 'react'
import type { AutosaveData } from '@/lib/types'

const AUTOSAVE_INTERVAL = 30_000 // 30 seconds
const MAX_AUTOSAVE_AGE = 24 * 60 * 60 * 1000 // 24 hours

function getAutosaveKey(path: string) {
  return `editor-autosave:${path}`
}

export function useAutosave(
  path: string,
  content: string,
  isDirty: boolean,
  initialContent: string
) {
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)
  const [recoveredData, setRecoveredData] = useState<AutosaveData | null>(null)

  // Check for autosave on mount
  useEffect(() => {
    if (!path) return

    const key = getAutosaveKey(path)
    const saved = localStorage.getItem(key)

    if (saved) {
      try {
        const data: AutosaveData = JSON.parse(saved)
        const age = Date.now() - data.timestamp

        // If autosave is newer than 24h and different from initial content
        if (age < MAX_AUTOSAVE_AGE && data.content !== initialContent) {
          setRecoveredData(data)
          setShowRecoveryPrompt(true)
        } else {
          // Clear old autosave
          localStorage.removeItem(key)
        }
      } catch {
        // Clear invalid autosave
        localStorage.removeItem(key)
      }
    }
  }, [path, initialContent])

  // Autosave when dirty
  useEffect(() => {
    if (!isDirty || !path) return

    const timer = setInterval(() => {
      const data: AutosaveData = {
        content,
        timestamp: Date.now(),
      }
      localStorage.setItem(getAutosaveKey(path), JSON.stringify(data))
    }, AUTOSAVE_INTERVAL)

    return () => clearInterval(timer)
  }, [content, isDirty, path])

  // Clear autosave on successful save
  const clearAutosave = useCallback(() => {
    if (path) {
      localStorage.removeItem(getAutosaveKey(path))
    }
  }, [path])

  // Handle recovery
  const handleRestore = useCallback(() => {
    setShowRecoveryPrompt(false)
    return recoveredData?.content
  }, [recoveredData])

  const handleDiscardRecovery = useCallback(() => {
    setShowRecoveryPrompt(false)
    setRecoveredData(null)
    if (path) {
      localStorage.removeItem(getAutosaveKey(path))
    }
  }, [path])

  return {
    showRecoveryPrompt,
    recoveredData,
    clearAutosave,
    handleRestore,
    handleDiscardRecovery,
  }
}

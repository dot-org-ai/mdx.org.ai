"use client"

import * as React from 'react'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ThemePreset, ThemeMode, ThemeStyles } from './types.js'
import { defaultPresets, DEFAULT_PRESET } from './presets.js'
import { applyTheme, removeTheme } from './css.js'

export interface ThemeProviderProps {
  children: React.ReactNode
  /**
   * Theme preset name or custom preset
   */
  preset?: string | ThemePreset
  /**
   * Default theme mode
   */
  defaultTheme?: ThemeMode
  /**
   * Storage key for theme persistence
   */
  storageKey?: string
  /**
   * Enable system theme detection
   */
  enableSystem?: boolean
  /**
   * Disable transition on theme change
   */
  disableTransitionOnChange?: boolean
  /**
   * Custom theme presets
   */
  customPresets?: Record<string, ThemePreset>
  /**
   * Attribute to apply to root element
   */
  attribute?: 'class' | 'data-theme'
}

const ThemePresetContext = React.createContext<{
  preset: string
  setPreset: (name: string) => void
  presets: Record<string, ThemePreset>
  currentStyles: ThemeStyles | null
}>({
  preset: DEFAULT_PRESET,
  setPreset: () => {},
  presets: defaultPresets,
  currentStyles: null,
})

/**
 * Hook to access theme preset context
 */
export function useThemePreset() {
  const context = React.useContext(ThemePresetContext)
  if (!context) {
    throw new Error('useThemePreset must be used within a ThemeProvider')
  }
  return context
}

/**
 * Theme provider component that combines next-themes with theme presets
 */
export function ThemeProvider({
  children,
  preset: initialPreset = DEFAULT_PRESET,
  defaultTheme = 'system',
  storageKey = 'mdxui-theme',
  enableSystem = true,
  disableTransitionOnChange = false,
  customPresets = {},
  attribute = 'class',
}: ThemeProviderProps) {
  const [presetName, setPresetName] = React.useState<string>(
    typeof initialPreset === 'string' ? initialPreset : 'custom'
  )

  // Merge default and custom presets
  const allPresets: Record<string, ThemePreset> = React.useMemo(() => ({
    ...defaultPresets,
    ...customPresets,
    ...(typeof initialPreset !== 'string' ? { custom: initialPreset } : {}),
  }), [customPresets, initialPreset])

  // Get current preset styles
  const currentStyles = React.useMemo(() => {
    const presetKey = typeof initialPreset === 'string' ? presetName : 'custom'
    return allPresets[presetKey]?.styles ?? null
  }, [allPresets, presetName, initialPreset])

  // Apply theme CSS variables
  React.useEffect(() => {
    if (!currentStyles) return

    // Apply light mode styles to :root
    applyTheme(currentStyles.light)

    // Apply dark mode styles when .dark class is present
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark')
      if (isDark) {
        applyTheme(currentStyles.dark)
      } else {
        applyTheme(currentStyles.light)
      }
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    })

    // Initial check
    const isDark = document.documentElement.classList.contains('dark')
    if (isDark) {
      applyTheme(currentStyles.dark)
    }

    return () => {
      observer.disconnect()
      if (currentStyles.light) removeTheme(currentStyles.light)
      if (currentStyles.dark) removeTheme(currentStyles.dark)
    }
  }, [currentStyles])

  const setPreset = React.useCallback((name: string) => {
    if (allPresets[name]) {
      setPresetName(name)
    }
  }, [allPresets])

  return (
    <ThemePresetContext.Provider
      value={{
        preset: presetName,
        setPreset,
        presets: allPresets,
        currentStyles,
      }}
    >
      <NextThemesProvider
        attribute={attribute}
        defaultTheme={defaultTheme}
        enableSystem={enableSystem}
        disableTransitionOnChange={disableTransitionOnChange}
        storageKey={storageKey}
      >
        {children}
      </NextThemesProvider>
    </ThemePresetContext.Provider>
  )
}

export { useTheme } from 'next-themes'

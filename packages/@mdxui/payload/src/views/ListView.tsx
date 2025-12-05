'use client'
/**
 * Enhanced List View Component
 *
 * Wraps Payload's default list view with card/table toggle functionality.
 * Auto-selects the best view based on field count.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { CardView } from './CardView.js'
import { ViewToggle } from './ViewToggle.js'
import type { ListViewMode, CardViewConfig, ListViewToggleConfig } from './types.js'

/**
 * Props for the ListView component
 */
interface ListViewProps {
  /**
   * Collection slug
   */
  collectionSlug: string

  /**
   * Collection configuration
   */
  collection: {
    slug: string
    labels?: {
      singular?: string
      plural?: string
    }
    admin?: {
      useAsTitle?: string
      defaultColumns?: string[]
      listSearchableFields?: string[]
      [key: string]: unknown
    }
    fields: Array<{
      name?: string
      type: string
      label?: string
      [key: string]: unknown
    }>
  }

  /**
   * Documents data
   */
  data?: {
    docs: Array<Record<string, unknown>>
    totalDocs: number
    limit: number
    page: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }

  /**
   * Card view configuration
   */
  cardConfig?: CardViewConfig

  /**
   * Toggle configuration
   */
  toggleConfig?: ListViewToggleConfig

  /**
   * Base URL for the collection
   */
  basePath?: string

  /**
   * Children (default table view from Payload)
   */
  children?: React.ReactNode
}

/**
 * Storage key for view preference
 */
function getStorageKey(slug: string): string {
  return `mdxui-list-view-${slug}`
}

/**
 * Calculate the default view mode based on field count
 */
function calculateDefaultMode(
  collection: ListViewProps['collection'],
  config?: ListViewToggleConfig
): ListViewMode {
  if (config?.defaultMode && config.defaultMode !== 'auto') {
    return config.defaultMode
  }

  // Count visible columns
  const defaultColumns = collection.admin?.defaultColumns || []
  const columnCount = defaultColumns.length > 0
    ? defaultColumns.length
    : collection.fields.filter((f) => f.name && f.type !== 'ui').length

  // Use card view if too many columns
  const threshold = config?.cardThreshold ?? 5
  return columnCount > threshold ? 'card' : 'table'
}

/**
 * ListView Component
 *
 * Enhanced list view with table/card toggle.
 */
export function ListView({
  collectionSlug,
  collection,
  data,
  cardConfig = {},
  toggleConfig = {},
  basePath,
  children,
}: ListViewProps) {
  const { allowToggle = true, persistPreference = true } = toggleConfig

  // Calculate initial mode
  const defaultMode = useMemo(
    () => calculateDefaultMode(collection, toggleConfig),
    [collection, toggleConfig]
  )

  // State for current view mode
  const [mode, setMode] = useState<ListViewMode>(defaultMode)
  const [initialized, setInitialized] = useState(false)

  // Load persisted preference
  useEffect(() => {
    if (persistPreference && typeof window !== 'undefined') {
      const stored = localStorage.getItem(getStorageKey(collectionSlug))
      if (stored === 'table' || stored === 'card' || stored === 'grid') {
        setMode(stored)
      }
    }
    setInitialized(true)
  }, [collectionSlug, persistPreference])

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: ListViewMode) => {
      setMode(newMode)
      if (persistPreference && typeof window !== 'undefined') {
        localStorage.setItem(getStorageKey(collectionSlug), newMode)
      }
    },
    [collectionSlug, persistPreference]
  )

  // Handle card click navigation
  const handleCardClick = useCallback(
    (doc: Record<string, unknown>) => {
      if (typeof window !== 'undefined' && doc.id) {
        const path = basePath || `/admin/collections/${collectionSlug}`
        window.location.href = `${path}/${doc.id}`
      }
    },
    [basePath, collectionSlug]
  )

  // Don't render until initialized (prevents hydration mismatch)
  if (!initialized) {
    return <>{children}</>
  }

  // Header with toggle
  const header = allowToggle ? (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        padding: '12px 16px',
        borderBottom: '1px solid var(--theme-elevation-150, #e5e5e5)',
      }}
    >
      <ViewToggle mode={mode} onChange={handleModeChange} />
    </div>
  ) : null

  // Show table view (default Payload UI)
  if (mode === 'table') {
    return (
      <>
        {header}
        {children}
      </>
    )
  }

  // Show card view
  if (mode === 'card' || mode === 'grid') {
    const docs = data?.docs || []

    return (
      <>
        {header}
        <CardView
          docs={docs}
          config={{
            ...cardConfig,
            size: mode === 'grid' ? 'small' : cardConfig.size,
          }}
          collectionConfig={collection}
          onCardClick={handleCardClick}
        />
      </>
    )
  }

  return <>{children}</>
}

export default ListView

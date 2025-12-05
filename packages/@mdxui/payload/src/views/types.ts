/**
 * Types for custom Payload list views
 */

/**
 * View mode for collection lists
 */
export type ListViewMode = 'table' | 'card' | 'grid'

/**
 * Card size options
 */
export type CardSize = 'small' | 'medium' | 'large'

/**
 * Configuration for the card view
 */
export interface CardViewConfig {
  /**
   * Field to use as the card title
   * @default 'title' or 'name' or first text field
   */
  titleField?: string

  /**
   * Field to use as the card subtitle/description
   */
  subtitleField?: string

  /**
   * Field to use as the card image
   * Supports upload fields or URL strings
   */
  imageField?: string

  /**
   * Fields to display as metadata/tags on the card
   */
  metaFields?: string[]

  /**
   * Card size
   * @default 'medium'
   */
  size?: CardSize

  /**
   * Number of columns in grid layout
   * @default 'auto' (responsive)
   */
  columns?: number | 'auto'

  /**
   * Show field labels on cards
   * @default false
   */
  showLabels?: boolean

  /**
   * Custom card renderer component path
   */
  customCard?: string
}

/**
 * Configuration for the list view toggle
 */
export interface ListViewToggleConfig {
  /**
   * Default view mode
   * @default 'auto' (based on field count)
   */
  defaultMode?: ListViewMode | 'auto'

  /**
   * Allow user to toggle between views
   * @default true
   */
  allowToggle?: boolean

  /**
   * Persist user's view preference
   * @default true
   */
  persistPreference?: boolean

  /**
   * Threshold for auto-selecting card view
   * If collection has more than this many list columns, default to card
   * @default 5
   */
  cardThreshold?: number
}

/**
 * Props passed to the list view components
 */
export interface ListViewProps {
  /**
   * Collection slug
   */
  collection: string

  /**
   * Collection config
   */
  collectionConfig: {
    slug: string
    labels?: {
      singular?: string
      plural?: string
    }
    admin?: {
      useAsTitle?: string
      listSearchableFields?: string[]
      defaultColumns?: string[]
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
   * Documents to display
   */
  data: {
    docs: Array<Record<string, unknown>>
    totalDocs: number
    limit: number
    page: number
    totalPages: number
    hasNextPage: boolean
    hasPrevPage: boolean
  }

  /**
   * Current view mode
   */
  viewMode: ListViewMode

  /**
   * Toggle view mode
   */
  setViewMode: (mode: ListViewMode) => void

  /**
   * Card view configuration
   */
  cardConfig?: CardViewConfig

  /**
   * Handle row/card click
   */
  onDocumentClick?: (doc: Record<string, unknown>) => void
}

/**
 * Card data structure
 */
export interface CardData {
  id: string
  title: string
  subtitle?: string
  image?: string
  meta: Array<{
    label: string
    value: string | number | boolean
  }>
  raw: Record<string, unknown>
}

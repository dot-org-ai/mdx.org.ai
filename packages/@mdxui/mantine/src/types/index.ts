/**
 * Shared Types for Mantine UI
 *
 * Types for Mantine components mapped to MDXUI abstract types.
 * Mantine offers 120+ responsive components with dark/light theme support.
 */

import type { ReactNode } from 'react'

/**
 * Mantine component categories
 */
export type MantineCategory =
  // Core UI
  | 'buttons'
  | 'inputs'
  | 'navigation'
  | 'feedback'
  | 'overlays'
  | 'typography'
  // Layout
  | 'layout'
  | 'containers'
  // Data display
  | 'tables'
  | 'cards'
  | 'lists'
  // Forms
  | 'forms'
  | 'file-upload'
  | 'date-time'
  // Misc
  | 'notifications'
  | 'modals'
  | 'drawers'

/**
 * Mantine theme configuration
 */
export interface MantineThemeConfig {
  /** Primary color */
  primaryColor?: string
  /** Color scheme */
  colorScheme?: 'light' | 'dark' | 'auto'
  /** Border radius scale */
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Font family */
  fontFamily?: string
  /** Heading font family */
  headingFontFamily?: string
  /** Default component props */
  defaultProps?: Record<string, Record<string, unknown>>
}

/**
 * Spotlight search (command palette)
 */
export interface SpotlightProps {
  /** Search placeholder */
  placeholder?: string
  /** Search query */
  query?: string
  /** On query change */
  onQueryChange?: (query: string) => void
  /** Actions/commands */
  actions: Array<{
    id: string
    label: string
    description?: string
    icon?: ReactNode
    group?: string
    onTrigger?: () => void
    href?: string
  }>
  /** Keyboard shortcut to open */
  shortcut?: string[]
}

/**
 * Notification props
 */
export interface NotificationProps {
  id?: string
  title?: string
  message: string
  color?: string
  icon?: ReactNode
  loading?: boolean
  autoClose?: number | false
  onClose?: () => void
}

/**
 * App shell layout props (maps to AppLayout)
 */
export interface AppShellProps {
  /** Header configuration */
  header?: {
    height: number
    children: ReactNode
  }
  /** Navbar (sidebar) configuration */
  navbar?: {
    width: number | { sm?: number; md?: number; lg?: number }
    breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    collapsed?: { mobile?: boolean; desktop?: boolean }
    children: ReactNode
  }
  /** Aside configuration */
  aside?: {
    width: number | { sm?: number; md?: number; lg?: number }
    breakpoint?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
    collapsed?: { mobile?: boolean; desktop?: boolean }
    children: ReactNode
  }
  /** Footer configuration */
  footer?: {
    height: number
    children: ReactNode
  }
  /** Padding */
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number
  children: ReactNode
}

/**
 * Modal/Dialog props
 */
export interface ModalProps {
  opened: boolean
  onClose: () => void
  title?: ReactNode
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | number | string
  /** Centered vertically */
  centered?: boolean
  /** Close on click outside */
  closeOnClickOutside?: boolean
  /** Close on escape */
  closeOnEscape?: boolean
  /** With overlay */
  withOverlay?: boolean
  children: ReactNode
}

/**
 * Drawer props
 */
export interface DrawerProps {
  opened: boolean
  onClose: () => void
  title?: ReactNode
  /** Position */
  position?: 'left' | 'right' | 'top' | 'bottom'
  /** Size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full' | number | string
  children: ReactNode
}

/**
 * Form props
 */
export interface FormFieldProps {
  label?: string
  description?: string
  error?: string
  required?: boolean
  disabled?: boolean
}

/**
 * Stepper props
 */
export interface StepperProps {
  active: number
  onStepClick?: (step: number) => void
  orientation?: 'horizontal' | 'vertical'
  steps: Array<{
    label: string
    description?: string
    icon?: ReactNode
    content?: ReactNode
  }>
}

/**
 * Timeline props (maps to Timeline section)
 */
export interface TimelineProps {
  active?: number
  bulletSize?: number
  lineWidth?: number
  items: Array<{
    title: string
    content?: ReactNode
    bullet?: ReactNode
    color?: string
  }>
}

/**
 * Rich text editor props
 */
export interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  /** Toolbar controls */
  controls?: Array<'bold' | 'italic' | 'underline' | 'link' | 'image' | 'list' | 'heading'>
  /** Placeholder */
  placeholder?: string
  /** Read-only mode */
  editable?: boolean
}

// =============================================================================
// GAPS IDENTIFIED:
// =============================================================================
//
// Mantine has components that @mdxui/html doesn't:
// - Spotlight (command palette) - GAP
// - Notifications system - GAP (only basic Newsletter)
// - App Shell with responsive sidebar - partially covered by layouts
// - Stepper - GAP
// - RichTextEditor - GAP (only basic EditorView)
// - File upload with preview - GAP
// - Color picker - GAP
// - Date/time pickers - GAP
// - Carousel/Embla - GAP (only in testimonials)
// - Blockquote component - GAP
// - Code/syntax highlight - GAP
// - Kbd (keyboard shortcut) - GAP
// - Mark (text highlight) - GAP
// - Spoiler (show more) - GAP
// - Tabs with content - partial (only in views)
// - Accordion with nested - partial
//
// =============================================================================

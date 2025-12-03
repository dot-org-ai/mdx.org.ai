/**
 * @mdxui/widgets
 *
 * Advanced widgets for MDX applications including chatbox, editor, and searchbox.
 *
 * @packageDocumentation
 */

// Chatbox widgets
export * from './components/chatbox'

// Editor widgets
export * from './components/editor'

// Searchbox widgets
export * from './components/searchbox'

// Theme provider
export { ThemeProvider } from './components/theme-provider'

// Re-export UI components
export * from './components/ui/button'
export * from './components/ui/input'
export * from './components/ui/textarea'
export * from './components/ui/dialog'
export * from './components/ui/command'
export * from './components/ui/tabs'
export * from './components/ui/select'
export * from './components/ui/dropdown-menu'
export * from './components/ui/tooltip'
export * from './components/ui/toggle'
export * from './components/ui/toggle-group'
export * from './components/ui/separator'
export * from './components/ui/resizable'
export * from './components/ui/kbd'
export * from './components/ui/alert-dialog'
export * from './components/ui/sonner'

// Hooks
export { useAutosave } from './hooks/use-autosave'
export { useEditorLayout } from './hooks/use-editor-layout'
export { useMediaQuery } from './hooks/use-media-query'

// Utility functions
export { cn } from './lib/utils'

// Types
export type * from './lib/types'
export type * from './lib/searchbox-types'

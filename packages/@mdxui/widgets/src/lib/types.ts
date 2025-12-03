// Viewport sizes for preview pane
export type Viewport = 'mobile' | 'tablet' | 'desktop'

export const viewportWidths: Record<Viewport, number | '100%'> = {
  mobile: 375,
  tablet: 768,
  desktop: '100%',
}

// Layout modes
export type Layout = 'split' | 'drawer-right' | 'drawer-left'

// Editor panel props
export interface EditorPanelProps {
  /** Path identifier for the content being edited */
  path?: string
  /** Initial MDX content to load */
  initialContent?: string
  /** Server action or callback to save content */
  onSave?: (content: string) => Promise<void>
  /** Custom keyboard shortcut to toggle (default: 'meta+.') */
  shortcut?: string
  /** Position of the trigger button */
  triggerPosition?: 'bottom-left' | 'bottom-right'
  /** Whether to show the trigger button (default: true) */
  showTrigger?: boolean
  /** Layout mode */
  layout?: Layout
}

// MDX compile error
export interface CompileError {
  message: string
  line?: number
  column?: number
  codeFrame?: string
}

// Save response types
export type SaveResponse =
  | { success: true; version: number; checksum: string }
  | { success: false; error: 'conflict'; serverContent: string; serverVersion: number }
  | { success: false; error: 'validation'; message: string }
  | { success: false; error: 'network'; message: string }

// Conflict state
export interface ConflictState {
  serverContent: string
  serverVersion: number
  localContent: string
}

// Cursor position for status bar
export interface CursorPosition {
  lineNumber: number
  column: number
}

// Editor trigger props
export interface EditorTriggerProps {
  isOpen: boolean
  onToggle: () => void
}

// Preview pane props
export interface PreviewPaneProps {
  content: string
  viewport?: Viewport
  zoom?: number
  onJumpToLine?: (line: number) => void
}

// Editor pane props
export interface EditorPaneProps {
  content: string
  onChange: (content: string) => void
  path: string
  isSaving?: boolean
  isDirty?: boolean
  onSave?: () => void
  onClose?: () => void
  onCursorChange?: (position: CursorPosition) => void
}

// Status bar props
export interface StatusBarProps {
  path?: string
  line?: number
  column?: number
  isDirty?: boolean
  error?: string
}

// Preview header props
export interface PreviewHeaderProps {
  viewport: Viewport
  onViewportChange: (viewport: Viewport) => void
  zoom: number
  onZoomChange: (zoom: number) => void
  scrollSync?: boolean
  onScrollSyncChange?: (enabled: boolean) => void
}

// Editor header props
export interface EditorHeaderProps {
  path: string
  isSaving?: boolean
  isDirty?: boolean
  onFormat?: () => void
  onSave?: () => void
  onClose?: () => void
}

// Modal props
export interface UnsavedChangesDialogProps {
  open: boolean
  onDiscard: () => void
  onSaveAndClose: () => void
  onCancel: () => void
}

export interface ConflictModalProps {
  conflict: ConflictState
  onKeepMine: () => void
  onUseServer: () => void
  onOpenDiff?: () => void
  onClose: () => void
}

export interface RecoveryPromptProps {
  open: boolean
  timestamp: number
  onDiscard: () => void
  onRestore: () => void
}

// Autosave data
export interface AutosaveData {
  content: string
  timestamp: number
}

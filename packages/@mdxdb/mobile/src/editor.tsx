/**
 * @mdxdb/mobile/editor - Mobile MDX Editor Component
 *
 * A React Native editor component for MDX documents with database integration.
 *
 * @packageDocumentation
 */

import * as React from 'react'
import { parse, stringify } from 'mdxld'
import type { MDXLDDocument } from 'mdxld'
import type { MobileDB, MobileDocument } from './index'

/**
 * Editor layout options
 */
export type EditorLayout = 'minimal' | 'editor' | 'split' | 'full'

/**
 * Editor theme
 */
export interface EditorTheme {
  /** Background color */
  background: string
  /** Text color */
  text: string
  /** Border color */
  border: string
  /** Primary accent color */
  primary: string
  /** Secondary color */
  secondary: string
  /** Font family */
  fontFamily: string
  /** Font size */
  fontSize: number
}

/**
 * Default light theme
 */
export const lightTheme: EditorTheme = {
  background: '#ffffff',
  text: '#1a1a1a',
  border: '#e5e5e5',
  primary: '#3b82f6',
  secondary: '#6b7280',
  fontFamily: 'monospace',
  fontSize: 14,
}

/**
 * Default dark theme
 */
export const darkTheme: EditorTheme = {
  background: '#1e1e1e',
  text: '#d4d4d4',
  border: '#3a3a3a',
  primary: '#60a5fa',
  secondary: '#9ca3af',
  fontFamily: 'monospace',
  fontSize: 14,
}

/**
 * Mobile editor props
 */
export interface MobileEditorProps {
  /** Database instance */
  db?: MobileDB
  /** Document path for auto-save */
  documentPath?: string
  /** Initial content */
  initialContent?: string
  /** Layout preset */
  layout?: EditorLayout
  /** Theme */
  theme?: EditorTheme
  /** Called when content changes */
  onChange?: (content: string, doc: MDXLDDocument) => void
  /** Called when document is saved */
  onSave?: (doc: MobileDocument) => void
  /** Auto-save delay in ms (0 to disable) */
  autoSaveDelay?: number
  /** Read-only mode */
  readOnly?: boolean
  /** Placeholder text */
  placeholder?: string
  /** Show preview panel */
  showPreview?: boolean
  /** Show metadata panel */
  showMetadata?: boolean
  /** Custom render for preview */
  renderPreview?: (doc: MDXLDDocument) => React.ReactNode
}

/**
 * Editor state
 */
export interface EditorState {
  /** Current content */
  content: string
  /** Parsed document */
  doc: MDXLDDocument | null
  /** Whether content has unsaved changes */
  isDirty: boolean
  /** Whether currently saving */
  isSaving: boolean
  /** Error message if any */
  error: string | null
}

/**
 * Use editor state hook
 */
export function useEditorState(props: MobileEditorProps): {
  state: EditorState
  setContent: (content: string) => void
  save: () => Promise<void>
  load: () => Promise<void>
} {
  const { db, documentPath, initialContent = '', autoSaveDelay = 1000, onChange, onSave } = props

  const [state, setState] = React.useState<EditorState>({
    content: initialContent,
    doc: initialContent ? parse(initialContent) : null,
    isDirty: false,
    isSaving: false,
    error: null,
  })

  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const setContent = React.useCallback(
    (content: string) => {
      let doc: MDXLDDocument | null = null
      let error: string | null = null

      try {
        doc = parse(content)
      } catch (e) {
        error = e instanceof Error ? e.message : 'Parse error'
      }

      setState(prev => ({
        ...prev,
        content,
        doc,
        isDirty: true,
        error,
      }))

      if (doc) {
        onChange?.(content, doc)
      }

      // Auto-save
      if (autoSaveDelay > 0 && db && documentPath) {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current)
        }
        saveTimerRef.current = setTimeout(() => {
          void save()
        }, autoSaveDelay)
      }
    },
    [db, documentPath, autoSaveDelay, onChange]
  )

  const save = React.useCallback(async () => {
    if (!db || !documentPath || state.isSaving) return

    setState(prev => ({ ...prev, isSaving: true }))

    try {
      const mobileDoc = await db.save(documentPath, state.content)
      setState(prev => ({ ...prev, isDirty: false, isSaving: false }))
      onSave?.(mobileDoc)
    } catch (e) {
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: e instanceof Error ? e.message : 'Save failed',
      }))
    }
  }, [db, documentPath, state.content, state.isSaving, onSave])

  const load = React.useCallback(async () => {
    if (!db || !documentPath) return

    try {
      const mobileDoc = await db.get(documentPath)
      if (mobileDoc) {
        setState({
          content: mobileDoc.content,
          doc: mobileDoc.doc,
          isDirty: false,
          isSaving: false,
          error: null,
        })
      }
    } catch (e) {
      setState(prev => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Load failed',
      }))
    }
  }, [db, documentPath])

  // Load on mount
  React.useEffect(() => {
    if (db && documentPath) {
      void load()
    }
  }, [db, documentPath])

  // Cleanup timer
  React.useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
      }
    }
  }, [])

  return { state, setContent, save, load }
}

/**
 * Document metadata display props
 */
export interface MetadataPanelProps {
  doc: MDXLDDocument | null
  theme: EditorTheme
}

/**
 * Extract frontmatter metadata for display
 */
export function extractMetadata(doc: MDXLDDocument | null): Record<string, unknown> {
  if (!doc) return {}

  const { data } = doc
  return {
    $type: doc.type,
    $id: doc.id,
    $context: doc.context,
    ...data,
  }
}

/**
 * Format metadata for display
 */
export function formatMetadata(doc: MDXLDDocument | null): string {
  const meta = extractMetadata(doc)
  return JSON.stringify(meta, null, 2)
}

/**
 * Create editor context
 */
export interface EditorContextValue {
  db: MobileDB | null
  theme: EditorTheme
  state: EditorState
  setContent: (content: string) => void
  save: () => Promise<void>
  load: () => Promise<void>
}

export const EditorContext = React.createContext<EditorContextValue | null>(null)

/**
 * Use editor context hook
 */
export function useEditor(): EditorContextValue {
  const context = React.useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

/**
 * Editor provider props
 */
export interface EditorProviderProps extends MobileEditorProps {
  children: React.ReactNode
}

/**
 * Editor provider component
 */
export function EditorProvider({ children, theme = darkTheme, db, ...props }: EditorProviderProps) {
  const { state, setContent, save, load } = useEditorState({ db, theme, ...props })

  const value: EditorContextValue = {
    db: db ?? null,
    theme,
    state,
    setContent,
    save,
    load,
  }

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
}

// Re-exports
export { parse, stringify }
export type { MDXLDDocument }

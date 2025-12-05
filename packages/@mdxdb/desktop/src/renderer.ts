/**
 * @mdxdb/desktop/renderer - Renderer process utilities
 *
 * Provides hooks and utilities for using the database from React components.
 *
 * @packageDocumentation
 */

import type { DesktopDocument, ListOptions, SearchOptions, WatcherEvent } from './index'
import type { DBRendererAPI } from './preload'

/**
 * Get the database API from window
 */
export function getDBAPI(): DBRendererAPI | undefined {
  return (window as unknown as { mdxdb?: DBRendererAPI }).mdxdb
}

/**
 * Check if database API is available
 */
export function isDBAvailable(): boolean {
  return typeof window !== 'undefined' && getDBAPI() !== undefined
}

/**
 * Get a document by path
 */
export async function getDocument(path: string): Promise<DesktopDocument> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available. Are you running in Electron with preload?')
  }

  const result = await api.get(path)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Document not found')
  }

  return result.data
}

/**
 * Save a document
 */
export async function saveDocument(path: string, content: string): Promise<DesktopDocument> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available')
  }

  const result = await api.save(path, content)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to save document')
  }

  return result.data
}

/**
 * Delete a document
 */
export async function deleteDocument(path: string): Promise<void> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available')
  }

  const result = await api.delete(path)
  if (!result.success) {
    throw new Error(result.error || 'Failed to delete document')
  }
}

/**
 * List documents
 */
export async function listDocuments(options?: ListOptions): Promise<DesktopDocument[]> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available')
  }

  const result = await api.list(options)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to list documents')
  }

  return result.data
}

/**
 * Search documents
 */
export async function searchDocuments(
  query: string,
  options?: SearchOptions
): Promise<DesktopDocument[]> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available')
  }

  const result = await api.search(query, options)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to search documents')
  }

  return result.data
}

/**
 * Get recent documents
 */
export async function getRecentDocuments(limit?: number): Promise<DesktopDocument[]> {
  const api = getDBAPI()
  if (!api) {
    throw new Error('Database API not available')
  }

  const result = await api.recent(limit)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to get recent documents')
  }

  return result.data
}

/**
 * Subscribe to document changes
 */
export function onDocumentChange(callback: (event: WatcherEvent) => void): () => void {
  const api = getDBAPI()
  if (!api) {
    console.warn('Database API not available, changes will not be received')
    return () => {}
  }

  return api.onChange(callback)
}

/**
 * Create a debounced save function
 */
export function createDebouncedSave(
  path: string,
  onSave?: (doc: DesktopDocument) => void,
  delay = 500
): (content: string) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (content: string) => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(async () => {
      try {
        const doc = await saveDocument(path, content)
        onSave?.(doc)
      } catch (error) {
        console.error('Auto-save error:', error)
      }
    }, delay)
  }
}

/**
 * Document state for use in components
 */
export interface UseDocumentState {
  doc: DesktopDocument | null
  loading: boolean
  error: string | null
  save: (content: string) => Promise<void>
  reload: () => Promise<void>
}

/**
 * React-like state manager for documents
 * (For use without React hooks)
 */
export function createDocumentState(
  path: string,
  onChange?: (state: UseDocumentState) => void
): UseDocumentState & { destroy: () => void } {
  let state: UseDocumentState = {
    doc: null,
    loading: true,
    error: null,
    save: async () => {},
    reload: async () => {},
  }

  const updateState = (updates: Partial<UseDocumentState>) => {
    state = { ...state, ...updates }
    onChange?.(state)
  }

  const reload = async () => {
    updateState({ loading: true, error: null })
    try {
      const doc = await getDocument(path)
      updateState({ doc, loading: false })
    } catch (error) {
      updateState({
        loading: false,
        error: error instanceof Error ? error.message : 'Load failed',
      })
    }
  }

  const save = async (content: string) => {
    try {
      const doc = await saveDocument(path, content)
      updateState({ doc })
    } catch (error) {
      updateState({
        error: error instanceof Error ? error.message : 'Save failed',
      })
    }
  }

  state.save = save
  state.reload = reload

  // Initial load
  void reload()

  // Watch for changes
  const unwatch = onDocumentChange(event => {
    if (event.path === path && event.doc) {
      updateState({ doc: event.doc })
    }
  })

  return {
    ...state,
    get doc() { return state.doc },
    get loading() { return state.loading },
    get error() { return state.error },
    save,
    reload,
    destroy: unwatch,
  }
}

// Type augmentation for window
declare global {
  interface Window {
    mdxdb?: DBRendererAPI
  }
}

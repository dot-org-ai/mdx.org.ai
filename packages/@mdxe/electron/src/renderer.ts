/**
 * @mdxe/electron/renderer - Renderer process utilities
 *
 * Provides utilities for the renderer process to work with MDX content.
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDAstNode } from 'mdxld'

/**
 * MDX API type (matches what preload exposes)
 */
export interface MDXWindowAPI {
  parse: (content: string) => Promise<{ success: boolean; data?: MDXLDDocument; error?: string }>
  toAst: (content: string) => Promise<{ success: boolean; data?: MDXLDAstNode; error?: string }>
  readFile: (path: string) => Promise<{
    success: boolean
    data?: { content: string; doc: MDXLDDocument; path: string }
    error?: string
  }>
  writeFile: (path: string, content: string) => Promise<{
    success: boolean
    data?: { path: string }
    error?: string
  }>
  onContentUpdate: (callback: (doc: MDXLDDocument) => void) => () => void
}

/**
 * App API type (matches what preload exposes)
 */
export interface AppWindowAPI {
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

/**
 * Get the MDX API from window
 */
export function getMDXAPI(): MDXWindowAPI | undefined {
  return (window as unknown as { mdx?: MDXWindowAPI }).mdx
}

/**
 * Get the App API from window
 */
export function getAppAPI(): AppWindowAPI | undefined {
  return (window as unknown as { app?: AppWindowAPI }).app
}

/**
 * Check if running in Electron
 */
export function isElectron(): boolean {
  return typeof window !== 'undefined' && getMDXAPI() !== undefined
}

/**
 * Parse MDX content via IPC
 */
export async function parseMDX(content: string): Promise<MDXLDDocument> {
  const api = getMDXAPI()
  if (!api) {
    throw new Error('MDX API not available. Are you running in Electron with preload?')
  }

  const result = await api.parse(content)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to parse MDX')
  }

  return result.data
}

/**
 * Convert MDX to AST via IPC
 */
export async function toMDXAst(content: string): Promise<MDXLDAstNode> {
  const api = getMDXAPI()
  if (!api) {
    throw new Error('MDX API not available. Are you running in Electron with preload?')
  }

  const result = await api.toAst(content)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to convert to AST')
  }

  return result.data
}

/**
 * Read MDX file via IPC
 */
export async function readMDXFile(path: string): Promise<{ content: string; doc: MDXLDDocument }> {
  const api = getMDXAPI()
  if (!api) {
    throw new Error('MDX API not available. Are you running in Electron with preload?')
  }

  const result = await api.readFile(path)
  if (!result.success || !result.data) {
    throw new Error(result.error || 'Failed to read file')
  }

  return result.data
}

/**
 * Write MDX file via IPC
 */
export async function writeMDXFile(path: string, content: string): Promise<void> {
  const api = getMDXAPI()
  if (!api) {
    throw new Error('MDX API not available. Are you running in Electron with preload?')
  }

  const result = await api.writeFile(path, content)
  if (!result.success) {
    throw new Error(result.error || 'Failed to write file')
  }
}

/**
 * Subscribe to MDX content updates
 */
export function onMDXUpdate(callback: (doc: MDXLDDocument) => void): () => void {
  const api = getMDXAPI()
  if (!api) {
    console.warn('MDX API not available, updates will not be received')
    return () => {}
  }

  return api.onContentUpdate(callback)
}

/**
 * Create a debounced MDX parser
 */
export function createDebouncedParser(
  onParse: (doc: MDXLDDocument) => void,
  delay = 150
): (content: string) => void {
  let timer: ReturnType<typeof setTimeout> | null = null

  return (content: string) => {
    if (timer) {
      clearTimeout(timer)
    }

    timer = setTimeout(async () => {
      try {
        const doc = await parseMDX(content)
        onParse(doc)
      } catch (error) {
        console.error('Parse error:', error)
      }
    }, delay)
  }
}

// Type augmentation for window
declare global {
  interface Window {
    mdx?: MDXWindowAPI
    app?: AppWindowAPI
  }
}

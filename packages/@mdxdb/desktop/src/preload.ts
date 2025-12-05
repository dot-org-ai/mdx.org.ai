/**
 * @mdxdb/desktop/preload - Preload script for database API
 *
 * Exposes database operations to the renderer process.
 *
 * @packageDocumentation
 */

import { contextBridge, ipcRenderer } from 'electron'
import type { DesktopDocument, ListOptions, SearchOptions, WatcherEvent } from './index'

/**
 * Database API exposed to renderer
 */
export interface DBRendererAPI {
  /** Get a document by path */
  get(path: string): Promise<{ success: boolean; data?: DesktopDocument; error?: string }>
  /** Save a document */
  save(path: string, content: string): Promise<{ success: boolean; data?: DesktopDocument; error?: string }>
  /** Delete a document */
  delete(path: string): Promise<{ success: boolean; error?: string }>
  /** List documents */
  list(options?: ListOptions): Promise<{ success: boolean; data?: DesktopDocument[]; error?: string }>
  /** Search documents */
  search(query: string, options?: SearchOptions): Promise<{ success: boolean; data?: DesktopDocument[]; error?: string }>
  /** Get recent documents */
  recent(limit?: number): Promise<{ success: boolean; data?: DesktopDocument[]; error?: string }>
  /** Subscribe to changes */
  onChange(callback: (event: WatcherEvent) => void): () => void
}

/**
 * Preload configuration
 */
export interface DBPreloadConfig {
  /** IPC channel prefix (default: 'mdxdb') */
  prefix?: string
  /** Name to expose API under (default: 'mdxdb') */
  apiName?: string
}

/**
 * Expose database API to renderer
 */
export function exposeDBAPI(config: DBPreloadConfig = {}): void {
  const { prefix = 'mdxdb', apiName = 'mdxdb' } = config

  const dbAPI: DBRendererAPI = {
    get: (path: string) => ipcRenderer.invoke(`${prefix}:get`, path),
    save: (path: string, content: string) => ipcRenderer.invoke(`${prefix}:save`, path, content),
    delete: (path: string) => ipcRenderer.invoke(`${prefix}:delete`, path),
    list: (options?: ListOptions) => ipcRenderer.invoke(`${prefix}:list`, options),
    search: (query: string, options?: SearchOptions) => ipcRenderer.invoke(`${prefix}:search`, query, options),
    recent: (limit?: number) => ipcRenderer.invoke(`${prefix}:recent`, limit),
    onChange: (callback: (event: WatcherEvent) => void) => {
      const handler = (_event: unknown, data: WatcherEvent) => callback(data)
      ipcRenderer.on(`${prefix}:change`, handler)
      return () => ipcRenderer.removeListener(`${prefix}:change`, handler)
    },
  }

  contextBridge.exposeInMainWorld(apiName, dbAPI)
}

/**
 * Create combined preload with MDX and DB APIs
 */
export function createDBPreload(config: DBPreloadConfig = {}): void {
  exposeDBAPI(config)
}

/**
 * @mdxdb/studio/electron - Electron integration for the studio
 *
 * Provides utilities to embed the studio in an Electron application.
 *
 * @packageDocumentation
 */

import { createStudio, type StudioConfig, type Studio, type FileEntry, type FileChangeEvent } from './index'

/**
 * Electron studio configuration
 */
export interface ElectronStudioConfig extends StudioConfig {
  /** IPC channel prefix (default: 'studio') */
  ipcPrefix?: string
}

/**
 * Register studio IPC handlers for Electron main process
 */
export function registerStudioHandlers(
  ipcMain: Electron.IpcMain,
  config: ElectronStudioConfig
): Studio {
  const { ipcPrefix = 'studio', ...studioConfig } = config
  const studio = createStudio(studioConfig)

  // Get file tree
  ipcMain.handle(`${ipcPrefix}:getFiles`, async () => {
    try {
      const files = await studio.getFiles()
      return { success: true, data: files }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Read document
  ipcMain.handle(`${ipcPrefix}:readDocument`, async (_, relativePath: string) => {
    try {
      const doc = await studio.readDocument(relativePath)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Save document
  ipcMain.handle(`${ipcPrefix}:saveDocument`, async (_, relativePath: string, content: string) => {
    try {
      await studio.saveDocument(relativePath, content)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Create document
  ipcMain.handle(`${ipcPrefix}:createDocument`, async (_, relativePath: string, template?: string) => {
    try {
      const doc = await studio.createDocument(relativePath, template)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Delete document
  ipcMain.handle(`${ipcPrefix}:deleteDocument`, async (_, relativePath: string) => {
    try {
      await studio.deleteDocument(relativePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Parse content
  ipcMain.handle(`${ipcPrefix}:parse`, async (_, content: string) => {
    try {
      const doc = studio.parse(content)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  return studio
}

/**
 * Setup file change notifications to renderer
 */
export function setupStudioNotifications(
  studio: Studio,
  webContents: Electron.WebContents,
  prefix = 'studio'
): () => void {
  return studio.watch(event => {
    webContents.send(`${prefix}:fileChange`, event)
  })
}

/**
 * Preload API for studio
 */
export interface StudioPreloadAPI {
  /** Get file tree */
  getFiles(): Promise<{ success: boolean; data?: FileEntry[]; error?: string }>
  /** Read document */
  readDocument(path: string): Promise<{ success: boolean; data?: unknown; error?: string }>
  /** Save document */
  saveDocument(path: string, content: string): Promise<{ success: boolean; error?: string }>
  /** Create document */
  createDocument(path: string, template?: string): Promise<{ success: boolean; data?: unknown; error?: string }>
  /** Delete document */
  deleteDocument(path: string): Promise<{ success: boolean; error?: string }>
  /** Parse content */
  parse(content: string): Promise<{ success: boolean; data?: unknown; error?: string }>
  /** Subscribe to file changes */
  onFileChange(callback: (event: FileChangeEvent) => void): () => void
}

/**
 * Create preload script content for studio
 */
export function getPreloadScript(prefix = 'studio'): string {
  return `
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('studio', {
  getFiles: () => ipcRenderer.invoke('${prefix}:getFiles'),
  readDocument: (path) => ipcRenderer.invoke('${prefix}:readDocument', path),
  saveDocument: (path, content) => ipcRenderer.invoke('${prefix}:saveDocument', path, content),
  createDocument: (path, template) => ipcRenderer.invoke('${prefix}:createDocument', path, template),
  deleteDocument: (path) => ipcRenderer.invoke('${prefix}:deleteDocument', path),
  parse: (content) => ipcRenderer.invoke('${prefix}:parse', content),
  onFileChange: (callback) => {
    const handler = (_, event) => callback(event);
    ipcRenderer.on('${prefix}:fileChange', handler);
    return () => ipcRenderer.removeListener('${prefix}:fileChange', handler);
  }
});
`
}

// Type augmentation for window
declare global {
  interface Window {
    studio?: StudioPreloadAPI
  }
}

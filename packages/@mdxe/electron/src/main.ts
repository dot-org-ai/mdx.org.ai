/**
 * @mdxe/electron/main - Main process utilities
 *
 * Provides utilities for the Electron main process to handle
 * MDX parsing and file operations.
 *
 * @packageDocumentation
 */

import { ipcMain, type IpcMain, type BrowserWindow } from 'electron'
import { parse, toAst, type MDXLDDocument } from 'mdxld'
import { readFile, writeFile, watch } from 'fs/promises'
import { join } from 'path'

/**
 * IPC handler configuration
 */
export interface IPCHandlerConfig {
  /**
   * IPC channel prefix (default: 'mdx')
   */
  prefix?: string

  /**
   * Base directory for file operations
   */
  baseDir?: string
}

/**
 * Register MDX IPC handlers on the main process
 *
 * @example
 * ```typescript
 * import { registerMDXHandlers } from '@mdxe/electron/main'
 *
 * app.whenReady().then(() => {
 *   registerMDXHandlers()
 *   createWindow()
 * })
 * ```
 */
export function registerMDXHandlers(config: IPCHandlerConfig = {}) {
  const { prefix = 'mdx', baseDir = process.cwd() } = config

  // Parse MDX content
  ipcMain.handle(`${prefix}:parse`, async (_event, content: string) => {
    try {
      const doc = parse(content)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Convert to AST
  ipcMain.handle(`${prefix}:toAst`, async (_event, content: string) => {
    try {
      const doc = parse(content)
      const ast = toAst(doc)
      return { success: true, data: ast }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Read MDX file
  ipcMain.handle(`${prefix}:readFile`, async (_event, filePath: string) => {
    try {
      const fullPath = join(baseDir, filePath)
      const content = await readFile(fullPath, 'utf-8')
      const doc = parse(content)
      return { success: true, data: { content, doc, path: fullPath } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  // Write MDX file
  ipcMain.handle(`${prefix}:writeFile`, async (_event, filePath: string, content: string) => {
    try {
      const fullPath = join(baseDir, filePath)
      await writeFile(fullPath, content, 'utf-8')
      return { success: true, data: { path: fullPath } }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}

/**
 * Watch a directory for MDX file changes
 */
export async function watchMDXDirectory(
  dir: string,
  callback: (event: string, filename: string | null) => void
): Promise<{ close: () => void }> {
  const watcher = watch(dir, { recursive: true })

  ;(async () => {
    for await (const event of watcher) {
      if (event.filename?.endsWith('.mdx') || event.filename?.endsWith('.md')) {
        callback(event.eventType, event.filename)
      }
    }
  })()

  return {
    close: () => {
      // AbortController would be used in real implementation
    },
  }
}

/**
 * Create a window with MDX content
 */
export interface CreateMDXWindowOptions {
  /**
   * Window width
   */
  width?: number

  /**
   * Window height
   */
  height?: number

  /**
   * Initial MDX content
   */
  content?: string

  /**
   * Path to MDX file
   */
  filePath?: string

  /**
   * Enable dev tools
   */
  devTools?: boolean
}

/**
 * Utility to load MDX content into a window
 */
export async function loadMDXInWindow(
  window: BrowserWindow,
  content: string
): Promise<void> {
  const doc = parse(content)
  await window.webContents.executeJavaScript(`
    window.dispatchEvent(new CustomEvent('mdx:content', {
      detail: ${JSON.stringify(doc)}
    }))
  `)
}

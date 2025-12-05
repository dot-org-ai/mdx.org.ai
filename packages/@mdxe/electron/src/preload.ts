/**
 * @mdxe/electron/preload - Preload script utilities
 *
 * Provides utilities for creating Electron preload scripts
 * that expose MDX functionality to the renderer.
 *
 * @packageDocumentation
 */

import { contextBridge, ipcRenderer } from 'electron'

/**
 * MDX API exposed to renderer
 */
export interface MDXRendererAPI {
  /**
   * Parse MDX content
   */
  parse: (content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>

  /**
   * Convert MDX to AST
   */
  toAst: (content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>

  /**
   * Read MDX file
   */
  readFile: (path: string) => Promise<{ success: boolean; data?: unknown; error?: string }>

  /**
   * Write MDX file
   */
  writeFile: (path: string, content: string) => Promise<{ success: boolean; data?: unknown; error?: string }>

  /**
   * Subscribe to MDX content updates
   */
  onContentUpdate: (callback: (doc: unknown) => void) => () => void
}

/**
 * App info exposed to renderer
 */
export interface AppRendererAPI {
  platform: string
  versions: {
    node: string
    chrome: string
    electron: string
  }
}

/**
 * Preload configuration
 */
export interface PreloadConfig {
  /**
   * IPC channel prefix (default: 'mdx')
   */
  prefix?: string

  /**
   * Name to expose API under (default: 'mdx')
   */
  apiName?: string

  /**
   * Include app info API (default: true)
   */
  includeAppInfo?: boolean
}

/**
 * Create and expose MDX API to renderer
 *
 * @example
 * ```typescript
 * // preload.ts
 * import { exposeMDXAPI } from '@mdxe/electron/preload'
 * exposeMDXAPI()
 * ```
 */
export function exposeMDXAPI(config: PreloadConfig = {}): void {
  const { prefix = 'mdx', apiName = 'mdx', includeAppInfo = true } = config

  const mdxAPI: MDXRendererAPI = {
    parse: (content: string) => ipcRenderer.invoke(`${prefix}:parse`, content),
    toAst: (content: string) => ipcRenderer.invoke(`${prefix}:toAst`, content),
    readFile: (path: string) => ipcRenderer.invoke(`${prefix}:readFile`, path),
    writeFile: (path: string, content: string) =>
      ipcRenderer.invoke(`${prefix}:writeFile`, path, content),
    onContentUpdate: (callback: (doc: unknown) => void) => {
      const handler = (_event: unknown, doc: unknown) => callback(doc)
      ipcRenderer.on(`${prefix}:contentUpdate`, handler)
      return () => ipcRenderer.removeListener(`${prefix}:contentUpdate`, handler)
    },
  }

  contextBridge.exposeInMainWorld(apiName, mdxAPI)

  if (includeAppInfo) {
    const appAPI: AppRendererAPI = {
      platform: process.platform,
      versions: {
        node: process.versions.node,
        chrome: process.versions.chrome,
        electron: process.versions.electron,
      },
    }
    contextBridge.exposeInMainWorld('app', appAPI)
  }
}

/**
 * Create a custom preload with additional APIs
 */
export function createPreload(
  config: PreloadConfig = {},
  additionalAPIs?: Record<string, unknown>
): void {
  exposeMDXAPI(config)

  if (additionalAPIs) {
    for (const [name, api] of Object.entries(additionalAPIs)) {
      contextBridge.exposeInMainWorld(name, api)
    }
  }
}

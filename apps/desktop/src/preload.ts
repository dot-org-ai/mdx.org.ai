import { contextBridge, ipcRenderer } from 'electron'

/**
 * Expose MDX operations to the renderer process
 */
contextBridge.exposeInMainWorld('mdx', {
  /**
   * Parse MDX content
   */
  parse: (content: string) => ipcRenderer.invoke('mdx:parse', content),

  /**
   * Convert MDX to AST
   */
  toAst: (content: string) => ipcRenderer.invoke('mdx:toAst', content),
})

/**
 * Expose app info
 */
contextBridge.exposeInMainWorld('app', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
})

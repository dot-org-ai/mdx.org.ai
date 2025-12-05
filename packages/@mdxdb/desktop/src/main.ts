/**
 * @mdxdb/desktop/main - Main process database implementation
 *
 * Full filesystem-based implementation for Electron main process.
 * Uses Node.js fs/path APIs for file operations and chokidar for watching.
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse, stringify } from 'mdxld'
import type { MDXLDDocument } from 'mdxld'
import type {
  DesktopDB,
  DesktopDBConfig,
  DesktopDocument,
  ListOptions,
  SearchOptions,
  WatcherEvent,
} from './index'
import { defaultConfig } from './index'

/**
 * Filesystem-based desktop database implementation
 */
export class FilesystemDesktopDB implements DesktopDB {
  config: DesktopDBConfig
  private watchers = new Set<(event: WatcherEvent) => void>()
  private fsWatcher: fs.FSWatcher | null = null
  private watchedPaths = new Set<string>()

  constructor(config: DesktopDBConfig) {
    this.config = {
      ...defaultConfig,
      ...config,
    } as DesktopDBConfig

    // Ensure base directory exists
    if (!fs.existsSync(this.config.baseDir)) {
      fs.mkdirSync(this.config.baseDir, { recursive: true })
    }

    if (this.config.watch) {
      this.startWatching()
    }
  }

  private resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath
    }
    return path.join(this.config.baseDir, filePath)
  }

  private isValidExtension(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase()
    return this.config.extensions?.includes(ext) ?? true
  }

  private shouldIgnore(filePath: string): boolean {
    const relativePath = path.relative(this.config.baseDir, filePath)
    return this.config.ignore?.some(pattern => {
      if (pattern.includes('*')) {
        // Simple glob matching
        const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
        return regex.test(relativePath)
      }
      return relativePath.includes(pattern)
    }) ?? false
  }

  async get(filePath: string): Promise<DesktopDocument | null> {
    const fullPath = this.resolvePath(filePath)

    if (!fs.existsSync(fullPath)) {
      return null
    }

    const stats = fs.statSync(fullPath)
    if (stats.size > (this.config.maxFileSize ?? Infinity)) {
      throw new Error(`File too large: ${stats.size} bytes`)
    }

    const content = fs.readFileSync(fullPath, 'utf-8')

    return {
      path: fullPath,
      content,
      doc: parse(content),
      modifiedAt: stats.mtime,
      size: stats.size,
      isWatched: this.watchedPaths.has(fullPath),
    }
  }

  async save(filePath: string, content: string): Promise<DesktopDocument> {
    const fullPath = this.resolvePath(filePath)
    const dir = path.dirname(fullPath)

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    const existing = fs.existsSync(fullPath)
    fs.writeFileSync(fullPath, content, 'utf-8')

    const stats = fs.statSync(fullPath)
    const doc: DesktopDocument = {
      path: fullPath,
      content,
      doc: parse(content),
      modifiedAt: stats.mtime,
      size: stats.size,
      isWatched: this.watchedPaths.has(fullPath),
    }

    this.notifyWatchers({
      type: existing ? 'change' : 'create',
      path: fullPath,
      doc,
    })

    return doc
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = this.resolvePath(filePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
      this.notifyWatchers({ type: 'delete', path: fullPath })
    }
  }

  async list(options?: ListOptions): Promise<DesktopDocument[]> {
    const searchDir = options?.directory
      ? this.resolvePath(options.directory)
      : this.config.baseDir

    const docs: DesktopDocument[] = []
    const readDir = (dir: string, recursive: boolean) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)

        if (this.shouldIgnore(fullPath)) continue

        if (entry.isDirectory() && recursive) {
          readDir(fullPath, recursive)
        } else if (entry.isFile() && this.isValidExtension(entry.name)) {
          try {
            const stats = fs.statSync(fullPath)
            if (stats.size <= (this.config.maxFileSize ?? Infinity)) {
              const content = fs.readFileSync(fullPath, 'utf-8')
              docs.push({
                path: fullPath,
                content,
                doc: parse(content),
                modifiedAt: stats.mtime,
                size: stats.size,
                isWatched: this.watchedPaths.has(fullPath),
              })
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }

    readDir(searchDir, options?.recursive ?? true)

    // Sort
    if (options?.sortBy) {
      docs.sort((a, b) => {
        const aVal = a[options.sortBy!]
        const bVal = b[options.sortBy!]
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
        return options.sortDir === 'desc' ? -cmp : cmp
      })
    }

    // Limit
    if (options?.limit) {
      return docs.slice(0, options.limit)
    }

    return docs
  }

  async search(query: string, options?: SearchOptions): Promise<DesktopDocument[]> {
    const docs = await this.list()
    const searchQuery = options?.caseSensitive ? query : query.toLowerCase()

    let searchFn: (text: string) => boolean
    if (options?.regex) {
      const regex = new RegExp(query, options.caseSensitive ? '' : 'i')
      searchFn = text => regex.test(text)
    } else {
      searchFn = text => {
        const searchText = options?.caseSensitive ? text : text.toLowerCase()
        return searchText.includes(searchQuery)
      }
    }

    return docs.filter(doc => {
      if (options?.content !== false && searchFn(doc.content)) {
        return true
      }
      if (options?.frontmatter !== false) {
        const data = doc.doc.data
        const searchFields = [
          data.title,
          data.description,
          doc.doc.type,
          doc.doc.id,
        ].filter(Boolean).join(' ')
        if (searchFn(searchFields)) {
          return true
        }
      }
      return false
    }).slice(0, options?.limit)
  }

  parse(content: string): MDXLDDocument {
    return parse(content)
  }

  stringify(doc: MDXLDDocument): string {
    return stringify(doc)
  }

  watch(callback: (event: WatcherEvent) => void): () => void {
    this.watchers.add(callback)
    return () => this.watchers.delete(callback)
  }

  startWatching(): void {
    if (this.fsWatcher) return

    this.fsWatcher = fs.watch(
      this.config.baseDir,
      { recursive: true },
      (eventType, filename) => {
        if (!filename) return

        const fullPath = path.join(this.config.baseDir, filename)

        if (this.shouldIgnore(fullPath)) return
        if (!this.isValidExtension(fullPath)) return

        this.watchedPaths.add(fullPath)

        if (eventType === 'rename') {
          if (fs.existsSync(fullPath)) {
            // File created or renamed
            this.get(fullPath).then(doc => {
              if (doc) {
                this.notifyWatchers({ type: 'create', path: fullPath, doc })
              }
            }).catch(() => {})
          } else {
            // File deleted
            this.watchedPaths.delete(fullPath)
            this.notifyWatchers({ type: 'delete', path: fullPath })
          }
        } else if (eventType === 'change') {
          this.get(fullPath).then(doc => {
            if (doc) {
              this.notifyWatchers({ type: 'change', path: fullPath, doc })
            }
          }).catch(() => {})
        }
      }
    )
  }

  stopWatching(): void {
    if (this.fsWatcher) {
      this.fsWatcher.close()
      this.fsWatcher = null
    }
    this.watchedPaths.clear()
  }

  async getRecent(limit = 10): Promise<DesktopDocument[]> {
    return this.list({ sortBy: 'modifiedAt', sortDir: 'desc', limit })
  }

  close(): void {
    this.stopWatching()
    this.watchers.clear()
  }

  private notifyWatchers(event: WatcherEvent): void {
    this.watchers.forEach(cb => cb(event))
  }
}

/**
 * Create filesystem-based desktop database
 */
export function createFilesystemDB(config: DesktopDBConfig): DesktopDB {
  return new FilesystemDesktopDB(config)
}

/**
 * Register IPC handlers for database operations
 */
export function registerDBHandlers(
  ipcMain: Electron.IpcMain,
  db: DesktopDB,
  prefix = 'mdxdb'
): void {
  ipcMain.handle(`${prefix}:get`, async (_, path: string) => {
    try {
      const doc = await db.get(path)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${prefix}:save`, async (_, path: string, content: string) => {
    try {
      const doc = await db.save(path, content)
      return { success: true, data: doc }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${prefix}:delete`, async (_, path: string) => {
    try {
      await db.delete(path)
      return { success: true }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${prefix}:list`, async (_, options?: ListOptions) => {
    try {
      const docs = await db.list(options)
      return { success: true, data: docs }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${prefix}:search`, async (_, query: string, options?: SearchOptions) => {
    try {
      const docs = await db.search(query, options)
      return { success: true, data: docs }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })

  ipcMain.handle(`${prefix}:recent`, async (_, limit?: number) => {
    try {
      const docs = await db.getRecent(limit)
      return { success: true, data: docs }
    } catch (error) {
      return { success: false, error: String(error) }
    }
  })
}

/**
 * Setup change notifications to renderer
 */
export function setupDBNotifications(
  db: DesktopDB,
  webContents: Electron.WebContents,
  prefix = 'mdxdb'
): () => void {
  return db.watch(event => {
    webContents.send(`${prefix}:change`, event)
  })
}

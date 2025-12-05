/**
 * @mdxdb/desktop - MDXDB for Electron
 *
 * Desktop document database with filesystem persistence, file watching,
 * and editor integration for Electron applications.
 *
 * @packageDocumentation
 */

import { parse, stringify } from 'mdxld'
import type { MDXLDDocument } from 'mdxld'

/**
 * Desktop document with file metadata
 */
export interface DesktopDocument {
  /** File path */
  path: string
  /** Raw content */
  content: string
  /** Parsed document */
  doc: MDXLDDocument
  /** Last modified timestamp */
  modifiedAt: Date
  /** File size in bytes */
  size: number
  /** Whether file is being watched */
  isWatched: boolean
}

/**
 * File watcher event
 */
export interface WatcherEvent {
  type: 'create' | 'change' | 'delete'
  path: string
  doc?: DesktopDocument
}

/**
 * Desktop database configuration
 */
export interface DesktopDBConfig {
  /** Base directory for documents */
  baseDir: string
  /** File extensions to include (default: ['.mdx', '.md']) */
  extensions?: string[]
  /** Watch for file changes */
  watch?: boolean
  /** Ignore patterns (glob) */
  ignore?: string[]
  /** Max file size in bytes (default: 10MB) */
  maxFileSize?: number
}

/**
 * List options
 */
export interface ListOptions {
  /** Filter by directory */
  directory?: string
  /** Include subdirectories */
  recursive?: boolean
  /** Limit results */
  limit?: number
  /** Sort by field */
  sortBy?: 'path' | 'modifiedAt' | 'size'
  /** Sort direction */
  sortDir?: 'asc' | 'desc'
}

/**
 * Search options
 */
export interface SearchOptions {
  /** Search in content */
  content?: boolean
  /** Search in frontmatter */
  frontmatter?: boolean
  /** Case sensitive */
  caseSensitive?: boolean
  /** Regex search */
  regex?: boolean
  /** Limit results */
  limit?: number
}

/**
 * Desktop database interface
 */
export interface DesktopDB {
  /** Configuration */
  config: DesktopDBConfig
  /** Get a document by path */
  get(path: string): Promise<DesktopDocument | null>
  /** Save a document */
  save(path: string, content: string): Promise<DesktopDocument>
  /** Delete a document */
  delete(path: string): Promise<void>
  /** List documents */
  list(options?: ListOptions): Promise<DesktopDocument[]>
  /** Search documents */
  search(query: string, options?: SearchOptions): Promise<DesktopDocument[]>
  /** Parse content */
  parse(content: string): MDXLDDocument
  /** Stringify document */
  stringify(doc: MDXLDDocument): string
  /** Watch for changes */
  watch(callback: (event: WatcherEvent) => void): () => void
  /** Start watching all files */
  startWatching(): void
  /** Stop watching all files */
  stopWatching(): void
  /** Get recent files */
  getRecent(limit?: number): Promise<DesktopDocument[]>
  /** Close database and cleanup */
  close(): void
}

/**
 * In-memory implementation for testing
 */
export class MemoryDesktopDB implements DesktopDB {
  config: DesktopDBConfig
  private store = new Map<string, { content: string; modifiedAt: Date }>()
  private watchers = new Set<(event: WatcherEvent) => void>()

  constructor(config: DesktopDBConfig) {
    this.config = config
  }

  async get(path: string): Promise<DesktopDocument | null> {
    const entry = this.store.get(path)
    if (!entry) return null

    return {
      path,
      content: entry.content,
      doc: parse(entry.content),
      modifiedAt: entry.modifiedAt,
      size: entry.content.length,
      isWatched: false,
    }
  }

  async save(path: string, content: string): Promise<DesktopDocument> {
    const now = new Date()
    const existing = this.store.has(path)
    this.store.set(path, { content, modifiedAt: now })

    const doc: DesktopDocument = {
      path,
      content,
      doc: parse(content),
      modifiedAt: now,
      size: content.length,
      isWatched: false,
    }

    this.notifyWatchers({
      type: existing ? 'change' : 'create',
      path,
      doc,
    })

    return doc
  }

  async delete(path: string): Promise<void> {
    this.store.delete(path)
    this.notifyWatchers({ type: 'delete', path })
  }

  async list(options?: ListOptions): Promise<DesktopDocument[]> {
    const docs: DesktopDocument[] = []

    for (const [path, entry] of this.store) {
      if (options?.directory && !path.startsWith(options.directory)) {
        continue
      }

      docs.push({
        path,
        content: entry.content,
        doc: parse(entry.content),
        modifiedAt: entry.modifiedAt,
        size: entry.content.length,
        isWatched: false,
      })
    }

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

    return docs.filter(doc => {
      const content = options?.caseSensitive ? doc.content : doc.content.toLowerCase()
      const title = doc.doc.data.title?.toString() ?? ''
      const searchTitle = options?.caseSensitive ? title : title.toLowerCase()

      if (options?.content !== false && content.includes(searchQuery)) {
        return true
      }
      if (options?.frontmatter !== false && searchTitle.includes(searchQuery)) {
        return true
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
    // No-op for memory implementation
  }

  stopWatching(): void {
    // No-op for memory implementation
  }

  async getRecent(limit = 10): Promise<DesktopDocument[]> {
    return this.list({ sortBy: 'modifiedAt', sortDir: 'desc', limit })
  }

  close(): void {
    this.watchers.clear()
    this.store.clear()
  }

  private notifyWatchers(event: WatcherEvent): void {
    this.watchers.forEach(cb => cb(event))
  }
}

/**
 * Default configuration
 */
export const defaultConfig: Partial<DesktopDBConfig> = {
  extensions: ['.mdx', '.md'],
  watch: false,
  ignore: ['node_modules', '.git', 'dist'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
}

/**
 * Create a desktop database instance
 * Note: Full filesystem implementation is in ./main.ts (requires Node.js APIs)
 */
export function createDesktopDB(config: DesktopDBConfig): DesktopDB {
  return new MemoryDesktopDB({
    ...defaultConfig,
    ...config,
  } as DesktopDBConfig)
}

// Re-export mdxld types
export type { MDXLDDocument, MDXLDData, LDProperties } from 'mdxld'
export { parse, stringify } from 'mdxld'

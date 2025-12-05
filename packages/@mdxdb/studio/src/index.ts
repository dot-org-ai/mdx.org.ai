/**
 * @mdxdb/studio - Full-featured MDX editor with database integration
 *
 * Wraps @mdxui/editor with database-specific features:
 * - File browser with mdxdb integration
 * - Save/load documents to filesystem or database
 * - Live preview with component rendering
 * - Frontmatter editing
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { parse, stringify } from 'mdxld'
import type { MDXLDDocument } from 'mdxld'

/**
 * Studio configuration
 */
export interface StudioConfig {
  /** Base directory for content files */
  contentDir: string
  /** Port for the studio server (default: 4321) */
  port?: number
  /** Enable hot reload (default: true) */
  hotReload?: boolean
  /** Database URL for ClickHouse integration (optional) */
  databaseUrl?: string
  /** Custom components for preview */
  components?: Record<string, unknown>
}

/**
 * File entry in the file browser
 */
export interface FileEntry {
  /** File name */
  name: string
  /** Full path */
  path: string
  /** Relative path from content dir */
  relativePath: string
  /** Is directory */
  isDirectory: boolean
  /** Children (for directories) */
  children?: FileEntry[]
  /** File size in bytes */
  size?: number
  /** Last modified */
  modifiedAt?: Date
}

/**
 * Document state in the studio
 */
export interface DocumentState {
  /** File path */
  path: string
  /** Raw content */
  content: string
  /** Parsed document */
  doc: MDXLDDocument
  /** Whether content has unsaved changes */
  isDirty: boolean
  /** Last saved content */
  savedContent: string
}

/**
 * Studio instance
 */
export interface Studio {
  /** Configuration */
  config: StudioConfig
  /** Get file tree */
  getFiles(): Promise<FileEntry[]>
  /** Read a document */
  readDocument(relativePath: string): Promise<DocumentState>
  /** Save a document */
  saveDocument(relativePath: string, content: string): Promise<void>
  /** Create a new document */
  createDocument(relativePath: string, template?: string): Promise<DocumentState>
  /** Delete a document */
  deleteDocument(relativePath: string): Promise<void>
  /** Watch for file changes */
  watch(callback: (event: FileChangeEvent) => void): () => void
  /** Parse MDX content */
  parse(content: string): MDXLDDocument
  /** Stringify document to MDX */
  stringify(doc: MDXLDDocument): string
}

/**
 * File change event
 */
export interface FileChangeEvent {
  type: 'create' | 'change' | 'delete'
  path: string
  relativePath: string
}

/**
 * Create a studio instance
 */
export function createStudio(config: StudioConfig): Studio {
  const { contentDir, hotReload = true } = config
  const watchers = new Set<(event: FileChangeEvent) => void>()
  let fsWatcher: fs.FSWatcher | null = null

  // Ensure content directory exists
  if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true })
  }

  const resolvePath = (relativePath: string): string => {
    return path.join(contentDir, relativePath)
  }

  const getRelativePath = (fullPath: string): string => {
    return path.relative(contentDir, fullPath)
  }

  const readDir = (dir: string, basePath: string = ''): FileEntry[] => {
    const entries: FileEntry[] = []

    if (!fs.existsSync(dir)) return entries

    const items = fs.readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      // Skip hidden files and node_modules
      if (item.name.startsWith('.') || item.name === 'node_modules') continue

      const fullPath = path.join(dir, item.name)
      const relativePath = basePath ? `${basePath}/${item.name}` : item.name

      if (item.isDirectory()) {
        entries.push({
          name: item.name,
          path: fullPath,
          relativePath,
          isDirectory: true,
          children: readDir(fullPath, relativePath),
        })
      } else if (item.name.endsWith('.mdx') || item.name.endsWith('.md')) {
        const stats = fs.statSync(fullPath)
        entries.push({
          name: item.name,
          path: fullPath,
          relativePath,
          isDirectory: false,
          size: stats.size,
          modifiedAt: stats.mtime,
        })
      }
    }

    // Sort: directories first, then alphabetically
    return entries.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1
      if (!a.isDirectory && b.isDirectory) return 1
      return a.name.localeCompare(b.name)
    })
  }

  const notifyWatchers = (event: FileChangeEvent) => {
    watchers.forEach(cb => cb(event))
  }

  return {
    config,

    async getFiles(): Promise<FileEntry[]> {
      return readDir(contentDir)
    },

    async readDocument(relativePath: string): Promise<DocumentState> {
      const fullPath = resolvePath(relativePath)

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Document not found: ${relativePath}`)
      }

      const content = fs.readFileSync(fullPath, 'utf-8')
      const doc = parse(content)

      return {
        path: fullPath,
        content,
        doc,
        isDirty: false,
        savedContent: content,
      }
    },

    async saveDocument(relativePath: string, content: string): Promise<void> {
      const fullPath = resolvePath(relativePath)
      const dir = path.dirname(fullPath)

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(fullPath, content, 'utf-8')

      notifyWatchers({
        type: 'change',
        path: fullPath,
        relativePath,
      })
    },

    async createDocument(relativePath: string, template?: string): Promise<DocumentState> {
      const fullPath = resolvePath(relativePath)

      if (fs.existsSync(fullPath)) {
        throw new Error(`Document already exists: ${relativePath}`)
      }

      const defaultTemplate = `---
title: ${path.basename(relativePath, path.extname(relativePath))}
---

# ${path.basename(relativePath, path.extname(relativePath))}

`
      const content = template ?? defaultTemplate
      const dir = path.dirname(fullPath)

      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }

      fs.writeFileSync(fullPath, content, 'utf-8')

      notifyWatchers({
        type: 'create',
        path: fullPath,
        relativePath,
      })

      return {
        path: fullPath,
        content,
        doc: parse(content),
        isDirty: false,
        savedContent: content,
      }
    },

    async deleteDocument(relativePath: string): Promise<void> {
      const fullPath = resolvePath(relativePath)

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath)
        notifyWatchers({
          type: 'delete',
          path: fullPath,
          relativePath,
        })
      }
    },

    watch(callback: (event: FileChangeEvent) => void): () => void {
      watchers.add(callback)

      // Start file system watcher if this is the first subscriber
      if (hotReload && !fsWatcher) {
        fsWatcher = fs.watch(contentDir, { recursive: true }, (eventType, filename) => {
          if (!filename) return
          if (!filename.endsWith('.mdx') && !filename.endsWith('.md')) return

          const fullPath = path.join(contentDir, filename)
          const relativePath = filename

          if (eventType === 'rename') {
            if (fs.existsSync(fullPath)) {
              notifyWatchers({ type: 'create', path: fullPath, relativePath })
            } else {
              notifyWatchers({ type: 'delete', path: fullPath, relativePath })
            }
          } else {
            notifyWatchers({ type: 'change', path: fullPath, relativePath })
          }
        })
      }

      return () => {
        watchers.delete(callback)

        // Stop file system watcher if no more subscribers
        if (watchers.size === 0 && fsWatcher) {
          fsWatcher.close()
          fsWatcher = null
        }
      }
    },

    parse(content: string): MDXLDDocument {
      return parse(content)
    },

    stringify(doc: MDXLDDocument): string {
      return stringify(doc)
    },
  }
}

/**
 * Default content template for new documents
 */
export const defaultTemplate = `---
title: New Document
---

# New Document

Start writing here...
`

// Re-export types
export type { MDXLDDocument }
export { parse, stringify }

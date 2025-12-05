/**
 * @mdxdb/mobile - MDXDB for Expo/React Native
 *
 * Mobile document database with local persistence and sync capabilities.
 *
 * @packageDocumentation
 */

import { parse, stringify } from 'mdxld'
import type { MDXLDDocument } from 'mdxld'

/**
 * Storage adapter interface for mobile persistence
 */
export interface StorageAdapter {
  /** Get a document by path */
  get(path: string): Promise<string | null>
  /** Set a document at path */
  set(path: string, content: string): Promise<void>
  /** Delete a document */
  delete(path: string): Promise<void>
  /** List all document paths */
  list(prefix?: string): Promise<string[]>
  /** Check if a document exists */
  exists(path: string): Promise<boolean>
}

/**
 * Document with metadata
 */
export interface MobileDocument {
  /** Document path/ID */
  path: string
  /** Raw content */
  content: string
  /** Parsed document */
  doc: MDXLDDocument
  /** Last modified timestamp */
  updatedAt: Date
  /** Created timestamp */
  createdAt: Date
  /** Sync status */
  syncStatus: 'local' | 'synced' | 'conflict'
}

/**
 * Mobile database configuration
 */
export interface MobileDBConfig {
  /** Storage adapter to use */
  storage: StorageAdapter
  /** Base path for documents */
  basePath?: string
  /** Auto-sync to remote */
  autoSync?: boolean
  /** Remote API endpoint for sync */
  remoteUrl?: string
}

/**
 * Mobile database instance
 */
export interface MobileDB {
  /** Get a document by path */
  get(path: string): Promise<MobileDocument | null>
  /** Save a document */
  save(path: string, content: string): Promise<MobileDocument>
  /** Delete a document */
  delete(path: string): Promise<void>
  /** List all documents */
  list(options?: { prefix?: string; limit?: number }): Promise<MobileDocument[]>
  /** Search documents */
  search(query: string): Promise<MobileDocument[]>
  /** Parse content to document */
  parse(content: string): MDXLDDocument
  /** Stringify document to content */
  stringify(doc: MDXLDDocument): string
  /** Sync with remote */
  sync(): Promise<{ synced: number; conflicts: number }>
  /** Subscribe to changes */
  onChange(callback: (doc: MobileDocument) => void): () => void
}

/**
 * In-memory storage adapter (for testing/development)
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private store = new Map<string, string>()

  async get(path: string): Promise<string | null> {
    return this.store.get(path) ?? null
  }

  async set(path: string, content: string): Promise<void> {
    this.store.set(path, content)
  }

  async delete(path: string): Promise<void> {
    this.store.delete(path)
  }

  async list(prefix?: string): Promise<string[]> {
    const paths = Array.from(this.store.keys())
    if (prefix) {
      return paths.filter(p => p.startsWith(prefix))
    }
    return paths
  }

  async exists(path: string): Promise<boolean> {
    return this.store.has(path)
  }
}

/**
 * Create a mobile database instance
 */
export function createMobileDB(config: MobileDBConfig): MobileDB {
  const { storage, basePath = '', autoSync = false, remoteUrl } = config
  const listeners = new Set<(doc: MobileDocument) => void>()
  const metadata = new Map<string, { createdAt: Date; updatedAt: Date; syncStatus: 'local' | 'synced' | 'conflict' }>()

  const resolvePath = (path: string) => {
    if (basePath && !path.startsWith(basePath)) {
      return `${basePath}/${path}`.replace(/\/+/g, '/')
    }
    return path
  }

  const notifyListeners = (doc: MobileDocument) => {
    listeners.forEach(cb => cb(doc))
  }

  return {
    async get(path: string): Promise<MobileDocument | null> {
      const fullPath = resolvePath(path)
      const content = await storage.get(fullPath)
      if (!content) return null

      const doc = parse(content)
      const meta = metadata.get(fullPath) ?? {
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'local' as const,
      }

      return {
        path: fullPath,
        content,
        doc,
        ...meta,
      }
    },

    async save(path: string, content: string): Promise<MobileDocument> {
      const fullPath = resolvePath(path)
      const doc = parse(content)
      const now = new Date()

      const existing = metadata.get(fullPath)
      const meta = {
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        syncStatus: 'local' as const,
      }
      metadata.set(fullPath, meta)

      await storage.set(fullPath, content)

      const mobileDoc: MobileDocument = {
        path: fullPath,
        content,
        doc,
        ...meta,
      }

      notifyListeners(mobileDoc)

      if (autoSync && remoteUrl) {
        // Background sync
        void syncDocument(mobileDoc, remoteUrl).catch(console.error)
      }

      return mobileDoc
    },

    async delete(path: string): Promise<void> {
      const fullPath = resolvePath(path)
      await storage.delete(fullPath)
      metadata.delete(fullPath)
    },

    async list(options?: { prefix?: string; limit?: number }): Promise<MobileDocument[]> {
      const prefix = options?.prefix ? resolvePath(options.prefix) : basePath
      const paths = await storage.list(prefix)
      const limited = options?.limit ? paths.slice(0, options.limit) : paths

      const docs: MobileDocument[] = []
      for (const path of limited) {
        const doc = await this.get(path)
        if (doc) docs.push(doc)
      }
      return docs
    },

    async search(query: string): Promise<MobileDocument[]> {
      const allDocs = await this.list()
      const lowerQuery = query.toLowerCase()

      return allDocs.filter(doc => {
        // Search in content
        if (doc.content.toLowerCase().includes(lowerQuery)) return true
        // Search in frontmatter
        const data = doc.doc.data
        if (data.title?.toString().toLowerCase().includes(lowerQuery)) return true
        if (data.description?.toString().toLowerCase().includes(lowerQuery)) return true
        return false
      })
    },

    parse(content: string): MDXLDDocument {
      return parse(content)
    },

    stringify(doc: MDXLDDocument): string {
      return stringify(doc)
    },

    async sync(): Promise<{ synced: number; conflicts: number }> {
      if (!remoteUrl) {
        return { synced: 0, conflicts: 0 }
      }

      const allDocs = await this.list()
      let synced = 0
      let conflicts = 0

      for (const doc of allDocs) {
        if (doc.syncStatus === 'local') {
          try {
            await syncDocument(doc, remoteUrl)
            const meta = metadata.get(doc.path)
            if (meta) {
              meta.syncStatus = 'synced'
            }
            synced++
          } catch {
            const meta = metadata.get(doc.path)
            if (meta) {
              meta.syncStatus = 'conflict'
            }
            conflicts++
          }
        }
      }

      return { synced, conflicts }
    },

    onChange(callback: (doc: MobileDocument) => void): () => void {
      listeners.add(callback)
      return () => listeners.delete(callback)
    },
  }
}

/**
 * Sync a document to remote server
 */
async function syncDocument(doc: MobileDocument, remoteUrl: string): Promise<void> {
  const response = await fetch(`${remoteUrl}/documents/${encodeURIComponent(doc.path)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: doc.content,
      updatedAt: doc.updatedAt.toISOString(),
    }),
  })

  if (!response.ok) {
    throw new Error(`Sync failed: ${response.status}`)
  }
}

// Re-export types from mdxld
export type { MDXLDDocument, MDXLDData, LDProperties } from 'mdxld'
export { parse, stringify } from 'mdxld'

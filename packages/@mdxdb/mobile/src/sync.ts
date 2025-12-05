/**
 * @mdxdb/mobile/sync - Sync utilities for mobile database
 *
 * Provides sync capabilities between local mobile storage and remote servers.
 *
 * @packageDocumentation
 */

import type { MobileDB, MobileDocument, StorageAdapter } from './index'

/**
 * Sync configuration
 */
export interface SyncConfig {
  /** Remote API endpoint */
  remoteUrl: string
  /** Authentication token */
  authToken?: string
  /** Sync interval in ms (0 to disable auto-sync) */
  syncInterval?: number
  /** Conflict resolution strategy */
  conflictStrategy?: 'local-wins' | 'remote-wins' | 'manual'
  /** Called when sync starts */
  onSyncStart?: () => void
  /** Called when sync completes */
  onSyncComplete?: (result: SyncResult) => void
  /** Called on sync error */
  onSyncError?: (error: Error) => void
  /** Called on conflict */
  onConflict?: (local: MobileDocument, remote: RemoteDocument) => Promise<'local' | 'remote'>
}

/**
 * Remote document representation
 */
export interface RemoteDocument {
  path: string
  content: string
  updatedAt: string
  etag?: string
}

/**
 * Sync result
 */
export interface SyncResult {
  /** Documents uploaded to remote */
  uploaded: number
  /** Documents downloaded from remote */
  downloaded: number
  /** Conflicts encountered */
  conflicts: number
  /** Errors encountered */
  errors: string[]
  /** Duration in ms */
  duration: number
}

/**
 * Sync state
 */
export interface SyncState {
  /** Whether sync is in progress */
  isSyncing: boolean
  /** Last sync timestamp */
  lastSync: Date | null
  /** Last sync result */
  lastResult: SyncResult | null
  /** Pending changes count */
  pendingChanges: number
}

/**
 * Sync manager for mobile database
 */
export class SyncManager {
  private config: SyncConfig
  private db: MobileDB
  private state: SyncState = {
    isSyncing: false,
    lastSync: null,
    lastResult: null,
    pendingChanges: 0,
  }
  private intervalId: ReturnType<typeof setInterval> | null = null
  private listeners = new Set<(state: SyncState) => void>()

  constructor(db: MobileDB, config: SyncConfig) {
    this.db = db
    this.config = config

    // Subscribe to document changes
    db.onChange(() => {
      this.state.pendingChanges++
      this.notifyListeners()
    })

    // Start auto-sync if configured
    if (config.syncInterval && config.syncInterval > 0) {
      this.startAutoSync()
    }
  }

  /**
   * Get current sync state
   */
  getState(): SyncState {
    return { ...this.state }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: (state: SyncState) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notifyListeners() {
    const state = this.getState()
    this.listeners.forEach(cb => cb(state))
  }

  /**
   * Perform sync
   */
  async sync(): Promise<SyncResult> {
    if (this.state.isSyncing) {
      return this.state.lastResult ?? {
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['Sync already in progress'],
        duration: 0,
      }
    }

    const startTime = Date.now()
    this.state.isSyncing = true
    this.notifyListeners()
    this.config.onSyncStart?.()

    const result: SyncResult = {
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      duration: 0,
    }

    try {
      // Get local documents
      const localDocs = await this.db.list()

      // Get remote document list
      const remoteDocs = await this.fetchRemoteList()

      // Upload local changes
      for (const localDoc of localDocs) {
        if (localDoc.syncStatus === 'local') {
          const remoteDoc = remoteDocs.find(r => r.path === localDoc.path)

          if (remoteDoc) {
            // Check for conflict
            const remoteTime = new Date(remoteDoc.updatedAt)
            if (remoteTime > localDoc.updatedAt) {
              // Conflict detected
              result.conflicts++
              const resolution = await this.resolveConflict(localDoc, remoteDoc)
              if (resolution === 'local') {
                await this.uploadDocument(localDoc)
                result.uploaded++
              } else {
                await this.downloadDocument(remoteDoc)
                result.downloaded++
              }
            } else {
              // Local is newer, upload
              await this.uploadDocument(localDoc)
              result.uploaded++
            }
          } else {
            // New document, upload
            await this.uploadDocument(localDoc)
            result.uploaded++
          }
        }
      }

      // Download new remote documents
      const localPaths = new Set(localDocs.map(d => d.path))
      for (const remoteDoc of remoteDocs) {
        if (!localPaths.has(remoteDoc.path)) {
          await this.downloadDocument(remoteDoc)
          result.downloaded++
        }
      }

      this.state.pendingChanges = 0
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      result.errors.push(message)
      this.config.onSyncError?.(error instanceof Error ? error : new Error(message))
    }

    result.duration = Date.now() - startTime
    this.state.isSyncing = false
    this.state.lastSync = new Date()
    this.state.lastResult = result
    this.notifyListeners()
    this.config.onSyncComplete?.(result)

    return result
  }

  /**
   * Start auto-sync
   */
  startAutoSync(): void {
    if (this.intervalId) return
    if (!this.config.syncInterval || this.config.syncInterval <= 0) return

    this.intervalId = setInterval(() => {
      void this.sync()
    }, this.config.syncInterval)
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Destroy sync manager
   */
  destroy(): void {
    this.stopAutoSync()
    this.listeners.clear()
  }

  private async fetchRemoteList(): Promise<RemoteDocument[]> {
    const response = await fetch(`${this.config.remoteUrl}/documents`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch remote list: ${response.status}`)
    }

    return response.json()
  }

  private async uploadDocument(doc: MobileDocument): Promise<void> {
    const response = await fetch(`${this.config.remoteUrl}/documents/${encodeURIComponent(doc.path)}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: doc.content,
        updatedAt: doc.updatedAt.toISOString(),
      }),
    })

    if (!response.ok) {
      throw new Error(`Failed to upload document: ${response.status}`)
    }
  }

  private async downloadDocument(remoteDoc: RemoteDocument): Promise<void> {
    const response = await fetch(
      `${this.config.remoteUrl}/documents/${encodeURIComponent(remoteDoc.path)}`,
      { headers: this.getHeaders() }
    )

    if (!response.ok) {
      throw new Error(`Failed to download document: ${response.status}`)
    }

    const data = await response.json() as { content: string }
    await this.db.save(remoteDoc.path, data.content)
  }

  private async resolveConflict(
    local: MobileDocument,
    remote: RemoteDocument
  ): Promise<'local' | 'remote'> {
    if (this.config.onConflict) {
      return this.config.onConflict(local, remote)
    }

    switch (this.config.conflictStrategy) {
      case 'local-wins':
        return 'local'
      case 'remote-wins':
        return 'remote'
      case 'manual':
      default:
        // Default to remote for safety
        return 'remote'
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.config.authToken) {
      headers['Authorization'] = `Bearer ${this.config.authToken}`
    }
    return headers
  }
}

/**
 * Create sync manager
 */
export function createSyncManager(db: MobileDB, config: SyncConfig): SyncManager {
  return new SyncManager(db, config)
}

/**
 * Expo File System storage adapter
 * (Requires expo-file-system to be installed)
 */
export async function createFileSystemAdapter(
  baseDir: string
): Promise<StorageAdapter> {
  // Dynamic import to avoid bundling issues
  const FileSystem = await import('expo-file-system')

  const ensureDir = async (path: string) => {
    const info = await FileSystem.getInfoAsync(path)
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(path, { intermediates: true })
    }
  }

  const resolvePath = (path: string) => {
    return `${baseDir}/${path}`.replace(/\/+/g, '/')
  }

  await ensureDir(baseDir)

  return {
    async get(path: string): Promise<string | null> {
      const fullPath = resolvePath(path)
      const info = await FileSystem.getInfoAsync(fullPath)
      if (!info.exists) return null
      return FileSystem.readAsStringAsync(fullPath)
    },

    async set(path: string, content: string): Promise<void> {
      const fullPath = resolvePath(path)
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
      await ensureDir(dir)
      await FileSystem.writeAsStringAsync(fullPath, content)
    },

    async delete(path: string): Promise<void> {
      const fullPath = resolvePath(path)
      const info = await FileSystem.getInfoAsync(fullPath)
      if (info.exists) {
        await FileSystem.deleteAsync(fullPath)
      }
    },

    async list(prefix?: string): Promise<string[]> {
      const searchDir = prefix ? resolvePath(prefix) : baseDir
      const info = await FileSystem.getInfoAsync(searchDir)
      if (!info.exists || !info.isDirectory) return []

      const items = await FileSystem.readDirectoryAsync(searchDir)
      const paths: string[] = []

      for (const item of items) {
        const itemPath = `${searchDir}/${item}`
        const itemInfo = await FileSystem.getInfoAsync(itemPath)
        if (itemInfo.isDirectory) {
          const subItems = await this.list(itemPath)
          paths.push(...subItems)
        } else {
          paths.push(itemPath.replace(baseDir + '/', ''))
        }
      }

      return paths
    },

    async exists(path: string): Promise<boolean> {
      const fullPath = resolvePath(path)
      const info = await FileSystem.getInfoAsync(fullPath)
      return info.exists
    },
  }
}

/**
 * Expo SQLite storage adapter
 * (Requires expo-sqlite to be installed)
 */
export async function createSQLiteAdapter(databaseName: string): Promise<StorageAdapter> {
  // Dynamic import to avoid bundling issues
  const SQLite = await import('expo-sqlite')

  const db = await SQLite.openDatabaseAsync(databaseName)

  // Create table if not exists
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS documents (
      path TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `)

  return {
    async get(path: string): Promise<string | null> {
      const result = await db.getFirstAsync<{ content: string }>(
        'SELECT content FROM documents WHERE path = ?',
        [path]
      )
      return result?.content ?? null
    },

    async set(path: string, content: string): Promise<void> {
      const now = new Date().toISOString()
      await db.runAsync(
        `INSERT OR REPLACE INTO documents (path, content, created_at, updated_at)
         VALUES (?, ?, COALESCE((SELECT created_at FROM documents WHERE path = ?), ?), ?)`,
        [path, content, path, now, now]
      )
    },

    async delete(path: string): Promise<void> {
      await db.runAsync('DELETE FROM documents WHERE path = ?', [path])
    },

    async list(prefix?: string): Promise<string[]> {
      let results: { path: string }[]
      if (prefix) {
        results = await db.getAllAsync<{ path: string }>(
          'SELECT path FROM documents WHERE path LIKE ?',
          [`${prefix}%`]
        )
      } else {
        results = await db.getAllAsync<{ path: string }>('SELECT path FROM documents')
      }
      return results.map(r => r.path)
    },

    async exists(path: string): Promise<boolean> {
      const result = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM documents WHERE path = ?',
        [path]
      )
      return (result?.count ?? 0) > 0
    },
  }
}

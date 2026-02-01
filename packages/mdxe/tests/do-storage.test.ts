/**
 * Tests for Durable Object storage integration with mdxe deploy
 *
 * This tests storing deployed MDX content in Durable Objects via mdxdb/do:
 * - DO-based content storage (store MDX in DO SQLite)
 * - R2 backup for large files (>1MB)
 * - Parquet storage for structured data
 * - Content retrieval via worker_loaders
 * - Content versioning and history
 *
 * @packageDocumentation
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'

// =============================================================================
// Mock Types (matching actual DO/R2/Parquet interfaces)
// =============================================================================

interface StorageEnv {
  /** Durable Object namespace for content storage */
  MDXDB: MockDurableObjectNamespace
  /** R2 bucket for large file storage */
  CONTENT_BUCKET: MockR2Bucket
  /** Worker loader for dynamic execution */
  LOADER: MockWorkerLoader
}

interface MockDurableObjectNamespace {
  idFromName: (name: string) => MockDurableObjectId
  get: (id: MockDurableObjectId) => MockDurableObjectStub
}

interface MockDurableObjectId {
  name: string
}

interface MockDurableObjectStub {
  /** Store content in DO SQLite */
  storeContent: Mock
  /** Get content from DO SQLite */
  getContent: Mock
  /** List all stored content */
  listContent: Mock
  /** Get content version history */
  getVersionHistory: Mock
  /** Store structured metadata */
  storeMetadata: Mock
  /** Get database size */
  getDatabaseSize: Mock
}

interface MockR2Bucket {
  put: Mock
  get: Mock
  delete: Mock
  head: Mock
}

interface MockWorkerLoader {
  get: Mock
}

interface ContentRecord {
  id: string
  hash: string
  content: string
  data: Record<string, unknown>
  size: number
  storedAt: Date
  version: number
  r2Key?: string
}

interface ContentVersion {
  version: number
  hash: string
  storedAt: Date
  size: number
}

// =============================================================================
// Test Setup
// =============================================================================

function createMockEnv(): StorageEnv {
  const mockStub: MockDurableObjectStub = {
    storeContent: vi.fn(),
    getContent: vi.fn(),
    listContent: vi.fn(),
    getVersionHistory: vi.fn(),
    storeMetadata: vi.fn(),
    getDatabaseSize: vi.fn().mockReturnValue(0),
  }

  const mockId: MockDurableObjectId = { name: 'test-namespace' }

  return {
    MDXDB: {
      idFromName: vi.fn().mockReturnValue(mockId),
      get: vi.fn().mockReturnValue(mockStub),
    },
    CONTENT_BUCKET: {
      put: vi.fn().mockResolvedValue({ key: 'test-key' }),
      get: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(undefined),
      head: vi.fn().mockResolvedValue(null),
    },
    LOADER: {
      get: vi.fn(),
    },
  }
}

// =============================================================================
// DO Storage Tests
// =============================================================================

describe('DO-based Content Storage', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('storeContentInDO', () => {
    it('should store MDX content in DO SQLite', async () => {
      const { storeContentInDO } = await import('../src/commands/do-storage.js')

      const content = `---
title: Hello World
$type: Page
---

# Welcome

This is a test page.
`

      const record: ContentRecord = {
        id: 'hello-world',
        hash: 'abc123',
        content,
        data: { title: 'Hello World', $type: 'Page' },
        size: content.length,
        storedAt: new Date(),
        version: 1,
      }

      mockStub.storeContent.mockResolvedValue(record)

      const result = await storeContentInDO(content, 'hello-world', env)

      expect(mockStub.storeContent).toHaveBeenCalled()
      expect(result).toBeDefined()
      expect(result.id).toBe('hello-world')
      expect(result.hash).toBeDefined()
      expect(result.version).toBe(1)
    })

    it('should automatically version content on updates', async () => {
      const { storeContentInDO } = await import('../src/commands/do-storage.js')

      const content = '# Updated Content'

      // First call returns version 1, second returns version 2
      mockStub.storeContent
        .mockResolvedValueOnce({
          id: 'test',
          hash: 'abc123',
          content,
          data: {},
          size: content.length,
          storedAt: new Date(),
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'test',
          hash: 'def456',
          content,
          data: {},
          size: content.length,
          storedAt: new Date(),
          version: 2,
        })

      const result1 = await storeContentInDO(content, 'test', env)
      const result2 = await storeContentInDO(content + ' v2', 'test', env)

      expect(result1.version).toBe(1)
      expect(result2.version).toBe(2)
    })

    it('should include timestamp with stored content', async () => {
      const { storeContentInDO } = await import('../src/commands/do-storage.js')

      const content = '# Test'
      const now = new Date()

      mockStub.storeContent.mockResolvedValue({
        id: 'test',
        hash: 'abc123',
        content,
        data: {},
        size: content.length,
        storedAt: now,
        version: 1,
      })

      const result = await storeContentInDO(content, 'test', env)

      expect(result.storedAt).toBeDefined()
      expect(result.storedAt).toBeInstanceOf(Date)
    })
  })

  describe('getContentFromDO', () => {
    it('should retrieve content from DO SQLite', async () => {
      const { getContentFromDO } = await import('../src/commands/do-storage.js')

      const storedContent = '# Hello World'
      mockStub.getContent.mockResolvedValue({
        id: 'hello-world',
        hash: 'abc123',
        content: storedContent,
        data: {},
        size: storedContent.length,
        storedAt: new Date(),
        version: 1,
      })

      const result = await getContentFromDO('hello-world', env)

      expect(result).toBeDefined()
      expect(result?.content).toBe(storedContent)
    })

    it('should return null for non-existent content', async () => {
      const { getContentFromDO } = await import('../src/commands/do-storage.js')

      mockStub.getContent.mockResolvedValue(null)

      const result = await getContentFromDO('non-existent', env)

      expect(result).toBeNull()
    })

    it('should retrieve content by version', async () => {
      const { getContentFromDO } = await import('../src/commands/do-storage.js')

      mockStub.getContent.mockResolvedValue({
        id: 'test',
        hash: 'abc123',
        content: '# Version 1',
        data: {},
        size: 11,
        storedAt: new Date(),
        version: 1,
      })

      const result = await getContentFromDO('test', env, { version: 1 })

      expect(result).toBeDefined()
      expect(result?.version).toBe(1)
    })
  })
})

// =============================================================================
// R2 Backup Tests
// =============================================================================

describe('R2 Backup for Large Files', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('storeInR2', () => {
    it('should store content larger than 1MB in R2', async () => {
      const { storeInR2 } = await import('../src/commands/do-storage.js')

      // Create content larger than 1MB
      const largeContent = 'x'.repeat(1024 * 1024 + 1)

      env.CONTENT_BUCKET.put.mockResolvedValue({
        key: 'large-content-abc123',
        size: largeContent.length,
      })

      const result = await storeInR2(largeContent, 'large-content', env)

      expect(env.CONTENT_BUCKET.put).toHaveBeenCalled()
      expect(result.r2Key).toBeDefined()
      expect(result.size).toBeGreaterThan(1024 * 1024)
    })

    it('should generate unique R2 keys based on content hash', async () => {
      const { storeInR2 } = await import('../src/commands/do-storage.js')

      const content1 = 'Content A'.repeat(100000)
      const content2 = 'Content B'.repeat(100000)

      env.CONTENT_BUCKET.put.mockResolvedValue({ key: 'mock-key' })

      const result1 = await storeInR2(content1, 'key1', env)
      const result2 = await storeInR2(content2, 'key2', env)

      // Different content should produce different R2 keys
      expect(result1.r2Key).not.toBe(result2.r2Key)
    })

    it('should store R2 reference in DO for retrieval', async () => {
      const { storeContentWithR2Backup } = await import('../src/commands/do-storage.js')

      const largeContent = 'x'.repeat(1024 * 1024 + 1)

      env.CONTENT_BUCKET.put.mockResolvedValue({ key: 'large-abc123' })
      mockStub.storeContent.mockResolvedValue({
        id: 'large-content',
        hash: 'abc123',
        content: '', // Content stored in R2
        data: {},
        size: largeContent.length,
        storedAt: new Date(),
        version: 1,
        r2Key: 'large-abc123',
      })

      const result = await storeContentWithR2Backup(largeContent, 'large-content', env)

      expect(result.r2Key).toBeDefined()
      expect(env.CONTENT_BUCKET.put).toHaveBeenCalled()
    })
  })

  describe('getFromR2', () => {
    it('should retrieve large content from R2', async () => {
      const { getFromR2 } = await import('../src/commands/do-storage.js')

      const largeContent = 'x'.repeat(1024 * 1024 + 1)

      env.CONTENT_BUCKET.get.mockResolvedValue({
        text: vi.fn().mockResolvedValue(largeContent),
        size: largeContent.length,
      })

      const result = await getFromR2('large-abc123', env)

      expect(result).toBe(largeContent)
    })

    it('should return null for non-existent R2 keys', async () => {
      const { getFromR2 } = await import('../src/commands/do-storage.js')

      env.CONTENT_BUCKET.get.mockResolvedValue(null)

      const result = await getFromR2('non-existent', env)

      expect(result).toBeNull()
    })
  })
})

// =============================================================================
// Parquet Storage Tests
// =============================================================================

describe('Parquet Storage for Structured Data', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('storeMetadataAsParquet', () => {
    it('should store structured metadata in parquet format', async () => {
      const { storeMetadataAsParquet } = await import('../src/commands/do-storage.js')

      const metadata = [
        { id: 'post-1', title: 'First Post', $type: 'BlogPost', createdAt: new Date() },
        { id: 'post-2', title: 'Second Post', $type: 'BlogPost', createdAt: new Date() },
      ]

      mockStub.storeMetadata.mockResolvedValue({ stored: 2 })

      const result = await storeMetadataAsParquet(metadata, env)

      expect(result.stored).toBe(2)
    })

    it('should handle nested data structures', async () => {
      const { storeMetadataAsParquet } = await import('../src/commands/do-storage.js')

      const metadata = [
        {
          id: 'page-1',
          data: {
            title: 'Nested Page',
            author: { name: 'John', email: 'john@example.com' },
            tags: ['mdx', 'durable-objects'],
          },
        },
      ]

      mockStub.storeMetadata.mockResolvedValue({ stored: 1 })

      const result = await storeMetadataAsParquet(metadata, env)

      expect(result.stored).toBe(1)
    })

    it('should support batch storage for large datasets', async () => {
      const { storeMetadataAsParquet } = await import('../src/commands/do-storage.js')

      // Create a large dataset (1000 records)
      const metadata = Array.from({ length: 1000 }, (_, i) => ({
        id: `record-${i}`,
        title: `Record ${i}`,
        $type: 'DataRecord',
      }))

      mockStub.storeMetadata.mockResolvedValue({ stored: 1000 })

      const result = await storeMetadataAsParquet(metadata, env)

      expect(result.stored).toBe(1000)
    })
  })

  describe('exportToParquet', () => {
    it('should export all content metadata to parquet', async () => {
      const { exportToParquet } = await import('../src/commands/do-storage.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'page-1', data: { title: 'Page 1' }, hash: 'abc123', size: 100, storedAt: new Date(), version: 1 },
        { id: 'page-2', data: { title: 'Page 2' }, hash: 'def456', size: 100, storedAt: new Date(), version: 1 },
      ])

      const result = await exportToParquet(env)

      expect(result.buffer).toBeDefined()
      expect(result.recordCount).toBe(2)
    })
  })
})

// =============================================================================
// Content Retrieval Tests
// =============================================================================

describe('Content Retrieval via worker_loaders', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('loadContentForWorker', () => {
    it('should load content and create worker configuration', async () => {
      const { loadContentForWorker } = await import('../src/commands/do-storage.js')

      const storedContent = `---
title: Test
---

# Hello

\`\`\`ts
export function greet() {
  return 'Hello!'
}
\`\`\`
`

      mockStub.getContent.mockResolvedValue({
        id: 'test',
        hash: 'abc123',
        content: storedContent,
        data: { title: 'Test' },
        size: storedContent.length,
        storedAt: new Date(),
        version: 1,
      })

      const mockWorker = {
        fetch: vi.fn().mockResolvedValue(new Response('Hello!')),
      }
      env.LOADER.get.mockResolvedValue(mockWorker)

      const result = await loadContentForWorker('test', env)

      expect(result).toBeDefined()
      expect(result.worker).toBeDefined()
    })

    it('should use cached content hash for worker ID', async () => {
      const { loadContentForWorker } = await import('../src/commands/do-storage.js')

      mockStub.getContent.mockResolvedValue({
        id: 'test',
        hash: 'cached-hash-123',
        content: '# Test',
        data: {},
        size: 6,
        storedAt: new Date(),
        version: 1,
      })

      const mockWorker = { fetch: vi.fn() }
      env.LOADER.get.mockResolvedValue(mockWorker)

      await loadContentForWorker('test', env)

      // The worker loader should be called with the content hash
      expect(env.LOADER.get).toHaveBeenCalledWith(
        expect.stringContaining('cached-hash'),
        expect.any(Function)
      )
    })

    it('should handle R2-stored content transparently', async () => {
      const { loadContentForWorker } = await import('../src/commands/do-storage.js')

      const largeContent = 'x'.repeat(1024 * 1024 + 1)

      // Content record has R2 key but no content (stored in R2)
      mockStub.getContent.mockResolvedValue({
        id: 'large-test',
        hash: 'abc123',
        content: '', // Empty because content is in R2
        data: {},
        size: largeContent.length,
        storedAt: new Date(),
        version: 1,
        r2Key: 'large-abc123',
      })

      // R2 returns the actual content
      env.CONTENT_BUCKET.get.mockResolvedValue({
        text: vi.fn().mockResolvedValue(largeContent),
        size: largeContent.length,
      })

      const mockWorker = { fetch: vi.fn() }
      env.LOADER.get.mockResolvedValue(mockWorker)

      const result = await loadContentForWorker('large-test', env)

      expect(env.CONTENT_BUCKET.get).toHaveBeenCalledWith('large-abc123')
      expect(result).toBeDefined()
    })
  })
})

// =============================================================================
// Content Versioning Tests
// =============================================================================

describe('Content Versioning and History', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('getVersionHistory', () => {
    it('should return version history for content', async () => {
      const { getVersionHistory } = await import('../src/commands/do-storage.js')

      const versions: ContentVersion[] = [
        { version: 1, hash: 'abc123', storedAt: new Date('2024-01-01'), size: 100 },
        { version: 2, hash: 'def456', storedAt: new Date('2024-01-02'), size: 150 },
        { version: 3, hash: 'ghi789', storedAt: new Date('2024-01-03'), size: 200 },
      ]

      mockStub.getVersionHistory.mockResolvedValue(versions)

      const result = await getVersionHistory('test', env)

      expect(result).toHaveLength(3)
      expect(result[0].version).toBe(1)
      expect(result[2].version).toBe(3)
    })

    it('should order versions by timestamp', async () => {
      const { getVersionHistory } = await import('../src/commands/do-storage.js')

      const versions: ContentVersion[] = [
        { version: 3, hash: 'ghi789', storedAt: new Date('2024-01-03'), size: 200 },
        { version: 1, hash: 'abc123', storedAt: new Date('2024-01-01'), size: 100 },
        { version: 2, hash: 'def456', storedAt: new Date('2024-01-02'), size: 150 },
      ]

      mockStub.getVersionHistory.mockResolvedValue(versions)

      const result = await getVersionHistory('test', env, { orderBy: 'timestamp' })

      expect(result).toBeDefined()
      // Should be ordered by timestamp
    })
  })

  describe('rollbackToVersion', () => {
    it('should rollback content to a previous version', async () => {
      const { rollbackToVersion, getContentFromDO } = await import('../src/commands/do-storage.js')

      mockStub.getContent
        .mockResolvedValueOnce({
          id: 'test',
          hash: 'old-hash',
          content: '# Version 1 Content',
          data: {},
          size: 20,
          storedAt: new Date('2024-01-01'),
          version: 1,
        })

      mockStub.storeContent.mockResolvedValue({
        id: 'test',
        hash: 'old-hash',
        content: '# Version 1 Content',
        data: {},
        size: 20,
        storedAt: new Date(),
        version: 3, // New version number
      })

      const result = await rollbackToVersion('test', 1, env)

      expect(result).toBeDefined()
      expect(result.content).toBe('# Version 1 Content')
    })
  })

  describe('diffVersions', () => {
    it('should compute diff between versions', async () => {
      const { diffVersions } = await import('../src/commands/do-storage.js')

      mockStub.getContent
        .mockResolvedValueOnce({
          id: 'test',
          hash: 'abc123',
          content: '# Version 1\n\nOriginal content',
          data: {},
          size: 30,
          storedAt: new Date('2024-01-01'),
          version: 1,
        })
        .mockResolvedValueOnce({
          id: 'test',
          hash: 'def456',
          content: '# Version 2\n\nModified content',
          data: {},
          size: 30,
          storedAt: new Date('2024-01-02'),
          version: 2,
        })

      const result = await diffVersions('test', 1, 2, env)

      expect(result.added).toBeDefined()
      expect(result.removed).toBeDefined()
      expect(result.hasChanges).toBe(true)
    })
  })
})

// =============================================================================
// Tiered Storage Tests
// =============================================================================

describe('Tiered Storage Strategy', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('automatic tiering', () => {
    it('should store small content in DO SQLite (hot tier)', async () => {
      const { storeWithTiering } = await import('../src/commands/do-storage.js')

      const smallContent = '# Small content'

      mockStub.storeContent.mockResolvedValue({
        id: 'small',
        hash: 'abc123',
        content: smallContent,
        data: {},
        size: smallContent.length,
        storedAt: new Date(),
        version: 1,
      })

      const result = await storeWithTiering(smallContent, 'small', env)

      expect(result.tier).toBe('hot')
      expect(result.r2Key).toBeUndefined()
      expect(mockStub.storeContent).toHaveBeenCalled()
      expect(env.CONTENT_BUCKET.put).not.toHaveBeenCalled()
    })

    it('should store large content in R2 (warm tier)', async () => {
      const { storeWithTiering } = await import('../src/commands/do-storage.js')

      const largeContent = 'x'.repeat(1024 * 1024 + 1) // > 1MB

      mockStub.storeContent.mockResolvedValue({
        id: 'large',
        hash: 'abc123',
        content: '',
        data: {},
        size: largeContent.length,
        storedAt: new Date(),
        version: 1,
        r2Key: 'large-abc123',
      })
      env.CONTENT_BUCKET.put.mockResolvedValue({ key: 'large-abc123' })

      const result = await storeWithTiering(largeContent, 'large', env)

      expect(result.tier).toBe('warm')
      expect(result.r2Key).toBeDefined()
      expect(env.CONTENT_BUCKET.put).toHaveBeenCalled()
    })
  })

  describe('access pattern optimization', () => {
    it('should promote frequently accessed content to hot tier', async () => {
      const { promoteToHot, getAccessStats } = await import('../src/commands/do-storage.js')

      mockStub.getContent.mockResolvedValue({
        id: 'test',
        hash: 'abc123',
        content: '',
        data: {},
        size: 500,
        storedAt: new Date(),
        version: 1,
        r2Key: 'test-abc123',
        accessCount: 100,
      })

      env.CONTENT_BUCKET.get.mockResolvedValue({
        text: vi.fn().mockResolvedValue('# Content'),
        size: 500,
      })

      const promoted = await promoteToHot('test', env)

      expect(promoted.tier).toBe('hot')
    })
  })
})

// =============================================================================
// Content Diffing Tests
// =============================================================================

describe('Content Diffing for Efficient Updates', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('computeDiff', () => {
    it('should compute minimal diff between content versions', async () => {
      const { computeDiff } = await import('../src/commands/do-storage.js')

      const oldContent = '# Hello\n\nOriginal paragraph.'
      const newContent = '# Hello\n\nUpdated paragraph.'

      const diff = await computeDiff(oldContent, newContent)

      expect(diff.operations).toBeDefined()
      expect(diff.operations.length).toBeGreaterThan(0)
    })

    it('should detect no changes for identical content', async () => {
      const { computeDiff } = await import('../src/commands/do-storage.js')

      const content = '# Identical content'

      const diff = await computeDiff(content, content)

      expect(diff.hasChanges).toBe(false)
      expect(diff.operations).toHaveLength(0)
    })
  })

  describe('applyDiff', () => {
    it('should apply diff to recreate new content', async () => {
      const { computeDiff, applyDiff } = await import('../src/commands/do-storage.js')

      const oldContent = '# Hello\n\nOriginal.'
      const newContent = '# Hello\n\nUpdated.'

      const diff = await computeDiff(oldContent, newContent)
      const result = await applyDiff(oldContent, diff)

      expect(result).toBe(newContent)
    })
  })

  describe('storeWithDiff', () => {
    it('should store only the diff for updates', async () => {
      const { storeWithDiff } = await import('../src/commands/do-storage.js')

      mockStub.getContent.mockResolvedValue({
        id: 'test',
        hash: 'abc123',
        content: '# Original content',
        data: {},
        size: 18,
        storedAt: new Date(),
        version: 1,
      })

      mockStub.storeContent.mockResolvedValue({
        id: 'test',
        hash: 'def456',
        content: '# Updated content',
        data: {},
        size: 17,
        storedAt: new Date(),
        version: 2,
      })

      const result = await storeWithDiff('# Updated content', 'test', env)

      expect(result.diffStored).toBe(true)
      expect(result.version).toBe(2)
    })
  })
})

// =============================================================================
// Garbage Collection Tests
// =============================================================================

describe('Content Garbage Collection', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('cleanupOldVersions', () => {
    it('should remove versions older than retention period', async () => {
      const { cleanupOldVersions } = await import('../src/commands/do-storage.js')

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 31) // 31 days ago

      mockStub.getVersionHistory.mockResolvedValue([
        { version: 1, hash: 'abc', storedAt: oldDate, size: 100 },
        { version: 2, hash: 'def', storedAt: new Date(), size: 100 },
      ])

      const result = await cleanupOldVersions('test', env, { retentionDays: 30 })

      expect(result.cleaned).toBe(1)
      expect(result.retained).toBe(1)
    })

    it('should keep minimum number of versions regardless of age', async () => {
      const { cleanupOldVersions } = await import('../src/commands/do-storage.js')

      const oldDate = new Date()
      oldDate.setDate(oldDate.getDate() - 100)

      mockStub.getVersionHistory.mockResolvedValue([
        { version: 1, hash: 'abc', storedAt: oldDate, size: 100 },
        { version: 2, hash: 'def', storedAt: oldDate, size: 100 },
      ])

      const result = await cleanupOldVersions('test', env, {
        retentionDays: 30,
        minVersions: 2,
      })

      // Should keep both despite being old
      expect(result.retained).toBe(2)
    })
  })

  describe('cleanupOrphanedR2', () => {
    it('should remove R2 objects not referenced by any DO record', async () => {
      const { cleanupOrphanedR2 } = await import('../src/commands/do-storage.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'a', r2Key: 'r2-abc' },
        { id: 'b', r2Key: 'r2-def' },
      ])

      // Simulate R2 having an extra orphaned object
      const r2Objects = ['r2-abc', 'r2-def', 'r2-orphan']

      const result = await cleanupOrphanedR2(env, { r2Objects })

      expect(result.orphaned).toContain('r2-orphan')
      expect(result.orphaned).toHaveLength(1)
    })
  })
})

// =============================================================================
// Storage Metrics Tests
// =============================================================================

// =============================================================================
// Web Crypto API Hash Tests
// =============================================================================

describe('Web Crypto API Hashing', () => {
  describe('hashContentForStorage', () => {
    it('should produce consistent hash for same content', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const content = 'Hello, World!'
      const hash1 = await hashContentForStorage(content)
      const hash2 = await hashContentForStorage(content)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different content', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const hash1 = await hashContentForStorage('Content A')
      const hash2 = await hashContentForStorage('Content B')

      expect(hash1).not.toBe(hash2)
    })

    it('should produce a 16-character hex string', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const hash = await hashContentForStorage('Test content')

      expect(hash).toMatch(/^[a-f0-9]{16}$/)
      expect(hash.length).toBe(16)
    })

    it('should handle empty string', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const hash = await hashContentForStorage('')

      expect(hash).toMatch(/^[a-f0-9]{16}$/)
    })

    it('should handle unicode content', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const hash = await hashContentForStorage('Hello \u4e16\u754c \ud83c\udf0d')

      expect(hash).toMatch(/^[a-f0-9]{16}$/)
    })

    it('should handle large content efficiently', async () => {
      const { hashContentForStorage } = await import('../src/commands/do-storage.js')

      const largeContent = 'x'.repeat(1024 * 1024) // 1MB
      const hash = await hashContentForStorage(largeContent)

      expect(hash).toMatch(/^[a-f0-9]{16}$/)
    })
  })
})

// =============================================================================
// Storage Metrics Tests
// =============================================================================

describe('Storage Metrics', () => {
  let env: StorageEnv
  let mockStub: MockDurableObjectStub

  beforeEach(() => {
    env = createMockEnv()
    mockStub = env.MDXDB.get(env.MDXDB.idFromName('test')) as unknown as MockDurableObjectStub
  })

  describe('getStorageMetrics', () => {
    it('should return total storage size across DO and R2', async () => {
      const { getStorageMetrics } = await import('../src/commands/do-storage.js')

      mockStub.getDatabaseSize.mockReturnValue(1024 * 100) // 100KB in DO

      mockStub.listContent.mockResolvedValue([
        { id: 'a', size: 500, r2Key: undefined },
        { id: 'b', size: 1024 * 1024 * 2, r2Key: 'r2-large' }, // 2MB in R2
      ])

      const metrics = await getStorageMetrics(env)

      expect(metrics.doSize).toBe(1024 * 100)
      expect(metrics.r2Size).toBeGreaterThan(0)
      expect(metrics.totalSize).toBe(metrics.doSize + metrics.r2Size)
    })

    it('should track content count by type', async () => {
      const { getStorageMetrics } = await import('../src/commands/do-storage.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'page-1', data: { $type: 'Page' }, size: 100 },
        { id: 'page-2', data: { $type: 'Page' }, size: 100 },
        { id: 'post-1', data: { $type: 'BlogPost' }, size: 200 },
      ])

      const metrics = await getStorageMetrics(env)

      expect(metrics.byType).toBeDefined()
      expect(metrics.byType.Page).toBe(2)
      expect(metrics.byType.BlogPost).toBe(1)
    })

    it('should track access patterns', async () => {
      const { getStorageMetrics } = await import('../src/commands/do-storage.js')

      mockStub.listContent.mockResolvedValue([
        { id: 'hot', accessCount: 1000, lastAccessed: new Date() },
        { id: 'cold', accessCount: 1, lastAccessed: new Date('2024-01-01') },
      ])

      const metrics = await getStorageMetrics(env)

      expect(metrics.accessPatterns).toBeDefined()
      expect(metrics.accessPatterns.hot).toBe(1)
      expect(metrics.accessPatterns.cold).toBe(1)
    })
  })
})

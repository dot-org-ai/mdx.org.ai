import { describe, it, expect, beforeEach } from 'vitest'
import { createMobileDB, MemoryStorageAdapter, parse, stringify } from './index'
import type { MobileDB } from './index'

describe('@mdxdb/mobile', () => {
  let db: MobileDB

  beforeEach(() => {
    db = createMobileDB({
      storage: new MemoryStorageAdapter(),
      basePath: 'docs',
    })
  })

  describe('createMobileDB', () => {
    it('should create a database instance', () => {
      expect(db).toBeDefined()
      expect(db.get).toBeDefined()
      expect(db.save).toBeDefined()
      expect(db.list).toBeDefined()
      expect(db.search).toBeDefined()
    })
  })

  describe('save and get', () => {
    it('should save and retrieve a document', async () => {
      const content = `---
title: Test Document
---

# Hello World`

      const saved = await db.save('test.mdx', content)
      expect(saved.path).toBe('docs/test.mdx')
      expect(saved.content).toBe(content)
      expect(saved.doc.data.title).toBe('Test Document')
      expect(saved.syncStatus).toBe('local')

      const retrieved = await db.get('test.mdx')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.content).toBe(content)
    })

    it('should return null for non-existent document', async () => {
      const doc = await db.get('nonexistent.mdx')
      expect(doc).toBeNull()
    })
  })

  describe('list', () => {
    it('should list all documents', async () => {
      await db.save('doc1.mdx', '# Doc 1')
      await db.save('doc2.mdx', '# Doc 2')
      await db.save('doc3.mdx', '# Doc 3')

      const docs = await db.list()
      expect(docs.length).toBe(3)
    })

    it('should filter by prefix', async () => {
      await db.save('posts/post1.mdx', '# Post 1')
      await db.save('posts/post2.mdx', '# Post 2')
      await db.save('pages/page1.mdx', '# Page 1')

      const posts = await db.list({ prefix: 'posts' })
      expect(posts.length).toBe(2)
    })

    it('should limit results', async () => {
      await db.save('doc1.mdx', '# Doc 1')
      await db.save('doc2.mdx', '# Doc 2')
      await db.save('doc3.mdx', '# Doc 3')

      const docs = await db.list({ limit: 2 })
      expect(docs.length).toBe(2)
    })
  })

  describe('search', () => {
    it('should search by content', async () => {
      await db.save('doc1.mdx', '# Hello World')
      await db.save('doc2.mdx', '# Goodbye World')
      await db.save('doc3.mdx', '# Hello Universe')

      const results = await db.search('Hello')
      expect(results.length).toBe(2)
    })

    it('should search by frontmatter', async () => {
      await db.save('doc1.mdx', `---
title: JavaScript Guide
---
# Content`)
      await db.save('doc2.mdx', `---
title: Python Guide
---
# Content`)

      const results = await db.search('JavaScript')
      expect(results.length).toBe(1)
      expect(results[0].doc.data.title).toBe('JavaScript Guide')
    })
  })

  describe('delete', () => {
    it('should delete a document', async () => {
      await db.save('test.mdx', '# Test')
      expect(await db.get('test.mdx')).not.toBeNull()

      await db.delete('test.mdx')
      expect(await db.get('test.mdx')).toBeNull()
    })
  })

  describe('parse and stringify', () => {
    it('should parse MDX content', () => {
      const content = `---
title: Test
---
# Hello`
      const doc = db.parse(content)
      expect(doc.data.title).toBe('Test')
      expect(doc.content).toContain('# Hello')
    })

    it('should stringify a document', () => {
      const doc = db.parse(`---
title: Test
---
# Hello`)
      const content = db.stringify(doc)
      expect(content).toContain('title: Test')
      expect(content).toContain('# Hello')
    })
  })

  describe('onChange', () => {
    it('should notify on document save', async () => {
      const changes: string[] = []
      const unsubscribe = db.onChange(doc => {
        changes.push(doc.path)
      })

      await db.save('doc1.mdx', '# Doc 1')
      await db.save('doc2.mdx', '# Doc 2')

      expect(changes).toEqual(['docs/doc1.mdx', 'docs/doc2.mdx'])

      unsubscribe()

      await db.save('doc3.mdx', '# Doc 3')
      expect(changes.length).toBe(2) // No more notifications
    })
  })
})

describe('MemoryStorageAdapter', () => {
  it('should implement StorageAdapter interface', async () => {
    const adapter = new MemoryStorageAdapter()

    await adapter.set('test', 'content')
    expect(await adapter.get('test')).toBe('content')
    expect(await adapter.exists('test')).toBe(true)
    expect(await adapter.list()).toContain('test')

    await adapter.delete('test')
    expect(await adapter.get('test')).toBeNull()
    expect(await adapter.exists('test')).toBe(false)
  })
})

describe('mdxld re-exports', () => {
  it('should export parse function', () => {
    expect(parse).toBeDefined()
    const doc = parse('# Hello')
    expect(doc.content).toContain('# Hello')
  })

  it('should export stringify function', () => {
    expect(stringify).toBeDefined()
    const doc = parse(`---
title: Test
---
Content`)
    const content = stringify(doc)
    expect(content).toContain('title')
  })
})

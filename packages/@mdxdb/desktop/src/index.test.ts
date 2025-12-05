import { describe, it, expect, beforeEach } from 'vitest'
import {
  createDesktopDB,
  MemoryDesktopDB,
  defaultConfig,
  parse,
  stringify,
} from './index'
import type { DesktopDB, WatcherEvent } from './index'

describe('@mdxdb/desktop', () => {
  let db: DesktopDB

  beforeEach(() => {
    db = createDesktopDB({
      baseDir: '/test/docs',
    })
  })

  describe('createDesktopDB', () => {
    it('should create a database instance', () => {
      expect(db).toBeDefined()
      expect(db.get).toBeDefined()
      expect(db.save).toBeDefined()
      expect(db.list).toBeDefined()
      expect(db.search).toBeDefined()
    })

    it('should apply default config', () => {
      expect(db.config.extensions).toEqual(defaultConfig.extensions)
      expect(db.config.maxFileSize).toBe(defaultConfig.maxFileSize)
    })
  })

  describe('save and get', () => {
    it('should save and retrieve a document', async () => {
      const content = `---
title: Test Document
---

# Hello World`

      const saved = await db.save('test.mdx', content)
      expect(saved.path).toBe('test.mdx')
      expect(saved.content).toBe(content)
      expect(saved.doc.data.title).toBe('Test Document')
      expect(saved.size).toBe(content.length)

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

    it('should sort by modifiedAt', async () => {
      await db.save('old.mdx', '# Old')
      await new Promise(r => setTimeout(r, 10))
      await db.save('new.mdx', '# New')

      const docs = await db.list({ sortBy: 'modifiedAt', sortDir: 'desc' })
      expect(docs[0].path).toBe('new.mdx')
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

    it('should search by frontmatter title', async () => {
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

    it('should be case insensitive by default', async () => {
      await db.save('doc1.mdx', '# HELLO WORLD')
      const results = await db.search('hello')
      expect(results.length).toBe(1)
    })

    it('should respect case sensitive option', async () => {
      await db.save('doc1.mdx', '# HELLO WORLD')
      const results = await db.search('hello', { caseSensitive: true })
      expect(results.length).toBe(0)
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

  describe('getRecent', () => {
    it('should return recent documents sorted by date', async () => {
      await db.save('old.mdx', '# Old')
      await new Promise(r => setTimeout(r, 10))
      await db.save('new.mdx', '# New')

      const recent = await db.getRecent(1)
      expect(recent.length).toBe(1)
      expect(recent[0].path).toBe('new.mdx')
    })
  })

  describe('watch', () => {
    it('should notify on document changes', async () => {
      const events: WatcherEvent[] = []
      const unwatch = db.watch(event => events.push(event))

      await db.save('test.mdx', '# Test')
      await db.save('test.mdx', '# Updated')
      await db.delete('test.mdx')

      expect(events.length).toBe(3)
      expect(events[0].type).toBe('create')
      expect(events[1].type).toBe('change')
      expect(events[2].type).toBe('delete')

      unwatch()
    })

    it('should allow unsubscribing', async () => {
      const events: WatcherEvent[] = []
      const unwatch = db.watch(event => events.push(event))

      await db.save('test1.mdx', '# Test 1')
      unwatch()
      await db.save('test2.mdx', '# Test 2')

      expect(events.length).toBe(1)
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
    })

    it('should stringify a document', () => {
      const doc = db.parse(`---
title: Test
---
# Hello`)
      const content = db.stringify(doc)
      expect(content).toContain('title')
    })
  })

  describe('close', () => {
    it('should cleanup resources', () => {
      const events: WatcherEvent[] = []
      db.watch(event => events.push(event))

      db.close()

      // After close, no more notifications
      // Memory implementation will have cleared watchers
    })
  })
})

describe('MemoryDesktopDB', () => {
  it('should implement DesktopDB interface', () => {
    const memDB = new MemoryDesktopDB({ baseDir: '/test' })
    expect(memDB.get).toBeDefined()
    expect(memDB.save).toBeDefined()
    expect(memDB.list).toBeDefined()
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
  })
})

describe('defaultConfig', () => {
  it('should have expected defaults', () => {
    expect(defaultConfig.extensions).toContain('.mdx')
    expect(defaultConfig.extensions).toContain('.md')
    expect(defaultConfig.maxFileSize).toBe(10 * 1024 * 1024)
    expect(defaultConfig.ignore).toContain('node_modules')
  })
})

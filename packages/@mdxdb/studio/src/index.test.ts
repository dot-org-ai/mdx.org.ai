import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { createStudio, defaultTemplate, parse, stringify } from './index'
import type { Studio } from './index'

describe('@mdxdb/studio', () => {
  let studio: Studio
  let tempDir: string

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdxdb-studio-test-'))
    studio = createStudio({ contentDir: tempDir })
  })

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  describe('createStudio', () => {
    it('should create a studio instance', () => {
      expect(studio).toBeDefined()
      expect(studio.config.contentDir).toBe(tempDir)
      expect(studio.getFiles).toBeDefined()
      expect(studio.readDocument).toBeDefined()
      expect(studio.saveDocument).toBeDefined()
    })
  })

  describe('getFiles', () => {
    it('should return empty array for empty directory', async () => {
      const files = await studio.getFiles()
      expect(files).toEqual([])
    })

    it('should list MDX files', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.mdx'), '# Test')
      fs.writeFileSync(path.join(tempDir, 'other.md'), '# Other')

      const files = await studio.getFiles()
      expect(files.length).toBe(2)
      expect(files.map(f => f.name)).toContain('test.mdx')
      expect(files.map(f => f.name)).toContain('other.md')
    })

    it('should list directories with children', async () => {
      fs.mkdirSync(path.join(tempDir, 'docs'))
      fs.writeFileSync(path.join(tempDir, 'docs', 'page.mdx'), '# Page')

      const files = await studio.getFiles()
      expect(files.length).toBe(1)
      expect(files[0].name).toBe('docs')
      expect(files[0].isDirectory).toBe(true)
      expect(files[0].children?.length).toBe(1)
      expect(files[0].children?.[0].name).toBe('page.mdx')
    })

    it('should ignore hidden files and node_modules', async () => {
      fs.writeFileSync(path.join(tempDir, '.hidden.mdx'), '# Hidden')
      fs.mkdirSync(path.join(tempDir, 'node_modules'))
      fs.writeFileSync(path.join(tempDir, 'node_modules', 'pkg.mdx'), '# Pkg')
      fs.writeFileSync(path.join(tempDir, 'visible.mdx'), '# Visible')

      const files = await studio.getFiles()
      expect(files.length).toBe(1)
      expect(files[0].name).toBe('visible.mdx')
    })
  })

  describe('createDocument', () => {
    it('should create a new document with default template', async () => {
      const doc = await studio.createDocument('new.mdx')

      expect(doc.path).toContain('new.mdx')
      expect(doc.content).toContain('title: new')
      expect(doc.isDirty).toBe(false)
      expect(fs.existsSync(path.join(tempDir, 'new.mdx'))).toBe(true)
    })

    it('should create a new document with custom template', async () => {
      const template = '---\ntitle: Custom\n---\n\n# Custom'
      const doc = await studio.createDocument('custom.mdx', template)

      expect(doc.content).toBe(template)
      expect(doc.doc.data.title).toBe('Custom')
    })

    it('should create parent directories', async () => {
      await studio.createDocument('nested/deep/file.mdx')
      expect(fs.existsSync(path.join(tempDir, 'nested', 'deep', 'file.mdx'))).toBe(true)
    })

    it('should throw if document exists', async () => {
      fs.writeFileSync(path.join(tempDir, 'exists.mdx'), '# Exists')
      await expect(studio.createDocument('exists.mdx')).rejects.toThrow('already exists')
    })
  })

  describe('readDocument', () => {
    it('should read an existing document', async () => {
      const content = '---\ntitle: Test\n---\n\n# Hello'
      fs.writeFileSync(path.join(tempDir, 'test.mdx'), content)

      const doc = await studio.readDocument('test.mdx')
      expect(doc.content).toBe(content)
      expect(doc.doc.data.title).toBe('Test')
      expect(doc.isDirty).toBe(false)
    })

    it('should throw for non-existent document', async () => {
      await expect(studio.readDocument('missing.mdx')).rejects.toThrow('not found')
    })
  })

  describe('saveDocument', () => {
    it('should save a document', async () => {
      fs.writeFileSync(path.join(tempDir, 'test.mdx'), '# Original')

      const newContent = '# Updated'
      await studio.saveDocument('test.mdx', newContent)

      const saved = fs.readFileSync(path.join(tempDir, 'test.mdx'), 'utf-8')
      expect(saved).toBe(newContent)
    })

    it('should create parent directories', async () => {
      await studio.saveDocument('new/path/doc.mdx', '# New')
      expect(fs.existsSync(path.join(tempDir, 'new', 'path', 'doc.mdx'))).toBe(true)
    })
  })

  describe('deleteDocument', () => {
    it('should delete a document', async () => {
      fs.writeFileSync(path.join(tempDir, 'delete-me.mdx'), '# Delete')
      expect(fs.existsSync(path.join(tempDir, 'delete-me.mdx'))).toBe(true)

      await studio.deleteDocument('delete-me.mdx')
      expect(fs.existsSync(path.join(tempDir, 'delete-me.mdx'))).toBe(false)
    })

    it('should not throw for non-existent document', async () => {
      await expect(studio.deleteDocument('missing.mdx')).resolves.not.toThrow()
    })
  })

  describe('watch', () => {
    it('should notify on document changes', async () => {
      const events: string[] = []
      const unwatch = studio.watch(event => {
        events.push(`${event.type}:${event.relativePath}`)
      })

      await studio.createDocument('watch-test.mdx')
      await studio.saveDocument('watch-test.mdx', '# Updated')
      await studio.deleteDocument('watch-test.mdx')

      // Give fs watcher time to settle
      await new Promise(r => setTimeout(r, 100))

      expect(events).toContain('create:watch-test.mdx')
      expect(events).toContain('change:watch-test.mdx')
      expect(events).toContain('delete:watch-test.mdx')

      unwatch()
    })
  })

  describe('parse and stringify', () => {
    it('should parse MDX content', () => {
      const content = '---\ntitle: Test\n---\n\n# Hello'
      const doc = studio.parse(content)
      expect(doc.data.title).toBe('Test')
      expect(doc.content).toContain('# Hello')
    })

    it('should stringify document', () => {
      const doc = studio.parse('---\ntitle: Test\n---\n\n# Hello')
      const content = studio.stringify(doc)
      expect(content).toContain('title')
      expect(content).toContain('# Hello')
    })
  })

  describe('defaultTemplate', () => {
    it('should be a valid template', () => {
      expect(defaultTemplate).toContain('title:')
      expect(defaultTemplate).toContain('#')
    })
  })
})

describe('mdxld re-exports', () => {
  it('should export parse', () => {
    expect(parse).toBeDefined()
    const doc = parse('# Hello')
    expect(doc.content).toContain('# Hello')
  })

  it('should export stringify', () => {
    expect(stringify).toBeDefined()
  })
})

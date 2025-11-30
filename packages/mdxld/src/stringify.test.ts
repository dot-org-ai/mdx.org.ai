import { describe, it, expect } from 'vitest'
import { stringify } from './stringify.js'
import { parse } from './parse.js'

describe('stringify', () => {
  describe('basic stringification', () => {
    it('should stringify content without data', () => {
      const doc = {
        data: {},
        content: '# Hello World',
      }

      const result = stringify(doc)
      expect(result).toBe('# Hello World')
    })

    it('should stringify content with simple data', () => {
      const doc = {
        data: { title: 'Hello', author: 'Test' },
        content: '# Hello World',
      }

      const result = stringify(doc)
      expect(result).toContain('---')
      expect(result).toContain('title: Hello')
      expect(result).toContain('author: Test')
      expect(result).toContain('# Hello World')
    })
  })

  describe('expanded mode (default)', () => {
    it('should include $id from root in frontmatter', () => {
      const doc = {
        id: 'https://example.com/doc',
        data: { title: 'Test' },
        content: 'Content',
      }

      const result = stringify(doc)
      expect(result).toMatch(/\$id:.*https:\/\/example\.com\/doc/)
      expect(result).toContain('title: Test')
    })

    it('should include $type from root in frontmatter', () => {
      const doc = {
        type: 'Article',
        data: { title: 'Test' },
        content: 'Content',
      }

      const result = stringify(doc)
      expect(result).toContain('$type: Article')
    })

    it('should include $context from root in frontmatter', () => {
      const doc = {
        context: 'https://schema.org',
        data: { title: 'Test' },
        content: 'Content',
      }

      const result = stringify(doc)
      expect(result).toMatch(/\$context:.*https:\/\/schema\.org/)
    })

    it('should include all LD properties in frontmatter', () => {
      const doc = {
        id: 'https://example.com/doc',
        type: 'Article',
        context: 'https://schema.org',
        data: { title: 'Hello' },
        content: '# Hello',
      }

      const result = stringify(doc)
      expect(result).toMatch(/\$id:.*https:\/\/example\.com\/doc/)
      expect(result).toContain('$type: Article')
      expect(result).toMatch(/\$context:.*https:\/\/schema\.org/)
      expect(result).toContain('title: Hello')
    })
  })

  describe('flat mode', () => {
    it('should output data as-is in flat mode', () => {
      const doc = {
        id: 'https://example.com/doc',
        data: {
          $id: 'data-id',
          title: 'Test',
        },
        content: 'Content',
      }

      const result = stringify(doc, { mode: 'flat' })
      // In flat mode, root id is ignored, only data is output
      expect(result).toContain('$id: data-id')
      expect(result).toContain('title: Test')
      expect(result).not.toContain('https://example.com/doc')
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip basic document', () => {
      const original = `---
title: Hello World
author: Test Author
---

# Hello World

This is content.`

      const doc = parse(original)
      const result = stringify(doc)
      const reparsed = parse(result)

      expect(reparsed.data).toEqual(doc.data)
      expect(reparsed.content.trim()).toBe(doc.content.trim())
    })

    it('should roundtrip document with LD properties', () => {
      const original = `---
$id: https://example.com/doc
$type: Article
$context: https://schema.org
title: Hello
---

Content here`

      const doc = parse(original)
      const result = stringify(doc)
      const reparsed = parse(result)

      expect(reparsed.id).toBe(doc.id)
      expect(reparsed.type).toBe(doc.type)
      expect(reparsed.context).toBe(doc.context)
      expect(reparsed.data).toEqual(doc.data)
    })
  })

  describe('YAML value formatting', () => {
    it('should quote strings with special characters', () => {
      const doc = {
        data: {
          special: 'value: with colon',
          hash: 'has # hash',
        },
        content: '',
      }

      const result = stringify(doc)
      expect(result).toMatch(/special: '.*:.*'/)
      expect(result).toMatch(/hash: '.*#.*'/)
    })

    it('should format arrays inline when short', () => {
      const doc = {
        data: { tags: ['a', 'b', 'c'] },
        content: '',
      }

      const result = stringify(doc)
      expect(result).toContain('[a, b, c]')
    })

    it('should format booleans correctly', () => {
      const doc = {
        data: { published: true, draft: false },
        content: '',
      }

      const result = stringify(doc)
      expect(result).toContain('published: true')
      expect(result).toContain('draft: false')
    })

    it('should format null correctly', () => {
      const doc = {
        data: { empty: null },
        content: '',
      }

      const result = stringify(doc)
      expect(result).toContain('empty: null')
    })
  })
})

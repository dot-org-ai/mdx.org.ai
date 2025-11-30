import { describe, it, expect } from 'vitest'
import { parse } from './parse.js'

describe('parse', () => {
  describe('basic parsing', () => {
    it('should parse content without frontmatter', () => {
      const content = '# Hello World\n\nThis is content.'
      const doc = parse(content)

      expect(doc.data).toEqual({})
      expect(doc.content).toBe('# Hello World\n\nThis is content.')
    })

    it('should parse content with frontmatter', () => {
      const content = `---
title: Hello
author: Test
---

# Hello World`

      const doc = parse(content)

      expect(doc.data).toEqual({ title: 'Hello', author: 'Test' })
      expect(doc.content).toBe('\n# Hello World')
    })

    it('should handle empty frontmatter', () => {
      const content = `---
---

Content here`

      const doc = parse(content)
      expect(doc.data).toEqual({})
      expect(doc.content).toBe('\nContent here')
    })
  })

  describe('expanded mode (default)', () => {
    it('should extract $id to root level', () => {
      const content = `---
$id: https://example.com/doc
title: Test
---

Content`

      const doc = parse(content)

      expect(doc.id).toBe('https://example.com/doc')
      expect(doc.data).toEqual({ title: 'Test' })
      expect(doc.data.$id).toBeUndefined()
    })

    it('should extract $type to root level', () => {
      const content = `---
$type: Article
title: Test
---

Content`

      const doc = parse(content)

      expect(doc.type).toBe('Article')
      expect(doc.data).toEqual({ title: 'Test' })
    })

    it('should extract $context to root level', () => {
      const content = `---
$context: https://schema.org
title: Test
---

Content`

      const doc = parse(content)

      expect(doc.context).toBe('https://schema.org')
      expect(doc.data).toEqual({ title: 'Test' })
    })

    it('should extract all LD properties together', () => {
      const content = `---
$id: https://example.com/doc
$type: Article
$context: https://schema.org
title: Hello World
author: John Doe
---

# Hello World`

      const doc = parse(content)

      expect(doc.id).toBe('https://example.com/doc')
      expect(doc.type).toBe('Article')
      expect(doc.context).toBe('https://schema.org')
      expect(doc.data).toEqual({
        title: 'Hello World',
        author: 'John Doe',
      })
    })

    it('should handle array $type', () => {
      const content = `---
$type: [Article, BlogPost]
title: Test
---

Content`

      const doc = parse(content)

      expect(doc.type).toEqual(['Article', 'BlogPost'])
    })
  })

  describe('flat mode', () => {
    it('should keep $id in data object', () => {
      const content = `---
$id: https://example.com/doc
title: Test
---

Content`

      const doc = parse(content, { mode: 'flat' })

      expect(doc.id).toBeUndefined()
      expect(doc.data.$id).toBe('https://example.com/doc')
      expect(doc.data.title).toBe('Test')
    })

    it('should keep all LD properties in data', () => {
      const content = `---
$id: https://example.com/doc
$type: Article
$context: https://schema.org
title: Test
---

Content`

      const doc = parse(content, { mode: 'flat' })

      expect(doc.id).toBeUndefined()
      expect(doc.type).toBeUndefined()
      expect(doc.context).toBeUndefined()
      expect(doc.data).toEqual({
        $id: 'https://example.com/doc',
        $type: 'Article',
        $context: 'https://schema.org',
        title: 'Test',
      })
    })
  })

  describe('YAML parsing', () => {
    it('should parse strings', () => {
      const content = `---
title: Hello World
---
`
      const doc = parse(content)
      expect(doc.data.title).toBe('Hello World')
    })

    it('should parse quoted strings', () => {
      const content = `---
title: "Hello: World"
single: 'true'
---
`
      const doc = parse(content)
      expect(doc.data.title).toBe('Hello: World')
      expect(doc.data.single).toBe('true')
    })

    it('should parse numbers', () => {
      const content = `---
count: 42
price: 19.99
---
`
      const doc = parse(content)
      expect(doc.data.count).toBe(42)
      expect(doc.data.price).toBe(19.99)
    })

    it('should parse booleans', () => {
      const content = `---
published: true
draft: false
---
`
      const doc = parse(content)
      expect(doc.data.published).toBe(true)
      expect(doc.data.draft).toBe(false)
    })

    it('should parse null values', () => {
      const content = `---
value: null
empty: ~
---
`
      const doc = parse(content)
      expect(doc.data.value).toBeNull()
      expect(doc.data.empty).toBeNull()
    })

    it('should parse inline arrays', () => {
      const content = `---
tags: [one, two, three]
numbers: [1, 2, 3]
---
`
      const doc = parse(content)
      expect(doc.data.tags).toEqual(['one', 'two', 'three'])
      expect(doc.data.numbers).toEqual([1, 2, 3])
    })

    it('should parse multiline arrays', () => {
      const content = `---
tags:
  - one
  - two
  - three
---
`
      const doc = parse(content)
      expect(doc.data.tags).toEqual(['one', 'two', 'three'])
    })

    it('should parse nested objects', () => {
      const content = `---
author:
  name: John
  email: john@example.com
---
`
      const doc = parse(content)
      expect(doc.data.author).toEqual({
        name: 'John',
        email: 'john@example.com',
      })
    })
  })
})

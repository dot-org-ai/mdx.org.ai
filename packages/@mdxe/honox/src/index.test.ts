import { describe, it, expect, vi } from 'vitest'
import { parse } from 'mdxld'
import { createJsonLd, loadMdxldModules, createContentIndex } from './server.js'
import { getDefaultRemarkPlugins } from './vite.js'

describe('@mdxe/honox', () => {
  describe('createJsonLd', () => {
    it('should create JSON-LD from MDXLD document', () => {
      const doc = parse(`---
$type: BlogPost
$id: /posts/hello
title: Hello World
author: John Doe
---

# Hello World

This is content.
`)

      const jsonld = createJsonLd(doc, 'https://example.com')

      expect(jsonld['@context']).toBe('https://schema.org')
      expect(jsonld['@type']).toBe('BlogPost')
      expect(jsonld['@id']).toBe('https://example.com/posts/hello')
      expect(jsonld['title']).toBe('Hello World')
      expect(jsonld['author']).toBe('John Doe')
    })

    it('should use document context if provided', () => {
      const doc = parse(`---
$context: https://custom.org/context
$type: Article
title: Test
---
Content
`)

      const jsonld = createJsonLd(doc)

      expect(jsonld['@context']).toBe('https://custom.org/context')
      expect(jsonld['@type']).toBe('Article')
    })

    it('should handle absolute URLs for @id', () => {
      const doc = parse(`---
$id: https://other.com/resource
title: Test
---
Content
`)

      const jsonld = createJsonLd(doc, 'https://example.com')

      expect(jsonld['@id']).toBe('https://other.com/resource')
    })

    it('should skip internal properties', () => {
      const doc = parse(`---
title: Test
_internal: should be skipped
---
Content
`)

      const jsonld = createJsonLd(doc)

      expect(jsonld['title']).toBe('Test')
      expect(jsonld['_internal']).toBeUndefined()
    })
  })

  describe('loadMdxldModules', () => {
    it('should parse modules into documents', () => {
      const modules = {
        './posts/hello.mdx': `---
title: Hello
---
Content`,
        './posts/world.mdx': `---
title: World
---
More content`,
      }

      const docs = loadMdxldModules(modules)

      expect(docs).toHaveLength(2)
      expect(docs[0].path).toBe('/posts/hello')
      expect(docs[0].document.data.title).toBe('Hello')
      expect(docs[1].path).toBe('/posts/world')
      expect(docs[1].document.data.title).toBe('World')
    })
  })

  describe('createContentIndex', () => {
    it('should create sorted index from documents', () => {
      const documents = [
        {
          path: '/posts/b',
          document: parse(`---
title: B Post
date: 2024-01-02
---
Content B`),
        },
        {
          path: '/posts/a',
          document: parse(`---
title: A Post
date: 2024-01-01
---
Content A`),
        },
        {
          path: '/posts/c',
          document: parse(`---
title: C Post
date: 2024-01-03
---
Content C`),
        },
      ]

      const index = createContentIndex(documents, {
        sortBy: 'title',
        sortOrder: 'asc',
      })

      expect(index[0].title).toBe('A Post')
      expect(index[1].title).toBe('B Post')
      expect(index[2].title).toBe('C Post')
    })

    it('should filter documents', () => {
      const documents = [
        {
          path: '/posts/draft',
          document: parse(`---
title: Draft Post
draft: true
---
Content`),
        },
        {
          path: '/posts/published',
          document: parse(`---
title: Published Post
---
Content`),
        },
      ]

      const index = createContentIndex(documents, {
        filter: (doc) => !doc.data.draft,
      })

      expect(index).toHaveLength(1)
      expect(index[0].title).toBe('Published Post')
    })

    it('should support custom sort function', () => {
      const documents = [
        {
          path: '/posts/a',
          document: parse(`---
title: Short
---
Content`),
        },
        {
          path: '/posts/b',
          document: parse(`---
title: A Very Long Title
---
Content`),
        },
      ]

      const index = createContentIndex(documents, {
        sortBy: (doc) => (doc.data.title as string)?.length || 0,
        sortOrder: 'desc',
      })

      expect(index[0].title).toBe('A Very Long Title')
      expect(index[1].title).toBe('Short')
    })
  })

  describe('getDefaultRemarkPlugins', () => {
    it('should return array of remark plugins', () => {
      const plugins = getDefaultRemarkPlugins()

      expect(Array.isArray(plugins)).toBe(true)
      expect(plugins.length).toBeGreaterThanOrEqual(2)
    })

    it('should include MDXLD plugin when jsonld enabled', () => {
      const plugins = getDefaultRemarkPlugins({ jsonld: true })
      expect(plugins.length).toBe(3)
    })

    it('should exclude MDXLD plugin when jsonld disabled', () => {
      const plugins = getDefaultRemarkPlugins({ jsonld: false })
      expect(plugins.length).toBe(2)
    })
  })
})

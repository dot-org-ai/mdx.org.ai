/**
 * Tests for @mdxe/payload generate module
 */

import { describe, it, expect } from 'vitest'
import { parseTypeFromMDX, processContentDirectory } from './generate.js'

describe('@mdxe/payload generate', () => {
  describe('parseTypeFromMDX', () => {
    it('should parse type from frontmatter $type', () => {
      const mdx = `---
$type: BlogPost
title: Hello World
---

Content here
`
      const type = parseTypeFromMDX(mdx)

      expect(type).not.toBeNull()
      expect(type!.name).toBe('BlogPost')
      expect(type!.slug).toBe('blog-post')
    })

    it('should parse schema.org types', () => {
      const mdx = `---
$type: https://schema.org/Article
title: My Article
---

Content
`
      const type = parseTypeFromMDX(mdx)

      expect(type).not.toBeNull()
      expect(type!.name).toBe('Article')
    })

    it('should infer fields from data', () => {
      const mdx = `---
$type: Product
title: Widget
price: 99.99
inStock: true
publishedAt: 2024-01-15
---

Description
`
      const type = parseTypeFromMDX(mdx)

      expect(type).not.toBeNull()

      const fieldNames = type!.fields.map(f => f.name)
      expect(fieldNames).toContain('title')
      expect(fieldNames).toContain('price')
      expect(fieldNames).toContain('inStock')
      expect(fieldNames).toContain('publishedAt')

      // Check inferred types
      const titleField = type!.fields.find(f => f.name === 'title')
      const priceField = type!.fields.find(f => f.name === 'price')
      const inStockField = type!.fields.find(f => f.name === 'inStock')
      const dateField = type!.fields.find(f => f.name === 'publishedAt')

      expect(titleField!.type).toBe('text')
      expect(priceField!.type).toBe('number')
      expect(inStockField!.type).toBe('checkbox')
      expect(dateField!.type).toBe('date')
    })

    it('should detect relationship fields', () => {
      const mdx = `---
$type: Post
title: Hello
author: user-123
tags:
  - hello
  - world
---

Content
`
      const type = parseTypeFromMDX(mdx)

      expect(type).not.toBeNull()
      expect(type!.relationships).toBeDefined()

      const authorRel = type!.relationships!.find(r => r.name === 'author')
      expect(authorRel).toBeDefined()
      expect(authorRel!.type).toBe('hasOne')
    })

    it('should return null for content without type', () => {
      const mdx = `---
title: No Type
---

Content
`
      const type = parseTypeFromMDX(mdx)
      expect(type).toBeNull()
    })

    it('should mark common fields as required', () => {
      const mdx = `---
$type: Page
title: Home
slug: home
email: test@example.com
---

Content
`
      const type = parseTypeFromMDX(mdx)

      const titleField = type!.fields.find(f => f.name === 'title')
      const slugField = type!.fields.find(f => f.name === 'slug')
      const emailField = type!.fields.find(f => f.name === 'email')

      expect(titleField!.required).toBe(true)
      expect(slugField!.required).toBe(true)
      expect(emailField!.required).toBe(true)
    })

    it('should mark slug and email as unique', () => {
      const mdx = `---
$type: User
name: John
slug: john
email: john@example.com
sku: ABC123
---

Bio
`
      const type = parseTypeFromMDX(mdx)

      const slugField = type!.fields.find(f => f.name === 'slug')
      const emailField = type!.fields.find(f => f.name === 'email')
      const skuField = type!.fields.find(f => f.name === 'sku')

      expect(slugField!.unique).toBe(true)
      expect(emailField!.unique).toBe(true)
      expect(skuField!.unique).toBe(true)
    })

    it('should detect long text as textarea', () => {
      const mdx = `---
$type: Article
title: Test
description: ${`This is a very long description that should be detected as textarea because it exceeds the character limit for regular text fields. `.repeat(3)}
---

Content
`
      const type = parseTypeFromMDX(mdx)

      const descField = type!.fields.find(f => f.name === 'description')
      expect(descField!.type).toBe('textarea')
    })

    it('should detect arrays as json type', () => {
      const mdx = `---
$type: Post
title: Test
tags:
  - hello
  - world
metadata:
  key: value
---

Content
`
      const type = parseTypeFromMDX(mdx)

      const tagsField = type!.fields.find(f => f.name === 'tags')
      const metaField = type!.fields.find(f => f.name === 'metadata')

      expect(tagsField!.type).toBe('json')
      expect(metaField!.type).toBe('json')
    })
  })

  describe('processContentDirectory', () => {
    it('should process multiple MDX files', async () => {
      const files = [
        {
          path: '/content/posts/hello.mdx',
          content: `---
$type: Post
title: Hello
---
Content`,
        },
        {
          path: '/content/posts/world.mdx',
          content: `---
$type: Post
title: World
---
Content`,
        },
        {
          path: '/content/pages/about.mdx',
          content: `---
$type: Page
title: About
---
Content`,
        },
      ]

      const result = await processContentDirectory(files)

      expect(result.types).toHaveLength(2) // Post and Page (deduplicated)
      expect(result.collections).toHaveLength(2)
      expect(result.errors).toHaveLength(0)

      const typeNames = result.types.map(t => t.name)
      expect(typeNames).toContain('Post')
      expect(typeNames).toContain('Page')
    })

    it('should deduplicate types', async () => {
      const files = [
        {
          path: '/a.mdx',
          content: `---
$type: Post
title: A
---`,
        },
        {
          path: '/b.mdx',
          content: `---
$type: Post
title: B
---`,
        },
        {
          path: '/c.mdx',
          content: `---
$type: Post
title: C
---`,
        },
      ]

      const result = await processContentDirectory(files)

      expect(result.types).toHaveLength(1)
      expect(result.types[0]!.name).toBe('Post')
    })

    it('should handle files without types', async () => {
      const files = [
        {
          path: '/readme.md',
          content: `# Just a readme`,
        },
        {
          path: '/post.mdx',
          content: `---
$type: Post
title: Hello
---`,
        },
      ]

      const result = await processContentDirectory(files)

      expect(result.types).toHaveLength(1)
      expect(result.errors).toHaveLength(0) // No errors, just skipped
    })
  })

  describe('slug generation', () => {
    it('should convert PascalCase to kebab-case', () => {
      const testCases = [
        { input: 'BlogPost', expected: 'blog-post' },
        { input: 'ProductCategory', expected: 'product-category' },
        { input: 'FAQItem', expected: 'f-a-q-item' }, // Edge case
        { input: 'User', expected: 'user' },
      ]

      for (const { input, expected } of testCases) {
        const mdx = `---
$type: ${input}
title: Test
---`
        const type = parseTypeFromMDX(mdx)
        expect(type!.slug).toBe(expected)
      }
    })
  })
})

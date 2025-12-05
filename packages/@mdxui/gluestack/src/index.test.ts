import { describe, it, expect } from 'vitest'
import { parse, toAst } from 'mdxld'

// Note: Component tests require React Native runtime
// These tests verify the core parsing and AST functionality

describe('@mdxui/gluestack', () => {
  describe('parse (from mdxld)', () => {
    it('should parse MDX content with frontmatter', () => {
      const content = `---
title: Hello World
author: Test
---

# Welcome

This is a paragraph.`

      const doc = parse(content)

      expect(doc.data.title).toBe('Hello World')
      expect(doc.data.author).toBe('Test')
      expect(doc.content).toContain('# Welcome')
    })

    it('should handle content without frontmatter', () => {
      const doc = parse('# Just a heading')

      expect(doc.data).toEqual({})
      expect(doc.content).toContain('# Just a heading')
    })

    it('should parse complex frontmatter', () => {
      const content = `---
title: Complex
tags:
  - react
  - native
nested:
  key: value
---

Content`

      const doc = parse(content)

      expect(doc.data.title).toBe('Complex')
      expect(doc.data.tags).toEqual(['react', 'native'])
      expect(doc.data.nested).toEqual({ key: 'value' })
    })
  })

  describe('toAst (from mdxld)', () => {
    it('should convert document to AST', () => {
      const doc = parse(`# Heading

Paragraph text.`)

      const ast = toAst(doc)

      expect(ast.type).toBe('root')
      expect(ast.children).toBeDefined()
      expect(ast.children.length).toBeGreaterThan(0)
    })

    it('should parse inline formatting', () => {
      const doc = parse('This has **bold** and *italic* and `code`.')

      const ast = toAst(doc)
      const paragraph = ast.children.find((n) => n.type === 'paragraph')
      const children = paragraph?.children || []

      const hasStrong = children.some((c) => c.type === 'strong')
      const hasEmphasis = children.some((c) => c.type === 'emphasis')
      const hasCode = children.some((c) => c.type === 'inlineCode')

      expect(hasStrong).toBe(true)
      expect(hasEmphasis).toBe(true)
      expect(hasCode).toBe(true)
    })

    it('should parse links', () => {
      const doc = parse('[Click here](https://example.com)')

      const ast = toAst(doc)
      const paragraph = ast.children.find((n) => n.type === 'paragraph')
      const link = paragraph?.children?.find((c) => c.type === 'link')

      expect(link).toBeDefined()
      expect(link?.url).toBe('https://example.com')
    })

    it('should parse images', () => {
      const doc = parse('![Alt text](https://example.com/image.png)')

      const ast = toAst(doc)
      const paragraph = ast.children.find((n) => n.type === 'paragraph')
      const image = paragraph?.children?.find((c) => c.type === 'image')

      expect(image).toBeDefined()
      expect(image?.url).toBe('https://example.com/image.png')
      expect(image?.alt).toBe('Alt text')
    })

    it('should parse blockquotes', () => {
      const doc = parse('> This is a quote')

      const ast = toAst(doc)
      const blockquote = ast.children.find((n) => n.type === 'blockquote')

      expect(blockquote).toBeDefined()
    })

    it('should parse thematic breaks', () => {
      const doc = parse('---')

      const ast = toAst(doc)
      const hr = ast.children.find((n) => n.type === 'thematicBreak')

      expect(hr).toBeDefined()
    })
  })
})

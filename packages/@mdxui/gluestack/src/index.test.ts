import { describe, it, expect } from 'vitest'
import { parse, toAst, defaultComponents } from './index.js'

describe('@mdxui/gluestack', () => {
  describe('parse', () => {
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

  describe('toAst', () => {
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

  describe('defaultComponents', () => {
    it('should have all required heading components', () => {
      expect(defaultComponents.h1).toBeDefined()
      expect(defaultComponents.h2).toBeDefined()
      expect(defaultComponents.h3).toBeDefined()
      expect(defaultComponents.h4).toBeDefined()
      expect(defaultComponents.h5).toBeDefined()
      expect(defaultComponents.h6).toBeDefined()
    })

    it('should have text formatting components', () => {
      expect(defaultComponents.p).toBeDefined()
      expect(defaultComponents.strong).toBeDefined()
      expect(defaultComponents.em).toBeDefined()
      expect(defaultComponents.code).toBeDefined()
      expect(defaultComponents.pre).toBeDefined()
    })

    it('should have list components', () => {
      expect(defaultComponents.ul).toBeDefined()
      expect(defaultComponents.ol).toBeDefined()
      expect(defaultComponents.li).toBeDefined()
    })

    it('should have other content components', () => {
      expect(defaultComponents.a).toBeDefined()
      expect(defaultComponents.img).toBeDefined()
      expect(defaultComponents.blockquote).toBeDefined()
      expect(defaultComponents.hr).toBeDefined()
    })

    it('components should be callable', () => {
      // Verify all components are functions
      for (const [key, component] of Object.entries(defaultComponents)) {
        expect(typeof component).toBe('function')
      }
    })
  })
})

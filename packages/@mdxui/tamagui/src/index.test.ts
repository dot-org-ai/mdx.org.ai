import { describe, it, expect } from 'vitest'
import { parse, toAst } from 'mdxld'

// Note: Component tests require React Native runtime
// These tests verify the core parsing and AST functionality

describe('@mdxui/tamagui', () => {
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

    it('should parse headings correctly', () => {
      const doc = parse(`# H1
## H2
### H3`)

      const ast = toAst(doc)
      const headings = ast.children.filter((n) => n.type === 'heading')

      expect(headings.length).toBe(3)
      expect(headings[0].depth).toBe(1)
      expect(headings[1].depth).toBe(2)
      expect(headings[2].depth).toBe(3)
    })

    it('should parse code blocks', () => {
      const doc = parse('```typescript\nconst x = 1;\n```')

      const ast = toAst(doc)
      const codeBlock = ast.children.find((n) => n.type === 'code')

      expect(codeBlock).toBeDefined()
      expect(codeBlock?.lang).toBe('typescript')
      expect(codeBlock?.value).toContain('const x = 1')
    })

    it('should parse lists', () => {
      const doc = parse(`- Item 1
- Item 2
- Item 3`)

      const ast = toAst(doc)
      const list = ast.children.find((n) => n.type === 'list')

      expect(list).toBeDefined()
      expect(list?.ordered).toBe(false)
      expect(list?.children?.length).toBe(3)
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

    it('should parse blockquotes', () => {
      const doc = parse('> This is a quote')

      const ast = toAst(doc)
      const blockquote = ast.children.find((n) => n.type === 'blockquote')

      expect(blockquote).toBeDefined()
    })
  })
})

import { describe, it, expect } from 'vitest'
import { parse, toAst, defaultComponents } from './index.js'

describe('@mdxui/tamagui', () => {
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
  })
})

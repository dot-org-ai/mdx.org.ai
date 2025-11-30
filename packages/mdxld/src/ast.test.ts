import { describe, it, expect } from 'vitest'
import { toAst, fromAst, parseWithAst, stringifyAst } from './ast.js'
import { parse } from './parse.js'

describe('ast', () => {
  describe('toAst', () => {
    it('should convert document to AST', () => {
      const doc = parse(`---
title: Hello
---

# Hello World`)

      const ast = toAst(doc)

      expect(ast.type).toBe('root')
      expect(ast.children.length).toBeGreaterThan(0)
    })

    it('should include yaml node when there is frontmatter', () => {
      const doc = parse(`---
title: Test
---

Content`)

      const ast = toAst(doc)
      const yamlNode = ast.children.find((n) => n.type === 'yaml')

      expect(yamlNode).toBeDefined()
      expect(yamlNode?.value).toContain('title')
    })

    it('should parse headings', () => {
      const doc = {
        data: {},
        content: '# Heading 1\n\n## Heading 2\n\n### Heading 3',
      }

      const ast = toAst(doc)
      const headings = ast.children.filter((n) => n.type === 'heading')

      expect(headings.length).toBe(3)
      expect(headings[0]?.depth).toBe(1)
      expect(headings[1]?.depth).toBe(2)
      expect(headings[2]?.depth).toBe(3)
    })

    it('should parse code blocks', () => {
      const doc = {
        data: {},
        content: '```javascript\nconst x = 1;\n```',
      }

      const ast = toAst(doc)
      const codeNode = ast.children.find((n) => n.type === 'code')

      expect(codeNode).toBeDefined()
      expect(codeNode?.lang).toBe('javascript')
      expect(codeNode?.value).toBe('const x = 1;')
    })

    it('should parse lists', () => {
      const doc = {
        data: {},
        content: '- Item 1\n- Item 2\n- Item 3',
      }

      const ast = toAst(doc)
      const listNode = ast.children.find((n) => n.type === 'list')

      expect(listNode).toBeDefined()
      expect(listNode?.ordered).toBe(false)
      expect(listNode?.children?.length).toBe(3)
    })

    it('should parse ordered lists', () => {
      const doc = {
        data: {},
        content: '1. First\n2. Second\n3. Third',
      }

      const ast = toAst(doc)
      const listNode = ast.children.find((n) => n.type === 'list')

      expect(listNode).toBeDefined()
      expect(listNode?.ordered).toBe(true)
    })

    it('should parse blockquotes', () => {
      const doc = {
        data: {},
        content: '> This is a quote\n> With multiple lines',
      }

      const ast = toAst(doc)
      const quoteNode = ast.children.find((n) => n.type === 'blockquote')

      expect(quoteNode).toBeDefined()
    })

    it('should parse inline formatting', () => {
      const doc = {
        data: {},
        content: 'This has **bold** and *italic* and `code`.',
      }

      const ast = toAst(doc)
      const para = ast.children.find((n) => n.type === 'paragraph')

      expect(para).toBeDefined()
      const children = para?.children || []
      const types = children.map((c) => c.type)

      expect(types).toContain('strong')
      expect(types).toContain('emphasis')
      expect(types).toContain('inlineCode')
    })

    it('should parse links', () => {
      const doc = {
        data: {},
        content: 'Check [this link](https://example.com).',
      }

      const ast = toAst(doc)
      const para = ast.children.find((n) => n.type === 'paragraph')
      const link = para?.children?.find((c) => c.type === 'link')

      expect(link).toBeDefined()
      expect(link?.url).toBe('https://example.com')
    })
  })

  describe('fromAst', () => {
    it('should convert AST back to document', () => {
      const original = parse(`---
title: Test
---

# Hello World`)

      const ast = toAst(original)
      const doc = fromAst(ast)

      expect(doc.data.title).toBe('Test')
      expect(doc.content).toContain('Hello World')
    })

    it('should handle AST without yaml node', () => {
      const ast = {
        type: 'root' as const,
        children: [
          {
            type: 'heading' as const,
            depth: 1,
            children: [{ type: 'text' as const, value: 'Hello' }],
          },
        ],
      }

      const doc = fromAst(ast)

      expect(doc.data).toEqual({})
      expect(doc.content).toContain('Hello')
    })
  })

  describe('parseWithAst', () => {
    it('should return document with ast property', () => {
      const content = `---
title: Hello
---

# Hello World`

      const doc = parseWithAst(content)

      expect(doc.data).toEqual({ title: 'Hello' })
      expect(doc.ast).toBeDefined()
      expect(doc.ast.type).toBe('root')
    })

    it('should respect mode option', () => {
      const content = `---
$id: test-id
title: Hello
---

Content`

      const expanded = parseWithAst(content, { mode: 'expanded' })
      expect(expanded.id).toBe('test-id')
      expect(expanded.data.$id).toBeUndefined()

      const flat = parseWithAst(content, { mode: 'flat' })
      expect(flat.id).toBeUndefined()
      expect(flat.data.$id).toBe('test-id')
    })
  })

  describe('stringifyAst', () => {
    it('should convert AST to string', () => {
      const doc = parse(`---
title: Test
---

# Hello World

Some content here.`)

      const ast = toAst(doc)
      const result = stringifyAst(ast)

      expect(result).toContain('title')
      expect(result).toContain('Hello World')
      expect(result).toContain('Some content here')
    })

    it('should roundtrip through AST', () => {
      const original = {
        data: {},
        content: '# Heading\n\nParagraph with **bold** text.',
      }

      const ast = toAst(original)
      const result = stringifyAst(ast)

      expect(result).toContain('Heading')
      expect(result).toContain('bold')
    })
  })
})

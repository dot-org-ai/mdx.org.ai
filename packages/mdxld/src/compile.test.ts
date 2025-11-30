import { describe, it, expect } from 'vitest'
import { compile, compileFromString } from './compile.js'
import { parse } from './parse.js'

describe('compile', () => {
  describe('basic compilation', () => {
    it('should compile document to code', () => {
      const doc = parse(`---
title: Hello
---

# Hello World`)

      const compiled = compile(doc)

      expect(compiled.code).toBeDefined()
      expect(compiled.code).toContain('frontmatter')
      expect(compiled.code).toContain('MDXContent')
    })

    it('should include frontmatter in compiled code', () => {
      const doc = parse(`---
title: Test Title
author: John Doe
---

Content`)

      const compiled = compile(doc)

      expect(compiled.code).toContain('"title"')
      expect(compiled.code).toContain('"Test Title"')
      expect(compiled.code).toContain('"author"')
    })

    it('should include LD properties in module exports', () => {
      const doc = parse(`---
$id: https://example.com/doc
$type: Article
$context: https://schema.org
title: Test
---

Content`)

      const compiled = compile(doc, { outputFormat: 'module' })

      expect(compiled.code).toContain('export const id =')
      expect(compiled.code).toContain('https://example.com/doc')
      expect(compiled.code).toContain('export const type =')
      expect(compiled.code).toContain('Article')
      expect(compiled.code).toContain('export const context =')
    })
  })

  describe('output formats', () => {
    it('should generate function-body format by default', () => {
      const doc = {
        data: { title: 'Test' },
        content: '# Hello',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('return {')
      expect(compiled.code).toContain('frontmatter')
      expect(compiled.code).not.toContain('import ')
    })

    it('should generate module format when specified', () => {
      const doc = {
        data: { title: 'Test' },
        content: '# Hello',
      }

      const compiled = compile(doc, { outputFormat: 'module' })

      expect(compiled.code).toContain('import ')
      expect(compiled.code).toContain('export const frontmatter')
      expect(compiled.code).toContain('export default function MDXContent')
    })

    it('should use automatic JSX runtime by default', () => {
      const doc = {
        data: {},
        content: '# Hello',
      }

      const compiled = compile(doc, { outputFormat: 'module' })

      expect(compiled.code).toContain('jsx-runtime')
      expect(compiled.code).toContain('_jsx')
    })
  })

  describe('content transformation', () => {
    it('should transform headings to JSX', () => {
      const doc = {
        data: {},
        content: '# Heading 1\n\n## Heading 2',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"h1"')
      expect(compiled.code).toContain('"h2"')
    })

    it('should transform paragraphs to JSX', () => {
      const doc = {
        data: {},
        content: 'This is a paragraph.',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"p"')
      expect(compiled.code).toContain('This is a paragraph')
    })

    it('should transform code blocks to JSX', () => {
      const doc = {
        data: {},
        content: '```javascript\nconst x = 1;\n```',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"pre"')
      expect(compiled.code).toContain('"code"')
      expect(compiled.code).toContain('const x = 1')
    })

    it('should transform lists to JSX', () => {
      const doc = {
        data: {},
        content: '- Item 1\n- Item 2',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"ul"')
      expect(compiled.code).toContain('"li"')
    })

    it('should transform ordered lists to JSX', () => {
      const doc = {
        data: {},
        content: '1. First\n2. Second',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"ol"')
      expect(compiled.code).toContain('"li"')
    })

    it('should transform blockquotes to JSX', () => {
      const doc = {
        data: {},
        content: '> This is a quote',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"blockquote"')
    })

    it('should transform thematic breaks to JSX', () => {
      const doc = {
        data: {},
        content: '---',
      }

      const compiled = compile(doc)

      expect(compiled.code).toContain('"hr"')
    })
  })

  describe('compileFromString', () => {
    it('should parse and compile in one step', () => {
      const content = `---
title: Hello
---

# Hello World`

      const compiled = compileFromString(content)

      expect(compiled.code).toBeDefined()
      expect(compiled.data).toEqual({ title: 'Hello' })
    })

    it('should respect mode option', () => {
      const content = `---
$id: test-id
title: Hello
---

Content`

      const expanded = compileFromString(content, { mode: 'expanded' })
      expect(expanded.id).toBe('test-id')

      const flat = compileFromString(content, { mode: 'flat' })
      expect(flat.id).toBeUndefined()
      expect(flat.data.$id).toBe('test-id')
    })

    it('should respect compile options', () => {
      const content = `---
title: Test
---

# Hello`

      const compiled = compileFromString(content, { outputFormat: 'module' })

      expect(compiled.code).toContain('export ')
    })
  })

  describe('development mode', () => {
    it('should add development comment when enabled', () => {
      const doc = {
        data: {},
        content: '# Hello',
      }

      const compiled = compile(doc, { development: true })

      expect(compiled.code).toContain('Development Mode')
    })
  })

  describe('document properties', () => {
    it('should preserve original document properties', () => {
      const doc = {
        id: 'test-id',
        type: 'Article',
        context: 'https://schema.org',
        data: { title: 'Test' },
        content: '# Hello',
      }

      const compiled = compile(doc)

      expect(compiled.id).toBe('test-id')
      expect(compiled.type).toBe('Article')
      expect(compiled.context).toBe('https://schema.org')
      expect(compiled.data).toEqual({ title: 'Test' })
      expect(compiled.content).toBe('# Hello')
    })
  })
})

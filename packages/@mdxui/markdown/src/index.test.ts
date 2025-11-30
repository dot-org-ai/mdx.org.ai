import { describe, it, expect } from 'vitest'
import { render, renderString, renderContent } from './index.js'
import { parse } from 'mdxld'

describe('@mdxui/markdown', () => {
  describe('render', () => {
    it('should render a simple document', () => {
      const doc = parse(`---
title: Hello
---

# Hello World

This is a paragraph.`)

      const result = render(doc)

      expect(result).toContain('title: Hello')
      expect(result).toContain('# Hello World')
      expect(result).toContain('This is a paragraph.')
    })

    it('should render without frontmatter when disabled', () => {
      const doc = parse(`---
title: Hello
---

# Content`)

      const result = render(doc, { includeFrontmatter: false })

      expect(result).not.toContain('title')
      expect(result).not.toContain('---')
      expect(result).toContain('# Content')
    })
  })

  describe('renderString', () => {
    it('should render from raw string', () => {
      const content = `---
author: John
---

# Title

Paragraph text.`

      const result = renderString(content)

      expect(result).toContain('author: John')
      expect(result).toContain('# Title')
      expect(result).toContain('Paragraph text.')
    })
  })

  describe('renderContent', () => {
    it('should render content only', () => {
      const content = `# Just Content

No frontmatter here.`

      const result = renderContent(content)

      expect(result).toContain('# Just Content')
      expect(result).toContain('No frontmatter here.')
      expect(result).not.toContain('---')
    })
  })

  describe('headings', () => {
    it('should render all heading levels', () => {
      const content = `# H1
## H2
### H3
#### H4
##### H5
###### H6`

      const result = renderContent(content)

      expect(result).toContain('# H1')
      expect(result).toContain('## H2')
      expect(result).toContain('### H3')
      expect(result).toContain('#### H4')
      expect(result).toContain('##### H5')
      expect(result).toContain('###### H6')
    })

    it('should support setext headings', () => {
      const content = `# Main Title
## Subtitle`

      const result = renderContent(content, { setextHeadings: true })

      expect(result).toContain('Main Title\n==========')
      expect(result).toContain('Subtitle\n--------')
    })
  })

  describe('inline formatting', () => {
    it('should render bold text', () => {
      const content = 'This is **bold** text.'
      const result = renderContent(content)
      expect(result).toContain('**bold**')
    })

    it('should render italic text', () => {
      const content = 'This is *italic* text.'
      const result = renderContent(content)
      expect(result).toContain('*italic*')
    })

    it('should render inline code', () => {
      const content = 'Use `console.log()` for debugging.'
      const result = renderContent(content)
      expect(result).toContain('`console.log()`')
    })

    it('should render strikethrough', () => {
      const content = 'This is ~~deleted~~ text.'
      const result = renderContent(content)
      expect(result).toContain('~~deleted~~')
    })

    it('should use custom emphasis characters', () => {
      const content = 'This is *italic* and **bold**.'
      const result = renderContent(content, { emphasisChar: '_', strongChar: '__' })
      expect(result).toContain('_italic_')
      expect(result).toContain('__bold__')
    })
  })

  describe('links and images', () => {
    it('should render links', () => {
      const content = 'Check out [this link](https://example.com).'
      const result = renderContent(content)
      expect(result).toContain('[this link](https://example.com)')
    })

    it('should render links with titles', () => {
      const content = 'Check out [this link](https://example.com "Example Site").'
      const result = renderContent(content)
      expect(result).toContain('[this link](https://example.com "Example Site")')
    })

    it('should render images', () => {
      const content = '![Alt text](image.png)'
      const result = renderContent(content)
      expect(result).toContain('![Alt text](image.png)')
    })

    it('should render images with titles', () => {
      const content = '![Alt text](image.png "Image Title")'
      const result = renderContent(content)
      expect(result).toContain('![Alt text](image.png "Image Title")')
    })
  })

  describe('code blocks', () => {
    it('should render code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```'
      const result = renderContent(content)
      expect(result).toContain('```javascript')
      expect(result).toContain('const x = 1;')
      expect(result).toContain('```')
    })

    it('should render code blocks without language', () => {
      const content = '```\nplain code\n```'
      const result = renderContent(content)
      expect(result).toContain('```\nplain code\n```')
    })

    it('should use custom code fence', () => {
      const content = '```js\ncode\n```'
      const result = renderContent(content, { codeFence: '~~~' })
      expect(result).toContain('~~~js')
      expect(result).toContain('~~~')
    })
  })

  describe('lists', () => {
    it('should render unordered lists', () => {
      const content = `- Item 1
- Item 2
- Item 3`

      const result = renderContent(content)

      expect(result).toContain('- Item 1')
      expect(result).toContain('- Item 2')
      expect(result).toContain('- Item 3')
    })

    it('should render ordered lists', () => {
      const content = `1. First
2. Second
3. Third`

      const result = renderContent(content)

      expect(result).toContain('1. First')
      expect(result).toContain('2. Second')
      expect(result).toContain('3. Third')
    })

    it('should use custom bullet character', () => {
      const content = `- Item 1
- Item 2`

      const result = renderContent(content, { bulletChar: '*' })

      expect(result).toContain('* Item 1')
      expect(result).toContain('* Item 2')
    })

    it('should render task lists', () => {
      const content = `- [ ] Unchecked
- [x] Checked`

      const result = renderContent(content)

      expect(result).toContain('[ ] Unchecked')
      expect(result).toContain('[x] Checked')
    })
  })

  describe('blockquotes', () => {
    it('should render blockquotes', () => {
      const content = `> This is a quote
> With multiple lines`

      const result = renderContent(content)

      expect(result).toContain('> This is a quote')
      expect(result).toContain('> With multiple lines')
    })

    it('should render nested blockquotes', () => {
      const content = `> Outer quote
> > Nested quote`

      const result = renderContent(content)

      expect(result).toContain('>')
    })
  })

  describe('thematic breaks', () => {
    it('should render thematic breaks', () => {
      const content = `Before

---

After`

      const result = renderContent(content)

      expect(result).toContain('---')
    })

    it('should use custom thematic break', () => {
      const content = `Before

---

After`

      const result = renderContent(content, { thematicBreak: '***' })

      expect(result).toContain('***')
    })
  })

  describe('tables', () => {
    it('should render tables', () => {
      const content = `| Header 1 | Header 2 |
| --- | --- |
| Cell 1 | Cell 2 |`

      const result = renderContent(content)

      expect(result).toContain('| Header 1 | Header 2 |')
      expect(result).toContain('| --- | --- |')
      expect(result).toContain('| Cell 1 | Cell 2 |')
    })

    it('should render tables with alignment', () => {
      const content = `| Left | Center | Right |
| :--- | :---: | ---: |
| L | C | R |`

      const result = renderContent(content)

      expect(result).toContain(':---')
      expect(result).toContain(':---:')
      expect(result).toContain('---:')
    })
  })

  describe('MDX handling', () => {
    it('should strip JSX by default', () => {
      const doc = {
        data: {},
        content: '# Title\n\n<Component prop="value" />\n\nParagraph',
      }

      const result = render(doc)

      expect(result).toContain('# Title')
      expect(result).toContain('Paragraph')
      expect(result).not.toContain('<Component')
    })

    it('should replace JSX with placeholder', () => {
      const doc = {
        data: {},
        content: '# Title\n\n<MyComponent />\n\nParagraph',
      }

      const result = render(doc, { jsxHandling: 'placeholder' })

      expect(result).toContain('<!-- JSX:')
    })

    it('should keep JSX as raw when specified', () => {
      const doc = {
        data: {},
        content: '# Title\n\n<MyComponent />\n\nParagraph',
      }

      const result = render(doc, { jsxHandling: 'raw' })

      expect(result).toContain('<')
    })
  })

  describe('frontmatter with LD properties', () => {
    it('should include $id, $type, $context', () => {
      const doc = parse(`---
$id: https://example.com/doc
$type: Article
$context: https://schema.org
title: Hello
---

Content`)

      const result = render(doc)

      expect(result).toMatch(/\$id/)
      expect(result).toContain('$type: Article')
      expect(result).toMatch(/\$context/)
      expect(result).toContain('title: Hello')
    })
  })

  describe('complex documents', () => {
    it('should render a complex document', () => {
      const content = `---
title: Complex Example
tags: [markdown, test]
---

# Main Title

This is a paragraph with **bold**, *italic*, and \`code\`.

## Lists

- Item 1
- Item 2
  - Nested item

## Code

\`\`\`typescript
const x: number = 42;
\`\`\`

## Quote

> This is a quote

## Link

Check [this](https://example.com).

---

The end.`

      const result = renderString(content)

      expect(result).toContain('title: Complex Example')
      expect(result).toContain('# Main Title')
      expect(result).toContain('**bold**')
      expect(result).toContain('*italic*')
      expect(result).toContain('`code`')
      expect(result).toContain('- Item 1')
      expect(result).toContain('```typescript')
      expect(result).toContain('> This is a quote')
      expect(result).toContain('[this](https://example.com)')
      expect(result).toContain('---')
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const doc = { data: {}, content: '' }
      const result = render(doc)
      expect(result).toBe('')
    })

    it('should handle empty data', () => {
      const doc = { data: {}, content: '# Title' }
      const result = render(doc)
      expect(result).toContain('# Title')
      expect(result).not.toContain('---')
    })

    it('should handle special characters in content', () => {
      const content = 'Text with < and > and & symbols.'
      const result = renderContent(content)
      expect(result).toContain('< and > and &')
    })
  })
})

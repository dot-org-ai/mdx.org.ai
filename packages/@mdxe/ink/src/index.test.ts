import { describe, it, expect } from 'vitest'
import React from 'react'
import { render } from 'ink-testing-library'
import { MDXDocument, MDXContent, renderToText, defaultTheme, parse } from './index.js'

describe('@mdxe/ink', () => {
  describe('MDXDocument component', () => {
    it('should render a simple document', () => {
      const doc = parse(`---
title: Test
---

# Hello World

This is a paragraph.`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('Hello World')
      expect(lastFrame()).toContain('This is a paragraph')
    })

    it('should render frontmatter', () => {
      const doc = parse(`---
title: My Title
author: John
---

Content`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('title')
      expect(lastFrame()).toContain('My Title')
      expect(lastFrame()).toContain('author')
      expect(lastFrame()).toContain('John')
    })

    it('should hide frontmatter when disabled', () => {
      const doc = parse(`---
title: Hidden
---

Content`)

      const { lastFrame } = render(
        React.createElement(MDXDocument, { doc, options: { showFrontmatter: false } })
      )

      expect(lastFrame()).not.toContain('Hidden')
      expect(lastFrame()).toContain('Content')
    })

    it('should render headings', () => {
      const doc = parse(`# Heading 1

## Heading 2

### Heading 3`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('# Heading 1')
      expect(lastFrame()).toContain('## Heading 2')
      expect(lastFrame()).toContain('### Heading 3')
    })

    it('should render code blocks', () => {
      const doc = parse('```javascript\nconst x = 1;\n```')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('javascript')
      expect(lastFrame()).toContain('const x = 1')
    })

    it('should render lists', () => {
      const doc = parse(`- Item 1
- Item 2
- Item 3`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('Item 1')
      expect(lastFrame()).toContain('Item 2')
      expect(lastFrame()).toContain('Item 3')
    })

    it('should render ordered lists', () => {
      const doc = parse(`1. First
2. Second
3. Third`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('First')
      expect(lastFrame()).toContain('Second')
      expect(lastFrame()).toContain('Third')
    })

    it('should render blockquotes', () => {
      const doc = parse('> This is a quote')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('This is a quote')
    })

    it('should render inline formatting', () => {
      const doc = parse('This has **bold** and *italic* text.')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('**bold**')
      expect(lastFrame()).toContain('*italic*')
    })

    it('should render links', () => {
      const doc = parse('[Click here](https://example.com)')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('[Click here](https://example.com)')
    })
  })

  describe('MDXContent component', () => {
    it('should render from raw content string', () => {
      const { lastFrame } = render(
        React.createElement(MDXContent, { content: '# Hello\n\nWorld' })
      )

      expect(lastFrame()).toContain('Hello')
      expect(lastFrame()).toContain('World')
    })
  })

  describe('renderToText', () => {
    it('should render document to plain text', () => {
      const doc = parse(`---
title: Test
---

# Hello World

This is a paragraph.`)

      const text = renderToText(doc)

      expect(text).toContain('title: Test')
      expect(text).toContain('# Hello World')
      expect(text).toContain('This is a paragraph')
    })

    it('should render without frontmatter', () => {
      const doc = parse(`---
title: Hidden
---

# Content`)

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).not.toContain('title')
      expect(text).toContain('# Content')
    })

    it('should render headings', () => {
      const doc = parse(`# H1

## H2

### H3`)

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('# H1')
      expect(text).toContain('## H2')
      expect(text).toContain('### H3')
    })

    it('should render code blocks', () => {
      const doc = parse('```typescript\nconst x: number = 1;\n```')

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('```typescript')
      expect(text).toContain('const x: number = 1')
      expect(text).toContain('```')
    })

    it('should render lists with bullets', () => {
      const doc = parse(`- First
- Second
- Third`)

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('• First')
      expect(text).toContain('• Second')
      expect(text).toContain('• Third')
    })

    it('should render ordered lists with numbers', () => {
      const doc = parse(`1. One
2. Two
3. Three`)

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('1. One')
      expect(text).toContain('2. Two')
      expect(text).toContain('3. Three')
    })

    it('should render blockquotes with border', () => {
      const doc = parse('> Quote text')

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('│ Quote text')
    })

    it('should render thematic breaks', () => {
      const doc = parse('---')

      const text = renderToText(doc, { showFrontmatter: false })

      expect(text).toContain('─')
    })
  })

  describe('defaultTheme', () => {
    it('should have heading colors', () => {
      expect(defaultTheme.heading).toBeDefined()
      expect(defaultTheme.heading?.[1]).toBe('cyan')
      expect(defaultTheme.heading?.[2]).toBe('blue')
    })

    it('should have formatting colors', () => {
      expect(defaultTheme.bold).toBe('white')
      expect(defaultTheme.italic).toBe('gray')
      expect(defaultTheme.code).toBe('green')
      expect(defaultTheme.link).toBe('blue')
    })
  })

  describe('complex documents', () => {
    it('should render a complex document', () => {
      const doc = parse(`---
title: Complex Example
author: Test Author
tags: [a, b, c]
---

# Main Title

This is a paragraph with **bold** and *italic* text.

## Code Example

\`\`\`javascript
function hello() {
  console.log('Hello!')
}
\`\`\`

## Lists

- Item 1
- Item 2
- Item 3

> This is a quote

---

The end.`)

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))
      const output = lastFrame()

      expect(output).toContain('Complex Example')
      expect(output).toContain('Main Title')
      expect(output).toContain('**bold**')
      expect(output).toContain('*italic*')
      expect(output).toContain('javascript')
      expect(output).toContain('Hello!')
      expect(output).toContain('Item 1')
      expect(output).toContain('This is a quote')
    })
  })

  describe('edge cases', () => {
    it('should handle empty content', () => {
      const doc = parse('')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toBeDefined()
    })

    it('should handle content without frontmatter', () => {
      const doc = parse('# Just Content')

      const { lastFrame } = render(React.createElement(MDXDocument, { doc }))

      expect(lastFrame()).toContain('Just Content')
    })

    it('should handle array values in frontmatter', () => {
      const doc = parse(`---
tags: [one, two, three]
---

Content`)

      const text = renderToText(doc)

      expect(text).toContain('tags: [one, two, three]')
    })

    it('should handle nested objects in frontmatter', () => {
      const doc = {
        data: {
          meta: { key: 'value' },
        },
        content: '# Test',
      }

      const text = renderToText(doc)

      expect(text).toContain('meta:')
    })
  })
})

# @mdxui/markdown

Render MDXLD documents to clean markdown. String-to-string rendering without going through HTML.

## Installation

```bash
npm install @mdxui/markdown
# or
pnpm add @mdxui/markdown
# or
yarn add @mdxui/markdown
```

## Features

- **String-to-String** - Direct markdown output, no DOM required
- **JSX Handling** - Strip, placeholder, or raw JSX output
- **Expression Handling** - Configurable MDX expression handling
- **Customizable** - Bullet chars, emphasis, headings, code fences
- **Frontmatter** - Optional YAML frontmatter inclusion
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { render, renderString } from '@mdxui/markdown'
import { parse } from 'mdxld'

// From parsed document
const doc = parse(`---
title: Hello World
---

# Welcome

This is **bold** and *italic* text.
`)

const markdown = render(doc)

// Or from raw string
const md = renderString(`---
title: Hello
---

# Hello World
`)
```

## API Reference

### `render(doc, options?)`

Render an MDXLD document to markdown string.

```typescript
function render(doc: MDXLDDocument, options?: RenderOptions): string
```

**Example:**

```typescript
import { render } from '@mdxui/markdown'
import { parse } from 'mdxld'

const doc = parse(`---
title: My Document
author: Alice
---

# Introduction

Welcome to this **amazing** document.

## Features

- Fast rendering
- Clean output
- Customizable

\`\`\`javascript
console.log('Hello!')
\`\`\`
`)

const markdown = render(doc, {
  includeFrontmatter: true,
  bulletChar: '-',
  codeFence: '```'
})
```

### `renderString(content, options?)`

Render raw MDXLD content string to markdown.

```typescript
function renderString(content: string, options?: RenderOptions): string
```

**Example:**

```typescript
import { renderString } from '@mdxui/markdown'

const markdown = renderString(`---
title: Quick Note
---

# Note

This is a quick note with *emphasis*.
`)
```

### `renderContent(content, options?)`

Render just the content portion, without frontmatter.

```typescript
function renderContent(content: string, options?: RenderOptions): string
```

**Example:**

```typescript
import { renderContent } from '@mdxui/markdown'

const markdown = renderContent(`
# Hello

Some content here.
`)
// Output: "# Hello\n\nSome content here."
```

## Options

### `RenderOptions`

```typescript
interface RenderOptions {
  /**
   * Include YAML frontmatter in output
   * @default true
   */
  includeFrontmatter?: boolean

  /**
   * How to handle JSX elements
   * - 'strip': Remove JSX elements entirely
   * - 'placeholder': Replace with a placeholder comment
   * - 'raw': Keep as raw text (may not be valid markdown)
   * @default 'strip'
   */
  jsxHandling?: 'strip' | 'placeholder' | 'raw'

  /**
   * How to handle MDX expressions
   * - 'strip': Remove expressions entirely
   * - 'placeholder': Replace with a placeholder
   * - 'raw': Keep as raw text
   * @default 'strip'
   */
  expressionHandling?: 'strip' | 'placeholder' | 'raw'

  /**
   * Bullet character for unordered lists
   * @default '-'
   */
  bulletChar?: '-' | '*' | '+'

  /**
   * Use setext-style headings (underlined) for h1 and h2
   * @default false
   */
  setextHeadings?: boolean

  /**
   * Character for thematic breaks
   * @default '---'
   */
  thematicBreak?: '---' | '***' | '___'

  /**
   * Emphasis character
   * @default '*'
   */
  emphasisChar?: '*' | '_'

  /**
   * Strong character (doubled)
   * @default '**'
   */
  strongChar?: '**' | '__'

  /**
   * Code fence character
   * @default '```'
   */
  codeFence?: '```' | '~~~'
}
```

## Examples

### Strip JSX Components

```typescript
import { renderString } from '@mdxui/markdown'

const content = `
# Hello

<CustomComponent prop="value">
  Some content
</CustomComponent>

Regular paragraph.
`

const markdown = renderString(content, {
  jsxHandling: 'strip'
})
// Output:
// # Hello
//
// Regular paragraph.
```

### Placeholder for JSX

```typescript
const markdown = renderString(content, {
  jsxHandling: 'placeholder'
})
// Output:
// # Hello
//
// <!-- JSX: <CustomComponent /> -->
//
// Regular paragraph.
```

### Setext-Style Headings

```typescript
import { renderString } from '@mdxui/markdown'

const content = `
# Main Title

## Section

Content here.
`

const markdown = renderString(content, {
  setextHeadings: true
})
// Output:
// Main Title
// ==========
//
// Section
// -------
//
// Content here.
```

### Custom Bullets

```typescript
import { renderString } from '@mdxui/markdown'

const content = `
# List

- Item 1
- Item 2
- Item 3
`

const markdown = renderString(content, {
  bulletChar: '*'
})
// Output uses * instead of -
```

### Processing Blog Posts

```typescript
import { render } from '@mdxui/markdown'
import { parse } from 'mdxld'
import { glob } from 'glob'

async function exportBlogToMarkdown() {
  const files = await glob('./content/blog/*.mdx')

  for (const file of files) {
    const content = await Bun.file(file).text()
    const doc = parse(content)

    const markdown = render(doc, {
      includeFrontmatter: true,
      jsxHandling: 'strip',
      expressionHandling: 'strip'
    })

    const outFile = file.replace('.mdx', '.md')
    await Bun.write(outFile, markdown)
  }
}
```

### Converting MDX to Plain Markdown

```typescript
import { render } from '@mdxui/markdown'
import { parse } from 'mdxld'

function mdxToMarkdown(mdxContent: string): string {
  const doc = parse(mdxContent)

  return render(doc, {
    includeFrontmatter: true,
    jsxHandling: 'strip',
    expressionHandling: 'strip'
  })
}

// Convert complex MDX
const mdx = `---
title: Interactive Demo
---

# Demo

import { Chart } from './components'

<Chart data={chartData} />

Here's the explanation:

{processedText}

<CodeBlock language="javascript">
  console.log('hello')
</CodeBlock>
`

const markdown = mdxToMarkdown(mdx)
// Output is clean markdown without JSX or expressions
```

### Markdown Normalization

```typescript
import { renderString } from '@mdxui/markdown'

function normalizeMarkdown(input: string): string {
  return renderString(input, {
    includeFrontmatter: true,
    bulletChar: '-',
    emphasisChar: '*',
    strongChar: '**',
    codeFence: '```',
    thematicBreak: '---'
  })
}

// Normalize inconsistent markdown
const messy = `
# Title

* Item 1
+ Item 2
- Item 3

__bold__ and _italic_
`

const clean = normalizeMarkdown(messy)
// Consistent bullet chars, emphasis markers
```

## Supported Elements

### Standard Markdown

- Headings (ATX and Setext)
- Paragraphs
- Emphasis (italic) and Strong (bold)
- Strikethrough
- Inline code and code blocks
- Links and images
- Blockquotes
- Ordered and unordered lists
- Task lists
- Tables
- Thematic breaks
- Link/image definitions
- Footnotes

### MDX Elements

- JSX flow elements (configurable handling)
- JSX text elements (configurable handling)
- MDX expressions (configurable handling)
- ESM imports/exports (configurable handling)

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  data: TData
  content: string
}
```

### `MDXLDAst`

```typescript
interface MDXLDAst {
  type: 'root'
  children: MDXLDAstNode[]
}
```

### `MDXLDAstNode`

```typescript
interface MDXLDAstNode {
  type: string
  children?: MDXLDAstNode[]
  value?: string
  depth?: number
  ordered?: boolean
  // ... other properties
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxui/html](https://www.npmjs.com/package/@mdxui/html) | HTML rendering |
| [@mdxe/ink](https://www.npmjs.com/package/@mdxe/ink) | Terminal rendering |

## License

MIT

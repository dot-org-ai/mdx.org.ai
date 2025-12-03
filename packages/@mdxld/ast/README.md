# @mdxld/ast

AST (Abstract Syntax Tree) manipulation and analysis for MDXLD documents. Extract headings, links, code blocks, and traverse/transform document structure.

## Installation

```bash
npm install @mdxld/ast mdxld
# or
pnpm add @mdxld/ast mdxld
# or
yarn add @mdxld/ast mdxld
```

## Features

- **AST Conversion** - Convert documents to/from AST representation
- **Tree Traversal** - Walk and find nodes in the AST
- **Content Extraction** - Extract headings, links, code blocks
- **Analysis** - Analyze document structure programmatically
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { toAst, extractHeadings, extractLinks, extractCodeBlocks } from '@mdxld/ast'

const doc = parse(`---
$type: Article
title: My Guide
---

# Introduction

Check out [our docs](https://docs.example.com).

## Getting Started

\`\`\`typescript
const x = 1
\`\`\`

## Advanced Usage

See [advanced guide](/advanced) for more.
`)

// Convert to AST
const ast = toAst(doc)

// Extract all headings
const headings = extractHeadings(doc)
// [
//   { level: 1, text: 'Introduction', slug: 'introduction' },
//   { level: 2, text: 'Getting Started', slug: 'getting-started' },
//   { level: 2, text: 'Advanced Usage', slug: 'advanced-usage' }
// ]

// Extract all links
const links = extractLinks(doc)
// [
//   { url: 'https://docs.example.com', text: 'our docs' },
//   { url: '/advanced', text: 'advanced guide' }
// ]

// Extract code blocks
const codeBlocks = extractCodeBlocks(doc)
// [{ lang: 'typescript', code: 'const x = 1', meta: '' }]
```

## API Reference

### AST Conversion

#### `toAst(doc)`

Convert an MDXLDDocument to its AST representation.

```typescript
function toAst(doc: MDXLDDocument): MDXLDAst
```

**Parameters:**
- `doc` - Parsed MDXLDDocument

**Returns:** `MDXLDAst` - Abstract syntax tree

```typescript
import { parse } from 'mdxld'
import { toAst } from '@mdxld/ast'

const doc = parse('# Hello\n\nWorld')
const ast = toAst(doc)

console.log(ast.type) // 'root'
console.log(ast.children[0].type) // 'heading'
```

#### `fromAst(ast, frontmatter?)`

Convert an AST back to an MDXLDDocument.

```typescript
function fromAst(ast: MDXLDAst, frontmatter?: Record<string, unknown>): MDXLDDocument
```

**Parameters:**
- `ast` - Abstract syntax tree
- `frontmatter` - Optional frontmatter to include

**Returns:** `MDXLDDocument`

```typescript
import { fromAst } from '@mdxld/ast'

const doc = fromAst(ast, { title: 'My Doc', $type: 'Article' })
```

#### `parseWithAst(content, options?)`

Parse content and return both document and AST.

```typescript
function parseWithAst(content: string, options?: ParseOptions): MDXLDDocumentWithAST
```

**Returns:** Document with `ast` property included

```typescript
import { parseWithAst } from '@mdxld/ast'

const { ast, content, data, type } = parseWithAst(mdxContent)
```

#### `stringifyAst(ast)`

Convert AST back to markdown/MDX string.

```typescript
function stringifyAst(ast: MDXLDAst): string
```

```typescript
import { stringifyAst, toAst } from '@mdxld/ast'
import { parse } from 'mdxld'

const doc = parse('# Hello')
const ast = toAst(doc)
const markdown = stringifyAst(ast)
// '# Hello'
```

### Tree Traversal

#### `walk(ast, visitor)`

Walk through all nodes in the AST, calling a visitor function for each.

```typescript
function walk(ast: MDXLDAst | MDXLDAstNode, visitor: (node: MDXLDAstNode) => void): void
```

```typescript
import { toAst, walk } from '@mdxld/ast'
import { parse } from 'mdxld'

const ast = toAst(parse('# Hello\n\n**bold** text'))

walk(ast, (node) => {
  console.log(node.type)
})
// Output: heading, text, paragraph, strong, text, text
```

#### `find(ast, predicate)`

Find the first node matching a predicate.

```typescript
function find(
  ast: MDXLDAst | MDXLDAstNode,
  predicate: (node: MDXLDAstNode) => boolean
): MDXLDAstNode | undefined
```

```typescript
import { toAst, find } from '@mdxld/ast'

const ast = toAst(doc)

// Find first heading
const heading = find(ast, node => node.type === 'heading')

// Find first level-2 heading
const h2 = find(ast, node => node.type === 'heading' && node.depth === 2)

// Find first link
const link = find(ast, node => node.type === 'link')
```

#### `findAll(ast, predicate)`

Find all nodes matching a predicate.

```typescript
function findAll(
  ast: MDXLDAst | MDXLDAstNode,
  predicate: (node: MDXLDAstNode) => boolean
): MDXLDAstNode[]
```

```typescript
import { toAst, findAll } from '@mdxld/ast'

const ast = toAst(doc)

// Find all headings
const headings = findAll(ast, node => node.type === 'heading')

// Find all code blocks
const codeBlocks = findAll(ast, node => node.type === 'code')

// Find all images
const images = findAll(ast, node => node.type === 'image')
```

### Content Extraction

#### `extractHeadings(doc)`

Extract all headings from a document with their hierarchy.

```typescript
function extractHeadings(doc: MDXLDDocument): Heading[]

interface Heading {
  level: number    // 1-6
  text: string     // Heading text content
  slug: string     // URL-friendly slug
}
```

```typescript
import { extractHeadings } from '@mdxld/ast'
import { parse } from 'mdxld'

const doc = parse(`
# Main Title

## Section One

### Subsection

## Section Two
`)

const headings = extractHeadings(doc)
// [
//   { level: 1, text: 'Main Title', slug: 'main-title' },
//   { level: 2, text: 'Section One', slug: 'section-one' },
//   { level: 3, text: 'Subsection', slug: 'subsection' },
//   { level: 2, text: 'Section Two', slug: 'section-two' }
// ]
```

#### `extractLinks(doc)`

Extract all links from a document.

```typescript
function extractLinks(doc: MDXLDDocument): Link[]

interface Link {
  url: string      // Link destination
  text: string     // Link text
  title?: string   // Optional title attribute
}
```

```typescript
import { extractLinks } from '@mdxld/ast'
import { parse } from 'mdxld'

const doc = parse(`
Check [our docs](https://docs.example.com "Documentation").

Also see [GitHub](https://github.com) and [Twitter](https://twitter.com).
`)

const links = extractLinks(doc)
// [
//   { url: 'https://docs.example.com', text: 'our docs', title: 'Documentation' },
//   { url: 'https://github.com', text: 'GitHub' },
//   { url: 'https://twitter.com', text: 'Twitter' }
// ]
```

#### `extractCodeBlocks(doc)`

Extract all code blocks from a document.

```typescript
function extractCodeBlocks(doc: MDXLDDocument): CodeBlock[]

interface CodeBlock {
  lang: string     // Language identifier (e.g., 'typescript')
  code: string     // Code content
  meta: string     // Additional metadata after language
}
```

```typescript
import { extractCodeBlocks } from '@mdxld/ast'
import { parse } from 'mdxld'

const doc = parse(`
\`\`\`typescript title="example.ts"
const greeting = 'Hello'
\`\`\`

\`\`\`bash
npm install mdxld
\`\`\`
`)

const blocks = extractCodeBlocks(doc)
// [
//   { lang: 'typescript', code: "const greeting = 'Hello'", meta: 'title="example.ts"' },
//   { lang: 'bash', code: 'npm install mdxld', meta: '' }
// ]
```

## Types

### `MDXLDAst`

Root AST node type.

```typescript
interface MDXLDAst {
  type: 'root'
  children: MDXLDAstNode[]
}
```

### `MDXLDAstNode`

Individual AST node.

```typescript
interface MDXLDAstNode {
  type: MDXLDAstNodeType
  children?: MDXLDAstNode[]
  value?: string
  depth?: number        // For headings (1-6)
  lang?: string         // For code blocks
  meta?: string         // For code blocks
  url?: string          // For links and images
  alt?: string          // For images
  title?: string        // For links and images
  ordered?: boolean     // For lists
  name?: string         // For MDX JSX elements
  attributes?: unknown  // For MDX JSX elements
  position?: {
    start: { line: number; column: number; offset: number }
    end: { line: number; column: number; offset: number }
  }
}
```

### `MDXLDAstNodeType`

All supported node types.

```typescript
type MDXLDAstNodeType =
  | 'root'
  | 'paragraph'
  | 'heading'
  | 'text'
  | 'emphasis'
  | 'strong'
  | 'inlineCode'
  | 'code'
  | 'blockquote'
  | 'list'
  | 'listItem'
  | 'link'
  | 'image'
  | 'thematicBreak'
  | 'html'
  | 'table'
  | 'tableRow'
  | 'tableCell'
  | 'mdxjsEsm'
  | 'mdxJsxFlowElement'
  | 'mdxJsxTextElement'
```

## Examples

### Generate Table of Contents

```typescript
import { parse } from 'mdxld'
import { extractHeadings } from '@mdxld/ast'

function generateTOC(content: string): string {
  const doc = parse(content)
  const headings = extractHeadings(doc)

  return headings
    .filter(h => h.level <= 3) // Only h1-h3
    .map(h => {
      const indent = '  '.repeat(h.level - 1)
      return `${indent}- [${h.text}](#${h.slug})`
    })
    .join('\n')
}

const toc = generateTOC(myDocument)
// - [Introduction](#introduction)
//   - [Getting Started](#getting-started)
//   - [Configuration](#configuration)
// - [API Reference](#api-reference)
```

### Find Broken Links

```typescript
import { parse } from 'mdxld'
import { extractLinks } from '@mdxld/ast'

async function findBrokenLinks(content: string): Promise<string[]> {
  const doc = parse(content)
  const links = extractLinks(doc)
  const broken: string[] = []

  for (const link of links) {
    if (link.url.startsWith('http')) {
      try {
        const res = await fetch(link.url, { method: 'HEAD' })
        if (!res.ok) broken.push(link.url)
      } catch {
        broken.push(link.url)
      }
    }
  }

  return broken
}
```

### Extract Code for Testing

```typescript
import { parse } from 'mdxld'
import { extractCodeBlocks } from '@mdxld/ast'

function getTestableCode(content: string): string[] {
  const doc = parse(content)
  const blocks = extractCodeBlocks(doc)

  return blocks
    .filter(b => ['ts', 'typescript', 'js', 'javascript'].includes(b.lang))
    .filter(b => !b.meta.includes('skip'))
    .map(b => b.code)
}
```

### Transform AST

```typescript
import { parse } from 'mdxld'
import { toAst, stringifyAst, walk } from '@mdxld/ast'

function addTargetBlank(content: string): string {
  const doc = parse(content)
  const ast = toAst(doc)

  walk(ast, (node) => {
    if (node.type === 'link' && node.url?.startsWith('http')) {
      // Mark external links (you'd handle this in your renderer)
      node.data = { ...node.data, external: true }
    }
  })

  return stringifyAst(ast)
}
```

### Count Words

```typescript
import { parse } from 'mdxld'
import { toAst, walk } from '@mdxld/ast'

function countWords(content: string): number {
  const doc = parse(content)
  const ast = toAst(doc)
  let words = 0

  walk(ast, (node) => {
    if (node.type === 'text' && node.value) {
      words += node.value.split(/\s+/).filter(Boolean).length
    }
  })

  return words
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | Core parser and stringifier |
| [@mdxld/compile](https://www.npmjs.com/package/@mdxld/compile) | JSX compilation |
| [@mdxld/evaluate](https://www.npmjs.com/package/@mdxld/evaluate) | MDX execution |
| [@mdxld/validate](https://www.npmjs.com/package/@mdxld/validate) | Schema validation |

## License

MIT

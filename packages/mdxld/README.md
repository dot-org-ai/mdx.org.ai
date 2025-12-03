# mdxld

Lightweight MDX + Linked Data parser and stringifier. Parse MDX documents with YAML frontmatter containing JSON-LD style properties (`$id`, `$type`, `$context`) into structured documents, and stringify them back.

## Installation

```bash
npm install mdxld
# or
pnpm add mdxld
# or
yarn add mdxld
```

## Features

- **Lightweight** - Only ~5KB, zero runtime dependencies
- **Parse** - Extract frontmatter and content from MDX files
- **Stringify** - Convert documents back to MDX format
- **JSON-LD Properties** - First-class support for `$id`, `$type`, `$context`
- **Type-Safe** - Full TypeScript support with generics
- **Two Modes** - Expanded (default) or flat frontmatter handling

## Quick Start

```typescript
import { parse, stringify } from 'mdxld'

// Parse MDX content
const doc = parse(`---
$id: https://example.com/posts/hello
$type: BlogPosting
$context: https://schema.org
title: Hello World
author: Jane Doe
---

# Hello World

This is my first post!
`)

console.log(doc)
// {
//   id: 'https://example.com/posts/hello',
//   type: 'BlogPosting',
//   context: 'https://schema.org',
//   data: { title: 'Hello World', author: 'Jane Doe' },
//   content: '\n# Hello World\n\nThis is my first post!\n'
// }

// Stringify back to MDX
const mdx = stringify(doc)
```

## API Reference

### `parse(content, options?)`

Parse MDX content with YAML frontmatter into a structured document.

```typescript
function parse(content: string, options?: ParseOptions): MDXLDDocument
```

**Parameters:**
- `content` - Raw MDX string with optional YAML frontmatter
- `options.mode` - `'expanded'` (default) or `'flat'`

**Returns:** `MDXLDDocument` object

#### Parse Modes

**Expanded Mode (default):**
Extracts `$id`, `$type`, `$context` to root level properties.

```typescript
const doc = parse(content, { mode: 'expanded' })
// { id: '...', type: '...', context: '...', data: {...}, content: '...' }
```

**Flat Mode:**
Keeps all frontmatter in the `data` object unchanged.

```typescript
const doc = parse(content, { mode: 'flat' })
// { data: { $id: '...', $type: '...', ...otherFields }, content: '...' }
```

### `stringify(document, options?)`

Convert an MDXLDDocument back to MDX string format.

```typescript
function stringify(doc: MDXLDDocument, options?: StringifyOptions): string
```

**Parameters:**
- `doc` - MDXLDDocument to stringify
- `options.mode` - `'expanded'` (default) or `'flat'`

**Returns:** MDX string with YAML frontmatter

```typescript
const mdx = stringify({
  id: 'https://example.com/doc',
  type: 'Article',
  data: { title: 'My Article' },
  content: '# My Article\n\nContent here.'
})

// Output:
// ---
// $id: https://example.com/doc
// $type: Article
// title: My Article
// ---
//
// # My Article
//
// Content here.
```

### Type Utilities

#### `isType(doc, type)`

Type guard to check if a document has a specific `$type`.

```typescript
import { isType } from 'mdxld'

if (isType(doc, 'BlogPosting')) {
  // TypeScript knows doc.type === 'BlogPosting'
}
```

#### `isOneOfTypes(doc, types)`

Type guard to check if a document has one of several types.

```typescript
import { isOneOfTypes } from 'mdxld'

if (isOneOfTypes(doc, ['BlogPosting', 'Article'])) {
  // doc.type is 'BlogPosting' | 'Article'
}
```

#### `createTypedDocument(type, data, content)`

Factory function to create typed documents with proper TypeScript inference.

```typescript
import { createTypedDocument } from 'mdxld'

const post = createTypedDocument('BlogPosting', {
  title: 'Hello',
  author: 'Jane'
}, '# Hello World')
```

## Types

### `MDXLDDocument<TData>`

The main document type returned by `parse()`.

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  /** JSON-LD @id - document identifier/URL */
  id?: string

  /** JSON-LD @type - document type (e.g., 'BlogPosting') */
  type?: string | string[]

  /** JSON-LD @context - vocabulary context */
  context?: string | string[] | Record<string, unknown>

  /** Frontmatter data (excluding $id, $type, $context in expanded mode) */
  data: TData

  /** MDX content (everything after frontmatter) */
  content: string
}
```

### `MDXLDData`

Type for frontmatter data with optional LD properties.

```typescript
interface MDXLDData {
  $id?: string
  $type?: string | string[]
  $context?: string | string[] | Record<string, unknown>
  [key: string]: unknown
}
```

### `ParseOptions` / `StringifyOptions`

```typescript
interface ParseOptions {
  /** Parse mode: 'expanded' extracts $-prefixed props, 'flat' keeps them in data */
  mode?: 'expanded' | 'flat'
}

interface StringifyOptions {
  /** Stringify mode: 'expanded' adds $-prefixed props, 'flat' uses data as-is */
  mode?: 'expanded' | 'flat'
}
```

## Related Packages

For additional functionality, use these companion packages:

| Package | Description |
|---------|-------------|
| [@mdxld/ast](https://www.npmjs.com/package/@mdxld/ast) | AST manipulation and analysis |
| [@mdxld/compile](https://www.npmjs.com/package/@mdxld/compile) | JSX compilation with esbuild |
| [@mdxld/evaluate](https://www.npmjs.com/package/@mdxld/evaluate) | MDX execution and rendering |
| [@mdxld/validate](https://www.npmjs.com/package/@mdxld/validate) | Schema validation |

## Examples

### Blog Post

```typescript
import { parse, stringify, isType } from 'mdxld'

const content = `---
$type: BlogPosting
$context: https://schema.org
title: Getting Started with MDXLD
author: Jane Doe
datePublished: 2024-01-15
tags:
  - mdx
  - tutorial
---

# Getting Started with MDXLD

Learn how to use MDXLD for your documentation.
`

const doc = parse(content)

if (isType(doc, 'BlogPosting')) {
  console.log(`Published: ${doc.data.datePublished}`)
  console.log(`Tags: ${doc.data.tags.join(', ')}`)
}
```

### API Documentation

```typescript
import { parse } from 'mdxld'

const apiDoc = parse(`---
$type: APIEndpoint
$id: /api/users
method: GET
parameters:
  - name: limit
    type: number
    required: false
---

# List Users

Returns a paginated list of users.
`)

console.log(apiDoc.type)  // 'APIEndpoint'
console.log(apiDoc.id)    // '/api/users'
```

### Round-Trip Parsing

```typescript
import { parse, stringify } from 'mdxld'

const original = `---
$type: Article
title: Hello
---

# Hello
`

const doc = parse(original)
doc.data.title = 'Updated Title'
const updated = stringify(doc)

// ---
// $type: Article
// title: Updated Title
// ---
//
// # Hello
```

## YAML Frontmatter Support

The parser handles common YAML features:

```yaml
---
# Comments are ignored
$type: Document

# Strings
title: Hello World
quoted: "With special: characters"

# Numbers
count: 42
price: 19.99

# Booleans
published: true
draft: false

# Null
deletedAt: null

# Arrays
tags:
  - one
  - two
  - three
inline_array: [a, b, c]

# Nested objects
author:
  name: Jane
  email: jane@example.com
---
```

## License

MIT

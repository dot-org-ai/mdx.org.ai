# @mdxui/json

JSON serialization and transformation for MDXLD documents. Convert between MDXLD and JSON-LD formats, generate schemas, and validate data.

## Installation

```bash
npm install @mdxui/json
# or
pnpm add @mdxui/json
# or
yarn add @mdxui/json
```

## Features

- **JSON Serialization** - Convert MDXLD documents to JSON
- **JSON-LD Output** - Generate JSON-LD from MDX frontmatter
- **Schema Generation** - Create JSON Schema from documents
- **Tool Schemas** - Generate MCP tool schemas
- **OpenAPI Schemas** - Generate OpenAPI components
- **Validation** - Validate data against schemas
- **Bi-directional** - Parse JSON back to MDXLD
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { toJSON, toJSONLD, toToolSchema } from '@mdxui/json'

const doc = parse(`---
$type: Person
$id: https://example.com/people/alice
name: Alice
email: alice@example.com
---

Alice is a software engineer.
`)

// Convert to JSON
const json = toJSON(doc)
// { $type: 'Person', $id: '...', name: 'Alice', email: '...', content: '...' }

// Convert to JSON-LD
const jsonld = toJSONLD(doc)
// { '@type': 'Person', '@id': '...', name: 'Alice', email: '...' }

// Generate tool schema for MCP
const toolDoc = parse(`---
$type: Tool
name: search
description: Search documents
parameters:
  query: { type: string, required: true }
  limit: { type: number, default: 10 }
---
`)
const toolSchema = toToolSchema(toolDoc)
```

## API Reference

### `toJSON(doc, options?)`

Convert an MDXLD document to JSON.

```typescript
function toJSON(
  doc: MDXLDDocument,
  options?: JSONRenderOptions
): Record<string, unknown>

interface JSONRenderOptions {
  includeContent?: boolean  // Include content (default: true)
  pretty?: boolean          // Pretty print (default: false)
  jsonld?: boolean          // Use JSON-LD format (default: false)
  baseUrl?: string          // Base URL for relative IDs
}
```

**Example:**

```typescript
const json = toJSON(doc)
// {
//   $id: 'https://example.com/posts/hello',
//   $type: 'BlogPost',
//   title: 'Hello World',
//   content: '# Hello...'
// }

const jsonNoContent = toJSON(doc, { includeContent: false })
// { $id: '...', $type: 'BlogPost', title: 'Hello World' }
```

### `toJSONLD(doc, options?)`

Convert to JSON-LD format ($ → @).

```typescript
function toJSONLD(
  doc: MDXLDDocument,
  options?: JSONRenderOptions
): JSONLDDocument
```

**Example:**

```typescript
const jsonld = toJSONLD(doc, { baseUrl: 'https://example.com' })
// {
//   '@context': 'https://schema.org',
//   '@type': 'BlogPost',
//   '@id': 'https://example.com/posts/hello',
//   'title': 'Hello World'
// }
```

### `fromJSON(json)`

Parse JSON back to MDXLD document.

```typescript
function fromJSON(json: Record<string, unknown>): MDXLDDocument
```

**Example:**

```typescript
const doc = fromJSON({
  $type: 'Person',
  name: 'Alice',
  content: '# About Alice'
})
// { type: 'Person', data: { name: 'Alice' }, content: '# About Alice' }
```

### `fromJSONLD(jsonld)`

Parse JSON-LD to MDXLD document (@ → $).

```typescript
function fromJSONLD(jsonld: JSONLDDocument): MDXLDDocument
```

### `stringify(doc, options?)`

Serialize to JSON string.

```typescript
function stringify(doc: MDXLDDocument, options?: JSONRenderOptions): string
```

**Example:**

```typescript
const str = stringify(doc, { pretty: true })
// Pretty-printed JSON string
```

### `toJSONSchema(doc)`

Generate JSON Schema from document.

```typescript
function toJSONSchema(doc: MDXLDDocument): JSONSchema
```

**Example:**

```typescript
const doc = parse(`---
$type: Person
name: Alice
age: 30
active: true
tags:
  - developer
  - writer
---
`)

const schema = toJSONSchema(doc)
// {
//   type: 'object',
//   properties: {
//     name: { type: 'string' },
//     age: { type: 'integer' },
//     active: { type: 'boolean' },
//     tags: { type: 'array', items: { type: 'string' } }
//   },
//   required: ['name', 'age', 'active', 'tags']
// }
```

### `toToolSchema(doc)`

Generate MCP tool schema.

```typescript
function toToolSchema(doc: MDXLDDocument): ToolSchema

interface ToolSchema {
  name: string
  description: string
  inputSchema: JSONSchema
}
```

**Example:**

```typescript
const toolDoc = parse(`---
$type: Tool
name: create-document
description: Create a new document
parameters:
  title:
    type: string
    description: Document title
    required: true
  content:
    type: string
    description: Document content
---
`)

const schema = toToolSchema(toolDoc)
// {
//   name: 'create-document',
//   description: 'Create a new document',
//   inputSchema: {
//     type: 'object',
//     properties: {
//       title: { type: 'string', description: 'Document title' },
//       content: { type: 'string', description: 'Document content' }
//     },
//     required: ['title']
//   }
// }
```

### `toOpenAPISchema(doc)`

Generate OpenAPI schema component.

```typescript
function toOpenAPISchema(doc: MDXLDDocument): Record<string, unknown>
```

**Example:**

```typescript
const schema = toOpenAPISchema(doc)
// {
//   Person: {
//     type: 'object',
//     properties: { name: { type: 'string' }, ... },
//     required: ['name', ...]
//   }
// }
```

### `validateSchema(data, schema)`

Validate data against a JSON Schema.

```typescript
function validateSchema(
  data: unknown,
  schema: JSONSchema
): { valid: boolean; errors: string[] }
```

**Example:**

```typescript
const schema = toJSONSchema(personDoc)
const result = validateSchema({ name: 'Bob' }, schema)

if (!result.valid) {
  console.error(result.errors)
  // ['Missing required property: $.age']
}
```

## Examples

### API Response Formatting

```typescript
import { toJSONLD } from '@mdxui/json'

app.get('/api/posts/:id', async (c) => {
  const post = await getPost(c.req.param('id'))
  const jsonld = toJSONLD(post, { baseUrl: 'https://api.example.com' })

  return c.json(jsonld, {
    headers: {
      'Content-Type': 'application/ld+json',
    },
  })
})
```

### Schema Registry

```typescript
import { toJSONSchema, toOpenAPISchema } from '@mdxui/json'

async function buildSchemaRegistry(docs: MDXLDDocument[]) {
  const schemas: Record<string, JSONSchema> = {}
  const openapi: Record<string, unknown> = {}

  for (const doc of docs) {
    if (doc.type) {
      const typeName = Array.isArray(doc.type) ? doc.type[0] : doc.type
      schemas[typeName] = toJSONSchema(doc)
      Object.assign(openapi, toOpenAPISchema(doc))
    }
  }

  return { schemas, openapi }
}
```

### MCP Tool Generation

```typescript
import { toToolSchema } from '@mdxui/json'
import { createMCPServer } from '@mdxe/mcp'

const toolDocs = await loadToolDocs('./tools')
const tools = toolDocs.map(toToolSchema)

const mcp = createMCPServer({
  name: 'my-tools',
  tools: toolDocs,
  // schemas are auto-generated from toolDocs
})
```

### Data Validation

```typescript
import { toJSONSchema, validateSchema, fromJSON } from '@mdxui/json'

const personSchema = toJSONSchema(personDoc)

function createPerson(data: unknown) {
  const result = validateSchema(data, personSchema)

  if (!result.valid) {
    throw new Error(`Invalid person: ${result.errors.join(', ')}`)
  }

  return fromJSON(data as Record<string, unknown>)
}
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}
```

### `JSONLDDocument`

```typescript
interface JSONLDDocument {
  '@context'?: string | Record<string, unknown>
  '@type'?: string | string[]
  '@id'?: string
  '@graph'?: JSONLDDocument[]
  [key: string]: unknown
}
```

### `JSONSchema`

```typescript
interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  items?: JSONSchema
  enum?: unknown[]
  default?: unknown
}
```

### `ToolSchema`

```typescript
interface ToolSchema {
  name: string
  description: string
  inputSchema: JSONSchema
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxld/jsonld](https://www.npmjs.com/package/@mdxld/jsonld) | JSON-LD utilities |
| [@mdxui/html](https://www.npmjs.com/package/@mdxui/html) | HTML rendering |
| [@mdxe/mcp](https://www.npmjs.com/package/@mdxe/mcp) | MCP server |

## License

MIT

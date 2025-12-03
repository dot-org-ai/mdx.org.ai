# @mdxld/validate

Schema validation for MDXLD documents. Validate frontmatter fields, enforce JSON-LD types, check content constraints, and ensure documents conform to your specifications.

## Installation

```bash
npm install @mdxld/validate mdxld
# or
pnpm add @mdxld/validate mdxld
# or
yarn add @mdxld/validate mdxld
```

## Features

- **Schema Definition** - Define validation schemas with types and constraints
- **Field Validation** - Validate individual frontmatter fields
- **Type Enforcement** - Enforce `$type` and `$context` values
- **Content Rules** - Validate content length and patterns
- **Built-in Schemas** - Pre-defined schemas for common document types
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { validate, defineSchema } from '@mdxld/validate'

// Define a schema
const blogPostSchema = defineSchema({
  name: 'BlogPost',
  type: 'BlogPosting',
  context: 'https://schema.org',
  fields: {
    title: { type: 'string', required: true, min: 1, max: 200 },
    author: { type: 'string', required: true },
    datePublished: { type: 'date', required: true },
    tags: { type: 'array', items: { type: 'string' } },
  },
})

// Parse and validate a document
const doc = parse(`---
$type: BlogPosting
$context: https://schema.org
title: Getting Started with MDXLD
author: Jane Doe
datePublished: 2024-01-15
tags:
  - tutorial
  - mdx
---

# Getting Started with MDXLD

Learn how to use MDXLD for your documentation.
`)

const result = validate(doc, blogPostSchema)

if (result.valid) {
  console.log('Document is valid!')
} else {
  console.error('Validation errors:', result.errors)
}
```

## API Reference

### `defineSchema(schema)`

Define a validation schema for MDXLD documents.

```typescript
function defineSchema(schema: DocumentSchema): DocumentSchema
```

**Schema Options:**

| Option | Type | Description |
|--------|------|-------------|
| `name` | `string` | Schema name/identifier |
| `description` | `string` | Schema description |
| `type` | `string \| string[]` | Required `$type` value(s) |
| `context` | `string` | Required `$context` value |
| `fields` | `Record<string, FieldSchema>` | Frontmatter field schemas |
| `additionalFields` | `boolean` | Allow fields not in schema (default: true) |
| `content` | `ContentSchema` | Content validation rules |

**Example:**

```typescript
import { defineSchema } from '@mdxld/validate'

const articleSchema = defineSchema({
  name: 'Article',
  type: 'Article',
  context: 'https://schema.org',
  fields: {
    title: { type: 'string', required: true, min: 1, max: 200 },
    author: { type: 'string', required: true },
    datePublished: { type: 'date' },
    description: { type: 'string', max: 500 },
    category: { type: 'string', enum: ['tech', 'news', 'opinion'] },
    featured: { type: 'boolean' },
    readTime: { type: 'number', min: 1 },
    tags: {
      type: 'array',
      items: { type: 'string' },
      min: 1,
      max: 10
    },
  },
  additionalFields: false,
  content: {
    minLength: 100,
    requiredPatterns: [/^#\s/], // Must start with heading
  }
})
```

### `validate(document, schema)`

Validate an MDXLD document against a schema.

```typescript
function validate(
  document: MDXLDDocument,
  schema: DocumentSchema
): ValidationResult
```

**Returns:** `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean              // Whether document passed validation
  errors: ValidationError[]   // List of validation errors
  warnings: ValidationError[] // Non-fatal issues
}

interface ValidationError {
  path: string        // Error location (e.g., 'title', '@type')
  message: string     // Error description
  expected?: string   // Expected value/type
  actual?: unknown    // Actual value received
}
```

**Example:**

```typescript
import { parse } from 'mdxld'
import { validate, defineSchema } from '@mdxld/validate'

const schema = defineSchema({
  type: 'BlogPosting',
  fields: {
    title: { type: 'string', required: true },
    author: { type: 'string', required: true },
  }
})

const doc = parse(`---
$type: BlogPosting
title: Hello
---
Content here.
`)

const result = validate(doc, schema)

if (!result.valid) {
  for (const error of result.errors) {
    console.error(`${error.path}: ${error.message}`)
    // "author: Field is required"
  }
}
```

### `validateFrontmatter(frontmatter, fields)`

Validate just the frontmatter fields without document structure.

```typescript
function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  fields: Record<string, FieldSchema>
): ValidationResult
```

**Example:**

```typescript
import { validateFrontmatter } from '@mdxld/validate'

const result = validateFrontmatter(
  { title: 'Hello', count: 'not-a-number' },
  {
    title: { type: 'string', required: true },
    count: { type: 'number', required: true },
  }
)

// result.errors[0]:
// { path: 'count', message: 'Expected number, got string', ... }
```

### `createValidator(schema)`

Create a reusable validator function for a schema.

```typescript
function createValidator(
  schema: DocumentSchema
): (document: MDXLDDocument) => ValidationResult
```

**Example:**

```typescript
import { createValidator, defineSchema } from '@mdxld/validate'

const schema = defineSchema({
  type: 'BlogPosting',
  fields: {
    title: { type: 'string', required: true },
  }
})

const validateBlogPost = createValidator(schema)

// Use multiple times
const result1 = validateBlogPost(doc1)
const result2 = validateBlogPost(doc2)
```

### `isValid(document, schema)`

Simple boolean check if a document is valid.

```typescript
function isValid(document: MDXLDDocument, schema: DocumentSchema): boolean
```

**Example:**

```typescript
import { isValid, schemas } from '@mdxld/validate'

if (isValid(doc, schemas.BlogPosting)) {
  // Document is a valid blog post
}
```

### `assertValid(document, schema)`

Assert that a document is valid, throwing an error if not.

```typescript
function assertValid(document: MDXLDDocument, schema: DocumentSchema): void
```

**Throws:** `Error` with formatted validation messages

**Example:**

```typescript
import { assertValid, defineSchema } from '@mdxld/validate'

try {
  assertValid(doc, schema)
  // Document is valid, continue processing
} catch (error) {
  console.error(error.message)
  // "Document validation failed:
  //  title: Field is required
  //  author: Field is required"
}
```

## Field Types

### `string`

Validates string values with optional length and pattern constraints.

```typescript
{
  type: 'string',
  required: true,
  min: 1,              // Minimum length
  max: 200,            // Maximum length
  pattern: '^[A-Z]',   // Regex pattern
  enum: ['a', 'b'],    // Allowed values
}
```

### `number`

Validates numeric values with optional range constraints.

```typescript
{
  type: 'number',
  required: true,
  min: 0,              // Minimum value
  max: 100,            // Maximum value
}
```

### `boolean`

Validates boolean values.

```typescript
{
  type: 'boolean',
  required: false,
  default: false,
}
```

### `date`

Validates date strings (ISO 8601 format) or Date objects.

```typescript
{
  type: 'date',
  required: true,
}
```

Valid formats:
- `2024-01-15`
- `2024-01-15T10:30:00Z`
- Date objects

### `url`

Validates URL strings.

```typescript
{
  type: 'url',
  required: true,
}
```

### `email`

Validates email addresses.

```typescript
{
  type: 'email',
  required: true,
}
```

### `array`

Validates arrays with optional item schema and length constraints.

```typescript
{
  type: 'array',
  required: true,
  min: 1,              // Minimum items
  max: 10,             // Maximum items
  items: {             // Item schema
    type: 'string'
  }
}
```

### `object`

Validates nested objects with property schemas.

```typescript
{
  type: 'object',
  required: true,
  properties: {
    name: { type: 'string', required: true },
    email: { type: 'email' },
  }
}
```

## Content Validation

Validate the MDX content body:

```typescript
const schema = defineSchema({
  // ...fields
  content: {
    minLength: 100,                    // Minimum character count
    maxLength: 50000,                  // Maximum character count
    requiredPatterns: [
      /^#\s/,                          // Must start with heading
      /\!\[.*\]\(.*\)/,               // Must include an image
    ],
    forbiddenPatterns: [
      /TODO:/,                         // No TODO comments
      /<script>/i,                     // No script tags
    ],
  }
})
```

## Custom Validation

Add custom validation logic to any field:

```typescript
const schema = defineSchema({
  fields: {
    slug: {
      type: 'string',
      required: true,
      validate: (value) => {
        if (!/^[a-z0-9-]+$/.test(value as string)) {
          return 'Slug must contain only lowercase letters, numbers, and hyphens'
        }
        return true
      }
    },
    publishDate: {
      type: 'date',
      validate: (value) => {
        const date = new Date(value as string)
        if (date > new Date()) {
          return 'Publish date cannot be in the future'
        }
        return true
      }
    }
  }
})
```

## Built-in Schemas

Pre-defined schemas for common document types:

### `schemas.BlogPosting`

Schema.org BlogPosting format.

```typescript
import { validate, schemas } from '@mdxld/validate'

const result = validate(doc, schemas.BlogPosting)
```

**Required fields:**
- `title` (string, 1-200 chars)
- `author` (string)
- `datePublished` (date)

**Optional fields:**
- `dateModified` (date)
- `description` (string, max 500)
- `tags` (array of strings)

### `schemas.Article`

Schema.org Article format.

**Required fields:**
- `title` (string)
- `author` (string)

**Optional fields:**
- `datePublished` (date)

### `schemas.HowTo`

Schema.org HowTo format for tutorials/guides.

**Required fields:**
- `name` (string)

**Optional fields:**
- `description` (string)
- `totalTime` (string)

### `schemas.FAQPage`

Schema.org FAQPage format.

**Optional fields:**
- `name` (string)

## Examples

### Blog Post Validation

```typescript
import { parse } from 'mdxld'
import { validate, defineSchema } from '@mdxld/validate'

const blogSchema = defineSchema({
  name: 'BlogPost',
  type: 'BlogPosting',
  context: 'https://schema.org',
  fields: {
    title: { type: 'string', required: true, min: 10, max: 100 },
    slug: {
      type: 'string',
      required: true,
      pattern: '^[a-z0-9-]+$',
      validate: (v) => (v as string).length <= 50 || 'Slug too long'
    },
    author: { type: 'string', required: true },
    datePublished: { type: 'date', required: true },
    category: {
      type: 'string',
      required: true,
      enum: ['tech', 'lifestyle', 'news', 'tutorial']
    },
    tags: { type: 'array', items: { type: 'string' }, min: 1, max: 5 },
    featured: { type: 'boolean' },
    coverImage: { type: 'url' },
  },
  content: {
    minLength: 500,
    requiredPatterns: [/^#\s/],
  }
})

function validateBlogPost(content: string) {
  const doc = parse(content)
  const result = validate(doc, blogSchema)

  if (!result.valid) {
    throw new Error(
      'Invalid blog post:\n' +
      result.errors.map(e => `  - ${e.path}: ${e.message}`).join('\n')
    )
  }

  return doc
}
```

### API Documentation Schema

```typescript
const apiEndpointSchema = defineSchema({
  name: 'APIEndpoint',
  type: 'APIEndpoint',
  fields: {
    path: { type: 'string', required: true, pattern: '^/' },
    method: {
      type: 'string',
      required: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
    },
    summary: { type: 'string', required: true, max: 200 },
    deprecated: { type: 'boolean' },
    authentication: {
      type: 'string',
      enum: ['none', 'api-key', 'oauth', 'jwt']
    },
    parameters: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', required: true },
          in: { type: 'string', enum: ['query', 'path', 'header', 'body'] },
          required: { type: 'boolean' },
          type: { type: 'string' },
        }
      }
    }
  }
})
```

### Validation Pipeline

```typescript
import { parse } from 'mdxld'
import { validate, defineSchema, isValid } from '@mdxld/validate'
import { glob } from 'glob'
import { readFile } from 'fs/promises'

async function validateAllDocs(pattern: string, schema: DocumentSchema) {
  const files = await glob(pattern)
  const results = []

  for (const file of files) {
    const content = await readFile(file, 'utf-8')
    const doc = parse(content)
    const result = validate(doc, schema)

    results.push({
      file,
      valid: result.valid,
      errors: result.errors,
      warnings: result.warnings,
    })
  }

  const invalid = results.filter(r => !r.valid)
  if (invalid.length > 0) {
    console.error(`Found ${invalid.length} invalid documents:`)
    for (const r of invalid) {
      console.error(`\n${r.file}:`)
      for (const e of r.errors) {
        console.error(`  - ${e.path}: ${e.message}`)
      }
    }
    process.exit(1)
  }

  console.log(`All ${results.length} documents are valid!`)
}
```

## Types

### `DocumentSchema`

```typescript
interface DocumentSchema {
  name?: string
  description?: string
  type?: string | string[]
  context?: string
  fields?: Record<string, FieldSchema>
  additionalFields?: boolean
  content?: {
    minLength?: number
    maxLength?: number
    requiredPatterns?: RegExp[]
    forbiddenPatterns?: RegExp[]
  }
}
```

### `FieldSchema`

```typescript
interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'url' | 'email'
  required?: boolean
  default?: unknown
  min?: number
  max?: number
  pattern?: string
  enum?: unknown[]
  items?: FieldSchema      // For arrays
  properties?: Record<string, FieldSchema>  // For objects
  validate?: (value: unknown) => boolean | string
}
```

### `ValidationResult`

```typescript
interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationError[]
}
```

### `ValidationError`

```typescript
interface ValidationError {
  path: string
  message: string
  expected?: string
  actual?: unknown
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | Core parser and stringifier |
| [@mdxld/ast](https://www.npmjs.com/package/@mdxld/ast) | AST manipulation |
| [@mdxld/compile](https://www.npmjs.com/package/@mdxld/compile) | JSX compilation |
| [@mdxld/evaluate](https://www.npmjs.com/package/@mdxld/evaluate) | MDX execution |

## License

MIT

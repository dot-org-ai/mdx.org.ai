# @mdxld/typescript

Generate TypeScript types, Zod schemas, and JSON5 from objects. All outputs are valid TypeScript/JavaScript.

## Installation

```bash
pnpm add @mdxld/typescript
```

## Overview

```typescript
import {
  toTypeScript,
  toZod,
  toJSON5,
  toJSDoc
} from '@mdxld/typescript'

// Object → TypeScript interface
const types = toTypeScript(schema)

// Object → Zod schema
const zodSchema = toZod(schema)

// Object → JSON5 (valid TS!)
const config = toJSON5(data)
```

## API

### toTypeScript(schema, options?)

Generate TypeScript type definitions.

```typescript
function toTypeScript(
  schema: Schema,
  options?: ToTypeScriptOptions
): string

interface ToTypeScriptOptions {
  name?: string              // Root type name
  export?: boolean           // Add export keyword (default: true)
  readonly?: boolean         // Make all properties readonly
  optional?: 'all' | 'none' | 'infer'  // Optional property handling
  comments?: boolean         // Include JSDoc comments (default: true)
  indent?: number            // Indentation spaces (default: 2)
}
```

**Example:**

```typescript
const schema = {
  name: 'Customer',
  properties: [
    { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
    { name: 'email', type: 'string', required: true, description: 'Email address' },
    { name: 'name', type: 'string', required: true },
    { name: 'tier', type: 'string', enum: ['free', 'pro', 'enterprise'], default: 'free' },
    { name: 'metadata', type: 'object' }
  ]
}

const ts = toTypeScript(schema)
```

**Output:**

```typescript
/**
 * Customer
 */
export interface Customer {
  /** Unique identifier */
  id: string
  /** Email address */
  email: string
  name: string
  tier?: 'free' | 'pro' | 'enterprise'
  metadata?: Record<string, unknown>
}
```

### toZod(schema, options?)

Generate Zod schema definitions.

```typescript
function toZod(
  schema: Schema,
  options?: ToZodOptions
): string

interface ToZodOptions {
  name?: string              // Schema variable name
  export?: boolean           // Add export keyword
  strict?: boolean           // Use strict() mode
  coerce?: boolean           // Add coercion for primitives
}
```

**Example:**

```typescript
const zodSchema = toZod(schema)
```

**Output:**

```typescript
import { z } from 'zod'

export const CustomerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  tier: z.enum(['free', 'pro', 'enterprise']).default('free'),
  metadata: z.record(z.unknown()).optional(),
})

export type Customer = z.infer<typeof CustomerSchema>
```

### toJSON5(object, options?)

Convert object to JSON5 (valid JavaScript/TypeScript).

```typescript
function toJSON5(
  object: unknown,
  options?: ToJSON5Options
): string

interface ToJSON5Options {
  indent?: number            // Indentation (default: 2)
  quote?: 'single' | 'double' | 'none'  // String quote style
  trailingComma?: boolean    // Add trailing commas (default: true)
  space?: boolean            // Space after colons (default: true)
}
```

**Example:**

```typescript
const config = {
  name: 'my-app',
  version: '1.0.0',
  database: {
    host: 'localhost',
    port: 5432
  },
  features: ['auth', 'api'],
  // Comments preserved!
  debug: true
}

const json5 = toJSON5(config)
```

**Output:**

```json5
{
  name: 'my-app',
  version: '1.0.0',
  database: {
    host: 'localhost',
    port: 5432,
  },
  features: [
    'auth',
    'api',
  ],
  debug: true,
}
```

This is valid TypeScript! You can:
```typescript
// config.ts
export default {
  name: 'my-app',
  // ... rest of JSON5
} as const
```

### toJSDoc(schema, options?)

Generate JSDoc type definitions (for plain JS).

```typescript
const jsdoc = toJSDoc(schema)
```

**Output:**

```javascript
/**
 * @typedef {Object} Customer
 * @property {string} id - Unique identifier
 * @property {string} email - Email address
 * @property {string} name
 * @property {'free' | 'pro' | 'enterprise'} [tier='free']
 * @property {Object.<string, *>} [metadata]
 */
```

### fromTypeScript(source)

Parse TypeScript interfaces back to schema objects.

```typescript
const schema = fromTypeScript(`
  interface Customer {
    id: string
    email: string
    tier?: 'free' | 'pro'
  }
`)

// { name: 'Customer', properties: [...] }
```

## Use Cases

### Generate Types from MDXLD

```typescript
import { parse } from 'mdxld'
import { toTypeScript } from '@mdxld/typescript'

const doc = parse(`---
$type: BlogPost
title: Hello
author: Jane
tags:
  - tech
  - tutorial
---
`)

const types = toTypeScript({
  name: 'BlogPost',
  properties: Object.entries(doc.data).map(([name, value]) => ({
    name,
    type: typeof value === 'object' ? (Array.isArray(value) ? 'array' : 'object') : typeof value,
    required: true
  }))
})
```

### Config File Generation

```typescript
// Generate typed config
const configSchema = {
  name: 'AppConfig',
  properties: [
    { name: 'port', type: 'number', default: 3000 },
    { name: 'host', type: 'string', default: 'localhost' },
    { name: 'database', type: 'DatabaseConfig' }
  ]
}

// TypeScript types
await Bun.write('src/config.types.ts', toTypeScript(configSchema))

// Zod validation
await Bun.write('src/config.schema.ts', toZod(configSchema))

// Default config (JSON5)
await Bun.write('config.json5', toJSON5(defaultConfig))
```

### API Type Generation

```typescript
import { toTypeScript, toZod } from '@mdxld/typescript'

const endpoints = [
  {
    name: 'CreateCustomer',
    method: 'POST',
    path: '/customers',
    body: { name: 'string', email: 'string' },
    response: 'Customer'
  }
]

// Generate request/response types
for (const endpoint of endpoints) {
  const requestType = toTypeScript({
    name: `${endpoint.name}Request`,
    properties: Object.entries(endpoint.body).map(([name, type]) => ({
      name, type, required: true
    }))
  })

  const zodSchema = toZod({
    name: `${endpoint.name}RequestSchema`,
    properties: Object.entries(endpoint.body).map(([name, type]) => ({
      name, type, required: true
    }))
  })
}
```

### Runtime Validation

```typescript
import { toZod } from '@mdxld/typescript'

// Generate Zod schema at build time
const schemaCode = toZod(mySchema)
await Bun.write('src/schemas/customer.ts', schemaCode)

// Use at runtime
import { CustomerSchema } from './schemas/customer'

function createCustomer(data: unknown) {
  const validated = CustomerSchema.parse(data)
  // validated is now typed as Customer
}
```

## Type Mappings

### Primitive Types

| Schema Type | TypeScript | Zod |
|-------------|------------|-----|
| `string` | `string` | `z.string()` |
| `number` | `number` | `z.number()` |
| `integer` | `number` | `z.number().int()` |
| `boolean` | `boolean` | `z.boolean()` |
| `null` | `null` | `z.null()` |
| `any` | `unknown` | `z.unknown()` |

### Complex Types

| Schema Type | TypeScript | Zod |
|-------------|------------|-----|
| `array` | `T[]` | `z.array(T)` |
| `object` | `Record<string, T>` | `z.record(T)` |
| `enum` | `'a' \| 'b'` | `z.enum(['a', 'b'])` |
| `union` | `A \| B` | `z.union([A, B])` |
| `optional` | `T?` | `T.optional()` |
| `nullable` | `T \| null` | `T.nullable()` |

### Format Hints

| Format | TypeScript | Zod |
|--------|------------|-----|
| `email` | `string` | `z.string().email()` |
| `url` | `string` | `z.string().url()` |
| `uuid` | `string` | `z.string().uuid()` |
| `date` | `Date` | `z.coerce.date()` |
| `datetime` | `Date` | `z.coerce.date()` |

## JSON5 Features

JSON5 extends JSON with JavaScript-friendly features:

```json5
{
  // Comments are allowed
  unquoted: 'keys work',
  'single-quotes': 'for strings',
  trailing: 'commas',  // <- trailing comma OK

  // Numbers
  hex: 0xDEADBEEF,
  leadingDecimal: .5,
  trailingDecimal: 5.,
  infinity: Infinity,
  nan: NaN,

  // Strings
  multiline: 'line 1 \
line 2',
}
```

Since JSON5 is valid JavaScript, you can:

```typescript
// Import directly in TypeScript
import config from './config.json5'

// Or use as a .ts file
export default {
  // JSON5 content
} as const
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/json`](../json) | JSON / JSON-LD / JSON Schema |
| [`@mdxld/yaml`](../yaml) | YAML output |
| [`@mdxld/markdown`](../markdown) | Markdown output |
| [`mdxld`](../../mdxld) | Core MDXLD with typegen CLI |

## License

MIT

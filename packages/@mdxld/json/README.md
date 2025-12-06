# @mdxld/json

Bi-directional conversion between Objects and JSON formats. Supports plain JSON, JSON-LD, JSON Schema, OpenAPI, and more.

## Installation

```bash
pnpm add @mdxld/json
```

## Overview

`@mdxld/json` provides semantic JSON conversion functions:

```typescript
import {
  toJSON, fromJSON,
  toJSONLD, fromJSONLD,
  toJSONSchema,
  toOpenAPI,
  toMCP
} from '@mdxld/json'

// Plain JSON
const json = toJSON(customer)
const obj = fromJSON(json)

// JSON-LD (linked data)
const jsonld = toJSONLD(customer)

// JSON Schema (validation)
const schema = toJSONSchema(CustomerType)

// OpenAPI (API docs)
const spec = toOpenAPI(apiEndpoints)

// MCP (AI tools)
const tools = toMCP(functions)
```

This is the **data layer** - structured output. For styled JSON output, see `@mdxui/json`.

## API

### toJSON / fromJSON

Convert objects to plain JSON and back.

```typescript
function toJSON<T>(object: T, options?: ToJSONOptions): object
function fromJSON<T>(json: object, options?: FromJSONOptions): T
```

**Example:**

```typescript
const customer = {
  name: 'Acme Corp',
  email: 'hello@acme.com',
  tier: 'enterprise'
}

const json = toJSON(customer)
// { "name": "Acme Corp", "email": "hello@acme.com", "tier": "enterprise" }

const obj = fromJSON<Customer>(json)
```

### toJSONLD / fromJSONLD

Convert objects to JSON-LD with Schema.org context.

```typescript
function toJSONLD<T>(
  object: T,
  options?: ToJSONLDOptions
): JSONLDDocument

interface ToJSONLDOptions {
  context?: string | object      // Default: "https://schema.org"
  type?: string                  // @type value
  id?: string                    // @id value
  baseUrl?: string               // Base URL for IDs
}
```

**Example:**

```typescript
const customer = {
  name: 'Acme Corp',
  email: 'hello@acme.com',
  address: {
    street: '123 Main St',
    city: 'San Francisco'
  }
}

const jsonld = toJSONLD(customer, { type: 'Organization' })
```

**Output:**

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Acme Corp",
  "email": "hello@acme.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "San Francisco"
  }
}
```

### toJSONSchema

Generate JSON Schema from type definitions.

```typescript
function toJSONSchema<T>(
  type: T | Schema,
  options?: ToJSONSchemaOptions
): JSONSchema

interface ToJSONSchemaOptions {
  $id?: string                   // Schema $id
  title?: string                 // Schema title
  draft?: '2020-12' | '07'       // JSON Schema draft version
}
```

**Example:**

```typescript
const CustomerType = {
  name: 'Customer',
  properties: [
    { name: 'id', type: 'string', required: true },
    { name: 'email', type: 'string', required: true },
    { name: 'tier', type: 'string', enum: ['free', 'pro', 'enterprise'] }
  ]
}

const schema = toJSONSchema(CustomerType)
```

**Output:**

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "Customer",
  "title": "Customer",
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "tier": {
      "type": "string",
      "enum": ["free", "pro", "enterprise"],
      "default": "free"
    }
  }
}
```

### toOpenAPI

Generate OpenAPI specification from API definitions.

```typescript
function toOpenAPI(
  endpoints: APIEndpoint[],
  options?: ToOpenAPIOptions
): OpenAPISpec

interface ToOpenAPIOptions {
  title?: string
  version?: string
  servers?: Array<{ url: string; description?: string }>
}
```

**Example:**

```typescript
const endpoints = [
  {
    method: 'POST',
    path: '/customers',
    summary: 'Create customer',
    requestBody: {
      properties: [
        { name: 'email', type: 'string', required: true },
        { name: 'name', type: 'string', required: true }
      ]
    },
    responses: [
      { status: 201, description: 'Created', schema: 'Customer' },
      { status: 400, description: 'Validation error' }
    ]
  }
]

const spec = toOpenAPI(endpoints, {
  title: 'Customer API',
  version: '1.0.0'
})
```

**Output:**

```yaml
openapi: 3.1.0
info:
  title: Customer API
  version: 1.0.0
paths:
  /customers:
    post:
      summary: Create customer
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [email, name]
              properties:
                email: { type: string }
                name: { type: string }
      responses:
        '201':
          description: Created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Customer'
        '400':
          description: Validation error
```

### toMCP

Generate MCP (Model Context Protocol) tool definitions.

```typescript
function toMCP(
  functions: FunctionDef[],
  options?: ToMCPOptions
): MCPToolList
```

**Example:**

```typescript
const functions = [
  {
    name: 'read_file',
    description: 'Read contents of a file',
    arguments: [
      { name: 'path', type: 'string', required: true, description: 'File path' },
      { name: 'encoding', type: 'string', description: 'File encoding' }
    ],
    returns: { type: 'string', description: 'File contents' }
  }
]

const tools = toMCP(functions)
```

**Output:**

```json
{
  "tools": [
    {
      "name": "read_file",
      "description": "Read contents of a file",
      "inputSchema": {
        "type": "object",
        "properties": {
          "path": {
            "type": "string",
            "description": "File path"
          },
          "encoding": {
            "type": "string",
            "description": "File encoding"
          }
        },
        "required": ["path"]
      }
    }
  ]
}
```

### toGraphQL

Generate GraphQL SDL from type definitions.

```typescript
function toGraphQL(
  types: TypeDef[],
  options?: ToGraphQLOptions
): string
```

**Example:**

```typescript
const types = [
  {
    name: 'Customer',
    kind: 'type',
    implements: ['Node'],
    fields: [
      { name: 'id', type: 'ID!', description: 'Unique identifier' },
      { name: 'email', type: 'String!', description: 'Email address' },
      { name: 'orders', type: '[Order!]!', arguments: [
        { name: 'first', type: 'Int' },
        { name: 'after', type: 'String' }
      ]}
    ]
  }
]

const sdl = toGraphQL(types)
```

**Output:**

```graphql
"""
Customer
"""
type Customer implements Node {
  "Unique identifier"
  id: ID!

  "Email address"
  email: String!

  orders(first: Int, after: String): [Order!]!
}
```

## Format Mapping

### Object to JSON-LD Type Mapping

| Object Shape | JSON-LD @type |
|--------------|---------------|
| Has `email` + `name` | Person or Organization |
| Has `address` | Place or PostalAddress |
| Has `startDate` | Event |
| Has `ingredients` + `instructions` | Recipe |
| Has `headline` + `author` | Article |
| Has `properties` + `actions` | Class |

### Schema.org Property Mapping

| Object Key | Schema.org Property |
|------------|---------------------|
| `name` | `name` |
| `email` | `email` |
| `phone` | `telephone` |
| `address.street` | `address.streetAddress` |
| `address.city` | `address.addressLocality` |
| `startDate` | `startDate` |
| `endDate` | `endDate` |
| `price` | `offers.price` |

## Use Cases

### SEO / Structured Data

```typescript
// Add JSON-LD to page for SEO
const jsonld = toJSONLD(article, { type: 'Article' })
// <script type="application/ld+json">{jsonld}</script>
```

### API Documentation

```typescript
// Generate OpenAPI from route definitions
const spec = toOpenAPI(routes)
// Serve at /openapi.json
```

### Type Validation

```typescript
// Generate schema for runtime validation
const schema = toJSONSchema(CustomerType)
// Use with Ajv, Zod, etc.
```

### AI Tool Definitions

```typescript
// Generate MCP tools for Claude
const tools = toMCP(functions)
// Use with MCP server
```

### GraphQL Schema

```typescript
// Generate SDL from type definitions
const sdl = toGraphQL(types)
// Use with Apollo, Yoga, etc.
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/typescript`](../typescript) | TypeScript types, Zod schemas, JSON5 |
| [`@mdxld/yaml`](../yaml) | YAML output |
| [`@mdxld/jsx/json`](../jsx) | JSX runtime for JSON output |
| [`@mdxld/jsx/jsonld`](../jsx) | JSX runtime for JSON-LD output |
| [`@mdxui/json`](../../@mdxui/json) | Styled JSON output |
| [`@mdxld/jsonld`](../jsonld) | Core JSON-LD utilities |
| [`@mdxld/markdown`](../markdown) | Object ↔ Markdown conversion |

### Why JSON5 is in @mdxld/typescript

JSON5 is valid JavaScript/TypeScript, so it lives in `@mdxld/typescript`:

```typescript
// Use @mdxld/json for data exchange
import { toJSON, toJSONLD } from '@mdxld/json'

// Use @mdxld/typescript for code-like output
import { toJSON5, toTypeScript, toZod } from '@mdxld/typescript'
```

## License

MIT

# @mdxld/jsonld

Convert between JSON-LD and MDXLD formats. Transform Linked Data vocabulary definitions to Things and Relationships.

## Installation

```bash
npm install @mdxld/jsonld
# or
pnpm add @mdxld/jsonld
# or
yarn add @mdxld/jsonld
```

## Features

- **Format Conversion** - Convert between JSON-LD (@) and MDXLD ($) formats
- **Graph Extraction** - Extract entities from @graph arrays
- **Entity Search** - Find entities by type or ID
- **Vocabulary Parsing** - Convert schema.org to Things + Relationships
- **Utilities** - Helper functions for property manipulation
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { fromJsonLD, toJsonLD, extractGraph, findByType } from '@mdxld/jsonld'

// Convert JSON-LD to MDXLD (@ → $)
const mdxld = fromJsonLD({
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Alice"
})
// { $context: "https://schema.org", $type: "Person", name: "Alice" }

// Convert MDXLD to JSON-LD ($ → @)
const jsonld = toJsonLD({
  $context: "https://schema.org",
  $type: "Person",
  name: "Alice"
})
// { "@context": "https://schema.org", "@type": "Person", "name": "Alice" }

// Extract entities from @graph
const entities = extractGraph(schemaOrgResponse)

// Find entity by type
const person = findByType(schemaOrgResponse, 'Person')
```

## API Reference

### Conversion Functions

#### `fromJsonLD(doc, options?)`

Convert a JSON-LD document to MDXLD format (@ → $).

```typescript
function fromJsonLD(doc: JsonLDDocument, options?: ConversionOptions): MDXLDDocument
```

**Example:**

```typescript
import { fromJsonLD } from '@mdxld/jsonld'

const mdxld = fromJsonLD({
  "@context": "https://schema.org",
  "@type": "Article",
  "@id": "https://example.com/article/1",
  "headline": "My Article",
  "author": {
    "@type": "Person",
    "name": "Jane Doe"
  }
})
// {
//   $context: "https://schema.org",
//   $type: "Article",
//   $id: "https://example.com/article/1",
//   headline: "My Article",
//   author: { $type: "Person", name: "Jane Doe" }
// }
```

#### `toJsonLD(doc, options?)`

Convert an MDXLD document to JSON-LD format ($ → @).

```typescript
function toJsonLD(doc: MDXLDDocument, options?: ConversionOptions): JsonLDDocument
```

**Example:**

```typescript
import { toJsonLD } from '@mdxld/jsonld'

const jsonld = toJsonLD({
  $context: "https://schema.org",
  $type: "BlogPosting",
  title: "Hello World",
  author: "Alice"
})
// {
//   "@context": "https://schema.org",
//   "@type": "BlogPosting",
//   "title": "Hello World",
//   "author": "Alice"
// }
```

### Graph Functions

#### `extractGraph(doc)`

Extract all entities from a JSON-LD @graph array.

```typescript
function extractGraph(doc: JsonLDDocument): JsonLDNode[]
```

**Example:**

```typescript
import { extractGraph } from '@mdxld/jsonld'

const entities = extractGraph({
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Person", "name": "Alice" },
    { "@type": "Person", "name": "Bob" },
    { "@type": "Organization", "name": "ACME" }
  ]
})
// Returns array of 3 entities
```

#### `findByType(doc, type)`

Find an entity by its @type.

```typescript
function findByType(doc: JsonLDDocument, type: string): JsonLDNode | undefined
```

**Example:**

```typescript
import { findByType } from '@mdxld/jsonld'

const person = findByType(schemaDoc, 'Person')
const org = findByType(schemaDoc, 'Organization')
```

#### `findById(doc, id)`

Find an entity by its @id.

```typescript
function findById(doc: JsonLDDocument, id: string): JsonLDNode | undefined
```

**Example:**

```typescript
import { findById } from '@mdxld/jsonld'

const entity = findById(doc, 'https://example.com/person/alice')
```

#### `filterGraph(doc, predicate)`

Filter graph entities by a predicate function.

```typescript
function filterGraph(
  doc: JsonLDDocument,
  predicate: (node: JsonLDNode) => boolean
): JsonLDNode[]
```

**Example:**

```typescript
import { filterGraph } from '@mdxld/jsonld'

const people = filterGraph(doc, (node) => node['@type'] === 'Person')
const named = filterGraph(doc, (node) => 'name' in node)
```

### Vocabulary Conversion

#### `toVocabulary(doc)`

Convert a JSON-LD schema (like schema.org) to Things + Relationships format.

```typescript
function toVocabulary(doc: JsonLDDocument): Vocabulary

interface Vocabulary {
  things: Thing[]
  relationships: RelationshipDef[]
}

interface Thing {
  id: string
  type: string[]
  label: string
  description?: string
  properties: Record<string, unknown>
}

interface RelationshipDef {
  id: string
  from: string
  to: string
  label: string
  description?: string
}
```

**Example:**

```typescript
import { toVocabulary } from '@mdxld/jsonld'

const response = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
const schemaOrg = await response.json()

const vocab = toVocabulary(schemaOrg)
console.log(vocab.things.length)         // 800+ types
console.log(vocab.relationships.length)  // 1400+ properties
```

#### `relationshipsFrom(vocab, type)`

Get all relationships originating from a type.

```typescript
function relationshipsFrom(vocab: Vocabulary, type: string): RelationshipDef[]
```

#### `relationshipsTo(vocab, type)`

Get all relationships pointing to a type.

```typescript
function relationshipsTo(vocab: Vocabulary, type: string): RelationshipDef[]
```

#### `typeHierarchy(vocab, type)`

Get the inheritance hierarchy for a type.

```typescript
function typeHierarchy(vocab: Vocabulary, type: string): string[]
```

#### `allRelationshipsFor(vocab, type)`

Get all relationships for a type including inherited ones.

```typescript
function allRelationshipsFor(vocab: Vocabulary, type: string): RelationshipDef[]
```

### Utility Functions

#### `extractLocalName(uri)`

Extract the local name from a URI.

```typescript
function extractLocalName(uri: string): string
```

**Example:**

```typescript
import { extractLocalName } from '@mdxld/jsonld'

extractLocalName('https://schema.org/Person')  // 'Person'
extractLocalName('http://xmlns.com/foaf/0.1/name')  // 'name'
```

#### `extractRef(value)`

Extract @id reference from a value.

```typescript
function extractRef(value: unknown): string | undefined
```

#### `extractRefs(value)`

Extract multiple @id references.

```typescript
function extractRefs(value: unknown): string[]
```

#### `simplifyPropertyName(uri)`

Simplify a property URI to a readable name.

```typescript
function simplifyPropertyName(uri: string): string
```

#### `stripBaseUrl(uri, base)`

Remove base URL from a URI.

```typescript
function stripBaseUrl(uri: string, base: string): string
```

#### `ensureArray(value)`

Ensure a value is an array.

```typescript
function ensureArray<T>(value: T | T[] | undefined): T[]
```

#### `removeEmptyValues(obj)`

Remove null/undefined values from an object.

```typescript
function removeEmptyValues<T extends object>(obj: T): Partial<T>
```

## Constants

### Keywords

```typescript
import { JSON_LD_KEYWORDS, MDXLD_KEYWORDS, RDF_PREFIXES } from '@mdxld/jsonld'

// JSON-LD keywords
JSON_LD_KEYWORDS  // ['@context', '@type', '@id', '@graph', ...]

// MDXLD keywords
MDXLD_KEYWORDS  // ['$context', '$type', '$id', '$graph', ...]

// Common RDF prefixes
RDF_PREFIXES  // { schema: 'https://schema.org/', rdfs: '...', ... }
```

## Examples

### Converting Schema.org Data

```typescript
import { fromJsonLD, toJsonLD } from '@mdxld/jsonld'

// Fetch schema.org data
const response = await fetch('https://schema.org/Person.jsonld')
const jsonld = await response.json()

// Convert to MDXLD format
const mdxld = fromJsonLD(jsonld)

// Use in MDXLD document
const doc = {
  data: {
    $context: mdxld.$context,
    $type: 'Person',
    name: 'Alice',
    email: 'alice@example.com'
  },
  content: '# About Alice\n\nSome content here.'
}

// Convert back to JSON-LD for export
const exported = toJsonLD(doc.data)
```

### Building a Type Browser

```typescript
import { toVocabulary, relationshipsFrom, typeHierarchy } from '@mdxld/jsonld'

async function buildTypeBrowser() {
  const response = await fetch('https://schema.org/version/latest/schemaorg-current-https.jsonld')
  const schemaOrg = await response.json()

  const vocab = toVocabulary(schemaOrg)

  // Get Person type info
  const personType = vocab.things.find(t => t.label === 'Person')
  console.log('Person:', personType?.description)

  // Get properties that Person can have
  const properties = relationshipsFrom(vocab, 'Person')
  console.log('Properties:', properties.map(r => r.label))

  // Get inheritance hierarchy
  const hierarchy = typeHierarchy(vocab, 'Person')
  console.log('Hierarchy:', hierarchy)  // ['Person', 'Thing']
}
```

### Extracting Embedded JSON-LD

```typescript
import { fromJsonLD, extractGraph } from '@mdxld/jsonld'

async function extractFromWebPage(html: string) {
  // Find JSON-LD script tags
  const scripts = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) || []

  const entities = []

  for (const script of scripts) {
    const jsonMatch = script.match(/<script[^>]*>([\s\S]*?)<\/script>/)
    if (jsonMatch) {
      const jsonld = JSON.parse(jsonMatch[1])

      // Handle @graph or single entity
      const items = extractGraph(jsonld)
      if (items.length > 0) {
        entities.push(...items.map(item => fromJsonLD(item)))
      } else {
        entities.push(fromJsonLD(jsonld))
      }
    }
  }

  return entities
}
```

## Types

### `JsonLDDocument`

```typescript
interface JsonLDDocument {
  "@context"?: string | Record<string, unknown>
  "@type"?: string | string[]
  "@id"?: string
  "@graph"?: JsonLDNode[]
  [key: string]: unknown
}
```

### `MDXLDDocument`

```typescript
interface MDXLDDocument {
  $context?: string | Record<string, unknown>
  $type?: string | string[]
  $id?: string
  $graph?: MDXLDNode[]
  [key: string]: unknown
}
```

### `ConversionOptions`

```typescript
interface ConversionOptions {
  /** Preserve unknown properties */
  preserveUnknown?: boolean
  /** Simplify property names */
  simplifyNames?: boolean
  /** Base URL for relative IDs */
  baseUrl?: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxld/validate](https://www.npmjs.com/package/@mdxld/validate) | Schema validation |
| [@mdxui/json](https://www.npmjs.com/package/@mdxui/json) | JSON rendering |

## License

MIT

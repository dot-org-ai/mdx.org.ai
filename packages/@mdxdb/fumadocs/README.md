# @mdxdb/fumadocs

Fumadocs content source adapter for mdxdb. Use mdxdb as a content source for Fumadocs documentation sites.

## Installation

```bash
npm install @mdxdb/fumadocs
# or
pnpm add @mdxdb/fumadocs
# or
yarn add @mdxdb/fumadocs
```

## Features

- **Content Source** - Use mdxdb documents as Fumadocs content
- **Virtual Files** - Create virtual page and meta files
- **Dynamic Content** - Fetch content on demand with caching
- **Transform Support** - Custom document transformation
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

// Array of [path, document] tuples
const documents = [
  ['/docs/getting-started.mdx', doc1],
  ['/docs/api/reference.mdx', doc2],
]

// Create Fumadocs source
const mdxdbSource = createSource(documents, {
  basePath: 'docs',
})

// Use with Fumadocs loader
export const source = loader({
  source: mdxdbSource,
  baseUrl: '/docs',
})
```

## API Reference

### `createSource(documents, options?)`

Create a Fumadocs source from an array of mdxld documents.

```typescript
function createSource(
  documents: Array<[string, MDXLDDocument]>,
  options?: CreateSourceOptions
): FumadocsSource

interface CreateSourceOptions {
  basePath?: string      // Base path for content (default: '')
  transform?: (doc: MDXLDDocument, path: string) => PageData
  filter?: (doc: MDXLDDocument, path: string) => boolean
  slugs?: (path: string) => string[]
  meta?: Record<string, MetaData>  // Folder meta configuration
}
```

**Example:**

```typescript
import { createSource } from '@mdxdb/fumadocs'

const source = createSource(documents, {
  basePath: 'docs',

  // Custom transformation
  transform: (doc, path) => ({
    title: doc.data.title || 'Untitled',
    description: doc.data.description,
    content: doc.content,
    doc,
  }),

  // Filter documents
  filter: (doc) => doc.data.published !== false,

  // Custom slug generation
  slugs: (path) => path.replace(/\.mdx?$/, '').split('/'),

  // Folder meta configuration
  meta: {
    'getting-started': {
      title: 'Getting Started',
      pages: ['installation', 'quick-start', 'configuration'],
      defaultOpen: true,
    },
  },
})
```

### `createDynamicSource(options)`

Create a dynamic source that fetches content on demand with caching.

```typescript
function createDynamicSource(options: DynamicSourceOptions): {
  getSource(): Promise<FumadocsSource>
  refresh(): Promise<FumadocsSource>
  clearCache(): void
}

interface DynamicSourceOptions extends CreateSourceOptions {
  fetchDocuments: () => Promise<Array<[string, MDXLDDocument]>>
  cacheTTL?: number  // Cache TTL in ms (default: 60000)
}
```

**Example:**

```typescript
import { createDynamicSource } from '@mdxdb/fumadocs'

const dynamicSource = createDynamicSource({
  fetchDocuments: async () => {
    const response = await fetch('/api/docs')
    return response.json()
  },
  cacheTTL: 60000,  // 1 minute
  basePath: 'docs',
})

// Get source (uses cache if valid)
const source = await dynamicSource.getSource()

// Force refresh
await dynamicSource.refresh()

// Clear cache
dynamicSource.clearCache()
```

### `queryToSource(documents, options?)`

Convert mdxdb query results to Fumadocs source.

```typescript
function queryToSource(
  documents: MDXLDDocument[],
  options?: CreateSourceOptions
): FumadocsSource
```

**Example:**

```typescript
import { queryToSource } from '@mdxdb/fumadocs'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })
const { documents } = await db.list({ type: 'Documentation' })

const source = queryToSource(documents, {
  basePath: 'docs',
})
```

### Type Guards

```typescript
import { isPage, isMeta } from '@mdxdb/fumadocs'

for (const file of source.files) {
  if (isPage(file)) {
    console.log('Page:', file.data.title)
  }
  if (isMeta(file)) {
    console.log('Meta:', file.data.title)
  }
}
```

## Types

### `VirtualFile`

Base type for virtual files.

```typescript
interface VirtualFile {
  path: string
  type: 'page' | 'meta'
  data: Record<string, unknown>
  slugs?: string[]
}
```

### `VirtualPage`

Page file with content.

```typescript
interface VirtualPage extends VirtualFile {
  type: 'page'
  data: PageData
}

interface PageData {
  title: string
  description?: string
  icon?: string
  content: string
  doc: MDXLDDocument
  lastModified?: Date
  [key: string]: unknown
}
```

### `VirtualMeta`

Meta file for folder configuration.

```typescript
interface VirtualMeta extends VirtualFile {
  type: 'meta'
  data: MetaData
}

interface MetaData {
  title?: string
  icon?: string
  root?: boolean
  pages?: string[]  // Ordered list of page slugs
  defaultOpen?: boolean
  description?: string
  [key: string]: unknown
}
```

### `FumadocsSource`

Fumadocs-compatible source object.

```typescript
interface FumadocsSource {
  files: VirtualFile[]
}
```

## Examples

### Static Documentation Site

```typescript
// source.ts
import { createSource } from '@mdxdb/fumadocs'
import { createFsDatabase } from '@mdxdb/fs'
import { loader } from 'fumadocs-core/source'

const db = createFsDatabase({ root: './docs' })

export async function getSource() {
  const { documents } = await db.list({ type: 'Documentation' })

  const docTuples = documents.map(doc => [
    doc.id || doc.data.slug,
    doc
  ] as [string, typeof doc])

  const mdxdbSource = createSource(docTuples, {
    basePath: 'docs',
    meta: {
      'guides': {
        title: 'Guides',
        pages: ['getting-started', 'configuration', 'deployment'],
      },
      'api': {
        title: 'API Reference',
        defaultOpen: false,
      },
    },
  })

  return loader({
    source: mdxdbSource,
    baseUrl: '/docs',
  })
}
```

### Dynamic Content from API

```typescript
import { createDynamicSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

const dynamicSource = createDynamicSource({
  fetchDocuments: async () => {
    const response = await fetch(`${process.env.API_URL}/docs`)
    const { documents } = await response.json()
    return documents.map(doc => [doc.slug, doc])
  },
  cacheTTL: 5 * 60 * 1000,  // 5 minutes
  basePath: 'docs',
})

export async function getSource() {
  const fumadocsSource = await dynamicSource.getSource()

  return loader({
    source: fumadocsSource,
    baseUrl: '/docs',
  })
}

// Webhook handler for cache invalidation
export async function handleContentUpdate() {
  await dynamicSource.refresh()
}
```

### Filtered Content

```typescript
import { createSource } from '@mdxdb/fumadocs'

const source = createSource(documents, {
  basePath: 'docs',

  // Only include published docs
  filter: (doc) => {
    if (doc.data.draft === true) return false
    if (doc.data.publishedAt) {
      return new Date(doc.data.publishedAt) <= new Date()
    }
    return true
  },

  // Custom transformation
  transform: (doc, path) => ({
    title: doc.data.title,
    description: doc.data.description,
    icon: doc.data.icon,
    content: doc.content,
    doc,
    // Add additional metadata
    author: doc.data.author,
    lastUpdated: doc.data.updatedAt,
    tags: doc.data.tags || [],
  }),
})
```

### Multi-language Docs

```typescript
import { createSource } from '@mdxdb/fumadocs'

// Group documents by language
const enDocs = documents.filter(([path]) => path.startsWith('/en/'))
const esDocs = documents.filter(([path]) => path.startsWith('/es/'))

const enSource = createSource(enDocs, {
  basePath: 'en',
  slugs: (path) => path.replace('/en/', '').replace(/\.mdx?$/, '').split('/'),
})

const esSource = createSource(esDocs, {
  basePath: 'es',
  slugs: (path) => path.replace('/es/', '').replace(/\.mdx?$/, '').split('/'),
})
```

## Integration with mdxdb Backends

### Filesystem

```typescript
import { createFsDatabase } from '@mdxdb/fs'
import { queryToSource } from '@mdxdb/fumadocs'

const db = createFsDatabase({ root: './content/docs' })
const { documents } = await db.list()

const source = queryToSource(documents, { basePath: 'docs' })
```

### SQLite

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'
import { createSource } from '@mdxdb/fumadocs'

const db = await createSqliteDatabase({ url: './docs.db' })
const things = await db.list({ type: 'Documentation' })

const docTuples = things.map(thing => [
  thing.id,
  {
    id: thing.id,
    type: thing.type,
    data: thing.data,
    content: thing.data.content || '',
  }
])

const source = createSource(docTuples)
```

### Remote API

```typescript
import { createApiClient } from 'mdxdb'
import { queryToSource } from '@mdxdb/fumadocs'

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: process.env.API_KEY,
})

const { documents } = await client.list({ type: 'Documentation' })
const source = queryToSource(documents)
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |
| [fumadocs-core](https://www.npmjs.com/package/fumadocs-core) | Fumadocs core library |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |

## License

MIT

# mdxdb

Create, manage, and publish MDX & URL-centric databases. Provides a unified interface for document storage with support for multiple backends including filesystem, SQLite, PostgreSQL, MongoDB, and ClickHouse.

## Installation

```bash
npm install mdxdb
# or
pnpm add mdxdb
# or
yarn add mdxdb
```

## Features

- **Multiple Backends** - Filesystem, SQLite, PostgreSQL, MongoDB, ClickHouse
- **URL-Centric** - Documents identified by URLs/paths
- **MDX Native** - First-class support for MDX documents with frontmatter
- **Semantic Search** - Built-in vector search capabilities
- **Graph Database** - Things + Relationships model
- **API Client** - Connect to remote mdxdb servers
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createDBClient, MemoryDBClient } from 'mdxdb'
import { createFsDatabase } from '@mdxdb/fs'
import { createSqliteDatabase } from '@mdxdb/sqlite'

// In-memory database for testing
const db = new MemoryDBClient()

// Filesystem-based database
const fsDb = await createFsDatabase({ basePath: './data' })

// SQLite database
const sqliteDb = await createSqliteDatabase({ filename: './db.sqlite' })

// Store a document
await db.set('users/john', {
  $type: 'User',
  name: 'John Doe',
  email: 'john@example.com'
})

// Retrieve document
const user = await db.get('users/john')

// List documents
const users = await db.list({ type: 'User', limit: 100 })

// Search documents
const results = await db.search({ query: 'john', semantic: true })

// Delete document
await db.delete('users/john')
```

## API Reference

### Database Interface

All database implementations share a common interface:

```typescript
interface Database {
  list(options?: ListOptions): Promise<ListResult>
  search(options?: SearchOptions): Promise<SearchResult>
  get(id: string, options?: GetOptions): Promise<MDXLDDocument | null>
  set(id: string, doc: unknown, options?: SetOptions): Promise<SetResult>
  delete(id: string, options?: DeleteOptions): Promise<DeleteResult>
  close?(): Promise<void>
}
```

### `list(options?)`

List documents with optional filtering.

```typescript
interface ListOptions {
  type?: string      // Filter by $type
  prefix?: string    // Filter by URL prefix
  limit?: number     // Maximum results (default: 100)
  offset?: number    // Pagination offset
  sort?: 'asc' | 'desc'  // Sort order
}

interface ListResult {
  documents: MDXLDDocument[]
  total: number
  hasMore: boolean
}
```

**Example:**

```typescript
// List all users
const users = await db.list({ type: 'User' })

// List documents in a path
const posts = await db.list({ prefix: 'blog/', limit: 10 })

// Paginate
const page2 = await db.list({ type: 'Post', limit: 10, offset: 10 })
```

### `search(options)`

Search documents with optional semantic search.

```typescript
interface SearchOptions {
  query: string       // Search query
  type?: string       // Filter by $type
  semantic?: boolean  // Use vector search (default: false)
  limit?: number      // Maximum results (default: 10)
  threshold?: number  // Similarity threshold for semantic search
}

interface SearchResult {
  documents: Array<MDXLDDocument & { score?: number }>
  total: number
}
```

**Example:**

```typescript
// Text search
const results = await db.search({ query: 'getting started' })

// Semantic search
const similar = await db.search({
  query: 'how do I begin?',
  semantic: true,
  limit: 5
})

// Filter by type
const posts = await db.search({
  query: 'typescript',
  type: 'BlogPost',
  semantic: true
})
```

### `get(id, options?)`

Get a single document by ID/URL.

```typescript
interface GetOptions {
  includeContent?: boolean  // Include MDX content (default: true)
  includeEmbedding?: boolean // Include embedding vector
}
```

**Example:**

```typescript
const doc = await db.get('users/john')
if (doc) {
  console.log(doc.data.name)  // 'John Doe'
  console.log(doc.type)       // 'User'
}

// Metadata only
const meta = await db.get('users/john', { includeContent: false })
```

### `set(id, doc, options?)`

Create or update a document.

```typescript
interface SetOptions {
  upsert?: boolean       // Create if not exists (default: true)
  generateEmbedding?: boolean  // Generate search embedding
}

interface SetResult {
  id: string
  created: boolean
  updated: boolean
}
```

**Example:**

```typescript
// Create document
await db.set('posts/hello-world', {
  $type: 'BlogPost',
  title: 'Hello World',
  author: 'Jane Doe',
  publishedAt: '2024-01-15',
  tags: ['intro', 'tutorial']
}, {
  generateEmbedding: true
})

// Update document
await db.set('posts/hello-world', {
  $type: 'BlogPost',
  title: 'Hello World (Updated)',
  // ... other fields
})
```

### `delete(id, options?)`

Delete a document.

```typescript
interface DeleteOptions {
  soft?: boolean  // Soft delete (default: false)
}

interface DeleteResult {
  deleted: boolean
  id: string
}
```

**Example:**

```typescript
const result = await db.delete('posts/old-post')
console.log(result.deleted)  // true

// Soft delete
await db.delete('users/john', { soft: true })
```

### DBClient (Graph Interface)

Extended interface following ai-database conventions with Things + Relationships model.

```typescript
import { createDBClient } from 'mdxdb'

const client = createDBClient(database)

// Create a Thing
await client.create('users/john', {
  type: 'User',
  data: { name: 'John Doe' }
})

// Create relationship
await client.relate('users/john', 'users/jane', 'follows')

// Query with relationships
const user = await client.get('users/john', {
  includeRelationships: true
})
```

### API Client

Connect to remote mdxdb servers.

```typescript
import { createApiClient } from 'mdxdb'

const client = createApiClient({
  baseUrl: 'https://api.example.com',
  apiKey: 'your-api-key'
})

// Use same interface as local database
const doc = await client.get('users/john')
await client.set('users/jane', { name: 'Jane' })
```

## Database Backends

### Filesystem (`@mdxdb/fs`)

Store documents as MDX files on disk.

```typescript
import { createFsDatabase } from '@mdxdb/fs'

const db = await createFsDatabase({
  basePath: './content',
  watch: true  // Watch for changes
})
```

### SQLite (`@mdxdb/sqlite`)

SQLite-based storage with FTS5 search.

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = await createSqliteDatabase({
  filename: './data.db',
  // or ':memory:' for in-memory
})
```

### PostgreSQL (`@mdxdb/postgres`)

PostgreSQL with pgvector for semantic search.

```typescript
import { createPostgresDatabase } from '@mdxdb/postgres'

const db = await createPostgresDatabase({
  connectionString: 'postgresql://...',
})
```

### MongoDB (`@mdxdb/mongo`)

MongoDB document storage.

```typescript
import { createMongoDatabase } from '@mdxdb/mongo'

const db = await createMongoDatabase({
  uri: 'mongodb://...',
  database: 'myapp'
})
```

### ClickHouse (`@mdxdb/clickhouse`)

ClickHouse for analytics workloads.

```typescript
import { createClickhouseDatabase } from '@mdxdb/clickhouse'

const db = await createClickhouseDatabase({
  url: 'http://localhost:8123',
  database: 'myapp'
})
```

## URL Utilities

```typescript
import { resolveUrl, resolveShortUrl, parseUrl } from 'mdxdb'

// Resolve relative URLs
const full = resolveUrl('posts/hello', 'https://example.com')
// 'https://example.com/posts/hello'

// Short URL resolution
const expanded = resolveShortUrl('example.com/hello')
// 'https://example.com/hello'

// Parse URL components
const parsed = parseUrl('https://example.com/posts/hello')
// { protocol: 'https:', host: 'example.com', path: '/posts/hello' }
```

## Types

### `Thing`

Core entity type in the graph model.

```typescript
interface Thing<T = Record<string, unknown>> {
  id: EntityId           // URL or path identifier
  type?: string          // $type value
  data: T                // Document data
  content?: string       // MDX content
  embedding?: number[]   // Vector embedding
  createdAt?: Date
  updatedAt?: Date
  relationships?: Relationship[]
}
```

### `Relationship`

Connection between Things.

```typescript
interface Relationship<T = Record<string, unknown>> {
  id: string
  type: string           // Relationship type (e.g., 'follows', 'authored')
  from: EntityId         // Source Thing
  to: EntityId           // Target Thing
  data?: T               // Relationship metadata
  createdAt: Date
}
```

### `MDXLDDocument`

Document with MDX content and Linked Data frontmatter.

```typescript
interface MDXLDDocument<T = Record<string, unknown>> {
  id?: string            // $id
  type?: string          // $type
  context?: string       // $context
  data: T                // Frontmatter data
  content: string        // MDX content
}
```

## Examples

### Blog with Categories

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = await createSqliteDatabase({ filename: './blog.db' })

// Create categories
await db.set('categories/tech', {
  $type: 'Category',
  name: 'Technology',
  slug: 'tech'
})

// Create post
await db.set('posts/hello-world', {
  $type: 'BlogPost',
  title: 'Hello World',
  category: 'categories/tech',
  author: 'Jane Doe',
  publishedAt: '2024-01-15',
  tags: ['intro', 'tutorial']
})

// List posts by category
const techPosts = await db.list({
  type: 'BlogPost',
  // Custom filter in search
})

// Search posts
const results = await db.search({
  query: 'typescript tutorial',
  type: 'BlogPost',
  semantic: true
})
```

### User Management

```typescript
// Create user
await db.set('users/john', {
  $type: 'User',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin',
  createdAt: new Date().toISOString()
})

// Update user
const user = await db.get('users/john')
await db.set('users/john', {
  ...user.data,
  lastLogin: new Date().toISOString()
})

// Delete user
await db.delete('users/john')
```

### Full-Text Search

```typescript
// Index documents with embeddings
await db.set('docs/getting-started', {
  $type: 'Document',
  title: 'Getting Started',
  content: 'Welcome to our documentation...'
}, {
  generateEmbedding: true
})

// Semantic search
const results = await db.search({
  query: 'how do I begin using the API?',
  semantic: true,
  limit: 5
})

for (const doc of results.documents) {
  console.log(`${doc.data.title} (score: ${doc.score})`)
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite backend |
| [@mdxdb/postgres](https://www.npmjs.com/package/@mdxdb/postgres) | PostgreSQL backend |
| [@mdxdb/mongo](https://www.npmjs.com/package/@mdxdb/mongo) | MongoDB backend |
| [@mdxdb/clickhouse](https://www.npmjs.com/package/@mdxdb/clickhouse) | ClickHouse backend |
| [@mdxdb/api](https://www.npmjs.com/package/@mdxdb/api) | REST API server |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |

## License

MIT

# @mdxdb/sqlite

libSQL/SQLite adapter for mdxdb with graph database features and vector search support. Works with local SQLite files, in-memory databases, and remote Turso databases.

## Installation

```bash
npm install @mdxdb/sqlite
# or
pnpm add @mdxdb/sqlite
# or
yarn add @mdxdb/sqlite
```

## Features

- **Graph Database** - Things (nodes) + Relationships (edges) model
- **Vector Search** - Semantic search with embeddings
- **Multiple Storage** - Local files, in-memory, or remote Turso
- **Event Sourcing** - Track events, actions, and artifacts
- **Content Chunking** - Automatic content chunking for embeddings
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'

// Local file database
const db = await createSqliteDatabase({ url: './data.db' })

// In-memory database (great for testing)
const memDb = await createSqliteDatabase({ url: ':memory:' })

// Remote Turso database
const tursoDb = await createSqliteDatabase({
  url: 'libsql://your-db.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// Create a thing (node)
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: { name: 'Alice', email: 'alice@example.com' }
})

// Create a relationship (edge)
await db.relate({
  type: 'follows',
  from: user.url,
  to: 'https://example.com/User/bob'
})

// Search things
const results = await db.search({ query: 'Alice' })

// Get related things
const following = await db.related(user.url, 'follows')
```

## API Reference

### `createSqliteDatabase(config)`

Create a SQLite database instance.

```typescript
async function createSqliteDatabase<TData>(
  config: SqliteDatabaseConfig
): Promise<SqliteDatabase<TData>>

interface SqliteDatabaseConfig {
  url: string                    // Database URL or file path
  authToken?: string             // Turso auth token (for remote)
  embedFn?: (text: string) => Promise<number[]>  // Embedding function
  chunkSize?: number             // Content chunk size (default: 1000)
  chunkOverlap?: number          // Chunk overlap (default: 200)
  embeddingDimension?: number    // Embedding dimension (default: 1536)
}
```

**Example:**

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'

// With vector search
const db = await createSqliteDatabase({
  url: './data.db',
  embedFn: async (text) => {
    // Your embedding function (OpenAI, Cloudflare, etc.)
    return await embed(text)
  },
  embeddingDimension: 1536
})

// Remote Turso with auth
const tursoDb = await createSqliteDatabase({
  url: 'libsql://your-db.turso.io',
  authToken: 'eyJ...',
})
```

### Thing Operations

#### `list(options?)`

List things with filtering and pagination.

```typescript
interface QueryOptions {
  ns?: string           // Namespace filter
  type?: string         // Type filter
  where?: Record<string, unknown>  // Field filters
  orderBy?: string      // Sort field
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}
```

**Example:**

```typescript
// List all users
const users = await db.list({ type: 'User' })

// Filter by namespace
const myAppUsers = await db.list({
  ns: 'myapp.com',
  type: 'User'
})

// Filter by field
const activeUsers = await db.list({
  type: 'User',
  where: { status: 'active' }
})
```

#### `search(options)`

Search things with optional semantic search.

```typescript
interface ThingSearchOptions {
  query: string        // Search query
  ns?: string          // Namespace filter
  type?: string        // Type filter
  limit?: number
  offset?: number
  minScore?: number    // Minimum similarity score
}
```

**Example:**

```typescript
// Text search
const results = await db.search({ query: 'machine learning' })

// Filter by type
const posts = await db.search({
  query: 'typescript',
  type: 'BlogPost'
})
```

#### `get(url)` / `getById(ns, type, id)`

Get a thing by URL or ID components.

```typescript
// By URL
const user = await db.get('https://example.com/User/alice')

// By ID components
const user = await db.getById('example.com', 'User', 'alice')
```

#### `create(options)`

Create a new thing.

```typescript
interface CreateOptions<TData> {
  ns: string            // Namespace
  type: string          // Type
  id?: string           // ID (auto-generated if not provided)
  url?: string          // Full URL (computed if not provided)
  data: TData           // Thing data
  '@context'?: unknown  // JSON-LD context
}
```

**Example:**

```typescript
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: {
    name: 'Alice',
    email: 'alice@example.com'
  }
})

console.log(user.url)  // 'https://example.com/User/lq8x3_abc1234'
```

#### `update(url, options)`

Update an existing thing.

```typescript
const updated = await db.update(user.url, {
  data: { name: 'Alice Smith' }
})
```

#### `upsert(options)`

Create or update a thing.

```typescript
const user = await db.upsert({
  ns: 'example.com',
  type: 'User',
  id: 'alice',
  data: { name: 'Alice', status: 'active' }
})
```

#### `set(url, data)`

Set data directly by URL.

```typescript
await db.set('https://example.com/User/alice', {
  name: 'Alice Smith',
  email: 'alice@example.com'
})
```

#### `delete(url)`

Delete a thing and its relationships.

```typescript
const deleted = await db.delete('https://example.com/User/alice')
console.log(deleted)  // true
```

### Relationship Operations

#### `relate(options)`

Create a relationship between things.

```typescript
interface RelateOptions<T> {
  type: string        // Relationship type
  from: string        // Source thing URL
  to: string          // Target thing URL
  data?: T            // Relationship data
}
```

**Example:**

```typescript
// Simple relationship
await db.relate({
  type: 'follows',
  from: 'https://example.com/User/alice',
  to: 'https://example.com/User/bob'
})

// With relationship data
await db.relate({
  type: 'likes',
  from: 'https://example.com/User/alice',
  to: 'https://example.com/Post/hello',
  data: { likedAt: new Date().toISOString() }
})
```

#### `unrelate(from, type, to)`

Remove a relationship.

```typescript
await db.unrelate(
  'https://example.com/User/alice',
  'follows',
  'https://example.com/User/bob'
)
```

#### `related(url, type?, direction?)`

Get related things.

```typescript
// Get things this user follows
const following = await db.related(user.url, 'follows', 'from')

// Get things that follow this user
const followers = await db.related(user.url, 'follows', 'to')

// Get all related things (both directions)
const all = await db.related(user.url, 'follows', 'both')
```

#### `relationships(url, type?, direction?)`

Get relationship objects (not the things).

```typescript
const rels = await db.relationships(user.url, 'follows')
// [{ id, type, from, to, createdAt, data }]
```

#### `references(url, type?)`

Get things that reference this thing (incoming relationships).

```typescript
const refs = await db.references(postUrl)
```

### Vector Search

#### `vectorSearch(options)`

Perform semantic vector search.

```typescript
interface VectorSearchOptions {
  query: string         // Search query (will be embedded)
  limit?: number        // Maximum results
  minScore?: number     // Minimum similarity score
  type?: string         // Filter by type
  ns?: string           // Filter by namespace
  thingUrls?: string[]  // Limit to specific things
}

interface VectorSearchResult {
  content: string       // Matched chunk content
  score: number         // Similarity score (0-1)
  thingUrl: string      // Source thing URL
  chunkIndex: number    // Chunk index
  metadata?: unknown    // Chunk metadata
}
```

**Example:**

```typescript
// Configure with embedding function
const db = await createSqliteDatabase({
  url: './data.db',
  embedFn: async (text) => {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    })
    return response.data[0].embedding
  }
})

// Semantic search
const results = await db.vectorSearch({
  query: 'how do I get started with the API?',
  limit: 5,
  minScore: 0.7
})

for (const result of results) {
  console.log(`Score: ${result.score}`)
  console.log(`Content: ${result.content}`)
  console.log(`From: ${result.thingUrl}`)
}
```

### Event Sourcing

#### `track(options)` - Events

Track immutable events for analytics.

```typescript
interface CreateEventOptions<T> {
  type: string          // Event type
  source: string        // Event source
  data: T               // Event data
  correlationId?: string
  causationId?: string
}

const event = await db.track({
  type: 'User.signup',
  source: 'web',
  data: { userId: 'alice', plan: 'pro' }
})
```

#### `send(options)` - Actions

Send an action (fire-and-forget, pending state).

```typescript
const action = await db.send({
  actor: 'user:alice',
  object: 'document:report.pdf',
  action: 'review'
})
```

#### `do(options)` - Actions

Do an action (create and immediately start).

```typescript
const action = await db.do({
  actor: 'system',
  object: 'file.pdf',
  action: 'process'
})
// action.status === 'active'
```

#### `try(options, fn)` - Actions

Try an action with automatic error handling.

```typescript
const action = await db.try(
  { actor: 'system', object: 'report.pdf', action: 'generate' },
  async () => {
    // Your processing logic
    return { pages: 10, size: 1024 }
  }
)
// action.status === 'completed' or 'failed'
```

#### Action State Management

```typescript
// Start a pending action
await db.startAction(actionId)

// Complete with result
await db.completeAction(actionId, { output: 'success' })

// Fail with error
await db.failAction(actionId, 'Processing failed')

// Cancel
await db.cancelAction(actionId)

// Query actions
const pending = await db.queryActions({
  status: 'pending',
  actor: 'user:alice'
})
```

### Artifact Storage

Cache compiled content or other artifacts.

```typescript
// Store artifact
const artifact = await db.storeArtifact({
  key: 'compiled:doc.mdx',
  type: 'compiled',
  source: 'doc.mdx',
  sourceHash: 'abc123',
  content: { code: '...' },
  ttl: 3600000  // 1 hour
})

// Get artifact
const cached = await db.getArtifact('compiled:doc.mdx')

// Get by source
const bySource = await db.getArtifactBySource('doc.mdx', 'compiled')

// Clean expired
const cleaned = await db.cleanExpiredArtifacts()
```

## Schema

The database creates these tables:

- **things** - Graph nodes with URL, namespace, type, data
- **relationships** - Graph edges between things
- **search** - Chunked content with vector embeddings
- **events** - Immutable event log
- **actions** - Pending/active work tracking
- **artifacts** - Cached compiled content

## Examples

### Social Network

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = await createSqliteDatabase({ url: './social.db' })

// Create users
const alice = await db.create({
  ns: 'social.app',
  type: 'User',
  data: { name: 'Alice', bio: 'Software engineer' }
})

const bob = await db.create({
  ns: 'social.app',
  type: 'User',
  data: { name: 'Bob', bio: 'Designer' }
})

// Create follow relationship
await db.relate({
  type: 'follows',
  from: alice.url,
  to: bob.url
})

// Create a post
const post = await db.create({
  ns: 'social.app',
  type: 'Post',
  data: { content: 'Hello world!', authorId: alice.id }
})

// Like the post
await db.relate({
  type: 'likes',
  from: alice.url,
  to: post.url,
  data: { likedAt: new Date().toISOString() }
})

// Get who Alice follows
const following = await db.related(alice.url, 'follows')

// Get Alice's posts
const posts = await db.list({
  type: 'Post',
  where: { authorId: alice.id }
})
```

### Knowledge Base with Semantic Search

```typescript
import { createSqliteDatabase } from '@mdxdb/sqlite'
import { embed } from './embeddings'

const db = await createSqliteDatabase({
  url: './knowledge.db',
  embedFn: embed,
  chunkSize: 500,
  chunkOverlap: 100
})

// Add documents
await db.create({
  ns: 'docs.myapp.com',
  type: 'Document',
  data: {
    title: 'Getting Started',
    content: 'This guide shows you how to...',
    category: 'tutorials'
  }
})

// Semantic search
const results = await db.vectorSearch({
  query: 'how do I configure authentication?',
  type: 'Document',
  limit: 5
})
```

## Types

### `Thing`

```typescript
interface Thing<TData = Record<string, unknown>> {
  ns: string           // Namespace (domain)
  type: string         // Type name
  id: string           // Unique ID
  url: string          // Full URL
  data: TData          // Thing data
  createdAt: Date
  updatedAt: Date
  '@context'?: unknown // JSON-LD context
}
```

### `Relationship`

```typescript
interface Relationship<T = Record<string, unknown>> {
  id: string
  type: string         // Relationship type
  from: string         // Source URL
  to: string           // Target URL
  createdAt: Date
  data?: T             // Relationship data
}
```

### `Event`

```typescript
interface Event<T = Record<string, unknown>> {
  id: string
  type: string
  timestamp: Date
  source: string
  data: T
  correlationId?: string
  causationId?: string
}
```

### `Action`

```typescript
interface Action<T = Record<string, unknown>> {
  id: string
  actor: string
  object: string
  action: string
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  metadata?: T
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |
| [@mdxdb/clickhouse](https://www.npmjs.com/package/@mdxdb/clickhouse) | ClickHouse backend |
| [@mdxdb/api](https://www.npmjs.com/package/@mdxdb/api) | REST API server |
| [@libsql/client](https://www.npmjs.com/package/@libsql/client) | libSQL client |

## License

MIT

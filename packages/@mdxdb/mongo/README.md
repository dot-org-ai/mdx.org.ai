# @mdxdb/mongo

MongoDB adapter for mdxdb with Atlas Vector Search support.

## Features

- **MongoDB Backend** - Store MDX documents in MongoDB (local or Atlas)
- **Atlas Vector Search** - Semantic search with vector embeddings
- **Graph Operations** - Store and query relationships between entities
- **Event Sourcing** - Immutable event log for audit trails
- **Action Tracking** - Track pending/active/completed actions
- **Artifact Caching** - Cache compiled content with TTL
- **Full-Text Search** - MongoDB text index for content search
- **Type-Safe** - Full TypeScript support with DBClientExtended interface

## Installation

```bash
npm install @mdxdb/mongo
# or
pnpm add @mdxdb/mongo
# or
yarn add @mdxdb/mongo
```

## Usage

### Basic Setup

```typescript
import { createMongoDatabase } from '@mdxdb/mongo'

// Connect to local MongoDB
const db = await createMongoDatabase({
  url: 'mongodb://localhost:27017',
  database: 'myapp',
})

// Connect to MongoDB Atlas
const atlasDb = await createMongoDatabase({
  url: 'mongodb+srv://user:pass@cluster.mongodb.net',
  database: 'myapp',
})
```

### CRUD Operations

```typescript
// Create a thing
const post = await db.create({
  ns: 'example.com',
  type: 'Post',
  data: {
    title: 'Hello World',
    content: 'My first post',
    author: 'Alice',
  },
})

// Get by URL
const retrieved = await db.get(post.url)

// Update
const updated = await db.update(post.url, {
  data: { title: 'Updated Title' },
})

// List with filters
const posts = await db.list({
  type: 'Post',
  where: { author: 'Alice' },
  limit: 10,
})

// Search
const results = await db.search({
  query: 'hello',
  type: 'Post',
})
```

### Relationships

```typescript
// Create relationship
await db.relate({
  type: 'author',
  from: post.url,
  to: user.url,
})

// Query related things
const authors = await db.related(post.url, 'author')

// Get all relationships
const rels = await db.relationships(post.url)
```

### Events

```typescript
// Track an event
await db.track({
  type: 'User.visited',
  source: 'web',
  data: { userId: '123', page: '/home' },
  correlationId: 'session-123',
})

// Query events
const events = await db.queryEvents({
  type: 'User.visited',
  after: new Date('2024-01-01'),
  limit: 100,
})
```

### Actions

```typescript
// Send an action (fire-and-forget)
await db.send({
  actor: 'user:123',
  object: post.url,
  action: 'review',
})

// Do an action (create and start)
const action = await db.do({
  actor: 'system',
  object: 'file.pdf',
  action: 'process',
})

// Try an action (with error handling)
await db.try(
  {
    actor: 'system',
    object: 'file.pdf',
    action: 'convert',
  },
  async () => {
    // Your processing logic
    return { pages: 10 }
  }
)

// Query actions
const pending = await db.queryActions({
  status: 'pending',
  limit: 50,
})
```

### Artifacts

```typescript
// Store a compiled artifact
await db.storeArtifact({
  key: 'post-123:esm',
  type: 'esm',
  source: post.url,
  sourceHash: 'abc123',
  content: { code: '...' },
  ttl: 3600000, // 1 hour
})

// Get artifact
const artifact = await db.getArtifact('post-123:esm')

// Clean expired artifacts
const count = await db.cleanExpiredArtifacts()
```

### Search

```typescript
// Index content for search
await db.indexForSearch({
  url: post.url,
  ns: 'example.com',
  type: 'Post',
  title: 'My Post',
  description: 'A great post',
  content: 'Full text content...',
  keywords: ['machine-learning', 'ai'],
  embedding: [0.1, 0.2, ...], // Optional vector for semantic search
  model: 'text-embedding-3-small',
})

// Full-text search
const textResults = await db.fullTextSearch('machine learning', {
  type: 'Post',
  limit: 10,
})

// Vector search (requires MongoDB Atlas with vector search index)
const vectorResults = await db.vectorSearch(queryEmbedding, {
  limit: 10,
  minScore: 0.7,
})

// Hybrid search (combines text + vector)
const hybrid = await db.hybridSearch('AI tutorial', queryEmbedding, {
  textWeight: 0.3,
  vectorWeight: 0.7,
})
```

## MongoDB Atlas Vector Search Setup

To use vector search, you need to configure a vector search index in MongoDB Atlas:

1. Create an Atlas cluster
2. Navigate to Atlas Search
3. Create a new search index with this configuration:

```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      },
      "ns": {
        "type": "string"
      },
      "type": {
        "type": "string"
      }
    }
  }
}
```

## Architecture

The MongoDB adapter implements the `DBClientExtended` interface from `ai-database`, providing:

- **Things** - Entities/nodes stored in the `things` collection
- **Relationships** - Edges/connections in the `relationships` collection
- **Events** - Immutable event log in the `events` collection
- **Actions** - Workflow tracking in the `actions` collection
- **Artifacts** - Cached content in the `artifacts` collection
- **Search** - Indexed content in the `search` collection

All collections are automatically indexed for optimal query performance.

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite/Durable Objects backend |
| [@mdxdb/clickhouse](https://www.npmjs.com/package/@mdxdb/clickhouse) | ClickHouse analytics backend |
| [@mdxdb/postgres](https://www.npmjs.com/package/@mdxdb/postgres) | PostgreSQL backend |

## License

MIT

# @mdxdb/postgres

PostgreSQL adapter for mdxdb with pgvector support for semantic search.

## Features

- **Graph Storage**: Things (nodes) and Relationships (edges) following ai-database conventions
- **Vector Search**: Semantic search using pgvector extension
- **Full-Text Search**: PostgreSQL's built-in text search with ranking
- **Hybrid Search**: Combine full-text and vector search with configurable weights
- **Event Sourcing**: Immutable event log for analytics
- **Action Tracking**: Durable action/workflow tracking with status management
- **Artifact Caching**: Compiled content caching with TTL
- **Bi-temporal History**: Track both valid time and transaction time

## Installation

```bash
pnpm add @mdxdb/postgres pg
# or
npm install @mdxdb/postgres pg
# or
yarn add @mdxdb/postgres pg
```

## Prerequisites

PostgreSQL with pgvector extension:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

For installation instructions, see: https://github.com/pgvector/pgvector

## Usage

### Basic Connection

```typescript
import { createPostgresDatabase } from '@mdxdb/postgres'

// Connect to local PostgreSQL (default: localhost:5432)
const db = await createPostgresDatabase({
  database: 'mdxdb',
  user: 'postgres',
  password: 'secret',
})

// Or use connection string
const db = await createPostgresDatabase({
  connectionString: 'postgresql://user:pass@host:5432/db',
})
```

### Creating Things

```typescript
// Create a blog post
const post = await db.create({
  ns: 'example.com',
  type: 'Post',
  data: {
    title: 'Hello World',
    content: 'This is my first post',
    status: 'published',
  },
})

// Create with relationships
const author = await db.create({
  ns: 'example.com',
  type: 'Author',
  data: {
    name: 'John Doe',
    email: 'john@example.com',
  },
})

await db.relate({
  type: 'author',
  from: post.url,
  to: author.url,
})
```

### Querying

```typescript
// List all posts
const posts = await db.list({
  ns: 'example.com',
  type: 'Post',
  limit: 10,
})

// Search
const results = await db.search({
  query: 'hello world',
  type: 'Post',
  limit: 10,
})

// Get by URL
const post = await db.get('https://example.com/Post/post-123')

// Get related things
const postAuthor = await db.related(post.url, 'author', 'to')
```

### Vector Search

```typescript
// Index content with embeddings
await db.indexForSearch({
  url: post.url,
  ns: 'example.com',
  type: 'Post',
  title: post.data.title,
  content: post.data.content,
  embedding: await getEmbedding(post.data.content), // Your embedding function
  model: 'text-embedding-3-small',
})

// Vector similarity search
const embedding = await getEmbedding('machine learning tutorial')
const similar = await db.vectorSearch(embedding, {
  limit: 10,
  minScore: 0.7,
  type: 'Post',
})

// Hybrid search (text + vector)
const hybrid = await db.hybridSearch(
  'machine learning',
  embedding,
  {
    limit: 10,
    textWeight: 0.3,
    vectorWeight: 0.7,
  }
)
```

### Event Tracking

```typescript
// Track events
await db.track({
  type: 'User.visited',
  source: 'https://example.com/User/john',
  data: {
    page: '/posts/hello-world',
    timestamp: new Date(),
  },
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
// Send action (fire-and-forget, pending state)
const action = await db.send({
  actor: 'https://example.com/User/john',
  object: 'https://example.com/Post/post-123',
  action: 'publish',
  metadata: { scheduled: '2024-12-31' },
})

// Do action (create and start immediately)
const activeAction = await db.do({
  actor: 'https://example.com/System/worker',
  object: 'https://example.com/Document/doc-456',
  action: 'process',
})

// Try action (with automatic error handling)
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
  limit: 10,
})
```

### Artifacts (Caching)

```typescript
// Store compiled artifact
await db.storeArtifact({
  key: 'post-123:esm',
  type: 'esm',
  source: 'https://example.com/Post/post-123',
  sourceHash: 'abc123',
  content: compiledCode,
  ttl: 3600000, // 1 hour
})

// Get artifact
const artifact = await db.getArtifact('post-123:esm')

// Clean expired
const cleaned = await db.cleanExpiredArtifacts()
```

## Configuration

```typescript
interface PostgresConfig {
  /** Connection string (e.g., postgresql://user:pass@host:port/db) */
  connectionString?: string
  /** Host (default: localhost) */
  host?: string
  /** Port (default: 5432) */
  port?: number
  /** Database name (default: mdxdb) */
  database?: string
  /** Username (default: postgres) */
  user?: string
  /** Password */
  password?: string
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized?: boolean }
  /** Schema name (default: public) */
  schema?: string
}
```

## Schema

The adapter automatically creates these tables:

- **things**: Graph nodes with JSONB data and event sourcing
- **relationships**: Graph edges with bi-temporal tracking
- **events**: Immutable event log
- **actions**: Workflow/action tracking with status
- **artifacts**: Cached compiled content with TTL
- **search**: Full-text and vector search index (pgvector)

All tables support temporal queries and soft deletes via event sourcing.

## Performance

### Indexes

The adapter creates optimized indexes for:
- URL lookups
- Namespace and type filtering
- Full-text search (GIN)
- Vector similarity (IVFFlat)
- Relationship traversal
- Event queries

### Connection Pooling

For production, use connection pooling:

```typescript
import { Pool } from 'pg'
import { createPostgresExecutor, PostgresDatabase } from '@mdxdb/postgres'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
})

// Create custom executor with pool
const executor = {
  async query(sql, params) {
    const result = await pool.query(sql, params)
    return result.rows
  },
  async command(sql, params) {
    await pool.query(sql, params)
  },
  async close() {
    await pool.end()
  },
}

const db = new PostgresDatabase(executor)
await db.init()
```

## Migrations

The adapter automatically creates the schema on first run. For production, you may want to manage migrations explicitly:

```typescript
// Initialize only if needed
const db = await createPostgresDatabase(config)

// Or use manual migration
import { PostgresDatabase, createPostgresExecutor } from '@mdxdb/postgres'

const executor = createPostgresExecutor(config)
const db = new PostgresDatabase(executor)

// Only init if not already set up
const exists = await executor.query(`
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'things'
  )
`)
if (!exists[0]?.exists) {
  await db.init()
}
```

## Environment Variables

```bash
# PostgreSQL connection
DATABASE_URL=postgresql://user:pass@host:5432/db

# Or individual settings
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=mdxdb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secret
```

## License

MIT

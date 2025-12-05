# @mdxdb/clickhouse

ClickHouse adapter for mdxdb. Optimized for analytics, event sourcing, and high-volume data with graph database features.

## Installation

```bash
npm install @mdxdb/clickhouse
# or
pnpm add @mdxdb/clickhouse
# or
yarn add @mdxdb/clickhouse
```

## Features

- **HTTP Client** - Works with both local and remote ClickHouse via HTTP
- **Graph Database** - Things (nodes) + Relationships (edges) model
- **Event Sourcing** - Immutable event log, actions, artifacts
- **Analytics Optimized** - MergeTree storage for fast aggregations
- **Works Everywhere** - Local CLI, Node.js, Bun, or Cloudflare Workers
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createClickHouseDatabase } from '@mdxdb/clickhouse'

// Connect to local ClickHouse (default localhost:8123)
const localDb = await createClickHouseDatabase()

// Connect to remote ClickHouse
const remoteDb = await createClickHouseDatabase({
  url: 'https://your-clickhouse.example.com:8443',
  username: 'default',
  password: 'secret'
})

// Create a thing
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: { name: 'Alice', email: 'alice@example.com' }
})

// Track events (high-volume analytics)
await db.track({
  type: 'User.visited',
  source: 'web',
  data: { userId: user.id, page: '/home' }
})

// Create relationships
await db.relate({
  type: 'follows',
  from: user.url,
  to: 'https://example.com/User/bob'
})
```

## API Reference

### `createClickHouseDatabase(config)`

Create a ClickHouse database instance.

```typescript
async function createClickHouseDatabase<TData>(
  config: ClickHouseConfig
): Promise<ClickHouseDatabase<TData>>

interface ClickHouseConfig {
  url?: string               // ClickHouse HTTP URL (default: http://localhost:8123)
  username?: string          // HTTP authentication
  password?: string          // HTTP authentication
  database?: string          // Database name (default: 'mdxdb')
  executor?: ClickHouseExecutor  // Custom executor (for testing)
}
```

### Local Development

Start a local ClickHouse instance:

```bash
# Using Docker
docker run -d -p 8123:8123 clickhouse/clickhouse-server

# Or download the binary directly
# See: https://clickhouse.com/docs/en/install
```

Then connect:

```typescript
const db = await createClickHouseDatabase()  // Uses localhost:8123 by default
```

### Remote/Production

Connect to ClickHouse Cloud or self-hosted:

```typescript
const db = await createClickHouseDatabase({
  url: 'https://your-clickhouse.example.com:8443',
  username: 'default',
  password: 'your-password',
  database: 'myapp'
})
```

### Thing Operations

#### `list(options?)`

List things with filtering and pagination.

```typescript
interface QueryOptions {
  ns?: string           // Namespace filter
  type?: string         // Type filter
  where?: Record<string, unknown>  // Field filters (via JSONExtract)
  orderBy?: string      // Sort field
  order?: 'asc' | 'desc'
  limit?: number
  offset?: number
}

const users = await db.list({
  type: 'User',
  where: { status: 'active' },
  orderBy: 'created_at',
  order: 'desc',
  limit: 100
})
```

#### `search(options)`

Search things by text content.

```typescript
interface ThingSearchOptions {
  query: string
  ns?: string
  type?: string
  limit?: number
  offset?: number
}

const results = await db.search({
  query: 'machine learning',
  type: 'Article'
})
```

#### `get(url)` / `getById(ns, type, id)`

Get a thing by URL or ID components.

```typescript
const user = await db.get('https://example.com/User/alice')
// or
const user = await db.getById('example.com', 'User', 'alice')
```

#### `create(options)`

Create a new thing.

```typescript
const user = await db.create({
  ns: 'example.com',
  type: 'User',
  data: {
    name: 'Alice',
    email: 'alice@example.com'
  },
  '@context': 'https://schema.org'
})
```

#### `update(url, options)` / `upsert(options)` / `set(url, data)`

Update things:

```typescript
// Update existing
await db.update(user.url, { data: { name: 'Alice Smith' } })

// Create or update
await db.upsert({
  ns: 'example.com',
  type: 'User',
  id: 'alice',
  data: { name: 'Alice', status: 'active' }
})

// Direct set
await db.set(user.url, { name: 'Alice Smith' })
```

#### `delete(url)`

Delete a thing (soft delete via deleted_at timestamp).

```typescript
const deleted = await db.delete('https://example.com/User/alice')
```

### Relationship Operations

#### `relate(options)`

Create a relationship between things.

```typescript
await db.relate({
  type: 'follows',
  from: 'https://example.com/User/alice',
  to: 'https://example.com/User/bob',
  data: { since: '2024-01-15' }
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
// Who does Alice follow?
const following = await db.related(aliceUrl, 'follows', 'from')

// Who follows Alice?
const followers = await db.related(aliceUrl, 'follows', 'to')

// All relationships
const all = await db.related(aliceUrl, 'follows', 'both')
```

#### `relationships(url, type?, direction?)`

Get relationship objects.

```typescript
const rels = await db.relationships(aliceUrl, 'follows')
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

// Track page view
await db.track({
  type: 'Page.viewed',
  source: 'web',
  data: {
    userId: 'alice',
    page: '/products/widget',
    referrer: 'google.com'
  }
})

// Track purchase
await db.track({
  type: 'Order.completed',
  source: 'checkout',
  data: {
    orderId: 'order-123',
    total: 99.99,
    items: ['widget', 'gadget']
  },
  correlationId: 'session-abc'
})
```

#### `queryEvents(options)`

Query events.

```typescript
interface EventQueryOptions {
  type?: string
  source?: string
  correlationId?: string
  after?: Date
  before?: Date
  limit?: number
  offset?: number
}

// Get recent page views
const views = await db.queryEvents({
  type: 'Page.viewed',
  after: new Date('2024-01-01'),
  limit: 1000
})
```

### Action Operations

Actions track pending/active work with automatic state management.

#### `send(options)` - Fire and Forget

Create an action in pending state.

```typescript
const action = await db.send({
  actor: 'user:alice',
  object: 'document:report.pdf',
  action: 'review'
})
// action.status === 'pending'
```

#### `do(options)` - Start Immediately

Create and start an action.

```typescript
const action = await db.do({
  actor: 'system',
  object: 'file.pdf',
  action: 'process',
  metadata: { priority: 'high' }
})
// action.status === 'active'
```

#### `try(options, fn)` - With Error Handling

Execute an action with automatic completion/failure.

```typescript
const action = await db.try(
  {
    actor: 'system',
    object: 'report.xlsx',
    action: 'generate'
  },
  async () => {
    // Your processing logic
    const data = await generateReport()
    return { pages: 10, size: data.length }
  }
)
// action.status === 'completed' (with result) or 'failed' (with error)
```

#### Action State Management

```typescript
// Get action
const action = await db.getAction('action-id')

// Update state
await db.startAction('action-id')
await db.completeAction('action-id', { output: 'success' })
await db.failAction('action-id', 'Processing error')
await db.cancelAction('action-id')

// Query actions
const pending = await db.queryActions({
  status: 'pending',
  actor: 'user:alice'
})

const failed = await db.queryActions({
  status: ['failed', 'cancelled'],
  object: 'report.pdf'
})
```

### Artifact Storage

Cache compiled content or computation results.

```typescript
// Store artifact
const artifact = await db.storeArtifact({
  key: 'compiled:doc.mdx',
  type: 'compiled',
  source: 'doc.mdx',
  sourceHash: 'abc123',
  content: { code: '...', exports: ['default'] },
  ttl: 3600000,  // 1 hour
  metadata: { version: '1.0.0' }
})

// Get artifact
const cached = await db.getArtifact('compiled:doc.mdx')

// Get by source
const bySource = await db.getArtifactBySource('doc.mdx', 'compiled')

// Delete
await db.deleteArtifact('compiled:doc.mdx')

// Clean expired
const count = await db.cleanExpiredArtifacts()
```

## Schema

The database creates these tables with ClickHouse-optimized engines:

### Things (ReplacingMergeTree)

```sql
CREATE TABLE things (
  url String,
  ns String,
  type String,
  id String,
  context String DEFAULT '',
  data String DEFAULT '{}',
  content String DEFAULT '',
  created_at DateTime64(3),
  updated_at DateTime64(3),
  deleted_at Nullable(DateTime64(3)),
  version UInt32 DEFAULT 1
) ENGINE = ReplacingMergeTree(version)
ORDER BY (ns, type, id)
```

### Relationships (ReplacingMergeTree)

```sql
CREATE TABLE relationships (
  id String,
  type String,
  from_url String,
  to_url String,
  data String DEFAULT '',
  created_at DateTime64(3)
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY (from_url, type, to_url)
```

### Events (MergeTree, Partitioned)

```sql
CREATE TABLE events (
  id String,
  type String,
  timestamp DateTime64(3),
  source String,
  data String DEFAULT '{}',
  correlation_id Nullable(String),
  causation_id Nullable(String)
) ENGINE = MergeTree()
ORDER BY (type, timestamp)
PARTITION BY toYYYYMM(timestamp)
```

### Actions (ReplacingMergeTree)

```sql
CREATE TABLE actions (
  id String,
  actor String,
  object String,
  action String,
  status String DEFAULT 'pending',
  created_at DateTime64(3),
  updated_at DateTime64(3),
  started_at Nullable(DateTime64(3)),
  completed_at Nullable(DateTime64(3)),
  result String DEFAULT '',
  error String DEFAULT '',
  metadata String DEFAULT ''
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (actor, status, id)
```

### Artifacts (ReplacingMergeTree)

```sql
CREATE TABLE artifacts (
  key String,
  type String,
  source String,
  source_hash String,
  created_at DateTime64(3),
  expires_at Nullable(DateTime64(3)),
  content String,
  size UInt64 DEFAULT 0,
  metadata String DEFAULT ''
) ENGINE = ReplacingMergeTree(created_at)
ORDER BY (source, type)
```

## Custom Executors

For advanced use or testing, provide a custom executor:

```typescript
import { createClickHouseDatabase, ClickHouseExecutor } from '@mdxdb/clickhouse'

const mockExecutor: ClickHouseExecutor = {
  async query(sql) { /* ... */ },
  async command(sql) { /* ... */ },
  async insert(table, values) { /* ... */ },
  async close() { /* ... */ }
}

const db = await createClickHouseDatabase({
  executor: mockExecutor
})
```

## Examples

### Analytics Pipeline

```typescript
import { createClickHouseDatabase } from '@mdxdb/clickhouse'

const db = await createClickHouseDatabase({
  url: process.env.CLICKHOUSE_URL,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD
})

// Track user events
async function trackPageView(userId: string, page: string) {
  await db.track({
    type: 'Page.viewed',
    source: 'web',
    data: {
      userId,
      page,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    }
  })
}

// Track conversions
async function trackPurchase(userId: string, orderId: string, total: number) {
  await db.track({
    type: 'Order.completed',
    source: 'checkout',
    data: { userId, orderId, total },
    correlationId: `user:${userId}`
  })
}

// Query analytics
const recentViews = await db.queryEvents({
  type: 'Page.viewed',
  after: new Date(Date.now() - 24 * 60 * 60 * 1000),  // Last 24 hours
  limit: 10000
})
```

### Job Queue

```typescript
import { createClickHouseDatabase } from '@mdxdb/clickhouse'

const db = await createClickHouseDatabase()

// Submit job
async function submitJob(userId: string, type: string, payload: unknown) {
  return db.send({
    actor: `user:${userId}`,
    object: `job:${type}`,
    action: 'process',
    metadata: payload
  })
}

// Process jobs
async function processJobs() {
  const pending = await db.queryActions({
    status: 'pending',
    limit: 10
  })

  for (const job of pending) {
    await db.try(
      { actor: job.actor, object: job.object, action: job.action },
      async () => {
        // Process the job
        return await processPayload(job.metadata)
      }
    )
  }
}
```

### Content Cache

```typescript
import { createClickHouseDatabase } from '@mdxdb/clickhouse'
import { createHash } from 'crypto'

const db = await createClickHouseDatabase({
  url: process.env.CLICKHOUSE_URL,
  username: process.env.CLICKHOUSE_USER,
  password: process.env.CLICKHOUSE_PASSWORD
})

async function getCachedCompilation(source: string, content: string) {
  const sourceHash = createHash('sha256').update(content).digest('hex')

  // Check cache
  const cached = await db.getArtifact(`compiled:${source}`)
  if (cached && cached.sourceHash === sourceHash) {
    return cached.content
  }

  // Compile and cache
  const compiled = await compile(content)

  await db.storeArtifact({
    key: `compiled:${source}`,
    type: 'compiled',
    source,
    sourceHash,
    content: compiled,
    ttl: 24 * 60 * 60 * 1000  // 24 hours
  })

  return compiled
}
```

## Types

### `Thing`

```typescript
interface Thing<TData = Record<string, unknown>> {
  ns: string
  type: string
  id: string
  url: string
  data: TData
  createdAt: Date
  updatedAt: Date
  '@context'?: unknown
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
  status: ActionStatus
  createdAt: Date
  updatedAt: Date
  startedAt?: Date
  completedAt?: Date
  result?: unknown
  error?: string
  metadata?: T
}

type ActionStatus = 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'
```

### `Artifact`

```typescript
interface Artifact<T = unknown> {
  key: string
  type: ArtifactType
  source: string
  sourceHash: string
  createdAt: Date
  expiresAt?: Date
  content: T
  size?: number
  metadata?: unknown
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite backend |
| [@mdxdb/api](https://www.npmjs.com/package/@mdxdb/api) | REST API server |

## License

MIT

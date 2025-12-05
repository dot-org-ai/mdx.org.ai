# @mdxdb/payload

Payload CMS database adapter for mdxdb - supports SQLite (Durable Objects) and ClickHouse backends on Cloudflare Workers.

## Installation

```bash
pnpm add @mdxdb/payload payload
```

## Usage

### SQLite Adapter (Durable Objects)

```typescript
import { buildConfig } from 'payload'
import { sqliteAdapter, getNativeCollections } from '@mdxdb/payload'

export default buildConfig({
  db: sqliteAdapter({
    binding: env.MDXDB,
    namespace: 'example.com',
  }),
  collections: [
    ...getNativeCollections(),
    // Your custom collections
  ],
})
```

### ClickHouse Adapter

```typescript
import { buildConfig } from 'payload'
import { clickhouseAdapter } from '@mdxdb/payload/clickhouse'

export default buildConfig({
  db: clickhouseAdapter({
    url: env.CLICKHOUSE_URL,
    username: env.CLICKHOUSE_USERNAME,
    password: env.CLICKHOUSE_PASSWORD,
    namespace: 'example.com',
  }),
  collections: [...],
})
```

## Native Collections

mdxdb's core entities can be exposed as Payload collections:

```typescript
import { getNativeCollections } from '@mdxdb/payload'

// Include all native collections
const collections = getNativeCollections()

// Or select specific ones
const collections = getNativeCollections({
  things: true,        // Graph nodes
  relationships: true, // Graph edges
  search: true,        // Indexed content with embeddings
  events: true,        // Immutable event log
  actions: true,       // Jobs/Tasks/Workflows queue
  artifacts: true,     // Cached compiled content
})
```

### Available Collections

| Collection | Description |
|------------|-------------|
| `things` | Graph nodes - the core entity type |
| `relationships` | Graph edges connecting Things |
| `search` | Indexed content with vector embeddings |
| `events` | Immutable event log (audit/analytics) |
| `actions` | Jobs queue - Tasks, Workflows, Background Jobs |
| `artifacts` | Cached compiled content and build artifacts |

## Virtual Collections

Create Payload collections that map to mdxdb Thing types:

```typescript
import { createVirtualCollection } from '@mdxdb/payload'

const PostsCollection = createVirtualCollection({
  slug: 'posts',
  type: 'Post',
  fields: [
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
    },
    {
      name: 'tags',
      type: 'json',
    },
  ],
})
```

## How It Works

### Collections → Things

Payload documents are stored as mdxdb Things:
- Collection slug → Thing type (PascalCase)
- Document ID → Thing ID
- Document data → Thing data
- Timestamps → Thing timestamps

### Relationships → Graph Edges

Payload relationship fields are converted to mdxdb Relationships:
- Each relationship field creates an edge
- hasMany creates multiple edges
- Join fields query reverse relationships

### Jobs/Tasks → Actions

Payload's jobs queue maps to mdxdb Actions:
- Jobs → Actions with `status: 'pending'`
- Tasks → Actions with verb conjugations (act, action, activity)
- Workflows → Actions with parent/children hierarchy

### Versions → Branches

Payload's version history maps to mdxdb's branching:
- Drafts → Things with `branch: 'draft'`
- Published → Things with `branch: 'main'`
- Version history → Thing versions within branch

## API

### `sqliteAdapter(config)`

Create a SQLite adapter using Durable Objects.

```typescript
interface SQLiteAdapterConfig {
  binding: DurableObjectNamespace  // env.MDXDB
  namespace?: string               // Default namespace
  idType?: 'uuid' | 'number'       // ID type
  debug?: boolean                  // Enable debug logging
}
```

### `clickhouseAdapter(config)`

Create a ClickHouse adapter using HTTP.

```typescript
interface ClickHouseAdapterConfig {
  url: string                    // ClickHouse HTTP URL
  username?: string              // Authentication
  password?: string
  database?: string              // Database name (default: mdxdb)
  namespace?: string             // Default namespace
  cacheTtl?: number              // Cache TTL in seconds
  debug?: boolean
}
```

### `getNativeCollections(options)`

Get Payload collections for mdxdb's native entities.

### `createVirtualCollection(options)`

Create a Payload collection backed by mdxdb Things of a specific type.

## License

MIT

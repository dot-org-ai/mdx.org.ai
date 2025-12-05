# @mdxdb/sqlite

Cloudflare Durable Objects SQLite adapter for mdxdb.

Each namespace gets its own Durable Object with isolated SQLite storage. Uses Workers RPC for direct method calls on stubs.

## Features

- **Namespace isolation**: Each namespace (e.g., `example.com`) gets its own Durable Object with SQLite storage
- **Workers RPC**: Call methods directly on Durable Object stubs - no fetch/JSON overhead
- **Full graph support**: Things (nodes), Relationships (edges), with bidirectional traversal
- **Vector search ready**: Chunked content with embeddings support (client-side embedding)
- **Events & Actions**: Immutable event log and durable action tracking
- **Artifacts**: Cached compiled content with TTL support
- **Node.js support**: Use miniflare for local development and testing

## Installation

```bash
pnpm add @mdxdb/sqlite
```

## Usage

### Cloudflare Workers

```ts
import { createMDXClient, MDXDatabase, type Env } from '@mdxdb/sqlite'

// Export the Durable Object class for wrangler.toml
export { MDXDatabase }

export default {
  async fetch(request: Request, env: Env) {
    // Create client for a namespace
    const client = createMDXClient({
      namespace: 'example.com',
      binding: env.MDXDB,
    })

    // CRUD operations
    const post = await client.create({
      ns: 'example.com',
      type: 'Post',
      data: { title: 'Hello World', content: '...' },
    })

    const posts = await client.list({ type: 'Post' })

    // Relationships
    await client.relate({
      type: 'authored',
      from: 'https://example.com/User/alice',
      to: post.url,
    })

    return Response.json(posts)
  }
}
```

### wrangler.toml

```toml
name = "my-worker"
compatibility_date = "2024-12-01"

[[durable_objects.bindings]]
name = "MDXDB"
class_name = "MDXDatabase"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["MDXDatabase"]
```

### Node.js with Miniflare

```ts
import { createMiniflareClient } from '@mdxdb/sqlite'

// Create client with miniflare backend
const client = await createMiniflareClient({
  namespace: 'example.com',
  persistPath: './.data', // Optional: persist to disk
})

await client.create({
  ns: 'example.com',
  type: 'Post',
  data: { title: 'Hello' },
})
```

### In-Memory Testing

```ts
import { createInMemoryBinding, MDXClient } from '@mdxdb/sqlite'

const binding = createInMemoryBinding()
const id = binding.idFromName('test.local')
const stub = binding.get(id)
const client = new MDXClient(stub, 'test.local')

// Use in tests
const thing = await client.create({
  ns: 'test.local',
  type: 'Post',
  data: { title: 'Test' },
})
```

## API

### Thing Operations

```ts
// Create
const thing = await client.create({
  ns: 'example.com',
  type: 'Post',
  data: { title: 'Hello' },
})

// Read
const thing = await client.get('https://example.com/Post/123')
const thing = await client.getById('Post', '123')

// List
const posts = await client.list({ type: 'Post', limit: 10 })

// Update
await client.update(url, { data: { title: 'Updated' } })

// Upsert
await client.upsert({ ns, type, id, data })

// Delete
await client.delete(url)

// Search
const results = await client.search({ query: 'hello', type: 'Post' })
```

### Relationship Operations

```ts
// Create relationship
await client.relate({
  type: 'follows',
  from: userUrl,
  to: otherUserUrl,
})

// Remove relationship
await client.unrelate(from, 'follows', to)

// Get related things
const following = await client.related(userUrl, 'follows', 'from')
const followers = await client.related(userUrl, 'follows', 'to')

// Get relationship objects
const rels = await client.relationships(url, 'follows')
```

### Event Operations

```ts
// Track event
const event = await client.track({
  type: 'user.signup',
  source: 'auth',
  data: { userId: '123' },
  correlationId: 'req-456',
})

// Query events
const events = await client.queryEvents({
  type: 'user.signup',
  source: 'auth',
  after: new Date('2024-01-01'),
  limit: 100,
})
```

### Action Operations

```ts
// Send action (pending)
const action = await client.send({
  actor: 'user:123',
  object: 'post:456',
  action: 'publish',
})

// Do action (immediately active)
const action = await client.do({
  actor: 'user:123',
  object: 'post:456',
  action: 'publish',
})

// Update action status
await client.startAction(id)
await client.completeAction(id, result)
await client.failAction(id, 'error message')
await client.cancelAction(id)

// Query actions
const pending = await client.queryActions({ status: 'pending' })
```

### Artifact Operations

```ts
// Store artifact
const artifact = await client.storeArtifact({
  key: 'post:123:ast',
  type: 'ast',
  source: 'post:123',
  sourceHash: 'abc123',
  content: { type: 'root', children: [] },
  ttl: 3600000, // 1 hour
})

// Get artifact
const artifact = await client.getArtifact('post:123:ast')

// Delete
await client.deleteArtifact(key)

// Clean expired
const count = await client.cleanExpiredArtifacts()
```

### Vector Search

Vector search requires a client-side embedding function:

```ts
const client = createMDXClient({
  namespace: 'example.com',
  binding: env.MDXDB,
  embedFn: async (text) => {
    // Call your embedding API (OpenAI, Cloudflare AI, etc.)
    return await embed(text)
  },
})

// Search will automatically embed the query
const results = await client.search({ query: 'machine learning' })
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    RPC    ┌─────────────────────────────┐  │
│  │  MDXClient  │ ───────▶ │  MDXDatabase (Durable Object) │  │
│  └─────────────┘           │  ┌─────────────────────────┐ │  │
│                            │  │   SQLite Storage        │ │  │
│                            │  │  ┌────────────────────┐ │ │  │
│                            │  │  │ things             │ │ │  │
│                            │  │  │ relationships      │ │ │  │
│                            │  │  │ search (chunks)    │ │ │  │
│                            │  │  │ events             │ │ │  │
│                            │  │  │ actions            │ │ │  │
│                            │  │  │ artifacts          │ │ │  │
│                            │  │  └────────────────────┘ │ │  │
│                            │  └─────────────────────────┘ │  │
│                            └─────────────────────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Each namespace (`example.com`, `app.dev`, etc.) maps to a unique Durable Object instance with its own SQLite database.

## License

MIT

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
import { createClient } from '@mdxdb/sqlite/client'
import { MDXDatabase } from '@mdxdb/sqlite/durable-object'
import type { Env } from '@mdxdb/sqlite'

// Export the Durable Object class for wrangler.toml
export { MDXDatabase }

export default {
  async fetch(request: Request, env: Env) {
    // Create client for a namespace; $id is the DO name
    const client = createClient({
      $id: 'example.com',
      binding: env.MDXDB,
    })

    // CRUD operations
    const post = await client.create({
      type: 'Post',
      data: { title: 'Hello World', content: '...' },
    })
    // post.url === 'https://example.com/Post/<id>'

    const posts = await client.list({ type: 'Post' })

    // Relationships
    await client.relate({
      predicate: 'author',
      reverse: 'posts',
      from: post.url,
      to: 'https://example.com/User/alice',
    })

    return Response.json(posts)
  }
}
```

### Identity (`$id`)

Every `MDXDatabase` object has one canonical `$id`, a URL with no trailing
slash, and every `Thing.url` is `${$id}/${type}/${id}`. The `$id` is derived
from the Durable Object **name** (`idFromName('example.com')` gives
`https://example.com`; a name that already carries a scheme is kept as is).

A Durable Object cannot read its own name: inside the object `ctx.id.name` is
undefined in workerd, the name only exists on the caller's id object. So the
caller passes it once via the `$init(name)` RPC, and the object persists the
derived `$id` in its `_meta` table, where it survives eviction and
re-instantiation. `MDXClient` does this automatically before its first RPC
(one extra round trip per client instance; `await client.$init()` returns the
DO-side `$id` if you need it up front). Until an object has been named,
`$id()`, `create()`, `upsert()` and `getById()` throw
`MDXDatabase has no $id` instead of silently building URLs on the 64-hex
object id; `$init()` with a different name than the one on record throws
`MDXDatabase $id mismatch`.

If you talk to the stub directly rather than through `MDXClient`, call
`$init` yourself:

```ts
const stub = env.MDXDB.get(env.MDXDB.idFromName('example.com'))
await stub.$init('example.com') // idempotent
await stub.create({ type: 'Post', data: {} })
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

### Testing

The package ships two vitest pools:

- **node** (`vitest.config.ts`): pure-JS tests (schema, `MDXClient` wrapper, in-memory binding) under `tests/*.test.ts`.
- **workers** (`vitest.workers.config.ts`): Durable Object tests under `tests/workers/` run inside
  workerd via `@cloudflare/vitest-pool-workers`, with `MDXDatabase` declared in `wrangler.test.jsonc`.

```bash
pnpm test           # both pools
pnpm test:unit      # node pool only
pnpm test:workers   # workers pool only
```

Inside a workers-pool test the DO binding comes from `cloudflare:test`:

```ts
import { env } from 'cloudflare:test'
import { MDXClient } from '@mdxdb/sqlite/client'

const client = new MDXClient({ $id: 'test.local', binding: env.MDXDB })
const thing = await client.create({ type: 'Post', data: { title: 'Test' } })
```

## API

### Thing Operations

```ts
// Create (url = `${client $id}/Post/<id>`)
const thing = await client.create({
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
await client.upsert({ type, id, data })

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

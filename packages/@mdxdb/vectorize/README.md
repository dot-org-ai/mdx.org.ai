# @mdxdb/vectorize

Cloudflare Vectorize adapter for vector search with Workers RPC support.

## Installation

```bash
pnpm add @mdxdb/vectorize
```

## Usage

### Client (HTTP or Service Binding)

```typescript
import { createVectorizeClient } from '@mdxdb/vectorize'

// HTTP client
const client = createVectorizeClient({
  namespace: 'my-docs',
  workerUrl: 'https://vectorize.example.workers.dev',
  embedFn: async (text) => {
    // Your embedding function (e.g., OpenAI, Workers AI)
    return embeddings
  }
})

// Search by text (auto-embeds)
const results = await client.searchText('serverless architecture', {
  topK: 10,
  type: 'Post'
})

// Upsert text content (auto-chunks and embeds)
await client.upsertText(
  'https://example.com/posts/hello',
  'Long content to be chunked and embedded...',
  { type: 'Post', metadata: { author: 'john' } }
)

// Delete vectors for a thing
await client.delete({
  thingUrls: ['https://example.com/posts/hello']
})
```

### Worker (Cloudflare Workers RPC)

```typescript
import { VectorizeDatabase } from '@mdxdb/vectorize/worker'

export default {
  async fetch(request, env) {
    const db = new VectorizeDatabase(env, 'my-namespace')

    const results = await db.search({
      embedding: [0.1, 0.2, ...],
      topK: 5,
      minScore: 0.7
    })

    return Response.json(results)
  }
}
```

### Service Binding (Worker-to-Worker RPC)

```typescript
// In your worker that calls the vectorize service
interface Env {
  VECTORIZE_SERVICE: Service<VectorizeDatabase>
}

export default {
  async fetch(request, env: Env) {
    // Direct RPC call - no HTTP overhead
    const results = await env.VECTORIZE_SERVICE
      .withNamespace('docs')
      .search({ embedding: [...], topK: 10 })

    return Response.json(results)
  }
}
```

## Features

- Workers RPC for zero-overhead Worker-to-Worker calls
- HTTP fallback for external clients
- Automatic text chunking with paragraph/sentence boundaries
- Auto-embedding support via custom embedding function
- Namespace isolation
- Metadata filtering
- Type-safe TypeScript interface

## API

### Client Methods

- `search(options)` - Search by embedding vector
- `searchText(query, options?)` - Search by text (auto-embeds)
- `upsert(vectors)` - Insert/update vectors
- `upsertText(url, content, options?)` - Upsert text (auto-chunks and embeds)
- `delete(options)` - Delete vectors by thing URLs
- `getByThingUrl(url)` - Get all vectors for a thing
- `describe()` - Get index metadata

### Worker Methods

- `withNamespace(namespace)` - Create instance for specific namespace
- All client methods available via RPC

## Configuration

```typescript
interface VectorizeClientConfig {
  namespace: string                    // Vectorize namespace
  workerUrl?: string                   // Worker URL for HTTP
  binding?: VectorizeServiceBinding    // Service binding for RPC
  rpcStub?: VectorizeRPCStub          // Direct RPC stub
  embedFn?: (text: string) => Promise<number[]>  // Embedding function
}
```

## wrangler.toml

```toml
[[vectorize]]
binding = "VECTORIZE"
index_name = "my-index"

[[services]]
binding = "VECTORIZE_SERVICE"
service = "vectorize-worker"
```

## Related Packages

- `@mdxdb/clickhouse` - Full-text search with ClickHouse
- `@mdxdb/sqlite` - Vector search with SQLite/Turso

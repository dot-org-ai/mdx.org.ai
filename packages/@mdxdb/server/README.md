# @mdxdb/server

HTTP API server for mdxdb using Hono - works with any database backend and any runtime.

## Installation

```bash
pnpm add @mdxdb/server
```

## Usage

### Simple Database Interface

Expose any mdxdb Database implementation via REST API:

```typescript
import { createServer } from '@mdxdb/server'
import { createFsDatabase } from '@mdxdb/fs'
import { serve } from '@hono/node-server'

const db = createFsDatabase({ root: './content' })
const app = createServer({
  database: db,
  basePath: '/api/mdxdb',
  apiKey: process.env.API_KEY // optional auth
})

serve({ fetch: app.fetch, port: 3000 })
```

### DBClient Interface (ai-database)

Expose ai-database DBClient for Things, Relationships, Events:

```typescript
import { createDBServer } from '@mdxdb/server/db'
import { createClickHouseDatabase } from '@mdxdb/clickhouse'
import { serve } from '@hono/node-server'

const db = await createClickHouseDatabase({
  url: 'http://localhost:8123'
})

const app = createDBServer({
  client: db,
  basePath: '/api/db',
  cors: true
})

serve({ fetch: app.fetch, port: 3000 })
```

## API Routes

### Simple Interface

- `GET /api/mdxdb` - List documents
- `GET /api/mdxdb/search?q=query` - Search documents
- `GET /api/mdxdb/:id` - Get document by ID
- `PUT /api/mdxdb/:id` - Create/update document
- `DELETE /api/mdxdb/:id` - Delete document

### DBClient Interface

- `GET /api/db/things` - List things
- `GET /api/db/things/:url` - Get thing by URL
- `POST /api/db/things` - Create thing
- `PATCH /api/db/things/:url` - Update thing
- Plus routes for relationships, events, actions, artifacts

## Configuration

```typescript
interface ServerConfig {
  database: Database
  basePath?: string        // Default: '/api/mdxdb'
  apiKey?: string          // Optional API key auth
  cors?: boolean           // Enable CORS (default: false)
}
```

## Runtime Support

Works with any JavaScript runtime:

- Node.js (via `@hono/node-server`)
- Cloudflare Workers
- Deno
- Bun

## Related Packages

- `@mdxdb/rpc` - Client for consuming this server
- `@mdxdb/fs` - Filesystem database backend
- `@mdxdb/clickhouse` - ClickHouse database backend
- `@mdxdb/sqlite` - SQLite database backend

# @mdxdb/api

HTTP REST API server for mdxdb. Expose any mdxdb database backend as a REST API using Hono.

## Installation

```bash
npm install @mdxdb/api
# or
pnpm add @mdxdb/api
# or
yarn add @mdxdb/api
```

## Features

- **REST API** - Full CRUD operations via HTTP
- **Any Backend** - Works with any mdxdb database (fs, sqlite, postgres, etc.)
- **Any Runtime** - Node.js, Cloudflare Workers, Deno, Bun
- **CORS Support** - Built-in CORS middleware
- **API Key Auth** - Optional Bearer token authentication
- **Hono-Based** - Lightweight and fast

## Quick Start

```typescript
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'
import { serve } from '@hono/node-server'

// Create database
const db = await createSqliteDatabase({ url: './data.db' })

// Create API server
const app = createApiServer({ database: db })

// Start server
serve({ fetch: app.fetch, port: 3000 })
console.log('Server running at http://localhost:3000')
```

## API Reference

### `createApiServer(config)`

Create a Hono app that exposes a Database as a REST API.

```typescript
function createApiServer<TData>(
  config: ApiServerConfig<TData>
): Hono

interface ApiServerConfig<TData> {
  database: Database<TData>  // mdxdb database instance
  basePath?: string          // API base path (default: '/api/mdxdb')
  cors?: boolean             // Enable CORS (default: true)
  apiKey?: string            // API key for authentication
}
```

**Example:**

```typescript
import { createApiServer } from '@mdxdb/api'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })

const app = createApiServer({
  database: db,
  basePath: '/api/v1/content',
  cors: true,
  apiKey: process.env.API_KEY
})
```

## REST Endpoints

### List Documents

```
GET /api/mdxdb
```

Query parameters:
- `limit` - Maximum documents (number)
- `offset` - Pagination offset (number)
- `sortBy` - Field to sort by (string)
- `sortOrder` - Sort order: `asc` | `desc`
- `type` - Filter by type (string, comma-separated for multiple)
- `prefix` - Filter by path prefix (string)

**Example:**

```bash
# List all documents
curl http://localhost:3000/api/mdxdb

# List with pagination
curl "http://localhost:3000/api/mdxdb?limit=10&offset=20"

# Filter by type
curl "http://localhost:3000/api/mdxdb?type=BlogPost"

# Multiple types
curl "http://localhost:3000/api/mdxdb?type=BlogPost,Article"

# Filter by prefix
curl "http://localhost:3000/api/mdxdb?prefix=posts/"

# Sort
curl "http://localhost:3000/api/mdxdb?sortBy=publishedAt&sortOrder=desc"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "posts/hello-world",
        "type": "BlogPost",
        "data": { "title": "Hello World", "author": "Jane" },
        "content": "# Hello World..."
      }
    ],
    "total": 42,
    "hasMore": true
  }
}
```

### Search Documents

```
GET /api/mdxdb/search
```

Query parameters:
- `q` - Search query (required)
- `limit` - Maximum results (number)
- `offset` - Results to skip (number)
- `fields` - Fields to search (comma-separated)
- `semantic` - Enable semantic search: `true` | `false`
- `type` - Filter by type (string, comma-separated for multiple)

**Example:**

```bash
# Simple search
curl "http://localhost:3000/api/mdxdb/search?q=typescript"

# Search with fields
curl "http://localhost:3000/api/mdxdb/search?q=hello&fields=title,description"

# Semantic search
curl "http://localhost:3000/api/mdxdb/search?q=how%20to%20get%20started&semantic=true"

# Filter by type
curl "http://localhost:3000/api/mdxdb/search?q=tutorial&type=BlogPost"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "documents": [
      {
        "id": "posts/typescript-tips",
        "type": "BlogPost",
        "score": 0.95,
        "data": { "title": "TypeScript Tips" },
        "content": "..."
      }
    ],
    "total": 5,
    "hasMore": false
  }
}
```

### Get Document

```
GET /api/mdxdb/:id
```

Supports nested paths (e.g., `/api/mdxdb/posts/2024/hello-world`).

**Example:**

```bash
curl http://localhost:3000/api/mdxdb/posts/hello-world
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "posts/hello-world",
    "type": "BlogPost",
    "context": "https://schema.org",
    "data": {
      "title": "Hello World",
      "author": "Jane Doe",
      "publishedAt": "2024-01-15"
    },
    "content": "# Hello World\n\nWelcome..."
  }
}
```

### Create/Update Document

```
PUT /api/mdxdb/:id
```

Request body:
- `type` - Document type (string)
- `context` - JSON-LD context (string)
- `data` - Frontmatter data (object)
- `content` - MDX content (string, required)
- `createOnly` - Only create if not exists (boolean)
- `updateOnly` - Only update if exists (boolean)
- `version` - Optimistic concurrency version (number)

**Example:**

```bash
# Create new document
curl -X PUT http://localhost:3000/api/mdxdb/posts/new-post \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BlogPost",
    "data": {
      "title": "New Post",
      "author": "Jane"
    },
    "content": "# New Post\n\nContent here..."
  }'

# Update existing
curl -X PUT http://localhost:3000/api/mdxdb/posts/new-post \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BlogPost",
    "data": {
      "title": "Updated Title",
      "author": "Jane"
    },
    "content": "# Updated content"
  }'

# Create only (fails if exists)
curl -X PUT http://localhost:3000/api/mdxdb/posts/unique \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BlogPost",
    "data": { "title": "Unique Post" },
    "content": "...",
    "createOnly": true
  }'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "posts/new-post",
    "created": true
  }
}
```

### Delete Document

```
DELETE /api/mdxdb/:id
```

Query parameters:
- `soft` - Soft delete: `true` | `false`
- `version` - Optimistic concurrency version (number)

**Example:**

```bash
# Hard delete
curl -X DELETE http://localhost:3000/api/mdxdb/posts/old-post

# Soft delete
curl -X DELETE "http://localhost:3000/api/mdxdb/posts/archived?soft=true"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "posts/old-post",
    "deleted": true
  }
}
```

## Authentication

When `apiKey` is configured, all requests require Bearer token authentication:

```typescript
const app = createApiServer({
  database: db,
  apiKey: 'your-secret-key'
})
```

```bash
# Authenticated request
curl http://localhost:3000/api/mdxdb \
  -H "Authorization: Bearer your-secret-key"
```

Unauthorized requests return:

```json
{
  "success": false,
  "error": "Unauthorized"
}
```

## Runtime Examples

### Node.js

```typescript
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'
import { serve } from '@hono/node-server'

const db = await createSqliteDatabase({ url: './data.db' })
const app = createApiServer({ database: db })

serve({ fetch: app.fetch, port: 3000 })
```

### Cloudflare Workers

```typescript
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const db = await createSqliteDatabase({
      url: env.DATABASE_URL,
      authToken: env.DATABASE_AUTH_TOKEN
    })

    const app = createApiServer({
      database: db,
      apiKey: env.API_KEY
    })

    return app.fetch(request)
  }
}
```

### Bun

```typescript
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = await createSqliteDatabase({ url: './data.db' })
const app = createApiServer({ database: db })

export default {
  port: 3000,
  fetch: app.fetch
}
```

### Deno

```typescript
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = await createSqliteDatabase({ url: './data.db' })
const app = createApiServer({ database: db })

Deno.serve({ port: 3000 }, app.fetch)
```

## Combining with Other Routes

Since `createApiServer` returns a Hono app, you can mount it on a larger application:

```typescript
import { Hono } from 'hono'
import { createApiServer } from '@mdxdb/api'
import { createSqliteDatabase } from '@mdxdb/sqlite'

const app = new Hono()

// Your custom routes
app.get('/', (c) => c.json({ message: 'Welcome' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

// Mount mdxdb API
const db = await createSqliteDatabase({ url: './data.db' })
const mdxdbApi = createApiServer({ database: db, basePath: '/api/content' })
app.route('/', mdxdbApi)

export default app
```

## Error Handling

All errors return consistent JSON responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

HTTP status codes:
- `200` - Success
- `201` - Created (new document)
- `400` - Bad request (missing required fields)
- `401` - Unauthorized (invalid API key)
- `404` - Document not found
- `409` - Conflict (document exists with createOnly, or version mismatch)
- `500` - Server error

## Types

### `ApiServerConfig`

```typescript
interface ApiServerConfig<TData extends MDXLDData = MDXLDData> {
  database: Database<TData>
  basePath?: string
  cors?: boolean
  apiKey?: string
}
```

### `ApiResponse`

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
```

### Query/Body Types

```typescript
interface ListQuery {
  limit?: string
  offset?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  type?: string
  prefix?: string
}

interface SearchQuery {
  q: string
  limit?: string
  offset?: string
  fields?: string
  semantic?: string
  type?: string
}

interface SetBody {
  type?: string
  context?: string
  data?: Record<string, unknown>
  content: string
  createOnly?: boolean
  updateOnly?: boolean
  version?: number
}

interface DeleteQuery {
  soft?: string
  version?: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/fs](https://www.npmjs.com/package/@mdxdb/fs) | Filesystem backend |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite backend |
| [hono](https://www.npmjs.com/package/hono) | Web framework |

## License

MIT

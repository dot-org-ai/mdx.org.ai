# @mdxe/payload

Generate and run Payload CMS apps on Cloudflare Workers using mdxdb.

## Installation

```bash
pnpm add @mdxe/payload @mdxdb/payload @mdxdb/sqlite payload
```

## Quick Start

### 1. Create Worker

```typescript
// src/worker.ts
import { createPayloadWorker } from '@mdxe/payload'
import { MDXDatabase } from '@mdxdb/sqlite'

// Export Durable Object for wrangler
export { MDXDatabase }

// Export worker
export default createPayloadWorker({
  namespace: 'example.com',
  database: 'sqlite',
})
```

### 2. Configure Wrangler

```toml
# wrangler.toml
name = "my-payload-app"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "MDXDB"
class_name = "MDXDatabase"

[[migrations]]
tag = "v1"
new_classes = ["MDXDatabase"]

[vars]
PAYLOAD_SECRET = "your-secret-here"
NAMESPACE = "example.com"
```

### 3. Deploy

```bash
wrangler deploy
```

## With Custom Collections

```typescript
import {
  createPayloadWorker,
  createContentCollections,
  getNativeCollections,
} from '@mdxe/payload'
import { MDXDatabase } from '@mdxdb/sqlite'

export { MDXDatabase }

export default createPayloadWorker({
  namespace: 'example.com',
  database: 'sqlite',
  nativeCollections: {
    things: true,
    relationships: true,
    events: true,
    actions: true,  // Jobs/Tasks/Workflows
  },
  collections: [
    ...createContentCollections(), // Posts, Pages, Categories
  ],
})
```

## Generate Collections from MDX

Parse MDX files to automatically generate Payload collections:

```typescript
import { parseTypeFromMDX, generateCollections } from '@mdxe/payload/generate'

// From single MDX file
const mdxContent = `---
$type: BlogPost
title: Hello World
author: john
tags: [hello, world]
---

Content here...
`

const type = parseTypeFromMDX(mdxContent)
// { name: 'BlogPost', slug: 'blog-posts', fields: [...], relationships: [...] }

// Generate collection
const collections = await generateCollections({
  types: [type],
})
```

## Configuration Options

```typescript
interface PayloadAppConfig {
  // Required
  namespace: string           // e.g., 'example.com'
  database: 'sqlite' | 'clickhouse'

  // Native mdxdb collections
  nativeCollections?: boolean | {
    things?: boolean         // Graph nodes
    relationships?: boolean  // Graph edges
    search?: boolean         // Indexed content
    events?: boolean         // Event log
    actions?: boolean        // Jobs queue
    artifacts?: boolean      // Build cache
  }

  // Custom collections
  collections?: CollectionConfig[]
  globals?: GlobalConfig[]

  // Admin UI
  admin?: {
    route?: string           // Default: '/admin'
    livePreview?: boolean
    branding?: {
      logo?: string
      favicon?: string
      title?: string
    }
  }

  // API
  api?: {
    route?: string           // Default: '/api'
    graphQL?: boolean
    rest?: boolean
  }

  // Auth
  auth?: {
    enabled?: boolean
    userSlug?: string        // Default: 'users'
    apiKeys?: boolean
  }
}
```

## Environment Variables

```bash
# Required
PAYLOAD_SECRET=your-secret-key

# Optional
NAMESPACE=example.com
DEBUG=true

# For ClickHouse mode
CLICKHOUSE_URL=https://your-instance.clickhouse.cloud
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=secret
CLICKHOUSE_DATABASE=mdxdb
```

## Pre-built Collection Sets

### Content Collections

```typescript
import { createContentCollections } from '@mdxe/payload'

// Creates: posts, pages, categories
const collections = createContentCollections()
```

### Commerce Collections

```typescript
import { createCommerceCollections } from '@mdxe/payload'

// Creates: products, product-categories, orders
const collections = createCommerceCollections()
```

## API Endpoints

Once deployed, your Payload API is available at:

- `GET /api/{collection}` - List documents
- `GET /api/{collection}/{id}` - Get single document
- `POST /api/{collection}` - Create document
- `PATCH /api/{collection}/{id}` - Update document
- `DELETE /api/{collection}/{id}` - Delete document
- `GET /health` - Health check
- `POST /graphql` - GraphQL endpoint (coming soon)
- `/admin` - Admin UI (coming soon)

### Query Parameters

```bash
# Pagination
GET /api/posts?page=1&limit=10

# Sorting
GET /api/posts?sort=-createdAt

# Filtering
GET /api/posts?where={"status":{"equals":"published"}}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  @mdxe/payload                         │  │
│  │           (Worker Handler + Config Builder)            │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                  @mdxdb/payload                        │  │
│  │    (Payload DB Adapter → Things + Relationships)       │  │
│  └───────────────────────────────────────────────────────┘  │
│                            │                                 │
│            ┌───────────────┴───────────────┐                │
│            ▼                               ▼                │
│  ┌─────────────────────┐       ┌─────────────────────────┐  │
│  │   @mdxdb/sqlite     │       │    @mdxdb/clickhouse    │  │
│  │  (Durable Objects)  │       │     (HTTP Client)       │  │
│  └─────────────────────┘       └─────────────────────────┘  │
│            │                               │                │
│            ▼                               ▼                │
│  ┌─────────────────────┐       ┌─────────────────────────┐  │
│  │   SQLite Storage    │       │  ClickHouse Database    │  │
│  │  (per-namespace)    │       │  (shared analytics)     │  │
│  └─────────────────────┘       └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## License

MIT

# @mdxe/cloudflare

Deploy MDX projects to Cloudflare Workers and Pages with automatic detection of static vs. dynamic content (OpenNext SSR).

## Installation

```bash
pnpm add @mdxe/cloudflare
```

## Overview

`@mdxe/cloudflare` provides a unified deployment interface for Cloudflare's edge computing platform:

| Target | Use Case | Features |
|--------|----------|----------|
| **Workers** | Dynamic sites, SSR, APIs | OpenNext SSR, KV/D1/R2 bindings, multi-tenant |
| **Pages** | Static sites, blogs, docs | Branch deployments, fast static hosting |

The package auto-detects your project type and selects the optimal deployment target.

## Quick Start

### Auto-detect Deployment Target

```typescript
import { deploy } from '@mdxe/cloudflare'

const result = await deploy({
  projectDir: './my-project',
  projectName: 'my-site',
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
})

console.log(`Deployed to: ${result.url}`)
```

### Deploy to Workers (Dynamic/SSR)

```typescript
import { deployToWorkers } from '@mdxe/cloudflare/workers'

const result = await deployToWorkers({
  projectDir: './my-next-app',
  projectName: 'my-app',
  mode: 'opennext',
  kvNamespaces: { CACHE: 'namespace-id' },
  d1Databases: { DB: 'database-id' },
  r2Buckets: { ASSETS: 'bucket-name' },
})
```

### Deploy to Pages (Static)

```typescript
import { deployToPages } from '@mdxe/cloudflare/pages'

const result = await deployToPages({
  projectDir: './my-static-site',
  projectName: 'my-site',
  branch: 'main',
  outputDir: 'out',
})
```

## Deployment Architecture

```
                          @mdxe/cloudflare
                                 |
              +------------------+------------------+
              |                                     |
        deployToWorkers()                   deployToPages()
              |                                     |
    +---------+---------+                 +---------+---------+
    |         |         |                 |         |         |
  static   opennext  direct API        wrangler  direct API  managed
    |         |         |                 |         |         |
    v         v         v                 v         v         v
+-------+ +-------+ +-------+         +-------+ +-------+ +-------+
|Wrangler| |OpenNext| |CF API |       |Wrangler| |CF API | |apis.do|
+-------+ +-------+ +-------+         +-------+ +-------+ +-------+
    |         |         |                 |         |         |
    +---------+---------+                 +---------+---------+
              |                                     |
              v                                     v
    +-------------------+               +-------------------+
    | Cloudflare Workers|               | Cloudflare Pages  |
    |   (Dynamic/SSR)   |               |     (Static)      |
    +-------------------+               +-------------------+
```

## API Reference

### Main Functions

#### `deploy(options)`

Auto-detect and deploy to Workers or Pages.

```typescript
import { deploy } from '@mdxe/cloudflare'

const result = await deploy({
  projectDir: './my-project',
  projectName: 'my-site',
  accountId: 'your-account-id',
  apiToken: 'your-api-token',
  // Optional: force a specific target
  target: 'workers', // or 'pages'
})
```

**Returns:** `DeployResult`

```typescript
interface DeployResult {
  success: boolean
  url?: string
  deploymentId?: string
  error?: string
  logs?: string[]
  type?: 'workers' | 'pages'
}
```

#### `deployToWorkers(options)`

Deploy to Cloudflare Workers with full binding support.

```typescript
import { deployToWorkers } from '@mdxe/cloudflare/workers'

const result = await deployToWorkers({
  projectDir: './my-project',
  projectName: 'my-worker',
  mode: 'opennext', // or 'static'

  // Worker configuration
  compatibilityDate: '2024-01-01',
  compatibilityFlags: ['nodejs_compat'],

  // Bindings
  kvNamespaces: { CACHE: 'namespace-id' },
  d1Databases: { DB: 'database-id' },
  r2Buckets: { STORAGE: 'bucket-name' },
  env: { API_KEY: 'secret-value' },

  // Multi-tenant (Workers for Platforms)
  dispatchNamespace: 'my-namespace',
  tenantId: 'customer-123',

  // Custom domain
  customDomain: 'api.example.com',
  zoneId: 'zone-id',
})
```

#### `deployToPages(options)`

Deploy to Cloudflare Pages for static content.

```typescript
import { deployToPages } from '@mdxe/cloudflare/pages'

const result = await deployToPages({
  projectDir: './my-site',
  projectName: 'my-site',

  // Pages configuration
  branch: 'main',
  productionBranch: 'main',
  buildCommand: 'npm run build',
  outputDir: 'out',

  // Environment variables
  env: { NODE_ENV: 'production' },
})
```

#### `detectSourceType(projectDir)`

Detect whether a project is static or dynamic based on its configuration.

```typescript
import { detectSourceType } from '@mdxe/cloudflare'

const sourceType = detectSourceType('./my-project')
// { isStatic: true, adapter: 'fs', configPath: './source.config.ts' }
```

### CloudflareApi Class

Direct access to Cloudflare's REST API for advanced use cases.

```typescript
import { CloudflareApi, createCloudflareApiFromEnv } from '@mdxe/cloudflare/api'

// Create from environment variables
const api = createCloudflareApiFromEnv()

// Or create manually
const api = new CloudflareApi({
  accountId: 'your-account-id',
  apiToken: 'your-api-token',
  baseUrl: 'https://api.cloudflare.com/client/v4', // optional
  timeout: 30000, // optional, in ms
})
```

#### Worker Management

```typescript
// Upload a worker
const result = await api.uploadWorker('my-worker', workerCode, {
  main_module: 'worker.js',
  compatibility_date: '2024-01-01',
  bindings: [
    { type: 'kv_namespace', name: 'CACHE', namespace_id: 'abc123' },
  ],
})

// List workers
const { workers } = await api.listWorkers()

// Get worker details
const { script } = await api.getWorker('my-worker')

// Delete worker
await api.deleteWorker('my-worker')
```

#### KV Namespace Management

```typescript
// Create KV namespace
const { id } = await api.createKVNamespace('MY_CACHE')
```

#### D1 Database Management

```typescript
// Create D1 database
const { uuid } = await api.createD1Database('my-database')
```

#### Vectorize Index Management

```typescript
// Create a Vectorize index
const { index } = await api.createVectorizeIndex({
  name: 'my-embeddings',
  dimensions: 1536,
  metric: 'cosine',
})

// Insert vectors
await api.upsertVectors('my-embeddings', [
  { id: 'doc-1', values: [...embedding], metadata: { title: 'Hello' } },
])

// Query vectors
const { matches } = await api.queryVectors('my-embeddings', queryVector, {
  topK: 10,
  returnMetadata: true,
})

// Delete vectors
await api.deleteVectors('my-embeddings', ['doc-1', 'doc-2'])
```

#### Workers for Platforms (Multi-tenant)

```typescript
// Create dispatch namespace
await api.createDispatchNamespace({ name: 'my-namespace' })

// Upload worker to namespace
await api.uploadToNamespace('my-namespace', 'tenant-worker', code, metadata)

// List namespaces
const { namespaces } = await api.listDispatchNamespaces()

// Delete from namespace
await api.deleteFromNamespace('my-namespace', 'tenant-worker')
```

#### Pages Deployment

```typescript
// Create Pages project
await api.createPagesProject('my-site', {
  productionBranch: 'main',
  buildCommand: 'npm run build',
  destinationDir: 'out',
})

// Create deployment
const { url } = await api.createPagesDeployment('my-site', assets, {
  branch: 'main',
})
```

### Provider Interface

For unified deployment across multiple platforms.

```typescript
import { createProvider } from '@mdxe/cloudflare'

const provider = createProvider({
  accountId: 'your-account-id',
  apiToken: 'your-api-token',
})

// Deploy
await provider.deploy({ projectDir: './my-project' })

// Manage workers
await provider.getWorker('my-worker')
await provider.deleteWorker('my-worker')
```

## wrangler.toml Configuration

### Static Site with Assets

```toml
name = "my-static-site"
main = ".worker/index.js"
compatibility_date = "2024-01-01"

# Static assets binding
assets = { directory = ".next/static", binding = "ASSETS" }

[build]
command = "npm run build"
```

### OpenNext SSR

```toml
name = "my-next-app"
main = ".open-next/worker.js"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# OpenNext assets
assets = { directory = ".open-next/assets", binding = "ASSETS" }

[vars]
NODE_ENV = "production"
```

### Full Bindings Example

```toml
name = "my-full-app"
main = "src/worker.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# KV Namespace
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "my-database"
database_id = "your-d1-database-id"

# R2 Bucket
[[r2_buckets]]
binding = "STORAGE"
bucket_name = "my-bucket"

# Vectorize Index
[[vectorize]]
binding = "VECTORS"
index_name = "my-embeddings"

# Service Binding (to another Worker)
[[services]]
binding = "AUTH_SERVICE"
service = "auth-worker"

# Environment Variables
[vars]
API_BASE_URL = "https://api.example.com"

# Secrets (set via wrangler secret put)
# SECRET_KEY
```

### Multi-tenant (Workers for Platforms)

```toml
name = "platform-dispatcher"
main = "src/dispatcher.ts"
compatibility_date = "2024-01-01"

# Dispatch namespace binding
[[dispatch_namespaces]]
binding = "TENANTS"
namespace = "customer-workers"
```

## Worker Bindings

### D1 (SQLite)

```typescript
interface Env {
  DB: D1Database
}

export default {
  async fetch(request: Request, env: Env) {
    const results = await env.DB.prepare('SELECT * FROM users').all()
    return Response.json(results)
  }
}
```

### KV (Key-Value)

```typescript
interface Env {
  CACHE: KVNamespace
}

export default {
  async fetch(request: Request, env: Env) {
    // Read
    const value = await env.CACHE.get('key')

    // Write with TTL
    await env.CACHE.put('key', 'value', { expirationTtl: 3600 })

    return new Response(value)
  }
}
```

### R2 (Object Storage)

```typescript
interface Env {
  STORAGE: R2Bucket
}

export default {
  async fetch(request: Request, env: Env) {
    // Read
    const object = await env.STORAGE.get('file.pdf')

    // Write
    await env.STORAGE.put('file.pdf', request.body)

    // List
    const list = await env.STORAGE.list({ prefix: 'uploads/' })

    return new Response(object?.body)
  }
}
```

### Vectorize (Vector Search)

```typescript
interface Env {
  VECTORS: VectorizeIndex
}

export default {
  async fetch(request: Request, env: Env) {
    // Query similar vectors
    const matches = await env.VECTORS.query(queryVector, {
      topK: 10,
      returnMetadata: true,
    })

    // Insert vectors
    await env.VECTORS.upsert([
      { id: 'doc-1', values: embedding, metadata: { title: 'Doc' } },
    ])

    return Response.json(matches)
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `CLOUDFLARE_API_TOKEN` | API token with Workers/Pages permissions |
| `CLOUDFLARE_API_BASE_URL` | Custom API base URL (optional) |
| `WORKERS_API_URL` | Managed API URL for apis.do (optional) |

### Creating an API Token

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click "Create Token"
3. Use the "Edit Cloudflare Workers" template or create custom:
   - **Account** > Workers Scripts > Edit
   - **Account** > Workers KV Storage > Edit
   - **Account** > Workers R2 Storage > Edit
   - **Account** > D1 > Edit
   - **Zone** > Workers Routes > Edit (if using custom domains)

## Deployment Modes

### Static Mode

Best for pre-rendered content (SSG):

```typescript
await deploy({
  projectDir: './my-site',
  target: 'workers',
  mode: 'static',
})
```

Detection: Uses `@mdxdb/fs` or no dynamic data sources.

### OpenNext Mode

Best for Next.js with SSR/ISR:

```typescript
await deploy({
  projectDir: './my-next-app',
  target: 'workers',
  mode: 'opennext',
})
```

Detection: Dynamic data sources (`@mdxdb/postgres`, `@mdxdb/api`, etc.)

### Pages Mode

Best for purely static sites:

```typescript
await deploy({
  projectDir: './my-site',
  target: 'pages',
})
```

## Dry Run Mode

Preview deployment without making changes:

```typescript
const result = await deploy({
  projectDir: './my-project',
  dryRun: true,
})

console.log(result.logs) // Shows what would happen
```

## TypeScript Types

```typescript
import type {
  CloudflareDeployOptions,
  CloudflareWorkersOptions,
  CloudflarePagesOptions,
  DeployResult,
  CloudflareApiConfig,
  WorkerMetadata,
  WorkerBinding,
  VectorizeIndexConfig,
  VectorizeVector,
  VectorizeMatch,
  DispatchNamespace,
  UploadResult,
  SourceTypeInfo,
} from '@mdxe/cloudflare'
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxe/workers](../workers) | Pure Cloudflare Workers MDX evaluation |
| [@mdxe/do](../do) | Deploy to .do managed platform |
| [@mdxe/hono](../hono) | Hono HTTP middleware for MDX |
| [mdxld](../../mdxld) | MDX + Linked Data parser |
| [wrangler](https://www.npmjs.com/package/wrangler) | Cloudflare Workers CLI |

## License

MIT

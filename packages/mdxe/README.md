# mdxe

Execute, test, and deploy MDX-based agents, apps, APIs, and sites. Provides execution contexts, deployment to Cloudflare Workers, and integration with various runtimes.

## Installation

```bash
npm install mdxe
# or
pnpm add mdxe
# or
yarn add mdxe
```

## Features

- **Execute** - Run MDX documents as applications with ai-sandbox
- **Test** - Test MDX content with inline test blocks
- **Deploy** - Deploy to Cloudflare Workers
- **SDK Provider** - Local and remote SDK implementations for db, ai, workflows
- **Multi-Runtime** - Support for Hono, Next.js, Node, Bun, Workers
- **Primitives Integration** - Built-in support for ai-functions, ai-workflows, ai-sandbox
- **Type-Safe** - Full TypeScript support

## Documentation

- [ECOSYSTEM.md](./ECOSYSTEM.md) - How mdxe integrates with mdxld, mdxdb, mdxui, and mdxai
- [INTEGRATION.md](./INTEGRATION.md) - Primitives integration details (ai-sandbox, ai-functions, ai-workflows)

## Quick Start

```typescript
import { deploy, detectSourceType } from 'mdxe'
import { createCloudflareApi } from 'mdxe'

// Detect source type
const sourceType = await detectSourceType('./my-app')
console.log(sourceType) // { type: 'hono', entry: './src/index.ts' }

// Deploy to Cloudflare
await deploy({
  source: './my-app',
  name: 'my-worker',
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID,
    apiToken: process.env.CF_API_TOKEN
  }
})
```

## API Reference

### `deploy(options)`

Deploy an MDX application to Cloudflare Workers.

```typescript
async function deploy(options: DeployOptions): Promise<DeployResult>

interface DeployOptions {
  source: string              // Source directory or file
  name: string                // Worker name
  cloudflare: CloudflareDeployOptions
  env?: Record<string, string> // Environment variables
  routes?: string[]           // Custom routes
  compatibility_date?: string  // Workers compatibility date
}

interface CloudflareDeployOptions {
  accountId: string
  apiToken: string
  namespace?: string          // For Workers for Platforms
  zoneId?: string            // For zone-based routing
}

interface DeployResult {
  success: boolean
  url?: string               // Deployed worker URL
  name: string
  version?: string
  errors?: string[]
}
```

**Example:**

```typescript
import { deploy } from 'mdxe'

const result = await deploy({
  source: './src',
  name: 'my-api',
  cloudflare: {
    accountId: 'abc123',
    apiToken: 'token',
  },
  env: {
    DATABASE_URL: 'postgresql://...'
  },
  routes: ['api.example.com/*']
})

if (result.success) {
  console.log(`Deployed to: ${result.url}`)
}
```

### `detectSourceType(path)`

Detect the type of MDX application.

```typescript
async function detectSourceType(path: string): Promise<SourceTypeInfo>

interface SourceTypeInfo {
  type: 'hono' | 'next' | 'node' | 'static' | 'unknown'
  entry?: string           // Entry file path
  config?: string          // Config file path
  framework?: string       // Detected framework
}
```

**Example:**

```typescript
import { detectSourceType } from 'mdxe'

const info = await detectSourceType('./my-project')

switch (info.type) {
  case 'hono':
    console.log('Hono app detected:', info.entry)
    break
  case 'next':
    console.log('Next.js app detected')
    break
  case 'static':
    console.log('Static site detected')
    break
}
```

### Cloudflare API Client

Low-level API for Cloudflare Workers operations.

```typescript
import {
  createCloudflareApi,
  createCloudflareApiFromEnv
} from 'mdxe'

// Create from config
const api = createCloudflareApi({
  accountId: 'abc123',
  apiToken: 'token'
})

// Create from environment variables
const api = createCloudflareApiFromEnv()
// Uses CF_ACCOUNT_ID and CF_API_TOKEN

// Upload worker
const result = await api.uploadWorker({
  name: 'my-worker',
  script: 'export default { fetch() { return new Response("Hello") } }',
  bindings: [
    { type: 'kv_namespace', name: 'KV', namespace_id: 'xxx' }
  ]
})

// List workers
const workers = await api.listWorkers()

// Delete worker
await api.deleteWorker('my-worker')

// Get worker metadata
const metadata = await api.getWorkerMetadata('my-worker')
```

#### API Methods

```typescript
interface CloudflareApi {
  // Worker operations
  uploadWorker(options: UploadOptions): Promise<UploadResult>
  deleteWorker(name: string): Promise<void>
  listWorkers(): Promise<WorkerMetadata[]>
  getWorkerMetadata(name: string): Promise<WorkerMetadata>

  // Dispatch namespace (Workers for Platforms)
  createDispatchNamespace(name: string): Promise<DispatchNamespace>
  deleteDispatchNamespace(name: string): Promise<void>
  listDispatchNamespaces(): Promise<DispatchNamespace[]>
  uploadToDispatchNamespace(namespace: string, name: string, script: string): Promise<UploadResult>

  // KV operations
  listKVNamespaces(): Promise<KVNamespace[]>
  createKVNamespace(title: string): Promise<KVNamespace>

  // Secrets
  putSecret(workerName: string, name: string, value: string): Promise<void>
  deleteSecret(workerName: string, name: string): Promise<void>
}
```

## SDK Provider

The SDK Provider creates local or remote implementations of the SDK globals (`$`, `db`, `ai`, `on`, `every`, `send`) used in MDX documents.

mdxe provides two SDK provider implementations:
- **`createSDKProvider`** - Multi-runtime provider for Node.js, Bun, and general environments
- **`createWorkerdSDKProvider`** - Optimized provider for Cloudflare Workers (workerd runtime)

### Decision Tree: Which SDK Provider to Use?

```
Is your target runtime Cloudflare Workers?
├── YES → Use createWorkerdSDKProvider
│   ├── Production deployment? → context: 'remote' with Worker Loader bindings
│   └── Local development? → context: 'local' with Miniflare
│
└── NO → Use createSDKProvider
    ├── Node.js/Bun server? → context: 'local' with sqlite/postgres/fs
    └── Multi-tenant SaaS? → context: 'remote' with RPC
```

**Quick Decision:**
- Deploying to **Cloudflare Workers**? → `createWorkerdSDKProvider`
- Running on **Node.js, Bun, or other runtimes**? → `createSDKProvider`

### Comparison Table

| Feature | `createSDKProvider` | `createWorkerdSDKProvider` |
|---------|---------------------|----------------------------|
| **Source File** | [`sdk-provider.ts`](./src/sdk-provider.ts) | [`sdk-workerd.ts`](./src/sdk-workerd.ts) |
| **Target Runtime** | Node.js, Bun, general JS | Cloudflare Workers (workerd) |
| **Database Backends** | memory, fs, sqlite, postgres, clickhouse, mongo | D1 SQLite, KV, R2 (via bindings) |
| **AI Mode** | local (stub) or remote (RPC) | local (stub) or remote (RPC) |
| **Remote Context** | HTTP RPC to `rpc.do` | Worker Loader bindings |
| **Local Development** | In-process with mdxdb | In-memory (Miniflare-compatible) |
| **Code Injection** | `generateSDKInjectionCode()` | `generateWorkerdSDKCode()` |
| **Cleanup Method** | `sdk.close()` | `sdk.dispose()` |
| **Context Object** | `sdk.context` | `sdk.$` |

### createSDKProvider (Multi-Runtime)

Use for Node.js, Bun, or environments where you need flexible database backends.

```typescript
import { createSDKProvider } from 'mdxe'

// Local context with SQLite
const sdk = await createSDKProvider({
  context: 'local',
  db: 'sqlite',
  dbPath: './data.db',
  aiMode: 'remote',
  ns: 'my-app'
})

// Use the SDK
const post = await sdk.db.create({
  type: 'Post',
  data: { title: 'Hello World', content: 'My first post' }
})

const response = await sdk.ai.generate('Write a summary of this post')

// Register workflow handlers
sdk.workflows.on.Post.created(async (post, $) => {
  console.log('Post created:', post.title)
})

// Clean up
await sdk.close()
```

#### Local vs Remote Context

**Local Context** - Uses in-process implementations:
- `db`: Uses mdxdb with specified backend (memory, fs, sqlite, postgres, clickhouse, mongo)
- `ai`: Uses local models or remote AI APIs
- `workflows`: Uses ai-workflows for event-driven workflows

**Remote Context** - Proxies calls to RPC server:
```typescript
const sdk = await createSDKProvider({
  context: 'remote',
  rpcUrl: 'https://rpc.example.com',
  token: process.env.API_TOKEN,
  ns: 'tenant-123',
  db: 'memory', // Used for type info, actual storage on server
  aiMode: 'remote'
})
```

#### Database Backends

Supported backends for `createSDKProvider`:
- `memory` - In-memory (testing, development)
- `fs` - File system (git-friendly .mdx files)
- `sqlite` - SQLite/Turso (vector search, local-first)
- `postgres` - PostgreSQL with pgvector
- `clickhouse` - ClickHouse (analytics)
- `mongo` - MongoDB with Atlas Vector Search

```typescript
// File system backend
const sdk = await createSDKProvider({
  context: 'local',
  db: 'fs',
  dbPath: './content',
  aiMode: 'local',
  ns: 'my-app'
})

// SQLite backend
const sdk = await createSDKProvider({
  context: 'local',
  db: 'sqlite',
  dbPath: './data.db',
  aiMode: 'remote',
  ns: 'my-app'
})
```

### createWorkerdSDKProvider (Cloudflare Workers)

Use for Cloudflare Workers deployments with native Worker bindings (D1, KV, R2).

```typescript
import { createWorkerdSDKProvider } from 'mdxe'

// Local development (Miniflare-compatible)
const sdk = await createWorkerdSDKProvider({
  context: 'local',
  ns: 'my-app'
})

// Use the SDK (same API as createSDKProvider)
const post = await sdk.db.create({
  type: 'Post',
  data: { title: 'Hello World' }
})

// Access via $ context object
console.log(sdk.$.ns) // 'my-app'

// Get all globals for MDX injection
const globals = sdk.getGlobals()
// { $, db, ai, on, every, send }

// Clean up
await sdk.dispose()
```

#### Production with Worker Bindings

```typescript
// In your Worker handler
export default {
  async fetch(request: Request, env: WorkerEnv) {
    const sdk = await createWorkerdSDKProvider({
      context: 'remote',
      ns: 'my-app',
      env, // Pass Worker environment with LOADER binding
      bindings: {
        D1: env.DB,    // D1 database
        KV: env.KV,    // KV namespace
        R2: env.BUCKET // R2 bucket
      }
    })

    // Database operations use D1/KV/R2 bindings
    const posts = await sdk.db.list({ type: 'Post' })

    await sdk.dispose()
    return new Response(JSON.stringify(posts))
  }
}
```

#### Context Detection

```typescript
import { isLocalContext, isRemoteContext } from 'mdxe'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    if (isLocalContext(env)) {
      // Running in Miniflare or local dev
      console.log('Local development mode')
    }

    if (isRemoteContext(env)) {
      // Running in production Workers
      console.log('Production mode with Worker Loader')
    }
  }
}
```

### Code Generation for Sandboxed Execution

Both providers support generating SDK code for injection into sandboxed environments.

#### Using createSDKProvider

```typescript
import { generateSDKInjectionCode, evaluate } from 'mdxe'

const sdkCode = generateSDKInjectionCode({
  context: 'local',
  db: 'memory',
  aiMode: 'remote',
  ns: 'my-app'
})

const result = await evaluate({
  code: userCode,
  sdkConfig: {
    context: 'local',
    db: 'memory',
    aiMode: 'remote',
    ns: 'my-app'
  }
})
```

#### Using createWorkerdSDKProvider

```typescript
import { generateWorkerdSDKCode } from 'mdxe'

// For local execution
const localCode = generateWorkerdSDKCode({
  ns: 'my-app',
  context: 'local'
})

// For Worker Loader execution
const remoteCode = generateWorkerdSDKCode({
  ns: 'my-app',
  context: 'remote'
})
```

### Side-by-Side Examples

#### Local Development

```typescript
// Node.js/Bun with SQLite
import { createSDKProvider } from 'mdxe'

const sdk = await createSDKProvider({
  context: 'local',
  db: 'sqlite',
  dbPath: './data.db',
  aiMode: 'remote',
  ns: 'my-app'
})

await sdk.db.create({ type: 'Post', data: { title: 'Hello' } })
await sdk.close()
```

```typescript
// Cloudflare Workers (local dev)
import { createWorkerdSDKProvider } from 'mdxe'

const sdk = await createWorkerdSDKProvider({
  context: 'local',
  ns: 'my-app'
})

await sdk.db.create({ type: 'Post', data: { title: 'Hello' } })
await sdk.dispose()
```

#### Production Deployment

```typescript
// Node.js server with PostgreSQL
import { createSDKProvider } from 'mdxe'

const sdk = await createSDKProvider({
  context: 'local',
  db: 'postgres',
  dbPath: process.env.DATABASE_URL,
  aiMode: 'remote',
  ns: 'production'
})
```

```typescript
// Cloudflare Workers with D1
import { createWorkerdSDKProvider } from 'mdxe'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const sdk = await createWorkerdSDKProvider({
      context: 'remote',
      ns: 'production',
      env,
      bindings: { D1: env.DB }
    })
    // ...
  }
}
```

### Migration Guide: Legacy to Workerd SDK

If you're migrating from `createSDKProvider` to `createWorkerdSDKProvider` for Cloudflare Workers:

1. **Update imports:**
   ```typescript
   // Before
   import { createSDKProvider, generateSDKInjectionCode } from 'mdxe'

   // After
   import { createWorkerdSDKProvider, generateWorkerdSDKCode } from 'mdxe'
   ```

2. **Update configuration:**
   ```typescript
   // Before
   const sdk = await createSDKProvider({
     context: 'local',
     db: 'memory',
     aiMode: 'remote',
     ns: 'my-app'
   })

   // After
   const sdk = await createWorkerdSDKProvider({
     context: 'local',
     ns: 'my-app'
     // Note: No db/aiMode needed - workerd uses bindings
   })
   ```

3. **Update cleanup:**
   ```typescript
   // Before
   await sdk.close()

   // After
   await sdk.dispose()
   ```

4. **Update context access:**
   ```typescript
   // Before
   sdk.context.ns

   // After
   sdk.$.ns
   ```

5. **Update code generation:**
   ```typescript
   // Before
   const code = generateSDKInjectionCode({ context: 'local', db: 'memory', aiMode: 'remote', ns: 'app' })

   // After
   const code = generateWorkerdSDKCode({ context: 'local', ns: 'app' })
   ```

6. **Add Worker bindings for production:**
   ```typescript
   // Add to wrangler.toml
   [[d1_databases]]
   binding = "DB"
   database_name = "my-db"
   database_id = "xxx"

   // Pass env to SDK
   const sdk = await createWorkerdSDKProvider({
     context: 'remote',
     ns: 'my-app',
     env,
     bindings: { D1: env.DB }
   })
   ```

## Execution Contexts

mdxe provides execution contexts for different runtimes.

### Types

```typescript
interface ExecutionContext {
  runtime: 'node' | 'bun' | 'workers' | 'browser'
  env: Record<string, string>
  request?: Request
  waitUntil?: (promise: Promise<unknown>) => void
}

interface ExecutionResult<T = unknown> {
  success: boolean
  value?: T
  error?: Error
  duration: number
}
```

### ai-sandbox Integration

mdxe re-exports `evaluate` and `createEvaluator` from ai-sandbox for secure code execution:

```typescript
import { evaluate } from 'mdxe'

const result = await evaluate({
  code: `
    // User code with SDK access
    const post = await db.create({
      type: 'Post',
      data: { title: 'Test' }
    })
    return post
  `,
  sdkConfig: {
    context: 'local',
    db: 'memory',
    aiMode: 'local',
    ns: 'sandbox'
  }
})

console.log(result.value) // Created post
```

## Primitives Integration

mdxe integrates with the primitives packages for core functionality:

| Package | Description | Usage in mdxe |
|---------|-------------|---------------|
| [ai-sandbox](../../primitives/packages/ai-sandbox) | Secure code execution | `evaluate()`, `createEvaluator()` for running untrusted code |
| [ai-functions](../../primitives/packages/ai-functions) | AI functions & RPC | RPC types for `@mdxe/rpc`, AI function interfaces |
| [ai-workflows](../../primitives/packages/ai-workflows) | Event-driven workflows | Workflow types (`on`, `every`, `send`) in SDK provider |

### ai-sandbox

Execute code safely in sandboxed environments:

```typescript
import { evaluate } from 'mdxe'

const result = await evaluate({
  code: `
    const greeting = 'Hello ' + input.name
    return { message: greeting }
  `,
  input: { name: 'World' }
})

console.log(result.value) // { message: 'Hello World' }
```

### ai-workflows

Event-driven workflows with the `$` context:

```typescript
import type { WorkflowContext, OnProxy, EveryProxy } from 'mdxe'

// Type-safe workflow handlers
const handlers = {
  on: {
    Customer: {
      created: async (customer: any, $: WorkflowContext) => {
        await $.send('Email.welcome', { to: customer.email })
      }
    }
  }
}
```

### ai-functions RPC

RPC types for distributed execution:

```typescript
import type { RPC, RPCPromise, RPCServer, RPCClient } from 'mdxe'

// Use with @mdxe/rpc for capnweb promise pipelining
```

## Runtime Packages

mdxe integrates with several runtime-specific packages:

| Package | Description |
|---------|-------------|
| [@mdxe/hono](https://www.npmjs.com/package/@mdxe/hono) | Hono framework integration |
| [@mdxe/next](https://www.npmjs.com/package/@mdxe/next) | Next.js integration |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js runtime |
| [@mdxe/bun](https://www.npmjs.com/package/@mdxe/bun) | Bun runtime |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers |
| [@mdxe/vitest](https://www.npmjs.com/package/@mdxe/vitest) | Vitest testing integration |
| [@mdxe/ink](https://www.npmjs.com/package/@mdxe/ink) | CLI applications with Ink |
| [@mdxe/isolate](https://www.npmjs.com/package/@mdxe/isolate) | Isolated execution |
| [@mdxe/rpc](https://www.npmjs.com/package/@mdxe/rpc) | capnweb RPC protocol |
| [@mdxe/mcp](https://www.npmjs.com/package/@mdxe/mcp) | Model Context Protocol server |

## Examples

### Deploy Hono API

```typescript
import { deploy } from 'mdxe'

// src/index.ts
// import { Hono } from 'hono'
// const app = new Hono()
// app.get('/', (c) => c.json({ hello: 'world' }))
// export default app

await deploy({
  source: './src',
  name: 'my-api',
  cloudflare: {
    accountId: process.env.CF_ACCOUNT_ID!,
    apiToken: process.env.CF_API_TOKEN!,
  }
})
```

### Deploy Static Site

```typescript
import { deploy, detectSourceType } from 'mdxe'

const sourceType = await detectSourceType('./dist')

if (sourceType.type === 'static') {
  await deploy({
    source: './dist',
    name: 'my-site',
    cloudflare: {
      accountId: process.env.CF_ACCOUNT_ID!,
      apiToken: process.env.CF_API_TOKEN!,
    },
    routes: ['example.com/*', 'www.example.com/*']
  })
}
```

### Workers for Platforms

Deploy user scripts to a dispatch namespace:

```typescript
import { createCloudflareApi } from 'mdxe'

const api = createCloudflareApi({
  accountId: 'abc123',
  apiToken: 'token'
})

// Create namespace for user workers
const namespace = await api.createDispatchNamespace('user-workers')

// Deploy user's worker
await api.uploadToDispatchNamespace(
  'user-workers',
  'user-123-api',
  `export default {
    fetch(request) {
      return new Response('Hello from user worker!')
    }
  }`
)
```

### CI/CD Integration

```typescript
// deploy.ts
import { deploy } from 'mdxe'

async function main() {
  const environment = process.env.ENVIRONMENT || 'staging'
  const workerName = `my-app-${environment}`

  const result = await deploy({
    source: './dist',
    name: workerName,
    cloudflare: {
      accountId: process.env.CF_ACCOUNT_ID!,
      apiToken: process.env.CF_API_TOKEN!,
    },
    env: {
      ENVIRONMENT: environment,
      API_URL: process.env.API_URL!,
    }
  })

  if (!result.success) {
    console.error('Deployment failed:', result.errors)
    process.exit(1)
  }

  console.log(`Deployed ${workerName} to ${result.url}`)
}

main()
```

## CLI Usage

mdxe can also be used as a CLI:

```bash
# Deploy
npx mdxe deploy ./src --name my-worker

# With environment
npx mdxe deploy ./src --name my-worker --env production

# Detect source type
npx mdxe detect ./my-project
```

## Types

### `DeployOptions`

```typescript
interface DeployOptions {
  source: string
  name: string
  cloudflare: CloudflareDeployOptions
  env?: Record<string, string>
  routes?: string[]
  compatibility_date?: string
  compatibility_flags?: string[]
  bindings?: WorkerBinding[]
}
```

### `WorkerBinding`

```typescript
type WorkerBinding =
  | { type: 'kv_namespace'; name: string; namespace_id: string }
  | { type: 'durable_object_namespace'; name: string; class_name: string }
  | { type: 'r2_bucket'; name: string; bucket_name: string }
  | { type: 'd1_database'; name: string; database_id: string }
  | { type: 'service'; name: string; service: string }
  | { type: 'secret_text'; name: string; text: string }
  | { type: 'plain_text'; name: string; text: string }
```

### `WorkerMetadata`

```typescript
interface WorkerMetadata {
  id: string
  name: string
  created_on: string
  modified_on: string
  routes?: Array<{ pattern: string; zone_id?: string }>
  usage_model?: 'bundled' | 'unbound'
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | AI SDK for MDX apps |
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [mdxui](https://www.npmjs.com/package/mdxui) | UI component abstractions |

## License

MIT

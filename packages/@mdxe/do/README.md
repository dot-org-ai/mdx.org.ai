# @mdxe/do

Deploy MDX projects to the .do platform - a managed serverless deployment service built on Cloudflare Workers with automatic OAuth authentication.

## Installation

```bash
pnpm add @mdxe/do
```

## Overview

`@mdxe/do` provides deployment to the .do platform with:

| Feature | Description |
|---------|-------------|
| **OAuth Authentication** | Automatic login via oauth.do (no manual tokens) |
| **Static & Dynamic** | Supports static sites and OpenNext SSR |
| **Framework Detection** | Auto-detects Next.js, Astro, Vite, Fumadocs |
| **Worker Bindings** | KV, D1, R2, and Durable Objects support |
| **Multi-tenant** | Deploy to Workers for Platforms namespaces |
| **Custom Domains** | Automatic HTTPS provisioning |

## Quick Start

```typescript
import { deploy } from '@mdxe/do'

const result = await deploy({
  projectDir: './my-project',
  projectName: 'my-site',
})

if (result.success) {
  console.log(`Deployed to: ${result.url}`)
}
```

## Deployment Architecture

```
                          @mdxe/do
                              |
              +---------------+---------------+
              |                               |
        detectSourceType()              deploy()
              |                               |
    +---------+---------+           +---------+---------+
    |         |         |           |         |         |
  nextjs    astro     vite        static   opennext   custom
    |         |         |           |         |         |
    v         v         v           v         v         v
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
|  SSR   | |Static/ | |Static  | |Worker  | |OpenNext| |Custom  |
|        | |CloudFl | |        | |Script  | |Worker  | |Worker  |
+--------+ +--------+ +--------+ +--------+ +--------+ +--------+
              |                               |
              +---------------+---------------+
                              |
                              v
                    +-------------------+
                    |   .do Platform    |
                    |   (apis.do API)   |
                    +-------------------+
                              |
                              v
                    +-------------------+
                    | Cloudflare Workers|
                    +-------------------+
```

## Deployment Modes

### Static Sites

Deploy pre-built static assets:

```typescript
await deploy({
  projectDir: './my-vite-app',
  mode: 'static',
  outputDir: 'dist',
})
```

### Next.js with OpenNext

Deploy Next.js apps with full SSR support:

```typescript
await deploy({
  projectDir: './my-next-app',
  mode: 'opennext',
  buildCommand: 'npm run build',
})
```

## Framework Detection

The package auto-detects your framework and selects the optimal deployment mode:

| Framework | Adapter | Output Directory |
|-----------|---------|------------------|
| Next.js (SSR) | `opennext` | `.open-next` |
| Next.js (Static Export) | `static` | `out` |
| Astro | `static` or `astro-cloudflare` | `dist` |
| Vite | `static` | `dist` |
| Fumadocs | `opennext` | `.next` |
| Default | `static` | `dist` |

```typescript
import { detectSourceType } from '@mdxe/do'

const info = detectSourceType('./my-project')
// { isStatic: true, adapter: 'static', framework: 'vite', outputDir: 'dist' }
```

## Worker Bindings

Configure Cloudflare bindings for your worker:

```typescript
await deploy({
  projectDir: './my-app',
  kvNamespaces: {
    MY_KV: 'namespace-id',
  },
  d1Databases: {
    DB: 'database-id',
  },
  r2Buckets: {
    BUCKET: 'bucket-name',
  },
  durableObjects: {
    MY_DO: 'class-name',
  },
})
```

## Multi-tenant Deployments

Deploy to Workers for Platforms for multi-tenant SaaS:

```typescript
await deploy({
  projectDir: './tenant-app',
  dispatchNamespace: 'my-namespace',
  tenantId: 'customer-123',
})
```

## Custom Domains

Assign a custom domain with automatic HTTPS:

```typescript
await deploy({
  projectDir: './my-site',
  customDomain: 'example.com',
})
```

## API Reference

### Main Functions

#### `deploy(options)`

Deploy a project to the .do platform with automatic authentication and framework detection.

```typescript
import { deploy } from '@mdxe/do'

const result = await deploy({
  projectDir: './my-project',
  projectName: 'my-site',
  mode: 'static', // or 'opennext'
  buildCommand: 'npm run build',
  outputDir: 'dist',
  env: { NODE_ENV: 'production' },
  dryRun: false,
})
```

**Returns:** `DeployResult`

```typescript
interface DeployResult {
  success: boolean
  url?: string
  productionUrl?: string
  deploymentId?: string
  workerId?: string
  error?: string
  state?: 'pending' | 'building' | 'deploying' | 'ready' | 'error'
  logs?: string[]
  timing?: {
    buildDuration?: number
    deployDuration?: number
    totalDuration?: number
  }
}
```

#### `detectSourceType(projectDir)`

Detect the framework and deployment mode for a project.

```typescript
import { detectSourceType } from '@mdxe/do'

const info = detectSourceType('./my-project')
```

**Returns:** `SourceTypeInfo`

```typescript
interface SourceTypeInfo {
  isStatic: boolean
  adapter?: string       // 'static' | 'opennext' | 'astro-cloudflare'
  framework?: string     // 'nextjs' | 'astro' | 'vite' | 'fumadocs'
  outputDir?: string
}
```

#### `createProvider(config?)`

Create a provider for unified deployment interface.

```typescript
import { createProvider } from '@mdxe/do'

const provider = createProvider({
  apiUrl: 'https://apis.do',
  token: 'your-token', // optional, uses oauth.do if not provided
})

// Deploy
await provider.deploy({ projectDir: './my-project' })

// Manage workers
await provider.getWorker('my-worker')
await provider.deleteWorker('my-worker')
await provider.listWorkers()
```

### DoApi Class

Direct access to the .do platform API.

```typescript
import { DoApi, createDoApiFromEnv } from '@mdxe/do/api'

// Create from environment variables
const api = createDoApiFromEnv()

// Or create manually
const api = new DoApi({
  apiUrl: 'https://apis.do',
  token: 'your-token', // optional
})
```

#### `api.deploy(payload, options?)`

Deploy a worker to the platform.

```typescript
const result = await api.deploy({
  name: 'my-worker',
  code: workerCode,
  mode: 'static',
  compatibilityDate: '2024-01-01',
  assets: [
    { path: 'index.html', content: '<html>...</html>', contentType: 'text/html' },
  ],
})
```

#### `api.getWorker(name)`

Get worker information.

```typescript
const { success, worker, error } = await api.getWorker('my-worker')

if (success && worker) {
  console.log(`Worker: ${worker.name}`)
  console.log(`URL: ${worker.url}`)
  console.log(`Created: ${worker.createdAt}`)
}
```

#### `api.listWorkers()`

List all workers.

```typescript
const { success, workers } = await api.listWorkers()

for (const worker of workers || []) {
  console.log(`${worker.name}: ${worker.url}`)
}
```

#### `api.deleteWorker(name)`

Delete a worker.

```typescript
const { success, error } = await api.deleteWorker('my-worker')
```

#### `api.getLogs(workerId, options?)`

Get deployment logs.

```typescript
const { success, logs } = await api.getLogs('my-worker', {
  limit: 100,
  since: '2024-01-01T00:00:00Z',
})

for (const log of logs || []) {
  console.log(`[${log.level}] ${log.timestamp}: ${log.message}`)
}
```

#### `api.getAuthToken(options?)`

Get authentication token (uses oauth.do if not configured).

```typescript
const token = await api.getAuthToken()
```

## Deployment Options

```typescript
interface DoDeployOptions {
  /** Project directory to deploy */
  projectDir: string

  /** Worker/project name */
  projectName?: string

  /** Deployment mode: 'static' or 'opennext' */
  mode?: DeployMode

  /** Environment variables */
  env?: Record<string, string>

  /** API URL override */
  apiUrl?: string

  /** Custom domain */
  customDomain?: string

  /** Compatibility date for Workers runtime */
  compatibilityDate?: string

  /** Compatibility flags for Workers runtime */
  compatibilityFlags?: string[]

  /** KV namespace bindings: { BINDING_NAME: 'namespace-id' } */
  kvNamespaces?: Record<string, string>

  /** D1 database bindings: { BINDING_NAME: 'database-id' } */
  d1Databases?: Record<string, string>

  /** R2 bucket bindings: { BINDING_NAME: 'bucket-name' } */
  r2Buckets?: Record<string, string>

  /** Durable Object bindings: { BINDING_NAME: 'class-name' } */
  durableObjects?: Record<string, string>

  /** Dispatch namespace for multi-tenant deployments */
  dispatchNamespace?: string

  /** Tenant ID for multi-tenant deployments */
  tenantId?: string

  /** Build command override */
  buildCommand?: string

  /** Output directory override */
  outputDir?: string

  /** Dry run - show what would happen without deploying */
  dryRun?: boolean

  /** Force deployment */
  force?: boolean

  /** Verbose output */
  verbose?: boolean
}
```

## Dry Run Mode

Preview deployment without making changes:

```typescript
const result = await deploy({
  projectDir: './my-project',
  dryRun: true,
})

console.log(result.logs) // Shows what would happen
// [
//   'Skipping authentication (dry run)',
//   'Detected: vite (static)',
//   'Deployment mode: static',
//   '[dry-run] Would POST to https://apis.do/workers',
//   '[dry-run] Worker name: my-project',
//   '[dry-run] Mode: static',
//   '[dry-run] Assets: 42 files',
// ]
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DO_API_URL` | Custom API URL (defaults to `https://apis.do`) |
| `DO_TOKEN` | Authentication token (uses oauth.do if not set) |
| `DO_ADMIN_TOKEN` | Admin authentication token |

## Authentication

The package uses [oauth.do](https://oauth.do) for automatic authentication:

1. On first deployment, a browser window opens for OAuth login
2. After successful login, the token is cached locally
3. Subsequent deployments use the cached token automatically

To use a pre-configured token:

```typescript
import { DoApi } from '@mdxe/do/api'

const api = new DoApi({
  token: process.env.DO_TOKEN,
})
```

Or set environment variables:

```bash
export DO_TOKEN="your-token-here"
```

## TypeScript Types

```typescript
import type {
  DoDeployOptions,
  DeployResult,
  DeployMode,
  DeployPayload,
  SourceTypeInfo,
  AssetFile,
  DoProvider,
} from '@mdxe/do'

// DoApiConfig is available from the /api subpath
import type { DoApiConfig } from '@mdxe/do/api'
```

## Examples

### Basic Static Site

```typescript
import { deploy } from '@mdxe/do'

await deploy({
  projectDir: './my-site',
  projectName: 'my-static-site',
  mode: 'static',
})
```

### Next.js with Database

```typescript
import { deploy } from '@mdxe/do'

await deploy({
  projectDir: './my-next-app',
  projectName: 'my-app',
  mode: 'opennext',
  d1Databases: {
    DB: 'my-database-id',
  },
  kvNamespaces: {
    CACHE: 'my-cache-namespace-id',
  },
  env: {
    DATABASE_URL: 'd1://DB',
    NODE_ENV: 'production',
  },
})
```

### With AI Integration

```typescript
import { deploy } from '@mdxe/do'

await deploy({
  projectDir: './my-ai-app',
  projectName: 'ai-chat',
  mode: 'opennext',
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY!,
  },
  kvNamespaces: {
    SESSIONS: 'session-namespace-id',
  },
  r2Buckets: {
    UPLOADS: 'user-uploads',
  },
})
```

### Multi-tenant SaaS

```typescript
import { deploy } from '@mdxe/do'

// Deploy the base tenant template
await deploy({
  projectDir: './tenant-template',
  projectName: 'tenant-base',
  dispatchNamespace: 'saas-tenants',
})

// Deploy a specific tenant
await deploy({
  projectDir: './tenant-template',
  projectName: 'tenant-acme',
  dispatchNamespace: 'saas-tenants',
  tenantId: 'acme-corp',
  env: {
    TENANT_ID: 'acme-corp',
    TENANT_NAME: 'Acme Corporation',
  },
})
```

### CI/CD Pipeline

```typescript
import { deploy } from '@mdxe/do'

const result = await deploy({
  projectDir: process.cwd(),
  projectName: process.env.PROJECT_NAME || 'my-app',
  buildCommand: 'pnpm build',
  env: {
    NODE_ENV: 'production',
    API_URL: process.env.API_URL!,
  },
})

if (!result.success) {
  console.error('Deployment failed:', result.error)
  console.error('Logs:', result.logs?.join('\n'))
  process.exit(1)
}

console.log(`Deployed to: ${result.url}`)
console.log(`Build time: ${result.timing?.buildDuration}ms`)
console.log(`Deploy time: ${result.timing?.deployDuration}ms`)
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxe/cloudflare](../cloudflare) | Direct Cloudflare Workers/Pages deployment |
| [@mdxe/workers](../workers) | Cloudflare Workers MDX evaluation runtime |
| [@mdxdb/do](../../@mdxdb/do) | Durable Objects database adapter |
| [oauth.do](https://www.npmjs.com/package/oauth.do) | OAuth authentication library |
| [mdxld](../../mdxld) | MDX + Linked Data parser |

## License

MIT

# @mdxe/do

Deploy MDX projects to the .do platform - a managed serverless deployment service built on Cloudflare Workers.

## Installation

```bash
pnpm add @mdxe/do
```

## Usage

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

## Features

- **OAuth Authentication** - Automatic login via oauth.do
- **Static & Dynamic** - Supports static sites and OpenNext SSR
- **Multi-tenant** - Deploy to Workers for Platforms namespaces
- **Bindings** - KV, D1, R2, and Durable Objects support
- **Custom Domains** - Automatic HTTPS

## Deployment Modes

### Static Sites

```typescript
await deploy({
  projectDir: './my-vite-app',
  mode: 'static',
  outputDir: 'dist',
})
```

### Next.js with OpenNext

```typescript
await deploy({
  projectDir: './my-next-app',
  mode: 'opennext',
  buildCommand: 'npm run build',
})
```

## Worker Bindings

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

```typescript
// Deploy to Workers for Platforms namespace
await deploy({
  projectDir: './tenant-app',
  dispatchNamespace: 'my-namespace',
  tenantId: 'customer-123',
})
```

## Custom Domains

```typescript
await deploy({
  projectDir: './my-site',
  customDomain: 'example.com',
})
```

## API Client

```typescript
import { DoApi, createDoApiFromEnv } from '@mdxe/do/api'

const api = createDoApiFromEnv()

// Get worker info
const { worker } = await api.getWorker('my-worker')

// Delete worker
await api.deleteWorker('my-worker')

// List workers
const { workers } = await api.listWorkers()
```

## Environment Variables

- `DO_API_URL` - Custom API URL (defaults to production)

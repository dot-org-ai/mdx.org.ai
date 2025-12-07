# @mdxe/cloudflare

Deploy MDX projects to Cloudflare Workers and Pages with automatic detection of static vs. dynamic content (OpenNext SSR).

## Installation

```bash
pnpm add @mdxe/cloudflare
```

## Usage

### Auto-detect deployment target

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

### Deploy to Workers (dynamic/SSR)

```typescript
const result = await deploy({
  projectDir: './my-next-app',
  target: 'workers',
  mode: 'opennext', // For Next.js SSR
  kvNamespaces: { MY_KV: 'namespace-id' },
  d1Databases: { DB: 'database-id' },
})
```

### Deploy to Pages (static)

```typescript
const result = await deploy({
  projectDir: './my-static-site',
  target: 'pages',
  mode: 'static',
})
```

## API

- `deploy(options)` - Auto-detect and deploy to Workers or Pages
- `deployToWorkers(options)` - Deploy to Cloudflare Workers
- `deployToPages(options)` - Deploy to Cloudflare Pages
- `detectSourceType(dir)` - Detect framework and adapter (opennext, astro-cloudflare, static)
- `CloudflareApi` - Direct API client for Workers management

## Provider Interface

```typescript
import { createProvider } from '@mdxe/cloudflare'

const provider = createProvider({
  accountId: 'your-account-id',
  apiToken: 'your-api-token',
})

await provider.deploy({ projectDir: './my-project' })
```

## Environment Variables

- `CLOUDFLARE_ACCOUNT_ID` - Your Cloudflare account ID
- `CLOUDFLARE_API_TOKEN` - API token with Workers/Pages permissions

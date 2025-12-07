# @mdxe/vercel

Deploy MDX projects to Vercel via CLI, REST API, or managed API with automatic framework detection.

## Installation

```bash
pnpm add @mdxe/vercel
```

## Usage

### Simple deployment (auto-detects CLI or API)

```typescript
import { deploy } from '@mdxe/vercel'

const result = await deploy({
  projectDir: './my-project',
  projectName: 'my-site',
  token: process.env.VERCEL_TOKEN,
})

console.log(`Deployed to: ${result.url}`)
```

### Production deployment

```typescript
const result = await deploy({
  projectDir: './my-next-app',
  production: true,
  token: process.env.VERCEL_TOKEN,
})
```

### With custom configuration

```typescript
await deploy({
  projectDir: './my-app',
  framework: 'nextjs',
  buildCommand: 'build',
  outputDir: '.next',
  env: {
    API_KEY: 'secret',
  },
  regions: ['sfo1', 'iad1'],
})
```

## API Client

```typescript
import { VercelApi, createVercelApiFromEnv } from '@mdxe/vercel/api'

const api = createVercelApiFromEnv()

// Create deployment
const deployment = await api.createDeployment({
  name: 'my-project',
  files: [{ file: 'index.html', data: '<html>...</html>' }],
  target: 'production',
})

// Get deployment status
const status = await api.getDeployment(deployment.id)

// Wait for deployment
await api.waitForDeployment(deployment.id, {
  timeout: 600000,
  pollInterval: 5000,
})

// Cancel deployment
await api.cancelDeployment(deployment.id)

// Delete deployment
await api.deleteDeployment(deployment.id)
```

## Project Management

```typescript
import { linkProject, setEnvVars } from '@mdxe/vercel'

// Link or create project
const { projectId } = await linkProject({
  projectDir: './my-app',
  projectName: 'my-site',
  framework: 'nextjs',
  token: process.env.VERCEL_TOKEN,
})

// Set environment variables
await setEnvVars({
  projectId,
  env: {
    DATABASE_URL: 'postgres://...',
    API_KEY: 'secret',
  },
  target: ['production', 'preview'],
  token: process.env.VERCEL_TOKEN,
})
```

## Git Integration

```typescript
await deploy({
  projectDir: './my-app',
  git: {
    commitSha: '1234567',
    commitMessage: 'Add new feature',
    commitAuthorName: 'Alice',
    branch: 'main',
  },
})
```

## Framework Detection

Automatically detects and configures:
- Next.js
- Vite
- Remix
- Astro
- Gatsby
- Nuxt
- SvelteKit

## Environment Variables

- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_TEAM_ID` - Team ID (for team deployments)
- `VERCEL_API_URL` - Custom managed API URL (optional)

## Deployment Methods

1. **Vercel CLI** (default if installed) - Uses `npx vercel`
2. **Vercel REST API** - Direct API calls with file uploads
3. **Managed API** - Uses oauth.do authentication

# @mdxe/deploy

Unified deployment interface for MDX projects. Deploy to .do, Cloudflare, Vercel, or GitHub Pages with a single API.

## Installation

```bash
pnpm add @mdxe/deploy
```

## Usage

### Auto-detect platform

```typescript
import { deploy } from '@mdxe/deploy'

// Detects platform from wrangler.toml, vercel.json, or defaults to .do
const result = await deploy({
  projectDir: './my-project',
  name: 'my-site',
})

console.log(`Deployed to ${result.platform}: ${result.url}`)
```

### Deploy to specific platform

```typescript
// Deploy to .do platform (default)
await deploy({
  projectDir: './my-project',
  platform: 'do',
})

// Deploy to Cloudflare
await deploy({
  projectDir: './my-project',
  platform: 'cloudflare',
})

// Deploy to Vercel
await deploy({
  projectDir: './my-project',
  platform: 'vercel',
  production: true,
})

// Deploy to GitHub Pages
await deploy({
  projectDir: './my-project',
  platform: 'github',
  repository: 'user/repo',
})
```

## Platform Detection

The package automatically detects the best platform based on:

1. **Explicit config** - `wrangler.toml` → Cloudflare, `vercel.json` → Vercel
2. **Default** - .do platform (managed serverless)

```typescript
import { detectPlatform } from '@mdxe/deploy'

const detection = detectPlatform('./my-project')
console.log(detection)
// { platform: 'do', confidence: 0.9, framework: 'nextjs', isStatic: false }
```

## Platform-Specific Helpers

```typescript
import { deployToDo, deployToCloudflare, deployToVercel, deployToGitHub } from '@mdxe/deploy'

await deployToDo({ projectDir: '.' })
await deployToCloudflare({ projectDir: '.' })
await deployToVercel({ projectDir: '.' })
await deployToGitHub({ projectDir: '.' })
```

## Deployment Management

```typescript
import { getDeploymentStatus, cancelDeployment, deleteDeployment } from '@mdxe/deploy'

// Check status (Vercel)
const status = await getDeploymentStatus('vercel', 'deployment-id')

// Cancel deployment
await cancelDeployment('vercel', 'deployment-id')

// Delete deployment
await deleteDeployment('vercel', 'deployment-id')
```

## Custom Providers

```typescript
import { registerProvider, type DeployProvider } from '@mdxe/deploy'

const customProvider: DeployProvider = {
  platform: 'custom',
  name: 'Custom Platform',
  async deploy(options) {
    // Your deployment logic
    return { success: true, url: 'https://...' }
  },
  supports(options) {
    return true
  },
}

registerProvider(customProvider)
```

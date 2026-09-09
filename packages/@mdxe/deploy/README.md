# @mdxe/deploy

Unified deployment interface for MDX projects. Deploy to the .do platform or directly to Cloudflare Workers with a single API.

Both targets run on Cloudflare Workers. Vercel and GitHub Pages providers were removed in 2.0 (mdx-8je.7: mdx.org.ai is Cloudflare-native only); `@mdxe/vercel` and `@mdxe/github` are deprecated on npm and receive no further releases.

## Installation

```bash
pnpm add @mdxe/deploy
```

## Usage

### Auto-detect platform

```typescript
import { deploy } from '@mdxe/deploy'

// Detects Cloudflare from wrangler.toml / wrangler.jsonc, otherwise defaults to .do
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
```

## Platform Detection

The package automatically detects the best platform based on:

1. **Explicit config** - `wrangler.toml` / `wrangler.jsonc` → Cloudflare
2. **Default** - .do platform (managed serverless)

```typescript
import { detectPlatform } from '@mdxe/deploy'

const detection = detectPlatform('./my-project')
console.log(detection)
// { platform: 'do', confidence: 0.9, framework: 'vite', isStatic: true }
```

## Platform-Specific Helpers

```typescript
import { deployToDo, deployToCloudflare } from '@mdxe/deploy'

await deployToDo({ projectDir: '.' })
await deployToCloudflare({ projectDir: '.' })
```

## Deployment Management

```typescript
import { getDeploymentStatus, cancelDeployment, deleteDeployment } from '@mdxe/deploy'

// Delete a .do worker
await deleteDeployment('do', 'worker-name')

// Status checks and cancellation return { success: false, error } for providers
// that do not implement them.
const status = await getDeploymentStatus('cloudflare', 'deployment-id')
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

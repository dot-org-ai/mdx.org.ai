# @mdxe/github

Deploy MDX projects to GitHub Pages via git push, GitHub Actions, or managed API.

## Installation

```bash
pnpm add @mdxe/github
```

## Usage

### Direct git push (default)

```typescript
import { deploy } from '@mdxe/github'

const result = await deploy({
  projectDir: './my-project',
  repository: 'user/repo',
  token: process.env.GITHUB_TOKEN,
})

console.log(`Deployed to: ${result.url}`)
```

### GitHub Actions workflow

```typescript
import { deploy } from '@mdxe/github'

// Generates and commits workflow file
await deploy({
  projectDir: './my-project',
  useActions: true,
})

// Next push will trigger automated deployment
```

### Manually generate workflow

```typescript
import { setupPagesActions } from '@mdxe/github/actions'

const workflowPath = setupPagesActions({
  projectDir: './my-project',
  buildCommand: 'build',
  outputDir: 'out',
})
```

## Options

```typescript
await deploy({
  projectDir: './my-project',
  repository: 'user/repo', // Auto-detected from git remote
  branch: 'gh-pages', // Target branch (default: 'gh-pages')
  sourceBranch: 'main', // Source branch for Actions
  outputDir: 'out', // Build output directory
  buildCommand: 'build', // npm script to run
  token: process.env.GITHUB_TOKEN,
  customDomain: 'example.com',
  clean: true, // Clean branch before deploy (default: true)
  preserve: ['.git'], // Files to preserve
})
```

## GitHub API

```typescript
import { configurePagesApi } from '@mdxe/github'

// Enable and configure Pages via API
await configurePagesApi({
  token: process.env.GITHUB_TOKEN,
  owner: 'user',
  repo: 'repo',
  customDomain: 'example.com',
  enforceHttps: true,
})
```

## Workflow Generation

```typescript
import { generatePagesWorkflow, generateNextJsWorkflow } from '@mdxe/github/actions'

// Static site workflow
const staticWorkflow = generatePagesWorkflow({
  buildCommand: 'build',
  outputDir: 'dist',
})

// Next.js workflow
const nextWorkflow = generateNextJsWorkflow({
  buildCommand: 'build',
  outputDir: 'out',
})
```

## Environment Variables

- `GITHUB_TOKEN` - Personal access token with `repo` and `pages` permissions
- `GITHUB_API_URL` - Custom managed API URL (optional)

## Deployment Methods

1. **Direct Git Push** (default) - Clones gh-pages branch, copies files, commits and pushes
2. **GitHub Actions** - Generates workflow file for automated deployments
3. **Managed API** - Uses oauth.do authentication with managed API endpoint

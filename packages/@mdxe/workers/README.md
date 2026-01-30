# @mdxe/workers

Pure Cloudflare Workers execution for MDX. Evaluate MDX code securely at the edge with zero Node.js dependencies.

## Installation

```bash
npm install @mdxe/workers
# or
pnpm add @mdxe/workers
# or
yarn add @mdxe/workers
```

## Architecture

This package is designed to be **pure Cloudflare Workers** compatible:

| Export | Purpose | Dependencies |
|--------|---------|--------------|
| `@mdxe/workers` | Main export - runtime + compilation utilities | `@mdxe/isolate` |
| `@mdxe/workers/runtime` | Pure runtime only - no compilation | None (pure Workers) |
| `@mdxe/workers/build` | Node.js build tools | `esbuild`, `mdxld` |

### Runtime vs Build

- **Runtime code** (`evaluateModule`, `cacheModule`, etc.) runs in Cloudflare Workers
- **Build code** (`build`, `publish`) runs on your development machine (Node.js)

## Quick Start

### Using Pre-compiled Modules (Recommended)

```typescript
// src/worker.ts
import { evaluateModule, type WorkerEnv } from '@mdxe/workers'

// Pre-compile your MDX at build time (see @mdxe/isolate)
import { compiledModule } from './compiled-mdx.js'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const result = await evaluateModule(compiledModule, env)
    const greeting = await result.call('greet', 'World')
    return new Response(greeting)
  }
}
```

### Runtime Compilation (Development)

```typescript
// src/worker.ts
import { evaluate, type WorkerEnv } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const mdx = `
      export function greet(name) {
        return \`Hello, \${name}!\`
      }
    `

    const result = await evaluate(mdx, env, {
      sandbox: { blockNetwork: true }
    })

    const greeting = await result.call('greet', 'World')
    return new Response(greeting)
  }
}
```

## Worker Loader Binding

This package requires the `[[worker_loaders]]` binding in your `wrangler.toml`:

```toml
# wrangler.toml
name = "my-mdx-worker"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

# Required: Dynamic Worker Loader binding
[[worker_loaders]]
binding = "LOADER"
```

The Worker Loader binding enables dynamic worker creation for isolated MDX execution.

## API Reference

### Runtime Functions

#### `evaluateModule(module, env, options?)`

Evaluate a pre-compiled MDX module in an isolated worker.

```typescript
async function evaluateModule<T = unknown>(
  module: CompiledModule,
  env: WorkerEnv,
  options?: EvaluateOptions
): Promise<EvaluateResult<T>>

interface EvaluateOptions {
  sandbox?: SandboxOptions
  cache?: boolean
  moduleId?: string
}

interface EvaluateResult<T> {
  exports: Record<string, unknown>
  data: Record<string, unknown>
  call: <R = unknown>(name: string, ...args: unknown[]) => Promise<R>
  meta: () => Promise<{ exports: string[]; hasDefault: boolean }>
  moduleId: string
}
```

#### Cache Utilities

```typescript
// Clear cache
clearCache(moduleId?: string): void

// Check if cached
isCached(moduleId: string): boolean

// Get cache stats
getCacheStats(): { size: number; moduleIds: string[] }

// Get cached module
getCachedModule(moduleId: string): CompiledModule | undefined

// Store module in cache
cacheModule(module: CompiledModule, moduleId?: string): string
```

#### `evaluate(content, env, options?)` (includes compilation)

Compile and evaluate MDX content at runtime.

```typescript
async function evaluate<T = unknown>(
  content: string,
  env: WorkerEnv,
  options?: EvaluateOptions
): Promise<EvaluateResult<T>>
```

### Build Functions (Node.js only)

Import from `@mdxe/workers/build`:

```typescript
import { build, publish, buildWorker, buildAndPublish } from '@mdxe/workers/build'

// Build MDX project
const result = await build({
  projectDir: './my-site',
  outDir: 'dist',
  minify: true,
})

// Publish to Cloudflare
await publish(result.bundle, {
  namespace: 'my-site',
  accountId: 'your-account-id',
})
```

## Types

### `WorkerEnv`

```typescript
interface WorkerEnv {
  LOADER: WorkerLoader
  [key: string]: unknown
}
```

### `CompiledModule`

```typescript
interface CompiledModule {
  mainModule: string
  modules: Record<string, string>
  data: Record<string, unknown>
  hash: string
}
```

### `SandboxOptions`

```typescript
interface SandboxOptions {
  blockNetwork?: boolean  // Default: true
  allowedBindings?: string[]
  timeout?: number
  memoryLimit?: number
}
```

## Examples

### API Endpoint for MDX Evaluation

```typescript
import { createHandler, type WorkerEnv } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const handler = createHandler(env, {
      sandbox: { blockNetwork: true }
    })
    return handler(request)
  }
}
```

### Caching Compiled Modules

```typescript
import {
  compileToModule,
  cacheModule,
  evaluateModule,
  isCached,
  getCachedModule
} from '@mdxe/workers'

export default {
  async fetch(request: Request, env: WorkerEnv) {
    const moduleId = 'my-module'

    // Check cache first
    let module = getCachedModule(moduleId)

    if (!module) {
      // Compile and cache
      const mdx = await fetchMDX()
      module = await compileToModule(mdx)
      cacheModule(module, moduleId)
    }

    const result = await evaluateModule(module, env)
    return Response.json(await result.meta())
  }
}
```

### Building Static Workers

```typescript
// build.ts (Node.js)
import { build, publish } from '@mdxe/workers/build'

async function deploy() {
  // Build the project
  const result = await build({
    projectDir: './docs',
    minify: true,
    contentStorage: 'assets',
  })

  if (!result.success) {
    throw new Error(result.error)
  }

  // Publish to Cloudflare
  await publish(result.bundle, {
    namespace: 'docs-site',
    contentStorage: 'assets',
  })
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/isolate](https://www.npmjs.com/package/@mdxe/isolate) | Compile MDX to Worker modules |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation (with Miniflare) |
| [wrangler](https://www.npmjs.com/package/wrangler) | Cloudflare Workers CLI |

## License

MIT

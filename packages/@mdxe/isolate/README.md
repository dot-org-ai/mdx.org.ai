# @mdxe/isolate

Compile MDX to isolated Worker modules. Create self-contained, secure execution units from MDX content for Cloudflare Workers and workerd isolates.

## Installation

```bash
npm install @mdxe/isolate
# or
pnpm add @mdxe/isolate
# or
yarn add @mdxe/isolate
```

## Features

- **Module Compilation** - Compile MDX to standalone Worker modules
- **Sandboxed Execution** - Configure security boundaries (network blocking)
- **Export Discovery** - Introspect module exports
- **Worker Config** - Generate workerd configurations for Dynamic Worker Loader
- **Content Hashing** - Built-in content-based caching with module IDs
- **JSX Runtime Bundling** - Optional bundled JSX runtime for Workers
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { compileToModule, createWorkerConfig, getExports, generateModuleId } from '@mdxe/isolate'

const mdx = `
---
title: Math Utils
---

export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}
`

// Compile MDX to a module
const module = await compileToModule(mdx)

// Create workerd configuration
const config = createWorkerConfig(module, {
  blockNetwork: true
})

// Generate a cache key
const cacheKey = generateModuleId(mdx)

// Use with Cloudflare Dynamic Worker Loader
// const worker = env.LOADER.get(module.hash, async () => config)
```

## Compilation Flow

```
                                    +------------------+
                                    |   MDX Content    |
                                    |  (with YAML-LD)  |
                                    +--------+---------+
                                             |
                                             v
                              +-----------------------------+
                              |      compileToModule()      |
                              |  - Parse frontmatter (mdxld)|
                              |  - Compile MDX (@mdx-js/mdx)|
                              |  - Generate entry module    |
                              |  - Bundle JSX runtime (opt) |
                              +-------------+---------------+
                                            |
                                            v
                              +-----------------------------+
                              |      CompiledModule         |
                              |  - mainModule: 'entry.js'   |
                              |  - modules: { entry, mdx }  |
                              |  - data: frontmatter        |
                              |  - hash: content hash       |
                              +-------------+---------------+
                                            |
                                            v
                              +-----------------------------+
                              |    createWorkerConfig()     |
                              |  - Set compatibility date   |
                              |  - Apply sandbox options    |
                              |  - Configure network access |
                              +-------------+---------------+
                                            |
                                            v
                              +-----------------------------+
                              |       WorkerConfig          |
                              |  Ready for Worker Loader    |
                              +-----------------------------+
```

## API Reference

### `compileToModule(content, options?)`

Compile MDX content to a Worker-compatible module.

```typescript
async function compileToModule(
  content: string,
  options?: CompileToModuleOptions
): Promise<CompiledModule>
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | `string` | MDX content with optional YAML frontmatter |
| `options` | `CompileToModuleOptions` | Compilation options |

**Returns:** `Promise<CompiledModule>`

**Example:**

```typescript
import { compileToModule } from '@mdxe/isolate'

const module = await compileToModule(`
---
title: API Handler
version: 1.0.0
---

export async function handleRequest(request) {
  const url = new URL(request.url)
  return new Response(\`Path: \${url.pathname}\`)
}

export const config = {
  routes: ['/api/*']
}
`, {
  filename: 'api-handler.js',
  bundleRuntime: true
})

console.log(module.data.title)      // 'API Handler'
console.log(module.mainModule)      // 'entry.js'
console.log(Object.keys(module.modules))  // ['api-handler.js', 'entry.js', 'jsx-runtime']
```

### `createWorkerConfig(module, sandbox?)`

Generate a workerd configuration from a compiled module.

```typescript
function createWorkerConfig(
  module: CompiledModule,
  sandbox?: SandboxOptions
): WorkerConfig
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `module` | `CompiledModule` | Compiled module from `compileToModule` |
| `sandbox` | `SandboxOptions` | Security and resource options |

**Returns:** `WorkerConfig`

**Example:**

```typescript
import { compileToModule, createWorkerConfig } from '@mdxe/isolate'

const module = await compileToModule(mdxContent)

// Restricted sandbox (network blocked by default)
const restrictedConfig = createWorkerConfig(module, {
  blockNetwork: true
})

// Permissive sandbox (allow network access)
const permissiveConfig = createWorkerConfig(module, {
  blockNetwork: false
})

// Use with Dynamic Worker Loader
const worker = env.LOADER.get(module.hash, async () => restrictedConfig)
```

### `compileToWorkerConfig(content, options?)`

Compile MDX and create Worker config in one step.

```typescript
async function compileToWorkerConfig(
  content: string,
  options?: CompileToModuleOptions & { sandbox?: SandboxOptions }
): Promise<WorkerConfig & { hash: string; data: Record<string, unknown> }>
```

**Example:**

```typescript
import { compileToWorkerConfig } from '@mdxe/isolate'

const config = await compileToWorkerConfig(mdxContent, {
  bundleRuntime: true,
  sandbox: { blockNetwork: true }
})

// config includes: mainModule, modules, compatibilityDate, globalOutbound, hash, data
```

### `generateModuleId(content, version?)`

Generate a unique module ID for caching.

```typescript
function generateModuleId(content: string, version?: string): string
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `content` | `string` | MDX content to hash |
| `version` | `string` | Optional version suffix |

**Returns:** Alphanumeric hash string, with version suffix if provided

**Example:**

```typescript
import { generateModuleId } from '@mdxe/isolate'

const id1 = generateModuleId(mdxContent)
// e.g., 'a1b2c3d'

const id2 = generateModuleId(mdxContent, 'v1.0.0')
// e.g., 'a1b2c3d-v1.0.0'

// Same content always produces same hash
const id3 = generateModuleId(mdxContent)
console.log(id1 === id3)  // true
```

### `getExports(module)`

Extract exported function/variable names from a compiled module.

```typescript
function getExports(module: CompiledModule): string[]
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `module` | `CompiledModule` | Compiled module to inspect |

**Returns:** Array of exported names

**Example:**

```typescript
import { compileToModule, getExports } from '@mdxe/isolate'

// For direct code inspection, create a module with mainModule pointing to the code
const module = {
  mainModule: 'code.js',
  modules: {
    'code.js': `
      export const PI = 3.14159
      export function circleArea(r) { return PI * r * r }
      export class Calculator { }
    `
  },
  data: {},
  hash: 'test'
}

const exports = getExports(module)
console.log(exports)  // ['PI', 'circleArea', 'Calculator']
```

### `parse(content)`

Re-exported from `mdxld` for convenience. Parse MDX content with frontmatter.

```typescript
import { parse } from '@mdxe/isolate'

const doc = parse(`
---
title: Hello
---

# Content
`)

console.log(doc.data.title)  // 'Hello'
console.log(doc.content)     // '# Content'
```

## Types

### `CompiledModule`

```typescript
interface CompiledModule {
  /** Main module entry point filename (default: 'entry.js') */
  mainModule: string
  /** Module source code map - filename to code */
  modules: Record<string, string>
  /** Parsed frontmatter data from YAML */
  data: Record<string, unknown>
  /** Content hash for caching */
  hash: string
}
```

### `CompileToModuleOptions`

```typescript
interface CompileToModuleOptions {
  /** JSX runtime to use (default: 'automatic') */
  jsxRuntime?: 'automatic' | 'classic'
  /** JSX import source (default: 'react') */
  jsxImportSource?: string
  /** Include JSX runtime shim in bundle (default: false) */
  bundleRuntime?: boolean
  /** Module filename (default: 'mdx.js') */
  filename?: string
  // ...additional MDX compile options
}
```

### `SandboxOptions`

```typescript
interface SandboxOptions {
  /** Block all network access (default: true) */
  blockNetwork?: boolean
  /** Allowed environment bindings */
  allowedBindings?: string[]
  /** Maximum execution time in ms */
  timeout?: number
  /** Memory limit in MB */
  memoryLimit?: number
}
```

### `WorkerConfig`

```typescript
interface WorkerConfig {
  /** Compatibility date for Workers runtime */
  compatibilityDate: string
  /** Main module entry point */
  mainModule: string
  /** Module source code map */
  modules: Record<string, string>
  /** Environment bindings */
  env?: Record<string, unknown>
  /** Global outbound handler (null to block network, undefined to allow) */
  globalOutbound?: unknown | null
}
```

## Worker Entry Module

The compiled module includes an `entry.js` that provides a standard Worker interface:

```typescript
// Endpoints provided by entry.js:

// GET /health - Health check
// Response: { status: 'ok' }

// GET /meta - Module metadata
// Response: { exports: string[], hasDefault: boolean }

// POST /call/{functionName} - Call exported function
// Body: { args: [...] }
// Response: { result: any } or { error: string, stack: string }
```

**Example usage:**

```typescript
// Calling an exported function via the Worker
const response = await fetch('http://worker/call/add', {
  method: 'POST',
  body: JSON.stringify({ args: [1, 2] })
})
const { result } = await response.json()
console.log(result)  // 3
```

## Use Cases

### Serverless Functions

```typescript
import { compileToModule, createWorkerConfig } from '@mdxe/isolate'
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { basename } from 'path'

// Compile all MDX functions
const files = glob.sync('./functions/**/*.mdx')

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  const module = await compileToModule(content, {
    filename: basename(file, '.mdx') + '.js'
  })

  const config = createWorkerConfig(module, {
    blockNetwork: false  // Allow network for API calls
  })

  // Write compiled module
  writeFileSync(`./dist/${module.hash}.config.json`, JSON.stringify(config))
}
```

### Dynamic Plugin System

```typescript
import { compileToModule, getExports } from '@mdxe/isolate'

async function loadPlugin(mdxContent: string) {
  const module = await compileToModule(mdxContent, { bundleRuntime: true })

  // Get available exports
  const moduleWithCode = {
    ...module,
    mainModule: 'mdx.js'  // Point to actual code for export inspection
  }
  const exportNames = getExports(moduleWithCode)

  return {
    hash: module.hash,
    data: module.data,
    exports: exportNames,
    config: createWorkerConfig(module, { blockNetwork: true })
  }
}
```

### Build Pipeline Integration

```typescript
import { compileToModule, generateModuleId } from '@mdxe/isolate'

// Check cache before compiling
const cacheKey = generateModuleId(content, process.env.VERSION)
const cached = await cache.get(cacheKey)

if (cached) {
  return cached
}

const module = await compileToModule(content)
await cache.set(cacheKey, module)
return module
```

### Secure Code Execution

```typescript
import { compileToWorkerConfig } from '@mdxe/isolate'
import { Miniflare } from 'miniflare'

async function executeSecurely(code: string, fn: string, args: unknown[]) {
  const config = await compileToWorkerConfig(code, {
    bundleRuntime: true,
    sandbox: { blockNetwork: true }
  })

  const mf = new Miniflare({
    modules: true,
    script: config.modules[config.mainModule],
    // Additional modules
    modulesRoot: '.',
  })

  const response = await mf.dispatchFetch(`http://worker/call/${fn}`, {
    method: 'POST',
    body: JSON.stringify({ args })
  })

  const { result, error } = await response.json()
  if (error) throw new Error(error)
  return result
}

// Safe execution
const result = await executeSecurely(`
export function calculate(a, b) {
  return a * b + 10
}
`, 'calculate', [5, 3])

console.log(result)  // 25
```

## JSX Runtime

When `bundleRuntime: true`, a minimal JSX runtime is included:

```javascript
// Bundled jsx-runtime module
const Fragment = Symbol.for('react.fragment')

function jsx(type, props, key) {
  return { $$typeof: Symbol.for('react.element'), type, props, key }
}

function jsxs(type, props, key) {
  return jsx(type, props, key)
}

export { Fragment, jsx, jsxs }
```

This allows MDX to compile without external React dependencies in the Worker environment.

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers runtime |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation |
| [workerd](https://github.com/cloudflare/workerd) | Cloudflare's JS runtime |

## License

MIT

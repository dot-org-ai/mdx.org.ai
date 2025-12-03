# @mdxe/isolate

Compile MDX to isolated Worker modules. Create self-contained, secure execution units from MDX content.

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
- **Sandboxed Execution** - Configure security boundaries
- **Export Discovery** - Introspect module exports
- **Worker Config** - Generate workerd configurations
- **Bundling** - Include dependencies in compiled output
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { compileToModule, createWorkerConfig, getExports } from '@mdxe/isolate'

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

// Get exported function names
const exports = getExports(module)
console.log(exports)  // ['add', 'multiply']

// Create workerd configuration
const config = createWorkerConfig(module, {
  allowNetwork: false,
  memoryLimit: 128
})
```

## API Reference

### `compileToModule(content, options?)`

Compile MDX content to a Worker module.

```typescript
async function compileToModule(
  content: string,
  options?: CompileToModuleOptions
): Promise<CompiledModule>

interface CompileToModuleOptions {
  name?: string              // Module name
  bundle?: boolean           // Bundle dependencies (default: true)
  minify?: boolean           // Minify output (default: false)
  sourceMaps?: boolean       // Include source maps (default: true)
  external?: string[]        // External dependencies (don't bundle)
}

interface CompiledModule {
  name: string               // Module identifier
  code: string               // Compiled JavaScript
  sourceMap?: string         // Source map if enabled
  metadata: {
    data: Record<string, unknown>  // Frontmatter data
    exports: string[]        // Exported names
    size: number             // Code size in bytes
  }
}
```

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
  name: 'api-handler',
  minify: true,
  sourceMaps: true
})

console.log(module.metadata.exports)  // ['handleRequest', 'config']
console.log(module.metadata.size)     // Size in bytes
```

### `createWorkerConfig(module, sandbox?)`

Generate a workerd configuration for running the module.

```typescript
function createWorkerConfig(
  module: CompiledModule,
  sandbox?: SandboxOptions
): WorkerConfig

interface SandboxOptions {
  allowNetwork?: boolean     // Allow fetch/WebSocket (default: false)
  allowTimer?: boolean       // Allow setTimeout/setInterval (default: true)
  allowCrypto?: boolean      // Allow crypto API (default: true)
  memoryLimit?: number       // Memory limit in MB (default: 128)
  cpuLimit?: number          // CPU time limit in ms (default: 10000)
  bindings?: Record<string, BindingConfig>  // External bindings
}

interface WorkerConfig {
  name: string
  script: string
  compatibilityDate: string
  bindings: BindingConfig[]
  limits: {
    memory: number
    cpu: number
  }
}
```

**Example:**

```typescript
import { compileToModule, createWorkerConfig } from '@mdxe/isolate'

const module = await compileToModule(mdxContent)

// Restricted sandbox (no network, limited memory)
const restrictedConfig = createWorkerConfig(module, {
  allowNetwork: false,
  memoryLimit: 64,
  cpuLimit: 5000
})

// Permissive sandbox (with bindings)
const permissiveConfig = createWorkerConfig(module, {
  allowNetwork: true,
  bindings: {
    DB: { type: 'd1', database: 'mydb' },
    KV: { type: 'kv', namespace: 'cache' },
    API_KEY: { type: 'secret', name: 'api-key' }
  }
})
```

### `getExports(module)`

Get the list of exported names from a compiled module.

```typescript
function getExports(module: CompiledModule): string[]
```

**Example:**

```typescript
import { compileToModule, getExports } from '@mdxe/isolate'

const module = await compileToModule(`
export const PI = 3.14159
export function circleArea(r) { return PI * r * r }
export class Calculator { /* ... */ }
export default function main() { /* ... */ }
`)

const exports = getExports(module)
console.log(exports)  // ['PI', 'circleArea', 'Calculator', 'default']
```

### `validateModule(module)`

Validate a compiled module for execution safety.

```typescript
function validateModule(module: CompiledModule): ValidationResult

interface ValidationResult {
  valid: boolean
  warnings: string[]
  errors: string[]
}
```

**Example:**

```typescript
import { compileToModule, validateModule } from '@mdxe/isolate'

const module = await compileToModule(untrustedCode)
const validation = validateModule(module)

if (!validation.valid) {
  console.error('Invalid module:', validation.errors)
  process.exit(1)
}

if (validation.warnings.length > 0) {
  console.warn('Warnings:', validation.warnings)
}
```

## Use Cases

### Serverless Functions

```typescript
import { compileToModule, createWorkerConfig } from '@mdxe/isolate'
import { writeFileSync } from 'fs'

// Compile all MDX functions
const files = glob.sync('./functions/**/*.mdx')

for (const file of files) {
  const content = readFileSync(file, 'utf-8')
  const module = await compileToModule(content, {
    name: basename(file, '.mdx')
  })

  const config = createWorkerConfig(module, {
    allowNetwork: true,
    bindings: {
      DB: { type: 'd1', database: 'production' }
    }
  })

  // Write compiled module
  writeFileSync(`./dist/${module.name}.js`, module.code)
  writeFileSync(`./dist/${module.name}.config.json`, JSON.stringify(config))
}
```

### Dynamic Plugin System

```typescript
import { compileToModule, getExports } from '@mdxe/isolate'

interface Plugin {
  name: string
  exports: Record<string, Function>
}

async function loadPlugin(mdxContent: string): Promise<Plugin> {
  const module = await compileToModule(mdxContent)
  const exportNames = getExports(module)

  // Create a VM context and run the module
  const vm = new VM()
  const exports = vm.run(module.code)

  return {
    name: module.name,
    exports: Object.fromEntries(
      exportNames.map(name => [name, exports[name]])
    )
  }
}

// Load and use plugins
const plugin = await loadPlugin(`
export function transform(data) {
  return data.toUpperCase()
}

export function validate(data) {
  return data.length > 0
}
`)

console.log(plugin.exports.transform('hello'))  // HELLO
console.log(plugin.exports.validate('test'))    // true
```

### Build Pipeline

```typescript
import { compileToModule } from '@mdxe/isolate'
import { build } from 'esbuild'

// Step 1: Compile MDX to modules
const mdxFiles = await glob('./src/**/*.mdx')
const modules = await Promise.all(
  mdxFiles.map(async file => {
    const content = await Bun.file(file).text()
    return compileToModule(content, {
      name: file.replace(/\.mdx$/, ''),
      sourceMaps: true
    })
  })
)

// Step 2: Bundle with esbuild
await build({
  entryPoints: modules.map(m => ({
    in: m.name,
    contents: m.code
  })),
  bundle: true,
  outdir: './dist',
  format: 'esm',
  minify: true
})
```

### Secure Code Execution

```typescript
import { compileToModule, createWorkerConfig, validateModule } from '@mdxe/isolate'
import { Miniflare } from 'miniflare'

async function executeSecurely(code: string, fn: string, args: unknown[]) {
  // Compile with no external access
  const module = await compileToModule(code, {
    bundle: true,
    external: []  // Bundle everything
  })

  // Validate before execution
  const validation = validateModule(module)
  if (!validation.valid) {
    throw new Error(`Invalid code: ${validation.errors.join(', ')}`)
  }

  // Create sandboxed config
  const config = createWorkerConfig(module, {
    allowNetwork: false,
    allowTimer: false,
    memoryLimit: 32,
    cpuLimit: 1000
  })

  // Execute in Miniflare
  const mf = new Miniflare({
    script: module.code,
    modules: true
  })

  const exports = await mf.getModuleExports()
  return exports[fn](...args)
}

// Safe execution
const result = await executeSecurely(`
export function calculate(a, b) {
  return a * b + 10
}
`, 'calculate', [5, 3])

console.log(result)  // 25
```

### API Documentation Generator

```typescript
import { compileToModule, getExports } from '@mdxe/isolate'
import { parse } from 'mdxld'

interface APIDoc {
  name: string
  title: string
  description: string
  exports: ExportDoc[]
}

interface ExportDoc {
  name: string
  type: 'function' | 'const' | 'class'
  signature?: string
}

async function generateAPIDocs(mdxContent: string): Promise<APIDoc> {
  const doc = parse(mdxContent)
  const module = await compileToModule(mdxContent)
  const exports = getExports(module)

  return {
    name: module.name,
    title: doc.data.title || module.name,
    description: doc.data.description || '',
    exports: exports.map(name => ({
      name,
      type: detectExportType(module.code, name),
      signature: extractSignature(module.code, name)
    }))
  }
}

// Generate docs for all modules
const docs = await Promise.all(
  mdxFiles.map(file => generateAPIDocs(readFileSync(file, 'utf-8')))
)

writeFileSync('./docs/api.json', JSON.stringify(docs, null, 2))
```

## Types

### `CompiledModule`

```typescript
interface CompiledModule {
  name: string
  code: string
  sourceMap?: string
  metadata: {
    data: Record<string, unknown>
    exports: string[]
    size: number
    compiledAt: Date
  }
}
```

### `SandboxOptions`

```typescript
interface SandboxOptions {
  allowNetwork?: boolean
  allowTimer?: boolean
  allowCrypto?: boolean
  memoryLimit?: number
  cpuLimit?: number
  bindings?: Record<string, BindingConfig>
}
```

### `BindingConfig`

```typescript
type BindingConfig =
  | { type: 'kv'; namespace: string }
  | { type: 'd1'; database: string }
  | { type: 'r2'; bucket: string }
  | { type: 'secret'; name: string }
  | { type: 'var'; value: string }
  | { type: 'service'; service: string }
```

### `WorkerConfig`

```typescript
interface WorkerConfig {
  name: string
  script: string
  compatibilityDate: string
  bindings: BindingConfig[]
  limits: {
    memory: number
    cpu: number
  }
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers |
| [workerd](https://github.com/cloudflare/workerd) | Cloudflare's JS runtime |

## License

MIT

# @mdxe/bun

Fast, secure MDX evaluation for Bun using Miniflare/workerd. Provides isolated execution with the same API as Cloudflare Workers, plus development servers and test runners optimized for Bun's native APIs.

## Installation

```bash
pnpm add @mdxe/bun
# or
npm install @mdxe/bun
# or
bun add @mdxe/bun
```

## Features

- **Miniflare/workerd Isolation** - Secure, sandboxed MDX execution using Cloudflare's workerd runtime
- **Same API as @mdxe/workers** - Compatible with Cloudflare Workers production code
- **Native Bun Server** - Development and production servers using Hono + Bun.serve
- **Test Runner** - Extract and run tests from MDX files with Bun's test framework
- **Hot Reload** - Built-in file watching for development
- **Type-Safe** - Full TypeScript support

## Quick Start

### Evaluate MDX Content

```typescript
import { evaluate } from '@mdxe/bun'

const mdx = `
---
title: Hello World
---

export function greet(name) {
  return \`Hello, \${name}!\`
}

# Welcome

This is MDX content with executable code.
`

const result = await evaluate(mdx, {
  sandbox: { blockNetwork: true }
})

// Call exported functions
const greeting = await result.call('greet', 'World')
console.log(greeting) // "Hello, World!"

// Get module metadata
const meta = await result.meta()
console.log(meta.exports) // ['greet']

// Clean up when done
await result.dispose()
```

### Start a Development Server

```typescript
import { createDevServer } from '@mdxe/bun'

await createDevServer({
  projectDir: './docs',
  port: 3000,
  verbose: true
})
```

## API Reference

### Evaluation Functions

#### `evaluate(content, options?)`

Evaluate MDX content securely in an isolated workerd instance.

```typescript
import { evaluate } from '@mdxe/bun'

async function evaluate<T = unknown>(
  content: string,
  options?: EvaluateOptions
): Promise<EvaluateResult<T>>
```

**Example:**

```typescript
import { evaluate } from '@mdxe/bun'

const result = await evaluate(`
  export const add = (a, b) => a + b
  export const multiply = (a, b) => a * b
`, {
  sandbox: { blockNetwork: true, timeout: 5000 }
})

const sum = await result.call('add', 2, 3)
const product = await result.call('multiply', 4, 5)

console.log(sum)     // 5
console.log(product) // 20

await result.dispose()
```

#### `evaluateFile(filePath, options?)`

Evaluate an MDX file from the filesystem.

```typescript
import { evaluateFile } from '@mdxe/bun'

const result = await evaluateFile('./docs/api.mdx', {
  sandbox: { blockNetwork: true }
})

const output = await result.call('processData', inputData)
await result.dispose()
```

#### `run(content, functionName, args?, options?)`

Convenience function to evaluate MDX and call a function in one step. Automatically disposes the instance.

```typescript
import { run } from '@mdxe/bun'

const result = await run(
  'export const add = (a, b) => a + b',
  'add',
  [1, 2]
)
console.log(result) // 3
```

#### `runFile(filePath, functionName, args?, options?)`

Run a specific exported function from an MDX file.

```typescript
import { runFile } from '@mdxe/bun'

const result = await runFile(
  './utils.mdx',
  'formatDate',
  [new Date()]
)
```

#### `createEvaluator(defaultOptions?)`

Create a reusable evaluator instance with pre-configured options.

```typescript
import { createEvaluator } from '@mdxe/bun'

const evaluator = createEvaluator({
  sandbox: { blockNetwork: true }
})

// Evaluate multiple MDX files with shared config
const result1 = await evaluator.evaluate(mdx1)
const result2 = await evaluator.evaluate(mdx2)

console.log(evaluator.getInstanceCount()) // 2

// Clean up all instances when done
await evaluator.dispose()
```

#### `test(content, options?)` - Validate MDX

Test MDX content by running it and checking for errors. Returns a test() result object.

```typescript
import { test } from '@mdxe/bun'

const testResult = await test(mdxContent, {
  sandbox: { blockNetwork: true }
})

if (testResult.success) {
  console.log('Exports:', testResult.exports)
  console.log('Data:', testResult.data)
} else {
  console.error('Error:', testResult.error)
}
```

#### `disposeAll()`

Dispose all active Miniflare instances globally.

```typescript
import { disposeAll, getActiveInstanceCount } from '@mdxe/bun'

console.log(`Active instances: ${getActiveInstanceCount()}`)

await disposeAll()

console.log(`Active instances: ${getActiveInstanceCount()}`) // 0
```

### Server Functions

#### `createApp(options)`

Create a Hono app with all MDX routes registered.

```typescript
import { createApp, type ServerOptions } from '@mdxe/bun'

const app = await createApp({
  projectDir: './content',
  verbose: true
})

// Use with Bun.serve or export for Workers
export default app
```

#### `createDevServer(options)`

Start a development server with hot reload.

```typescript
import { createDevServer, type ServerOptions } from '@mdxe/bun'

await createDevServer({
  projectDir: './docs',
  port: 3000,
  host: 'localhost',
  verbose: true
})

// Server running at http://localhost:3000
// Automatically serves:
// - /           - Index page
// - /robots.txt - Robots file
// - /sitemap.xml - Sitemap
// - /llms.txt   - LLM-friendly site info
```

#### `createServer(options)`

Start a production server (no verbose logging).

```typescript
import { createServer } from '@mdxe/bun'

await createServer({
  projectDir: './dist',
  port: 8080
})
```

### Test Runner Functions

#### `runTests(dir, options?)`

Run tests from all MDX files in a directory.

```typescript
import { runTests, type RunTestsOptions } from '@mdxe/bun'

const results = await runTests('./tests', {
  verbose: true,
  filter: 'should',
  timeout: 10000,
  parallel: true
})

console.log(`Passed: ${results.totalPassed}`)
console.log(`Failed: ${results.totalFailed}`)
console.log(`Duration: ${results.totalDuration}ms`)
```

#### `runTestsFromFile(filePath, options?)`

Run tests from a single MDX file.

```typescript
import { runTestsFromFile } from '@mdxe/bun'

const fileResult = await runTestsFromFile('./docs/api.mdx', {
  verbose: true
})

for (const test of fileResult.tests) {
  console.log(`${test.passed ? 'PASS' : 'FAIL'}: ${test.name}`)
}
```

#### `runTestsFromContent(content, options?)`

Run tests from MDX content string.

```typescript
import { runTestsFromContent } from '@mdxe/bun'

const content = `
# Math Tests

\`\`\`ts test name="addition works"
expect(1 + 1).toBe(2)
\`\`\`

\`\`\`ts test name="async test" async
const result = await Promise.resolve(42)
expect(result).toBe(42)
\`\`\`
`

const results = await runTestsFromContent(content, { verbose: true })
```

#### `extractTests(content, options?)`

Extract test blocks from MDX content without running them.

```typescript
import { extractTests, type TestBlock } from '@mdxe/bun'

const tests: TestBlock[] = extractTests(mdxContent)

for (const test of tests) {
  console.log(`Test: ${test.name}`)
  console.log(`Language: ${test.lang}`)
  console.log(`Async: ${test.async}`)
  console.log(`Code:\n${test.code}`)
}
```

#### `registerMDXTests(filePath)`

Register MDX tests with Bun's native test runner.

```typescript
// my-tests.test.ts
import { registerMDXTests } from '@mdxe/bun/test'

await registerMDXTests('./docs/api.mdx')
await registerMDXTests('./docs/utils.mdx')
```

### Advanced Runner

#### `runMDXTestsWithBun(options?)`

Run MDX tests with full Bun test integration and module resolution.

```typescript
import { runMDXTestsWithBun, type RunnerConfig } from '@mdxe/bun'

const result = await runMDXTestsWithBun({
  rootDir: '.',
  include: ['tests/**/*.test.mdx'],
  exclude: ['node_modules/**'],
  globals: {
    DB: 'ai-database',
  },
  preload: ['./test-setup.ts'],
  timeout: 5000,
  verbose: true,
  keepGenerated: false // Set true for debugging
})

process.exit(result.success ? 0 : 1)
```

## Configuration

### EvaluateOptions

```typescript
interface EvaluateOptions {
  /** Sandbox options for isolation */
  sandbox?: SandboxOptions
  /** Miniflare configuration override */
  miniflareOptions?: MiniflareConfig
  /** Global variables (for backward compatibility) */
  globals?: Record<string, unknown>
  /** Strip TypeScript types (legacy) */
  stripTypes?: boolean
}
```

### SandboxOptions

```typescript
interface SandboxOptions {
  /** Block network access (default: true) */
  blockNetwork?: boolean
  /** Allowed bindings */
  allowedBindings?: string[]
  /** Execution timeout in ms */
  timeout?: number
  /** Memory limit in bytes */
  memoryLimit?: number
}
```

### MiniflareConfig

```typescript
interface MiniflareConfig {
  /** Compatibility date for Workers runtime */
  compatibilityDate?: string
  /** Additional Miniflare options */
  [key: string]: unknown
}
```

### EvaluateResult

```typescript
interface EvaluateResult<T = unknown> {
  /** Default MDX component export */
  default?: T
  /** All named exports */
  exports: Record<string, unknown>
  /** Frontmatter data */
  data: Record<string, unknown>
  /** Raw content (markdown body) */
  content: string
  /** Call an exported function */
  call: <R = unknown>(name: string, ...args: unknown[]) => Promise<R>
  /** Get module metadata */
  meta: () => Promise<{ exports: string[]; hasDefault: boolean }>
  /** Module ID for caching reference */
  moduleId: string
  /** Dispose the Miniflare instance */
  dispose: () => Promise<void>
}
```

### ServerOptions

```typescript
interface ServerOptions {
  /** Project directory containing MDX files */
  projectDir: string
  /** Server port (default: 3000) */
  port?: number
  /** Server host (default: 'localhost') */
  host?: string
  /** Enable verbose logging */
  verbose?: boolean
}
```

### RunnerConfig

```typescript
interface RunnerConfig {
  /** Directory to search for tests */
  rootDir?: string
  /** Patterns to include */
  include?: string[]
  /** Patterns to exclude */
  exclude?: string[]
  /** Preload scripts for globals */
  preload?: string[]
  /** Global variables to inject */
  globals?: Record<string, string>
  /** Timeout per test in ms */
  timeout?: number
  /** Run tests in parallel */
  parallel?: boolean
  /** Verbose output */
  verbose?: boolean
  /** Keep generated test files */
  keepGenerated?: boolean
}
```

### TestBlock

```typescript
interface TestBlock {
  /** Test name */
  name: string
  /** Programming language */
  lang: string
  /** Test code */
  code: string
  /** Line number in source file */
  line: number
  /** Whether this is an async test */
  async: boolean
  /** Whether to skip this test */
  skip: boolean
  /** Whether to only run this test */
  only: boolean
  /** Additional meta flags */
  meta: Record<string, string | boolean>
}
```

## Examples

### Basic MDX Evaluation

```typescript
import { evaluate, disposeAll } from '@mdxe/bun'

const mdx = `
---
$type: Calculator
title: Math Utils
---

export function add(a, b) {
  return a + b
}

export function factorial(n) {
  if (n <= 1) return 1
  return n * factorial(n - 1)
}
`

const result = await evaluate(mdx, {
  sandbox: { blockNetwork: true }
})

// Access frontmatter data
console.log(result.data.title) // "Math Utils"

// Call exported functions
const sum = await result.call('add', 5, 3)
const fact = await result.call('factorial', 5)

console.log(sum)  // 8
console.log(fact) // 120

// Get metadata
const meta = await result.meta()
console.log(meta.exports) // ['add', 'factorial']

await result.dispose()
```

### Secure Sandboxed Execution

```typescript
import { evaluate } from '@mdxe/bun'

const untrustedMDX = `
export async function fetchData() {
  // This will fail - network is blocked
  const res = await fetch('https://api.example.com/data')
  return res.json()
}
`

const result = await evaluate(untrustedMDX, {
  sandbox: {
    blockNetwork: true,
    timeout: 5000,
    memoryLimit: 128 * 1024 * 1024 // 128MB
  }
})

try {
  await result.call('fetchData')
} catch (error) {
  console.log('Network blocked as expected')
}

await result.dispose()
```

### Using createEvaluator for Multiple Files

```typescript
import { createEvaluator } from '@mdxe/bun'

const evaluator = createEvaluator({
  sandbox: { blockNetwork: true, timeout: 10000 }
})

try {
  // Evaluate multiple MDX contents
  const utils = await evaluator.evaluate(utilsMDX)
  const helpers = await evaluator.evaluate(helpersMDX)
  const api = await evaluator.evaluate(apiMDX)

  // Use them
  const formatted = await utils.call('formatDate', new Date())
  const validated = await helpers.call('validateEmail', 'test@example.com')

  console.log(`Active instances: ${evaluator.getInstanceCount()}`)
} finally {
  // Clean up all instances
  await evaluator.dispose()
}
```

### MDX Test Files

MDX files can contain inline tests using code blocks with the `test` flag:

````mdx
# My Component

This component adds numbers.

```ts test name="should add two numbers"
expect(1 + 1).toBe(2)
```

```ts test name="should handle async operations" async
const result = await Promise.resolve(42)
expect(result).toBe(42)
```

```ts test name="skip this test" skip
// This test will be skipped
expect(true).toBe(false)
```
````

Run these tests with:

```typescript
import { runTestsFromFile } from '@mdxe/bun'

const results = await runTestsFromFile('./my-component.mdx', {
  verbose: true
})
```

### Development Server with Custom Routes

```typescript
import { createApp, type ServerOptions } from '@mdxe/bun'

const app = await createApp({
  projectDir: './docs',
  verbose: true
})

// Add custom routes to the Hono app
app.get('/api/health', (c) => c.json({ status: 'ok' }))

// Start with Bun.serve
Bun.serve({
  port: 3000,
  fetch: app.fetch
})
```

### Bun Test Integration

Create a test file that integrates MDX tests with Bun's test runner:

```typescript
// tests/mdx.test.ts
import { runMDXTestsWithBun } from '@mdxe/bun'

const result = await runMDXTestsWithBun({
  rootDir: './docs',
  include: ['**/*.test.mdx', '**/*.mdx'],
  verbose: true
})

if (!result.success) {
  process.exit(1)
}
```

## CLI Usage

The package includes a CLI tool (`mdxe-bun`):

```bash
# Start development server
bunx @mdxe/bun serve --port 3000 --dir ./docs

# Run MDX tests
bunx @mdxe/bun test --dir ./tests --verbose
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/isolate](https://www.npmjs.com/package/@mdxe/isolate) | Compile MDX to Worker modules |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Pure Cloudflare Workers execution |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation (with Miniflare) |
| [miniflare](https://miniflare.dev/) | Local Cloudflare Workers simulator |

## License

MIT

# @mdxe/node

Secure MDX evaluation in Node.js using Miniflare's workerd runtime. Execute MDX code in isolated V8 contexts.

## Installation

```bash
npm install @mdxe/node
# or
pnpm add @mdxe/node
# or
yarn add @mdxe/node
```

## Features

- **Secure Isolation** - Execute MDX in workerd V8 isolates
- **Miniflare Runtime** - Uses Cloudflare's local Worker emulator
- **Sandboxed Execution** - No access to host filesystem or network
- **Function Calling** - Call exported functions with arguments
- **Configurable** - Custom bindings and environment
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { evaluate, run } from '@mdxe/node'

// Evaluate MDX and get exports
const result = await evaluate(`
---
title: Calculator
---

export function add(a, b) {
  return a + b
}

export function multiply(a, b) {
  return a * b
}
`)

console.log(result.exports.add(2, 3))       // 5
console.log(result.exports.multiply(4, 5))  // 20

// Or call a function directly
const sum = await run(`
export function calculate(numbers) {
  return numbers.reduce((a, b) => a + b, 0)
}
`, 'calculate', [[1, 2, 3, 4, 5]])

console.log(sum)  // 15
```

## API Reference

### `evaluate(content, options?)`

Evaluate MDX content and return exports.

```typescript
async function evaluate<T = Record<string, unknown>>(
  content: string,
  options?: EvaluateOptions
): Promise<EvaluateResult<T>>

interface EvaluateOptions {
  bindings?: Record<string, unknown>  // Worker bindings (env vars, KV, etc.)
  timeout?: number                     // Execution timeout in ms
  memoryLimit?: number                 // Memory limit in MB
}

interface EvaluateResult<T> {
  exports: T                           // Exported values and functions
  metadata: {
    data: Record<string, unknown>      // Frontmatter data
    executionTime: number              // Time in ms
  }
}
```

**Example:**

```typescript
import { evaluate } from '@mdxe/node'

const result = await evaluate(`
---
title: Math Utils
version: 1.0.0
---

export const PI = 3.14159

export function circleArea(radius) {
  return PI * radius * radius
}

export async function fetchData(url) {
  // This will fail - no network access in sandbox
  const res = await fetch(url)
  return res.json()
}
`, {
  timeout: 5000,
  memoryLimit: 128
})

console.log(result.exports.PI)              // 3.14159
console.log(result.exports.circleArea(5))   // 78.53975
console.log(result.metadata.data.title)     // "Math Utils"
```

### `run(content, functionName, args?, options?)`

Call a specific exported function with arguments.

```typescript
async function run<R = unknown>(
  content: string,
  functionName: string,
  args?: unknown[],
  options?: EvaluateOptions
): Promise<R>
```

**Example:**

```typescript
import { run } from '@mdxe/node'

const mdx = `
export function greet(name, greeting = 'Hello') {
  return \`\${greeting}, \${name}!\`
}

export function processItems(items) {
  return items.map(item => ({
    ...item,
    processed: true
  }))
}
`

// Call with single argument
const message = await run(mdx, 'greet', ['World'])
console.log(message)  // "Hello, World!"

// Call with multiple arguments
const custom = await run(mdx, 'greet', ['Alice', 'Welcome'])
console.log(custom)  // "Welcome, Alice!"

// Call with complex data
const processed = await run(mdx, 'processItems', [[
  { id: 1, name: 'Item 1' },
  { id: 2, name: 'Item 2' }
]])
console.log(processed)
// [{ id: 1, name: 'Item 1', processed: true }, ...]
```

### `createEvaluator(defaultOptions?)`

Create a reusable evaluator instance with default options.

```typescript
function createEvaluator(defaultOptions?: EvaluateOptions): Evaluator

interface Evaluator {
  evaluate<T>(content: string, options?: EvaluateOptions): Promise<EvaluateResult<T>>
  run<R>(content: string, fn: string, args?: unknown[], options?: EvaluateOptions): Promise<R>
  close(): Promise<void>
}
```

**Example:**

```typescript
import { createEvaluator } from '@mdxe/node'

const evaluator = createEvaluator({
  timeout: 10000,
  bindings: {
    API_KEY: 'secret-key'
  }
})

try {
  const result1 = await evaluator.evaluate(mdx1)
  const result2 = await evaluator.evaluate(mdx2)
  const output = await evaluator.run(mdx3, 'process', [data])
} finally {
  await evaluator.close()
}
```

## Security

### Isolation

MDX code runs in a V8 isolate via Miniflare's workerd runtime:

- **No filesystem access** - Cannot read or write files
- **No network access** - Cannot make HTTP requests (unless explicitly bound)
- **No process access** - Cannot access Node.js process or environment
- **Memory limits** - Configurable memory constraints
- **Timeouts** - Execution time limits

### Safe Execution

```typescript
import { evaluate } from '@mdxe/node'

// This is safe - file access will fail
const result = await evaluate(`
import fs from 'fs'

export function readFile() {
  // This will throw - fs is not available
  return fs.readFileSync('/etc/passwd', 'utf-8')
}
`)

// Trying to call it will fail safely
try {
  result.exports.readFile()
} catch (e) {
  console.log('Access denied')
}
```

### Bindings

Explicitly provide access to resources:

```typescript
import { evaluate } from '@mdxe/node'

const result = await evaluate(`
export function getConfig() {
  return {
    apiKey: env.API_KEY,
    environment: env.NODE_ENV
  }
}
`, {
  bindings: {
    API_KEY: process.env.API_KEY,
    NODE_ENV: 'production'
  }
})
```

## Examples

### Code Execution Service

```typescript
import { createEvaluator } from '@mdxe/node'
import express from 'express'

const app = express()
const evaluator = createEvaluator({
  timeout: 5000,
  memoryLimit: 64
})

app.post('/execute', express.json(), async (req, res) => {
  try {
    const { code, functionName, args } = req.body

    const result = await evaluator.run(code, functionName, args)
    res.json({ result })
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
})

app.listen(3000)
```

### MDX Function Runner

```typescript
import { run } from '@mdxe/node'
import { parse } from 'mdxld'

async function executeFunction(mdxPath: string, fn: string, args: unknown[]) {
  const content = await Bun.file(mdxPath).text()
  const doc = parse(content)

  console.log(`Executing ${fn} from "${doc.data.title}"...`)

  const result = await run(content, fn, args, {
    timeout: 10000
  })

  return result
}

// Usage
const total = await executeFunction('./calculator.mdx', 'sum', [[1, 2, 3, 4, 5]])
console.log('Total:', total)
```

### Batch Processing

```typescript
import { createEvaluator } from '@mdxe/node'
import { glob } from 'glob'

const evaluator = createEvaluator()

async function processAllMDX(pattern: string) {
  const files = await glob(pattern)
  const results = []

  for (const file of files) {
    const content = await Bun.file(file).text()

    try {
      const result = await evaluator.evaluate(content)
      results.push({
        file,
        exports: Object.keys(result.exports),
        metadata: result.metadata
      })
    } catch (error) {
      results.push({
        file,
        error: error.message
      })
    }
  }

  await evaluator.close()
  return results
}

const results = await processAllMDX('./content/**/*.mdx')
console.log(JSON.stringify(results, null, 2))
```

### Validation Pipeline

```typescript
import { evaluate } from '@mdxe/node'

const validators = `
export function validateEmail(email) {
  const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/
  return re.test(email)
}

export function validateAge(age) {
  return typeof age === 'number' && age >= 0 && age <= 150
}

export function validateUser(user) {
  const errors = []

  if (!validateEmail(user.email)) {
    errors.push('Invalid email')
  }

  if (!validateAge(user.age)) {
    errors.push('Invalid age')
  }

  return { valid: errors.length === 0, errors }
}
`

const { exports } = await evaluate(validators)

const result = exports.validateUser({
  email: 'user@example.com',
  age: 25
})

console.log(result)  // { valid: true, errors: [] }
```

### Dynamic Configuration

```typescript
import { evaluate } from '@mdxe/node'

const configMDX = `
---
name: my-app
version: 1.0.0
---

export const config = {
  name: '${data.name}',
  version: '${data.version}',
  features: {
    auth: true,
    analytics: process.env.NODE_ENV === 'production'
  }
}

export function getFeature(name) {
  return config.features[name] ?? false
}
`

const { exports, metadata } = await evaluate(configMDX, {
  bindings: {
    NODE_ENV: 'production'
  }
})

console.log(exports.config)
console.log(exports.getFeature('auth'))       // true
console.log(exports.getFeature('analytics'))  // true
```

## Error Handling

```typescript
import { evaluate } from '@mdxe/node'

try {
  const result = await evaluate(`
    export function divide(a, b) {
      if (b === 0) throw new Error('Division by zero')
      return a / b
    }
  `)

  // Function throws at call time
  result.exports.divide(10, 0)
} catch (error) {
  if (error.message.includes('Division by zero')) {
    console.log('Caught division error')
  }
}

// Timeout handling
try {
  await evaluate(`
    export function infinite() {
      while (true) {}
    }
  `, { timeout: 1000 })
} catch (error) {
  if (error.message.includes('timeout')) {
    console.log('Execution timed out')
  }
}
```

## Types

### `EvaluateOptions`

```typescript
interface EvaluateOptions {
  bindings?: Record<string, unknown>
  timeout?: number      // Default: 30000 (30s)
  memoryLimit?: number  // Default: 128 (MB)
}
```

### `EvaluateResult`

```typescript
interface EvaluateResult<T = Record<string, unknown>> {
  exports: T
  metadata: {
    data: Record<string, unknown>
    executionTime: number
  }
}
```

### `Evaluator`

```typescript
interface Evaluator {
  evaluate<T>(content: string, options?: EvaluateOptions): Promise<EvaluateResult<T>>
  run<R>(content: string, fn: string, args?: unknown[], options?: EvaluateOptions): Promise<R>
  close(): Promise<void>
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers evaluation |
| [@mdxe/isolate](https://www.npmjs.com/package/@mdxe/isolate) | Compile to Worker modules |
| [miniflare](https://www.npmjs.com/package/miniflare) | Local Worker emulator |

## License

MIT

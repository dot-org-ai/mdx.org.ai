# @mdxe/workers

Cloudflare Workers runtime for MDX evaluation. Execute MDX code securely at the edge.

## Installation

```bash
npm install @mdxe/workers
# or
pnpm add @mdxe/workers
# or
yarn add @mdxe/workers
```

## Features

- **Edge Execution** - Run MDX code on Cloudflare Workers
- **V8 Isolates** - Secure, isolated execution environment
- **Request Handlers** - Create Workers that serve MDX
- **KV Integration** - Store and retrieve MDX from Workers KV
- **Environment Bindings** - Access env vars, KV, D1, and more
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
// src/worker.ts
import { evaluate, createHandler } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    // Direct evaluation
    const result = await evaluate(`
      export function greet(name) {
        return \`Hello, \${name}!\`
      }
    `, env)

    const message = result.exports.greet('World')
    return new Response(message)
  }
}
```

## API Reference

### `evaluate(content, env, options?)`

Evaluate MDX content within a Worker.

```typescript
async function evaluate<T = Record<string, unknown>>(
  content: string,
  env: WorkerEnv,
  options?: EvaluateOptions
): Promise<EvaluateResult<T>>

interface EvaluateOptions {
  timeout?: number           // Execution timeout
  context?: Record<string, unknown>  // Additional context
}

interface EvaluateResult<T> {
  exports: T                 // Exported values and functions
  metadata: {
    data: Record<string, unknown>  // Frontmatter data
  }
}
```

**Example:**

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const { exports, metadata } = await evaluate(`
---
title: Calculator
---

export function add(a, b) {
  return a + b
}

export function subtract(a, b) {
  return a - b
}
    `, env)

    const sum = exports.add(10, 5)
    return Response.json({
      title: metadata.data.title,
      result: sum
    })
  }
}
```

### `createHandler(env, options?)`

Create a request handler for MDX evaluation.

```typescript
function createHandler(
  env: WorkerEnv,
  options?: EvaluateOptions
): (request: Request) => Promise<Response>
```

**Example:**

```typescript
import { createHandler } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const handler = createHandler(env)
    return handler(request)
  }
}
```

### Request Handler

The handler expects:

- **POST** with JSON body:
  ```json
  {
    "content": "export function add(a, b) { return a + b }",
    "function": "add",
    "args": [2, 3]
  }
  ```

- Returns:
  ```json
  {
    "result": 5,
    "metadata": { "data": {} }
  }
  ```

## Integration with Cloudflare Bindings

### Workers KV

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    // Fetch MDX from KV
    const content = await env.MDX_STORE.get('calculator.mdx')

    if (!content) {
      return new Response('Not found', { status: 404 })
    }

    const { exports } = await evaluate(content, env)
    return Response.json({ exports: Object.keys(exports) })
  }
}

interface Env {
  MDX_STORE: KVNamespace
}
```

### D1 Database

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const { exports } = await evaluate(`
      export async function getUsers() {
        const { results } = await env.DB.prepare(
          'SELECT * FROM users'
        ).all()
        return results
      }
    `, env)

    const users = await exports.getUsers()
    return Response.json(users)
  }
}

interface Env {
  DB: D1Database
}
```

### Environment Variables

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const { exports } = await evaluate(`
      export function getConfig() {
        return {
          apiUrl: env.API_URL,
          debug: env.DEBUG === 'true'
        }
      }
    `, env)

    return Response.json(exports.getConfig())
  }
}

interface Env {
  API_URL: string
  DEBUG: string
}
```

## Examples

### MDX Code Runner API

```typescript
// src/worker.ts
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const { code, fn, args } = await request.json()

    try {
      const { exports, metadata } = await evaluate(code, env, {
        timeout: 5000
      })

      if (fn && typeof exports[fn] === 'function') {
        const result = await exports[fn](...(args || []))
        return Response.json({ result, metadata: metadata.data })
      }

      return Response.json({
        exports: Object.keys(exports),
        metadata: metadata.data
      })
    } catch (error) {
      return Response.json(
        { error: error.message },
        { status: 400 }
      )
    }
  }
}
```

### Dynamic Functions from KV

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    const [, module, fn] = url.pathname.split('/')

    // Get MDX from KV
    const content = await env.FUNCTIONS.get(module)
    if (!content) {
      return new Response('Module not found', { status: 404 })
    }

    const { exports } = await evaluate(content, env)

    if (!exports[fn]) {
      return new Response('Function not found', { status: 404 })
    }

    // Get args from query string
    const args = url.searchParams.get('args')
    const parsedArgs = args ? JSON.parse(args) : []

    const result = await exports[fn](...parsedArgs)
    return Response.json({ result })
  }
}

// Usage:
// PUT /math with MDX containing add(a,b) function
// GET /math/add?args=[2,3] → { result: 5 }
```

### Template Rendering

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    const template = await env.TEMPLATES.get('email.mdx')

    const { exports } = await evaluate(template, env)

    const html = exports.render({
      name: 'Alice',
      items: ['Widget', 'Gadget'],
      total: 99.99
    })

    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    })
  }
}
```

### Validation Worker

```typescript
import { evaluate } from '@mdxe/workers'

const validators = `
export function validateEmail(email) {
  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)
}

export function validatePhone(phone) {
  return /^\\+?[1-9]\\d{1,14}$/.test(phone)
}

export function validate(data, rules) {
  const errors = {}

  for (const [field, validators] of Object.entries(rules)) {
    for (const validator of validators) {
      if (!this[validator](data[field])) {
        errors[field] = errors[field] || []
        errors[field].push(validator)
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors }
}
`

export default {
  async fetch(request: Request, env: Env) {
    const { exports } = await evaluate(validators, env)

    const body = await request.json()

    const result = exports.validate(body, {
      email: ['validateEmail'],
      phone: ['validatePhone']
    })

    return Response.json(result)
  }
}
```

### Caching Evaluation Results

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const cacheKey = new Request(request.url, request)
    const cache = caches.default

    // Check cache
    let response = await cache.match(cacheKey)
    if (response) {
      return response
    }

    // Evaluate MDX
    const content = await env.MDX_STORE.get('functions.mdx')
    const { exports } = await evaluate(content, env)

    const result = exports.compute()

    response = Response.json(result, {
      headers: {
        'Cache-Control': 'max-age=3600'
      }
    })

    // Store in cache
    ctx.waitUntil(cache.put(cacheKey, response.clone()))

    return response
  }
}
```

## Wrangler Configuration

```toml
# wrangler.toml
name = "mdx-worker"
main = "src/worker.ts"
compatibility_date = "2024-01-01"

[vars]
API_URL = "https://api.example.com"

[[kv_namespaces]]
binding = "MDX_STORE"
id = "abc123..."

[[d1_databases]]
binding = "DB"
database_name = "mydb"
database_id = "def456..."
```

## Error Handling

```typescript
import { evaluate } from '@mdxe/workers'

export default {
  async fetch(request: Request, env: Env) {
    try {
      const { exports } = await evaluate(code, env, {
        timeout: 1000
      })

      return Response.json({ result: exports.run() })
    } catch (error) {
      if (error.message.includes('timeout')) {
        return Response.json(
          { error: 'Execution timeout' },
          { status: 408 }
        )
      }

      return Response.json(
        { error: 'Execution failed', details: error.message },
        { status: 500 }
      )
    }
  }
}
```

## Types

### `WorkerEnv`

```typescript
interface WorkerEnv {
  [key: string]: unknown
  // Common bindings
  // KVNamespace, D1Database, R2Bucket, Queue, etc.
}
```

### `EvaluateOptions`

```typescript
interface EvaluateOptions {
  timeout?: number
  context?: Record<string, unknown>
}
```

### `EvaluateResult`

```typescript
interface EvaluateResult<T = Record<string, unknown>> {
  exports: T
  metadata: {
    data: Record<string, unknown>
  }
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js evaluation |
| [@mdxe/isolate](https://www.npmjs.com/package/@mdxe/isolate) | Compile to Worker modules |
| [wrangler](https://www.npmjs.com/package/wrangler) | Cloudflare Workers CLI |

## License

MIT

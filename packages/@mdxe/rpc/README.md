# @mdxe/rpc

RPC protocol for MDX functions using capnweb. Expose MDX-defined functions over JSON-RPC.

## Installation

```bash
npm install @mdxe/rpc
# or
pnpm add @mdxe/rpc
# or
yarn add @mdxe/rpc
```

## Features

- **capnweb RPC** - Built on ai-functions RPC/RPCPromise
- **MDX Functions** - Define RPC functions in MDX documents
- **JSON-RPC 2.0** - Standard JSON-RPC protocol
- **Multi-Runtime** - Works on Node.js, Bun, and Cloudflare Workers
- **Type-Safe** - Full TypeScript support with typed clients

## Quick Start

### Server

```typescript
import { createRPCServer } from '@mdxe/rpc'
import { parse } from 'mdxld'

// Define functions in MDX
const addFunction = parse(`---
$type: Function
name: add
description: Add two numbers together
parameters:
  a: { type: number, required: true }
  b: { type: number, required: true }
---

Adds two numbers and returns the sum.
`)

// Create server
const server = createRPCServer({
  functions: [addFunction],
  handlers: {
    add: async ({ a, b }) => a + b,
    multiply: async ({ a, b }) => a * b,
  },
  port: 3000,
})

await server.start()
```

### Client

```typescript
import { createRPCClient } from '@mdxe/rpc'

interface MathAPI {
  add(args: { a: number; b: number }): number
  multiply(args: { a: number; b: number }): number
}

const client = createRPCClient<MathAPI>({
  url: 'http://localhost:3000',
})

// Direct call
const sum = await client.call('add', { a: 1, b: 2 })
console.log(sum) // 3

// Or use proxy
const result = await client.proxy.multiply({ a: 3, b: 4 })
console.log(result) // 12
```

## API Reference

### `createRPCServer(options)`

Create an RPC server from MDX function documents.

```typescript
function createRPCServer(options: RPCServerOptions): RPCServer

interface RPCServerOptions {
  functions?: MDXLDDocument[]  // MDX function definitions
  handlers?: Record<string, (...args: unknown[]) => unknown | Promise<unknown>>
  port?: number     // Default: 3000
  host?: string     // Default: 'localhost'
  cors?: boolean    // Enable CORS
}
```

### `createRPCClient<T>(options)`

Create a typed RPC client.

```typescript
function createRPCClient<T>(options: RPCClientOptions): RPCClient<T>

interface RPCClientOptions {
  url: string
  timeout?: number  // Request timeout in ms
  headers?: Record<string, string>
}
```

### `RPCServer`

```typescript
class RPCServer {
  // Register a function handler
  register(name: string, handler: Function): void

  // Register from MDX document
  registerFromDocument(doc: MDXLDDocument): void

  // Handle an RPC request
  handle(request: RPCRequest): Promise<RPCResponse>

  // Start the server
  start(): Promise<void>

  // Get registered function names
  getFunctions(): string[]

  // Get schema for all functions
  getSchema(): RPCSchema
}
```

### `RPCClient<T>`

```typescript
class RPCClient<T> {
  // Call a remote function
  call<K extends keyof T>(method: K, ...params: Parameters<T[K]>): Promise<ReturnType<T[K]>>

  // Get a proxy for method calls
  get proxy(): T
}
```

## Using with ai-functions

The package re-exports `RPC` and `RPCPromise` from ai-functions:

```typescript
import { RPC, RPCPromise } from '@mdxe/rpc'

// Use capnweb RPC directly
const rpc = new RPC({
  // capnweb options
})
```

## Examples

### API Gateway

```typescript
import { createRPCServer } from '@mdxe/rpc'
import { parse } from 'mdxld'

const userService = parse(`---
$type: Function
name: users.get
description: Get user by ID
parameters:
  id: { type: string, required: true }
---
`)

const postService = parse(`---
$type: Function
name: posts.list
description: List posts by user
parameters:
  userId: { type: string, required: true }
  limit: { type: number, default: 10 }
---
`)

const server = createRPCServer({
  functions: [userService, postService],
  handlers: {
    'users.get': async ({ id }) => {
      return await db.users.findById(id)
    },
    'posts.list': async ({ userId, limit }) => {
      return await db.posts.findByUserId(userId, { limit })
    },
  },
})
```

### With Hono

```typescript
import { Hono } from 'hono'
import { createRPCServer } from '@mdxe/rpc'

const app = new Hono()
const rpc = createRPCServer({ handlers })

app.post('/rpc', async (c) => {
  const request = await c.req.json()
  const response = await rpc.handle(request)
  return c.json(response)
})
```

### Batch Requests

```typescript
const client = createRPCClient({ url: 'http://localhost:3000' })

// Make multiple calls
const [user, posts] = await Promise.all([
  client.call('users.get', { id: '123' }),
  client.call('posts.list', { userId: '123' }),
])
```

## JSON-RPC 2.0

The protocol follows JSON-RPC 2.0 specification:

### Request

```json
{
  "jsonrpc": "2.0",
  "method": "add",
  "params": { "a": 1, "b": 2 },
  "id": 1
}
```

### Response

```json
{
  "jsonrpc": "2.0",
  "result": 3,
  "id": 1
}
```

### Error

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32601,
    "message": "Method not found"
  },
  "id": 1
}
```

## Types

### `RPCRequest`

```typescript
interface RPCRequest {
  jsonrpc: '2.0'
  method: string
  params?: unknown[] | Record<string, unknown>
  id?: string | number
}
```

### `RPCResponse`

```typescript
interface RPCResponse {
  jsonrpc: '2.0'
  result?: unknown
  error?: {
    code: number
    message: string
    data?: unknown
  }
  id?: string | number
}
```

## RPC vs REST vs GraphQL

| Feature | @mdxe/rpc | REST | GraphQL |
|---------|-----------|------|---------|
| **Protocol** | JSON-RPC 2.0 | HTTP verbs | Custom query language |
| **Endpoint** | Single `/rpc` | Multiple `/resources/*` | Single `/graphql` |
| **Batching** | Built-in | Manual | Built-in |
| **Type Safety** | Full TypeScript | Requires codegen | Requires codegen |
| **Discoverability** | `getSchema()` | OpenAPI/Swagger | Introspection |
| **Streaming** | Not supported | SSE/WebSocket | Subscriptions |
| **Caching** | Manual | HTTP caching | Apollo/Relay cache |
| **Learning Curve** | Low | Low | Medium |

### When to Use @mdxe/rpc

- **Internal APIs**: Service-to-service communication where you control both ends
- **AI Functions**: Exposing MDX-defined functions to AI agents
- **Simple RPC**: When you need typed function calls without REST complexity
- **Multi-runtime**: When your code runs on Node, Bun, and Cloudflare Workers

### When to Use REST

- **Public APIs**: External consumers expect REST conventions
- **Resource-oriented**: CRUD operations on entities
- **Caching**: Leveraging HTTP caching infrastructure

### When to Use GraphQL

- **Flexible queries**: Clients need to request varying data shapes
- **Mobile apps**: Reducing over-fetching on bandwidth-constrained devices
- **Complex relationships**: Deeply nested data with efficient fetching

## Protocol Details

### capnweb Integration

@mdxe/rpc is built on top of [rpc.do](https://rpc.do) via [ai-functions](https://www.npmjs.com/package/ai-functions). The underlying capnweb protocol provides:

- **Promise Pipelining**: Chain RPC calls without waiting for intermediate results
- **Type Safety**: Full TypeScript inference across the wire
- **Cancellation**: Cancel in-flight requests
- **Compression**: Efficient binary serialization (when using capnproto transport)

The package re-exports `RPC` and `RPCPromise` types from ai-functions for advanced use cases:

```typescript
import { RPC, RPCPromise } from '@mdxe/rpc'
import type { Action, ExecutionContext } from 'ai-functions'

// Define typed actions using RPC types
type MathService = {
  add: Action<{ a: number; b: number }, number>
  multiply: Action<{ a: number; b: number }, number>
}
```

### Error Codes

JSON-RPC 2.0 standard error codes:

| Code | Message | Description |
|------|---------|-------------|
| -32700 | Parse error | Invalid JSON received |
| -32600 | Invalid Request | Request object is invalid |
| -32601 | Method not found | Method does not exist |
| -32602 | Invalid params | Invalid method parameters |
| -32603 | Internal error | Internal JSON-RPC error |
| -32000 to -32099 | Server error | Reserved for implementation |

Custom errors should use codes outside these ranges:

```typescript
const server = createRPCServer({
  handlers: {
    divide: async ({ a, b }) => {
      if (b === 0) {
        throw { code: 1001, message: 'Division by zero' }
      }
      return a / b
    },
  },
})
```

## Advanced Examples

### Cloudflare Workers

```typescript
import { createRPCServer } from '@mdxe/rpc'

const rpc = createRPCServer({
  handlers: {
    hello: async ({ name }) => `Hello, ${name}!`,
    kv: {
      get: async ({ key }, env) => env.KV.get(key),
      set: async ({ key, value }, env) => env.KV.put(key, value),
    },
  },
})

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    const body = await request.json()
    const response = await rpc.handle(body)

    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    })
  },
}
```

### Middleware Pattern

```typescript
import { createRPCServer, type RPCRequest, type RPCResponse } from '@mdxe/rpc'

// Logging middleware
function withLogging(
  handler: (req: RPCRequest) => Promise<RPCResponse>
) {
  return async (req: RPCRequest): Promise<RPCResponse> => {
    const start = Date.now()
    const response = await handler(req)
    const duration = Date.now() - start

    console.log(`[RPC] ${req.method} - ${duration}ms`, {
      id: req.id,
      error: response.error?.message,
    })

    return response
  }
}

// Authentication middleware
function withAuth(
  handler: (req: RPCRequest) => Promise<RPCResponse>,
  getUser: (token: string) => Promise<User | null>
) {
  return async (req: RPCRequest): Promise<RPCResponse> => {
    const token = req.params?.token as string
    if (!token) {
      return {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: req.id,
      }
    }

    const user = await getUser(token)
    if (!user) {
      return {
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Invalid token' },
        id: req.id,
      }
    }

    return handler(req)
  }
}

const server = createRPCServer({ handlers })
const handleWithMiddleware = withLogging(withAuth(
  server.handle.bind(server),
  verifyToken
))
```

### Typed Client with Zod Validation

```typescript
import { createRPCClient } from '@mdxe/rpc'
import { z } from 'zod'

// Define schemas
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
})

type User = z.infer<typeof UserSchema>

// Create typed client
interface UserAPI {
  getUser(args: { id: string }): User
  createUser(args: { email: string; name?: string }): User
}

const client = createRPCClient<UserAPI>({
  url: 'http://localhost:3000/rpc',
})

// Use with validation
async function getValidatedUser(id: string): Promise<User> {
  const result = await client.call('getUser', { id })
  return UserSchema.parse(result)
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/mcp](https://www.npmjs.com/package/@mdxe/mcp) | Model Context Protocol for AI tools |
| [ai-functions](https://www.npmjs.com/package/ai-functions) | AI function definitions and RPC primitives |
| [rpc.do](https://rpc.do) | capnweb RPC service (underlying protocol) |
| [@mdxe/hono](https://www.npmjs.com/package/@mdxe/hono) | Hono HTTP middleware integration |
| [@mdxe/workers](https://www.npmjs.com/package/@mdxe/workers) | Cloudflare Workers runtime |

### Comparison with @mdxe/mcp

| Feature | @mdxe/rpc | @mdxe/mcp |
|---------|-----------|-----------|
| **Purpose** | General RPC | AI tool integration |
| **Protocol** | JSON-RPC 2.0 | Model Context Protocol |
| **Clients** | Any HTTP client | Claude, AI assistants |
| **Transport** | HTTP | stdio, HTTP |
| **Resources** | No | Yes (read-only content) |
| **Prompts** | No | Yes (templates) |

Use **@mdxe/rpc** for general-purpose function calls between services.
Use **@mdxe/mcp** when exposing tools specifically to AI assistants like Claude.

## License

MIT

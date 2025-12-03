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

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/mcp](https://www.npmjs.com/package/@mdxe/mcp) | Model Context Protocol |
| [ai-functions](https://www.npmjs.com/package/ai-functions) | AI function definitions |

## License

MIT

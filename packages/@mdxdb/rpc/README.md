# @mdxdb/rpc

RPC client for mdxdb with HTTP and WebSocket transport support via JSON-RPC 2.0.

## Installation

```bash
pnpm add @mdxdb/rpc
```

## Usage

### Simple Database Interface

For working with MDX documents directly:

```typescript
import { createRpcClient } from '@mdxdb/rpc'

// HTTP transport (stateless)
const db = createRpcClient({
  url: 'https://api.example.com/rpc',
  transport: 'http'
})

// WebSocket transport (persistent connection)
const wsDb = createRpcClient({
  url: 'wss://api.example.com/rpc',
  transport: 'ws'
})

// Use standard Database interface
const docs = await db.list({ type: 'Post', limit: 10 })
const doc = await db.get('posts/hello-world')
const result = await db.search({ query: 'serverless' })
```

### DBClient Interface (ai-database)

For working with Things, Relationships, Events, and Actions:

```typescript
import { createDBRpcClient } from '@mdxdb/rpc/db'

const db = createDBRpcClient({
  url: 'https://api.example.com/rpc',
  apiKey: process.env.API_KEY
})

// Use ai-database interface
const things = await db.list({ ns: 'example.com', type: 'User' })
const thing = await db.get({ ns: 'example.com', url: 'https://example.com/users/john' })
```

## Features

- JSON-RPC 2.0 protocol
- HTTP and WebSocket transports
- Compatible with rpc.do services
- Two interfaces: Simple Database and ai-database DBClient
- TypeScript support with full type definitions
- Connection state management for WebSocket

## API

### Simple Interface

- `createRpcClient(config)` - Create Database client
- `RpcClient` - Client class with `list()`, `get()`, `search()`, `set()`, `delete()`

### DBClient Interface

- `createDBRpcClient(config)` - Create ai-database compatible client
- `DBRpcClient` - Client with ai-database methods for Things, Relationships, Events, Actions

## Related Packages

- `@mdxdb/server` - Server implementation for this client
- `@mdxdb/clickhouse` - ClickHouse database adapter
- `@mdxdb/fs` - Filesystem database adapter

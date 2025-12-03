# @mdxai/claude

Claude Agent SDK integration for MDX. Expose mdxdb database operations and mdxe execution tools to Claude through the Model Context Protocol (MCP).

## Installation

```bash
npm install @mdxai/claude @anthropic-ai/claude-agent-sdk
# or
pnpm add @mdxai/claude @anthropic-ai/claude-agent-sdk
# or
yarn add @mdxai/claude @anthropic-ai/claude-agent-sdk
```

## Features

- **MCP Server** - Model Context Protocol server for Claude
- **Database Tools** - List, search, get, set, delete operations
- **Executor Tools** - Do, test, deploy operations
- **Type-Safe** - Full TypeScript support
- **Configurable** - Enable/disable tool sets

## Quick Start

```typescript
import { createClaudeServer } from '@mdxai/claude'
import { createFsDatabase } from '@mdxdb/fs'
import { query } from '@anthropic-ai/claude-agent-sdk'

// Create database
const db = await createFsDatabase({ basePath: './content' })

// Create MCP server with database tools
const server = createClaudeServer({
  name: 'my-mdx-server',
  database: db,
})

// Use with Claude Agent SDK
const response = await query({
  prompt: 'List all blog posts and summarize the most recent one',
  options: {
    mcpServers: {
      'my-mdx-server': {
        type: 'sdk',
        name: 'my-mdx-server',
        instance: server,
      },
    },
  },
})
```

## API Reference

### `createClaudeServer(config)`

Create an MCP server with mdxdb and mdxe tools for Claude.

```typescript
function createClaudeServer<TData extends MDXLDData>(
  config: ClaudeServerConfig<TData>
): MCPServer

interface ClaudeServerConfig<TData> {
  name?: string                    // Server name (default: 'mdxai')
  version?: string                 // Server version (default: '1.0.0')
  database: Database<TData>        // mdxdb database instance
  executor?: Executor<TData>       // mdxe executor instance
  enableDatabaseTools?: boolean    // Enable db tools (default: true)
  enableExecutorTools?: boolean    // Enable exec tools (default: true)
}
```

**Example:**

```typescript
import { createClaudeServer } from '@mdxai/claude'
import { createFsDatabase } from '@mdxdb/fs'
import { createNodeExecutor } from '@mdxe/node'

const db = await createFsDatabase({ basePath: './content' })
const executor = createNodeExecutor()

const server = createClaudeServer({
  name: 'my-content-server',
  version: '2.0.0',
  database: db,
  executor: executor,
  enableDatabaseTools: true,
  enableExecutorTools: true,
})
```

### `createDatabaseTools(database)`

Create database tools for a standalone use case.

```typescript
function createDatabaseTools<TData>(
  db: Database<TData>
): readonly [ListTool, SearchTool, GetTool, SetTool, DeleteTool]
```

**Returns tools:**

| Tool | Description |
|------|-------------|
| `mdxdb_list` | List documents with filtering and pagination |
| `mdxdb_search` | Search documents with optional semantic search |
| `mdxdb_get` | Get a document by ID/path |
| `mdxdb_set` | Create or update a document |
| `mdxdb_delete` | Delete a document |

### `createExecutorTools(executor, database)`

Create executor tools for running MDX operations.

```typescript
function createExecutorTools<TData>(
  executor: Executor<TData>,
  db: Database<TData>
): readonly [DoTool, TestTool, DeployTool]
```

**Returns tools:**

| Tool | Description |
|------|-------------|
| `mdxe_do` | Execute an action on a document |
| `mdxe_test` | Run tests on documents |
| `mdxe_deploy` | Deploy documents to a platform |

## Database Tools

### `mdxdb_list`

List MDX documents with optional filtering.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `limit` | `number?` | Maximum documents to return |
| `offset` | `number?` | Documents to skip |
| `sortBy` | `string?` | Field to sort by |
| `sortOrder` | `'asc' \| 'desc'?` | Sort order |
| `type` | `string?` | Filter by `$type` |
| `prefix` | `string?` | Filter by path prefix |

**Response:**

```json
{
  "total": 42,
  "hasMore": true,
  "count": 10,
  "documents": [
    {
      "id": "posts/hello-world",
      "type": "BlogPost",
      "data": { "title": "Hello World", ... }
    }
  ]
}
```

### `mdxdb_search`

Search documents with optional semantic search.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `query` | `string` | Search query |
| `limit` | `number?` | Maximum results |
| `offset` | `number?` | Results to skip |
| `fields` | `string[]?` | Fields to search in |
| `semantic` | `boolean?` | Enable vector search |
| `type` | `string?` | Filter by type |

**Response:**

```json
{
  "total": 5,
  "hasMore": false,
  "count": 5,
  "documents": [
    {
      "id": "posts/hello-world",
      "type": "BlogPost",
      "score": 0.95,
      "data": { "title": "Hello World" },
      "contentPreview": "Welcome to my blog..."
    }
  ]
}
```

### `mdxdb_get`

Get a specific document by ID/path.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Document ID or path |
| `includeAst` | `boolean?` | Include AST |
| `includeCode` | `boolean?` | Include compiled code |

**Response:**

```json
{
  "id": "posts/hello-world",
  "type": "BlogPost",
  "context": "https://schema.org",
  "data": { "title": "Hello World", "author": "Jane" },
  "content": "# Hello World\n\nWelcome..."
}
```

### `mdxdb_set`

Create or update a document.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Document ID or path |
| `type` | `string?` | Document type (`$type`) |
| `context` | `string?` | JSON-LD context |
| `data` | `object?` | Frontmatter data |
| `content` | `string` | MDX content body |
| `createOnly` | `boolean?` | Only create if not exists |
| `updateOnly` | `boolean?` | Only update if exists |

**Response:**

```json
{
  "success": true,
  "id": "posts/hello-world",
  "created": true,
  "version": 1
}
```

### `mdxdb_delete`

Delete a document.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Document ID or path |
| `soft` | `boolean?` | Soft delete |

**Response:**

```json
{
  "success": true,
  "id": "posts/hello-world",
  "deleted": true
}
```

## Executor Tools

### `mdxe_do`

Execute an action on a document.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `id` | `string` | Document ID or path |
| `action` | `string?` | Action/method to invoke |
| `args` | `unknown[]?` | Action arguments |
| `input` | `unknown?` | Input data |
| `timeout` | `number?` | Timeout in ms |

**Response:**

```json
{
  "success": true,
  "output": "...",
  "returnValue": { ... },
  "duration": 150,
  "logs": ["Log message 1", "..."]
}
```

### `mdxe_test`

Run tests on documents.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `target` | `string?` | Document ID or pattern |
| `pattern` | `string?` | Test name filter |
| `coverage` | `boolean?` | Enable coverage |
| `timeout` | `number?` | Timeout per test |

**Response:**

```json
{
  "passed": true,
  "total": 10,
  "passed_count": 10,
  "failed_count": 0,
  "skipped_count": 0,
  "duration": 1500,
  "tests": [ ... ],
  "coverage": { ... }
}
```

### `mdxe_deploy`

Deploy documents to a platform.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `target` | `string?` | Document ID or pattern |
| `platform` | `'vercel' \| 'cloudflare' \| 'netlify' \| 'custom'?` | Platform |
| `env` | `Record<string, string>?` | Environment variables |
| `dryRun` | `boolean?` | Preview only |
| `force` | `boolean?` | Force deploy |

**Response:**

```json
{
  "success": true,
  "url": "https://my-app.workers.dev",
  "deploymentId": "abc123",
  "logs": ["Deploying...", "Done!"]
}
```

## Examples

### Blog CMS for Claude

```typescript
import { createClaudeServer } from '@mdxai/claude'
import { createFsDatabase } from '@mdxdb/fs'
import { query } from '@anthropic-ai/claude-agent-sdk'

const db = await createFsDatabase({ basePath: './blog' })

const server = createClaudeServer({
  name: 'blog-cms',
  database: db,
})

// Claude can now manage your blog
const response = await query({
  prompt: `
    Create a new blog post about TypeScript best practices.
    Make it informative and include code examples.
    Save it as posts/typescript-best-practices.
  `,
  options: {
    mcpServers: {
      'blog-cms': { type: 'sdk', name: 'blog-cms', instance: server },
    },
  },
})
```

### Documentation Search

```typescript
import { createClaudeServer } from '@mdxai/claude'
import { createSqliteDatabase } from '@mdxdb/sqlite'
import { query } from '@anthropic-ai/claude-agent-sdk'

const db = await createSqliteDatabase({
  filename: './docs.db',
  enableVectorSearch: true,
})

const server = createClaudeServer({
  name: 'docs-search',
  database: db,
  enableExecutorTools: false, // Only need search
})

const response = await query({
  prompt: 'Find documentation about authentication and summarize it',
  options: {
    mcpServers: {
      'docs-search': { type: 'sdk', name: 'docs-search', instance: server },
    },
  },
})
```

### Full Development Environment

```typescript
import { createClaudeServer } from '@mdxai/claude'
import { createFsDatabase } from '@mdxdb/fs'
import { createNodeExecutor } from '@mdxe/node'
import { query } from '@anthropic-ai/claude-agent-sdk'

const db = await createFsDatabase({ basePath: './src' })
const executor = createNodeExecutor()

const server = createClaudeServer({
  name: 'dev-env',
  database: db,
  executor: executor,
})

// Claude can read, write, test, and deploy
const response = await query({
  prompt: `
    1. Look at the current test results
    2. Fix any failing tests
    3. Deploy to staging when tests pass
  `,
  options: {
    mcpServers: {
      'dev-env': { type: 'sdk', name: 'dev-env', instance: server },
    },
  },
})
```

## Types

### `ClaudeServerConfig`

```typescript
interface ClaudeServerConfig<TData extends MDXLDData = MDXLDData> {
  name?: string
  version?: string
  database: Database<TData>
  executor?: Executor<TData>
  enableDatabaseTools?: boolean
  enableExecutorTools?: boolean
}
```

### `ToolResult`

```typescript
interface ToolResult {
  content: ToolContent[]
  isError?: boolean
}

type ToolContent = TextContent | ImageContent | ResourceContent

interface TextContent {
  type: 'text'
  text: string
}

interface ImageContent {
  type: 'image'
  data: string
  mimeType: string
}

interface ResourceContent {
  type: 'resource'
  resource: {
    uri: string
    mimeType?: string
    text?: string
    blob?: string
  }
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Unified AI SDK |
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction |
| [mdxe](https://www.npmjs.com/package/mdxe) | Execution and deployment |
| [@anthropic-ai/claude-agent-sdk](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) | Claude Agent SDK |

## License

MIT

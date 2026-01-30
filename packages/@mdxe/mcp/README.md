# @mdxe/mcp

Model Context Protocol (MCP) server for exposing MDX tools, resources, and prompts to AI assistants like Claude.

## Installation

```bash
pnpm add @mdxe/mcp
# or
npm install @mdxe/mcp
# or
yarn add @mdxe/mcp
```

## Features

- **MCP Server** - Full Model Context Protocol implementation
- **Tools** - Expose MDX functions as callable tools
- **Resources** - Expose MDX documents as readable resources
- **Prompts** - Define reusable prompt templates
- **Multi-Transport** - stdio (Node/Bun) and HTTP (Node/Bun/Workers)
- **Type-Safe** - Full TypeScript support with exported interfaces

## Quick Start

### 1. Define Tools in MDX

Create MDX documents that define your tools with YAML-LD frontmatter:

```mdx
---
$type: Tool
name: search-docs
description: Search the documentation for relevant information
parameters:
  query:
    type: string
    description: The search query
    required: true
  limit:
    type: number
    description: Maximum results to return
    default: 10
---

Search through the documentation database and return relevant results.
```

### 2. Create MCP Server

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { parse } from 'mdxld'

// Parse your MDX tool definitions
const searchTool = parse(searchToolMdx)
const docsResource = parse(docsResourceMdx)

// Create the MCP server
const server = createMCPServer({
  name: 'my-mcp-server',
  version: '1.0.0',
  tools: [searchTool],
  toolHandlers: {
    'search-docs': async ({ query, limit }) => {
      const results = await searchDatabase(query, limit)
      return results
    },
  },
  resources: [docsResource],
  transport: 'stdio', // or 'http'
})

// Start the server
await server.start()
```

## Transport Options

@mdxe/mcp supports two transport types for different deployment scenarios:

### Transport Comparison

| Feature | stdio | HTTP |
|---------|-------|------|
| **Use Case** | Claude Desktop, CLI tools | Web services, APIs |
| **Node.js** | Yes | Yes |
| **Bun** | Yes | Yes |
| **Cloudflare Workers** | No | Yes |
| **Configuration** | Command line | URL endpoint |
| **Communication** | stdin/stdout | HTTP requests |
| **Default Port** | N/A | 3000 |

### stdio Transport

Best for CLI integration with Claude Desktop or other MCP clients that communicate via stdin/stdout:

```typescript
const server = createMCPServer({
  name: 'my-server',
  transport: 'stdio',
  tools: [searchTool],
  toolHandlers: {
    'search-docs': async ({ query }) => searchDatabase(query),
  },
})

await server.start()
```

**Claude Desktop Configuration** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["./mcp-server.js"]
    }
  }
}
```

For Bun:

```json
{
  "mcpServers": {
    "my-server": {
      "command": "bun",
      "args": ["run", "./mcp-server.ts"]
    }
  }
}
```

### HTTP Transport

Best for web-based integration and serverless environments:

```typescript
const server = createMCPServer({
  name: 'my-server',
  transport: 'http',
  port: 3000, // Optional, defaults to 3000
  tools: [searchTool],
  toolHandlers: {
    'search-docs': async ({ query }) => searchDatabase(query),
  },
})

await server.start()
// Server running on http://localhost:3000
```

Works on:
- Node.js
- Bun
- Cloudflare Workers

## API Reference

### `createMCPServer(options)`

Factory function to create an MCP server instance.

```typescript
function createMCPServer(options: MCPServerOptions): MCPServer
```

### `MCPServerOptions`

```typescript
interface MCPServerOptions {
  /** Server name (required) */
  name: string

  /** Server version (default: '1.0.0') */
  version?: string

  /** MDX documents to expose as tools */
  tools?: MDXLDDocument[]

  /** MDX documents to expose as resources */
  resources?: MDXLDDocument[]

  /** MDX documents to expose as prompts */
  prompts?: MDXLDDocument[]

  /** Tool handler implementations */
  toolHandlers?: Record<string, (args: Record<string, unknown>) => Promise<unknown>>

  /** Transport type (default: 'stdio') */
  transport?: 'stdio' | 'http'

  /** HTTP port when using http transport (default: 3000) */
  port?: number
}
```

### `MCPServer` Class

The server class provides methods for tool/resource/prompt management:

```typescript
class MCPServer {
  // List available tools
  listTools(): MCPTool[]

  // Call a tool by name with arguments
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult>

  // List available resources
  listResources(): MCPResource[]

  // Read a resource by URI
  readResource(uri: string): Promise<MCPResourceContent>

  // List available prompts
  listPrompts(): MCPPrompt[]

  // Get a prompt with template substitution
  getPrompt(name: string, args: Record<string, string>): Promise<MCPPromptResult>

  // Start the server (begins listening)
  start(): Promise<void>

  // Get server info and capabilities
  getServerInfo(): MCPServerInfo
}
```

## Defining Tools

Tools are MDX documents with `$type: Tool` that define callable functions for AI assistants.

### Tool Definition Structure

```mdx
---
$type: Tool
name: create-document
description: Create a new document in the database
parameters:
  title:
    type: string
    description: Document title
    required: true
  content:
    type: string
    description: Document content (markdown)
    required: true
  type:
    type: string
    description: Document type
    default: "Page"
---

Creates a new MDXLD document in the database with the specified title, content, and type.

## Usage

The tool will:
1. Validate the input parameters
2. Create the document with a generated ID
3. Return the created document's metadata
```

### Parameter Formats

Parameters can be defined in two formats:

**Short format** (type only):
```yaml
parameters:
  query: string
  limit: number
```

**Full format** (with options):
```yaml
parameters:
  query:
    type: string
    description: The search query
    required: true
  limit:
    type: number
    description: Maximum results
    default: 10
```

### Tool Handler Implementation

```typescript
const server = createMCPServer({
  name: 'my-server',
  tools: [createDocTool],
  toolHandlers: {
    'create-document': async ({ title, content, type }) => {
      const doc = await db.insert({ title, content, type })
      return { id: doc.id, created: true }
    },
  },
})
```

## Defining Resources

Resources are MDX documents that can be read by AI assistants. They represent static or dynamic content.

### Resource Definition Structure

```mdx
---
$type: Resource
name: project-readme
description: The main README file for the project
mimeType: text/markdown
---

# My Project

This is the project documentation...
```

### Resource Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Resource identifier |
| `description` | No | Human-readable description |
| `mimeType` | No | Content type (default: `text/markdown`) |
| `$id` | No | Unique URI for the resource |

### Reading Resources

Resources are automatically available via `listResources()` and `readResource(uri)`:

```typescript
const resources = server.listResources()
// [{ uri: 'https://...', name: 'project-readme', mimeType: 'text/markdown' }]

const content = await server.readResource('https://example.com/docs/readme')
// { uri: '...', mimeType: 'text/markdown', text: '# My Project...' }
```

## Defining Prompts

Prompts are reusable templates with variable substitution using `{{variable}}` syntax.

### Prompt Definition Structure

```mdx
---
$type: Prompt
name: code-review
description: Review code for best practices
arguments:
  - name: language
    description: Programming language
    required: true
  - name: context
    description: Additional context
---

Please review the following {{language}} code for:

1. Best practices and conventions
2. Potential bugs or issues
3. Performance considerations
4. Security concerns

{{context}}
```

### Using Prompts

```typescript
const result = await server.getPrompt('code-review', {
  language: 'TypeScript',
  context: 'This is a React component for user authentication.',
})

// Result:
// {
//   messages: [{
//     role: 'user',
//     content: { type: 'text', text: 'Please review the following TypeScript code for...' }
//   }]
// }
```

## Examples

### Documentation Search Server

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { parse } from 'mdxld'

const searchTool = parse(`---
$type: Tool
name: search
description: Search the documentation
parameters:
  query: { type: string, required: true }
  limit: { type: number, default: 10 }
---
`)

const server = createMCPServer({
  name: 'docs-server',
  tools: [searchTool],
  toolHandlers: {
    search: async ({ query, limit }) => {
      const results = await vectorSearch(query, limit as number)
      return results.map(r => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
      }))
    },
  },
})

await server.start()
```

### Database Operations Server

```typescript
const tools = [
  parse(`---
$type: Tool
name: db.query
description: Query the database
parameters:
  collection: { type: string, required: true }
  filter: { type: object }
  limit: { type: number, default: 10 }
---`),
  parse(`---
$type: Tool
name: db.insert
description: Insert a document
parameters:
  collection: { type: string, required: true }
  document: { type: object, required: true }
---`),
]

const server = createMCPServer({
  name: 'db-server',
  tools,
  toolHandlers: {
    'db.query': async ({ collection, filter, limit }) => {
      return await db.collection(collection as string)
        .find(filter as object)
        .limit(limit as number)
        .toArray()
    },
    'db.insert': async ({ collection, document }) => {
      return await db.collection(collection as string)
        .insertOne(document as object)
    },
  },
})
```

### File Resource Server

```typescript
import { readdir, readFile } from 'fs/promises'
import { parse } from 'mdxld'

// Load all markdown files as resources
const files = await readdir('./docs')
const resources = await Promise.all(
  files
    .filter(f => f.endsWith('.md'))
    .map(async (file) => {
      const content = await readFile(`./docs/${file}`, 'utf-8')
      return parse(`---
$type: Resource
name: ${file}
description: ${file}
mimeType: text/markdown
---

${content}
`)
    })
)

const server = createMCPServer({
  name: 'files-server',
  resources,
})
```

### Combined Server with Tools, Resources, and Prompts

```typescript
const server = createMCPServer({
  name: 'full-server',
  version: '2.0.0',

  tools: [searchTool, createTool, updateTool],
  toolHandlers: {
    search: searchHandler,
    create: createHandler,
    update: updateHandler,
  },

  resources: [readme, changelog, apiDocs],

  prompts: [codeReviewPrompt, debugPrompt, explainPrompt],

  transport: 'http',
  port: 8080,
})

const info = server.getServerInfo()
// {
//   name: 'full-server',
//   version: '2.0.0',
//   capabilities: { tools: true, resources: true, prompts: true }
// }
```

## Type Definitions

### `MCPTool`

```typescript
interface MCPTool {
  name: string
  description: string
  inputSchema: JSONSchema
}
```

### `MCPResource`

```typescript
interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}
```

### `MCPPrompt`

```typescript
interface MCPPrompt {
  name: string
  description?: string
  arguments?: MCPPromptArgument[]
}

interface MCPPromptArgument {
  name: string
  description?: string
  required?: boolean
}
```

### `MCPToolResult`

```typescript
interface MCPToolResult {
  content: Array<{ type: string; text: string }>
  isError?: boolean
}
```

### `MCPResourceContent`

```typescript
interface MCPResourceContent {
  uri: string
  mimeType?: string
  text?: string
  blob?: string
}
```

### `MCPPromptResult`

```typescript
interface MCPPromptResult {
  messages: Array<{
    role: 'user' | 'assistant'
    content: { type: string; text: string }
  }>
}
```

### `MCPServerInfo`

```typescript
interface MCPServerInfo {
  name: string
  version: string
  capabilities: {
    tools: boolean
    resources: boolean
    prompts: boolean
  }
}
```

### `MDXLDDocument`

```typescript
interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}
```

### `JSONSchema`

```typescript
interface JSONSchema {
  type: string
  properties?: Record<string, JSONSchema>
  required?: string[]
  description?: string
  [key: string]: unknown
}
```

## Package Exports

The package provides multiple entry points:

```typescript
// Main export
import { createMCPServer, MCPServer } from '@mdxe/mcp'

// Subpath exports (when available)
import { ... } from '@mdxe/mcp/stdio'
import { ... } from '@mdxe/mcp/http'
import { ... } from '@mdxe/mcp/tools'
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser for parsing MDX documents |
| [@mdxe/rpc](https://www.npmjs.com/package/@mdxe/rpc) | capnweb RPC protocol for function calls |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude AI integration with MCP tools |
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | Official MCP SDK |

## Differences from @mdxe/rpc

| Feature | @mdxe/mcp | @mdxe/rpc |
|---------|-----------|-----------|
| **Protocol** | Model Context Protocol | capnweb RPC |
| **Use Case** | AI assistants (Claude) | General function calls |
| **Transport** | stdio, HTTP | HTTP |
| **Resources** | Yes | No |
| **Prompts** | Yes | No |

## License

MIT

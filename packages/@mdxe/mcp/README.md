# @mdxe/mcp

Model Context Protocol (MCP) server for exposing MDX tools, resources, and prompts to AI assistants like Claude.

## Installation

```bash
npm install @mdxe/mcp
# or
pnpm add @mdxe/mcp
# or
yarn add @mdxe/mcp
```

## Features

- **MCP Server** - Full Model Context Protocol implementation
- **Tools** - Expose MDX functions as callable tools
- **Resources** - Expose MDX documents as readable resources
- **Prompts** - Define reusable prompt templates
- **Multi-Transport** - stdio (Node/Bun) and HTTP (Node/Bun/Workers)
- **Type-Safe** - Full TypeScript support

## Quick Start

### Define Tools in MDX

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

### Create MCP Server

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { parse } from 'mdxld'

const searchTool = parse(searchToolMdx)
const docsResource = parse(docsResourceMdx)

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

await server.start()
```

## API Reference

### `createMCPServer(options)`

Create an MCP server from MDX documents.

```typescript
function createMCPServer(options: MCPServerOptions): MCPServer

interface MCPServerOptions {
  name: string              // Server name
  version?: string          // Server version
  tools?: MDXLDDocument[]   // Tool definitions
  resources?: MDXLDDocument[]  // Resource definitions
  prompts?: MDXLDDocument[]    // Prompt templates
  toolHandlers?: Record<string, (args: Record<string, unknown>) => Promise<unknown>>
  transport?: 'stdio' | 'http'
  port?: number             // For HTTP transport
}
```

### `MCPServer`

```typescript
class MCPServer {
  // List available tools
  listTools(): MCPTool[]

  // Call a tool
  callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult>

  // List available resources
  listResources(): MCPResource[]

  // Read a resource
  readResource(uri: string): Promise<MCPResourceContent>

  // List available prompts
  listPrompts(): MCPPrompt[]

  // Get a prompt with arguments
  getPrompt(name: string, args: Record<string, string>): Promise<MCPPromptResult>

  // Start the server
  start(): Promise<void>

  // Get server info
  getServerInfo(): MCPServerInfo
}
```

## Defining Tools

Tools are MDX documents with parameters:

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

## Defining Resources

Resources are MDX documents that can be read:

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

## Defining Prompts

Prompts are templates with variables:

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

## Transport Options

### stdio Transport

For CLI integration with Claude Desktop or other MCP clients:

```typescript
const server = createMCPServer({
  name: 'my-server',
  transport: 'stdio',
  // ...
})

// Run in Node.js or Bun
await server.start()
```

Configure in Claude Desktop:

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

### HTTP Transport

For web-based integration:

```typescript
const server = createMCPServer({
  name: 'my-server',
  transport: 'http',
  port: 3000,
  // ...
})

await server.start()
// Server running on http://localhost:3000
```

Works on:
- Node.js
- Bun
- Cloudflare Workers

## Examples

### Documentation Search

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { parse } from 'mdxld'

const searchTool = parse(`---
$type: Tool
name: search
description: Search the documentation
parameters:
  query: { type: string, required: true }
---
`)

const server = createMCPServer({
  name: 'docs-server',
  tools: [searchTool],
  toolHandlers: {
    search: async ({ query }) => {
      const results = await vectorSearch(query)
      return results.map(r => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
      }))
    },
  },
})
```

### Database Operations

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
      return await db.collection(collection).find(filter).limit(limit).toArray()
    },
    'db.insert': async ({ collection, document }) => {
      return await db.collection(collection).insertOne(document)
    },
  },
})
```

### File Operations

```typescript
const resources = await Promise.all(
  files.map(async (file) => {
    const content = await fs.readFile(file, 'utf-8')
    return parse(`---
$type: Resource
name: ${path.basename(file)}
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

## Types

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

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxe/rpc](https://www.npmjs.com/package/@mdxe/rpc) | capnweb RPC protocol |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [@modelcontextprotocol/sdk](https://www.npmjs.com/package/@modelcontextprotocol/sdk) | MCP SDK |

## License

MIT

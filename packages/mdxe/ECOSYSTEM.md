# mdxe Ecosystem Integration Guide

This guide explains how mdxe fits within the broader mdx.org.ai ecosystem and how to integrate it with other packages for building complete MDX-based applications.

## Architecture Overview

mdxe is the **execution layer** of the mdx.org.ai ecosystem. While other packages handle parsing (mdxld), storage (mdxdb), rendering (mdxui), and AI (mdxai), mdxe provides the runtime environments and protocols to execute MDX-based applications.

### Core Design Question

> **mdxe answers: "Where and how does MDX execute?"**

| Package | Question | Scope |
|---------|----------|-------|
| **mdxld** | "How is MDXLD processed?" | Parsing & Transformation |
| **mdxdb** | "Where is this stored?" | Storage & Persistence |
| **mdxui** | "How does this render to X?" | Rendering & Output Formats |
| **mdxe** | "Where/how does this execute?" | Execution & Protocols |
| **mdxai** | "How does AI interact?" | AI Integrations |

## Architecture Diagram

```
                           mdx.org.ai Ecosystem
    ============================================================================

    +----------------+     +----------------+     +----------------+
    |     mdxld      |     |     mdxdb      |     |     mdxui      |
    |  Parse & AST   |     |   Store Data   |     |  Render Output |
    +-------+--------+     +-------+--------+     +-------+--------+
            |                      |                      |
            v                      v                      v
    +-------+--------+     +-------+--------+     +-------+--------+
    | @mdxld/compile |     |  @mdxdb/fs     |     | @mdxui/html    |
    | @mdxld/ast     |     |  @mdxdb/sqlite |     | @mdxui/json    |
    | @mdxld/jsonld  |     |  @mdxdb/postgres|    | @mdxui/email   |
    | @mdxld/validate|     |  @mdxdb/mongo  |     | @mdxui/slack   |
    +----------------+     +----------------+     +----------------+
            |                      |                      |
            +----------+-----------+----------+-----------+
                       |                      |
                       v                      v
    +------------------+----------------------+------------------+
    |                         mdxe                               |
    |                  Execution Layer                           |
    |                                                            |
    |   +--------------+  +--------------+  +--------------+     |
    |   |  Runtimes    |  |  Protocols   |  |  Servers     |     |
    |   |              |  |              |  |              |     |
    |   | @mdxe/node   |  | @mdxe/rpc    |  | @mdxe/hono   |     |
    |   | @mdxe/bun    |  | @mdxe/mcp    |  | @mdxe/next   |     |
    |   | @mdxe/workers|  |              |  | @mdxe/ink    |     |
    |   +--------------+  +--------------+  +--------------+     |
    |                                                            |
    +-------------------------+----------------------------------+
                              |
                              v
                    +---------+---------+
                    |      mdxai        |
                    |  AI Integrations  |
                    |                   |
                    | @mdxai/claude     |
                    | @mdxai/mastra     |
                    | @mdxai/agentkit   |
                    +-------------------+

    ============================================================================
                                Data Flow
    ============================================================================

    MDX File --> mdxld (parse) --> mdxdb (store) --> mdxe (execute) --> mdxui (render)
                     |                                    |
                     +------------------------------------+
                              mdxai (AI augmentation)
```

## Integration Patterns

### mdxe + mdxld: Parsing and Content Model

mdxld provides the content model that mdxe executes. The parse/stringify cycle creates a document object that mdxe can process.

```typescript
import { parse } from 'mdxld'
import { evaluate } from 'mdxe'

// Parse MDXLD document
const doc = parse(`
---
$type: API
$id: https://example.com/api/greet
name: greet
---

export function greet(name) {
  return \`Hello, \${name}!\`
}
`)

// Execute the parsed document
const result = await evaluate({
  code: doc.content,
  input: { name: 'World' }
})

console.log(result.value) // "Hello, World!"
```

**Key Integration Points:**

| mdxld Feature | mdxe Usage |
|---------------|------------|
| `parse()` | Extract metadata and code from MDX |
| `$type` | Determine execution strategy |
| `$id` | Route requests to correct handler |
| Code blocks | Execute as functions or tests |
| Frontmatter | Configure execution context |

### mdxe + mdxdb: Database Adapters

mdxe's SDK Provider integrates directly with mdxdb adapters, providing database access within execution contexts.

```typescript
import { createSDKProvider } from 'mdxe'

// Local filesystem storage (git-friendly)
const sdkFS = await createSDKProvider({
  context: 'local',
  db: 'fs',
  dbPath: './content',
  aiMode: 'remote',
  ns: 'my-app'
})

// SQLite for vector search and queries
const sdkSqlite = await createSDKProvider({
  context: 'local',
  db: 'sqlite',
  dbPath: './data.db',
  aiMode: 'remote',
  ns: 'my-app'
})

// Use in execution context
const post = await sdkFS.db.create({
  type: 'BlogPost',
  data: { title: 'Hello', content: 'World' }
})
```

**Database Backend Mapping:**

| Environment Variable | mdxdb Package | Best For |
|---------------------|---------------|----------|
| `DATABASE_URL=./content` | @mdxdb/fs | Git-versioned content |
| `DATABASE_URL=sqlite://./db` | @mdxdb/sqlite | Local-first apps |
| `DATABASE_URL=libsql://...` | @mdxdb/sqlite | Turso edge database |
| `DATABASE_URL=postgresql://...` | @mdxdb/postgres | Production workloads |
| `DATABASE_URL=mongodb://...` | @mdxdb/mongo | Document flexibility |
| `DATABASE_URL=clickhouse://...` | @mdxdb/clickhouse | Analytics |

### mdxe + mdxui: Rendering to Different Formats

mdxe executes the logic, mdxui renders the output. They work together for full-stack applications.

```typescript
import { evaluate } from 'mdxe'
import { parse } from 'mdxld'
import { toHTML } from '@mdxui/html'
import { toJSON } from '@mdxui/json'
import { toSlack } from '@mdxui/slack'

// Parse document with executable code
const doc = parse(mdxContent)

// Execute any code blocks
const executed = await evaluate({
  code: doc.content,
  sdkConfig: { context: 'local', db: 'memory', aiMode: 'local', ns: 'app' }
})

// Render to different formats based on request
if (request.headers.accept.includes('application/json')) {
  return await toJSON(doc)
}
if (request.headers.accept.includes('text/html')) {
  return await toHTML(doc)
}
if (request.url.includes('/slack')) {
  return await toSlack(doc)
}
```

**Rendering Pipeline:**

```
                      mdxe (execute)
                           |
              +------------+------------+
              |            |            |
              v            v            v
         @mdxui/html  @mdxui/json  @mdxui/slack
              |            |            |
              v            v            v
           Browser       API        Slack Bot
```

### mdxe + mdxai: AI Integrations

mdxe provides the execution environment for AI-powered applications, while mdxai packages provide AI provider integrations.

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { ClaudeClient } from '@mdxai/claude'

// Create MCP server for Claude Code integration
const mcp = createMCPServer({
  tools: [
    {
      name: 'query_docs',
      description: 'Search documentation',
      parameters: { query: { type: 'string' } }
    }
  ],
  transport: 'stdio'
})

// Or use Claude client with mdxe execution
const claude = new ClaudeClient({
  tools: await loadMDXTools('./tools/')
})

const response = await claude.chat({
  messages: [{ role: 'user', content: 'Search for React hooks documentation' }]
})
```

**AI Integration Patterns:**

| Pattern | mdxe Package | mdxai Package | Use Case |
|---------|--------------|---------------|----------|
| MCP Server | @mdxe/mcp | - | Claude Code tools |
| RPC Functions | @mdxe/rpc | - | Distributed AI calls |
| Claude Integration | mdxe | @mdxai/claude | Claude-powered apps |
| Agent Framework | mdxe | @mdxai/mastra | Multi-agent systems |
| Voice AI | mdxe | @mdxai/vapi | Voice interfaces |

## Complete Example: Docs Site with API and Admin Dashboard

This example shows a complete application using all ecosystem packages.

### Project Structure

```
my-docs-site/
├── content/                    # MDX content (via @mdxdb/fs)
│   ├── docs/
│   │   ├── getting-started.mdx
│   │   └── api-reference.mdx
│   └── blog/
│       └── hello-world.mdx
├── src/
│   ├── api/                    # API routes (via @mdxe/hono)
│   │   ├── docs.ts
│   │   └── search.ts
│   ├── admin/                  # Admin dashboard (via @mdxe/next)
│   │   └── page.tsx
│   └── index.ts                # Main entry
├── package.json
└── wrangler.toml              # Cloudflare deployment
```

### Implementation

**1. Database Setup (mdxdb)**

```typescript
// src/db.ts
import { createDB } from 'mdxdb'
import { createFSAdapter } from '@mdxdb/fs'
import { createSQLiteAdapter } from '@mdxdb/sqlite'

// Development: filesystem for git-friendly content
export const contentDB = await createDB({
  adapter: createFSAdapter({ path: './content' })
})

// Production: SQLite for vector search
export const searchDB = await createDB({
  adapter: createSQLiteAdapter({ path: './search.db' })
})
```

**2. API Server (mdxe + Hono)**

```typescript
// src/api/index.ts
import { Hono } from 'hono'
import { parse } from 'mdxld'
import { contentDB, searchDB } from '../db.js'
import { toJSON } from '@mdxui/json'
import { toHTML } from '@mdxui/html'

const app = new Hono()

// Get document as JSON or HTML
app.get('/docs/:slug', async (c) => {
  const doc = await contentDB.get(`docs/${c.req.param('slug')}`)
  const parsed = parse(doc.content)

  if (c.req.header('Accept')?.includes('application/json')) {
    return c.json(await toJSON(parsed))
  }

  return c.html(await toHTML(parsed))
})

// Search documents
app.get('/search', async (c) => {
  const query = c.req.query('q')
  const results = await searchDB.search({
    query,
    type: 'Doc',
    limit: 10
  })
  return c.json(results)
})

// AI-powered Q&A
app.post('/ask', async (c) => {
  const { question } = await c.req.json()

  // Search for relevant docs
  const docs = await searchDB.search({ query: question, limit: 5 })

  // Use AI to generate answer
  const sdk = await createSDKProvider({
    context: 'local',
    db: 'memory',
    aiMode: 'remote',
    ns: 'qa'
  })

  const answer = await sdk.ai.generate({
    prompt: `Based on these docs, answer: ${question}\n\n${docs.map(d => d.content).join('\n\n')}`
  })

  return c.json({ answer, sources: docs.map(d => d.id) })
})

export default app
```

**3. Admin Dashboard (mdxe + Next.js)**

```typescript
// src/admin/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { MDXEditor } from '@mdxui/widgets'

export default function AdminPage() {
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)

  useEffect(() => {
    fetch('/api/docs').then(r => r.json()).then(setDocs)
  }, [])

  const handleSave = async (content: string) => {
    await fetch(`/api/docs/${selectedDoc.slug}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    })
  }

  return (
    <div className="grid grid-cols-4 h-screen">
      <aside className="col-span-1 border-r p-4">
        <h2 className="font-bold mb-4">Documents</h2>
        <ul>
          {docs.map(doc => (
            <li
              key={doc.slug}
              onClick={() => setSelectedDoc(doc)}
              className="cursor-pointer hover:bg-gray-100 p-2"
            >
              {doc.title}
            </li>
          ))}
        </ul>
      </aside>

      <main className="col-span-3 p-4">
        {selectedDoc && (
          <MDXEditor
            value={selectedDoc.content}
            onChange={handleSave}
          />
        )}
      </main>
    </div>
  )
}
```

**4. MCP Integration for Claude Code**

```typescript
// src/mcp-server.ts
import { createMCPServer } from '@mdxe/mcp'
import { contentDB, searchDB } from './db.js'

export const mcpServer = createMCPServer({
  tools: [
    {
      name: 'search_docs',
      description: 'Search the documentation',
      parameters: {
        query: { type: 'string', description: 'Search query' }
      },
      execute: async ({ query }) => {
        return await searchDB.search({ query, limit: 5 })
      }
    },
    {
      name: 'get_doc',
      description: 'Get a specific document',
      parameters: {
        slug: { type: 'string', description: 'Document slug' }
      },
      execute: async ({ slug }) => {
        return await contentDB.get(slug)
      }
    },
    {
      name: 'update_doc',
      description: 'Update a document',
      parameters: {
        slug: { type: 'string' },
        content: { type: 'string' }
      },
      execute: async ({ slug, content }) => {
        return await contentDB.put(slug, content)
      }
    }
  ],
  transport: 'stdio'
})
```

**5. Cloudflare Deployment**

```typescript
// src/worker.ts
import { deploy } from 'mdxe'
import app from './api/index.js'

export default app

// Deploy script
// npx mdxe deploy ./src --name my-docs-api
```

**6. Package Configuration**

```json
{
  "name": "my-docs-site",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "mdxe deploy ./src --name my-docs-api",
    "mcp": "node src/mcp-server.ts"
  },
  "dependencies": {
    "mdxe": "^1.9.0",
    "mdxld": "^1.4.0",
    "mdxdb": "^1.2.0",
    "@mdxdb/fs": "^1.2.0",
    "@mdxdb/sqlite": "^1.2.0",
    "@mdxui/html": "^1.0.0",
    "@mdxui/json": "^1.0.0",
    "@mdxui/widgets": "^1.0.0",
    "@mdxe/hono": "^1.0.0",
    "@mdxe/mcp": "^1.0.0",
    "hono": "^4.0.0"
  }
}
```

## Package Decision Tree

Use this decision tree to determine which packages you need:

```
What are you building?
|
+-- Parsing/Processing MDX?
|   |
|   +-- Parse frontmatter --> mdxld
|   +-- Manipulate AST --> @mdxld/ast
|   +-- Compile to JS --> @mdxld/compile
|   +-- Validate schema --> @mdxld/validate
|   +-- Convert JSON-LD --> @mdxld/jsonld
|
+-- Storing MDX content?
|   |
|   +-- Git-friendly files --> @mdxdb/fs
|   +-- Local-first app --> @mdxdb/sqlite
|   +-- Production DB --> @mdxdb/postgres
|   +-- Document store --> @mdxdb/mongo
|   +-- Analytics --> @mdxdb/clickhouse
|   +-- Remote API --> @mdxdb/api
|
+-- Executing MDX?
|   |
|   +-- Which runtime?
|   |   +-- Node.js --> @mdxe/node
|   |   +-- Bun --> @mdxe/bun
|   |   +-- Cloudflare --> @mdxe/workers
|   |
|   +-- Which server?
|   |   +-- Lightweight HTTP --> @mdxe/hono
|   |   +-- Full-stack React --> @mdxe/next
|   |   +-- Terminal UI --> @mdxe/ink
|   |
|   +-- Which protocol?
|       +-- AI tools (Claude) --> @mdxe/mcp
|       +-- RPC calls --> @mdxe/rpc
|
+-- Rendering MDX?
|   |
|   +-- To HTML --> @mdxui/html
|   +-- To JSON --> @mdxui/json
|   +-- To Markdown --> @mdxui/markdown
|   +-- To Email --> @mdxui/email
|   +-- To Slack --> @mdxui/slack
|   +-- UI Components --> @mdxui/shadcn
|
+-- AI Integration?
    |
    +-- Claude AI --> @mdxai/claude
    +-- Agent framework --> @mdxai/mastra
    +-- Agent composition --> @mdxai/agentkit
    +-- Voice AI --> @mdxai/vapi
```

### Quick Reference Table

| Use Case | Packages Needed |
|----------|-----------------|
| **Static Docs Site** | mdxld, @mdxdb/fs, @mdxui/html |
| **API with Database** | mdxld, mdxe, @mdxe/hono, @mdxdb/sqlite |
| **Full-Stack App** | mdxld, mdxe, @mdxe/next, @mdxdb/postgres, @mdxui/shadcn |
| **CLI Tool** | mdxld, mdxe, @mdxe/ink |
| **AI-Powered App** | mdxld, mdxe, @mdxe/mcp, @mdxai/claude |
| **Multi-tenant SaaS** | mdxld, mdxe, @mdxe/workers, @mdxdb/sqlite (Turso), @mdxe/do |
| **Email/Notifications** | mdxld, @mdxui/email, @mdxui/slack |

## Runtime Comparison

| Runtime | Package | Startup | Memory | Best For |
|---------|---------|---------|--------|----------|
| Node.js | @mdxe/node | Slow | High | Full applications |
| Bun | @mdxe/bun | Fast | Medium | Local development |
| Workers | @mdxe/workers | Instant | Low | Edge, global scale |
| Isolate | @mdxe/isolate | Instant | Low | Sandboxed execution |

## Related Documentation

- [README.md](./README.md) - Main mdxe documentation
- [INTEGRATION.md](./INTEGRATION.md) - Primitives integration details
- [CLAUDE.md](../../CLAUDE.md) - Repository-wide architecture guide

## Contributing

When adding new integrations:

1. Follow the scope guidelines in CLAUDE.md
2. Ensure mdxe remains the execution layer (not parsing, storage, or rendering)
3. Add tests for new integration patterns
4. Update this guide with new patterns

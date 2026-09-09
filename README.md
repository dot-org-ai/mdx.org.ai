# mdx.org.ai

A monorepo for building MDX-based AI applications that combine structured data, unstructured content, executable code, and UI components.

## Why MDX?

- **Structured Data** - YAML-LD frontmatter with JSON-LD semantics (`$id`, `$type`, `$context`)
- **Unstructured Content** - Markdown for human-readable documentation
- **Executable Code** - TypeScript/JavaScript for logic and AI functions
- **UI Components** - JSX/HTML for rich interactive experiences

## Why Linked Data?

- **URL-based Identity** - Every document has a unique `$id` URL
- **Type System** - Schema.org and custom types via `$type`
- **Graph Relationships** - Connect documents via typed references
- **Semantic Interoperability** - Standard vocabulary via `$context`

## Package Architecture

### Core Packages

| Package | Description |
|---------|-------------|
| **mdxld** | Parse, stringify, validate, and compile MDXLD documents |
| **mdxdb** | Database abstraction with graph relationships and vector search |
| **mdxe** | Execute MDX in different environments and protocols |
| **mdxui** | Render MDX to different output formats |
| **mdxai** | AI integrations for generation, enrichment, and agents |

### @mdxui - Rendering & Output Formats

**"How does a component render to X format?"**

Defines rendering conventions for core components (`Site`, `Docs`, `App`, etc.) to various output formats:

| Package | Output Format | Technology |
|---------|--------------|------------|
| **@mdxui/html** | HTML strings | React → HTML |
| **@mdxui/markdown** | Markdown strings | React → Markdown |
| **@mdxui/json** | JSON / JSON-LD | React → JSON |
| **@mdxui/email** | Email HTML | React Email |
| **@mdxui/slack** | Slack blocks | Slack-JSX |
| **@mdxui/shadcn** | React components | shadcn/ui |
| **@mdxui/fumadocs** | Documentation | Fumadocs |
| **@mdxui/widgets** | Chat, Editor, Search | React |

> **Note:** Terminal output is plain bytes from **@mdxui/text** (planned); **@mdxe/ink** is a viewer over the **@mdxe/tui** seam that displays those bytes and handles input — it never renders MDX itself and never attaches to a pipe.

### @mdxe - Execution Environments & Protocols

**"Where and how does MDX execute?"**

Defines runtimes, servers, and communication protocols. See the [Ecosystem Integration Guide](./packages/mdxe/ECOSYSTEM.md) for detailed integration patterns with other packages.

| Package | Purpose | Runtimes |
|---------|---------|----------|
| **@mdxe/workers** | Cloudflare Workers (local dev via Miniflare) | Workers |
| **@mdxe/hono** | HTTP middleware | Workers |
| **@mdxe/ink** | Terminal viewer (Ink 7) over the @mdxe/tui seam | Node, Bun |
| **@mdxe/mcp** | Model Context Protocol | stdio: Node/Bun, http: all |
| **@mdxe/vitest** | Test runner | Node, Bun |
| **@mdxe/isolate** | V8 isolate compilation | Workers |

### @mdxdb - Database Adapters

**"Where is MDX content stored?"**

| Package | Backend | Features |
|---------|---------|----------|
| **@mdxdb/fs** | Filesystem | File-based, git-friendly |
| **@mdxdb/sqlite** | Durable Object SQLite | Graph database (_data / _rels) inside a Durable Object |
| **@mdxdb/do** | Durable Objects | Parent/child hierarchy, hibernatable WebSockets, parquet export |
| **@mdxdb/vectorize** | Cloudflare Vectorize | Vector search |
| **@mdxdb/parquet** | Parquet | Pure JS read/write for Workers and Snippets |
| **@mdxdb/clickhouse** | ClickHouse | Analytics, time-series |
| **@mdxdb/api** | HTTP API | Remote database client |
| **@mdxdb/rpc** | rpc.do | capnweb RPC client |
| **@mdxdb/server** | Hono | HTTP API server |
| **@mdxdb/github** | GitHub | Octokit-backed document store |
| **@mdxdb/fumadocs** | Fumadocs | Content source adapter |
| **@mdxdb/sources** | Multiple | Unified source interface |

> **Cloudflare-native only.** The former `@mdxdb/postgres`, `@mdxdb/mongo`, `@mdxdb/git`, `@mdxdb/payload`, `@mdxdb/desktop`, `@mdxdb/mobile` and `@mdxdb/studio` packages were removed (mdx-8je.7) and are deprecated on npm. History stays in git.

### @mdxld - Parsing & Transformation

**"How is MDXLD processed?"**

| Package | Purpose |
|---------|---------|
| **@mdxld/ast** | AST manipulation and traversal |
| **@mdxld/compile** | MDX to JavaScript compilation |
| **@mdxld/evaluate** | Runtime evaluation |
| **@mdxld/validate** | Schema validation |
| **@mdxld/jsonld** | JSON-LD ↔ MDXLD conversion |

### @mdxai - AI Integrations

**"How does AI interact with MDX?"**

| Package | Integration |
|---------|-------------|
| **@mdxai/claude** | Claude AI with MCP tools |
| **@mdxai/mastra** | Mastra agent framework |
| **@mdxai/vapi** | Vapi voice AI |

## @mdxe Packages

Detailed taxonomy of all `@mdxe` scoped packages for execution environments and protocols.

mdx.org.ai is **Cloudflare-native only**. Arbitrary code executes through Dynamic Worker Loaders (workerd) everywhere: in production via the `worker_loaders` binding, locally via a Miniflare host worker. The Node and Bun CLIs are thin shells that boot workerd; there is no Node or Bun evaluation runtime. The former `@mdxe/node`, `@mdxe/bun`, `@mdxe/next`, `@mdxe/honox`, `@mdxe/electron`, `@mdxe/expo`, `@mdxe/remotion`, `@mdxe/slidev`, `@mdxe/vercel`, `@mdxe/github` and `@mdxe/payload` packages were removed (mdx-8je.7) and are deprecated on npm; `test/repo/package-allowlist.test.ts` is the allowlist that keeps them from coming back.

### Core Runtimes

| Package | Description | Status |
|---------|-------------|--------|
| **@mdxe/workers** | Cloudflare Workers runtime (production) | Recommended |
| **@mdxe/workers/local** | Local development via Miniflare | Development |
| **@mdxe/isolate** | Compile MDX to isolated Worker modules | Stable |

> **Recommendation:** Use `@mdxe/workers` for production and `@mdxe/workers/local` (Miniflare) for local development. This provides the most consistent environment between development and production.

### Framework Integrations

| Package | Description | Quick Start |
|---------|-------------|-------------|
| **@mdxe/hono** | Hono HTTP servers and middleware | [Hono Guide](./packages/@mdxe/hono/README.md) |
| **@mdxe/fumadocs** | Docs site generation, deployed to Workers via OpenNext | `mdxe deploy` on a `$type: Docs` project |
| **@mdxe/cli-core** | Leaf shared by mdxe and @mdxe/hono (output context, caller detection, errors) | [cli-core](./packages/@mdxe/cli-core/README.md) |

### Protocols

| Package | Description | Use Case |
|---------|-------------|----------|
| **@mdxe/mcp** | Model Context Protocol for AI tools | Claude Code, AI integrations |

> RPC is not an `@mdxe` package and `mdxe` re-exports no RPC types. Use [rpc.do](https://www.npmjs.com/package/rpc.do) directly (`RPC`, `RPCPromise`; capnweb transport via [@dotdo/capnweb](https://www.npmjs.com/package/@dotdo/capnweb)). The former `@mdxe/rpc` package was removed as a duplicate of capnweb RPC; `ai-functions@2.4` ships no `RPC` / `RPCPromise`.

### Deployment

| Package | Description | Target Platform |
|---------|-------------|-----------------|
| **@mdxe/cloudflare** | Cloudflare Workers and Pages deployment | [Cloudflare](https://developers.cloudflare.com/workers/) |
| **@mdxe/do** | .do platform deployment | [.do Platform](https://do.md) |
| **@mdxe/deploy** | Unified deploy interface over .do and Cloudflare | - |

### Specialized

| Package | Description | Use Case |
|---------|-------------|----------|
| **@mdxe/vitest** | Vitest integration for testing MDX | Test runner |
| **@mdxe/ink** | Terminal viewer with Ink 7 (displays @mdxui/text bytes) | CLI applications |
| **@mdxe/tui** | Viewer seam: Viewer interface, input abstraction, conformance suite | Terminal viewers |
| **@mdxe/test-utils** | Shared fixtures, mocks and matchers | Package tests |

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev
```

## Example: MDXLD Document

```mdx
---
$type: BlogPost
$id: https://example.com/posts/hello-world
$context: https://schema.org
title: Hello World
author:
  $type: Person
  name: Alice
---

# Hello World

This is an **MDXLD** document with structured frontmatter.

export const greeting = () => "Hello!"

<Button onClick={greeting}>Click me</Button>
```

## Example: Rendering to Multiple Formats

```typescript
import { parse } from 'mdxld'
import { toHTML } from '@mdxui/html'
import { toJSON } from '@mdxui/json'
import { toMarkdown } from '@mdxui/markdown'
import { toSlack } from '@mdxui/slack'

const doc = parse(mdxContent)

// Render to different formats
const html = await toHTML(doc)        // HTML string
const json = await toJSON(doc)        // JSON-LD object
const md = await toMarkdown(doc)      // Markdown string
const slack = await toSlack(doc)      // Slack blocks
```

## Example: Execution via Protocols

```typescript
import { createMCPServer } from '@mdxe/mcp'
import { RPC } from 'rpc.do'

// Expose MDX functions via MCP (for Claude, etc.)
const mcp = createMCPServer({
  tools: toolsDocs,
  resources: resourceDocs,
  transport: 'stdio' // or 'http'
})

// Call MDX functions over capnweb RPC (rpc.do, promise pipelining)
const rpc = RPC<typeof functions>('https://functions.example.com')
const result = await rpc.summarize({ text })
```

## License

MIT

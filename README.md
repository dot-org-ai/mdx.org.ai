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

> **Note:** Terminal rendering uses **@mdxe/ink** since Ink output is coupled to the Ink runtime.

### @mdxe - Execution Environments & Protocols

**"Where and how does MDX execute?"**

Defines runtimes, servers, and communication protocols. See the [Ecosystem Integration Guide](./packages/mdxe/ECOSYSTEM.md) for detailed integration patterns with other packages.

| Package | Purpose | Runtimes |
|---------|---------|----------|
| **@mdxe/node** | Node.js runtime | Node.js |
| **@mdxe/bun** | Bun runtime | Bun |
| **@mdxe/workers** | Cloudflare Workers | Workers |
| **@mdxe/hono** | HTTP middleware | Node, Bun, Workers |
| **@mdxe/next** | Next.js App Router | Node, Edge |
| **@mdxe/ink** | Terminal UI (React Ink) | Node, Bun |
| **@mdxe/rpc** | capnweb RPC protocol | Node, Bun, Workers |
| **@mdxe/mcp** | Model Context Protocol | stdio: Node/Bun, http: all |
| **@mdxe/vitest** | Test runner | Node, Bun |
| **@mdxe/isolate** | V8 isolate compilation | Workers |

### @mdxdb - Database Adapters

**"Where is MDX content stored?"**

| Package | Backend | Features |
|---------|---------|----------|
| **@mdxdb/fs** | Filesystem | File-based, git-friendly |
| **@mdxdb/sqlite** | SQLite/Turso | Vector search, local-first |
| **@mdxdb/postgres** | PostgreSQL | pgvector, production-ready |
| **@mdxdb/mongo** | MongoDB | Atlas Vector Search |
| **@mdxdb/clickhouse** | ClickHouse | Analytics, time-series |
| **@mdxdb/api** | HTTP API | Remote database client |
| **@mdxdb/fumadocs** | Fumadocs | Content source adapter |
| **@mdxdb/sources** | Multiple | Unified source interface |

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
| **@mdxai/agentkit** | Agent composition toolkit |
| **@mdxai/vapi** | Vapi voice AI |

## @mdxe Packages

Detailed taxonomy of all `@mdxe` scoped packages for execution environments and protocols.

### Core Runtimes

| Package | Description | Status |
|---------|-------------|--------|
| **@mdxe/workers** | Cloudflare Workers runtime (production) | Recommended |
| **@mdxe/workers/local** | Local development via Miniflare | Development |
| **@mdxe/bun** | Bun runtime for fast local execution | Stable |
| **@mdxe/node** | Node.js runtime (deprecated, use workers/local for dev) | Deprecated |

> **Recommendation:** Use `@mdxe/workers` for production and `@mdxe/workers/local` (Miniflare) for local development. This provides the most consistent environment between development and production.

### Framework Integrations

| Package | Description | Quick Start |
|---------|-------------|-------------|
| **@mdxe/next** | Next.js App Router integration | [Next.js Guide](./packages/@mdxe/next/README.md) |
| **@mdxe/hono** | Hono HTTP servers and middleware | [Hono Guide](./packages/@mdxe/hono/README.md) |
| **@mdxe/honox** | HonoX full-stack framework | [HonoX Guide](./packages/@mdxe/honox/README.md) |
| **@mdxe/nuxt** | Nuxt.js integration | Coming soon |

### Protocols

| Package | Description | Use Case |
|---------|-------------|----------|
| **@mdxe/rpc** | capnweb RPC protocol implementation | Distributed function calls |
| **@mdxe/mcp** | Model Context Protocol for AI tools | Claude Code, AI integrations |

### Deployment

| Package | Description | Target Platform |
|---------|-------------|-----------------|
| **@mdxe/cloudflare** | Cloudflare Workers and Pages deployment | [Cloudflare](https://developers.cloudflare.com/workers/) |
| **@mdxe/do** | .do platform deployment | [.do Platform](https://do.md) |
| **@mdxe/vercel** | Vercel deployment | [Vercel](https://vercel.com) |
| **@mdxe/github** | GitHub Pages deployment | [GitHub Pages](https://pages.github.com) |

### Specialized

| Package | Description | Use Case |
|---------|-------------|----------|
| **@mdxe/vitest** | Vitest integration for testing MDX | Test runner |
| **@mdxe/ink** | Terminal UI with React Ink | CLI applications |
| **@mdxe/electron** | Desktop applications | Cross-platform desktop |
| **@mdxe/expo** | React Native mobile apps | iOS/Android |
| **@mdxe/remotion** | Programmatic video rendering | Video generation |
| **@mdxe/slidev** | Presentation slides | Technical presentations |

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

### Integration & E2E suites

`pnpm test` runs every package's unit suite. Suites that need a live service or a runtime sit behind the `test:integration` and `test:e2e` turbo tasks (never cached). Only the ones that can go green on a hosted runner are gated by the `Integration & E2E` CI job; the rest are local-only.

| Package                   | Script             | Needs                                                                                   | CI                                                                                                                         |
| ------------------------- | ------------------ | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `@mdxdb/api`, `@mdxdb/rpc` | `test:integration` | ClickHouse at `CLICKHOUSE_URL` (falls back to in-memory SQLite when unreachable)        | Gated, against a `clickhouse/clickhouse-server` service container                                                          |
| `@mdxdb/github`           | `test:integration` | `GITHUB_TOKEN`, `GITHUB_TEST_OWNER`, `GITHUB_TEST_REPO` (`describe.skipIf` without them) | Gated, opt-in: set repo variables `MDXDB_GITHUB_TEST_OWNER` / `MDXDB_GITHUB_TEST_REPO` and secret `MDXDB_GITHUB_TEST_TOKEN` |
| `@mdxdb/do`               | `test:e2e`         | workerd via `wrangler unstable_dev` (no Cloudflare credentials)                          | Gated                                                                                                                      |
| `@mdxdb/studio`           | `test:e2e`         | Playwright: `pnpm --filter @mdxdb/studio test:e2e:install` first                         | Local only (prune candidate)                                                                                               |
| `@mdxui/editor`           | `test:e2e`         | The nested `app/` Playwright project, which is currently empty                           | Local only (script is dead until `app/` is restored)                                                                       |
| `mdxld-vscode`            | `test:integration` | `@vscode/test-cli` downloads VS Code and needs a display (`xvfb-run -a` on Linux)        | Local only                                                                                                                 |

```bash
# Everything, locally (needs all of the above)
pnpm test:integration
pnpm test:e2e

# Exactly what CI gates
docker run -d -p 8123:8123 -e CLICKHOUSE_SKIP_USER_SETUP=1 clickhouse/clickhouse-server:25.3 # 25.3+ (schema uses the JSON column type)
CLICKHOUSE_URL=http://localhost:8123 pnpm turbo run test:integration --filter=@mdxdb/api --filter=@mdxdb/rpc
pnpm turbo run test:integration --filter=@mdxdb/github
pnpm turbo run test:e2e --filter=@mdxdb/do
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
import { createRPCServer } from '@mdxe/rpc'

// Expose MDX functions via MCP (for Claude, etc.)
const mcp = createMCPServer({
  tools: toolsDocs,
  resources: resourceDocs,
  transport: 'stdio' // or 'http'
})

// Expose MDX functions via capnweb RPC
const rpc = createRPCServer({
  functions: functionDocs,
  port: 3000
})
```

## License

MIT

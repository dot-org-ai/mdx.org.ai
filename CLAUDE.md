# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

mdx.org.ai is a monorepo for building MDX-based AI applications that combine structured data (YAML-LD), unstructured content (Markdown), executable code (TypeScript), and UI components (JSX). The project uses a URL-centric, linked data approach.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Run tests in a specific package
pnpm --filter <package-name> test
# e.g., pnpm --filter mdxld test

# Watch mode for development
pnpm dev

# Lint and typecheck
pnpm lint
pnpm typecheck

# Format code
pnpm format
```

### CLI Tools

```bash
# Run mdxai CLI (AI agent with MCP server)
pnpm mdxai

# Run mdxe test command
pnpm mdxe:test

# Generate TypeScript types from MDX files
pnpm --filter mdxld exec -- mdxld typegen

# Deploy to Cloudflare
pnpm --filter mdxe exec -- mdxe deploy
```

## Package Architecture

### Core Design Principles

The monorepo follows a clear separation of concerns:

| Scope | Purpose | Key Question |
|-------|---------|--------------|
| **@mdxui** | Rendering & Output Formats | "How does this render to X?" |
| **@mdxe** | Execution & Protocols | "Where/how does this execute?" |
| **@mdxdb** | Storage & Persistence | "Where is this stored?" |
| **@mdxld** | Parsing & Transformation | "How is MDXLD processed?" |
| **@mdxai** | AI Integrations | "How does AI interact?" |

### @mdxui - Rendering & Output Formats

Defines rendering conventions for core components (`Site`, `Docs`, `App`, `Page`, etc.) to various output formats:

```
@mdxui/
├── html       → React → HTML strings (SSR)
├── markdown   → React → Markdown strings
├── json       → React → JSON / JSON-LD / Tool Schemas
├── email      → React → Email HTML (React Email)
├── slack      → React → Slack blocks (Slack-JSX)
├── shadcn     → React web components (shadcn/ui)
├── fumadocs   → Documentation utilities (Fumadocs)
└── widgets    → Interactive widgets (Chat, Editor, Search)
```

> **Note:** Terminal rendering uses `@mdxe/ink` (not @mdxui) because Ink output is inherently coupled to the Ink runtime execution context.

### @mdxe - Execution Environments & Protocols

Defines runtimes, servers, and communication protocols:

```
@mdxe/
├── node       → Node.js runtime evaluation
├── bun        → Bun runtime evaluation
├── workers    → Cloudflare Workers runtime
├── hono       → HTTP middleware (Hono)
├── next       → Next.js App Router integration
├── ink        → Terminal UI (React Ink) - runtime + rendering
├── rpc        → capnweb RPC protocol (Node, Bun, Workers)
├── mcp        → Model Context Protocol
│   ├── stdio  → stdio transport (Node, Bun)
│   └── http   → HTTP transport (Node, Bun, Workers)
├── vitest     → Test runner integration
└── isolate    → V8 isolate compilation
```

**Key distinction:**
- `@mdxe/rpc` uses capnweb's `RPC` and `RPCPromise` from ai-functions
- `@mdxe/mcp` is separate - different transports (stdio, http) and different runtimes

### @mdxdb - Database Adapters

```
@mdxdb/
├── fs         → Filesystem (git-friendly .mdx files)
├── sqlite     → SQLite/Turso (vector search, local-first)
├── postgres   → PostgreSQL (pgvector)
├── mongo      → MongoDB (Atlas Vector Search)
├── clickhouse → ClickHouse (analytics)
├── api        → HTTP API client
├── fumadocs   → Fumadocs content source
└── sources    → Unified source interface
```

### @mdxld - Parsing & Transformation

```
@mdxld/
├── ast        → AST manipulation and traversal
├── jsx        → MDX compilation with React/Preact/Hono JSX support
├── compile    → MDX → JavaScript compilation
├── evaluate   → Runtime evaluation
├── validate   → Schema validation (JSON Schema, Zod)
├── jsonld     → JSON-LD ↔ MDXLD conversion
├── extract    → Bi-directional MDX ↔ Markdown translation
└── config     → Shared TypeScript/ESLint configs
```

The core `mdxld` package also includes:
- **CLI**: `mdxld typegen` - Generate TypeScript types from MDX files
- **Type Generation**: `mdxld/typegen` - Programmatic API for type inference and generation

#### Bi-directional Extraction (@mdxld/extract)

Extract structured data from rendered markdown using MDX templates:

```typescript
import { extract, diff, applyExtract } from '@mdxld/extract'

// Template defines the structure
const template = `# {data.title}\n\n{data.content}`

// User edits the rendered markdown
const edited = `# Updated Title\n\nNew content here`

// Extract changes back to structured data
const result = extract({ template, rendered: edited })
// { data: { title: 'Updated Title', content: 'New content here' } }

// Diff and apply to original document
const changes = diff(original, result.data)
const updated = applyExtract(original, result.data)
```

Use cases:
- **Headless CMS**: Edit rendered content, sync back to frontmatter
- **AI editing**: Let AI improve content, extract the changes
- **Round-trip sync**: Keep source MDX and rendered output in sync

### @mdxai - AI Integrations

```
@mdxai/
├── claude     → Claude AI with MCP tools
├── mastra     → Mastra agent framework
├── agentkit   → Agent composition toolkit
└── vapi       → Vapi voice AI
```

### Primitives (primitives/)

AI primitives packages (submodule) providing core functionality:
- **ai-functions** - AI function definitions, RPC, generation
- **ai-workflows** - Event-driven workflows with `$` context
- **ai-database** - Schema-first DB with bi-directional relationships
- **ai-sandbox** - Test execution environment

## Key Concepts

### URL-Based File System

MDXLD uses a URL-based file system where every resource can be both a file AND a folder simultaneously—unlike traditional file systems where something must be one or the other. This mirrors how URLs work on the web: `https://example.com/posts` can return content AND `https://example.com/posts/hello` can exist as a child resource.

In practice:
- Folder name = domain/namespace (e.g., `assistant.md/`, `headless.ly/`)
- `README.mdx` = the `/` endpoint for that namespace (technical docs, like GitHub)
- `index.mdx` = the website/public-facing page (if different from README)
- Everything is MDX—combining data (YAML-LD frontmatter), content (Markdown), code (TypeScript), and UI (JSX) in a single file

For simple projects, `README.mdx` alone serves as both docs and website. When you need them separate:
- `index.mdx` → marketing site, landing page, public UI
- `README.mdx` → technical documentation, API reference, developer docs

```
examples/
├── assistant.md/           # Domain: https://assistant.md
│   ├── README.mdx          # Technical docs (/ endpoint if no index.mdx)
│   ├── index.mdx           # Website/landing page (/ endpoint if present)
│   ├── docs/               # https://assistant.md/docs
│   └── [Assistant].mdx     # https://assistant.md/{slug} (dynamic route)
```

### MDXLD Documents

Documents have YAML frontmatter with JSON-LD properties:
```yaml
---
$type: BlogPost
$id: https://example.com/posts/{slug}
title: string
---
```

Parse/stringify with `mdxld`:
```ts
import { parse, stringify } from 'mdxld'
const doc = parse(content) // Returns { id, type, context, data, content }
```

### Rendering to Multiple Formats

```typescript
import { parse } from 'mdxld'
import { toHTML } from '@mdxui/html'
import { toJSON } from '@mdxui/json'
import { toSlack } from '@mdxui/slack'
import { toEmail } from '@mdxui/email'

const doc = parse(mdxContent)

// Same document, different output formats
const html = await toHTML(doc)      // HTML string for web
const json = await toJSON(doc)      // JSON-LD for APIs
const slack = await toSlack(doc)    // Slack blocks for messaging
const email = await toEmail(doc)    // Email HTML for notifications
```

### Execution via Protocols

```typescript
// capnweb RPC (from ai-functions)
import { createRPCServer } from '@mdxe/rpc'
const rpc = createRPCServer({ functions, port: 3000 })

// MCP for Claude/AI tools
import { createMCPServer } from '@mdxe/mcp'
const mcp = createMCPServer({
  tools: toolDocs,
  transport: 'stdio' // or 'http'
})
```

### Database Interface

Schema-first with automatic bi-directional relationships:
```ts
import { DB } from 'ai-database'

const db = DB({
  Post: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts',  // Creates Post.author -> Author AND Author.posts -> Post[]
  },
  Author: {
    name: 'string',
    email: 'string',
    // posts: Post[] auto-created from backref
  },
})

// Typed, provider-agnostic access
const post = await db.Post.get('hello-world')
const author = await post.author           // Resolved Author
const posts = await db.Author.get('john').posts  // Post[]
```

Provider resolved from `DATABASE_URL`:
```bash
DATABASE_URL=./content              # Filesystem
DATABASE_URL=sqlite://./content     # SQLite
DATABASE_URL=libsql://your-db.turso.io  # Turso
DATABASE_URL=chdb://./content       # ClickHouse (local)
```

### MDX Test Files

Tests are embedded in MDX with code blocks tagged `test`:
````mdx
```ts test name="should work"
expect(1 + 1).toBe(2)
```
````

Run with `mdxe test` which uses `ai-sandbox` for execution.

## File Conventions

- **examples/[Type].mdx** - Template files for entity types (bracket notation = dynamic routes)
- **packages/*/src/index.ts** - Package entry points (re-exports)
- **packages/*/src/types.ts** - TypeScript type definitions
- **packages/@scope/name/README.md** - Package documentation

## Testing

Each package has its own vitest config. Tests run with:
```bash
pnpm test                           # All packages via turbo
pnpm --filter mdxld test           # Single package
pnpm test:mdx                       # MDX-specific tests
```

## Dependency Structure

```
mdxld (core parsing)
├── @mdxld/* (AST, compile, validate, jsonld)
│
├── mdxdb (database abstraction)
│   └── @mdxdb/* (fs, sqlite, postgres, mongo, clickhouse, api)
│
├── mdxe (execution)
│   └── @mdxe/* (node, bun, workers, hono, next, ink, rpc, mcp, vitest)
│
├── mdxui (rendering)
│   └── @mdxui/* (html, json, markdown, email, slack, shadcn)
│
└── mdxai (AI integrations)
    └── @mdxai/* (claude, mastra, agentkit, vapi)

primitives/ (submodule)
├── ai-functions → used by @mdxe/rpc
├── ai-workflows → used by mdxai
├── ai-database → used by mdxdb
└── ai-sandbox → used by @mdxe/vitest
```

## Creating New Packages

When creating a new scoped package, ask:

1. **Is it about OUTPUT FORMAT?** → `@mdxui/`
   - Rendering MDX to HTML, JSON, Markdown, Slack, Email, Terminal

2. **Is it about EXECUTION?** → `@mdxe/`
   - Runtimes (node, bun, workers)
   - Protocols (rpc, mcp, http)
   - Testing (vitest)

3. **Is it about STORAGE?** → `@mdxdb/`
   - Database adapters
   - Content sources

4. **Is it about PARSING/TRANSFORMATION?** → `@mdxld/`
   - AST manipulation
   - Compilation
   - Validation

5. **Is it about AI?** → `@mdxai/`
   - AI provider integrations
   - Agent frameworks

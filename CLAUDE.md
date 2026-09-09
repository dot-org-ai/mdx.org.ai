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

# Build or test ONE package on a fresh checkout (orders workspace siblings first).
# `pnpm --filter <pkg> build` runs that package's tsup directly and skips turbo's
# `^build`, so it is red until siblings whose types resolve to dist/ are built.
pnpm exec turbo run build --filter=<package-name>
pnpm exec turbo run test --filter=<package-name>

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

> **Note:** Terminal output is rendered to plain bytes by `@mdxui/text` (planned). `@mdxe/ink` is a *viewer* over the `@mdxe/tui` seam: it displays those bytes and handles input, never renders MDX itself, loads Ink lazily on `mount()`, and refuses to attach when stdout or stdin is not a TTY.

### @mdxe - Execution Environments & Protocols

Defines runtimes, servers, and communication protocols. Cloudflare-native only (mdx-8je.7): code executes through Dynamic Worker Loaders (workerd) in production and under Miniflare locally; Node and Bun are thin CLI shells, never evaluation runtimes. `test/repo/package-allowlist.test.ts` is the allowlist for `packages/@mdxe` and `packages/@mdxdb`; the former `@mdxe/{node,bun,next,honox,electron,expo,remotion,slidev,vercel,github,payload}` are gone and deprecated on npm.

```
@mdxe/
├── workers    → Cloudflare Workers runtime (workers/local = Miniflare)
├── isolate    → Compile MDX to isolated Worker modules
├── hono       → HTTP middleware (Hono)
├── cli-core   → Leaf shared by mdxe + @mdxe/hono: OutputCtx ladder (Accept rung), caller detection, CliError/EXIT, token oracle
├── deploy     → Unified deploy over .do (@mdxe/do) and Cloudflare (@mdxe/cloudflare)
├── fumadocs   → Docs site generation, deployed to Workers via OpenNext
├── ink        → Ink 7 viewer over the @mdxe/tui seam (displays @mdxui/text bytes; never a renderer)
├── tui        → Viewer seam: Viewer interface, input abstraction, conformance suite, benchmark harness
├── mcp        → Model Context Protocol
│   ├── stdio  → stdio transport (CLI shells)
│   └── http   → HTTP transport (Workers)
├── vitest     → Test runner integration
└── test-utils → Shared fixtures, mocks, matchers
```

**Key distinction:**
- RPC is not an `@mdxe` package and `mdxe` re-exports no RPC types: use `rpc.do` directly (`RPC`, `RPCPromise`; capnweb transport via `@dotdo/capnweb`). `@mdxe/rpc` was removed as a duplicate; `ai-functions@2.4` ships no `RPC` / `RPCPromise`.
- `@mdxe/mcp` is separate - different transports (stdio, http) and different runtimes

### @mdxdb - Database Adapters

```
@mdxdb/
├── do         → Durable Objects (primary backend: hierarchy, hibernatable WebSockets, parquet export)
├── sqlite     → Durable Object SQLite graph database (_data / _rels)
├── vectorize  → Cloudflare Vectorize vector search
├── parquet    → Pure JS parquet read/write (Workers, Snippets)
├── fs         → Filesystem (git-friendly .mdx files)
├── clickhouse → ClickHouse (analytics)
├── api        → HTTP API client
├── rpc        → rpc.do (capnweb) client
├── server     → Hono HTTP API server
├── github     → Octokit-backed store (fetch; runs in Workers)
├── fumadocs   → Fumadocs content source
└── sources    → Unified source interface (moving to primitives, mdx-8je.17)
```

The former `@mdxdb/{postgres,mongo,git,payload,desktop,mobile,studio}` were removed (mdx-8je.7): none could run in workerd.

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
└── vapi       → Vapi voice AI
```

### Primitives (npm `ai-*` packages)

AI primitives live in one place, [primitives.org.ai](https://github.com/dot-org-ai/primitives.org.ai), and are consumed here **only as published npm packages** (currently the `^2.4.0` train). They are never vendored as a submodule or linked through the pnpm workspace — `pnpm test:repo` enforces this.

- **ai-functions** - AI function definitions, generation (RPC lives in `rpc.do`, not here)
- **ai-workflows** - Event-driven workflows with `$` context
- **ai-database** - Schema-first DB with bi-directional relationships
- **ai-evaluate** - Sandboxed code evaluation (used by mdxe)

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
// capnweb RPC via rpc.do (there is no @mdxe/rpc and mdxe re-exports no RPC types)
import { RPC } from 'rpc.do'
const rpc = RPC<typeof functions>('https://functions.example.com')

// MCP for Claude/AI tools
import { createMCPServer } from '@mdxe/mcp'
const mcp = createMCPServer({
  tools: toolDocs,
  transport: 'stdio' // or 'http'
})
```

### Database Interface

Schema-first with automatic bi-directional relationships. `mdxdb` (packages/mdxdb) is a thin facade over ai-database's `DB()` with the mdxdb backends registered:
```ts
import { DB } from 'mdxdb'

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

Provider resolved from `DATABASE_URL` (in a Worker pass the env: `DB(schema, { env })`):
```bash
DATABASE_URL=do://headless.ly            # @mdxdb/do — Durable Object SQLite (primary)
DATABASE_URL=./content                   # @mdxdb/fs — filesystem
DATABASE_URL=clickhouse://host:8123/db   # @mdxdb/clickhouse — HTTP
DATABASE_URL=https://db.example.com      # @mdxdb/api — HTTP API client
DATABASE_URL=:memory:                    # in-memory (tests)
```

`sqlite://<name>` is an alias for `do://<name>`. Unknown schemes, `libsql://` and `chdb://` fail closed (no adapter exists) rather than falling back to memory. Every backend must pass the shared contract suite from `mdxdb/tests`.

### MDX Test Files

Tests are embedded in MDX with code blocks tagged `test`:
````mdx
```ts test name="should work"
expect(1 + 1).toBe(2)
```
````

Run with `mdxe test` which uses `ai-evaluate` (formerly `ai-sandbox`) for execution; `@mdxe/vitest` runs the same blocks under vitest, sandboxing JSX/Hono tests via `ai-evaluate/node`.

## File Conventions

- **examples/[Type].mdx** - Template files for entity types (bracket notation = dynamic routes)
- **packages/*/src/index.ts** - Package entry points (re-exports)
- **packages/*/src/types.ts** - TypeScript type definitions
- **packages/@scope/name/README.md** - Package documentation

## Testing

Each package has its own vitest config. Tests run with:
```bash
pnpm test                           # All packages via turbo, then pnpm test:repo
pnpm --filter mdxld test           # Single package
pnpm test:mdx                       # MDX-specific tests
pnpm test:repo                      # Repo-level guard suites (test/repo/, own CI step)
pnpm exec turbo run test --filter=mdxe  # Single package, siblings built first (fresh checkout)
```

Repo-level guards (workspace layout, dependency policy, tsconfig boundaries, README taxonomy) live in `test/repo/` only — see `test/repo/README.md`. Turbo never runs them; `vitest.repo.config.ts` does. Do not put `*.test.ts` under `tests/` (that is the `.mdx` fixture directory) — `test/repo/guard-test-home.test.ts` fails the build if one appears.

## Dependency Structure

```
mdxld (core parsing)
├── @mdxld/* (AST, compile, validate, jsonld)
│
├── mdxdb (database abstraction)
│   └── @mdxdb/* (do, sqlite, vectorize, parquet, fs, clickhouse, api, rpc, server, github)
│
├── mdxe (execution)
│   └── @mdxe/* (workers, isolate, hono, cli-core, deploy, fumadocs, ink, tui, mcp, vitest)
│
├── mdxui (rendering)
│   └── @mdxui/* (html, json, markdown, email, slack, shadcn)
│
└── mdxai (AI integrations)
    └── @mdxai/* (claude, mastra, vapi)

ai-* primitives (npm, ^2.4.0)
├── ai-functions → AI function definitions and generation (no RPC export; capnweb RPC is rpc.do / @dotdo/capnweb, @mdxe/rpc was removed)
├── ai-workflows → used by mdxai
├── ai-database → used by mdxdb
└── ai-evaluate → used by mdxe
```

## Creating New Packages

When creating a new scoped package, ask:

1. **Is it about OUTPUT FORMAT?** → `@mdxui/`
   - Rendering MDX to HTML, JSON, Markdown, Slack, Email, Terminal

2. **Is it about EXECUTION?** → `@mdxe/`
   - Runtimes (workers only — Cloudflare-native; no node/bun eval)
   - Protocols (mcp, http)
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

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

# Deploy to Cloudflare
pnpm --filter mdxe exec -- mdxe deploy
```

## Package Architecture

### Core Packages (packages/)

- **mdxld** - Core parser/stringifier for MDXLD documents. Handles YAML frontmatter with JSON-LD properties (`$id`, `$type`, `$context`). Foundation for all other packages.
- **mdxdb** - Database abstraction layer with `Database` and `DBClient` interfaces. URL-centric document storage.
- **mdxe** - CLI for testing and deploying MDX applications. Runs MDX tests via `ai-sandbox`, deploys to Cloudflare Workers.
- **mdxai** - Unified AI SDK combining `ai-functions`, `ai-workflows`, `ai-database`. Provides MCP server for Claude integration.
- **mdxui** - UI component abstractions for MDX rendering.

### Adapter Packages

- **@mdxdb/fs** - Filesystem database adapter (stores MDX files on disk)
- **@mdxdb/sqlite** - SQLite database adapter
- **@mdxdb/postgres** - PostgreSQL database adapter
- **@mdxdb/api** - Remote API client for mdxdb servers
- **@mdxdb/mongo** - MongoDB adapter
- **@mdxdb/clickhouse** - ClickHouse adapter

- **@mdxe/hono** - Hono runtime for mdxe
- **@mdxe/workers** - Cloudflare Workers runtime
- **@mdxe/next** - Next.js integration
- **@mdxe/vitest** - Vitest integration for MDX tests
- **@mdxe/node** - Node.js runtime

- **@mdxui/shadcn** - Shadcn UI component library
- **@mdxui/html** - Plain HTML renderer
- **@mdxui/json** - JSON output renderer
- **@mdxui/markdown** - Markdown output renderer

- **@mdxai/claude** - Claude AI integration
- **@mdxai/mastra** - Mastra AI integration
- **@mdxai/vapi** - Voice API integration

### Primitives (primitives/)

AI primitives packages (submodule) providing core functionality:
- **ai-functions** - AI function definitions, RPC, generation
- **ai-workflows** - Event-driven workflows with `$` context
- **ai-database** - Simplified database interface
- **ai-sandbox** - Test execution environment

## Key Concepts

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

### Database Interface

Both `Database` (mdxdb) and `DBClient` (ai-database) interfaces are supported:
```ts
import { createFsDatabase } from '@mdxdb/fs'
import { createSqliteDatabase } from '@mdxdb/sqlite'

const db = createFsDatabase({ root: './content' })
await db.get('posts/hello')
await db.set('posts/hello', { $type: 'Post', title: 'Hello' })
await db.list({ type: 'Post' })
await db.search({ query: 'hello' })
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
- **examples/{domain}/** - Domain-specific MDX applications (api.ht, db.ht, schema.org.ai, etc.)
- **packages/*/src/index.ts** - Package entry points (re-exports)
- **packages/*/src/types.ts** - TypeScript type definitions

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
  └── mdxdb (database abstraction)
        └── @mdxdb/* (database adapters)
        └── mdxai (AI SDK, uses ai-* primitives)
              └── @mdxai/* (AI integrations)
  └── mdxe (execution/deployment)
        └── @mdxe/* (runtime adapters)
  └── mdxui (rendering)
        └── @mdxui/* (UI adapters)
```

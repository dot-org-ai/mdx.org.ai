# Primitives Integration

This document describes how mdxld integrates with AI primitives packages.

## Overview

mdxld provides optional re-exports of three AI primitives packages:

- `mdxld/functions` - Re-exports from `ai-functions`
- `mdxld/database` - Re-exports from `ai-database`
- `mdxld/workflows` - Re-exports from `ai-workflows`

These are **optional peer dependencies**, meaning:
1. They are not installed by default when you install `mdxld`
2. You must install them separately if you want to use them
3. The build process requires them as devDependencies

## Installation

To use the primitives integration:

```bash
# Install mdxld
pnpm add mdxld

# Install the primitives you want to use (optional)
pnpm add ai-functions  # For RPC and AI functions
pnpm add ai-database   # For schema-first database
pnpm add ai-workflows  # For event-driven workflows
```

## Usage

### AI Functions

```typescript
import { RPC, AI, generateText, generateObject } from 'mdxld/functions'

// Use RPC primitives
const rpc = RPC({
  functions: {
    hello: () => 'world',
    greet: (name: string) => `Hello, ${name}!`,
  },
})

// Use AI function constructors
const summarize = AI('Generate a summary', {
  input: schema({ text: 'string' }),
  output: schema({ summary: 'string' }),
})

// Use generation utilities
const result = await generateText({
  model: 'claude-3-5-sonnet-20241022',
  prompt: 'Write a haiku about MDX',
})
```

### AI Database

```typescript
import { DB } from 'mdxld/database'

// Schema-first database with automatic bi-directional relationships
const db = DB({
  Post: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts', // Creates Post.author -> Author AND Author.posts -> Post[]
  },
  Author: {
    name: 'string',
    email: 'string',
    // posts: Post[] auto-created from backref
  },
})

// Typed, provider-agnostic access
const post = await db.Post.get('hello-world')
const author = await post.author // Resolved Author
const posts = await db.Author.get('john').posts // Post[]
```

### AI Workflows

```typescript
import { Workflow, on, every } from 'mdxld/workflows'

// Create a workflow with $ context
const workflow = Workflow($ => {
  // Register event handlers
  $.on.Customer.created(async (customer, $) => {
    $.log('New customer:', customer.name)
    await $.send('Email.welcome', { to: customer.email })
  })

  // Register scheduled tasks
  $.every.hour(async ($) => {
    $.log('Hourly check')
  })

  $.every.Monday.at9am(async ($) => {
    $.log('Weekly standup reminder')
  })
})

// Start the workflow
await workflow.start()

// Emit events
await workflow.send('Customer.created', {
  name: 'John',
  email: 'john@example.com',
})
```

## Combining with MDXLD

You can combine the primitives with mdxld's core functionality:

```typescript
import { parse, stringify } from 'mdxld'
import { DB } from 'mdxld/database'
import { Workflow } from 'mdxld/workflows'

// Parse MDX content
const doc = parse(`---
$type: BlogPosting
$id: https://example.com/posts/hello
title: Hello World
author: john
---

# Hello World

This is my first post!
`)

// Store in database
const db = DB({
  BlogPosting: {
    title: 'string',
    content: 'markdown',
    author: 'Author.posts',
  },
  Author: {
    name: 'string',
  },
})

await db.BlogPosting.create({
  id: doc.id,
  title: doc.data.title,
  content: doc.content,
  author: doc.data.author,
})

// Set up workflow to handle blog events
const workflow = Workflow($ => {
  $.on.BlogPosting.created(async (post, $) => {
    $.log('New blog post:', post.title)
    // Notify subscribers, update search index, etc.
  })
})

await workflow.start()
await workflow.send('BlogPosting.created', doc.data)
```

## Architecture

The integration follows the mdx.org.ai architecture principles:

| Scope | Purpose |
|-------|---------|
| **mdxld** | Core parsing & transformation |
| **mdxld/functions** | AI functions, RPC, generation (via ai-functions) |
| **mdxld/database** | Storage & persistence (via ai-database) |
| **mdxld/workflows** | Event-driven workflows (via ai-workflows) |

This aligns with the broader ecosystem:

- `@mdxui/*` - Rendering & output formats
- `@mdxe/*` - Execution & protocols
- `@mdxdb/*` - Database adapters
- `@mdxld/*` - Parsing & transformation (+ primitives via mdxld/*)
- `@mdxai/*` - AI integrations

## Development

When working on mdxld itself:

1. The primitives packages are listed as both peerDependencies (optional) and devDependencies
2. This allows the build process to generate type definitions while keeping them optional for users
3. The build creates re-export modules that delegate to the actual packages

### Build Configuration

The tsup configuration:

```typescript
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    types: 'src/types.ts',
    functions: 'src/functions.ts',
    database: 'src/database.ts',
    workflows: 'src/workflows.ts',
  },
  external: [
    'ai-functions',
    'ai-database',
    'ai-workflows',
  ],
  // ... other options
})
```

This ensures:
- Each primitive gets its own entry point
- The primitives are marked as external (not bundled)
- Type definitions are generated correctly

## Testing

Tests verify that:

1. The modules can be imported when primitives are installed
2. The modules gracefully handle when primitives are not installed
3. The core mdxld exports don't include primitives (separation of concerns)
4. Documentation and examples are present in the source code

Run tests with:

```bash
pnpm test
```

## See Also

- [mdxld README](./README.md) - Main package documentation
- [ai-functions](../../primitives/packages/ai-functions) - RPC and AI functions
- [ai-database](../../primitives/packages/ai-database) - Schema-first database
- [ai-workflows](../../primitives/packages/ai-workflows) - Event-driven workflows

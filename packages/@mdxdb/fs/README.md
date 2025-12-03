# @mdxdb/fs

Filesystem adapter for mdxdb. Store MDX documents as files on disk with YAML frontmatter support.

## Installation

```bash
npm install @mdxdb/fs
# or
pnpm add @mdxdb/fs
# or
yarn add @mdxdb/fs
```

## Features

- **File-Based Storage** - Documents stored as `.mdx` or `.md` files
- **YAML Frontmatter** - Full support for MDX + Linked Data frontmatter
- **Directory Structure** - Hierarchical organization via nested folders
- **Auto-Discovery** - Recursively finds all MDX files
- **Soft Delete** - Optional soft delete with `.deleted` extension
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createFsDatabase } from '@mdxdb/fs'

// Create filesystem database
const db = createFsDatabase({ root: './content' })

// Store a document (creates ./content/posts/hello-world.mdx)
await db.set('posts/hello-world', {
  type: 'BlogPost',
  data: {
    title: 'Hello World',
    author: 'Jane Doe',
    publishedAt: '2024-01-15'
  },
  content: '# Hello World\n\nWelcome to my blog!'
})

// List all documents
const { documents } = await db.list()

// Get a specific document
const doc = await db.get('posts/hello-world')

// Search documents
const results = await db.search({ query: 'hello' })

// Delete a document
await db.delete('posts/old-post')
```

## API Reference

### `createFsDatabase(config)`

Create a filesystem database instance.

```typescript
function createFsDatabase<TData extends MDXLDData = MDXLDData>(
  config: FsDatabaseConfig
): Database<TData>

interface FsDatabaseConfig {
  root: string              // Root directory for documents
  extensions?: string[]     // File extensions (default: ['.mdx', '.md'])
  autoCreateDirs?: boolean  // Auto-create directories (default: true)
  encoding?: BufferEncoding // File encoding (default: 'utf-8')
}
```

**Example:**

```typescript
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({
  root: './content',
  extensions: ['.mdx', '.md'],
  autoCreateDirs: true,
  encoding: 'utf-8'
})
```

### `FsDatabase`

The database class can also be instantiated directly:

```typescript
import { FsDatabase } from '@mdxdb/fs'

const db = new FsDatabase({ root: './content' })
```

### Database Methods

#### `list(options?)`

List documents with optional filtering and pagination.

```typescript
interface ListOptions {
  limit?: number         // Maximum documents (default: 100)
  offset?: number        // Pagination offset
  sortBy?: string        // Field to sort by
  sortOrder?: 'asc' | 'desc'
  type?: string | string[] // Filter by $type
  prefix?: string        // Filter by path prefix
}

interface ListResult<TData> {
  documents: MDXLDDocument<TData>[]
  total: number
  hasMore: boolean
}
```

**Example:**

```typescript
// List all blog posts
const { documents } = await db.list({ type: 'BlogPost' })

// List with pagination
const page2 = await db.list({ limit: 10, offset: 10 })

// List by path prefix
const docs = await db.list({ prefix: 'docs/' })

// Sort by date
const sorted = await db.list({
  sortBy: 'publishedAt',
  sortOrder: 'desc'
})
```

#### `search(options)`

Search documents by query.

```typescript
interface SearchOptions {
  query: string          // Search query
  limit?: number         // Maximum results (default: 100)
  offset?: number        // Results to skip
  fields?: string[]      // Fields to search in
  type?: string | string[] // Filter by type
}

interface SearchResult<TData> {
  documents: Array<MDXLDDocument<TData> & { score: number }>
  total: number
  hasMore: boolean
}
```

**Example:**

```typescript
// Simple search
const results = await db.search({ query: 'typescript' })

// Search specific fields
const titleSearch = await db.search({
  query: 'getting started',
  fields: ['title', 'description']
})

// Filter by type
const posts = await db.search({
  query: 'tutorial',
  type: 'BlogPost'
})
```

#### `get(id, options?)`

Get a document by ID/path.

```typescript
interface GetOptions {
  includeContent?: boolean  // Include MDX content (default: true)
}
```

**Example:**

```typescript
const doc = await db.get('posts/hello-world')

if (doc) {
  console.log(doc.data.title)  // 'Hello World'
  console.log(doc.type)        // 'BlogPost'
  console.log(doc.content)     // '# Hello World...'
}

// Get by path with extension
const withExt = await db.get('posts/hello-world.mdx')
```

#### `set(id, document, options?)`

Create or update a document.

```typescript
interface SetOptions {
  createOnly?: boolean   // Only create if not exists
  updateOnly?: boolean   // Only update if exists
}

interface SetResult {
  id: string
  created: boolean
}
```

**Example:**

```typescript
// Create new document
await db.set('posts/new-post', {
  type: 'BlogPost',
  data: {
    title: 'New Post',
    author: 'Jane'
  },
  content: '# New Post\n\nContent here...'
})

// Update existing
await db.set('posts/new-post', {
  type: 'BlogPost',
  data: {
    title: 'Updated Title',
    author: 'Jane'
  },
  content: '# Updated content'
})

// Create only (throws if exists)
await db.set('posts/unique', doc, { createOnly: true })

// Update only (throws if not exists)
await db.set('posts/existing', doc, { updateOnly: true })
```

#### `delete(id, options?)`

Delete a document.

```typescript
interface DeleteOptions {
  soft?: boolean  // Soft delete (default: false)
}

interface DeleteResult {
  id: string
  deleted: boolean
}
```

**Example:**

```typescript
// Hard delete (removes file)
const result = await db.delete('posts/old-post')
console.log(result.deleted)  // true

// Soft delete (renames to .deleted)
await db.delete('posts/archived', { soft: true })
// File renamed to posts/archived.mdx.deleted
```

## File Structure

Documents are stored as MDX files with YAML frontmatter:

```
content/
├── posts/
│   ├── hello-world.mdx
│   ├── getting-started.mdx
│   └── advanced-topics.mdx
├── docs/
│   ├── installation.mdx
│   └── api-reference.mdx
└── pages/
    ├── about.mdx
    └── contact.mdx
```

Each file contains:

```mdx
---
$type: BlogPost
$context: https://schema.org
title: Hello World
author: Jane Doe
publishedAt: 2024-01-15
tags:
  - intro
  - tutorial
---

# Hello World

Welcome to my blog! This is the content of the post.

## Getting Started

Here's how to get started...
```

## Provider Interface

For schema-first usage, use the Provider interface:

```typescript
import { createFsProvider, FsProvider } from '@mdxdb/fs'

// Create provider
const provider = createFsProvider({ root: './content' })

// Provider supports the same operations
const doc = await provider.get('posts/hello-world')
```

## Examples

### Blog CMS

```typescript
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './blog' })

// Create a post
await db.set('posts/2024-01-15-welcome', {
  type: 'BlogPost',
  data: {
    title: 'Welcome to My Blog',
    author: 'Jane Doe',
    publishedAt: '2024-01-15',
    tags: ['welcome', 'intro'],
    excerpt: 'An introduction to my new blog...'
  },
  content: `
# Welcome to My Blog

This is my first blog post...
  `
})

// List recent posts
const { documents: recentPosts } = await db.list({
  type: 'BlogPost',
  sortBy: 'publishedAt',
  sortOrder: 'desc',
  limit: 10
})

// Search posts
const results = await db.search({
  query: 'typescript tutorial',
  type: 'BlogPost'
})
```

### Documentation Site

```typescript
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './docs' })

// Organize docs by section
await db.set('getting-started/installation', {
  type: 'Documentation',
  data: {
    title: 'Installation',
    order: 1,
    section: 'Getting Started'
  },
  content: '# Installation\n\nRun `npm install`...'
})

await db.set('getting-started/quick-start', {
  type: 'Documentation',
  data: {
    title: 'Quick Start',
    order: 2,
    section: 'Getting Started'
  },
  content: '# Quick Start\n\nHere is how to begin...'
})

// List docs in a section
const gettingStarted = await db.list({
  prefix: 'getting-started/',
  sortBy: 'order',
  sortOrder: 'asc'
})
```

### Content Types with Linked Data

```typescript
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })

// Person with schema.org context
await db.set('people/jane-doe', {
  type: 'Person',
  context: 'https://schema.org',
  data: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    jobTitle: 'Software Engineer',
    worksFor: {
      '@type': 'Organization',
      name: 'Tech Corp'
    }
  },
  content: '# Jane Doe\n\nBio and information...'
})

// Article referencing the author
await db.set('articles/typescript-tips', {
  type: 'Article',
  context: 'https://schema.org',
  data: {
    headline: 'TypeScript Tips',
    author: '/people/jane-doe',
    datePublished: '2024-01-15'
  },
  content: '# TypeScript Tips\n\nHere are some tips...'
})
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument<TData = Record<string, unknown>> {
  id?: string            // $id from frontmatter
  type?: string          // $type from frontmatter
  context?: string       // $context from frontmatter
  data: TData            // All frontmatter data
  content: string        // MDX content body
}
```

### `FsDatabaseConfig`

```typescript
interface FsDatabaseConfig {
  root: string              // Root directory path
  extensions?: string[]     // File extensions to recognize
  autoCreateDirs?: boolean  // Auto-create directories on write
  encoding?: BufferEncoding // File encoding
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/sqlite](https://www.npmjs.com/package/@mdxdb/sqlite) | SQLite backend with vector search |
| [@mdxdb/api](https://www.npmjs.com/package/@mdxdb/api) | REST API server |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |

## License

MIT

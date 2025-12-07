# @mdxdb/github

GitHub adapter for mdxdb - stores MDX documents as files in a GitHub repository using the GitHub API via Octokit.

## Installation

```bash
pnpm add @mdxdb/github octokit
```

## Usage

```typescript
import { createGitHubDatabase } from '@mdxdb/github'

const db = createGitHubDatabase({
  auth: { token: process.env.GITHUB_TOKEN },
  repository: { owner: 'myorg', repo: 'content' },
  branch: 'main',
  basePath: 'docs',
})

// List all documents
const { documents, total, hasMore } = await db.list()

// List with filtering
const posts = await db.list({
  type: 'BlogPost',
  prefix: 'posts/',
  limit: 10,
  offset: 0,
  sortBy: 'title',
  sortOrder: 'asc',
})

// Get a single document
const doc = await db.get('posts/hello-world')

// Create a new document
await db.set('posts/new-post', {
  type: 'BlogPost',
  data: { title: 'New Post', author: 'John' },
  content: '# Hello World!\n\nThis is my first post.',
})

// Update an existing document
await db.set(
  'posts/new-post',
  {
    type: 'BlogPost',
    data: { title: 'Updated Post', author: 'John' },
    content: '# Updated Content',
  },
  { updateOnly: true }
)

// Search documents (uses GitHub Code Search API)
const results = await db.search({ query: 'hello' })

// Delete a document
await db.delete('posts/old-post')

// Soft delete (renames to .deleted)
await db.delete('posts/old-post', { soft: true })
```

## Configuration

```typescript
interface GitHubDatabaseConfig {
  // Required: GitHub authentication
  auth: {
    token: string // Personal access token or GitHub App token
  }

  // Required: Target repository
  repository: {
    owner: string // User or organization
    repo: string // Repository name
  }

  // Optional: Branch to use (default: 'main')
  branch?: string

  // Optional: Base path within repo (default: '')
  basePath?: string

  // Optional: File extensions to consider (default: ['.mdx', '.md'])
  extensions?: string[]

  // Optional: Commit message template (default: 'Update {path}')
  commitMessage?: string

  // Optional: Committer info
  committer?: {
    name: string
    email: string
  }

  // Optional: Author info (defaults to committer)
  author?: {
    name: string
    email: string
  }
}
```

## Features

### List Documents

List all MDX documents in the repository with optional filtering and pagination:

```typescript
const result = await db.list({
  type: 'BlogPost', // Filter by document type
  prefix: 'posts/', // Filter by path prefix
  limit: 20, // Max documents to return
  offset: 0, // Skip first N documents
  sortBy: 'title', // Sort by field
  sortOrder: 'asc', // 'asc' or 'desc'
})
```

### Search Documents

Search documents using GitHub's Code Search API:

```typescript
const result = await db.search({
  query: 'typescript', // Search query
  type: 'BlogPost', // Optional: filter by type
  fields: ['content', 'title'], // Optional: fields to search
  limit: 10,
  offset: 0,
})
```

The search falls back to in-memory search if GitHub Code Search is unavailable (e.g., due to rate limits).

### CRUD Operations

```typescript
// Create (fails if exists)
await db.set('id', document, { createOnly: true })

// Update (fails if doesn't exist)
await db.set('id', document, { updateOnly: true })

// Upsert (create or update)
await db.set('id', document)

// Get (returns null if not found)
const doc = await db.get('id')

// Delete (hard delete)
await db.delete('id')

// Soft delete (rename to .deleted)
await db.delete('id', { soft: true })
```

## GitHub Token Permissions

The GitHub token needs the following permissions:

- `contents: read` - For reading files
- `contents: write` - For creating, updating, and deleting files

For GitHub Apps, use the `Contents` repository permission set to `Read and write`.

## Rate Limits

The GitHub API has rate limits:

- **Authenticated requests**: 5,000 requests per hour
- **Search API**: 30 requests per minute

The adapter handles rate limiting gracefully by falling back to in-memory search when GitHub Code Search is unavailable.

## License

MIT

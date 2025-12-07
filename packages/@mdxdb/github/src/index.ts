/**
 * @mdxdb/github - GitHub adapter for mdxdb
 *
 * Stores MDX documents as files in a GitHub repository using the GitHub API via Octokit.
 *
 * @example
 * ```ts
 * import { createGitHubDatabase } from '@mdxdb/github'
 *
 * const db = createGitHubDatabase({
 *   auth: { token: process.env.GITHUB_TOKEN },
 *   repository: { owner: 'myorg', repo: 'content' },
 *   branch: 'main',
 *   basePath: 'docs',
 * })
 *
 * // List all documents
 * const { documents } = await db.list()
 *
 * // Get a document
 * const doc = await db.get('posts/hello-world')
 *
 * // Create/update a document
 * await db.set('posts/new-post', {
 *   type: 'BlogPost',
 *   data: { title: 'New Post' },
 *   content: '# Hello!'
 * })
 *
 * // Search documents (uses GitHub Code Search API)
 * const results = await db.search({ query: 'hello' })
 *
 * // Delete a document
 * await db.delete('posts/old-post')
 * ```
 *
 * @packageDocumentation
 */

// Database exports
export { GitHubDatabase, createGitHubDatabase } from './database.js'

// Type exports
export type {
  GitHubAuth,
  GitHubRepo,
  GitHubDatabaseConfig,
  GitHubFileContent,
  GitHubDirectoryEntry,
  GitHubCommitResult,
  GitHubSearchResult,
  GitHubRateLimit,
} from './types.js'

// Re-export common types for convenience (now from @mdxdb/fs)
export type {
  Database,
  ListOptions,
  ListResult,
  SearchOptions,
  SearchResult,
  GetOptions,
  SetOptions,
  SetResult,
  DeleteOptions,
  DeleteResult,
} from '@mdxdb/fs'

export type { MDXLDDocument, MDXLDData } from 'mdxld'

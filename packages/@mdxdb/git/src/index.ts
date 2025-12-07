/**
 * @mdxdb/git - Git adapter for mdxdb
 *
 * A git-aware implementation of the mdxdb Database interface using isomorphic-git.
 * Extends @mdxdb/fs with version control operations like commit, push, pull,
 * branching, and history.
 *
 * @packageDocumentation
 */

export const name = '@mdxdb/git'

// Main exports
export { GitDatabase, createGitDatabase } from './database.js'

// Types
export type {
  GitDatabaseConfig,
  GitAuthor,
  GitRemote,
  GitAuth,
  GitCommit,
  GitStatus,
  GitFileStatus,
  GitBranch,
  GitLogOptions,
  GitPushOptions,
  GitPullOptions,
  GitCheckoutOptions,
  GitCommitResult,
  GitPushResult,
  GitPullResult,
} from './types.js'

// Re-export FsDatabase types for convenience
export type {
  FsDatabaseConfig,
  ExtractUpdateOptions,
  ExtractUpdateResult,
} from '@mdxdb/fs'

// Re-export Database interface types (now from @mdxdb/fs)
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

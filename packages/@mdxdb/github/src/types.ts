/**
 * @mdxdb/github Types
 *
 * Configuration and types for GitHub-based MDX document storage
 *
 * @packageDocumentation
 */

import type { DatabaseConfig } from '@mdxdb/fs'

/**
 * GitHub authentication options
 */
export interface GitHubAuth {
  /** GitHub personal access token or app token */
  token: string
}

/**
 * GitHub repository reference
 */
export interface GitHubRepo {
  /** Repository owner (user or organization) */
  owner: string
  /** Repository name */
  repo: string
}

/**
 * Configuration for the GitHub database
 */
export interface GitHubDatabaseConfig extends DatabaseConfig {
  /** GitHub authentication */
  auth: GitHubAuth
  /** Repository to store documents */
  repository: GitHubRepo
  /** Branch to use (default: 'main') */
  branch?: string
  /** Base path within the repository (default: '') */
  basePath?: string
  /** File extensions to consider as MDX files (default: ['.mdx', '.md']) */
  extensions?: string[]
  /** Default commit message template (default: 'Update {path}') */
  commitMessage?: string
  /** Committer info for commits */
  committer?: {
    name: string
    email: string
  }
  /** Author info for commits (defaults to committer) */
  author?: {
    name: string
    email: string
  }
}

/**
 * GitHub file content from API
 */
export interface GitHubFileContent {
  /** File path */
  path: string
  /** File SHA (for updates) */
  sha: string
  /** Base64 encoded content */
  content: string
  /** File encoding */
  encoding: 'base64' | 'utf-8'
  /** File size in bytes */
  size: number
  /** File type */
  type: 'file' | 'dir' | 'symlink' | 'submodule'
}

/**
 * GitHub directory entry from API
 */
export interface GitHubDirectoryEntry {
  /** Entry name */
  name: string
  /** Full path */
  path: string
  /** Entry SHA */
  sha: string
  /** Entry type */
  type: 'file' | 'dir' | 'symlink' | 'submodule'
  /** File size (for files) */
  size?: number
  /** Download URL (for files) */
  download_url?: string
}

/**
 * Commit result from GitHub API
 */
export interface GitHubCommitResult {
  /** Commit SHA */
  sha: string
  /** Commit URL */
  url: string
  /** Commit message */
  message: string
}

/**
 * Search code result from GitHub API
 */
export interface GitHubSearchResult {
  /** Total count of matches */
  total_count: number
  /** Whether results are incomplete */
  incomplete_results: boolean
  /** Matching items */
  items: Array<{
    name: string
    path: string
    sha: string
    repository: {
      full_name: string
    }
    score: number
    text_matches?: Array<{
      fragment: string
      matches: Array<{
        text: string
        indices: [number, number]
      }>
    }>
  }>
}

/**
 * Rate limit info from GitHub API
 */
export interface GitHubRateLimit {
  /** Maximum requests per hour */
  limit: number
  /** Remaining requests */
  remaining: number
  /** Reset timestamp (Unix epoch seconds) */
  reset: number
  /** Resource type */
  resource: string
}

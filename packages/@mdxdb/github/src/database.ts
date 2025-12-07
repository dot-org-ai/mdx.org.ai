/**
 * @mdxdb/github Database Implementation
 *
 * GitHub-based MDX document storage using Octokit
 *
 * @packageDocumentation
 */

import { Octokit } from 'octokit'
import { parse, stringify } from 'mdxld'
import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
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
import type { GitHubDatabaseConfig, GitHubFileContent, GitHubDirectoryEntry } from './types.js'

/**
 * GitHub-based MDX document database
 *
 * Uses the GitHub API via Octokit to store and retrieve MDX documents
 * as files in a GitHub repository.
 */
export class GitHubDatabase<TData extends MDXLDData = MDXLDData> implements Database<TData> {
  private readonly octokit: Octokit
  private readonly owner: string
  private readonly repo: string
  private readonly branch: string
  private readonly basePath: string
  private readonly extensions: string[]
  private readonly commitMessage: string
  private readonly committer: { name: string; email: string }
  private readonly author: { name: string; email: string }

  constructor(config: GitHubDatabaseConfig) {
    this.octokit = new Octokit({ auth: config.auth.token })
    this.owner = config.repository.owner
    this.repo = config.repository.repo
    this.branch = config.branch ?? 'main'
    this.basePath = config.basePath ?? ''
    this.extensions = config.extensions ?? ['.mdx', '.md']
    this.commitMessage = config.commitMessage ?? 'Update {path}'
    this.committer = config.committer ?? { name: 'mdxdb', email: 'mdxdb@example.com' }
    this.author = config.author ?? this.committer
  }

  /**
   * Convert document ID to file path
   */
  private idToPath(id: string): string {
    // If ID already has an extension, use it
    for (const ext of this.extensions) {
      if (id.endsWith(ext)) {
        return this.basePath ? `${this.basePath}/${id}` : id
      }
    }
    // Otherwise, add default extension
    const path = `${id}${this.extensions[0]}`
    return this.basePath ? `${this.basePath}/${path}` : path
  }

  /**
   * Convert file path to document ID
   */
  private pathToId(filePath: string): string {
    // Remove base path if present
    let path = filePath
    if (this.basePath && path.startsWith(this.basePath)) {
      path = path.slice(this.basePath.length).replace(/^\//, '')
    }
    // Remove extension to get ID
    for (const ext of this.extensions) {
      if (path.endsWith(ext)) {
        return path.slice(0, -ext.length)
      }
    }
    return path
  }

  /**
   * Check if a path has a valid MDX extension
   */
  private hasValidExtension(path: string): boolean {
    return this.extensions.some((ext) => path.endsWith(ext))
  }

  /**
   * Get file content from GitHub
   */
  private async getFileContent(path: string): Promise<GitHubFileContent | null> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      })

      const data = response.data
      if (Array.isArray(data) || data.type !== 'file') {
        return null
      }

      return {
        path: data.path,
        sha: data.sha,
        content: data.content ?? '',
        encoding: (data.encoding ?? 'base64') as 'base64' | 'utf-8',
        size: data.size,
        type: data.type,
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return null
      }
      throw error
    }
  }

  /**
   * Find the actual file path for an ID (checking all extensions)
   */
  private async findFile(id: string): Promise<GitHubFileContent | null> {
    // Check if ID already has extension
    for (const ext of this.extensions) {
      if (id.endsWith(ext)) {
        const path = this.basePath ? `${this.basePath}/${id}` : id
        return this.getFileContent(path)
      }
    }

    // Try each extension
    for (const ext of this.extensions) {
      const path = this.basePath ? `${this.basePath}/${id}${ext}` : `${id}${ext}`
      const file = await this.getFileContent(path)
      if (file) {
        return file
      }
    }
    return null
  }

  /**
   * Get directory listing from GitHub
   */
  private async getDirectory(path: string): Promise<GitHubDirectoryEntry[]> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: path || '.',
        ref: this.branch,
      })

      if (!Array.isArray(response.data)) {
        return []
      }

      return response.data.map((entry) => ({
        name: entry.name,
        path: entry.path,
        sha: entry.sha,
        type: entry.type as 'file' | 'dir' | 'symlink' | 'submodule',
        size: entry.size,
        download_url: entry.download_url ?? undefined,
      }))
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
        return []
      }
      throw error
    }
  }

  /**
   * Recursively get all MDX files in a directory
   */
  private async getAllFiles(dir: string, prefix?: string): Promise<string[]> {
    const files: string[] = []
    const entries = await this.getDirectory(dir)

    for (const entry of entries) {
      if (entry.type === 'dir') {
        // Recursively get files from subdirectory
        const subFiles = await this.getAllFiles(entry.path, prefix)
        files.push(...subFiles)
      } else if (entry.type === 'file' && this.hasValidExtension(entry.name)) {
        // Apply prefix filter if provided
        if (prefix) {
          const id = this.pathToId(entry.path)
          if (id.startsWith(prefix)) {
            files.push(entry.path)
          }
        } else {
          files.push(entry.path)
        }
      }
    }

    return files
  }

  /**
   * Decode file content from base64
   */
  private decodeContent(content: string, encoding: string): string {
    if (encoding === 'base64') {
      return Buffer.from(content, 'base64').toString('utf-8')
    }
    return content
  }

  /**
   * Parse document from file content
   */
  private parseDocument(content: string, filePath: string): MDXLDDocument<TData> {
    const doc = parse(content) as MDXLDDocument<TData>
    // Set ID from file path if not present
    if (!doc.id && !doc.data.$id) {
      doc.id = this.pathToId(filePath)
    }
    return doc
  }

  /**
   * List documents with optional filtering and pagination
   */
  async list(options: ListOptions = {}): Promise<ListResult<TData>> {
    const { limit = 100, offset = 0, sortBy, sortOrder = 'asc', type, prefix } = options

    // Get all files from the base path
    const searchPath = this.basePath || ''
    const files = await this.getAllFiles(searchPath, prefix)

    // Read all documents
    const documents: MDXLDDocument<TData>[] = []
    for (const filePath of files) {
      try {
        const file = await this.getFileContent(filePath)
        if (!file) continue

        const content = this.decodeContent(file.content, file.encoding)
        const doc = this.parseDocument(content, filePath)

        // Filter by type if specified
        if (type) {
          const docType = doc.type ?? doc.data.$type
          const types = Array.isArray(type) ? type : [type]
          if (!types.some((t) => docType === t || (Array.isArray(docType) && docType.includes(t)))) {
            continue
          }
        }

        documents.push(doc)
      } catch {
        // Skip files that can't be parsed
      }
    }

    // Sort if requested
    if (sortBy) {
      documents.sort((a, b) => {
        const aVal = (a.data as Record<string, unknown>)[sortBy] ?? ''
        const bVal = (b.data as Record<string, unknown>)[sortBy] ?? ''
        const cmp = String(aVal).localeCompare(String(bVal))
        return sortOrder === 'desc' ? -cmp : cmp
      })
    }

    // Apply pagination
    const total = documents.length
    const paginatedDocs = documents.slice(offset, offset + limit)

    return {
      documents: paginatedDocs,
      total,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Search documents by query using GitHub Code Search API
   */
  async search(options: SearchOptions): Promise<SearchResult<TData>> {
    const { query, limit = 100, offset = 0, type } = options

    // Build GitHub search query
    let searchQuery = `${query} repo:${this.owner}/${this.repo}`

    // Add path filter if basePath is set
    if (this.basePath) {
      searchQuery += ` path:${this.basePath}`
    }

    // Filter by extension
    const extPatterns = this.extensions.map((ext) => `extension:${ext.replace('.', '')}`).join(' OR ')
    searchQuery += ` (${extPatterns})`

    try {
      const response = await this.octokit.rest.search.code({
        q: searchQuery,
        per_page: Math.min(limit + offset, 100), // GitHub API max is 100
      })

      const scoredDocs: Array<MDXLDDocument<TData> & { score: number }> = []

      for (const item of response.data.items) {
        if (!this.hasValidExtension(item.path)) continue

        try {
          const file = await this.getFileContent(item.path)
          if (!file) continue

          const content = this.decodeContent(file.content, file.encoding)
          const doc = this.parseDocument(content, item.path)

          // Filter by type if specified
          if (type) {
            const docType = doc.type ?? doc.data.$type
            const types = Array.isArray(type) ? type : [type]
            if (!types.some((t) => docType === t || (Array.isArray(docType) && docType.includes(t)))) {
              continue
            }
          }

          scoredDocs.push({ ...doc, score: item.score })
        } catch {
          // Skip files that can't be parsed
        }
      }

      // Sort by score (descending)
      scoredDocs.sort((a, b) => b.score - a.score)

      // Apply pagination
      const total = response.data.total_count
      const paginatedDocs = scoredDocs.slice(offset, offset + limit)

      return {
        documents: paginatedDocs,
        total,
        hasMore: offset + limit < total,
      }
    } catch {
      // Fallback to in-memory search if code search fails (e.g., rate limits)
      return this.searchInMemory(options)
    }
  }

  /**
   * Fallback in-memory search when GitHub Code Search is unavailable
   */
  private async searchInMemory(options: SearchOptions): Promise<SearchResult<TData>> {
    const { query, limit = 100, offset = 0, fields, type } = options

    const queryLower = query.toLowerCase()

    // Get all documents first
    const listResult = await this.list({ type })
    const scoredDocs: Array<MDXLDDocument<TData> & { score: number }> = []

    for (const doc of listResult.documents) {
      let score = 0
      const searchFields = fields ?? ['content', ...Object.keys(doc.data)]

      for (const field of searchFields) {
        let text = ''

        if (field === 'content') {
          text = doc.content
        } else if (field in doc.data) {
          const val = (doc.data as Record<string, unknown>)[field]
          text = typeof val === 'string' ? val : JSON.stringify(val)
        }

        const textLower = text.toLowerCase()
        if (textLower.includes(queryLower)) {
          // Simple scoring: count occurrences
          const matches = textLower.split(queryLower).length - 1
          score += matches
        }
      }

      if (score > 0) {
        scoredDocs.push({ ...doc, score })
      }
    }

    // Sort by score (descending)
    scoredDocs.sort((a, b) => b.score - a.score)

    // Apply pagination
    const total = scoredDocs.length
    const paginatedDocs = scoredDocs.slice(offset, offset + limit)

    return {
      documents: paginatedDocs,
      total,
      hasMore: offset + limit < total,
    }
  }

  /**
   * Get a document by ID
   */
  async get(id: string, _options: GetOptions = {}): Promise<MDXLDDocument<TData> | null> {
    const file = await this.findFile(id)
    if (!file) {
      return null
    }

    try {
      const content = this.decodeContent(file.content, file.encoding)
      return this.parseDocument(content, file.path)
    } catch {
      return null
    }
  }

  /**
   * Set/create a document
   */
  async set(id: string, document: MDXLDDocument<TData>, options: SetOptions = {}): Promise<SetResult> {
    const { createOnly, updateOnly } = options

    const existingFile = await this.findFile(id)
    const exists = existingFile !== null

    if (createOnly && exists) {
      throw new Error(`Document already exists: ${id}`)
    }

    if (updateOnly && !exists) {
      throw new Error(`Document does not exist: ${id}`)
    }

    // Determine file path
    const filePath = existingFile?.path ?? this.idToPath(id)

    // Stringify document
    const content = stringify(document)
    const encodedContent = Buffer.from(content, 'utf-8').toString('base64')

    // Format commit message
    const message = this.commitMessage.replace('{path}', filePath)

    // Create or update file
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: filePath,
      message,
      content: encodedContent,
      branch: this.branch,
      sha: existingFile?.sha,
      committer: this.committer,
      author: this.author,
    })

    return {
      id,
      created: !exists,
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string, options: DeleteOptions = {}): Promise<DeleteResult> {
    const { soft } = options

    const file = await this.findFile(id)
    if (!file) {
      return {
        id,
        deleted: false,
      }
    }

    try {
      if (soft) {
        // Soft delete: rename with .deleted extension
        // First, get the file content
        const content = this.decodeContent(file.content, file.encoding)

        // Create the new file with .deleted extension
        const newPath = `${file.path}.deleted`
        const encodedContent = Buffer.from(content, 'utf-8').toString('base64')

        await this.octokit.rest.repos.createOrUpdateFileContents({
          owner: this.owner,
          repo: this.repo,
          path: newPath,
          message: `Soft delete ${file.path}`,
          content: encodedContent,
          branch: this.branch,
          committer: this.committer,
          author: this.author,
        })

        // Then delete the original file
        await this.octokit.rest.repos.deleteFile({
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          message: `Move to ${newPath}`,
          sha: file.sha,
          branch: this.branch,
          committer: this.committer,
          author: this.author,
        })
      } else {
        // Hard delete: remove file
        await this.octokit.rest.repos.deleteFile({
          owner: this.owner,
          repo: this.repo,
          path: file.path,
          message: `Delete ${file.path}`,
          sha: file.sha,
          branch: this.branch,
          committer: this.committer,
          author: this.author,
        })
      }

      return {
        id,
        deleted: true,
      }
    } catch {
      return {
        id,
        deleted: false,
      }
    }
  }

  /**
   * Close the database (no-op for GitHub)
   */
  async close(): Promise<void> {
    // No cleanup needed for GitHub API
  }
}

/**
 * Create a GitHub database instance
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
 * // Search documents
 * const results = await db.search({ query: 'hello' })
 *
 * // Delete a document
 * await db.delete('posts/old-post')
 * ```
 */
export function createGitHubDatabase<TData extends MDXLDData = MDXLDData>(
  config: GitHubDatabaseConfig
): Database<TData> {
  return new GitHubDatabase<TData>(config)
}

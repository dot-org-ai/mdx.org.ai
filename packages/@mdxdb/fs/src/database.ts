/**
 * @mdxdb/fs Database Implementation
 *
 * @packageDocumentation
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
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
} from 'mdxdb'
import {
  extract,
  diff,
  applyExtract,
  type ExtractResult,
  type ExtractDiff,
  type ExtractOptions,
  type ComponentExtractor,
} from '@mdxld/extract'
import type { FsDatabaseConfig, ExtractUpdateOptions, ExtractUpdateResult } from './types.js'

/**
 * Filesystem-based MDX document database
 */
export class FsDatabase<TData extends MDXLDData = MDXLDData> implements Database<TData> {
  private readonly root: string
  private readonly extensions: string[]
  private readonly autoCreateDirs: boolean
  private readonly encoding: BufferEncoding

  constructor(config: FsDatabaseConfig) {
    this.root = path.resolve(config.root)
    this.extensions = config.extensions ?? ['.mdx', '.md']
    this.autoCreateDirs = config.autoCreateDirs ?? true
    this.encoding = config.encoding ?? 'utf-8'
  }

  /**
   * Convert document ID to file path
   */
  private idToPath(id: string): string {
    // If ID already has an extension, use it
    for (const ext of this.extensions) {
      if (id.endsWith(ext)) {
        return path.join(this.root, id)
      }
    }
    // Otherwise, add default extension
    return path.join(this.root, `${id}${this.extensions[0]}`)
  }

  /**
   * Convert file path to document ID
   */
  private pathToId(filePath: string): string {
    const relative = path.relative(this.root, filePath)
    // Remove extension to get ID
    for (const ext of this.extensions) {
      if (relative.endsWith(ext)) {
        return relative.slice(0, -ext.length)
      }
    }
    return relative
  }

  /**
   * Check if a file exists
   */
  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  /**
   * Find the actual file path for an ID (checking all extensions)
   */
  private async findFile(id: string): Promise<string | null> {
    // Check if ID already has extension
    for (const ext of this.extensions) {
      if (id.endsWith(ext)) {
        const filePath = path.join(this.root, id)
        if (await this.fileExists(filePath)) {
          return filePath
        }
        return null
      }
    }

    // Try each extension
    for (const ext of this.extensions) {
      const filePath = path.join(this.root, `${id}${ext}`)
      if (await this.fileExists(filePath)) {
        return filePath
      }
    }
    return null
  }

  /**
   * Recursively get all MDX files in a directory
   */
  private async getAllFiles(dir: string, prefix?: string): Promise<string[]> {
    const files: string[] = []

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name)

        if (entry.isDirectory()) {
          // Recursively get files from subdirectory
          const subFiles = await this.getAllFiles(entryPath, prefix)
          files.push(...subFiles)
        } else if (entry.isFile()) {
          // Check if file has valid extension
          const hasValidExt = this.extensions.some((ext) => entry.name.endsWith(ext))
          if (hasValidExt) {
            // Apply prefix filter if provided
            if (prefix) {
              const id = this.pathToId(entryPath)
              if (id.startsWith(prefix)) {
                files.push(entryPath)
              }
            } else {
              files.push(entryPath)
            }
          }
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }

    return files
  }

  /**
   * Read and parse a document from file
   */
  private async readDocument(filePath: string): Promise<MDXLDDocument<TData>> {
    const content = await fs.readFile(filePath, this.encoding)
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

    // Get all files
    let files = await this.getAllFiles(this.root, prefix)

    // Read all documents
    const documents: MDXLDDocument<TData>[] = []
    for (const file of files) {
      try {
        const doc = await this.readDocument(file)

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
   * Search documents by query
   */
  async search(options: SearchOptions): Promise<SearchResult<TData>> {
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
    const filePath = await this.findFile(id)
    if (!filePath) {
      return null
    }

    try {
      return await this.readDocument(filePath)
    } catch {
      return null
    }
  }

  /**
   * Set/create a document
   */
  async set(id: string, document: MDXLDDocument<TData>, options: SetOptions = {}): Promise<SetResult> {
    const { createOnly, updateOnly } = options

    const existingPath = await this.findFile(id)
    const exists = existingPath !== null

    if (createOnly && exists) {
      throw new Error(`Document already exists: ${id}`)
    }

    if (updateOnly && !exists) {
      throw new Error(`Document does not exist: ${id}`)
    }

    // Determine file path
    const filePath = existingPath ?? this.idToPath(id)

    // Create directory if needed
    if (this.autoCreateDirs) {
      const dir = path.dirname(filePath)
      await fs.mkdir(dir, { recursive: true })
    }

    // Stringify and write document
    const content = stringify(document)
    await fs.writeFile(filePath, content, this.encoding)

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

    const filePath = await this.findFile(id)
    if (!filePath) {
      return {
        id,
        deleted: false,
      }
    }

    try {
      if (soft) {
        // Soft delete: rename with .deleted extension
        await fs.rename(filePath, `${filePath}.deleted`)
      } else {
        // Hard delete: remove file
        await fs.unlink(filePath)
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
   * Extract structured data from rendered markdown using a document's template
   *
   * This is the core of bi-directional MDX ↔ Markdown translation.
   * The document's content serves as the template, and the rendered markdown
   * is matched against it to extract updated data.
   *
   * @example
   * ```ts
   * // Document content: "# {data.title}\n\n{data.content}"
   * const result = await db.extractFromRendered(
   *   'posts/hello',
   *   '# Updated Title\n\nNew content here'
   * )
   * // result.data = { data: { title: 'Updated Title', content: 'New content here' } }
   * ```
   */
  async extractFromRendered(
    id: string,
    renderedMarkdown: string,
    options: Partial<ExtractOptions> = {}
  ): Promise<ExtractResult & { original: MDXLDDocument<TData> }> {
    const doc = await this.get(id)
    if (!doc) {
      throw new Error(`Document not found: ${id}`)
    }

    // Use the document's content as the template
    const template = doc.content

    // Extract data from the rendered markdown
    const result = extract({
      template,
      rendered: renderedMarkdown,
      ...options,
    })

    return {
      ...result,
      original: doc,
    }
  }

  /**
   * Update a document from edited markdown
   *
   * This performs a full round-trip:
   * 1. Extract structured data from the edited markdown
   * 2. Calculate diff between original and extracted data
   * 3. Apply changes to the document
   * 4. Save the updated document
   *
   * @example
   * ```ts
   * const { doc, changes } = await db.updateFromRendered(
   *   'posts/hello',
   *   '# Updated Title\n\nNew content here'
   * )
   *
   * if (changes.hasChanges) {
   *   console.log('Modified fields:', Object.keys(changes.modified))
   * }
   * ```
   */
  async updateFromRendered(
    id: string,
    renderedMarkdown: string,
    options: ExtractUpdateOptions = {}
  ): Promise<ExtractUpdateResult<TData>> {
    const { components, strict, paths, arrayMerge = 'replace' } = options

    // Extract data from rendered markdown
    const { data: extractedData, original, confidence, unmatched, aiAssisted } = await this.extractFromRendered(
      id,
      renderedMarkdown,
      { components, strict }
    )

    // Calculate diff
    const changes = diff(original.data, extractedData)

    // If no changes, return early
    if (!changes.hasChanges) {
      return {
        doc: original,
        changes,
        extracted: { data: extractedData, confidence, unmatched, aiAssisted },
      }
    }

    // Apply changes to original data
    const updatedData = applyExtract(original.data, extractedData, { paths, arrayMerge }) as TData

    // Create updated document
    const updatedDoc: MDXLDDocument<TData> = {
      ...original,
      data: updatedData,
    }

    // Save the updated document
    await this.set(id, updatedDoc)

    return {
      doc: updatedDoc,
      changes,
      extracted: { data: extractedData, confidence, unmatched, aiAssisted },
    }
  }

  /**
   * Preview changes from edited markdown without saving
   *
   * Use this to show the user what would change before applying.
   *
   * @example
   * ```ts
   * const { changes, extracted } = await db.previewFromRendered(
   *   'posts/hello',
   *   editedMarkdown
   * )
   *
   * if (changes.hasChanges) {
   *   console.log('Would modify:', Object.keys(changes.modified))
   *   const confirmed = await askUserConfirmation()
   *   if (confirmed) {
   *     await db.updateFromRendered('posts/hello', editedMarkdown)
   *   }
   * }
   * ```
   */
  async previewFromRendered(
    id: string,
    renderedMarkdown: string,
    options: Partial<ExtractOptions> = {}
  ): Promise<{
    original: MDXLDDocument<TData>
    changes: ExtractDiff
    extracted: ExtractResult
  }> {
    const { data: extractedData, original, confidence, unmatched, aiAssisted } = await this.extractFromRendered(
      id,
      renderedMarkdown,
      options
    )

    const changes = diff(original.data, extractedData)

    return {
      original,
      changes,
      extracted: { data: extractedData, confidence, unmatched, aiAssisted },
    }
  }

  /**
   * Close the database (no-op for filesystem)
   */
  async close(): Promise<void> {
    // No cleanup needed for filesystem
  }
}

/**
 * Create a filesystem database instance
 *
 * @example
 * ```ts
 * import { createFsDatabase } from '@mdxdb/fs'
 *
 * const db = createFsDatabase({ root: './content' })
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
export function createFsDatabase<TData extends MDXLDData = MDXLDData>(
  config: FsDatabaseConfig
): Database<TData> {
  return new FsDatabase<TData>(config)
}

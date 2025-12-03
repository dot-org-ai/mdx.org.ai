/**
 * @mdxdb/fs Provider
 *
 * DBProvider implementation for filesystem storage.
 *
 * Structure:
 * ```
 * content/
 * ├── Post/
 * │   └── hello-world.mdx
 * ├── Author/
 * │   └── john.mdx
 * └── .db/
 *     ├── relationships.tsv   # from → relation → to → created_at
 *     ├── search.tsv          # type/id → terms
 *     ├── events.tsv          # id → type → source → data → timestamp
 *     ├── actions.tsv         # id → actor → object → action → status → ...
 *     └── artifacts/
 *         └── {key}.json
 * ```
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { parse, stringify } from 'mdxld'
import type { DBProvider, ListOptions, SearchOptions } from 'ai-database'
import type { FsDatabaseConfig } from './types.js'

/**
 * Filesystem-based DBProvider with .db folder for metadata
 */
export class FsProvider implements DBProvider {
  private root: string
  private dbDir: string
  private extensions: string[]
  private encoding: BufferEncoding

  constructor(config: FsDatabaseConfig) {
    this.root = path.resolve(config.root)
    this.dbDir = path.join(this.root, '.db')
    this.extensions = config.extensions ?? ['.mdx', '.md']
    this.encoding = config.encoding ?? 'utf-8'
  }

  // ===========================================================================
  // Initialization
  // ===========================================================================

  /**
   * Ensure .db directory structure exists
   */
  private async ensureDbDir(): Promise<void> {
    await fs.mkdir(path.join(this.dbDir, 'artifacts'), { recursive: true })

    // Create empty TSV files if they don't exist
    const tsvFiles = [
      { path: 'relationships.tsv', header: '# from\trelation\tto\tcreated_at' },
      { path: 'search.tsv', header: '# type/id\tterms' },
      { path: 'events.tsv', header: '# id\ttype\tsource\tdata\ttimestamp\tcorrelation_id\tcausation_id' },
      { path: 'actions.tsv', header: '# id\tactor\tobject\taction\tstatus\tcreated_at\tupdated_at\tstarted_at\tcompleted_at\tresult\terror\tmetadata' },
    ]

    for (const { path: filename, header } of tsvFiles) {
      const filePath = path.join(this.dbDir, filename)
      try {
        await fs.access(filePath)
      } catch {
        await fs.writeFile(filePath, header + '\n', this.encoding)
      }
    }
  }

  // ===========================================================================
  // Entity Operations
  // ===========================================================================

  private entityPath(type: string, id: string): string {
    return path.join(this.root, type, `${id}${this.extensions[0]}`)
  }

  private async findEntityPath(type: string, id: string): Promise<string | null> {
    for (const ext of this.extensions) {
      const filePath = path.join(this.root, type, `${id}${ext}`)
      try {
        await fs.access(filePath)
        return filePath
      } catch {
        continue
      }
    }
    return null
  }

  async get(type: string, id: string): Promise<Record<string, unknown> | null> {
    const filePath = await this.findEntityPath(type, id)
    if (!filePath) return null

    try {
      const content = await fs.readFile(filePath, this.encoding)
      const doc = parse(content)
      return {
        $id: id,
        $type: type,
        ...doc.data,
        _content: doc.content,
      }
    } catch {
      return null
    }
  }

  async list(type: string, options?: ListOptions): Promise<Record<string, unknown>[]> {
    const typeDir = path.join(this.root, type)
    const results: Record<string, unknown>[] = []

    try {
      const entries = await fs.readdir(typeDir, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isFile()) continue

        const hasValidExt = this.extensions.some((ext) => entry.name.endsWith(ext))
        if (!hasValidExt) continue

        // Extract ID from filename
        let id = entry.name
        for (const ext of this.extensions) {
          if (id.endsWith(ext)) {
            id = id.slice(0, -ext.length)
            break
          }
        }

        const entity = await this.get(type, id)
        if (!entity) continue

        // Apply where filter
        if (options?.where) {
          let matches = true
          for (const [key, value] of Object.entries(options.where)) {
            if (entity[key] !== value) {
              matches = false
              break
            }
          }
          if (!matches) continue
        }

        results.push(entity)
      }
    } catch {
      // Directory doesn't exist
      return []
    }

    // Sort
    if (options?.orderBy) {
      const field = options.orderBy
      const dir = options.order === 'desc' ? -1 : 1
      results.sort((a, b) => {
        const aVal = a[field]
        const bVal = b[field]
        if (aVal === undefined && bVal === undefined) return 0
        if (aVal === undefined) return dir
        if (bVal === undefined) return -dir
        if ((aVal as string | number) < (bVal as string | number)) return -dir
        if ((aVal as string | number) > (bVal as string | number)) return dir
        return 0
      })
    }

    // Paginate
    let paginated = results
    if (options?.offset) {
      paginated = paginated.slice(options.offset)
    }
    if (options?.limit) {
      paginated = paginated.slice(0, options.limit)
    }

    return paginated
  }

  async search(
    type: string,
    query: string,
    options?: SearchOptions
  ): Promise<Record<string, unknown>[]> {
    const queryLower = query.toLowerCase()
    const all = await this.list(type, options)

    return all.filter((entity) => {
      const searchText = JSON.stringify(entity).toLowerCase()
      return searchText.includes(queryLower)
    })
  }

  async create(
    type: string,
    id: string | undefined,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const entityId = id ?? crypto.randomUUID()
    const filePath = this.entityPath(type, entityId)

    // Ensure type directory exists
    await fs.mkdir(path.dirname(filePath), { recursive: true })

    // Check if already exists
    const existing = await this.findEntityPath(type, entityId)
    if (existing) {
      throw new Error(`Entity already exists: ${type}/${entityId}`)
    }

    // Extract content from data if present
    const { _content, ...rest } = data
    const content = typeof _content === 'string' ? _content : ''

    const doc = {
      type,
      data: { $type: type, $id: entityId, ...rest },
      content,
    }

    await fs.writeFile(filePath, stringify(doc), this.encoding)

    // Index for search
    await this.indexEntity(type, entityId, rest)

    return {
      $id: entityId,
      $type: type,
      ...rest,
    }
  }

  async update(
    type: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const filePath = await this.findEntityPath(type, id)
    if (!filePath) {
      throw new Error(`Entity not found: ${type}/${id}`)
    }

    const existing = await this.get(type, id)
    if (!existing) {
      throw new Error(`Entity not found: ${type}/${id}`)
    }

    const { _content: existingContent, $id, $type, ...existingData } = existing
    const { _content: newContent, ...newData } = data

    const merged = { ...existingData, ...newData }
    const content = typeof newContent === 'string'
      ? newContent
      : typeof existingContent === 'string'
        ? existingContent
        : ''

    const doc = {
      type,
      data: { $type: type, $id: id, ...merged },
      content,
    }

    await fs.writeFile(filePath, stringify(doc), this.encoding)

    // Re-index for search
    await this.indexEntity(type, id, merged)

    return {
      $id: id,
      $type: type,
      ...merged,
    }
  }

  async delete(type: string, id: string): Promise<boolean> {
    const filePath = await this.findEntityPath(type, id)
    if (!filePath) return false

    try {
      await fs.unlink(filePath)

      // Remove from search index
      await this.removeFromSearchIndex(type, id)

      // Remove relationships
      await this.removeRelationships(type, id)

      return true
    } catch {
      return false
    }
  }

  // ===========================================================================
  // Relationship Operations (TSV storage)
  // ===========================================================================

  private get relationshipsPath(): string {
    return path.join(this.dbDir, 'relationships.tsv')
  }

  private async readRelationships(): Promise<Array<{
    from: string
    relation: string
    to: string
    createdAt: string
  }>> {
    try {
      const content = await fs.readFile(this.relationshipsPath, this.encoding)
      return content
        .split('\n')
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => {
          const [from, relation, to, createdAt] = line.split('\t')
          return { from: from!, relation: relation!, to: to!, createdAt: createdAt! }
        })
    } catch {
      return []
    }
  }

  private async writeRelationships(
    rels: Array<{ from: string; relation: string; to: string; createdAt: string }>
  ): Promise<void> {
    await this.ensureDbDir()
    const lines = ['# from\trelation\tto\tcreated_at']
    for (const rel of rels) {
      lines.push(`${rel.from}\t${rel.relation}\t${rel.to}\t${rel.createdAt}`)
    }
    await fs.writeFile(this.relationshipsPath, lines.join('\n') + '\n', this.encoding)
  }

  async related(
    type: string,
    id: string,
    relation: string
  ): Promise<Record<string, unknown>[]> {
    const rels = await this.readRelationships()
    const from = `${type}/${id}`

    const related: Record<string, unknown>[] = []
    for (const rel of rels) {
      if (rel.from === from && rel.relation === relation) {
        const [toType, ...toIdParts] = rel.to.split('/')
        const toId = toIdParts.join('/')
        const entity = await this.get(toType!, toId)
        if (entity) related.push(entity)
      }
    }

    return related
  }

  async relate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string
  ): Promise<void> {
    const rels = await this.readRelationships()
    const from = `${fromType}/${fromId}`
    const to = `${toType}/${toId}`

    // Check if already exists
    const exists = rels.some((r) => r.from === from && r.relation === relation && r.to === to)
    if (exists) return

    rels.push({
      from,
      relation,
      to,
      createdAt: new Date().toISOString(),
    })

    await this.writeRelationships(rels)
  }

  async unrelate(
    fromType: string,
    fromId: string,
    relation: string,
    toType: string,
    toId: string
  ): Promise<void> {
    const rels = await this.readRelationships()
    const from = `${fromType}/${fromId}`
    const to = `${toType}/${toId}`

    const filtered = rels.filter(
      (r) => !(r.from === from && r.relation === relation && r.to === to)
    )

    await this.writeRelationships(filtered)
  }

  private async removeRelationships(type: string, id: string): Promise<void> {
    const rels = await this.readRelationships()
    const key = `${type}/${id}`

    const filtered = rels.filter((r) => r.from !== key && r.to !== key)
    await this.writeRelationships(filtered)
  }

  // ===========================================================================
  // Search Index (TSV storage)
  // ===========================================================================

  private get searchIndexPath(): string {
    return path.join(this.dbDir, 'search.tsv')
  }

  private async indexEntity(
    type: string,
    id: string,
    data: Record<string, unknown>
  ): Promise<void> {
    await this.ensureDbDir()

    // Extract searchable text
    const searchableFields = ['title', 'name', 'description', 'content', 'text']
    const terms: string[] = []

    for (const field of searchableFields) {
      const value = data[field]
      if (typeof value === 'string') {
        // Extract words, lowercase, dedupe
        const words = value.toLowerCase().match(/\w+/g) || []
        terms.push(...words)
      }
    }

    // Read existing index
    const lines: string[] = []
    try {
      const content = await fs.readFile(this.searchIndexPath, this.encoding)
      const key = `${type}/${id}`
      for (const line of content.split('\n')) {
        if (line && !line.startsWith('#') && !line.startsWith(key + '\t')) {
          lines.push(line)
        }
      }
    } catch {
      // File doesn't exist
    }

    // Add new entry
    if (terms.length > 0) {
      const uniqueTerms = [...new Set(terms)].slice(0, 100).join(' ')
      lines.push(`${type}/${id}\t${uniqueTerms}`)
    }

    // Write back
    const header = '# type/id\tterms'
    await fs.writeFile(
      this.searchIndexPath,
      [header, ...lines].join('\n') + '\n',
      this.encoding
    )
  }

  private async removeFromSearchIndex(type: string, id: string): Promise<void> {
    try {
      const content = await fs.readFile(this.searchIndexPath, this.encoding)
      const key = `${type}/${id}`
      const lines = content
        .split('\n')
        .filter((line) => line && !line.startsWith(key + '\t'))

      await fs.writeFile(this.searchIndexPath, lines.join('\n') + '\n', this.encoding)
    } catch {
      // File doesn't exist
    }
  }

  // ===========================================================================
  // Cleanup
  // ===========================================================================

  async close(): Promise<void> {
    // No cleanup needed for filesystem
  }
}

/**
 * Create a filesystem-based provider
 */
export function createFsProvider(config: FsDatabaseConfig): FsProvider {
  return new FsProvider(config)
}

// =============================================================================
// Convenience Exports
// =============================================================================

import { DB as SchemaDB, type DatabaseSchema, type TypedDB } from 'ai-database'

/**
 * Create a typed database with filesystem storage
 *
 * @example
 * ```ts
 * import { DB } from '@mdxdb/fs'
 *
 * const db = DB({
 *   Post: { title: 'string', author: 'Author.posts' },
 *   Author: { name: 'string' },
 * })
 *
 * await db.Post.create('hello', { title: 'Hello World', author: 'john' })
 * ```
 */
export function DB<TSchema extends DatabaseSchema>(
  schema: TSchema,
  config: FsDatabaseConfig = { root: './content' }
): TypedDB<TSchema> {
  const { setProvider } = require('ai-database')
  setProvider(createFsProvider(config))
  return SchemaDB(schema)
}

/**
 * Default database instance (uses ./content)
 */
export const db = createFsProvider({ root: './content' })

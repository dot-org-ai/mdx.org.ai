/**
 * Git Parser
 *
 * Parses git changes into ActionObjects for database synchronization.
 * Handles MDX/MD files with frontmatter extraction.
 */

import { createHash } from 'crypto'
import type { ActionObject } from '../schema/actions'
import type { GitFileChange, GitCommit, GitExecutor } from './types'

// =============================================================================
// MDX Parsing
// =============================================================================

/**
 * Frontmatter regex - matches YAML between --- delimiters
 */
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

/**
 * Parse frontmatter from content
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>
  content: string
} {
  const match = content.match(FRONTMATTER_REGEX)

  if (!match) {
    return { data: {}, content }
  }

  const yaml = match[1] ?? ''
  const body = content.slice(match[0].length)

  // Simple YAML parsing (key: value format)
  // For production, consider using a proper YAML parser
  const data: Record<string, unknown> = {}

  for (const line of yaml.split('\n')) {
    const colonIndex = line.indexOf(':')
    if (colonIndex === -1) continue

    const key = line.slice(0, colonIndex).trim()
    let value: string | boolean | number | string[] = line.slice(colonIndex + 1).trim()

    // Handle quoted strings
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    // Handle booleans
    else if (value === 'true') {
      value = true
    } else if (value === 'false') {
      value = false
    }
    // Handle numbers
    else if (!isNaN(Number(value)) && value !== '') {
      value = Number(value)
    }
    // Handle arrays (simple format: [a, b, c])
    else if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    }

    if (key) {
      // Handle $type, $id prefixes
      const normalizedKey = key.startsWith('$') ? key.slice(1) : key
      data[normalizedKey] = value
    }
  }

  return { data, content: body }
}

/**
 * Infer entity type from file path
 *
 * @example
 * inferTypeFromPath('posts/hello.mdx') // 'Post'
 * inferTypeFromPath('content/blog/article.md') // 'Blog'
 * inferTypeFromPath('[Post].mdx') // 'Post'
 */
export function inferTypeFromPath(path: string): string {
  // Remove extension
  const withoutExt = path.replace(/\.(mdx?|md)$/i, '')

  // Check for bracket notation [Type].mdx
  const bracketMatch = withoutExt.match(/\[([A-Z][a-zA-Z0-9]*)\]/)
  if (bracketMatch && bracketMatch[1]) {
    return bracketMatch[1]
  }

  // Get directory name and singularize
  const parts = path.split('/')
  if (parts.length >= 2) {
    const dir = parts[parts.length - 2] ?? 'Document'
    return singularize(capitalize(dir))
  }

  // Fallback to filename
  const filename = (parts[parts.length - 1] ?? 'document').replace(/\.(mdx?|md)$/i, '')
  return capitalize(filename)
}

/**
 * Infer entity ID from file path
 *
 * @example
 * inferIdFromPath('posts/hello-world.mdx') // 'hello-world'
 * inferIdFromPath('content/blog/2024/my-post.md') // 'my-post'
 */
export function inferIdFromPath(path: string): string {
  const parts = path.split('/')
  const filename = parts[parts.length - 1] ?? ''

  // Remove extension
  const withoutExt = filename.replace(/\.(mdx?|md)$/i, '')

  // Skip bracket notation files
  if (withoutExt.startsWith('[') && withoutExt.endsWith(']')) {
    return ''
  }

  return withoutExt
}

/**
 * Generate content hash
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

// =============================================================================
// Action Object Creation
// =============================================================================

/**
 * Parser options
 */
export interface ParserOptions {
  /** Namespace for generated URLs */
  ns: string
  /** Include patterns (glob) */
  include?: string[]
  /** Exclude patterns (glob) */
  exclude?: string[]
  /** Extract relationships from content */
  extractRelationships?: boolean
  /** Extract search metadata */
  extractSearch?: boolean
}

/**
 * Parse a git file change into an ActionObject
 */
export async function parseFileChange(
  change: GitFileChange,
  content: string | null,
  options: ParserOptions
): Promise<ActionObject | null> {
  const { ns, include, exclude } = options

  // Check if file should be included
  if (!shouldIncludeFile(change.path, include, exclude)) {
    return null
  }

  // Only process MDX/MD files
  if (!isMdxFile(change.path)) {
    return null
  }

  // Map git status to operation
  const operation = mapStatusToOperation(change.status)

  // For deletions, we don't have content
  if (operation === 'delete') {
    return {
      path: change.path,
      type: inferTypeFromPath(change.path),
      id: inferIdFromPath(change.path),
      operation,
      change: change.status as ActionObject['change'],
      previousPath: change.previousPath,
    }
  }

  // Parse content
  if (!content) {
    return null
  }

  const { data, content: body } = parseFrontmatter(content)

  // Get type and id from frontmatter or infer from path
  const type = (data.type as string) || inferTypeFromPath(change.path)
  const id = (data.id as string) || inferIdFromPath(change.path)

  // Build ActionObject
  const obj: ActionObject = {
    path: change.path,
    type,
    id,
    operation,
    data,
    content: body,
    hash: hashContent(content),
    change: change.status as ActionObject['change'],
  }

  // Handle renames
  if (change.previousPath) {
    obj.previousPath = change.previousPath
    obj.previousHash = undefined // Would need to fetch old content
  }

  // Extract relationships if enabled
  if (options.extractRelationships) {
    obj.relationships = extractRelationships(data, body, ns)
  }

  // Extract search metadata if enabled
  if (options.extractSearch) {
    obj.search = extractSearchMetadata(data, body)
  }

  return obj
}

/**
 * Parse multiple file changes into ActionObjects
 */
export async function parseCommitChanges(
  commit: GitCommit,
  changes: GitFileChange[],
  executor: GitExecutor,
  repoPath: string,
  options: ParserOptions
): Promise<ActionObject[]> {
  const objects: ActionObject[] = []

  for (const change of changes) {
    // Get file content (except for deletions)
    let content: string | null = null
    if (change.status !== 'deleted') {
      try {
        content = await executor.getFileContent(repoPath, change.path, commit.hash)
      } catch {
        // File might not exist at this commit (e.g., in merge commits)
        continue
      }
    }

    const obj = await parseFileChange(change, content, options)
    if (obj) {
      objects.push(obj)
    }
  }

  return objects
}

// =============================================================================
// Relationship Extraction
// =============================================================================

/**
 * Extract relationships from frontmatter and content
 */
export function extractRelationships(
  data: Record<string, unknown>,
  content: string,
  ns: string
): ActionObject['relationships'] {
  const relationships: ActionObject['relationships'] = []

  // Extract from frontmatter references
  for (const [key, value] of Object.entries(data)) {
    // Check for Type/id pattern in values
    if (typeof value === 'string' && value.includes('/')) {
      const [refType, refId] = value.split('/')
      if (refType && refId && isTypeReference(refType)) {
        relationships.push({
          predicate: key,
          target: `${ns}/${refType}/${refId}`,
          reverse: inferReversePredicate(key, refType),
        })
      }
    }

    // Check for arrays of references
    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && item.includes('/')) {
          const [refType, refId] = item.split('/')
          if (refType && refId && isTypeReference(refType)) {
            relationships.push({
              predicate: key,
              target: `${ns}/${refType}/${refId}`,
              reverse: inferReversePredicate(key, refType),
            })
          }
        }
      }
    }
  }

  // Extract from markdown links (optional enhancement)
  // Pattern: [text](Type/id) or [[Type/id]]
  const linkRegex = /\[\[([A-Z][a-zA-Z0-9]*\/[a-zA-Z0-9-_]+)\]\]/g
  let match
  while ((match = linkRegex.exec(content)) !== null) {
    const matchStr = match[1]
    if (!matchStr) continue
    const parts = matchStr.split('/')
    const refType = parts[0]
    const refId = parts[1]
    if (refType && refId) {
      relationships.push({
        predicate: 'mentions',
        target: `${ns}/${refType}/${refId}`,
      })
    }
  }

  return relationships.length > 0 ? relationships : undefined
}

/**
 * Check if a string looks like a type reference (PascalCase)
 */
function isTypeReference(str: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(str)
}

/**
 * Infer reverse predicate based on relationship type
 */
function inferReversePredicate(predicate: string, targetType: string): string | undefined {
  // Common patterns
  const reverseMap: Record<string, string> = {
    author: 'authored',
    authors: 'authored',
    parent: 'children',
    category: 'items',
    categories: 'items',
    tag: 'tagged',
    tags: 'tagged',
    relatedTo: 'relatedTo',
  }

  if (reverseMap[predicate]) {
    return reverseMap[predicate]
  }

  // Default: pluralize the target type
  return targetType.toLowerCase() + 's'
}

// =============================================================================
// Search Metadata Extraction
// =============================================================================

/**
 * Extract search metadata from frontmatter and content
 */
export function extractSearchMetadata(
  data: Record<string, unknown>,
  content: string
): ActionObject['search'] {
  return {
    title: (data.title as string) || extractFirstHeading(content),
    description: (data.description as string) || extractFirstParagraph(content),
    keywords: extractKeywords(data, content),
  }
}

/**
 * Extract first heading from markdown
 */
function extractFirstHeading(content: string): string | undefined {
  const match = content.match(/^#+\s+(.+)$/m)
  return match && match[1] ? match[1].trim() : undefined
}

/**
 * Extract first paragraph from markdown
 */
function extractFirstParagraph(content: string): string | undefined {
  // Skip headings and find first paragraph
  const lines = content.split('\n')
  let paragraph = ''

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      if (paragraph) break
      continue
    }
    if (trimmed.startsWith('#')) continue
    if (trimmed.startsWith('```')) break
    if (trimmed.startsWith('---')) continue

    paragraph += (paragraph ? ' ' : '') + trimmed
  }

  return paragraph ? paragraph.slice(0, 300) : undefined
}

/**
 * Extract keywords from frontmatter and content
 */
function extractKeywords(
  data: Record<string, unknown>,
  content: string
): string[] | undefined {
  const keywords: string[] = []

  // From frontmatter
  if (Array.isArray(data.keywords)) {
    keywords.push(...(data.keywords as string[]))
  }
  if (Array.isArray(data.tags)) {
    keywords.push(...(data.tags as string[]))
  }

  // Could add content analysis here
  // For now, just return frontmatter keywords
  return keywords.length > 0 ? keywords : undefined
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a file is an MDX/MD file
 */
export function isMdxFile(path: string): boolean {
  return /\.(mdx?|md)$/i.test(path)
}

/**
 * Check if a file should be included based on patterns
 */
export function shouldIncludeFile(
  path: string,
  include?: string[],
  exclude?: string[]
): boolean {
  // Check exclude patterns first
  if (exclude?.length) {
    for (const pattern of exclude) {
      if (matchGlob(path, pattern)) {
        return false
      }
    }
  }

  // If no include patterns, include all
  if (!include?.length) {
    return true
  }

  // Check include patterns
  for (const pattern of include) {
    if (matchGlob(path, pattern)) {
      return true
    }
  }

  return false
}

/**
 * Simple glob matching
 */
function matchGlob(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '{{GLOBSTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/{{GLOBSTAR}}/g, '.*')

  return new RegExp(`^${regex}$`).test(path)
}

/**
 * Map git status to operation
 */
function mapStatusToOperation(
  status: GitFileChange['status']
): ActionObject['operation'] {
  switch (status) {
    case 'added':
      return 'create'
    case 'modified':
      return 'update'
    case 'deleted':
      return 'delete'
    case 'renamed':
      return 'update'
    case 'copied':
      return 'create'
    default:
      return 'upsert'
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Simple singularize (handles common cases)
 */
function singularize(str: string): string {
  // Handle -ies -> -y (categories -> category)
  if (str.endsWith('ies')) {
    return str.slice(0, -3) + 'y'
  }
  // Handle -ches, -shes, -sses, -xes, -zes -> remove 'es'
  if (str.match(/(ch|sh|ss|x|z)es$/)) {
    return str.slice(0, -2)
  }
  // Handle regular -s plurals (posts -> post, articles -> article)
  if (str.endsWith('s') && !str.endsWith('ss')) {
    return str.slice(0, -1)
  }
  return str
}

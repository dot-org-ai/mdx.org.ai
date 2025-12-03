/**
 * @mdxdb/fs Types
 *
 * @packageDocumentation
 */

import type { DatabaseConfig } from 'mdxdb'
import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type { ExtractResult, ExtractDiff, ComponentExtractor } from '@mdxld/extract'

/**
 * Configuration for the filesystem database
 */
export interface FsDatabaseConfig extends DatabaseConfig {
  /** Root directory for MDX files */
  root: string
  /** File extensions to consider as MDX files (default: ['.mdx', '.md']) */
  extensions?: string[]
  /** Whether to create directories automatically (default: true) */
  autoCreateDirs?: boolean
  /** Encoding for reading/writing files (default: 'utf-8') */
  encoding?: BufferEncoding
}

/**
 * Options for updating a document from rendered markdown
 */
export interface ExtractUpdateOptions {
  /** Custom component extractors */
  components?: Record<string, ComponentExtractor>
  /** Throw on unmatched slots (default: false) */
  strict?: boolean
  /** Only apply changes to these paths (e.g., ['data.title', 'data.content']) */
  paths?: string[]
  /** How to merge arrays (default: 'replace') */
  arrayMerge?: 'replace' | 'append' | 'prepend'
}

/**
 * Result of updating a document from rendered markdown
 */
export interface ExtractUpdateResult<TData extends MDXLDData = MDXLDData> {
  /** The updated document */
  doc: MDXLDDocument<TData>
  /** Changes that were applied */
  changes: ExtractDiff
  /** Raw extraction result */
  extracted: ExtractResult
}

/**
 * @mdxdb/fs Types
 *
 * @packageDocumentation
 */

import type { DatabaseConfig } from 'mdxdb'

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

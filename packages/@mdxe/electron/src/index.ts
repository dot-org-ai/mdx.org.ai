/**
 * @mdxe/electron - Electron runtime for MDXLD documents
 *
 * Provides utilities for building desktop apps with MDX content
 * using full Node.js capabilities.
 *
 * @packageDocumentation
 */

import { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'

export { parse, toAst, type MDXLDDocument, type MDXLDAstNode }

/**
 * Configuration for Electron MDX runtime
 */
export interface ElectronMDXConfig {
  /**
   * Enable file system watching
   */
  watchFiles?: boolean

  /**
   * Base directory for MDX files
   */
  baseDir?: string

  /**
   * Custom components available in MDX
   */
  components?: Record<string, unknown>

  /**
   * IPC channel prefix
   */
  ipcPrefix?: string
}

/**
 * Default configuration
 */
export const defaultConfig: ElectronMDXConfig = {
  watchFiles: false,
  baseDir: process.cwd?.() ?? '.',
  components: {},
  ipcPrefix: 'mdx',
}

/**
 * Result from MDX operations
 */
export interface MDXResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Create an MDX result success response
 */
export function success<T>(data: T): MDXResult<T> {
  return { success: true, data }
}

/**
 * Create an MDX result error response
 */
export function error(message: string): MDXResult {
  return { success: false, error: message }
}

/**
 * Safe parse that returns a result object
 */
export function safeParse(content: string): MDXResult<MDXLDDocument> {
  try {
    const doc = parse(content)
    return success(doc)
  } catch (err) {
    return error(String(err))
  }
}

/**
 * Safe AST conversion that returns a result object
 */
export function safeToAst(content: string): MDXResult<MDXLDAstNode> {
  try {
    const doc = parse(content)
    const ast = toAst(doc)
    return success(ast)
  } catch (err) {
    return error(String(err))
  }
}

// Re-export main, preload, and renderer modules
export * from './main.js'
export * from './preload.js'
export * from './renderer.js'

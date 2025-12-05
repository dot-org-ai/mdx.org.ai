/**
 * MDX File Loader
 *
 * Loads and scans MDX files from directories.
 */

import { readFile } from 'fs/promises'
import { resolve, relative, basename, dirname, extname } from 'path'
import fg from 'fast-glob'
import { parseLayoutFromMDX, type LayoutInfo } from './parser'

export interface MDXFile {
  /** Absolute file path */
  path: string
  /** Relative path from base directory */
  relativePath: string
  /** File name without extension */
  name: string
  /** Directory name */
  directory: string
  /** Raw MDX content */
  content: string
  /** Parsed layout info (if applicable) */
  layout: LayoutInfo | null
}

export interface LoadOptions {
  /** Base directory for relative paths */
  cwd?: string
  /** Glob patterns to include */
  include?: string[]
  /** Glob patterns to exclude */
  exclude?: string[]
}

/**
 * Load MDX files from glob patterns
 */
export async function loadMDXFiles(patterns: string | string[], options: LoadOptions = {}): Promise<MDXFile[]> {
  const { cwd = process.cwd(), exclude = ['**/node_modules/**', '**/.git/**'] } = options

  const globPatterns = Array.isArray(patterns) ? patterns : [patterns]

  const files = await fg(globPatterns, {
    cwd,
    absolute: true,
    ignore: exclude,
    onlyFiles: true,
  })

  const mdxFiles: MDXFile[] = []

  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const layout = parseLayoutFromMDX(content, filePath)

      mdxFiles.push({
        path: filePath,
        relativePath: relative(cwd, filePath),
        name: basename(filePath, extname(filePath)),
        directory: basename(dirname(filePath)),
        content,
        layout,
      })
    } catch (error) {
      console.error(`Error loading MDX file: ${filePath}`, error)
    }
  }

  return mdxFiles
}

/**
 * Filter MDX files that have layout components
 */
export function filterWithLayouts(files: MDXFile[]): MDXFile[] {
  return files.filter((file) => file.layout !== null)
}

/**
 * Group MDX files by layout type
 */
export function groupByLayout(files: MDXFile[]): Map<string, MDXFile[]> {
  const groups = new Map<string, MDXFile[]>()

  for (const file of files) {
    if (!file.layout) continue

    const key = file.layout.type
    const existing = groups.get(key) || []
    existing.push(file)
    groups.set(key, existing)
  }

  return groups
}

/**
 * Group MDX files by category (Site, App, Dashboard)
 */
export function groupByCategory(files: MDXFile[]): Map<string, MDXFile[]> {
  const groups = new Map<string, MDXFile[]>()

  for (const file of files) {
    if (!file.layout) continue

    const key = file.layout.mapping.category
    const existing = groups.get(key) || []
    existing.push(file)
    groups.set(key, existing)
  }

  return groups
}

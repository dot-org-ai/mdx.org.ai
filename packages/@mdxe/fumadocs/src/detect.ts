/**
 * Detection logic for Docs type in MDX files
 *
 * Detects if a project should use Fumadocs by checking for $type: Docs
 * in index.mdx or README.mdx frontmatter.
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, basename, dirname } from 'node:path'
import { parse } from 'mdxld'

/**
 * Configuration extracted from docs frontmatter
 */
export interface DocsConfig {
  /** Site title */
  title?: string
  /** Site description */
  description?: string
  /** Logo path or URL */
  logo?: string
  /** GitHub repository URL */
  githubUrl?: string
  /** Navigation page order */
  pages?: string[]
  /** Base URL for the site */
  baseUrl?: string
  /** Custom domain */
  domain?: string
}

/**
 * Result of docs type detection
 */
export interface DocsDetectionResult {
  /** Whether this is a Docs type project */
  isDocsType: boolean
  /** Path to index.mdx if found */
  indexPath: string | null
  /** Path to README.mdx if found */
  readmePath: string | null
  /** Directory containing the content */
  contentDir: string
  /** Project name (from folder or config) */
  projectName: string
  /** Configuration extracted from frontmatter */
  config: DocsConfig
}

/**
 * Check if a type string indicates a Docs type
 */
function isDocsType(type: string | undefined): boolean {
  if (!type) return false

  // Exact matches
  if (type === 'Docs') return true
  if (type === 'https://mdx.org.ai/Docs') return true

  // URL pattern ending with /Docs
  if (type.endsWith('/Docs')) return true

  // Schema.org style
  if (type === 'Documentation') return true
  if (type.endsWith('/Documentation')) return true

  return false
}

/**
 * Extract docs configuration from parsed frontmatter
 */
function extractConfig(data: Record<string, unknown>): DocsConfig {
  const config: DocsConfig = {}

  // Handle both $ prefixed and non-prefixed keys
  const get = (key: string): unknown => data[`$${key}`] ?? data[key]

  if (typeof get('title') === 'string') {
    config.title = get('title') as string
  }
  if (typeof get('description') === 'string') {
    config.description = get('description') as string
  }
  if (typeof get('logo') === 'string') {
    config.logo = get('logo') as string
  }
  if (typeof get('githubUrl') === 'string') {
    config.githubUrl = get('githubUrl') as string
  }
  if (typeof get('github') === 'string') {
    config.githubUrl = get('github') as string
  }
  if (typeof get('baseUrl') === 'string') {
    config.baseUrl = get('baseUrl') as string
  }
  if (typeof get('domain') === 'string') {
    config.domain = get('domain') as string
  }
  if (Array.isArray(get('pages'))) {
    config.pages = get('pages') as string[]
  }

  return config
}

/**
 * Parse an MDX file and extract type and config
 */
function parseMdxFile(filePath: string): { type?: string; config: DocsConfig; content: string } | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')
    const parsed = parse(content)

    // Get type from parsed result (mdxld uses 'type' field)
    // Type can be string or string[] - normalize to string
    const rawType = parsed.type
    const type = Array.isArray(rawType) ? rawType[0] : rawType
    const config = extractConfig(parsed.data || {})

    // Also check for title in parsed data
    if (!config.title && parsed.data?.title) {
      config.title = parsed.data.title as string
    }

    return { type, config, content: parsed.content }
  } catch (error) {
    // If parsing fails, return null
    return null
  }
}

/**
 * Detect if a directory contains a Docs type project
 *
 * Checks for index.mdx and README.mdx files with $type: Docs
 * in their frontmatter.
 *
 * @param projectDir - Directory to check
 * @returns Detection result with config
 */
export function detectDocsType(projectDir: string): DocsDetectionResult {
  const result: DocsDetectionResult = {
    isDocsType: false,
    indexPath: null,
    readmePath: null,
    contentDir: projectDir,
    projectName: basename(projectDir),
    config: {},
  }

  // Check for index.mdx
  const indexMdxPath = join(projectDir, 'index.mdx')
  const indexMdPath = join(projectDir, 'index.md')
  const indexParsed = parseMdxFile(indexMdxPath) || parseMdxFile(indexMdPath)

  if (indexParsed) {
    result.indexPath = existsSync(indexMdxPath) ? indexMdxPath : indexMdPath

    if (isDocsType(indexParsed.type)) {
      result.isDocsType = true
      result.config = { ...result.config, ...indexParsed.config }
    }
  }

  // Check for README.mdx
  const readmeMdxPath = join(projectDir, 'README.mdx')
  const readmeMdPath = join(projectDir, 'README.md')
  const readmeParsed = parseMdxFile(readmeMdxPath) || parseMdxFile(readmeMdPath)

  if (readmeParsed) {
    result.readmePath = existsSync(readmeMdxPath) ? readmeMdxPath : readmeMdPath

    // README can also trigger docs type if index doesn't exist
    if (!result.isDocsType && isDocsType(readmeParsed.type)) {
      result.isDocsType = true
      result.config = { ...result.config, ...readmeParsed.config }
    }

    // Merge README config (index takes precedence)
    if (result.isDocsType) {
      result.config = {
        ...readmeParsed.config,
        ...result.config,
      }
    }
  }

  // Set project name from config or folder name
  if (result.config.title) {
    result.projectName = result.config.title
  }

  return result
}

/**
 * Check if detection result indicates a valid docs project
 */
export function isValidDocsProject(detection: DocsDetectionResult): boolean {
  return detection.isDocsType && (detection.indexPath !== null || detection.readmePath !== null)
}

export type { DocsDetectionResult as DetectionResult }

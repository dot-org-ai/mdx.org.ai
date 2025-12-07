/**
 * @mdxe/bun - Test extraction utilities
 *
 * Extract test blocks from MDX files for execution with Bun's test runner.
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument } from 'mdxld'
import { toAst } from '@mdxld/ast'

/**
 * Test block extracted from MDX content
 */
export interface TestBlock {
  /** Test name (from code block meta or auto-generated) */
  name: string
  /** Programming language */
  lang: string
  /** Test code */
  code: string
  /** Line number in source file */
  line: number
  /** Whether this is an async test */
  async: boolean
  /** Whether to skip this test */
  skip: boolean
  /** Whether to only run this test */
  only: boolean
  /** Additional meta flags */
  meta: Record<string, string | boolean>
}

/**
 * Parsed MDX test file
 */
export interface MDXTestFile {
  /** File path */
  path: string
  /** Parsed document */
  doc: MDXLDDocument
  /** Extracted test blocks */
  tests: TestBlock[]
}

/**
 * Options for extracting tests
 */
export interface ExtractTestsOptions {
  /** Languages to treat as executable (default: ['ts', 'typescript', 'js', 'javascript']) */
  languages?: string[]
  /** Meta flag to look for (default: 'test') */
  testFlag?: string
  /** Include code blocks with 'skip' flag */
  includeSkipped?: boolean
}

const defaultOptions: Required<ExtractTestsOptions> = {
  languages: ['ts', 'typescript', 'js', 'javascript'],
  testFlag: 'test',
  includeSkipped: true,
}

/**
 * Parse code block meta string into structured object
 *
 * @example
 * ```
 * parseMeta('test name="my test" async') // { test: true, name: 'my test', async: true }
 * ```
 */
export function parseMeta(meta: string): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}
  if (!meta) return result

  // Match key="value" or key=value or just key (boolean flag)
  const regex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
  let match

  while ((match = regex.exec(meta)) !== null) {
    const [, key, quotedDouble, quotedSingle, unquoted] = match
    if (!key) continue
    const value = quotedDouble ?? quotedSingle ?? unquoted
    result[key] = value ?? true
  }

  return result
}

/**
 * Extract test blocks from MDX content
 *
 * @param content - Raw MDX content string
 * @param options - Extraction options
 * @returns Array of test blocks
 *
 * @example
 * ```ts
 * const content = `
 * # My Component
 *
 * \`\`\`ts test name="should work"
 * expect(1 + 1).toBe(2)
 * \`\`\`
 * `
 *
 * const tests = extractTests(content)
 * // [{ name: 'should work', lang: 'ts', code: 'expect(1 + 1).toBe(2)', ... }]
 * ```
 */
export function extractTests(content: string, options: ExtractTestsOptions = {}): TestBlock[] {
  const opts = { ...defaultOptions, ...options }
  const doc = parse(content)
  const ast = toAst(doc)
  const tests: TestBlock[] = []

  let testIndex = 0

  function visitNode(node: any, lineOffset: number = 0): void {
    if (node.type === 'code') {
      // mdxld puts the entire info string (lang + meta) in the lang property
      const infoString = (node.lang as string) || ''

      // Split info string into language and meta
      // e.g., "ts test name=\"foo\"" -> lang="ts", meta="test name=\"foo\""
      const parts = infoString.split(/\s+/)
      const lang = parts[0] || ''
      const meta = parts.slice(1).join(' ')
      const parsedMeta = parseMeta(meta)

      // Check if this is a test block
      const isTest = parsedMeta[opts.testFlag] === true
      const isSkipped = parsedMeta['skip'] === true
      const isOnly = parsedMeta['only'] === true

      if (isTest || (opts.includeSkipped && isSkipped)) {
        // Only process supported languages
        if (opts.languages.includes(lang)) {
          const name =
            typeof parsedMeta['name'] === 'string'
              ? parsedMeta['name']
              : `test ${++testIndex}`

          tests.push({
            name,
            lang,
            code: node.value || '',
            line: (node.position?.start?.line || 0) + lineOffset,
            async: parsedMeta['async'] === true || containsAwait(node.value || ''),
            skip: isSkipped,
            only: isOnly,
            meta: parsedMeta,
          })
        }
      }
    }

    // Recurse into children
    if (node.children) {
      for (const child of node.children) {
        visitNode(child, lineOffset)
      }
    }
  }

  visitNode(ast)
  return tests
}

/**
 * Check if code contains await keyword
 */
function containsAwait(code: string): boolean {
  return /\bawait\s+/.test(code)
}

/**
 * Extract tests from an MDX file using Bun's file API
 *
 * @param filePath - Path to MDX file
 * @param options - Extraction options
 * @returns Parsed MDX test file with extracted tests
 */
export async function extractTestsFromFile(
  filePath: string,
  options: ExtractTestsOptions = {}
): Promise<MDXTestFile> {
  const content = await Bun.file(filePath).text()
  const doc = parse(content)
  const tests = extractTests(content, options)

  return {
    path: filePath,
    doc,
    tests,
  }
}

/**
 * Find all MDX test files in a directory using Bun's glob
 *
 * @param dir - Directory to search
 * @param options - Search options
 * @returns Array of file paths
 */
export async function findMDXTestFiles(
  dir: string,
  options: { includeInline?: boolean } = {}
): Promise<string[]> {
  const { includeInline = true } = options
  const results: string[] = []

  // Find all .mdx files
  const glob = new Bun.Glob('**/*.{md,mdx}')

  for await (const file of glob.scan({ cwd: dir, onlyFiles: true })) {
    // Skip node_modules and hidden directories
    if (file.includes('node_modules') || file.startsWith('.')) continue

    const fullPath = `${dir}/${file}`

    // Always include *.test.mdx files
    if (file.endsWith('.test.mdx') || file.endsWith('.test.md')) {
      results.push(fullPath)
      continue
    }

    // Optionally check regular .mdx files for inline tests
    if (includeInline) {
      try {
        const content = await Bun.file(fullPath).text()
        const tests = extractTests(content)
        if (tests.length > 0) {
          results.push(fullPath)
        }
      } catch {
        // Skip files that can't be read
      }
    }
  }

  return results
}

/**
 * Strip TypeScript type annotations from code for execution
 */
export function stripTypeScript(code: string): string {
  // Remove interface and type declarations
  let result = code.replace(/^\s*(interface|type)\s+\w+[^}]*\{[^}]*\}/gm, '')

  // Remove type imports
  result = result.replace(/import\s+type\s+[^;]+;?/g, '')

  // Remove type annotations from variable declarations
  result = result.replace(/(\b(?:const|let|var)\s+\w+)\s*:\s*[^=]+(?==)/g, '$1 ')

  // Remove type annotations from function parameters (common types only)
  const typePattern = '(?:string|number|boolean|any|void|null|undefined|never|object|unknown|[A-Z]\\w*)(?:\\[\\]|<[^>]+>)?'
  const paramTypeRegex = new RegExp(`(\\(\\s*\\w+)\\s*:\\s*${typePattern}(?=[,)])`, 'g')
  const paramTypeRegex2 = new RegExp(`(,\\s*\\w+)\\s*:\\s*${typePattern}(?=[,)])`, 'g')
  result = result.replace(paramTypeRegex, '$1')
  result = result.replace(paramTypeRegex2, '$1')

  // Remove return type annotations
  result = result.replace(/\)\s*:\s*[a-zA-Z][^{=>]*(?=\s*\{)/g, ') ')
  result = result.replace(/\)\s*:\s*[a-zA-Z][^{=>]*(?=\s*=>)/g, ') ')

  // Remove generic type parameters
  result = result.replace(/(\w+)<[^>]+>/g, '$1')

  // Remove `as Type` assertions
  result = result.replace(/\s+as\s+(?:const|[A-Z])[<>[\]\w\s|&]*(?=[;,)\]\s]|$)/g, '')

  // Remove type-only exports
  result = result.replace(/export\s+type\s+\{[^}]*\};?/g, '')

  return result
}

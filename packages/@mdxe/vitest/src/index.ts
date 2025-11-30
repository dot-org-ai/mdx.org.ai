/**
 * @mdxe/vitest - Vitest integration for testing MDX documents
 *
 * Provides utilities and a custom loader for executing tests defined in MDX files:
 * - Code blocks with `test` annotation: ```ts test
 * - Companion test files: blog.mdx + blog.test.mdx
 *
 * @packageDocumentation
 */

import { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'
import * as fs from 'fs'
import * as path from 'path'

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
  /** Whether this is a companion test file (*.test.mdx) */
  isCompanionTest: boolean
  /** Path to the source MDX file (for companion tests) */
  sourcePath?: string
}

/**
 * Options for extracting tests
 */
export interface ExtractTestsOptions {
  /** Languages to treat as executable (default: ['ts', 'typescript', 'js', 'javascript']) */
  languages?: string[]
  /** Meta flag to look for (default: 'test') */
  testFlag?: string
  /** Include code blocks with 'skip' flag as skipped tests */
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

  function visitNode(node: MDXLDAstNode, lineOffset: number = 0): void {
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

      if (isTest || (opts.includeSkipped && isSkipped)) {
        // Only process supported languages
        if (opts.languages.includes(lang)) {
          const name =
            typeof parsedMeta['name'] === 'string'
              ? parsedMeta['name']
              : `test ${++testIndex}`

          tests.push({
            name: isSkipped ? `[SKIP] ${name}` : name,
            lang,
            code: node.value || '',
            line: (node.position?.start?.line || 0) + lineOffset,
            async: parsedMeta['async'] === true,
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
 * Extract tests from an MDX file
 *
 * @param filePath - Path to MDX file
 * @param options - Extraction options
 * @returns Parsed MDX test file with extracted tests
 */
export function extractTestsFromFile(
  filePath: string,
  options: ExtractTestsOptions = {}
): MDXTestFile {
  const content = fs.readFileSync(filePath, 'utf-8')
  const doc = parse(content)
  const tests = extractTests(content, options)

  const isCompanionTest = filePath.endsWith('.test.mdx')
  let sourcePath: string | undefined

  if (isCompanionTest) {
    // Look for corresponding source file
    const basePath = filePath.replace(/\.test\.mdx$/, '.mdx')
    if (fs.existsSync(basePath)) {
      sourcePath = basePath
    }
  }

  return {
    path: filePath,
    doc,
    tests,
    isCompanionTest,
    sourcePath,
  }
}

/**
 * Find all MDX test files in a directory
 *
 * @param dir - Directory to search
 * @param options - Search options
 * @returns Array of file paths
 */
export function findMDXTestFiles(
  dir: string,
  options: { recursive?: boolean; includeInline?: boolean } = {}
): string[] {
  const { recursive = true, includeInline = true } = options
  const results: string[] = []

  function search(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory() && recursive) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          search(fullPath)
        }
      } else if (entry.isFile()) {
        // Always include *.test.mdx files
        if (entry.name.endsWith('.test.mdx')) {
          results.push(fullPath)
        }
        // Optionally check regular .mdx files for inline tests
        else if (includeInline && entry.name.endsWith('.mdx')) {
          try {
            const content = fs.readFileSync(fullPath, 'utf-8')
            const tests = extractTests(content)
            if (tests.length > 0) {
              results.push(fullPath)
            }
          } catch {
            // Skip files that can't be read
          }
        }
      }
    }
  }

  search(dir)
  return results
}

/**
 * Generate vitest test code from extracted test blocks
 *
 * @param testFile - Parsed MDX test file
 * @returns Generated test code string
 */
export function generateTestCode(testFile: MDXTestFile): string {
  const lines: string[] = []
  const fileName = path.basename(testFile.path)

  lines.push(`// Generated from: ${fileName}`)
  lines.push(`import { describe, it, expect, vi } from 'vitest'`)
  lines.push('')

  if (testFile.sourcePath) {
    lines.push(`// Testing: ${path.basename(testFile.sourcePath)}`)
  }

  lines.push(`describe('${fileName}', () => {`)

  for (const test of testFile.tests) {
    const isSkipped = test.meta['skip'] === true
    const itFn = isSkipped ? 'it.skip' : 'it'
    const asyncKeyword = test.async ? 'async ' : ''

    lines.push(`  ${itFn}('${test.name.replace(/'/g, "\\'")}', ${asyncKeyword}() => {`)
    // Indent the test code
    const indentedCode = test.code
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n')
    lines.push(indentedCode)
    lines.push('  })')
    lines.push('')
  }

  lines.push('})')

  return lines.join('\n')
}

/**
 * Create a vitest custom loader/transformer for MDX test files
 *
 * This can be used in vitest.config.ts to handle .test.mdx files
 */
export function createMDXTestTransformer() {
  return {
    name: 'mdx-test-transformer',
    transform(code: string, id: string) {
      if (!id.endsWith('.mdx')) return null

      const tests = extractTests(code)
      if (tests.length === 0 && !id.endsWith('.test.mdx')) {
        return null
      }

      const testFile: MDXTestFile = {
        path: id,
        doc: parse(code),
        tests,
        isCompanionTest: id.endsWith('.test.mdx'),
        sourcePath: id.endsWith('.test.mdx')
          ? id.replace(/\.test\.mdx$/, '.mdx')
          : undefined,
      }

      const generatedCode = generateTestCode(testFile)

      return {
        code: generatedCode,
        map: null,
      }
    },
  }
}

/**
 * Vitest plugin for MDX test files
 *
 * @example
 * ```ts
 * // vitest.config.ts
 * import { defineConfig } from 'vitest/config'
 * import { mdxTestPlugin } from '@mdxe/vitest'
 *
 * export default defineConfig({
 *   plugins: [mdxTestPlugin()],
 *   test: {
 *     include: ['**\/*.test.mdx', '**\/*.mdx'],
 *   },
 * })
 * ```
 */
export function mdxTestPlugin(options: ExtractTestsOptions = {}) {
  return {
    name: 'vitest-mdx-test',
    enforce: 'pre' as const,
    transform(code: string, id: string) {
      // Only process MDX files
      if (!id.endsWith('.mdx')) return null

      // For *.test.mdx files, always transform
      // For regular *.mdx files, only transform if they have test blocks
      const isTestFile = id.endsWith('.test.mdx')
      const tests = extractTests(code, options)

      if (!isTestFile && tests.length === 0) {
        return null
      }

      const testFile: MDXTestFile = {
        path: id,
        doc: parse(code),
        tests,
        isCompanionTest: isTestFile,
        sourcePath: isTestFile ? id.replace(/\.test\.mdx$/, '.mdx') : undefined,
      }

      const generatedCode = generateTestCode(testFile)

      return {
        code: generatedCode,
        map: null,
      }
    },
  }
}

/**
 * Strip TypeScript type annotations from code for execution
 * This is a simple transform that handles common cases:
 * - Type annotations: `const x: number`
 * - Function parameter types: `(a: number, b: string)`
 * - Return types: `function foo(): number`
 * - Generic type parameters: `Array<number>`
 * - Type assertions: `as Type`
 * - Interface/type declarations
 */
function stripTypeScript(code: string): string {
  // Remove interface and type declarations (entire lines)
  let result = code.replace(/^\s*(interface|type)\s+\w+[^}]*\{[^}]*\}/gm, '')

  // Remove type imports
  result = result.replace(/import\s+type\s+[^;]+;?/g, '')
  result = result.replace(/import\s*\{[^}]*type\s+[^}]*\}\s*from\s*['"][^'"]+['"];?/g, (match) => {
    // Only remove type imports, keep value imports
    return match.replace(/,?\s*type\s+\w+\s*(,|(?=\}))/g, '')
  })

  // Remove type annotations from variable declarations
  // `const x: Type = ` -> `const x = `
  result = result.replace(/(\b(?:const|let|var)\s+\w+)\s*:\s*[^=]+(?==)/g, '$1 ')

  // Remove type annotations from function parameters
  // Only match when followed by known TypeScript type patterns:
  // - Primitive types: string, number, boolean, any, void, null, undefined, never, object, unknown
  // - Array types: type[] or Array<type>
  // - Generic uppercase types: Type, MyType, etc.
  // This avoids matching object literal properties like {limit: perPage}
  const typePattern = '(?:string|number|boolean|any|void|null|undefined|never|object|unknown|[A-Z]\\w*)(?:\\[\\]|<[^>]+>)?'
  const paramTypeRegex = new RegExp(`(\\(\\s*\\w+)\\s*:\\s*${typePattern}(?=[,)])`, 'g')
  const paramTypeRegex2 = new RegExp(`(,\\s*\\w+)\\s*:\\s*${typePattern}(?=[,)])`, 'g')
  result = result.replace(paramTypeRegex, '$1')
  result = result.replace(paramTypeRegex2, '$1')

  // Remove return type annotations (but not ternary operators)
  // `function foo(): Type {` -> `function foo() {`
  // Only match when followed by { or =>
  // Match both uppercase (custom types) and lowercase (string, number, boolean, etc.)
  result = result.replace(/\)\s*:\s*[a-zA-Z][^{=>]*(?=\s*\{)/g, ') ')
  result = result.replace(/\)\s*:\s*[a-zA-Z][^{=>]*(?=\s*=>)/g, ') ')

  // Remove generic type parameters in declarations
  // `Array<number>` -> `Array`
  result = result.replace(/(\w+)<[^>]+>/g, '$1')

  // Remove `as Type` assertions (but be careful with 'as' in strings)
  result = result.replace(/\s+as\s+(?:const|[A-Z])[<>[\]\w\s|&]*(?=[;,)\]\s]|$)/g, '')

  // Remove type-only exports
  result = result.replace(/export\s+type\s+\{[^}]*\};?/g, '')

  return result
}

/**
 * Run tests from an MDX file programmatically
 *
 * @param filePath - Path to MDX file
 * @param options - Test options
 */
export async function runMDXTests(
  filePath: string,
  options: ExtractTestsOptions & { verbose?: boolean } = {}
): Promise<{ passed: number; failed: number; skipped: number }> {
  const { verbose = false, ...extractOpts } = options
  const testFile = extractTestsFromFile(filePath, extractOpts)
  const results = { passed: 0, failed: 0, skipped: 0 }

  for (const test of testFile.tests) {
    if (test.meta['skip']) {
      results.skipped++
      if (verbose) console.log(`⏭️  SKIP: ${test.name}`)
      continue
    }

    try {
      // Strip TypeScript types for execution
      const jsCode = stripTypeScript(test.code)

      // Create a function from the test code
      const testFn = test.async
        ? new Function('expect', `return (async () => { ${jsCode} })()`)
        : new Function('expect', jsCode)

      // Simple expect implementation for standalone execution
      const expect = createSimpleExpect()

      await testFn(expect)
      results.passed++
      if (verbose) console.log(`✅ PASS: ${test.name}`)
    } catch (error) {
      results.failed++
      if (verbose) {
        console.log(`❌ FAIL: ${test.name}`)
        console.log(`   ${(error as Error).message}`)
      }
    }
  }

  return results
}

/**
 * Create a simple expect function for standalone test execution
 */
function createSimpleExpect() {
  return function expect(actual: unknown) {
    return {
      toBe(expected: unknown) {
        if (actual !== expected) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`)
        }
      },
      toEqual(expected: unknown) {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
        }
      },
      toBeTruthy() {
        if (!actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be truthy`)
        }
      },
      toBeFalsy() {
        if (actual) {
          throw new Error(`Expected ${JSON.stringify(actual)} to be falsy`)
        }
      },
      toContain(expected: unknown) {
        if (typeof actual === 'string' && typeof expected === 'string') {
          if (!actual.includes(expected)) {
            throw new Error(`Expected "${actual}" to contain "${expected}"`)
          }
        } else if (Array.isArray(actual)) {
          if (!actual.includes(expected)) {
            throw new Error(`Expected array to contain ${JSON.stringify(expected)}`)
          }
        }
      },
      toBeDefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to be defined`)
        }
      },
      toBeUndefined() {
        if (actual !== undefined) {
          throw new Error(`Expected value to be undefined`)
        }
      },
      toBeNull() {
        if (actual !== null) {
          throw new Error(`Expected value to be null`)
        }
      },
      toBeGreaterThan(expected: number) {
        if (typeof actual !== 'number' || actual <= expected) {
          throw new Error(`Expected ${actual} to be greater than ${expected}`)
        }
      },
      toBeLessThan(expected: number) {
        if (typeof actual !== 'number' || actual >= expected) {
          throw new Error(`Expected ${actual} to be less than ${expected}`)
        }
      },
      toThrow(message?: string | RegExp) {
        if (typeof actual !== 'function') {
          throw new Error(`Expected a function`)
        }
        try {
          (actual as () => void)()
          throw new Error(`Expected function to throw`)
        } catch (e) {
          if (message) {
            const errorMessage = (e as Error).message
            if (typeof message === 'string' && !errorMessage.includes(message)) {
              throw new Error(`Expected error message to contain "${message}"`)
            }
            if (message instanceof RegExp && !message.test(errorMessage)) {
              throw new Error(`Expected error message to match ${message}`)
            }
          }
        }
      },
      not: {
        toBe(expected: unknown) {
          if (actual === expected) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to be ${JSON.stringify(expected)}`)
          }
        },
        toEqual(expected: unknown) {
          if (JSON.stringify(actual) === JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`)
          }
        },
        toContain(expected: unknown) {
          if (typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)) {
            throw new Error(`Expected "${actual}" not to contain "${expected}"`)
          }
          if (Array.isArray(actual) && actual.includes(expected)) {
            throw new Error(`Expected array not to contain ${JSON.stringify(expected)}`)
          }
        },
      },
    }
  }
}

// Re-export from mdxld for convenience
export { parse, toAst, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'

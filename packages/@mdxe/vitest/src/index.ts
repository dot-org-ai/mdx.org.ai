/**
 * @mdxe/vitest - Vitest integration for testing MDX documents
 *
 * Provides utilities and a custom loader for executing tests defined in MDX files:
 * - Code blocks with `test` annotation: ```ts test
 * - Companion test files: blog.mdx + blog.test.mdx
 *
 * @packageDocumentation
 */

import { parse, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'
import { toAst } from '@mdxld/ast'
import * as fs from 'fs'
import * as path from 'path'

// Lazy import for @mdxld/compile to avoid circular dependencies
let transformTestCode: ((code: string) => Promise<string>) | null = null

async function getTransformTestCode(): Promise<(code: string) => Promise<string>> {
  if (!transformTestCode) {
    try {
      const compile = await import('@mdxld/compile')
      transformTestCode = compile.transformTestCode
    } catch {
      // Fallback: return code as-is if @mdxld/compile not available
      transformTestCode = async (code: string) => code
    }
  }
  return transformTestCode as (code: string) => Promise<string>
}

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

  // Cast AST to MDXLDAstNode (types have minor differences in position.offset optionality)
  visitNode(ast as unknown as MDXLDAstNode)
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
 * Check if code contains JSX syntax
 */
function containsJSX(code: string): boolean {
  // Look for JSX patterns:
  // - Opening tags: <Component or <div
  // - Self-closing tags: <Component /> or <br />
  // - Fragment syntax: <> or </>
  // Exclude comparison operators and arrow functions by checking context

  // Match JSX opening tags: <TagName or <tag-name
  const jsxPattern = /<[A-Z][a-zA-Z0-9]*[\s/>]|<[a-z][a-z0-9-]*[\s/>]|<>|<\/>/

  // Also check for JSX in return statements or parentheses
  const jsxReturnPattern = /return\s*\(\s*<|return\s+<[A-Za-z]/

  return jsxPattern.test(code) || jsxReturnPattern.test(code)
}

/**
 * Check if code needs sandbox features (app, Hono, JSX rendering)
 */
function needsSandbox(code: string): boolean {
  // Check for features that require the sandbox
  return (
    // Hono app usage
    /\bapp\.(?:get|post|put|delete|patch|request|use|on|route)\s*\(/.test(code) ||
    // JSX syntax
    containsJSX(code) ||
    // useState/useEffect hooks
    /\buseState\s*\(/.test(code) ||
    /\buseEffect\s*\(/.test(code) ||
    // render functions
    /\bc\.html\s*\(/.test(code) ||
    /\bc\.stream\s*\(/.test(code) ||
    // 'use client' directive
    /['"]use client['"]/.test(code)
  )
}

/**
 * Detect imports needed based on code content
 */
function detectImports(code: string): {
  mdxld: string[]
  mdxui: string[]
  mdxuiMarkdown: string[]
  mdxeVitest: string[]
  needsDb: boolean
  needsAi: boolean
  needsCreateElement: boolean
  needsSandbox: boolean
} {
  const mdxld: string[] = []
  const mdxui: string[] = []
  const mdxuiMarkdown: string[] = []
  const mdxeVitest: string[] = []

  // mdxld imports
  if (/\bparse\s*\(/.test(code)) mdxld.push('parse')
  if (/\bstringify\s*\(/.test(code)) mdxld.push('stringify')
  if (/\btoAst\s*\(/.test(code)) mdxld.push('toAst')

  // mdxui imports
  if (/\bcreateComponents\s*\(/.test(code)) mdxui.push('createComponents')
  if (/\bgetComponentMeta\s*\(/.test(code)) mdxui.push('getComponentMeta')
  if (/\bgetComponentNames\s*\(/.test(code)) mdxui.push('getComponentNames')
  if (/\bgetComponentsByCategory\s*\(/.test(code)) mdxui.push('getComponentsByCategory')

  // @mdxui/markdown imports
  if (/\brenderMarkdown\s*\(/.test(code)) mdxuiMarkdown.push('renderMarkdown')

  // @mdxe/vitest imports
  if (/\bextractTests\s*\(/.test(code)) mdxeVitest.push('extractTests')
  if (/\bparseMeta\s*\(/.test(code)) mdxeVitest.push('parseMeta')

  // Check for db and ai globals
  const needsDbFlag = /\bdb\./.test(code)
  const needsAiFlag = /\bai\./.test(code)

  // Check if createElement is needed (for component rendering)
  const needsCreateElementFlag = /\bcreateElement\b/.test(code) || mdxui.includes('createComponents')

  // Check if sandbox is needed
  const needsSandboxFlag = needsSandbox(code)

  return {
    mdxld,
    mdxui,
    mdxuiMarkdown,
    mdxeVitest,
    needsDb: needsDbFlag,
    needsAi: needsAiFlag,
    needsCreateElement: needsCreateElementFlag,
    needsSandbox: needsSandboxFlag
  }
}

/**
 * Check if code contains await (needs async wrapper)
 */
function containsAwait(code: string): boolean {
  return /\bawait\s+/.test(code)
}

/**
 * Escape string for use in JavaScript template literal
 */
function escapeForTemplate(code: string): string {
  return code
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${')
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

  // Check each test for sandbox requirements
  const testsWithMeta = testFile.tests.map((test) => ({
    ...test,
    needsSandbox: needsSandbox(test.code),
  }))

  // Check if any tests need sandbox
  const anySandboxTests = testsWithMeta.some((t) => t.needsSandbox)

  // Collect all non-sandbox code to detect imports
  const nonSandboxCode = testsWithMeta
    .filter((t) => !t.needsSandbox)
    .map((t) => t.code)
    .join('\n')
  const imports = detectImports(nonSandboxCode)

  lines.push(`// Generated from: ${fileName}`)
  lines.push(`import { describe, it, expect, vi } from 'vitest'`)
  lines.push(`import { should, assert } from '@mdxe/vitest'`)

  // Add sandbox import if needed
  if (anySandboxTests) {
    lines.push(`import { evaluate } from 'ai-sandbox'`)
  }

  // Add detected imports
  if (imports.mdxld.length > 0) {
    lines.push(`import { ${imports.mdxld.join(', ')} } from 'mdxld'`)
  }
  if (imports.mdxui.length > 0) {
    lines.push(`import { ${imports.mdxui.join(', ')} } from 'mdxui'`)
  }
  if (imports.mdxuiMarkdown.length > 0) {
    lines.push(`import { ${imports.mdxuiMarkdown.join(', ')} } from '@mdxui/markdown'`)
  }
  if (imports.mdxeVitest.length > 0) {
    lines.push(`import { ${imports.mdxeVitest.join(', ')} } from '@mdxe/vitest'`)
  }
  if (imports.needsCreateElement) {
    lines.push(``)
    lines.push(`// Simple createElement for testing components`)
    lines.push(`function createElement(type, props, ...children) {`)
    lines.push(`  return { type, props: { ...props, children: children.length === 1 ? children[0] : children } }`)
    lines.push(`}`)
  }
  lines.push('')

  if (testFile.sourcePath) {
    lines.push(`// Testing: ${path.basename(testFile.sourcePath)}`)
  }

  lines.push(`describe('${fileName}', () => {`)

  for (const test of testsWithMeta) {
    const isSkipped = test.meta['skip'] === true
    const itFn = isSkipped ? 'it.skip' : 'it'

    if (test.needsSandbox) {
      // Wrap sandbox-needing tests in evaluate call
      const escapedCode = escapeForTemplate(test.code)
      lines.push(`  ${itFn}('${test.name.replace(/'/g, "\\'")}', async () => {`)
      lines.push(`    const result = await evaluate({`)
      lines.push(`      tests: \`${escapedCode}\`,`)
      lines.push(`    })`)
      lines.push(`    if (!result.success) {`)
      lines.push(`      throw new Error(result.error || 'Test failed in sandbox')`)
      lines.push(`    }`)
      lines.push(`  })`)
    } else {
      // Run non-sandbox tests directly
      const needsAsync = test.async || containsAwait(test.code)
      const asyncKeyword = needsAsync ? 'async ' : ''

      lines.push(`  ${itFn}('${test.name.replace(/'/g, "\\'")}', ${asyncKeyword}() => {`)
      // Don't indent the test code to preserve template literal content (e.g., YAML)
      lines.push(test.code)
      lines.push('  })')
    }
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
      // For regular *.mdx files, always transform to prevent parse errors
      const isTestFile = id.endsWith('.test.mdx')
      const tests = extractTests(code, options)

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
export { parse, type MDXLDDocument, type MDXLDAstNode } from 'mdxld'
export { toAst } from '@mdxld/ast'

// =============================================================================
// Should-based assertion syntax (Chai-style)
// =============================================================================

/**
 * Should assertion interface
 *
 * Provides Chai-style "should" assertions for more readable tests.
 *
 * @example
 * ```ts
 * foo.should.be.a('string')
 * foo.should.equal('bar')
 * foo.should.have.lengthOf(3)
 * tea.should.have.property('flavors').with.lengthOf(3)
 * ```
 */
export interface ShouldAssertion {
  // Type checks
  a: (type: string) => ShouldAssertion
  an: (type: string) => ShouldAssertion

  // Equality
  equal: (expected: unknown) => ShouldAssertion
  equals: (expected: unknown) => ShouldAssertion
  eq: (expected: unknown) => ShouldAssertion
  eql: (expected: unknown) => ShouldAssertion
  deep: { equal: (expected: unknown) => ShouldAssertion }

  // Truthiness
  true: ShouldAssertion
  false: ShouldAssertion
  ok: ShouldAssertion
  exist: ShouldAssertion
  null: ShouldAssertion
  undefined: ShouldAssertion
  NaN: ShouldAssertion

  // Length
  lengthOf: (length: number) => ShouldAssertion
  length: (length: number) => ShouldAssertion

  // Properties
  property: (name: string, value?: unknown) => ShouldAssertion
  ownProperty: (name: string) => ShouldAssertion
  keys: (...keys: string[]) => ShouldAssertion
  have: ShouldAssertion
  has: ShouldAssertion

  // Inclusion
  include: (value: unknown) => ShouldAssertion
  includes: (value: unknown) => ShouldAssertion
  contain: (value: unknown) => ShouldAssertion
  contains: (value: unknown) => ShouldAssertion

  // Comparison
  above: (value: number) => ShouldAssertion
  below: (value: number) => ShouldAssertion
  least: (value: number) => ShouldAssertion
  most: (value: number) => ShouldAssertion
  within: (start: number, end: number) => ShouldAssertion
  greaterThan: (value: number) => ShouldAssertion
  lessThan: (value: number) => ShouldAssertion
  at: { least: (value: number) => ShouldAssertion; most: (value: number) => ShouldAssertion }

  // String matching
  match: (regex: RegExp) => ShouldAssertion
  string: (str: string) => ShouldAssertion

  // Type checks
  instanceof: (constructor: Function) => ShouldAssertion

  // Error checking
  throw: (errorType?: Function | string | RegExp, message?: string | RegExp) => ShouldAssertion

  // Negation
  not: ShouldAssertion

  // Chaining
  be: ShouldAssertion
  been: ShouldAssertion
  is: ShouldAssertion
  that: ShouldAssertion
  which: ShouldAssertion
  and: ShouldAssertion
  with: ShouldAssertion
  to: ShouldAssertion
  of: ShouldAssertion

  // Empty check
  empty: ShouldAssertion

  // Frozen/Sealed
  frozen: ShouldAssertion
  sealed: ShouldAssertion
}

/**
 * Create a should assertion wrapper for a value
 */
function createShouldAssertion(actual: unknown, negated: boolean = false): ShouldAssertion {
  const fail = (message: string) => {
    throw new Error(negated ? `Expected NOT: ${message}` : message)
  }

  const check = (condition: boolean, message: string) => {
    const passes = negated ? !condition : condition
    if (!passes) fail(message)
  }

  const chainable = (): ShouldAssertion => createShouldAssertion(actual, negated)

  const assertion: ShouldAssertion = {
    // Type checks
    a(type: string) {
      const actualType = actual === null ? 'null' :
        Array.isArray(actual) ? 'array' : typeof actual
      check(actualType === type.toLowerCase(), `Expected ${JSON.stringify(actual)} to be a ${type}`)
      return chainable()
    },
    an(type: string) { return this.a(type) },

    // Equality
    equal(expected: unknown) {
      check(actual === expected, `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
      return chainable()
    },
    equals(expected: unknown) { return this.equal(expected) },
    eq(expected: unknown) { return this.equal(expected) },
    eql(expected: unknown) {
      check(JSON.stringify(actual) === JSON.stringify(expected),
        `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`)
      return chainable()
    },
    deep: {
      equal(expected: unknown) {
        check(JSON.stringify(actual) === JSON.stringify(expected),
          `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`)
        return chainable()
      }
    },

    // Truthiness (getters)
    get true() {
      check(actual === true, `Expected ${JSON.stringify(actual)} to be true`)
      return chainable()
    },
    get false() {
      check(actual === false, `Expected ${JSON.stringify(actual)} to be false`)
      return chainable()
    },
    get ok() {
      check(!!actual, `Expected ${JSON.stringify(actual)} to be truthy`)
      return chainable()
    },
    get exist() {
      check(actual !== null && actual !== undefined, `Expected value to exist`)
      return chainable()
    },
    get null() {
      check(actual === null, `Expected ${JSON.stringify(actual)} to be null`)
      return chainable()
    },
    get undefined() {
      check(actual === undefined, `Expected ${JSON.stringify(actual)} to be undefined`)
      return chainable()
    },
    get NaN() {
      check(Number.isNaN(actual as number), `Expected ${JSON.stringify(actual)} to be NaN`)
      return chainable()
    },

    // Length
    lengthOf(length: number) {
      const actualLength = (actual as { length?: number })?.length
      check(actualLength === length,
        `Expected ${JSON.stringify(actual)} to have length ${length}, got ${actualLength}`)
      return chainable()
    },
    length(length: number) { return this.lengthOf(length) },

    // Properties
    property(name: string, value?: unknown) {
      const hasProperty = actual !== null && actual !== undefined &&
        Object.prototype.hasOwnProperty.call(actual, name)
      if (value !== undefined) {
        check(hasProperty && (actual as Record<string, unknown>)[name] === value,
          `Expected ${JSON.stringify(actual)} to have property '${name}' equal to ${JSON.stringify(value)}`)
      } else {
        check(hasProperty, `Expected ${JSON.stringify(actual)} to have property '${name}'`)
      }
      // Return assertion for the property value for chaining
      if (hasProperty) {
        return createShouldAssertion((actual as Record<string, unknown>)[name], negated)
      }
      return chainable()
    },
    ownProperty(name: string) { return this.property(name) },
    keys(...keys: string[]) {
      const actualKeys = Object.keys(actual as object || {})
      const hasAll = keys.every(k => actualKeys.includes(k))
      check(hasAll, `Expected ${JSON.stringify(actual)} to have keys ${JSON.stringify(keys)}`)
      return chainable()
    },
    get have() { return chainable() },
    get has() { return chainable() },

    // Inclusion
    include(value: unknown) {
      if (typeof actual === 'string') {
        check(actual.includes(String(value)), `Expected "${actual}" to include "${value}"`)
      } else if (Array.isArray(actual)) {
        check(actual.includes(value), `Expected array to include ${JSON.stringify(value)}`)
      } else if (actual && typeof actual === 'object') {
        if (typeof value === 'object' && value !== null) {
          const hasAll = Object.entries(value).every(([k, v]) =>
            (actual as Record<string, unknown>)[k] === v)
          check(hasAll, `Expected ${JSON.stringify(actual)} to include ${JSON.stringify(value)}`)
        }
      }
      return chainable()
    },
    includes(value: unknown) { return this.include(value) },
    contain(value: unknown) { return this.include(value) },
    contains(value: unknown) { return this.include(value) },

    // Comparison
    above(value: number) {
      check((actual as number) > value, `Expected ${actual} to be above ${value}`)
      return chainable()
    },
    below(value: number) {
      check((actual as number) < value, `Expected ${actual} to be below ${value}`)
      return chainable()
    },
    least(value: number) {
      check((actual as number) >= value, `Expected ${actual} to be at least ${value}`)
      return chainable()
    },
    most(value: number) {
      check((actual as number) <= value, `Expected ${actual} to be at most ${value}`)
      return chainable()
    },
    within(start: number, end: number) {
      const n = actual as number
      check(n >= start && n <= end, `Expected ${actual} to be within ${start}..${end}`)
      return chainable()
    },
    greaterThan(value: number) { return this.above(value) },
    lessThan(value: number) { return this.below(value) },
    at: {
      least(value: number) {
        check((actual as number) >= value, `Expected ${actual} to be at least ${value}`)
        return chainable()
      },
      most(value: number) {
        check((actual as number) <= value, `Expected ${actual} to be at most ${value}`)
        return chainable()
      }
    },

    // String matching
    match(regex: RegExp) {
      check(regex.test(String(actual)), `Expected "${actual}" to match ${regex}`)
      return chainable()
    },
    string(str: string) {
      check(String(actual).includes(str), `Expected "${actual}" to contain string "${str}"`)
      return chainable()
    },

    // Type checks
    instanceof(constructor: Function) {
      check(actual instanceof constructor,
        `Expected ${JSON.stringify(actual)} to be instanceof ${constructor.name}`)
      return chainable()
    },

    // Error checking
    throw(errorType?: Function | string | RegExp, message?: string | RegExp) {
      if (typeof actual !== 'function') {
        fail('Expected a function')
        return chainable()
      }
      try {
        (actual as () => void)()
        if (!negated) fail('Expected function to throw')
      } catch (e) {
        if (negated) {
          fail(`Expected function not to throw, but threw: ${(e as Error).message}`)
        }
        if (errorType) {
          if (typeof errorType === 'function') {
            check(e instanceof errorType, `Expected to throw ${errorType.name}`)
          } else if (typeof errorType === 'string') {
            check((e as Error).message.includes(errorType),
              `Expected error message to contain "${errorType}"`)
          } else if (errorType instanceof RegExp) {
            check(errorType.test((e as Error).message),
              `Expected error message to match ${errorType}`)
          }
        }
        if (message) {
          if (typeof message === 'string') {
            check((e as Error).message.includes(message),
              `Expected error message to contain "${message}"`)
          } else {
            check(message.test((e as Error).message),
              `Expected error message to match ${message}`)
          }
        }
      }
      return chainable()
    },

    // Negation
    get not() { return createShouldAssertion(actual, !negated) },

    // Chaining (no-ops for readability)
    get be() { return chainable() },
    get been() { return chainable() },
    get is() { return chainable() },
    get that() { return chainable() },
    get which() { return chainable() },
    get and() { return chainable() },
    get with() { return chainable() },
    get to() { return chainable() },
    get of() { return chainable() },

    // Empty check
    get empty() {
      const isEmpty = actual === '' ||
        (Array.isArray(actual) && actual.length === 0) ||
        !!(actual && typeof actual === 'object' && Object.keys(actual as object).length === 0)
      check(isEmpty, `Expected ${JSON.stringify(actual)} to be empty`)
      return chainable()
    },

    // Frozen/Sealed
    get frozen() {
      check(Object.isFrozen(actual as object), `Expected ${JSON.stringify(actual)} to be frozen`)
      return chainable()
    },
    get sealed() {
      check(Object.isSealed(actual as object), `Expected ${JSON.stringify(actual)} to be sealed`)
      return chainable()
    },
  }

  return assertion
}

/**
 * Convert a value to have a .should property
 *
 * @example
 * ```ts
 * const value = should('hello')
 * value.should.be.a('string')
 * value.should.equal('hello')
 * value.should.have.lengthOf(5)
 * ```
 */
export function should<T>(value: T): T & { should: ShouldAssertion } {
  const wrapped = value as T & { should: ShouldAssertion }
  Object.defineProperty(wrapped, 'should', {
    get: () => createShouldAssertion(value),
    configurable: true,
    enumerable: false,
  })
  return wrapped
}

/**
 * Assert function (throws on failure)
 *
 * @example
 * ```ts
 * assert(value === 'foo', 'value should be foo')
 * assert.equal(actual, expected)
 * assert.strictEqual(actual, expected)
 * assert.deepEqual(actual, expected)
 * ```
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed')
  }
}

// Add static methods to assert
assert.ok = (value: unknown, message?: string) => assert(value, message ?? 'Expected value to be truthy')
assert.equal = (actual: unknown, expected: unknown, message?: string) => {
  assert(actual == expected, message ?? `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`)
}
assert.strictEqual = (actual: unknown, expected: unknown, message?: string) => {
  assert(actual === expected, message ?? `Expected ${JSON.stringify(actual)} to strictly equal ${JSON.stringify(expected)}`)
}
assert.notEqual = (actual: unknown, expected: unknown, message?: string) => {
  assert(actual != expected, message ?? `Expected ${JSON.stringify(actual)} to not equal ${JSON.stringify(expected)}`)
}
assert.notStrictEqual = (actual: unknown, expected: unknown, message?: string) => {
  assert(actual !== expected, message ?? `Expected ${JSON.stringify(actual)} to not strictly equal ${JSON.stringify(expected)}`)
}
assert.deepEqual = (actual: unknown, expected: unknown, message?: string) => {
  assert(JSON.stringify(actual) === JSON.stringify(expected),
    message ?? `Expected ${JSON.stringify(actual)} to deeply equal ${JSON.stringify(expected)}`)
}
assert.notDeepEqual = (actual: unknown, expected: unknown, message?: string) => {
  assert(JSON.stringify(actual) !== JSON.stringify(expected),
    message ?? `Expected ${JSON.stringify(actual)} to not deeply equal ${JSON.stringify(expected)}`)
}
assert.throws = (fn: () => void, message?: string) => {
  try {
    fn()
    throw new Error(message ?? 'Expected function to throw')
  } catch (e) {
    if ((e as Error).message === (message ?? 'Expected function to throw')) {
      throw e
    }
  }
}
assert.doesNotThrow = (fn: () => void, message?: string) => {
  try {
    fn()
  } catch (e) {
    throw new Error(message ?? `Expected function not to throw, but threw: ${(e as Error).message}`)
  }
}
assert.isTrue = (value: unknown, message?: string) => assert(value === true, message ?? 'Expected true')
assert.isFalse = (value: unknown, message?: string) => assert(value === false, message ?? 'Expected false')
assert.isNull = (value: unknown, message?: string) => assert(value === null, message ?? 'Expected null')
assert.isNotNull = (value: unknown, message?: string) => assert(value !== null, message ?? 'Expected not null')
assert.isUndefined = (value: unknown, message?: string) => assert(value === undefined, message ?? 'Expected undefined')
assert.isDefined = (value: unknown, message?: string) => assert(value !== undefined, message ?? 'Expected defined')
assert.isNaN = (value: unknown, message?: string) => assert(Number.isNaN(value as number), message ?? 'Expected NaN')
assert.isNotNaN = (value: unknown, message?: string) => assert(!Number.isNaN(value as number), message ?? 'Expected not NaN')
assert.exists = (value: unknown, message?: string) => assert(value !== null && value !== undefined, message ?? 'Expected to exist')
assert.notExists = (value: unknown, message?: string) => assert(value === null || value === undefined, message ?? 'Expected not to exist')
assert.isArray = (value: unknown, message?: string) => assert(Array.isArray(value), message ?? 'Expected array')
assert.isNotArray = (value: unknown, message?: string) => assert(!Array.isArray(value), message ?? 'Expected not array')
assert.isObject = (value: unknown, message?: string) => assert(typeof value === 'object' && value !== null && !Array.isArray(value), message ?? 'Expected object')
assert.isFunction = (value: unknown, message?: string) => assert(typeof value === 'function', message ?? 'Expected function')
assert.isString = (value: unknown, message?: string) => assert(typeof value === 'string', message ?? 'Expected string')
assert.isNumber = (value: unknown, message?: string) => assert(typeof value === 'number', message ?? 'Expected number')
assert.isBoolean = (value: unknown, message?: string) => assert(typeof value === 'boolean', message ?? 'Expected boolean')
assert.include = (haystack: string | unknown[], needle: unknown, message?: string) => {
  if (typeof haystack === 'string') {
    assert(haystack.includes(String(needle)), message ?? `Expected "${haystack}" to include "${needle}"`)
  } else {
    assert(haystack.includes(needle), message ?? `Expected array to include ${JSON.stringify(needle)}`)
  }
}
assert.notInclude = (haystack: string | unknown[], needle: unknown, message?: string) => {
  if (typeof haystack === 'string') {
    assert(!haystack.includes(String(needle)), message ?? `Expected "${haystack}" to not include "${needle}"`)
  } else {
    assert(!haystack.includes(needle), message ?? `Expected array to not include ${JSON.stringify(needle)}`)
  }
}
assert.lengthOf = (value: { length: number }, length: number, message?: string) => {
  assert(value.length === length, message ?? `Expected length ${length}, got ${value.length}`)
}
assert.property = (obj: object, prop: string, message?: string) => {
  assert(prop in obj, message ?? `Expected object to have property '${prop}'`)
}
assert.notProperty = (obj: object, prop: string, message?: string) => {
  assert(!(prop in obj), message ?? `Expected object to not have property '${prop}'`)
}
assert.propertyVal = (obj: object, prop: string, value: unknown, message?: string) => {
  assert((obj as Record<string, unknown>)[prop] === value,
    message ?? `Expected property '${prop}' to equal ${JSON.stringify(value)}`)
}
assert.match = (value: string, regex: RegExp, message?: string) => {
  assert(regex.test(value), message ?? `Expected "${value}" to match ${regex}`)
}
assert.notMatch = (value: string, regex: RegExp, message?: string) => {
  assert(!regex.test(value), message ?? `Expected "${value}" to not match ${regex}`)
}

/**
 * Enable should syntax globally on Object.prototype
 *
 * WARNING: This modifies Object.prototype which can cause issues.
 * Use the `should()` function wrapper instead for safer usage.
 *
 * @example
 * ```ts
 * enableGlobalShould()
 * 'hello'.should.be.a('string')
 * [1, 2, 3].should.have.lengthOf(3)
 * ```
 */
export function enableGlobalShould(): void {
  Object.defineProperty(Object.prototype, 'should', {
    get: function(this: unknown) {
      return createShouldAssertion(this)
    },
    configurable: true,
    enumerable: false,
  })
}

/**
 * Disable global should syntax
 */
export function disableGlobalShould(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (Object.prototype as any).should
}

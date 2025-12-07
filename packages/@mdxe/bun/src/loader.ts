/**
 * @mdxe/bun - Bun loader plugin for MDX files
 *
 * Enables importing MDX files directly in Bun:
 *
 * ```ts
 * // bunfig.toml
 * preload = ["@mdxe/bun/loader"]
 *
 * // Then in your code:
 * import { greet, data } from './hello.mdx'
 * ```
 *
 * @packageDocumentation
 */

import { parse } from 'mdxld'

/**
 * Register the MDX loader plugin with Bun
 *
 * This enables direct imports of .mdx and .md files.
 * The plugin transforms MDX content into JavaScript modules.
 */
export function registerLoader() {
  Bun.plugin({
    name: 'mdx-loader',
    setup(build) {
      // Handle .mdx and .md files
      build.onLoad({ filter: /\.mdx?$/ }, async (args) => {
        const content = await Bun.file(args.path).text()
        const code = transformMDX(content, args.path)

        return {
          contents: code,
          loader: 'ts', // Use TypeScript loader for the output
        }
      })
    },
  })
}

/**
 * Transform MDX content to JavaScript module code
 *
 * @param content - Raw MDX content
 * @param filePath - Path to the file (for error messages)
 * @returns JavaScript module code
 */
export function transformMDX(content: string, filePath: string = 'input.mdx'): string {
  const doc = parse(content)
  const lines: string[] = []

  // Export frontmatter data
  lines.push(`// Generated from: ${filePath}`)
  lines.push('')
  lines.push(`export const data = ${JSON.stringify(doc.data, null, 2)};`)
  lines.push('')
  lines.push(`export const content = ${JSON.stringify(doc.content)};`)
  lines.push('')

  // Extract and include export statements from the content
  const exports = extractExports(content)
  if (exports) {
    lines.push('// Exports from MDX content')
    lines.push(exports)
    lines.push('')
  }

  // Extract and include code blocks marked for execution
  const executableCode = extractExecutableBlocks(content)
  if (executableCode) {
    lines.push('// Executable code blocks')
    lines.push(executableCode)
    lines.push('')
  }

  // Create default export with document info
  lines.push(`export default {`)
  lines.push(`  data,`)
  lines.push(`  content,`)
  lines.push(`  path: ${JSON.stringify(filePath)},`)
  lines.push(`};`)

  return lines.join('\n')
}

/**
 * Extract export statements from MDX content
 */
function extractExports(content: string): string {
  const exports: string[] = []

  // Match export statements (const, let, function, class, async function)
  const exportRegex = /^export\s+(?:const|let|var|function|class|async\s+function|default)\s+[\s\S]*?(?=\n(?:export\s|#|\n|$)|$)/gm
  let match

  while ((match = exportRegex.exec(content)) !== null) {
    exports.push(match[0].trim())
  }

  return exports.join('\n\n')
}

/**
 * Extract code blocks marked for execution/export
 */
function extractExecutableBlocks(content: string): string {
  const blocks: string[] = []

  // Match code blocks with 'run', 'exec', or 'export' flags
  const codeBlockRegex = /```(?:ts|typescript|js|javascript)\s+(?:run|exec|export)\s*\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push(match[1].trim())
  }

  return blocks.join('\n\n')
}

/**
 * Transform MDX content for test execution
 *
 * Generates code that registers tests with Bun's test runner.
 *
 * @param content - Raw MDX content
 * @param filePath - Path to the file
 * @returns JavaScript test module code
 */
export function transformMDXForTest(content: string, filePath: string = 'input.mdx'): string {
  const doc = parse(content)
  const lines: string[] = []

  lines.push(`// Generated test from: ${filePath}`)
  lines.push(`import { test, expect, describe } from 'bun:test';`)
  lines.push('')

  // Extract test blocks
  const testBlocks = extractTestBlocks(content)

  if (testBlocks.length === 0) {
    // No tests, just export the data
    lines.push(`export const data = ${JSON.stringify(doc.data)};`)
    lines.push(`export const content = ${JSON.stringify(doc.content)};`)
    return lines.join('\n')
  }

  // Generate describe block with all tests
  const fileName = filePath.split('/').pop() || 'MDX Tests'
  lines.push(`describe('${fileName}', () => {`)

  for (const block of testBlocks) {
    const testFn = block.skip ? 'test.skip' : block.only ? 'test.only' : 'test'
    const asyncKeyword = block.async ? 'async ' : ''

    lines.push(`  ${testFn}('${escapeString(block.name)}', ${asyncKeyword}() => {`)
    // Indent the test code
    const indentedCode = block.code
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n')
    lines.push(indentedCode)
    lines.push(`  });`)
    lines.push('')
  }

  lines.push(`});`)
  lines.push('')

  // Also export data for access in tests
  lines.push(`export const data = ${JSON.stringify(doc.data)};`)
  lines.push(`export const content = ${JSON.stringify(doc.content)};`)

  return lines.join('\n')
}

interface TestBlock {
  name: string
  code: string
  async: boolean
  skip: boolean
  only: boolean
}

/**
 * Extract test blocks from MDX content
 */
function extractTestBlocks(content: string): TestBlock[] {
  const blocks: TestBlock[] = []

  // Match code blocks with 'test' flag
  const codeBlockRegex = /```(?:ts|typescript|js|javascript)\s+test(?:\s+([^\n]*))?\n([\s\S]*?)```/g
  let match
  let index = 0

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const meta = match[1] || ''
    const code = match[2].trim()

    // Parse meta flags
    const parsedMeta = parseMeta(meta)

    const name =
      typeof parsedMeta['name'] === 'string'
        ? parsedMeta['name']
        : `test ${++index}`

    blocks.push({
      name,
      code,
      async: parsedMeta['async'] === true || /\bawait\s+/.test(code),
      skip: parsedMeta['skip'] === true,
      only: parsedMeta['only'] === true,
    })
  }

  return blocks
}

/**
 * Parse code block meta string
 */
function parseMeta(meta: string): Record<string, string | boolean> {
  const result: Record<string, string | boolean> = {}
  if (!meta) return result

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
 * Escape string for use in JavaScript
 */
function escapeString(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')
}

// Auto-register when this module is imported as a preload
if (typeof Bun !== 'undefined') {
  registerLoader()
}

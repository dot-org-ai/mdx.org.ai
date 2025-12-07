/**
 * @mdxe/bun - Advanced test runner with proper module resolution
 *
 * Generates actual test files and runs them with `bun test` for
 * proper module resolution and global injection.
 *
 * @packageDocumentation
 */

import { extractTests, findMDXTestFiles, type TestBlock } from './extract.js'
import { parse } from 'mdxld'
import { join, dirname, relative, basename } from 'node:path'
import { tmpdir } from 'node:os'

/**
 * Test runner configuration
 */
export interface RunnerConfig {
  /** Directory to search for tests */
  rootDir?: string
  /** Patterns to include */
  include?: string[]
  /** Patterns to exclude */
  exclude?: string[]
  /** Preload scripts for globals */
  preload?: string[]
  /** Global variables to inject */
  globals?: Record<string, string>
  /** Timeout per test in ms */
  timeout?: number
  /** Run tests in parallel */
  parallel?: boolean
  /** Verbose output */
  verbose?: boolean
  /** Keep generated test files (for debugging) */
  keepGenerated?: boolean
  /** Custom output directory for generated tests */
  outDir?: string
}

/**
 * Default configuration
 */
const defaultConfig: Required<RunnerConfig> = {
  rootDir: '.',
  include: ['**/*.test.mdx', '**/*.mdx'],
  exclude: ['node_modules/**', 'dist/**'],
  preload: [],
  globals: {},
  timeout: 5000,
  parallel: true,
  verbose: false,
  keepGenerated: false,
  outDir: '',
}

/**
 * Load config from mdxe.config.ts or package.json
 */
export async function loadConfig(projectDir: string): Promise<RunnerConfig> {
  const config: RunnerConfig = {}

  // Try mdxe.config.ts
  try {
    const configPath = join(projectDir, 'mdxe.config.ts')
    const file = Bun.file(configPath)
    if (await file.exists()) {
      const mod = await import(configPath)
      Object.assign(config, mod.default || mod)
    }
  } catch {
    // Ignore
  }

  // Try package.json mdxe field
  try {
    const pkgPath = join(projectDir, 'package.json')
    const file = Bun.file(pkgPath)
    if (await file.exists()) {
      const pkg = await file.json()
      if (pkg.mdxe?.test) {
        Object.assign(config, pkg.mdxe.test)
      }
    }
  } catch {
    // Ignore
  }

  return config
}

/**
 * Extract and separate imports from code
 */
function extractImports(code: string): { imports: string[]; body: string } {
  const lines = code.split('\n')
  const imports: string[] = []
  const bodyLines: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // Match import statements (including multiline)
    if (trimmed.startsWith('import ') || trimmed.startsWith('import{')) {
      imports.push(line)
    } else if (imports.length > 0 && trimmed === '' && bodyLines.length === 0) {
      // Skip empty lines between imports
      continue
    } else {
      bodyLines.push(line)
    }
  }

  return {
    imports,
    body: bodyLines.join('\n').trim(),
  }
}

/**
 * Generate a test file from MDX content
 */
export function generateTestFile(
  mdxPath: string,
  tests: TestBlock[],
  config: RunnerConfig
): string {
  const lines: string[] = []
  const fileName = basename(mdxPath)
  const relPath = mdxPath

  lines.push(`// Generated from: ${relPath}`)
  lines.push(`// @ts-nocheck`)
  lines.push(`import { test, expect, describe } from 'bun:test';`)

  // Collect all imports from all tests
  const allImports = new Set<string>()

  // Extract imports from each test
  const testsWithExtractedImports = tests.map((block) => {
    const { imports, body } = extractImports(block.code)
    imports.forEach((imp) => allImports.add(imp))
    return { ...block, code: body }
  })

  // Add preload imports
  if (config.preload?.length) {
    for (const preload of config.preload) {
      allImports.add(`import '${preload}';`)
    }
  }

  // Add global declarations
  if (config.globals && Object.keys(config.globals).length > 0) {
    for (const [name, source] of Object.entries(config.globals)) {
      allImports.add(`import { ${name} } from '${source}';`)
    }
  }

  // Write all imports at the top
  if (allImports.size > 0) {
    lines.push('')
    for (const imp of allImports) {
      lines.push(imp)
    }
  }

  lines.push('')

  // Generate describe block
  lines.push(`describe('${escapeString(fileName)}', () => {`)

  for (const block of testsWithExtractedImports) {
    const testFn = block.skip ? 'test.skip' : block.only ? 'test.only' : 'test'
    const asyncKeyword = block.async ? 'async ' : ''
    const timeout = config.timeout ? `, { timeout: ${config.timeout} }` : ''

    lines.push(`  ${testFn}('${escapeString(block.name)}', ${asyncKeyword}() => {`)

    // Indent test code (now without imports)
    const indentedCode = block.code
      .split('\n')
      .map((line) => '    ' + line)
      .join('\n')
    lines.push(indentedCode)

    lines.push(`  }${timeout});`)
    lines.push('')
  }

  lines.push('});')

  return lines.join('\n')
}

/**
 * Generate test files from MDX files
 */
export async function generateTestFiles(
  mdxFiles: string[],
  config: RunnerConfig
): Promise<Map<string, string>> {
  const generated = new Map<string, string>()

  for (const mdxPath of mdxFiles) {
    const content = await Bun.file(mdxPath).text()
    const tests = extractTests(content)

    if (tests.length === 0) continue

    const testCode = generateTestFile(mdxPath, tests, config)
    const outPath = getOutputPath(mdxPath, config)

    generated.set(outPath, testCode)
  }

  return generated
}

/**
 * Get output path for generated test file
 */
function getOutputPath(mdxPath: string, config: RunnerConfig): string {
  // Generate tests at project root's .mdxe-tests for proper node_modules resolution
  const baseDir = config.outDir || join(process.cwd(), '.mdxe-tests')
  // Use full path as filename to avoid collisions
  const safeName = mdxPath
    .replace(/^[./]+/, '')
    .replace(/\//g, '__')
    .replace('.mdx', '.test.ts')
  return join(baseDir, safeName)
}

/**
 * Write generated test files to disk
 */
export async function writeTestFiles(
  files: Map<string, string>,
  config: RunnerConfig
): Promise<string[]> {
  const outDir = config.outDir || join(process.cwd(), '.mdxe-tests')

  // Ensure output directory exists
  await Bun.write(join(outDir, '.gitkeep'), '')

  const paths: string[] = []

  for (const [outPath, content] of files) {
    await Bun.write(outPath, content)
    paths.push(outPath)

    if (config.verbose) {
      console.log(`  Generated: ${outPath}`)
    }
  }

  return paths
}

/**
 * Run tests using bun test
 */
export async function runBunTests(
  testFiles: string[],
  config: RunnerConfig
): Promise<{ success: boolean; output: string }> {
  if (testFiles.length === 0) {
    return { success: true, output: 'No test files to run' }
  }

  const args = ['test']

  // Add preload scripts
  if (config.preload?.length) {
    for (const preload of config.preload) {
      args.push('--preload', preload)
    }
  }

  // Add timeout
  if (config.timeout) {
    args.push('--timeout', String(config.timeout))
  }

  // Convert test files to absolute paths for bun test
  const absolutePaths = testFiles.map((f) =>
    f.startsWith('/') ? f : join(process.cwd(), f)
  )
  args.push(...absolutePaths)

  if (config.verbose) {
    console.log(`Running: bun ${args.join(' ')}`)
  }

  // Run from project root for proper module resolution
  const proc = Bun.spawn(['bun', ...args], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited

  return {
    success: exitCode === 0,
    output: stdout + stderr,
  }
}

/**
 * Clean up generated test files
 */
export async function cleanupTestFiles(
  testFiles: string[],
  config: RunnerConfig
): Promise<void> {
  if (config.keepGenerated) return

  for (const file of testFiles) {
    try {
      await Bun.write(file, '') // Clear file
      // Note: Bun doesn't have unlink, but we can overwrite with empty
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Run MDX tests with full module resolution
 *
 * @example
 * ```ts
 * const result = await runMDXTestsWithBun({
 *   rootDir: '.',
 *   include: ['tests/**\/*.test.mdx'],
 *   globals: {
 *     DB: 'ai-database',
 *   },
 *   preload: ['./test-setup.ts'],
 * })
 * ```
 */
export async function runMDXTestsWithBun(
  options: RunnerConfig = {}
): Promise<{ success: boolean; output: string }> {
  const projectDir = options.rootDir || process.cwd()
  const fileConfig = await loadConfig(projectDir)
  const config = { ...defaultConfig, ...fileConfig, ...options }

  if (config.verbose) {
    console.log('MDX Test Runner (Bun Integration)')
    console.log('─'.repeat(40))
  }

  // Find MDX files with tests
  const mdxFiles = await findMDXTestFiles(config.rootDir || '.', {
    includeInline: true,
  })

  if (mdxFiles.length === 0) {
    console.log('No MDX test files found')
    return { success: true, output: 'No test files found' }
  }

  if (config.verbose) {
    console.log(`Found ${mdxFiles.length} MDX file(s) with tests`)
  }

  // Generate test files
  const generated = await generateTestFiles(mdxFiles, config)

  if (generated.size === 0) {
    console.log('No tests extracted from MDX files')
    return { success: true, output: 'No tests extracted' }
  }

  // Write test files
  const testFiles = await writeTestFiles(generated, config)

  if (config.verbose) {
    console.log(`Generated ${testFiles.length} test file(s)`)
    console.log('')
  }

  // Run tests
  const result = await runBunTests(testFiles, config)

  // Output results
  console.log(result.output)

  // Cleanup
  await cleanupTestFiles(testFiles, config)

  return result
}

/**
 * Escape string for JavaScript
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
}

/**
 * Create a preload script for injecting globals
 */
export function createPreloadScript(globals: Record<string, string>): string {
  const lines: string[] = [
    '// MDX Test Preload Script',
    '// Injects globals for MDX tests',
    '',
  ]

  for (const [name, source] of Object.entries(globals)) {
    lines.push(`import { ${name} } from '${source}';`)
    lines.push(`(globalThis as any).${name} = ${name};`)
  }

  return lines.join('\n')
}

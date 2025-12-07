/**
 * @mdxe/bun - Test runner for MDX files
 *
 * Run tests defined in MDX files using Bun's native test runner.
 *
 * @packageDocumentation
 */

import { extractTests, extractTestsFromFile, findMDXTestFiles, stripTypeScript, type TestBlock } from './extract.js'
import { createExpect } from './evaluate.js'
import { parse } from 'mdxld'

/**
 * Test result for a single test
 */
export interface TestResult {
  name: string
  passed: boolean
  skipped: boolean
  duration: number
  error?: string
}

/**
 * Test file result
 */
export interface TestFileResult {
  path: string
  tests: TestResult[]
  passed: number
  failed: number
  skipped: number
  duration: number
}

/**
 * Overall test run result
 */
export interface TestRunResult {
  files: TestFileResult[]
  totalPassed: number
  totalFailed: number
  totalSkipped: number
  totalDuration: number
}

/**
 * Options for running tests
 */
export interface RunTestsOptions {
  /** Print verbose output */
  verbose?: boolean
  /** Only run tests matching this pattern */
  filter?: string | RegExp
  /** Timeout per test in milliseconds */
  timeout?: number
  /** Run tests in parallel */
  parallel?: boolean
}

/**
 * Run tests from MDX content
 *
 * @param content - MDX content with test blocks
 * @param options - Test options
 * @returns Test results
 *
 * @example
 * ```ts
 * const results = await runTestsFromContent(`
 * # My Tests
 *
 * \`\`\`ts test name="addition works"
 * expect(1 + 1).toBe(2)
 * \`\`\`
 *
 * \`\`\`ts test name="async test" async
 * const result = await Promise.resolve(42)
 * expect(result).toBe(42)
 * \`\`\`
 * `)
 * ```
 */
export async function runTestsFromContent(
  content: string,
  options: RunTestsOptions = {}
): Promise<TestFileResult> {
  const { verbose = false, filter, timeout = 5000 } = options
  const tests = extractTests(content)
  const results: TestResult[] = []

  let passed = 0
  let failed = 0
  let skipped = 0
  const startTime = performance.now()

  for (const test of tests) {
    // Apply filter if provided
    if (filter) {
      const pattern = typeof filter === 'string' ? new RegExp(filter) : filter
      if (!pattern.test(test.name)) continue
    }

    const result = await runSingleTest(test, { verbose, timeout })
    results.push(result)

    if (result.skipped) {
      skipped++
    } else if (result.passed) {
      passed++
    } else {
      failed++
    }
  }

  return {
    path: '<content>',
    tests: results,
    passed,
    failed,
    skipped,
    duration: performance.now() - startTime,
  }
}

/**
 * Run tests from an MDX file
 *
 * @param filePath - Path to MDX file
 * @param options - Test options
 * @returns Test results
 */
export async function runTestsFromFile(
  filePath: string,
  options: RunTestsOptions = {}
): Promise<TestFileResult> {
  const { verbose = false, filter, timeout = 5000 } = options
  const testFile = await extractTestsFromFile(filePath)
  const results: TestResult[] = []

  let passed = 0
  let failed = 0
  let skipped = 0
  const startTime = performance.now()

  if (verbose) {
    console.log(`\n📄 ${filePath}`)
  }

  for (const test of testFile.tests) {
    // Apply filter if provided
    if (filter) {
      const pattern = typeof filter === 'string' ? new RegExp(filter) : filter
      if (!pattern.test(test.name)) continue
    }

    const result = await runSingleTest(test, { verbose, timeout })
    results.push(result)

    if (result.skipped) {
      skipped++
    } else if (result.passed) {
      passed++
    } else {
      failed++
    }
  }

  return {
    path: filePath,
    tests: results,
    passed,
    failed,
    skipped,
    duration: performance.now() - startTime,
  }
}

/**
 * Run a single test block
 */
async function runSingleTest(
  test: TestBlock,
  options: { verbose?: boolean; timeout?: number }
): Promise<TestResult> {
  const { verbose = false, timeout = 5000 } = options
  const startTime = performance.now()

  // Handle skipped tests
  if (test.skip) {
    if (verbose) {
      console.log(`  ⏭️  ${test.name} (skipped)`)
    }
    return {
      name: test.name,
      passed: false,
      skipped: true,
      duration: 0,
    }
  }

  try {
    // Create expect function
    const expect = createExpect()

    // Create the test function
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
    const testFn = new AsyncFunction('expect', test.code)

    // Run with timeout
    await Promise.race([
      testFn(expect),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Test timed out after ${timeout}ms`)), timeout)
      ),
    ])

    const duration = performance.now() - startTime

    if (verbose) {
      console.log(`  ✅ ${test.name} (${duration.toFixed(1)}ms)`)
    }

    return {
      name: test.name,
      passed: true,
      skipped: false,
      duration,
    }
  } catch (error) {
    const duration = performance.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (verbose) {
      console.log(`  ❌ ${test.name} (${duration.toFixed(1)}ms)`)
      console.log(`     ${errorMessage}`)
    }

    return {
      name: test.name,
      passed: false,
      skipped: false,
      duration,
      error: errorMessage,
    }
  }
}

/**
 * Run tests from multiple MDX files
 *
 * @param dir - Directory to search for MDX files
 * @param options - Test options
 * @returns Overall test results
 */
export async function runTests(
  dir: string = '.',
  options: RunTestsOptions = {}
): Promise<TestRunResult> {
  const { verbose = false, parallel = false } = options

  // Find all MDX files with tests
  const files = await findMDXTestFiles(dir)

  if (files.length === 0) {
    if (verbose) {
      console.log('No MDX test files found')
    }
    return {
      files: [],
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalDuration: 0,
    }
  }

  if (verbose) {
    console.log(`Found ${files.length} MDX file(s) with tests\n`)
  }

  const startTime = performance.now()
  let fileResults: TestFileResult[]

  if (parallel) {
    // Run files in parallel
    fileResults = await Promise.all(files.map((f) => runTestsFromFile(f, options)))
  } else {
    // Run files sequentially
    fileResults = []
    for (const file of files) {
      fileResults.push(await runTestsFromFile(file, options))
    }
  }

  const totalPassed = fileResults.reduce((sum, f) => sum + f.passed, 0)
  const totalFailed = fileResults.reduce((sum, f) => sum + f.failed, 0)
  const totalSkipped = fileResults.reduce((sum, f) => sum + f.skipped, 0)
  const totalDuration = performance.now() - startTime

  if (verbose) {
    console.log('\n' + '─'.repeat(50))
    console.log(`Results: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`)
    console.log(`Duration: ${totalDuration.toFixed(1)}ms`)
  }

  return {
    files: fileResults,
    totalPassed,
    totalFailed,
    totalSkipped,
    totalDuration,
  }
}

/**
 * Register MDX tests with Bun's test runner
 *
 * This function is meant to be called in a test file to dynamically
 * register tests from MDX content.
 *
 * @example
 * ```ts
 * // my-tests.test.ts
 * import { registerMDXTests } from '@mdxe/bun/test'
 *
 * await registerMDXTests('./docs/api.mdx')
 * ```
 */
export async function registerMDXTests(filePath: string): Promise<void> {
  // This requires bun:test to be available
  const { test, describe } = await import('bun:test')

  const testFile = await extractTestsFromFile(filePath)
  const fileName = filePath.split('/').pop() || 'MDX Tests'

  describe(fileName, () => {
    for (const block of testFile.tests) {
      const testFn = block.skip
        ? test.skip
        : block.only
          ? test.only
          : test

      testFn(block.name, async () => {
        const expect = createExpect()
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
        const fn = new AsyncFunction('expect', block.code)
        await fn(expect)
      })
    }
  })
}

/**
 * Create a test preload script content for Bun
 *
 * This generates a preload script that can be used to run MDX tests
 * with Bun's native test runner.
 *
 * @param files - MDX files to include
 * @returns Preload script content
 */
export function createTestPreload(files: string[]): string {
  return `
import { registerMDXTests } from '@mdxe/bun/test';

const files = ${JSON.stringify(files)};

for (const file of files) {
  await registerMDXTests(file);
}
`
}

// Re-export types and utilities
export { extractTests, extractTestsFromFile, findMDXTestFiles, type TestBlock } from './extract.js'
export { createExpect } from './evaluate.js'

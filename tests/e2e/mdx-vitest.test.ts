/**
 * End-to-end tests for @mdxe/vitest MDX test execution
 *
 * Tests:
 * - Inline test blocks (`\`\`\`ts test`)
 * - Companion test files (*.test.mdx)
 * - Test extraction from example files
 * - Test code generation
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import {
  extractTests,
  extractTestsFromFile,
  generateTestCode,
  runMDXTests,
  parseMeta,
  mdxTestPlugin,
  findMDXTestFiles,
  type TestBlock,
  type MDXTestFile,
} from '@mdxe/vitest'

const examplesDir = path.resolve(__dirname, '../../examples')

describe('E2E: MDX Test Extraction', () => {
  describe('parseMeta', () => {
    it('should parse test flag', () => {
      const meta = parseMeta('test')
      expect(meta.test).toBe(true)
    })

    it('should parse test with name', () => {
      const meta = parseMeta('test name="my test"')
      expect(meta.test).toBe(true)
      expect(meta.name).toBe('my test')
    })

    it('should parse async flag', () => {
      const meta = parseMeta('test async')
      expect(meta.test).toBe(true)
      expect(meta.async).toBe(true)
    })

    it('should parse skip flag', () => {
      const meta = parseMeta('skip name="skipped test"')
      expect(meta.skip).toBe(true)
      expect(meta.name).toBe('skipped test')
    })

    it('should parse complex meta strings', () => {
      const meta = parseMeta('test name="complex test" async timeout=5000')
      expect(meta.test).toBe(true)
      expect(meta.name).toBe('complex test')
      expect(meta.async).toBe(true)
      expect(meta.timeout).toBe('5000')
    })
  })

  describe('extractTests from content', () => {
    it('should extract single test block', () => {
      const content = `
# Test Document

\`\`\`ts test name="should add numbers"
expect(1 + 1).toBe(2)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('should add numbers')
      expect(tests[0].lang).toBe('ts')
      expect(tests[0].code).toBe('expect(1 + 1).toBe(2)')
    })

    it('should extract multiple test blocks', () => {
      const content = `
# Multiple Tests

\`\`\`ts test name="test one"
expect(1).toBe(1)
\`\`\`

Some documentation text.

\`\`\`ts test name="test two"
expect(2).toBe(2)
\`\`\`

\`\`\`ts test name="test three"
expect(3).toBe(3)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(3)
      expect(tests[0].name).toBe('test one')
      expect(tests[1].name).toBe('test two')
      expect(tests[2].name).toBe('test three')
    })

    it('should detect async tests', () => {
      const content = `
\`\`\`ts test async name="async test"
await Promise.resolve()
expect(true).toBe(true)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].async).toBe(true)
    })

    it('should handle skipped tests', () => {
      const content = `
\`\`\`ts skip name="skipped test"
expect(true).toBe(false)
\`\`\`
`
      const tests = extractTests(content, { includeSkipped: true })

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('[SKIP] skipped test')
      expect(tests[0].meta.skip).toBe(true)
    })

    it('should ignore non-test code blocks', () => {
      const content = `
# Documentation

\`\`\`ts
// This is just documentation
const x = 1
\`\`\`

\`\`\`ts test
expect(1).toBe(1)
\`\`\`

\`\`\`javascript
console.log('hello')
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
    })

    it('should auto-generate test names', () => {
      const content = `
\`\`\`ts test
expect(1).toBe(1)
\`\`\`

\`\`\`ts test
expect(2).toBe(2)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(2)
      expect(tests[0].name).toBe('test 1')
      expect(tests[1].name).toBe('test 2')
    })
  })
})

describe('E2E: Example Files', () => {
  it('should extract tests from math-utils.mdx', () => {
    const filePath = path.join(examplesDir, 'math-utils.mdx')
    const testFile = extractTestsFromFile(filePath)

    expect(testFile.path).toBe(filePath)
    expect(testFile.isCompanionTest).toBe(false)

    // Should have multiple tests
    expect(testFile.tests.length).toBeGreaterThan(3)

    // Check for specific tests
    const testNames = testFile.tests.map((t) => t.name)
    expect(testNames).toContain('addition works correctly')
    expect(testNames).toContain('multiplication works correctly')
    expect(testNames).toContain('sumArray adds all elements')
    expect(testNames).toContain('average calculates correctly')
    expect(testNames).toContain('async delay works')

    // Should have skipped test
    const skippedTest = testFile.tests.find((t) => t.name.includes('[SKIP]'))
    expect(skippedTest).toBeDefined()
  })

  it('should extract tests from blog.test.mdx companion file', () => {
    const filePath = path.join(examplesDir, 'blog.test.mdx')
    const testFile = extractTestsFromFile(filePath)

    expect(testFile.isCompanionTest).toBe(true)
    expect(testFile.sourcePath).toBe(path.join(examplesDir, 'blog.mdx'))

    // Should have capitalize and slugify tests
    const testNames = testFile.tests.map((t) => t.name)
    expect(testNames.some((n) => n.includes('capitalize'))).toBe(true)
    expect(testNames.some((n) => n.includes('slugify'))).toBe(true)
  })

  it('should extract tests from api-docs.mdx', () => {
    const filePath = path.join(examplesDir, 'api-docs.mdx')
    const testFile = extractTestsFromFile(filePath)

    // Should have validation tests
    const testNames = testFile.tests.map((t) => t.name)
    expect(testNames.some((n) => n.includes('email'))).toBe(true)
    expect(testNames.some((n) => n.includes('role'))).toBe(true)
    expect(testNames.some((n) => n.includes('UUID'))).toBe(true)
    expect(testNames.some((n) => n.includes('pagination'))).toBe(true)
  })

  it('should not extract tests from blog.mdx (no test blocks)', () => {
    const filePath = path.join(examplesDir, 'blog.mdx')
    const testFile = extractTestsFromFile(filePath)

    // blog.mdx has code examples but no test blocks
    expect(testFile.tests).toHaveLength(0)
  })
})

describe('E2E: Test Code Generation', () => {
  it('should generate valid vitest code from test file', () => {
    const testFile: MDXTestFile = {
      path: '/example/test.mdx',
      doc: { data: {}, content: '# Test' },
      tests: [
        {
          name: 'should work',
          lang: 'ts',
          code: 'expect(1 + 1).toBe(2)',
          line: 5,
          async: false,
          meta: { test: true },
        },
        {
          name: 'async test',
          lang: 'ts',
          code: 'await delay(10)\nexpect(true).toBe(true)',
          line: 10,
          async: true,
          meta: { test: true, async: true },
        },
      ],
      isCompanionTest: false,
    }

    const code = generateTestCode(testFile)

    expect(code).toContain("import { describe, it, expect, vi } from 'vitest'")
    expect(code).toContain("describe('test.mdx', () => {")
    expect(code).toContain("it('should work', () => {")
    expect(code).toContain("it('async test', async () => {")
    expect(code).toContain('expect(1 + 1).toBe(2)')
    expect(code).toContain('await delay(10)')
  })

  it('should generate skipped tests', () => {
    const testFile: MDXTestFile = {
      path: '/example/skip.mdx',
      doc: { data: {}, content: '# Skip Test' },
      tests: [
        {
          name: '[SKIP] skipped test',
          lang: 'ts',
          code: 'expect(true).toBe(false)',
          line: 5,
          async: false,
          meta: { skip: true },
        },
      ],
      isCompanionTest: false,
    }

    const code = generateTestCode(testFile)

    expect(code).toContain("it.skip('[SKIP] skipped test', () => {")
  })

  it('should generate code for example files', () => {
    const filePath = path.join(examplesDir, 'math-utils.mdx')
    const testFile = extractTestsFromFile(filePath)
    const code = generateTestCode(testFile)

    // Should have proper structure
    expect(code).toContain("import { describe, it, expect, vi } from 'vitest'")
    expect(code).toContain("describe('math-utils.mdx', () => {")

    // Should have all tests
    expect(code).toContain("it('addition works correctly', () => {")
    expect(code).toContain("it('multiplication works correctly', () => {")

    // Should handle async test
    expect(code).toContain("it('async delay works', async () => {")

    // Should handle skipped test
    expect(code).toContain("it.skip('[SKIP] this test is skipped', () => {")
  })
})

describe('E2E: Vitest Plugin', () => {
  it('should create a valid vitest plugin', () => {
    const plugin = mdxTestPlugin()

    expect(plugin.name).toBe('vitest-mdx-test')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.transform).toBe('function')
  })

  it('should transform MDX content with tests', () => {
    const plugin = mdxTestPlugin()
    const content = `
---
title: Test Doc
---

# Test Document

\`\`\`ts test name="should work"
expect(1 + 1).toBe(2)
\`\`\`
`

    const result = plugin.transform(content, '/test.mdx')

    expect(result).not.toBeNull()
    expect(result?.code).toContain("import { describe, it, expect, vi } from 'vitest'")
    expect(result?.code).toContain("it('should work', () => {")
  })

  it('should transform *.test.mdx files even without tests', () => {
    const plugin = mdxTestPlugin()
    const content = `
---
title: Empty Test File
---

# No tests here
`

    const result = plugin.transform(content, '/empty.test.mdx')

    expect(result).not.toBeNull()
    expect(result?.code).toContain("describe('empty.test.mdx', () => {")
  })

  it('should return null for regular MDX without tests', () => {
    const plugin = mdxTestPlugin()
    const content = `
---
title: No Tests
---

# Just documentation

\`\`\`ts
// This is not a test
const x = 1
\`\`\`
`

    const result = plugin.transform(content, '/docs.mdx')

    expect(result).toBeNull()
  })

  it('should return null for non-MDX files', () => {
    const plugin = mdxTestPlugin()
    const content = 'console.log("hello")'

    const result = plugin.transform(content, '/script.ts')

    expect(result).toBeNull()
  })
})

describe('E2E: Programmatic Test Runner', () => {
  it('should run tests from math-utils.mdx', async () => {
    const filePath = path.join(examplesDir, 'math-utils.mdx')
    const results = await runMDXTests(filePath, { includeSkipped: true })

    // All non-skipped tests should pass
    expect(results.passed).toBeGreaterThan(0)
    expect(results.failed).toBe(0)
    expect(results.skipped).toBe(1) // One skipped test
  })

  it('should run tests from blog.test.mdx', async () => {
    const filePath = path.join(examplesDir, 'blog.test.mdx')
    const results = await runMDXTests(filePath)

    // All tests should pass
    expect(results.passed).toBeGreaterThan(0)
    expect(results.failed).toBe(0)
  })

  it('should run tests from api-docs.mdx', async () => {
    const filePath = path.join(examplesDir, 'api-docs.mdx')
    const results = await runMDXTests(filePath)

    // All tests should pass
    expect(results.passed).toBeGreaterThan(0)
    expect(results.failed).toBe(0)
  })

  it('should handle file with no tests', async () => {
    const filePath = path.join(examplesDir, 'blog.mdx')
    const results = await runMDXTests(filePath)

    expect(results.passed).toBe(0)
    expect(results.failed).toBe(0)
    expect(results.skipped).toBe(0)
  })
})

describe('E2E: Find MDX Test Files', () => {
  it('should find test files in examples directory', () => {
    const files = findMDXTestFiles(examplesDir)

    // Should find *.test.mdx files
    expect(files.some((f) => f.endsWith('blog.test.mdx'))).toBe(true)

    // Should find .mdx files with inline tests
    expect(files.some((f) => f.endsWith('math-utils.mdx'))).toBe(true)
    expect(files.some((f) => f.endsWith('api-docs.mdx'))).toBe(true)

    // Should NOT include blog.mdx (no tests)
    expect(files.some((f) => f.endsWith('blog.mdx') && !f.includes('.test.'))).toBe(false)
  })

  it('should only find companion test files when includeInline is false', () => {
    const files = findMDXTestFiles(examplesDir, { includeInline: false })

    // Should only find *.test.mdx files
    expect(files.every((f) => f.endsWith('.test.mdx'))).toBe(true)
    expect(files.some((f) => f.endsWith('blog.test.mdx'))).toBe(true)
  })
})

describe('E2E: Complete Workflow', () => {
  it('should complete full MDX test workflow', async () => {
    // Step 1: Create MDX content with tests
    const mdxContent = `---
$type: Documentation
title: Workflow Test
---

# Workflow Test

Testing the complete MDX test workflow.

\`\`\`ts test name="addition"
expect(2 + 2).toBe(4)
\`\`\`

\`\`\`ts test name="string concat"
expect('hello' + ' ' + 'world').toBe('hello world')
\`\`\`

\`\`\`ts test async name="async operation"
const result = await Promise.resolve(42)
expect(result).toBe(42)
\`\`\`
`

    // Step 2: Extract tests
    const tests = extractTests(mdxContent)
    expect(tests).toHaveLength(3)

    // Step 3: Generate test code
    const testFile: MDXTestFile = {
      path: '/workflow-test.mdx',
      doc: { data: { title: 'Workflow Test' }, content: mdxContent },
      tests,
      isCompanionTest: false,
    }

    const code = generateTestCode(testFile)
    expect(code).toContain("describe('workflow-test.mdx', () => {")
    expect(code).toContain("it('addition', () => {")
    expect(code).toContain("it('string concat', () => {")
    expect(code).toContain("it('async operation', async () => {")

    // Step 4: Use vitest plugin (simulated)
    const plugin = mdxTestPlugin()
    const transformResult = plugin.transform(mdxContent, '/workflow-test.mdx')
    expect(transformResult).not.toBeNull()
    expect(transformResult?.code).toContain("import { describe, it, expect, vi } from 'vitest'")
  })

  it('should handle companion test file workflow', async () => {
    // Read the actual companion test file
    const testFilePath = path.join(examplesDir, 'blog.test.mdx')
    const sourceFilePath = path.join(examplesDir, 'blog.mdx')

    // Extract tests
    const testFile = extractTestsFromFile(testFilePath)

    expect(testFile.isCompanionTest).toBe(true)
    expect(testFile.sourcePath).toBe(sourceFilePath)

    // Generate code
    const code = generateTestCode(testFile)
    expect(code).toContain('// Testing: blog.mdx')
    expect(code).toContain("describe('blog.test.mdx', () => {")

    // Run the tests
    const results = await runMDXTests(testFilePath)
    expect(results.passed).toBeGreaterThan(0)
    expect(results.failed).toBe(0)
  })
})

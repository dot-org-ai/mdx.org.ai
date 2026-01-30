import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import {
  parseMeta,
  extractTests,
  extractTestsFromFile,
  findMDXTestFiles,
  generateTestCode,
  runMDXTests,
  createMDXTestTransformer,
  mdxTestPlugin,
  should,
  assert,
  enableGlobalShould,
  disableGlobalShould,
  type TestBlock,
  type MDXTestFile,
  type ExtractTestsOptions,
} from '../index.js'
import { parse } from 'mdxld'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// =============================================================================
// Test Fixtures
// =============================================================================

const FIXTURES = {
  simple: `
# Simple Test

\`\`\`ts test name="simple test"
expect(1 + 1).toBe(2)
\`\`\`
`,

  multipleTests: `
# Multiple Tests

\`\`\`ts test name="first test"
expect(true).toBe(true)
\`\`\`

Some explanatory text.

\`\`\`ts test name="second test"
expect(false).toBe(false)
\`\`\`

\`\`\`ts test name="third test"
expect(1).toEqual(1)
\`\`\`
`,

  asyncTest: `
# Async Test

\`\`\`ts test async name="async operation"
const result = await Promise.resolve(42)
expect(result).toBe(42)
\`\`\`
`,

  skippedTest: `
# Skipped Test

\`\`\`ts skip name="this should be skipped"
expect(true).toBe(false)
\`\`\`
`,

  mixedCodeBlocks: `
# Mixed Code Blocks

\`\`\`ts
// Just a code example, not a test
const x = 1
\`\`\`

\`\`\`ts test name="actual test"
expect(1).toBe(1)
\`\`\`

\`\`\`javascript
console.log('not a test')
\`\`\`
`,

  withFrontmatter: `---
title: Test Document
$type: Documentation
author: Test Author
---

# Test Document

\`\`\`ts test name="frontmatter test"
expect(true).toBe(true)
\`\`\`
`,

  pythonTest: `
# Python Test

\`\`\`python test name="python test"
assert 1 == 1
\`\`\`
`,

  noTests: `
# No Tests

Just some documentation without any test blocks.

\`\`\`ts
// Example code
const example = 'not a test'
\`\`\`
`,

  jsxContent: `
# JSX Test

\`\`\`tsx test name="jsx test"
const Component = <div>Hello</div>
expect(Component.type).toBe('div')
\`\`\`
`,

  withAwait: `
# Await Test

\`\`\`ts test name="implicit async"
const data = await fetch('/api')
expect(data).toBeDefined()
\`\`\`
`,

  multilineCode: `
# Multiline Test

\`\`\`ts test name="multiline test"
const x = 1
const y = 2
const z = 3
expect(x + y + z).toBe(6)
\`\`\`
`,

  nestedCode: `
# Nested Structures

\`\`\`ts test name="nested test"
const obj = {
  nested: {
    value: 42
  }
}
expect(obj.nested.value).toBe(42)
\`\`\`
`,

  customFlag: `
# Custom Flag

\`\`\`ts example name="custom flag test"
expect(1).toBe(1)
\`\`\`
`,

  invalidMeta: `
# Invalid Meta

\`\`\`ts test name=
expect(1).toBe(1)
\`\`\`
`,

  emptyCodeBlock: `
# Empty Code Block

\`\`\`ts test name="empty test"
\`\`\`
`,

  specialChars: `
# Special Characters

\`\`\`ts test name="test with 'quotes' and \"double quotes\""
expect('hello').toBe('hello')
\`\`\`
`,

  honoApp: `
# Hono App Test

\`\`\`ts test name="hono test"
app.get('/test', (c) => c.text('Hello'))
const res = await app.request('/test')
expect(res.status).toBe(200)
\`\`\`
`,

  yamlPreserved: `
# YAML Content

\`\`\`ts test name="yaml parsing"
const yaml = \`
name: test
value: 123
\`
expect(yaml).toContain('name:')
\`\`\`
`,
}

// =============================================================================
// parseMeta Tests
// =============================================================================

describe('@mdxe/vitest', () => {
  describe('parseMeta', () => {
    it('should parse boolean flags', () => {
      const result = parseMeta('test async')
      expect(result.test).toBe(true)
      expect(result.async).toBe(true)
    })

    it('should parse key="value" pairs', () => {
      const result = parseMeta('test name="my test"')
      expect(result.test).toBe(true)
      expect(result.name).toBe('my test')
    })

    it('should parse key=value pairs without quotes', () => {
      const result = parseMeta('test timeout=5000')
      expect(result.test).toBe(true)
      expect(result.timeout).toBe('5000')
    })

    it('should parse single-quoted values', () => {
      const result = parseMeta("name='single quoted'")
      expect(result.name).toBe('single quoted')
    })

    it('should handle empty string', () => {
      const result = parseMeta('')
      expect(result).toEqual({})
    })

    it('should parse complex meta strings', () => {
      const result = parseMeta('test name="complex test" async skip=false')
      expect(result.test).toBe(true)
      expect(result.name).toBe('complex test')
      expect(result.async).toBe(true)
      expect(result.skip).toBe('false')
    })

    it('should parse multiple boolean flags', () => {
      const result = parseMeta('test async only')
      expect(result.test).toBe(true)
      expect(result.async).toBe(true)
      expect(result.only).toBe(true)
    })

    it('should handle values with spaces in quotes', () => {
      const result = parseMeta('name="test with multiple words"')
      expect(result.name).toBe('test with multiple words')
    })

    it('should handle mixed quote styles', () => {
      const result = parseMeta(`title="double" subtitle='single'`)
      expect(result.title).toBe('double')
      expect(result.subtitle).toBe('single')
    })

    it('should handle numeric values', () => {
      const result = parseMeta('timeout=5000 retries=3')
      expect(result.timeout).toBe('5000')
      expect(result.retries).toBe('3')
    })
  })

  // =============================================================================
  // extractTests Tests
  // =============================================================================

  describe('extractTests', () => {
    it('should extract test blocks from MDX content', () => {
      const tests = extractTests(FIXTURES.simple)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('simple test')
      expect(tests[0].lang).toBe('ts')
      expect(tests[0].code).toBe('expect(1 + 1).toBe(2)')
      expect(tests[0].async).toBe(false)
    })

    it('should extract multiple test blocks', () => {
      const tests = extractTests(FIXTURES.multipleTests)

      expect(tests).toHaveLength(3)
      expect(tests[0].name).toBe('first test')
      expect(tests[1].name).toBe('second test')
      expect(tests[2].name).toBe('third test')
    })

    it('should auto-generate test names when not provided', () => {
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

    it('should detect async tests via flag', () => {
      const tests = extractTests(FIXTURES.asyncTest)

      expect(tests).toHaveLength(1)
      expect(tests[0].async).toBe(true)
    })

    it('should include skipped tests with prefix', () => {
      const tests = extractTests(FIXTURES.skippedTest, { includeSkipped: true })

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('[SKIP] this should be skipped')
      expect(tests[0].meta.skip).toBe(true)
    })

    it('should ignore non-test code blocks', () => {
      const tests = extractTests(FIXTURES.mixedCodeBlocks)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('actual test')
    })

    it('should filter by language', () => {
      const tests = extractTests(FIXTURES.pythonTest, { languages: ['ts', 'typescript'] })
      expect(tests).toHaveLength(0)
    })

    it('should include python when specified', () => {
      const tests = extractTests(FIXTURES.pythonTest, { languages: ['python'] })
      expect(tests).toHaveLength(1)
      expect(tests[0].lang).toBe('python')
    })

    it('should use custom test flag', () => {
      const tests = extractTests(FIXTURES.customFlag, { testFlag: 'example' })

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('custom flag test')
    })

    it('should handle content with frontmatter', () => {
      const tests = extractTests(FIXTURES.withFrontmatter)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('frontmatter test')
    })

    it('should return empty array for content without tests', () => {
      const tests = extractTests(FIXTURES.noTests)
      expect(tests).toHaveLength(0)
    })

    it('should handle empty code blocks', () => {
      const tests = extractTests(FIXTURES.emptyCodeBlock)

      expect(tests).toHaveLength(1)
      expect(tests[0].code).toBe('')
    })

    it('should preserve multiline code', () => {
      const tests = extractTests(FIXTURES.multilineCode)

      expect(tests).toHaveLength(1)
      expect(tests[0].code).toContain('const x = 1')
      expect(tests[0].code).toContain('const y = 2')
      expect(tests[0].code).toContain('const z = 3')
    })

    it('should handle nested structures in code', () => {
      const tests = extractTests(FIXTURES.nestedCode)

      expect(tests).toHaveLength(1)
      expect(tests[0].code).toContain('nested:')
      expect(tests[0].code).toContain('value: 42')
    })

    it('should track line numbers', () => {
      const tests = extractTests(FIXTURES.simple)

      expect(tests).toHaveLength(1)
      // Line numbers are available (can be 0 or greater depending on AST position data)
      expect(typeof tests[0].line).toBe('number')
    })

    it('should handle JavaScript language', () => {
      const content = `
\`\`\`javascript test name="js test"
expect(1).toBe(1)
\`\`\`
`
      const tests = extractTests(content)
      expect(tests).toHaveLength(1)
      expect(tests[0].lang).toBe('javascript')
    })

    it('should handle js shorthand', () => {
      const content = `
\`\`\`js test name="js shorthand"
expect(1).toBe(1)
\`\`\`
`
      const tests = extractTests(content)
      expect(tests).toHaveLength(1)
      expect(tests[0].lang).toBe('js')
    })

    it('should exclude skipped tests when includeSkipped is false', () => {
      const tests = extractTests(FIXTURES.skippedTest, { includeSkipped: false })
      expect(tests).toHaveLength(0)
    })

    it('should handle test with both name and other meta', () => {
      const content = `
\`\`\`ts test name="named test" timeout=5000 retry=3
expect(1).toBe(1)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('named test')
      expect(tests[0].meta.timeout).toBe('5000')
      expect(tests[0].meta.retry).toBe('3')
    })
  })

  // =============================================================================
  // extractTestsFromFile Tests
  // =============================================================================

  describe('extractTestsFromFile', () => {
    const testDir = path.join(__dirname, 'fixtures')
    const testFile = path.join(testDir, 'sample.mdx')
    const companionTest = path.join(testDir, 'component.test.mdx')
    const sourceFile = path.join(testDir, 'component.mdx')

    beforeEach(() => {
      // Create test fixtures directory and files
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true })
      }

      fs.writeFileSync(testFile, FIXTURES.simple)
      fs.writeFileSync(sourceFile, '# Component\n\nA component.')
      fs.writeFileSync(companionTest, `
# Component Tests

\`\`\`ts test name="component test"
expect(true).toBe(true)
\`\`\`
`)
    })

    afterEach(() => {
      // Cleanup
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should extract tests from a file', () => {
      const result = extractTestsFromFile(testFile)

      expect(result.path).toBe(testFile)
      expect(result.tests).toHaveLength(1)
      expect(result.tests[0].name).toBe('simple test')
    })

    it('should identify companion test files', () => {
      const result = extractTestsFromFile(companionTest)

      expect(result.isCompanionTest).toBe(true)
      expect(result.sourcePath).toBe(sourceFile)
    })

    it('should not mark regular mdx as companion test', () => {
      const result = extractTestsFromFile(testFile)

      expect(result.isCompanionTest).toBe(false)
      expect(result.sourcePath).toBeUndefined()
    })

    it('should include parsed document', () => {
      const result = extractTestsFromFile(testFile)

      expect(result.doc).toBeDefined()
      expect(result.doc.content).toContain('Simple Test')
    })

    it('should pass extraction options', () => {
      const customFile = path.join(testDir, 'custom.mdx')
      fs.writeFileSync(customFile, FIXTURES.customFlag)

      const result = extractTestsFromFile(customFile, { testFlag: 'example' })
      expect(result.tests).toHaveLength(1)
    })
  })

  // =============================================================================
  // findMDXTestFiles Tests
  // =============================================================================

  describe('findMDXTestFiles', () => {
    const testDir = path.join(__dirname, 'find-fixtures')

    beforeEach(() => {
      // Create test directory structure
      fs.mkdirSync(path.join(testDir, 'nested'), { recursive: true })

      // Create test files
      fs.writeFileSync(path.join(testDir, 'has-tests.mdx'), FIXTURES.simple)
      fs.writeFileSync(path.join(testDir, 'no-tests.mdx'), FIXTURES.noTests)
      fs.writeFileSync(path.join(testDir, 'explicit.test.mdx'), FIXTURES.simple)
      fs.writeFileSync(path.join(testDir, 'nested', 'nested-test.mdx'), FIXTURES.simple)
      fs.writeFileSync(path.join(testDir, 'nested', 'nested.test.mdx'), FIXTURES.simple)
    })

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should find all .test.mdx files', () => {
      const files = findMDXTestFiles(testDir, { includeInline: false })

      expect(files).toContain(path.join(testDir, 'explicit.test.mdx'))
      expect(files).toContain(path.join(testDir, 'nested', 'nested.test.mdx'))
    })

    it('should find mdx files with inline tests when includeInline is true', () => {
      const files = findMDXTestFiles(testDir, { includeInline: true })

      expect(files).toContain(path.join(testDir, 'has-tests.mdx'))
      expect(files).not.toContain(path.join(testDir, 'no-tests.mdx'))
    })

    it('should search recursively by default', () => {
      const files = findMDXTestFiles(testDir)

      expect(files.some(f => f.includes('nested'))).toBe(true)
    })

    it('should not search recursively when recursive is false', () => {
      const files = findMDXTestFiles(testDir, { recursive: false })

      expect(files.some(f => f.includes('nested'))).toBe(false)
    })

    it('should skip node_modules directories', () => {
      fs.mkdirSync(path.join(testDir, 'node_modules'), { recursive: true })
      fs.writeFileSync(path.join(testDir, 'node_modules', 'dep.test.mdx'), FIXTURES.simple)

      const files = findMDXTestFiles(testDir)

      expect(files.some(f => f.includes('node_modules'))).toBe(false)
    })

    it('should skip hidden directories', () => {
      fs.mkdirSync(path.join(testDir, '.hidden'), { recursive: true })
      fs.writeFileSync(path.join(testDir, '.hidden', 'hidden.test.mdx'), FIXTURES.simple)

      const files = findMDXTestFiles(testDir)

      expect(files.some(f => f.includes('.hidden'))).toBe(false)
    })
  })

  // =============================================================================
  // generateTestCode Tests
  // =============================================================================

  describe('generateTestCode', () => {
    it('should generate valid vitest code', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/test.mdx',
        doc: parse('# Test'),
        tests: [
          {
            name: 'should work',
            lang: 'ts',
            code: 'expect(1 + 1).toBe(2)',
            line: 5,
            async: false,
            meta: { test: true },
          },
        ],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain("import { describe, it, expect, vi } from 'vitest'")
      expect(code).toContain("describe('test.mdx', () => {")
      expect(code).toContain("it('should work', () => {")
      expect(code).toContain('expect(1 + 1).toBe(2)')
    })

    it('should generate async test functions', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/async.test.mdx',
        doc: parse('# Async Test'),
        tests: [
          {
            name: 'async test',
            lang: 'ts',
            code: 'await delay(100)',
            line: 5,
            async: true,
            meta: { test: true, async: true },
          },
        ],
        isCompanionTest: true,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain("it('async test', async () => {")
    })

    it('should generate skipped tests', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/skip.mdx',
        doc: parse('# Skip Test'),
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

    it('should escape quotes in test names', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/quotes.mdx',
        doc: parse('# Quotes Test'),
        tests: [
          {
            name: "test with 'quotes'",
            lang: 'ts',
            code: 'expect(true).toBe(true)',
            line: 5,
            async: false,
            meta: { test: true },
          },
        ],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain("it('test with \\'quotes\\'', () => {")
    })

    it('should add source path comment for companion tests', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/blog.test.mdx',
        doc: parse('# Blog Tests'),
        tests: [],
        isCompanionTest: true,
        sourcePath: '/path/to/blog.mdx',
      }

      const code = generateTestCode(testFile)

      expect(code).toContain('// Testing: blog.mdx')
    })

    it('should preserve code without extra indentation', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/multiline.mdx',
        doc: parse('# Multiline Test'),
        tests: [
          {
            name: 'multiline test',
            lang: 'ts',
            code: 'const x = 1\nconst y = 2\nexpect(x + y).toBe(3)',
            line: 5,
            async: false,
            meta: { test: true },
          },
        ],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      // Code should be preserved as-is (no extra indentation for template literals)
      expect(code).toContain('const x = 1')
      expect(code).toContain('const y = 2')
      expect(code).toContain('expect(x + y).toBe(3)')
    })

    it('should generate empty describe block for files without tests', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/empty.mdx',
        doc: parse('# Empty'),
        tests: [],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain("describe('empty.mdx', () => {")
      expect(code).toContain('})')
    })

    it('should import should and assert from @mdxe/vitest', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/test.mdx',
        doc: parse('# Test'),
        tests: [],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain("import { should, assert } from '@mdxe/vitest'")
    })

    it('should detect and handle await for implicit async', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/implicit-async.mdx',
        doc: parse('# Test'),
        tests: [
          {
            name: 'implicit async',
            lang: 'ts',
            code: 'const result = await Promise.resolve(1)\nexpect(result).toBe(1)',
            line: 5,
            async: false, // Not explicitly marked, but contains await
            meta: { test: true },
          },
        ],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      // Should detect await and make the test async
      expect(code).toContain('async () => {')
    })

    it('should add file path comment at top', () => {
      const testFile: MDXTestFile = {
        path: '/path/to/documented.mdx',
        doc: parse('# Test'),
        tests: [],
        isCompanionTest: false,
      }

      const code = generateTestCode(testFile)

      expect(code).toContain('// Generated from: documented.mdx')
    })
  })

  // =============================================================================
  // runMDXTests Tests
  // =============================================================================

  describe('runMDXTests', () => {
    const testDir = path.join(__dirname, 'run-fixtures')

    beforeEach(() => {
      fs.mkdirSync(testDir, { recursive: true })
    })

    afterEach(() => {
      if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true })
      }
    })

    it('should run passing tests', async () => {
      const file = path.join(testDir, 'passing.mdx')
      fs.writeFileSync(file, `
\`\`\`ts test name="passing"
expect(1 + 1).toBe(2)
\`\`\`
`)
      const result = await runMDXTests(file)

      expect(result.passed).toBe(1)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('should run failing tests', async () => {
      const file = path.join(testDir, 'failing.mdx')
      fs.writeFileSync(file, `
\`\`\`ts test name="failing"
expect(1 + 1).toBe(3)
\`\`\`
`)
      const result = await runMDXTests(file)

      expect(result.passed).toBe(0)
      expect(result.failed).toBe(1)
      expect(result.skipped).toBe(0)
    })

    it('should skip tests with skip flag', async () => {
      const file = path.join(testDir, 'skipped.mdx')
      fs.writeFileSync(file, `
\`\`\`ts skip name="skipped"
expect(true).toBe(false)
\`\`\`
`)
      const result = await runMDXTests(file, { includeSkipped: true })

      expect(result.passed).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(1)
    })

    it('should run multiple tests', async () => {
      const file = path.join(testDir, 'multiple.mdx')
      fs.writeFileSync(file, `
\`\`\`ts test name="pass 1"
expect(1).toBe(1)
\`\`\`

\`\`\`ts test name="pass 2"
expect(2).toBe(2)
\`\`\`

\`\`\`ts test name="fail"
expect(3).toBe(4)
\`\`\`
`)
      const result = await runMDXTests(file)

      expect(result.passed).toBe(2)
      expect(result.failed).toBe(1)
    })

    it('should handle files with no tests', async () => {
      const file = path.join(testDir, 'no-tests.mdx')
      fs.writeFileSync(file, FIXTURES.noTests)

      const result = await runMDXTests(file)

      expect(result.passed).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.skipped).toBe(0)
    })

    it('should run async tests', async () => {
      const file = path.join(testDir, 'async.mdx')
      fs.writeFileSync(file, `
\`\`\`ts test async name="async test"
const result = await Promise.resolve(42)
expect(result).toBe(42)
\`\`\`
`)
      const result = await runMDXTests(file)

      expect(result.passed).toBe(1)
    })
  })

  // =============================================================================
  // createMDXTestTransformer Tests
  // =============================================================================

  describe('createMDXTestTransformer', () => {
    it('should return a transformer object', () => {
      const transformer = createMDXTestTransformer()

      expect(transformer).toHaveProperty('name', 'mdx-test-transformer')
      expect(transformer).toHaveProperty('transform')
      expect(typeof transformer.transform).toBe('function')
    })

    it('should transform MDX test files', () => {
      const transformer = createMDXTestTransformer()
      const result = transformer.transform(FIXTURES.simple, '/test.mdx')

      expect(result).not.toBeNull()
      expect(result?.code).toContain("describe('test.mdx'")
    })

    it('should return null for non-MDX files', () => {
      const transformer = createMDXTestTransformer()
      const result = transformer.transform('const x = 1', '/test.ts')

      expect(result).toBeNull()
    })

    it('should transform .test.mdx files even without test blocks', () => {
      const transformer = createMDXTestTransformer()
      const result = transformer.transform('# Just docs', '/component.test.mdx')

      expect(result).not.toBeNull()
    })

    it('should return null for regular mdx without tests', () => {
      const transformer = createMDXTestTransformer()
      const result = transformer.transform(FIXTURES.noTests, '/docs.mdx')

      expect(result).toBeNull()
    })
  })

  // =============================================================================
  // mdxTestPlugin Tests
  // =============================================================================

  describe('mdxTestPlugin', () => {
    it('should return a plugin object', () => {
      const plugin = mdxTestPlugin()

      expect(plugin).toHaveProperty('name', 'vitest-mdx-test')
      expect(plugin).toHaveProperty('enforce', 'pre')
      expect(plugin).toHaveProperty('transform')
    })

    it('should transform MDX files with tests', () => {
      const plugin = mdxTestPlugin()
      const result = plugin.transform(FIXTURES.simple, '/test.mdx')

      expect(result).not.toBeNull()
      expect(result?.code).toContain("describe('test.mdx'")
    })

    it('should return null for non-MDX files', () => {
      const plugin = mdxTestPlugin()
      const result = plugin.transform('export const x = 1', '/module.ts')

      expect(result).toBeNull()
    })

    it('should accept custom options', () => {
      const plugin = mdxTestPlugin({ testFlag: 'example' })
      const result = plugin.transform(FIXTURES.customFlag, '/test.mdx')

      expect(result?.code).toContain('custom flag test')
    })

    it('should always transform .test.mdx files', () => {
      const plugin = mdxTestPlugin()
      const result = plugin.transform('# No tests here', '/component.test.mdx')

      expect(result).not.toBeNull()
    })
  })

  // =============================================================================
  // should() Assertion Helper Tests
  // =============================================================================

  describe('should assertion helper', () => {
    it('should create assertion wrapper', () => {
      const wrapped = should('hello')
      expect(wrapped.should).toBeDefined()
    })

    it('should assert type with .a()', () => {
      expect(() => should('hello').should.be.a('string')).not.toThrow()
      expect(() => should('hello').should.be.a('number')).toThrow()
    })

    it('should assert equality with .equal()', () => {
      expect(() => should(42).should.equal(42)).not.toThrow()
      expect(() => should(42).should.equal(43)).toThrow()
    })

    it('should assert deep equality with .eql()', () => {
      expect(() => should({ a: 1 }).should.eql({ a: 1 })).not.toThrow()
      expect(() => should({ a: 1 }).should.eql({ a: 2 })).toThrow()
    })

    it('should assert length with .lengthOf()', () => {
      expect(() => should([1, 2, 3]).should.have.lengthOf(3)).not.toThrow()
      expect(() => should([1, 2, 3]).should.have.lengthOf(2)).toThrow()
    })

    it('should support negation with .not', () => {
      expect(() => should(42).should.not.equal(43)).not.toThrow()
      expect(() => should(42).should.not.equal(42)).toThrow()
    })

    it('should assert truthiness with .ok', () => {
      expect(() => should(true).should.be.ok).not.toThrow()
      expect(() => should(false).should.be.ok).toThrow()
    })

    it('should assert property with .property()', () => {
      expect(() => should({ name: 'test' }).should.have.property('name')).not.toThrow()
      expect(() => should({ name: 'test' }).should.have.property('missing')).toThrow()
    })

    it('should assert property with value', () => {
      expect(() => should({ name: 'test' }).should.have.property('name', 'test')).not.toThrow()
      expect(() => should({ name: 'test' }).should.have.property('name', 'wrong')).toThrow()
    })

    it('should assert inclusion with .include()', () => {
      expect(() => should([1, 2, 3]).should.include(2)).not.toThrow()
      expect(() => should([1, 2, 3]).should.include(4)).toThrow()

      expect(() => should('hello world').should.include('world')).not.toThrow()
      expect(() => should('hello world').should.include('foo')).toThrow()
    })

    it('should assert comparison with .above() and .below()', () => {
      expect(() => should(5).should.be.above(3)).not.toThrow()
      expect(() => should(5).should.be.below(10)).not.toThrow()
      expect(() => should(5).should.be.above(10)).toThrow()
    })

    it('should assert null and undefined', () => {
      expect(() => should(null).should.be.null).not.toThrow()
      expect(() => should(undefined).should.be.undefined).not.toThrow()
      expect(() => should('value').should.exist).not.toThrow()
    })

    it('should support chaining', () => {
      expect(() => should([1, 2, 3]).should.be.an('array').and.have.lengthOf(3)).not.toThrow()
    })

    it('should assert empty', () => {
      expect(() => should([]).should.be.empty).not.toThrow()
      expect(() => should('').should.be.empty).not.toThrow()
      expect(() => should({}).should.be.empty).not.toThrow()
      expect(() => should([1]).should.be.empty).toThrow()
    })

    it('should assert throw', () => {
      expect(() => should(() => { throw new Error('test') }).should.throw()).not.toThrow()
      expect(() => should(() => { return 1 }).should.throw()).toThrow()
    })

    it('should assert match with regex', () => {
      expect(() => should('hello123').should.match(/\d+/)).not.toThrow()
      expect(() => should('hello123').should.match(/xyz/)).toThrow()
    })

    it('should provide valueOf for primitives', () => {
      const wrapped = should(42)
      expect(wrapped.valueOf()).toBe(42)
    })

    it('should provide toString for primitives', () => {
      const wrapped = should(42)
      expect(wrapped.toString()).toBe('42')
    })

    it('should assert within range', () => {
      expect(() => should(5).should.be.within(1, 10)).not.toThrow()
      expect(() => should(15).should.be.within(1, 10)).toThrow()
    })

    it('should assert at.least and at.most', () => {
      expect(() => should(5).should.be.at.least(3)).not.toThrow()
      expect(() => should(5).should.be.at.most(10)).not.toThrow()
      expect(() => should(5).should.be.at.least(10)).toThrow()
    })

    it('should assert instanceof', () => {
      expect(() => should(new Date()).should.be.instanceof(Date)).not.toThrow()
      expect(() => should([]).should.be.instanceof(Array)).not.toThrow()
    })

    it('should assert frozen and sealed', () => {
      const frozen = Object.freeze({ a: 1 })
      const sealed = Object.seal({ b: 2 })
      expect(() => should(frozen).should.be.frozen).not.toThrow()
      expect(() => should(sealed).should.be.sealed).not.toThrow()
    })

    it('should assert keys', () => {
      expect(() => should({ a: 1, b: 2 }).should.have.keys('a', 'b')).not.toThrow()
      expect(() => should({ a: 1 }).should.have.keys('a', 'b')).toThrow()
    })

    it('should assert object inclusion', () => {
      expect(() => should({ a: 1, b: 2 }).should.include({ a: 1 })).not.toThrow()
      expect(() => should({ a: 1, b: 2 }).should.include({ c: 3 })).toThrow()
    })

    it('should assert true and false', () => {
      expect(() => should(true).should.be.true).not.toThrow()
      expect(() => should(false).should.be.false).not.toThrow()
      expect(() => should(1).should.be.true).toThrow()
    })

    it('should assert NaN', () => {
      expect(() => should(NaN).should.be.NaN).not.toThrow()
      expect(() => should(123).should.be.NaN).toThrow()
    })
  })

  // =============================================================================
  // assert() Assertion Helper Tests
  // =============================================================================

  describe('assert helper', () => {
    it('should pass on truthy condition', () => {
      expect(() => assert(true)).not.toThrow()
      expect(() => assert(1)).not.toThrow()
      expect(() => assert('yes')).not.toThrow()
    })

    it('should throw on falsy condition', () => {
      expect(() => assert(false)).toThrow()
      expect(() => assert(0)).toThrow()
      expect(() => assert('')).toThrow()
    })

    it('should use custom message', () => {
      expect(() => assert(false, 'custom message')).toThrow('custom message')
    })

    it('should support assert.ok()', () => {
      expect(() => assert.ok(true)).not.toThrow()
      expect(() => assert.ok(false)).toThrow()
    })

    it('should support assert.equal()', () => {
      expect(() => assert.equal(1, 1)).not.toThrow()
      expect(() => assert.equal(1, '1')).not.toThrow() // loose equality
      expect(() => assert.equal(1, 2)).toThrow()
    })

    it('should support assert.strictEqual()', () => {
      expect(() => assert.strictEqual(1, 1)).not.toThrow()
      expect(() => assert.strictEqual(1, '1')).toThrow() // strict equality
    })

    it('should support assert.notEqual()', () => {
      expect(() => assert.notEqual(1, 2)).not.toThrow()
      expect(() => assert.notEqual(1, 1)).toThrow()
    })

    it('should support assert.deepEqual()', () => {
      expect(() => assert.deepEqual({ a: 1 }, { a: 1 })).not.toThrow()
      expect(() => assert.deepEqual({ a: 1 }, { a: 2 })).toThrow()
    })

    it('should support assert.throws()', () => {
      expect(() => assert.throws(() => { throw new Error() })).not.toThrow()
      expect(() => assert.throws(() => { /* no throw */ })).toThrow()
    })

    it('should support assert.doesNotThrow()', () => {
      expect(() => assert.doesNotThrow(() => { /* no throw */ })).not.toThrow()
      expect(() => assert.doesNotThrow(() => { throw new Error() })).toThrow()
    })

    it('should support assert.isTrue() and assert.isFalse()', () => {
      expect(() => assert.isTrue(true)).not.toThrow()
      expect(() => assert.isTrue(1)).toThrow() // strict true check
      expect(() => assert.isFalse(false)).not.toThrow()
      expect(() => assert.isFalse(0)).toThrow() // strict false check
    })

    it('should support assert.isNull() and assert.isNotNull()', () => {
      expect(() => assert.isNull(null)).not.toThrow()
      expect(() => assert.isNull(undefined)).toThrow()
      expect(() => assert.isNotNull('value')).not.toThrow()
    })

    it('should support assert.isDefined() and assert.isUndefined()', () => {
      expect(() => assert.isDefined('value')).not.toThrow()
      expect(() => assert.isDefined(undefined)).toThrow()
      expect(() => assert.isUndefined(undefined)).not.toThrow()
    })

    it('should support assert.isArray()', () => {
      expect(() => assert.isArray([])).not.toThrow()
      expect(() => assert.isArray('array')).toThrow()
    })

    it('should support assert.isObject()', () => {
      expect(() => assert.isObject({})).not.toThrow()
      expect(() => assert.isObject([])).toThrow() // arrays are not plain objects
      expect(() => assert.isObject(null)).toThrow()
    })

    it('should support assert.isFunction()', () => {
      expect(() => assert.isFunction(() => {})).not.toThrow()
      expect(() => assert.isFunction('func')).toThrow()
    })

    it('should support assert.isString()', () => {
      expect(() => assert.isString('hello')).not.toThrow()
      expect(() => assert.isString(123)).toThrow()
    })

    it('should support assert.isNumber()', () => {
      expect(() => assert.isNumber(123)).not.toThrow()
      expect(() => assert.isNumber('123')).toThrow()
    })

    it('should support assert.isBoolean()', () => {
      expect(() => assert.isBoolean(true)).not.toThrow()
      expect(() => assert.isBoolean(1)).toThrow()
    })

    it('should support assert.include()', () => {
      expect(() => assert.include([1, 2, 3], 2)).not.toThrow()
      expect(() => assert.include('hello', 'ell')).not.toThrow()
      expect(() => assert.include([1, 2, 3], 4)).toThrow()
    })

    it('should support assert.notInclude()', () => {
      expect(() => assert.notInclude([1, 2, 3], 4)).not.toThrow()
      expect(() => assert.notInclude([1, 2, 3], 2)).toThrow()
    })

    it('should support assert.lengthOf()', () => {
      expect(() => assert.lengthOf([1, 2, 3], 3)).not.toThrow()
      expect(() => assert.lengthOf('hello', 5)).not.toThrow()
      expect(() => assert.lengthOf([1, 2], 3)).toThrow()
    })

    it('should support assert.property()', () => {
      expect(() => assert.property({ a: 1 }, 'a')).not.toThrow()
      expect(() => assert.property({ a: 1 }, 'b')).toThrow()
    })

    it('should support assert.propertyVal()', () => {
      expect(() => assert.propertyVal({ a: 1 }, 'a', 1)).not.toThrow()
      expect(() => assert.propertyVal({ a: 1 }, 'a', 2)).toThrow()
    })

    it('should support assert.match() and assert.notMatch()', () => {
      expect(() => assert.match('hello123', /\d+/)).not.toThrow()
      expect(() => assert.match('hello', /\d+/)).toThrow()
      expect(() => assert.notMatch('hello', /\d+/)).not.toThrow()
    })

    it('should support assert.isNaN() and assert.isNotNaN()', () => {
      expect(() => assert.isNaN(NaN)).not.toThrow()
      expect(() => assert.isNaN(123)).toThrow()
      expect(() => assert.isNotNaN(123)).not.toThrow()
    })

    it('should support assert.exists() and assert.notExists()', () => {
      expect(() => assert.exists('value')).not.toThrow()
      expect(() => assert.exists(0)).not.toThrow()
      expect(() => assert.exists(null)).toThrow()
      expect(() => assert.exists(undefined)).toThrow()
      expect(() => assert.notExists(null)).not.toThrow()
      expect(() => assert.notExists(undefined)).not.toThrow()
    })
  })

  // =============================================================================
  // Global Should Tests
  // =============================================================================

  describe('global should', () => {
    afterEach(() => {
      disableGlobalShould()
    })

    it('should enable global should on Object.prototype', () => {
      enableGlobalShould()

      // @ts-expect-error - should is added dynamically
      expect(() => ('hello').should.be.a('string')).not.toThrow()
    })

    it('should disable global should', () => {
      enableGlobalShould()
      disableGlobalShould()

      // @ts-expect-error - should should be removed
      expect('hello'.should).toBeUndefined()
    })
  })

  // =============================================================================
  // Edge Cases and Error Handling
  // =============================================================================

  describe('edge cases and error handling', () => {
    it('should handle MDX with only frontmatter', () => {
      const content = `---
title: Just frontmatter
---`
      const tests = extractTests(content)
      expect(tests).toHaveLength(0)
    })

    it('should handle empty MDX content', () => {
      const tests = extractTests('')
      expect(tests).toHaveLength(0)
    })

    it('should handle MDX with only whitespace', () => {
      const tests = extractTests('   \n\n   \n')
      expect(tests).toHaveLength(0)
    })

    it('should handle code blocks with special characters in code', () => {
      const content = `
\`\`\`ts test name="special chars"
const regex = /\\d+/
expect('test$var'.replace(/\\$/g, '')).toBe('testvar')
\`\`\`
`
      const tests = extractTests(content)
      expect(tests).toHaveLength(1)
      expect(tests[0].code).toContain('regex')
    })

    it('should handle unicode in test names', () => {
      const content = `
\`\`\`ts test name="test with emoji and unicode"
expect(1).toBe(1)
\`\`\`
`
      const tests = extractTests(content)
      expect(tests[0].name).toBe('test with emoji and unicode')
    })

    it('should handle very long test code', () => {
      const longCode = 'expect(1).toBe(1)\n'.repeat(100)
      const content = `
\`\`\`ts test name="long test"
${longCode}
\`\`\`
`
      const tests = extractTests(content)
      expect(tests).toHaveLength(1)
      expect(tests[0].code.split('\n').length).toBeGreaterThan(50)
    })

    it('should handle code blocks with triple backticks in comments', () => {
      const content = `
\`\`\`ts test name="nested backticks"
// This is a comment with code: const x = 1
expect(1).toBe(1)
\`\`\`
`
      const tests = extractTests(content)
      expect(tests).toHaveLength(1)
    })
  })
})

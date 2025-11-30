import { describe, it, expect } from 'vitest'
import {
  parseMeta,
  extractTests,
  generateTestCode,
  type TestBlock,
  type MDXTestFile,
} from '../index.js'
import { parse } from 'mdxld'

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
  })

  describe('extractTests', () => {
    it('should extract test blocks from MDX content', () => {
      const content = `
# Test Document

\`\`\`ts test name="should work"
expect(1 + 1).toBe(2)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('should work')
      expect(tests[0].lang).toBe('ts')
      expect(tests[0].code).toBe('expect(1 + 1).toBe(2)')
      expect(tests[0].async).toBe(false)
    })

    it('should extract multiple test blocks', () => {
      const content = `
# Tests

\`\`\`ts test name="test 1"
expect(true).toBe(true)
\`\`\`

Some text between tests.

\`\`\`ts test name="test 2"
expect(false).toBe(false)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(2)
      expect(tests[0].name).toBe('test 1')
      expect(tests[1].name).toBe('test 2')
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

    it('should detect async tests', () => {
      const content = `
\`\`\`ts test async name="async test"
await delay(100)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].async).toBe(true)
    })

    it('should include skipped tests with prefix', () => {
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
\`\`\`ts
// Just a code example
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

    it('should filter by language', () => {
      const content = `
\`\`\`ts test
expect(1).toBe(1)
\`\`\`

\`\`\`python test
assert 1 == 1
\`\`\`
`
      const tests = extractTests(content, { languages: ['ts', 'typescript'] })

      expect(tests).toHaveLength(1)
      expect(tests[0].lang).toBe('ts')
    })

    it('should use custom test flag', () => {
      const content = `
\`\`\`ts example
expect(1).toBe(1)
\`\`\`

\`\`\`ts test
expect(2).toBe(2)
\`\`\`
`
      const tests = extractTests(content, { testFlag: 'example' })

      expect(tests).toHaveLength(1)
      expect(tests[0].code).toBe('expect(1).toBe(1)')
    })

    it('should handle content with frontmatter', () => {
      const content = `---
title: Test Document
$type: Documentation
---

# Test Document

\`\`\`ts test name="frontmatter test"
expect(true).toBe(true)
\`\`\`
`
      const tests = extractTests(content)

      expect(tests).toHaveLength(1)
      expect(tests[0].name).toBe('frontmatter test')
    })
  })

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

    it('should indent multi-line test code', () => {
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

      expect(code).toContain('    const x = 1')
      expect(code).toContain('    const y = 2')
      expect(code).toContain('    expect(x + y).toBe(3)')
    })
  })
})

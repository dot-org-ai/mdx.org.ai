/**
 * Tests for MDX fixture creation helpers
 * RED PHASE: These tests define the expected behavior
 */

import { describe, it, expect } from 'vitest'
import {
  createMDXFixture,
  createSimpleMDX,
  createMDXWithFrontmatter,
  createMDXWithExports,
  createMDXWithCodeBlocks,
  createMDXWithComponents,
  FIXTURE_PRESETS,
} from '../src/fixtures'

describe('MDX Fixture Helpers', () => {
  describe('createMDXFixture', () => {
    it('should create basic MDX with just content', () => {
      const mdx = createMDXFixture({
        content: '# Hello World\n\nThis is a test.',
      })

      expect(mdx).toContain('# Hello World')
      expect(mdx).toContain('This is a test.')
    })

    it('should create MDX with frontmatter', () => {
      const mdx = createMDXFixture({
        frontmatter: {
          title: 'Test Document',
          description: 'A test MDX document',
        },
        content: '# Content',
      })

      expect(mdx).toContain('---')
      expect(mdx).toContain('title: Test Document')
      expect(mdx).toContain('description: A test MDX document')
      expect(mdx).toContain('# Content')
    })

    it('should create MDX with YAML-LD frontmatter ($type, $id)', () => {
      const mdx = createMDXFixture({
        frontmatter: {
          $type: 'BlogPost',
          $id: 'https://example.com/posts/test',
          title: 'Test Post',
        },
        content: '# Blog Post',
      })

      expect(mdx).toContain('$type: BlogPost')
      // URLs containing colons are quoted in YAML
      expect(mdx).toContain('$id:')
      expect(mdx).toContain('https://example.com/posts/test')
    })

    it('should create MDX with exports', () => {
      const mdx = createMDXFixture({
        exports: [
          {
            name: 'greet',
            type: 'function',
            body: '(name) => `Hello, ${name}!`',
          },
        ],
      })

      expect(mdx).toContain('export function greet')
      expect(mdx).toContain('Hello, ${name}!')
    })

    it('should create MDX with async exports', () => {
      const mdx = createMDXFixture({
        exports: [
          {
            name: 'fetchData',
            type: 'function',
            async: true,
            body: '(url) => { return { url, status: "fetched" } }',
          },
        ],
      })

      expect(mdx).toContain('export async function fetchData')
    })

    it('should create MDX with const exports', () => {
      const mdx = createMDXFixture({
        exports: [
          {
            name: 'CONFIG',
            type: 'const',
            body: '{ version: "1.0.0", name: "test" }',
          },
        ],
      })

      expect(mdx).toContain('export const CONFIG = { version: "1.0.0", name: "test" }')
    })

    it('should create MDX with class exports', () => {
      const mdx = createMDXFixture({
        exports: [
          {
            name: 'Calculator',
            type: 'class',
            body: 'constructor() { this.value = 0 } add(n) { this.value += n; return this }',
          },
        ],
      })

      expect(mdx).toContain('export class Calculator')
    })

    it('should create MDX with code blocks', () => {
      const mdx = createMDXFixture({
        codeBlocks: [
          {
            language: 'typescript',
            code: 'const x: number = 42;',
          },
        ],
      })

      expect(mdx).toContain('```typescript')
      expect(mdx).toContain('const x: number = 42;')
      expect(mdx).toContain('```')
    })

    it('should create MDX with test code blocks', () => {
      const mdx = createMDXFixture({
        codeBlocks: [
          {
            language: 'ts',
            code: 'expect(1 + 1).toBe(2)',
            meta: 'test name="should add numbers"',
          },
        ],
      })

      expect(mdx).toContain('```ts test name="should add numbers"')
      expect(mdx).toContain('expect(1 + 1).toBe(2)')
    })

    it('should create MDX with JSX components', () => {
      const mdx = createMDXFixture({
        components: [
          {
            name: 'Button',
            propsType: '{ label: string }',
            body: '<button>{props.label}</button>',
          },
        ],
      })

      expect(mdx).toContain('export function Button')
      expect(mdx).toContain('props')
    })

    it('should create complete MDX with all options', () => {
      const mdx = createMDXFixture({
        frontmatter: {
          $type: 'TestDoc',
          title: 'Complete Test',
        },
        content: '# Main Content\n\nSome text here.',
        exports: [
          {
            name: 'helper',
            type: 'function',
            body: '() => "helped"',
          },
        ],
        codeBlocks: [
          {
            language: 'js',
            code: 'console.log("example")',
          },
        ],
      })

      expect(mdx).toContain('---')
      expect(mdx).toContain('$type: TestDoc')
      expect(mdx).toContain('title: Complete Test')
      expect(mdx).toContain('# Main Content')
      expect(mdx).toContain('export function helper')
      expect(mdx).toContain('```js')
    })
  })

  describe('createSimpleMDX', () => {
    it('should create simple MDX with just content', () => {
      const mdx = createSimpleMDX('# Hello\n\nWorld')

      expect(mdx).toBe('# Hello\n\nWorld')
    })
  })

  describe('createMDXWithFrontmatter', () => {
    it('should create MDX with frontmatter and content', () => {
      const mdx = createMDXWithFrontmatter(
        { title: 'Test', author: 'Me' },
        '# Content'
      )

      expect(mdx).toContain('---')
      expect(mdx).toContain('title: Test')
      expect(mdx).toContain('author: Me')
      expect(mdx).toContain('---')
      expect(mdx).toContain('# Content')
    })

    it('should handle nested frontmatter objects', () => {
      const mdx = createMDXWithFrontmatter(
        {
          title: 'Test',
          metadata: {
            tags: ['a', 'b'],
            nested: { value: 1 },
          },
        },
        '# Content'
      )

      expect(mdx).toContain('title: Test')
      expect(mdx).toContain('metadata:')
    })
  })

  describe('createMDXWithExports', () => {
    it('should create MDX with function exports', () => {
      const mdx = createMDXWithExports([
        { name: 'add', type: 'function', body: '(a, b) => a + b' },
        { name: 'multiply', type: 'function', body: '(a, b) => a * b' },
      ])

      expect(mdx).toContain('export function add')
      expect(mdx).toContain('export function multiply')
    })

    it('should create MDX with default export', () => {
      const mdx = createMDXWithExports([
        {
          name: 'MyComponent',
          type: 'function',
          body: '() => <div>Hello</div>',
          isDefault: true,
        },
      ])

      expect(mdx).toContain('export default function MyComponent')
    })
  })

  describe('createMDXWithCodeBlocks', () => {
    it('should create MDX with multiple code blocks', () => {
      const mdx = createMDXWithCodeBlocks([
        { language: 'js', code: 'const a = 1' },
        { language: 'ts', code: 'const b: number = 2' },
      ])

      expect(mdx).toContain('```js')
      expect(mdx).toContain('const a = 1')
      expect(mdx).toContain('```ts')
      expect(mdx).toContain('const b: number = 2')
    })
  })

  describe('createMDXWithComponents', () => {
    it('should create MDX with component exports', () => {
      const mdx = createMDXWithComponents([
        { name: 'Card', body: '<div className="card">{children}</div>' },
      ])

      expect(mdx).toContain('export function Card')
      expect(mdx).toContain('className="card"')
    })
  })

  describe('FIXTURE_PRESETS', () => {
    it('should have basic preset', () => {
      expect(FIXTURE_PRESETS.basic).toBeDefined()
      expect(typeof FIXTURE_PRESETS.basic).toBe('string')
    })

    it('should have blog post preset', () => {
      expect(FIXTURE_PRESETS.blogPost).toBeDefined()
      expect(FIXTURE_PRESETS.blogPost).toContain('$type')
    })

    it('should have function exports preset', () => {
      expect(FIXTURE_PRESETS.withFunctions).toBeDefined()
      expect(FIXTURE_PRESETS.withFunctions).toContain('export')
    })

    it('should have test blocks preset', () => {
      expect(FIXTURE_PRESETS.withTests).toBeDefined()
      expect(FIXTURE_PRESETS.withTests).toContain('test')
    })

    it('should have component preset', () => {
      expect(FIXTURE_PRESETS.withComponents).toBeDefined()
    })

    it('should have error cases preset', () => {
      expect(FIXTURE_PRESETS.invalidSyntax).toBeDefined()
      expect(FIXTURE_PRESETS.invalidFrontmatter).toBeDefined()
    })
  })
})

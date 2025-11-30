import { describe, it, expect, beforeEach } from 'vitest'
import {
  compileToModule,
  createWorkerConfig,
  compileToWorkerConfig,
  generateModuleId,
  getExports,
  parse,
  type CompiledModule,
  type WorkerConfig,
  type SandboxOptions,
  type CompileToModuleOptions,
} from './index.js'

describe('@mdxe/isolate', () => {
  // ============================================================================
  // Test Fixtures
  // ============================================================================

  const fixtures = {
    simple: `# Hello World`,

    withFrontmatter: `---
title: Test Document
author: Test Author
tags:
  - mdx
  - test
---

# Hello World`,

    withExports: `---
title: Test
---

# Hello World

export function greet(name) {
  return \`Hello, \${name}!\`
}

export const PI = 3.14159

export const config = {
  theme: 'dark',
  version: 1
}`,

    withAsyncExport: `export async function fetchData(url) {
  return { url, fetched: true }
}

export async function* generateNumbers() {
  yield 1
  yield 2
  yield 3
}`,

    withClassExport: `export class Calculator {
  add(a, b) { return a + b }
  subtract(a, b) { return a - b }
}

export default class DefaultCalculator {
  multiply(a, b) { return a * b }
}`,

    withJsx: `export function Button({ children, onClick }) {
  return <button onClick={onClick}>{children}</button>
}

# My Document

<Button onClick={() => alert('clicked')}>Click me</Button>`,

    withComponents: `import { Card } from './components'

export function MyCard({ title }) {
  return <Card><h2>{title}</h2></Card>
}

# Welcome

<MyCard title="Hello" />`,

    withMultipleNamedExports: `export { foo, bar as baz } from './other'
export { default as qux } from './another'

export const local = 'value'`,

    complexFrontmatter: `---
title: Complex Document
metadata:
  created: 2024-01-01
  updated: 2024-12-01
  author:
    name: Test Author
    email: test@example.com
settings:
  theme: dark
  sidebar: true
  features:
    - feature1
    - feature2
tags: [mdx, test, complex]
count: 42
enabled: true
ratio: 3.14
---

# Complex Content`,

    withSpecialCharacters: `---
title: "Quotes and apostrophes"
description: Contains ampersand and angle brackets
path: /path/to/file
regex: "[a-z]+"
---

# Special Characters

Content here.`,

    empty: ``,

    whitespaceOnly: `

   `,

    frontmatterOnly: `---
title: Only Frontmatter
---`,

    codeOnly: `export const x = 1`,

    withCodeBlocks: `# Code Examples

\`\`\`javascript
const x = 1
export const y = 2
\`\`\`

\`\`\`typescript
export function typed(x: number): string {
  return x.toString()
}
\`\`\`

Real export:
export const realExport = 'real'`,

    withImports: `import { useState } from 'react'
import * as utils from './utils'
import defaultExport from './default'

export function Component() {
  const [state, setState] = useState(0)
  return <div>{state}</div>
}`,

    withReExports: `export * from './module1'
export * as namespace from './module2'
export { specific } from './module3'`,

    withDefaultExport: `export default function DefaultComponent() {
  return <div>Default</div>
}

export const named = 'named'`,

    multipleDefaultStyles: `// Arrow function default
export default () => <div>Arrow</div>`,

    withTypeExports: `export type MyType = { name: string }
export interface MyInterface { value: number }
export const realValue = 42`,

    largeContent: `---
title: Large Document
---

# Introduction

This is a large document with lots of content.

## Section 1

Paragraph content here.

## Section 2

More content here.

export const sectionCount = 2`,

    unicodeContent: `---
title: 日本語タイトル
author: 作者名
emoji: 🎉🚀💡
---

# Welcome 欢迎 ようこそ

Content with émojis 🎉 and ünïcödé characters.

export const greeting = '你好世界'
export const emoji = '🚀'`,

    withComments: `{/* JSX Comment */}

// JS Comment
export const a = 1

/* Multi
   line
   comment */
export const b = 2

# Heading

Some content here.`,

    nestedJsx: `export function Parent({ children }) {
  return (
    <div className="parent">
      <header>
        <nav>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/about">About</a></li>
          </ul>
        </nav>
      </header>
      <main>{children}</main>
      <footer>
        <p>Footer content</p>
      </footer>
    </div>
  )
}`,

    withSpreadProps: `export function Wrapper(props) {
  return <div {...props} className="wrapper" />
}

export function Forward({ as: Component = 'div', ...rest }) {
  return <Component {...rest} />
}`,
  }

  // ============================================================================
  // compileToModule Tests
  // ============================================================================

  describe('compileToModule', () => {
    describe('basic compilation', () => {
      it('compiles simple MDX content', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.mainModule).toBe('entry.js')
        expect(module.modules).toHaveProperty('entry.js')
        expect(module.modules).toHaveProperty('mdx.js')
        expect(module.hash).toBeDefined()
        expect(typeof module.hash).toBe('string')
      })

      it('compiles MDX with frontmatter', async () => {
        const module = await compileToModule(fixtures.withFrontmatter)

        expect(module.data.title).toBe('Test Document')
        expect(module.data.author).toBe('Test Author')
        expect(module.data.tags).toEqual(['mdx', 'test'])
      })

      it('compiles MDX with exports', async () => {
        const module = await compileToModule(fixtures.withExports)

        expect(module.modules['mdx.js']).toContain('greet')
        expect(module.modules['mdx.js']).toContain('PI')
        expect(module.modules['mdx.js']).toContain('config')
      })

      it('compiles MDX with JSX components', async () => {
        const module = await compileToModule(fixtures.withJsx)

        expect(module.modules['mdx.js']).toBeDefined()
        expect(module.modules['mdx.js']).toContain('Button')
      })

      it('compiles MDX with async exports', async () => {
        const module = await compileToModule(fixtures.withAsyncExport)

        expect(module.modules['mdx.js']).toContain('fetchData')
        expect(module.modules['mdx.js']).toContain('generateNumbers')
      })

      it('compiles MDX with class exports', async () => {
        const module = await compileToModule(fixtures.withClassExport)

        expect(module.modules['mdx.js']).toContain('Calculator')
        expect(module.modules['mdx.js']).toContain('DefaultCalculator')
      })

      it('compiles MDX with imports', async () => {
        const module = await compileToModule(fixtures.withImports)

        expect(module.modules['mdx.js']).toContain('useState')
        expect(module.modules['mdx.js']).toContain('Component')
      })
    })

    describe('module structure', () => {
      it('creates entry.js as main module', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.mainModule).toBe('entry.js')
        expect(module.modules['entry.js']).toContain('import * as MDXModule')
        expect(module.modules['entry.js']).toContain("export * from './mdx.js'")
      })

      it('entry.js contains health endpoint', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.modules['entry.js']).toContain('/health')
        expect(module.modules['entry.js']).toContain("status: 'ok'")
      })

      it('entry.js contains meta endpoint', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.modules['entry.js']).toContain('/meta')
        expect(module.modules['entry.js']).toContain('Object.keys(MDXModule)')
      })

      it('entry.js contains call endpoint', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.modules['entry.js']).toContain('/call/')
        expect(module.modules['entry.js']).toContain('Function not found')
      })

      it('creates exactly two modules by default', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(Object.keys(module.modules)).toHaveLength(2)
        expect(Object.keys(module.modules)).toContain('entry.js')
        expect(Object.keys(module.modules)).toContain('mdx.js')
      })
    })

    describe('options', () => {
      it('uses custom filename', async () => {
        const module = await compileToModule(fixtures.simple, { filename: 'custom.js' })

        expect(module.modules).toHaveProperty('custom.js')
        expect(module.modules).not.toHaveProperty('mdx.js')
      })

      it('bundles JSX runtime when bundleRuntime is true', async () => {
        const module = await compileToModule(fixtures.simple, { bundleRuntime: true })

        expect(module.modules).toHaveProperty('jsx-runtime.js')
        expect(Object.keys(module.modules)).toHaveLength(3)
      })

      it('JSX runtime contains Fragment and jsx functions', async () => {
        const module = await compileToModule(fixtures.simple, { bundleRuntime: true })

        expect(module.modules['jsx-runtime.js']).toContain('Fragment')
        expect(module.modules['jsx-runtime.js']).toContain('function jsx')
        expect(module.modules['jsx-runtime.js']).toContain('function jsxs')
      })

      it('uses bundled runtime import when bundleRuntime is true', async () => {
        const module = await compileToModule(fixtures.withJsx, { bundleRuntime: true })

        expect(module.modules['mdx.js']).toContain('./jsx-runtime.js')
      })

      it('uses react import source by default', async () => {
        const module = await compileToModule(fixtures.withJsx, { bundleRuntime: false })

        expect(module.modules['mdx.js']).toContain('react')
      })

      it('supports custom jsxImportSource', async () => {
        const module = await compileToModule(fixtures.withJsx, {
          jsxImportSource: 'preact',
          bundleRuntime: false,
        })

        expect(module.modules['mdx.js']).toContain('preact')
      })
    })

    describe('frontmatter parsing', () => {
      it('parses simple frontmatter', async () => {
        const module = await compileToModule(fixtures.withFrontmatter)

        expect(module.data.title).toBe('Test Document')
        expect(module.data.author).toBe('Test Author')
      })

      it('parses complex nested frontmatter', async () => {
        const module = await compileToModule(fixtures.complexFrontmatter)

        expect(module.data.title).toBe('Complex Document')
        expect(module.data.metadata).toEqual({
          created: '2024-01-01',
          updated: '2024-12-01',
          author: {
            name: 'Test Author',
            email: 'test@example.com',
          },
        })
        expect(module.data.settings).toEqual({
          theme: 'dark',
          sidebar: true,
          features: ['feature1', 'feature2'],
        })
        expect(module.data.tags).toEqual(['mdx', 'test', 'complex'])
        expect(module.data.count).toBe(42)
        expect(module.data.enabled).toBe(true)
        expect(module.data.ratio).toBe(3.14)
      })

      it('parses frontmatter with special characters', async () => {
        const module = await compileToModule(fixtures.withSpecialCharacters)

        expect(module.data.title).toBe('Quotes and apostrophes')
        expect(module.data.description).toBe('Contains ampersand and angle brackets')
        expect(module.data.path).toBe('/path/to/file')
        expect(module.data.regex).toBe('[a-z]+')
      })

      it('returns empty data for content without frontmatter', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.data).toEqual({})
      })

      it('parses unicode frontmatter', async () => {
        const module = await compileToModule(fixtures.unicodeContent)

        expect(module.data.title).toBe('日本語タイトル')
        expect(module.data.author).toBe('作者名')
        expect(module.data.emoji).toBe('🎉🚀💡')
      })
    })

    describe('edge cases', () => {
      it('handles empty content', async () => {
        const module = await compileToModule(fixtures.empty)

        expect(module.mainModule).toBe('entry.js')
        expect(module.modules).toHaveProperty('mdx.js')
        expect(module.data).toEqual({})
      })

      it('handles whitespace-only content', async () => {
        const module = await compileToModule(fixtures.whitespaceOnly)

        expect(module.mainModule).toBe('entry.js')
        expect(module.modules).toHaveProperty('mdx.js')
      })

      it('handles frontmatter-only content', async () => {
        const module = await compileToModule(fixtures.frontmatterOnly)

        expect(module.data.title).toBe('Only Frontmatter')
        expect(module.modules).toHaveProperty('mdx.js')
      })

      it('handles code-only content', async () => {
        const module = await compileToModule(fixtures.codeOnly)

        expect(module.modules['mdx.js']).toContain('x')
      })

      it('handles large content', async () => {
        const module = await compileToModule(fixtures.largeContent)

        expect(module.mainModule).toBe('entry.js')
        expect(module.data.title).toBe('Large Document')
        expect(module.hash).toBeDefined()
      })

      it('handles unicode content in body', async () => {
        const module = await compileToModule(fixtures.unicodeContent)

        expect(module.modules['mdx.js']).toContain('greeting')
        expect(module.modules['mdx.js']).toContain('emoji')
      })

      it('handles content with comments', async () => {
        const module = await compileToModule(fixtures.withComments)

        expect(module.modules['mdx.js']).toBeDefined()
      })
    })

    describe('hash generation', () => {
      it('generates consistent hash for same content', async () => {
        const module1 = await compileToModule(fixtures.simple)
        const module2 = await compileToModule(fixtures.simple)

        expect(module1.hash).toBe(module2.hash)
      })

      it('generates different hash for different content', async () => {
        const module1 = await compileToModule(fixtures.simple)
        const module2 = await compileToModule(fixtures.withFrontmatter)

        expect(module1.hash).not.toBe(module2.hash)
      })

      it('hash changes when frontmatter changes', async () => {
        const content1 = `---\ntitle: A\n---\n# Hello`
        const content2 = `---\ntitle: B\n---\n# Hello`

        const module1 = await compileToModule(content1)
        const module2 = await compileToModule(content2)

        expect(module1.hash).not.toBe(module2.hash)
      })

      it('hash is alphanumeric', async () => {
        const module = await compileToModule(fixtures.simple)

        expect(module.hash).toMatch(/^[a-z0-9]+$/i)
      })
    })

    describe('error handling', () => {
      it('throws on invalid MDX syntax', async () => {
        const invalidMdx = `<Component unclosed`

        await expect(compileToModule(invalidMdx)).rejects.toThrow()
      })

      it('throws on invalid JSX', async () => {
        const invalidJsx = `export function Bad() { return <div>< }`

        await expect(compileToModule(invalidJsx)).rejects.toThrow()
      })

      it('throws on invalid JavaScript export', async () => {
        const invalidJs = `export const = 'missing name'`

        await expect(compileToModule(invalidJs)).rejects.toThrow()
      })
    })
  })

  // ============================================================================
  // createWorkerConfig Tests
  // ============================================================================

  describe('createWorkerConfig', () => {
    let compiledModule: CompiledModule

    beforeEach(async () => {
      compiledModule = await compileToModule(fixtures.withExports)
    })

    describe('basic configuration', () => {
      it('creates valid worker config', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.compatibilityDate).toBeDefined()
        expect(config.mainModule).toBe('entry.js')
        expect(config.modules).toEqual(compiledModule.modules)
      })

      it('sets compatibility date', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.compatibilityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })

      it('includes all modules from compiled module', () => {
        const config = createWorkerConfig(compiledModule)

        expect(Object.keys(config.modules)).toEqual(Object.keys(compiledModule.modules))
      })

      it('includes empty env by default', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.env).toEqual({})
      })
    })

    describe('sandbox options', () => {
      it('blocks network by default', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.globalOutbound).toBeNull()
      })

      it('blocks network when blockNetwork is true', () => {
        const config = createWorkerConfig(compiledModule, { blockNetwork: true })

        expect(config.globalOutbound).toBeNull()
      })

      it('allows network when blockNetwork is false', () => {
        const config = createWorkerConfig(compiledModule, { blockNetwork: false })

        expect(config.globalOutbound).toBeUndefined()
      })

      it('accepts empty sandbox options', () => {
        const config = createWorkerConfig(compiledModule, {})

        expect(config.globalOutbound).toBeNull() // default is true
      })

      it('ignores unknown sandbox options', () => {
        const config = createWorkerConfig(compiledModule, {
          blockNetwork: true,
          unknownOption: 'value',
        } as SandboxOptions)

        expect(config.globalOutbound).toBeNull()
      })
    })

    describe('module preservation', () => {
      it('preserves entry.js content', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.modules['entry.js']).toBe(compiledModule.modules['entry.js'])
      })

      it('preserves mdx.js content', () => {
        const config = createWorkerConfig(compiledModule)

        expect(config.modules['mdx.js']).toBe(compiledModule.modules['mdx.js'])
      })

      it('preserves jsx-runtime.js when present', async () => {
        const moduleWithRuntime = await compileToModule(fixtures.simple, { bundleRuntime: true })
        const config = createWorkerConfig(moduleWithRuntime)

        expect(config.modules['jsx-runtime.js']).toBe(moduleWithRuntime.modules['jsx-runtime.js'])
      })
    })
  })

  // ============================================================================
  // compileToWorkerConfig Tests
  // ============================================================================

  describe('compileToWorkerConfig', () => {
    it('combines compile and config creation', async () => {
      const result = await compileToWorkerConfig(fixtures.withExports)

      expect(result.mainModule).toBe('entry.js')
      expect(result.modules).toHaveProperty('entry.js')
      expect(result.modules).toHaveProperty('mdx.js')
      expect(result.hash).toBeDefined()
      expect(result.data.title).toBe('Test')
    })

    it('passes compile options through', async () => {
      const result = await compileToWorkerConfig(fixtures.simple, {
        filename: 'custom.js',
        bundleRuntime: true,
      })

      expect(result.modules).toHaveProperty('custom.js')
      expect(result.modules).toHaveProperty('jsx-runtime.js')
    })

    it('passes sandbox options through', async () => {
      const blocked = await compileToWorkerConfig(fixtures.simple, {
        sandbox: { blockNetwork: true },
      })
      const unblocked = await compileToWorkerConfig(fixtures.simple, {
        sandbox: { blockNetwork: false },
      })

      expect(blocked.globalOutbound).toBeNull()
      expect(unblocked.globalOutbound).toBeUndefined()
    })

    it('returns hash from compilation', async () => {
      const result = await compileToWorkerConfig(fixtures.withExports)

      expect(typeof result.hash).toBe('string')
      expect(result.hash.length).toBeGreaterThan(0)
    })

    it('returns data from compilation', async () => {
      const result = await compileToWorkerConfig(fixtures.complexFrontmatter)

      expect(result.data.title).toBe('Complex Document')
      expect(result.data.metadata).toBeDefined()
    })

    it('handles content without frontmatter', async () => {
      const result = await compileToWorkerConfig(fixtures.simple)

      expect(result.data).toEqual({})
      expect(result.hash).toBeDefined()
    })
  })

  // ============================================================================
  // generateModuleId Tests
  // ============================================================================

  describe('generateModuleId', () => {
    describe('consistency', () => {
      it('generates consistent ID for same content', () => {
        const id1 = generateModuleId('test content')
        const id2 = generateModuleId('test content')

        expect(id1).toBe(id2)
      })

      it('generates different ID for different content', () => {
        const id1 = generateModuleId('content a')
        const id2 = generateModuleId('content b')

        expect(id1).not.toBe(id2)
      })

      it('is case sensitive', () => {
        const id1 = generateModuleId('Content')
        const id2 = generateModuleId('content')

        expect(id1).not.toBe(id2)
      })

      it('is whitespace sensitive', () => {
        const id1 = generateModuleId('a b')
        const id2 = generateModuleId('a  b')

        expect(id1).not.toBe(id2)
      })
    })

    describe('versioning', () => {
      it('includes version in ID when provided', () => {
        const id = generateModuleId('test', 'v1')

        expect(id).toContain('-v1')
      })

      it('different versions produce different IDs', () => {
        const id1 = generateModuleId('test', 'v1')
        const id2 = generateModuleId('test', 'v2')

        expect(id1).not.toBe(id2)
      })

      it('same content without version differs from versioned', () => {
        const id1 = generateModuleId('test')
        const id2 = generateModuleId('test', 'v1')

        expect(id1).not.toBe(id2)
      })

      it('handles empty version string as no version', () => {
        const id1 = generateModuleId('test', '')
        const id2 = generateModuleId('test')

        // Empty string is falsy, so treated same as no version
        expect(id1).toBe(id2)
      })

      it('handles complex version strings', () => {
        const id = generateModuleId('test', '1.0.0-beta.1')

        expect(id).toContain('-1.0.0-beta.1')
      })
    })

    describe('format', () => {
      it('returns alphanumeric string', () => {
        const id = generateModuleId('test')

        expect(id).toMatch(/^[a-z0-9]+$/i)
      })

      it('handles empty content', () => {
        const id = generateModuleId('')

        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })

      it('handles very long content', () => {
        const longContent = 'a'.repeat(100000)
        const id = generateModuleId(longContent)

        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
        expect(id.length).toBeLessThan(50) // Hash should be reasonable length
      })

      it('handles unicode content', () => {
        const id = generateModuleId('日本語コンテンツ 🎉')

        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
      })

      it('handles special characters', () => {
        const id = generateModuleId('<script>alert("xss")</script>')

        expect(typeof id).toBe('string')
        expect(id).toMatch(/^[a-z0-9]+$/i)
      })
    })
  })

  // ============================================================================
  // getExports Tests
  // ============================================================================

  describe('getExports', () => {
    // Note: getExports looks at the mainModule content (entry.js by default),
    // which uses namespace re-exports. To test export extraction, we create
    // modules with the mainModule pointing to the actual code.

    describe('function exports', () => {
      it('extracts named function exports from code', () => {
        const code = `export function myFunction() { return 1 }`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('myFunction')
      })

      it('extracts async function exports from code', () => {
        const code = `export async function asyncFunc() { return 1 }`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('asyncFunc')
      })

      it('extracts arrow function exports from code', () => {
        const code = `export const arrowFunc = () => 1`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('arrowFunc')
      })
    })

    describe('variable exports', () => {
      it('extracts const exports from code', () => {
        const code = `export const MY_CONST = 'value'`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('MY_CONST')
      })

      it('extracts let exports from code', () => {
        const code = `export let myLet = 'value'`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('myLet')
      })

      it('extracts var exports from code', () => {
        const code = `export var myVar = 'value'`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('myVar')
      })
    })

    describe('class exports', () => {
      it('extracts class exports from code', () => {
        const code = `export class MyClass {}`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('MyClass')
      })
    })

    describe('named exports', () => {
      it('extracts named exports from braces', () => {
        const code = `const a = 1; const b = 2; export { a, b }`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('a')
        expect(exports).toContain('b')
      })

      it('extracts aliased exports from braces', () => {
        const code = `const original = 1; export { original as aliased }`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('aliased')
      })
    })

    describe('edge cases', () => {
      it('returns array for module with no exports', () => {
        const code = `const internal = 1`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(Array.isArray(exports)).toBe(true)
        expect(exports).toHaveLength(0)
      })

      it('does not include default export in named exports', () => {
        const code = `export default function() { return 1 }`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).not.toContain('default')
      })

      it('handles multiple exports', () => {
        const code = `
export const a = 1
export const b = 2
export function c() {}
export class D {}
`
        const module: CompiledModule = {
          mainModule: 'main.js',
          modules: { 'main.js': code },
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(exports).toContain('a')
        expect(exports).toContain('b')
        expect(exports).toContain('c')
        expect(exports).toContain('D')
      })

      it('returns empty for compiled MDX (entry.js uses re-exports)', async () => {
        // Entry module uses namespace import, so getExports on it returns empty
        const module = await compileToModule(fixtures.withExports)
        const exports = getExports(module)

        // The main module is entry.js which uses `export * from './mdx.js'`
        // This pattern isn't matched by the simple regex
        expect(Array.isArray(exports)).toBe(true)
      })

      it('handles missing module gracefully', () => {
        const module: CompiledModule = {
          mainModule: 'nonexistent.js',
          modules: {},
          data: {},
          hash: 'test',
        }
        const exports = getExports(module)

        expect(Array.isArray(exports)).toBe(true)
        expect(exports).toHaveLength(0)
      })
    })
  })

  // ============================================================================
  // parse (re-export) Tests
  // ============================================================================

  describe('parse', () => {
    it('parses MDX with frontmatter', () => {
      const doc = parse(fixtures.withFrontmatter)

      expect(doc.data.title).toBe('Test Document')
      expect(doc.content).toContain('# Hello World')
    })

    it('parses MDX without frontmatter', () => {
      const doc = parse(fixtures.simple)

      expect(doc.data).toEqual({})
      expect(doc.content).toContain('# Hello World')
    })

    it('handles complex frontmatter', () => {
      const doc = parse(fixtures.complexFrontmatter)

      expect(doc.data.metadata).toBeDefined()
      expect(doc.data.settings).toBeDefined()
    })
  })

  // ============================================================================
  // Type Export Tests
  // ============================================================================

  describe('type exports', () => {
    it('CompiledModule has correct shape', async () => {
      const module: CompiledModule = await compileToModule(fixtures.simple)

      expect(module).toHaveProperty('mainModule')
      expect(module).toHaveProperty('modules')
      expect(module).toHaveProperty('data')
      expect(module).toHaveProperty('hash')
    })

    it('WorkerConfig has correct shape', async () => {
      const module = await compileToModule(fixtures.simple)
      const config: WorkerConfig = createWorkerConfig(module)

      expect(config).toHaveProperty('compatibilityDate')
      expect(config).toHaveProperty('mainModule')
      expect(config).toHaveProperty('modules')
      expect(config).toHaveProperty('env')
      expect(config).toHaveProperty('globalOutbound')
    })
  })

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('integration', () => {
    it('full pipeline: compile -> config -> worker setup', async () => {
      const content = `---
title: Integration Test
---

export function add(a, b) {
  return a + b
}

export const multiply = (a, b) => a * b

# Calculator

A simple calculator module.
`

      // Step 1: Compile to module
      const module = await compileToModule(content, { bundleRuntime: true })

      expect(module.mainModule).toBe('entry.js')
      expect(module.data.title).toBe('Integration Test')
      expect(Object.keys(module.modules)).toHaveLength(3) // entry, mdx, jsx-runtime

      // Step 2: Create worker config
      const config = createWorkerConfig(module, { blockNetwork: true })

      expect(config.compatibilityDate).toBeDefined()
      expect(config.globalOutbound).toBeNull()

      // Step 3: Generate module ID for caching
      const moduleId = generateModuleId(content, 'v1')

      expect(moduleId).toContain('-v1')

      // Step 4: Get exports
      const exports = getExports(module)

      expect(Array.isArray(exports)).toBe(true)
    })

    it('handles real-world MDX document', async () => {
      const realWorldMdx = `---
title: Building a REST API
description: Learn how to build a REST API with Node.js
author:
  name: John Doe
  twitter: "@johndoe"
publishedAt: 2024-01-15
tags:
  - nodejs
  - api
  - tutorial
---

import { CodeBlock } from './components'
import { Alert } from '@/ui'

export const metadata = {
  readTime: '10 min',
  difficulty: 'intermediate'
}

export function calculateReadTime(wordCount) {
  return Math.ceil(wordCount / 200)
}

# {frontmatter.title}

<Alert type="info">
  This tutorial assumes basic knowledge of JavaScript.
</Alert>

## Introduction

In this tutorial, we'll build a REST API using Node.js.

<CodeBlock language="javascript">
const express = require('express')
const app = express()
</CodeBlock>

## Conclusion

You've learned how to build a basic REST API!
`

      const module = await compileToModule(realWorldMdx)

      expect(module.data.title).toBe('Building a REST API')
      expect(module.data.author).toEqual({
        name: 'John Doe',
        twitter: '@johndoe',
      })
      expect(module.data.tags).toContain('nodejs')
      expect(module.modules['mdx.js']).toContain('metadata')
      expect(module.modules['mdx.js']).toContain('calculateReadTime')
    })
  })
})

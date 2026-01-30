/**
 * MDX Fixture Creation Helpers
 *
 * Provides utilities for creating MDX test fixtures with various configurations.
 */

import type {
  MDXFixtureOptions,
  CodeBlockOptions,
  ExportDefinition,
  ComponentDefinition,
} from './types'

/**
 * Serialize a value to YAML format
 */
function serializeYAMLValue(value: unknown, indent: number = 0): string {
  const prefix = '  '.repeat(indent)

  if (value === null || value === undefined) {
    return 'null'
  }

  if (typeof value === 'string') {
    // Check if string needs quoting
    if (
      value.includes(':') ||
      value.includes('#') ||
      value.includes('\n') ||
      value.startsWith(' ') ||
      value.endsWith(' ')
    ) {
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return value
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    return value.map((item) => `\n${prefix}  - ${serializeYAMLValue(item, indent + 1)}`).join('')
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)
    if (entries.length === 0) return '{}'
    return entries
      .map(([k, v]) => {
        const serialized = serializeYAMLValue(v, indent + 1)
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          return `\n${prefix}  ${k}:${serialized}`
        }
        if (Array.isArray(v)) {
          return `\n${prefix}  ${k}:${serialized}`
        }
        return `\n${prefix}  ${k}: ${serialized}`
      })
      .join('')
  }

  return String(value)
}

/**
 * Serialize frontmatter object to YAML string
 */
function serializeFrontmatter(frontmatter: Record<string, unknown>): string {
  const lines: string[] = []

  for (const [key, value] of Object.entries(frontmatter)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${key}:${serializeYAMLValue(value, 0)}`)
    } else if (Array.isArray(value)) {
      lines.push(`${key}:${serializeYAMLValue(value, 0)}`)
    } else {
      lines.push(`${key}: ${serializeYAMLValue(value, 0)}`)
    }
  }

  return lines.join('\n')
}

/**
 * Generate export code from export definition
 */
function generateExport(exp: ExportDefinition): string {
  const defaultKeyword = exp.isDefault ? 'default ' : ''
  const asyncKeyword = exp.async ? 'async ' : ''

  switch (exp.type) {
    case 'function':
      return `export ${defaultKeyword}${asyncKeyword}function ${exp.name}${exp.body}`
    case 'const':
      return `export ${defaultKeyword ? 'default ' : ''}const ${exp.name} = ${exp.body}`
    case 'class':
      return `export ${defaultKeyword}class ${exp.name} {\n  ${exp.body}\n}`
    default:
      return ''
  }
}

/**
 * Generate code block string
 */
function generateCodeBlock(block: CodeBlockOptions): string {
  const meta = block.meta ? ` ${block.meta}` : ''
  return `\`\`\`${block.language}${meta}\n${block.code}\n\`\`\``
}

/**
 * Generate component export code
 */
function generateComponent(comp: ComponentDefinition): string {
  return `export function ${comp.name}(props) {\n  return ${comp.body}\n}`
}

/**
 * Create an MDX fixture with the specified options
 */
export function createMDXFixture(options: MDXFixtureOptions): string {
  const parts: string[] = []

  // Add frontmatter
  if (options.frontmatter && Object.keys(options.frontmatter).length > 0) {
    parts.push('---')
    parts.push(serializeFrontmatter(options.frontmatter))
    parts.push('---')
    parts.push('')
  }

  // Add exports
  if (options.exports && options.exports.length > 0) {
    for (const exp of options.exports) {
      parts.push(generateExport(exp))
      parts.push('')
    }
  }

  // Add components
  if (options.components && options.components.length > 0) {
    for (const comp of options.components) {
      parts.push(generateComponent(comp))
      parts.push('')
    }
  }

  // Add content
  if (options.content) {
    parts.push(options.content)
    parts.push('')
  }

  // Add code blocks
  if (options.codeBlocks && options.codeBlocks.length > 0) {
    for (const block of options.codeBlocks) {
      parts.push(generateCodeBlock(block))
      parts.push('')
    }
  }

  return parts.join('\n').trim()
}

/**
 * Create simple MDX with just content
 */
export function createSimpleMDX(content: string): string {
  return content
}

/**
 * Create MDX with frontmatter and content
 */
export function createMDXWithFrontmatter(
  frontmatter: Record<string, unknown>,
  content: string = ''
): string {
  return createMDXFixture({ frontmatter, content })
}

/**
 * Create MDX with exports
 */
export function createMDXWithExports(exports: ExportDefinition[]): string {
  return createMDXFixture({ exports })
}

/**
 * Create MDX with code blocks
 */
export function createMDXWithCodeBlocks(codeBlocks: CodeBlockOptions[]): string {
  return createMDXFixture({ codeBlocks })
}

/**
 * Create MDX with component exports
 */
export function createMDXWithComponents(components: ComponentDefinition[]): string {
  return createMDXFixture({ components })
}

/**
 * Pre-built fixture presets for common test scenarios
 */
export const FIXTURE_PRESETS = {
  /** Basic MDX with just a heading */
  basic: createMDXFixture({
    content: '# Hello World\n\nThis is basic MDX content.',
  }),

  /** Blog post with YAML-LD frontmatter */
  blogPost: createMDXFixture({
    frontmatter: {
      $type: 'BlogPost',
      $id: 'https://example.com/posts/test',
      title: 'Test Blog Post',
      author: 'Test Author',
      date: '2024-01-01',
      tags: ['test', 'example'],
    },
    content: '# Test Blog Post\n\nThis is the blog post content.',
  }),

  /** MDX with function exports */
  withFunctions: createMDXFixture({
    exports: [
      {
        name: 'greet',
        type: 'function',
        body: '(name) {\n  return `Hello, ${name}!`\n}',
      },
      {
        name: 'add',
        type: 'function',
        body: '(a, b) {\n  return a + b\n}',
      },
    ],
    content: '# Functions\n\nThis MDX has exported functions.',
  }),

  /** MDX with async function exports */
  withAsyncFunctions: createMDXFixture({
    exports: [
      {
        name: 'fetchData',
        type: 'function',
        async: true,
        body: '(url) {\n  return { url, status: "fetched" }\n}',
      },
    ],
    content: '# Async Functions',
  }),

  /** MDX with test code blocks */
  withTests: createMDXFixture({
    content: '# Tests\n\nThis MDX has embedded tests.',
    codeBlocks: [
      {
        language: 'ts',
        code: 'expect(1 + 1).toBe(2)',
        meta: 'test name="should add numbers"',
      },
      {
        language: 'ts',
        code: 'expect("hello").toContain("ell")',
        meta: 'test name="should contain substring"',
      },
    ],
  }),

  /** MDX with React components */
  withComponents: createMDXFixture({
    components: [
      {
        name: 'Button',
        propsType: '{ label: string; onClick?: () => void }',
        body: '<button onClick={props.onClick}>{props.label}</button>',
      },
      {
        name: 'Card',
        propsType: '{ title: string; children: React.ReactNode }',
        body: '<div className="card"><h2>{props.title}</h2>{props.children}</div>',
      },
    ],
    content: '# Components\n\nThis MDX has component exports.',
  }),

  /** Complete example with all features */
  complete: createMDXFixture({
    frontmatter: {
      $type: 'Document',
      title: 'Complete Example',
      version: '1.0.0',
      metadata: {
        author: 'Test',
        tags: ['complete', 'example'],
      },
    },
    exports: [
      {
        name: 'helper',
        type: 'function',
        body: '() {\n  return "helped"\n}',
      },
      {
        name: 'CONFIG',
        type: 'const',
        body: '{ version: "1.0.0" }',
      },
    ],
    content: '# Complete Example\n\nThis has frontmatter, exports, and code blocks.',
    codeBlocks: [
      {
        language: 'typescript',
        code: 'const x: number = 42;',
      },
    ],
  }),

  /** Invalid MDX syntax for error testing */
  invalidSyntax: '<Component unclosed',

  /** Invalid frontmatter for error testing */
  invalidFrontmatter: `---
title: [invalid yaml
---

# Content`,

  /** MDX with class export */
  withClass: createMDXFixture({
    exports: [
      {
        name: 'Calculator',
        type: 'class',
        body: `constructor(initialValue = 0) {
    this.value = initialValue
  }

  add(n) {
    this.value += n
    return this
  }

  getValue() {
    return this.value
  }`,
      },
    ],
    content: '# Calculator Class',
  }),

  /** MDX with default export */
  withDefaultExport: createMDXFixture({
    exports: [
      {
        name: 'MainComponent',
        type: 'function',
        body: '(props) {\n  return <div>Main</div>\n}',
        isDefault: true,
      },
    ],
    content: '',
  }),

  /** MDX with multiple code blocks of different languages */
  multiLanguageCodeBlocks: createMDXFixture({
    content: '# Multi-language Examples',
    codeBlocks: [
      { language: 'javascript', code: 'const x = 42;' },
      { language: 'typescript', code: 'const y: number = 42;' },
      { language: 'python', code: 'x = 42' },
      { language: 'bash', code: 'echo "hello"' },
    ],
  }),

  /** Empty MDX */
  empty: '',

  /** Just frontmatter, no content */
  frontmatterOnly: createMDXFixture({
    frontmatter: {
      title: 'Frontmatter Only',
      description: 'No content below',
    },
  }),
}

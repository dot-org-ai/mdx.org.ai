import { describe, it, expect } from 'vitest'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import remarkGfm from 'remark-gfm'
import { VFile } from 'vfile'
import { remarkMDXLD, getMDXLDData, presets, type ExtendedCodeNode } from './index.js'

describe('remarkMDXLD', () => {
  // Create a processor with parse + stringify + plugins
  const createProcessor = (options?: Parameters<typeof remarkMDXLD>[0]) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)  // GFM needs to be added explicitly
      .use(remarkMDXLD, options)
      .use(remarkStringify)

  // Create a simpler processor for just running transformations
  const createRunProcessor = (options?: Parameters<typeof remarkMDXLD>[0]) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMDXLD, options)

  // Helper to run processor and get file with data
  const runWithFile = async (
    processor: ReturnType<typeof unified>,
    content: string
  ) => {
    const file = new VFile(content)
    const tree = processor.parse(file)
    await processor.run(tree, file)
    return { tree, file }
  }

  describe('GFM support', () => {
    it('should parse tables', () => {
      const content = `
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
`
      const tree = createRunProcessor().parse(content)
      // GFM tables should be parsed
      expect(JSON.stringify(tree)).toContain('table')
    })

    it('should parse task lists', () => {
      const content = `
- [x] Done
- [ ] Todo
`
      const tree = createRunProcessor().parse(content)
      // Should contain list items (GFM task lists are list items with checkbox data)
      expect(JSON.stringify(tree)).toContain('listItem')
    })

    it('should parse strikethrough', () => {
      const content = `~~deleted~~`
      const tree = createRunProcessor().parse(content)
      // GFM strikethrough creates delete nodes
      expect(JSON.stringify(tree)).toContain('delete')
    })

    it('can be disabled by not including remarkGfm', () => {
      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD, { gfm: false })
      const content = `~~not strikethrough~~`
      const tree = processor.parse(content)
      // Without GFM, ~~ is not parsed as strikethrough
      expect(JSON.stringify(tree)).not.toContain('delete')
    })
  })

  describe('code block attributes', () => {
    it('should parse attributes from meta string', async () => {
      const content = '```ts {title="Example"} {highlight}\nconst x = 1\n```'
      const { file } = await runWithFile(createProcessor(), content)
      const data = file.data.mdxld

      expect(data?.attributes?.size).toBe(1)
      const attrs = Array.from(data?.attributes?.values() ?? [])
      expect(attrs[0]).toEqual({
        title: 'Example',
        highlight: true,
      })
    })

    it('should attach attributes to nodes', async () => {
      const content = '```ts {lineNumbers}\ncode\n```'
      const { tree } = await runWithFile(createRunProcessor(), content)

      // Find code node
      const codeNode = (tree as { children: Array<{ type: string }> }).children.find(
        (n) => n.type === 'code'
      ) as ExtendedCodeNode | undefined

      expect(codeNode?.attributes).toEqual({ lineNumbers: true })
    })

    it('can be disabled', async () => {
      const content = '```ts {ignored}\ncode\n```'
      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD, { attributes: false })
      const { file } = await runWithFile(processor, content)
      const data = file.data.mdxld

      expect(data?.attributes?.size).toBe(0)
    })
  })

  describe('mermaid parsing', () => {
    it('should parse mermaid code blocks', async () => {
      const content = `
\`\`\`mermaid
flowchart TD
  A --> B
\`\`\`
`
      const { file } = await runWithFile(createProcessor(), content)
      const data = file.data.mdxld

      expect(data?.mermaid).toHaveLength(1)
      expect(data?.mermaid?.[0]?.ast.type).toBe('flowchart')
      expect(data?.mermaid?.[0]?.ast.nodes).toHaveLength(2)
    })

    it('should attach mermaid AST to code nodes', async () => {
      const content = '```mermaid\nflowchart TD\n  A --> B\n```'
      const { tree } = await runWithFile(createRunProcessor(), content)

      const codeNode = (tree as { children: Array<{ type: string }> }).children.find(
        (n) => n.type === 'code'
      ) as ExtendedCodeNode | undefined

      expect(codeNode?.mermaidAST).toBeDefined()
      expect(codeNode?.mermaidAST?.type).toBe('flowchart')
    })

    it('can be disabled', async () => {
      const content = '```mermaid\nflowchart TD\n  A --> B\n```'
      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD, { mermaid: false })
      const { file } = await runWithFile(processor, content)
      const data = file.data.mdxld

      expect(data?.mermaid).toHaveLength(0)
    })
  })

  describe('custom code handlers', () => {
    it('should call custom handler for matching language', async () => {
      let handlerCalled = false
      const content = '```sql\nSELECT * FROM users\n```'

      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD, {
          codeHandlers: {
            sql: (node) => {
              handlerCalled = true
              expect(node.value).toBe('SELECT * FROM users')
            },
          },
        })

      await runWithFile(processor, content)

      expect(handlerCalled).toBe(true)
    })

    it('should allow removing nodes', async () => {
      const content = '```remove-me\nthis will be gone\n```'
      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD, {
          codeHandlers: {
            'remove-me': () => null,
          },
        })

      const { tree } = await runWithFile(processor, content)

      const codeNodes = (tree as { children: Array<{ type: string }> }).children.filter(
        (n) => n.type === 'code'
      )
      expect(codeNodes).toHaveLength(0)
    })
  })

  describe('getMDXLDData', () => {
    it('should return MDXLD data from processed file', async () => {
      const content = '```mermaid\npie\n```'
      const processor = unified()
        .use(remarkParse)
        .use(remarkMDXLD)
      const { file } = await runWithFile(processor, content)
      const data = getMDXLDData(file)

      expect(data).toBeDefined()
      expect(data?.mermaid).toBeDefined()
      expect(data?.attributes).toBeDefined()
    })

    it('should return undefined for unprocessed files', () => {
      const data = getMDXLDData({ data: {} })
      expect(data).toBeUndefined()
    })
  })

  describe('presets', () => {
    it('should have full preset', () => {
      expect(presets.full).toEqual({
        gfm: true,
        typescript: true,
        mermaid: true,
        attributes: true,
      })
    })

    it('should have minimal preset', () => {
      expect(presets.minimal).toEqual({
        gfm: true,
        typescript: false,
        mermaid: false,
        attributes: false,
      })
    })

    it('should have docs preset', () => {
      expect(presets.docs.gfm).toBe(true)
      expect(presets.docs.mermaid).toBe(true)
      expect(presets.docs.typescript).toBe(false)
    })

    it('should have code preset', () => {
      expect(presets.code.typescript).toBe(true)
      expect(presets.code.mermaid).toBe(false)
    })
  })
})

describe('integration', () => {
  // Helper to run processor and get file with data
  const runWithFile = async (
    processor: ReturnType<typeof unified>,
    content: string
  ) => {
    const file = new VFile(content)
    const tree = processor.parse(file)
    await processor.run(tree, file)
    return { tree, file }
  }

  it('should work with complex MDX content', async () => {
    const content = `
# Documentation

Here's a table:

| Feature | Status |
| ------- | ------ |
| GFM     | yes    |
| Mermaid | yes    |

## Architecture

\`\`\`mermaid
flowchart TD
  A[User] --> B[API]
  B --> C[(Database)]
\`\`\`

## Code Example

\`\`\`typescript {title="Example"}
import type { Config } from './types'

export function init(config: Config) {
  return new App(config)
}
\`\`\`

- [x] Complete documentation
- [ ] Add more examples
`

    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkMDXLD, presets.full)

    const { file } = await runWithFile(processor, content)
    const data = file.data.mdxld

    // Should have mermaid diagram
    expect(data?.mermaid).toHaveLength(1)
    expect(data?.mermaid?.[0]?.ast.type).toBe('flowchart')
    expect(data?.mermaid?.[0]?.ast.nodes).toHaveLength(3)

    // Should have code attributes
    expect(data?.attributes?.size).toBeGreaterThan(0)
  })
})

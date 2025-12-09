import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

describe('MDXLD TextMate Grammar', () => {
  const grammarPath = path.join(__dirname, '../syntaxes/mdxld.tmLanguage.json')
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'))

  describe('grammar structure', () => {
    it('should have valid schema', () => {
      expect(grammar.$schema).toBe('https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json')
    })

    it('should have correct scope name', () => {
      expect(grammar.scopeName).toBe('source.mdxld')
    })

    it('should have required patterns', () => {
      const patternIncludes = grammar.patterns.map((p: { include: string }) => p.include)
      expect(patternIncludes).toContain('#frontmatter')
      expect(patternIncludes).toContain('#jsx-component')
      expect(patternIncludes).toContain('#jsx-expression')
      expect(patternIncludes).toContain('#fenced-code-block')
      expect(patternIncludes).toContain('#import-export')
      expect(patternIncludes).toContain('#markdown')
    })
  })

  describe('repository definitions', () => {
    it('should have frontmatter pattern', () => {
      expect(grammar.repository.frontmatter).toBeDefined()
      expect(grammar.repository.frontmatter.name).toBe('meta.embedded.block.yaml')
    })

    it('should have import-export patterns', () => {
      expect(grammar.repository['import-export']).toBeDefined()
      expect(grammar.repository['import-export'].patterns).toHaveLength(2)
    })

    it('should have jsx-component patterns', () => {
      expect(grammar.repository['jsx-component']).toBeDefined()
      expect(grammar.repository['jsx-component'].patterns.length).toBeGreaterThan(0)
    })

    it('should have jsx-expression pattern', () => {
      expect(grammar.repository['jsx-expression']).toBeDefined()
    })

    it('should have inline-tagged-template patterns', () => {
      const templates = grammar.repository['inline-tagged-template']
      expect(templates).toBeDefined()
      expect(templates.patterns.length).toBeGreaterThan(0)

      // Check for yaml`, sql`, csv`/tsv`, json` support
      const templateNames = templates.patterns.map((p: { name: string }) => p.name)
      expect(templateNames).toContain('meta.embedded.inline.yaml')
      expect(templateNames).toContain('meta.embedded.inline.sql')
      expect(templateNames).toContain('meta.embedded.inline.csv')
      expect(templateNames).toContain('meta.embedded.inline.json')
    })

    it('should have fenced-code-block patterns for multiple languages', () => {
      const codeBlocks = grammar.repository['fenced-code-block']
      expect(codeBlocks).toBeDefined()

      const blockNames = codeBlocks.patterns.map((p: { name: string }) => p.name)
      expect(blockNames).toContain('meta.embedded.block.mermaid')
      expect(blockNames).toContain('meta.embedded.block.typescript')
      expect(blockNames).toContain('meta.embedded.block.javascript')
      expect(blockNames).toContain('meta.embedded.block.sql')
      expect(blockNames).toContain('meta.embedded.block.yaml')
      expect(blockNames).toContain('meta.embedded.block.json')
    })

    it('should have markdown patterns', () => {
      const markdown = grammar.repository.markdown
      expect(markdown).toBeDefined()

      const markdownNames = markdown.patterns.map((p: { name: string }) => p.name)
      expect(markdownNames).toContain('markup.heading.1.mdxld')
      expect(markdownNames).toContain('markup.heading.2.mdxld')
      expect(markdownNames).toContain('markup.heading.3.mdxld')
      expect(markdownNames).toContain('markup.bold.mdxld')
      expect(markdownNames).toContain('markup.italic.mdxld')
      expect(markdownNames).toContain('markup.strikethrough.mdxld')
      expect(markdownNames).toContain('markup.underline.link.mdxld')
      expect(markdownNames).toContain('markup.list.unnumbered.mdxld')
      expect(markdownNames).toContain('markup.list.numbered.mdxld')
      expect(markdownNames).toContain('markup.quote.mdxld')
    })
  })

  describe('regex patterns', () => {
    it('should match frontmatter delimiters', () => {
      const frontmatter = grammar.repository.frontmatter
      // Note: \A in Oniguruma means start of string, not supported in JS
      // We test the end pattern which uses ^ (start of line)
      const endRegex = new RegExp(frontmatter.end, 'm')

      expect(endRegex.test('---')).toBe(true)
      expect(endRegex.test('---  ')).toBe(true)

      // Test that begin pattern string is correctly formed
      expect(frontmatter.begin).toContain('---')
      expect(frontmatter.begin).toContain('\\A') // Oniguruma start of string
    })

    it('should match import statements', () => {
      const importPattern = grammar.repository['import-export'].patterns[0]
      const beginRegex = new RegExp(importPattern.begin)

      expect(beginRegex.test('import { foo } from "bar"')).toBe(true)
      expect(beginRegex.test('import type { Foo } from "bar"')).toBe(true)
    })

    it('should match export statements', () => {
      const exportPattern = grammar.repository['import-export'].patterns[1]
      const beginRegex = new RegExp(exportPattern.begin)

      expect(beginRegex.test('export const foo = 1')).toBe(true)
      expect(beginRegex.test('export type Foo = string')).toBe(true)
      expect(beginRegex.test('export default Component')).toBe(true)
    })

    it('should match jsx components', () => {
      const selfClosing = grammar.repository['jsx-component'].patterns[0]
      const selfClosingRegex = new RegExp(selfClosing.match)

      expect(selfClosingRegex.test('<Component />')).toBe(true)
      expect(selfClosingRegex.test('<MyComponent prop="value" />')).toBe(true)

      const openTag = grammar.repository['jsx-component'].patterns[1]
      const openTagRegex = new RegExp(openTag.match)

      expect(openTagRegex.test('<Component>')).toBe(true)
      expect(openTagRegex.test('<Component prop="value">')).toBe(true)

      const closeTag = grammar.repository['jsx-component'].patterns[2]
      const closeTagRegex = new RegExp(closeTag.match)

      expect(closeTagRegex.test('</Component>')).toBe(true)
    })

    it('should match jsx expressions', () => {
      const expression = grammar.repository['jsx-expression']
      const beginRegex = new RegExp(expression.begin)
      const endRegex = new RegExp(expression.end)

      expect(beginRegex.test('{ foo }')).toBe(true)
      expect(endRegex.test('}')).toBe(true)
    })

    it('should match inline tagged templates', () => {
      const templates = grammar.repository['inline-tagged-template'].patterns

      // yaml template
      const yamlTemplate = templates.find((p: { name: string }) => p.name === 'meta.embedded.inline.yaml')
      const yamlRegex = new RegExp(yamlTemplate.match)
      expect(yamlRegex.test('yaml`key: value`')).toBe(true)

      // sql template
      const sqlTemplate = templates.find((p: { name: string }) => p.name === 'meta.embedded.inline.sql')
      const sqlRegex = new RegExp(sqlTemplate.match)
      expect(sqlRegex.test('sql`SELECT * FROM users`')).toBe(true)

      // csv/tsv template
      const csvTemplate = templates.find((p: { name: string }) => p.name === 'meta.embedded.inline.csv')
      const csvRegex = new RegExp(csvTemplate.match)
      expect(csvRegex.test('csv`a,b,c`')).toBe(true)
      expect(csvRegex.test('tsv`a\tb\tc`')).toBe(true)

      // json template
      const jsonTemplate = templates.find((p: { name: string }) => p.name === 'meta.embedded.inline.json')
      const jsonRegex = new RegExp(jsonTemplate.match)
      expect(jsonRegex.test('json`{"key": "value"}`')).toBe(true)
    })

    it('should match fenced code blocks', () => {
      const codeBlocks = grammar.repository['fenced-code-block'].patterns

      // typescript block
      const tsBlock = codeBlocks.find((p: { name: string }) => p.name === 'meta.embedded.block.typescript')
      const tsBeginRegex = new RegExp(tsBlock.begin)
      expect(tsBeginRegex.test('```typescript')).toBe(true)
      expect(tsBeginRegex.test('```ts')).toBe(true)
      expect(tsBeginRegex.test('```tsx')).toBe(true)
      expect(tsBeginRegex.test('```typescript {lineNumbers}')).toBe(true)

      // mermaid block
      const mermaidBlock = codeBlocks.find((p: { name: string }) => p.name === 'meta.embedded.block.mermaid')
      const mermaidBeginRegex = new RegExp(mermaidBlock.begin)
      expect(mermaidBeginRegex.test('```mermaid')).toBe(true)
    })

    it('should match markdown headings', () => {
      const markdown = grammar.repository.markdown.patterns

      const h1 = markdown.find((p: { name: string }) => p.name === 'markup.heading.1.mdxld')
      const h1Regex = new RegExp(h1.match)
      expect(h1Regex.test('# Heading 1')).toBe(true)

      const h2 = markdown.find((p: { name: string }) => p.name === 'markup.heading.2.mdxld')
      const h2Regex = new RegExp(h2.match)
      expect(h2Regex.test('## Heading 2')).toBe(true)

      const h3 = markdown.find((p: { name: string }) => p.name === 'markup.heading.3.mdxld')
      const h3Regex = new RegExp(h3.match)
      expect(h3Regex.test('### Heading 3')).toBe(true)
    })

    it('should match markdown formatting', () => {
      const markdown = grammar.repository.markdown.patterns

      const bold = markdown.find((p: { name: string }) => p.name === 'markup.bold.mdxld')
      const boldRegex = new RegExp(bold.match)
      expect(boldRegex.test('**bold text**')).toBe(true)
      expect(boldRegex.test('__bold text__')).toBe(true)

      const italic = markdown.find((p: { name: string }) => p.name === 'markup.italic.mdxld')
      const italicRegex = new RegExp(italic.match)
      expect(italicRegex.test('*italic*')).toBe(true)
      expect(italicRegex.test('_italic_')).toBe(true)

      const strikethrough = markdown.find((p: { name: string }) => p.name === 'markup.strikethrough.mdxld')
      const strikethroughRegex = new RegExp(strikethrough.match)
      expect(strikethroughRegex.test('~~strikethrough~~')).toBe(true)
    })

    it('should match markdown links', () => {
      const markdown = grammar.repository.markdown.patterns

      const link = markdown.find((p: { name: string }) => p.name === 'markup.underline.link.mdxld')
      const linkRegex = new RegExp(link.match)
      expect(linkRegex.test('[text](https://example.com)')).toBe(true)
    })

    it('should match markdown lists', () => {
      const markdown = grammar.repository.markdown.patterns

      const unnumbered = markdown.find((p: { name: string }) => p.name === 'markup.list.unnumbered.mdxld')
      const unnumberedRegex = new RegExp(unnumbered.match)
      expect(unnumberedRegex.test('- item')).toBe(true)
      expect(unnumberedRegex.test('* item')).toBe(true)
      expect(unnumberedRegex.test('+ item')).toBe(true)
      expect(unnumberedRegex.test('- [ ] checkbox')).toBe(true)
      expect(unnumberedRegex.test('- [x] checked')).toBe(true)

      const numbered = markdown.find((p: { name: string }) => p.name === 'markup.list.numbered.mdxld')
      const numberedRegex = new RegExp(numbered.match)
      expect(numberedRegex.test('1. item')).toBe(true)
      expect(numberedRegex.test('42. item')).toBe(true)
    })

    it('should match blockquotes', () => {
      const markdown = grammar.repository.markdown.patterns

      const quote = markdown.find((p: { name: string }) => p.name === 'markup.quote.mdxld')
      const quoteRegex = new RegExp(quote.match)
      expect(quoteRegex.test('> quote')).toBe(true)
    })
  })
})

describe('MDXLD Codeblock Injection Grammar', () => {
  const grammarPath = path.join(__dirname, '../syntaxes/codeblock.tmLanguage.json')
  const grammar = JSON.parse(fs.readFileSync(grammarPath, 'utf-8'))

  it('should have correct scope name', () => {
    expect(grammar.scopeName).toBe('markdown.mdxld.codeblock')
  })

  it('should inject into mermaid blocks', () => {
    expect(grammar.injectionSelector).toBe('L:meta.embedded.block.mermaid')
  })

  it('should have mermaid patterns', () => {
    const mermaid = grammar.repository.mermaid
    expect(mermaid).toBeDefined()
    expect(mermaid.patterns.length).toBeGreaterThan(0)
  })

  it('should match mermaid diagram types', () => {
    const mermaid = grammar.repository.mermaid.patterns
    const diagramType = mermaid.find((p: { name: string }) => p.name === 'keyword.control.mermaid')
    const regex = new RegExp(diagramType.match)

    expect(regex.test('flowchart')).toBe(true)
    expect(regex.test('graph')).toBe(true)
    expect(regex.test('sequenceDiagram')).toBe(true)
    expect(regex.test('classDiagram')).toBe(true)
    expect(regex.test('stateDiagram')).toBe(true)
    expect(regex.test('erDiagram')).toBe(true)
    expect(regex.test('gantt')).toBe(true)
    expect(regex.test('pie')).toBe(true)
    expect(regex.test('mindmap')).toBe(true)
    expect(regex.test('timeline')).toBe(true)
    expect(regex.test('gitGraph')).toBe(true)
  })

  it('should match mermaid directions', () => {
    const mermaid = grammar.repository.mermaid.patterns
    const direction = mermaid.find((p: { name: string }) => p.name === 'keyword.control.direction.mermaid')
    const regex = new RegExp(direction.match)

    expect(regex.test('TB')).toBe(true)
    expect(regex.test('TD')).toBe(true)
    expect(regex.test('BT')).toBe(true)
    expect(regex.test('RL')).toBe(true)
    expect(regex.test('LR')).toBe(true)
  })

  it('should match mermaid keywords', () => {
    const mermaid = grammar.repository.mermaid.patterns
    const keywords = mermaid.find((p: { name: string }) => p.name === 'keyword.other.mermaid')
    const regex = new RegExp(keywords.match)

    expect(regex.test('participant')).toBe(true)
    expect(regex.test('actor')).toBe(true)
    expect(regex.test('subgraph')).toBe(true)
    expect(regex.test('end')).toBe(true)
    expect(regex.test('loop')).toBe(true)
    expect(regex.test('alt')).toBe(true)
    expect(regex.test('note')).toBe(true)
  })

  it('should match mermaid arrows', () => {
    const mermaid = grammar.repository.mermaid.patterns
    const arrows = mermaid.find((p: { name: string }) => p.name === 'punctuation.mermaid.arrow')
    const regex = new RegExp(arrows.match)

    expect(regex.test('-->')).toBe(true)
    expect(regex.test('->>')).toBe(true)
    expect(regex.test('->')).toBe(true)
    expect(regex.test('==>')).toBe(true)
    expect(regex.test('-.->') || regex.test('-.->')).toBe(true)
  })

  it('should match mermaid comments', () => {
    const mermaid = grammar.repository.mermaid.patterns
    const comment = mermaid.find((p: { name: string }) => p.name === 'comment.line.mermaid')
    const regex = new RegExp(comment.match)

    expect(regex.test('%% This is a comment')).toBe(true)
  })
})

describe('Language Configuration', () => {
  const configPath = path.join(__dirname, '../language-configuration.json')
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

  it('should have block comments (MDX uses JSX-style comments)', () => {
    // MDX uses JSX-style block comments, not line comments
    expect(config.comments.blockComment).toEqual(['{/*', '*/}'])
  })

  it('should have correct brackets', () => {
    expect(config.brackets).toContainEqual(['{', '}'])
    expect(config.brackets).toContainEqual(['[', ']'])
    expect(config.brackets).toContainEqual(['(', ')'])
    expect(config.brackets).toContainEqual(['<', '>'])
  })

  it('should have auto-closing pairs', () => {
    expect(config.autoClosingPairs).toBeDefined()
    expect(config.autoClosingPairs.length).toBeGreaterThan(0)
  })

  it('should have surrounding pairs', () => {
    expect(config.surroundingPairs).toBeDefined()
    expect(config.surroundingPairs.length).toBeGreaterThan(0)
  })

  it('should have folding markers', () => {
    expect(config.folding).toBeDefined()
    expect(config.folding.markers).toBeDefined()
  })

  it('should have word patterns', () => {
    expect(config.wordPattern).toBeDefined()
  })
})

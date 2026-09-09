import { describe, it, expect } from 'vitest'
import * as markdown from './index.js'
import { toMarkdown, fromMarkdown, parseTable, renderTable } from './index.js'

type Parsed = { name?: string; description?: string; properties: Array<{ name: string; type?: string; required?: boolean; description?: string }> }

// =============================================================================
// toMarkdown Tests
// =============================================================================

describe('toMarkdown', () => {
  describe('basic entity rendering', () => {
    it('should render entity with name as h1', () => {
      const result = toMarkdown({ name: 'Customer' })
      expect(result).toBe('# Customer')
    })

    it('should render entity with name and description', () => {
      const result = toMarkdown({
        name: 'Customer',
        description: 'A customer entity',
      })
      expect(result).toBe('# Customer\n\nA customer entity')
    })

    it('should handle custom heading depth', () => {
      const result = toMarkdown({ name: 'Customer' }, { headingDepth: 2 })
      expect(result).toBe('## Customer')
    })

    it('should handle heading depth 3', () => {
      const result = toMarkdown({ name: 'Sub-section' }, { headingDepth: 3 })
      expect(result).toBe('### Sub-section')
    })
  })

  describe('properties table', () => {
    it('should render properties as GitHub table', () => {
      const result = toMarkdown({
        name: 'Customer',
        properties: [
          { name: 'id', type: 'string', required: true, description: 'Unique ID' },
          { name: 'email', type: 'string', required: true, description: 'Email address' },
        ],
      })

      expect(result).toContain('| Property | Type | Required | Description |')
      expect(result).toContain('|----------|------|----------|-------------|')
      expect(result).toContain('| id | string | ✓ | Unique ID |')
      expect(result).toContain('| email | string | ✓ | Email address |')
    })

    it('should handle optional properties', () => {
      const result = toMarkdown({
        name: 'Customer',
        properties: [
          { name: 'nickname', type: 'string', required: false, description: 'Optional nickname' },
        ],
      })

      expect(result).toContain('| nickname | string |  | Optional nickname |')
    })

    it('should render simple list style', () => {
      const result = toMarkdown(
        {
          name: 'Customer',
          properties: [{ name: 'id', type: 'string', description: 'Unique ID' }],
        },
        { tableStyle: 'simple' }
      )

      expect(result).toContain('- **id** (string): Unique ID')
    })

    it('should use asterisk list style', () => {
      const result = toMarkdown(
        {
          name: 'Customer',
          properties: [{ name: 'id', type: 'string' }],
        },
        { tableStyle: 'simple', listStyle: 'asterisk' }
      )

      expect(result).toContain('* **id** (string):')
    })

    it('should use plus list style', () => {
      const result = toMarkdown(
        {
          name: 'Customer',
          properties: [{ name: 'id', type: 'string' }],
        },
        { tableStyle: 'simple', listStyle: 'plus' }
      )

      expect(result).toContain('+ **id** (string):')
    })

    it('should handle missing type and description', () => {
      const result = toMarkdown({
        name: 'Customer',
        properties: [{ name: 'data' }],
      })

      expect(result).toContain('| data |  |  |  |')
    })
  })

  describe('sections', () => {
    it('should render sections with h2', () => {
      const result = toMarkdown({
        name: 'API',
        sections: [
          { name: 'Overview', content: 'This is the overview.' },
          { name: 'Usage', content: 'How to use it.' },
        ],
      })

      expect(result).toContain('## Overview')
      expect(result).toContain('This is the overview.')
      expect(result).toContain('## Usage')
      expect(result).toContain('How to use it.')
    })

    it('should handle sections without content', () => {
      const result = toMarkdown({
        name: 'API',
        sections: [{ name: 'Empty Section' }],
      })

      expect(result).toContain('## Empty Section')
    })

    it('should respect heading depth for sections', () => {
      const result = toMarkdown(
        {
          name: 'API',
          sections: [{ name: 'Sub' }],
        },
        { headingDepth: 2 }
      )

      expect(result).toContain('### Sub')
    })
  })

  describe('items list', () => {
    it('should render items as bullet list', () => {
      const result = toMarkdown({
        items: ['First', 'Second', 'Third'],
      })

      expect(result).toContain('- First')
      expect(result).toContain('- Second')
      expect(result).toContain('- Third')
    })

    it('should use configured list style for items', () => {
      const result = toMarkdown({ items: ['Item'] }, { listStyle: 'asterisk' })
      expect(result).toContain('* Item')
    })

    it('should handle numeric items', () => {
      const result = toMarkdown({ items: [1, 2, 3] })
      expect(result).toContain('- 1')
      expect(result).toContain('- 2')
      expect(result).toContain('- 3')
    })
  })

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = toMarkdown({})
      expect(result).toBe('')
    })

    it('should handle object with only unknown properties', () => {
      const result = toMarkdown({ foo: 'bar', baz: 123 } as any)
      expect(result).toBe('')
    })

    it('should handle unicode in name', () => {
      const result = toMarkdown({ name: '客户 🎉' })
      expect(result).toBe('# 客户 🎉')
    })

    it('should handle special markdown characters in content', () => {
      const result = toMarkdown({
        name: 'Test *with* _special_ chars',
        description: 'Contains **bold** and `code`',
      })

      expect(result).toContain('# Test *with* _special_ chars')
      expect(result).toContain('Contains **bold** and `code`')
    })

    it('should handle very long names', () => {
      const longName = 'A'.repeat(1000)
      const result = toMarkdown({ name: longName })
      expect(result).toBe(`# ${longName}`)
    })

    it('should handle empty arrays', () => {
      const result = toMarkdown({
        name: 'Test',
        properties: [],
        sections: [],
        items: [],
      })

      // Empty arrays still render their headers/structure
      expect(result).toContain('# Test')
    })
  })

  describe('complex objects', () => {
    it('should render complete entity', () => {
      const result = toMarkdown({
        name: 'Customer',
        description: 'Represents a customer in the system.',
        properties: [
          { name: 'id', type: 'string', required: true, description: 'Unique identifier' },
          { name: 'email', type: 'string', required: true, description: 'Email address' },
          { name: 'tier', type: 'string', required: false, description: 'Subscription tier' },
        ],
        sections: [{ name: 'Notes', content: 'Additional notes here.' }],
      })

      expect(result).toContain('# Customer')
      expect(result).toContain('Represents a customer')
      expect(result).toContain('| id | string | ✓ | Unique identifier |')
      expect(result).toContain('## Notes')
    })
  })
})

// =============================================================================
// fromMarkdown Tests
// =============================================================================

describe('fromMarkdown', () => {
  describe('basic parsing', () => {
    it('should parse h1 as name', () => {
      const result = fromMarkdown('# Customer')
      expect(result.name).toBe('Customer')
    })

    it('should parse description paragraph', () => {
      const result = fromMarkdown('# Customer\n\nA customer entity.')
      expect(result.name).toBe('Customer')
      expect(result.description).toBe('A customer entity.')
    })

    it('should handle multiple heading levels', () => {
      const result = fromMarkdown('## Sub-heading\n\nContent')
      expect(result.name).toBeUndefined()
    })
  })

  describe('table parsing', () => {
    it('should parse properties table', () => {
      const markdown = `# Customer

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | ✓ | Unique ID |
| email | string | ✓ | Email address |`

      const result = fromMarkdown<Parsed>(markdown)
      expect(result.properties).toHaveLength(2)
      expect(result.properties[0]).toEqual({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique ID',
      })
    })

    it('should handle yes/no for required', () => {
      const markdown = `| Property | Type | Required | Description |
|----------|------|----------|-------------|
| id | string | yes | ID |
| name | string | no | Name |`

      const result = fromMarkdown<Parsed>(markdown)
      expect(result.properties[0]!.required).toBe(true)
      expect(result.properties[1]!.required).toBe(false)
    })

    it('should handle table without required column', () => {
      const markdown = `| Property | Type |
|----------|------|
| id | string |`

      const result = fromMarkdown<Parsed>(markdown)
      expect(result.properties[0]).toEqual({
        name: 'id',
        type: 'string',
      })
    })
  })

  describe('list parsing', () => {
    it('should parse bullet list as items', () => {
      const result = fromMarkdown('- First\n- Second\n- Third')
      expect(result.items).toEqual(['First', 'Second', 'Third'])
    })

    it('should parse asterisk list', () => {
      const result = fromMarkdown('* Item 1\n* Item 2')
      expect(result.items).toEqual(['Item 1', 'Item 2'])
    })

    it('should parse plus list', () => {
      const result = fromMarkdown('+ A\n+ B')
      expect(result.items).toEqual(['A', 'B'])
    })
  })

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = fromMarkdown('')
      expect(result).toEqual({})
    })

    it('should handle whitespace only', () => {
      const result = fromMarkdown('   \n\n   ')
      expect(result).toEqual({})
    })

    it('should handle unicode content', () => {
      const result = fromMarkdown('# 客户 🎉\n\n这是描述')
      expect(result.name).toBe('客户 🎉')
      expect(result.description).toBe('这是描述')
    })

    it('should handle malformed table', () => {
      const result = fromMarkdown('| incomplete table')
      expect(result.properties).toBeUndefined()
    })
  })

  describe('round-trip', () => {
    it('should round-trip simple entity', () => {
      const original = { name: 'Customer', description: 'A customer' }
      const markdown = toMarkdown(original)
      const parsed = fromMarkdown<Parsed>(markdown)

      expect(parsed.name).toBe(original.name)
      expect(parsed.description).toBe(original.description)
    })

    it('should round-trip entity with properties', () => {
      const original = {
        name: 'Customer',
        properties: [
          { name: 'id', type: 'string', required: true, description: 'Unique ID' },
        ],
      }
      const markdown = toMarkdown(original)
      const parsed = fromMarkdown<Parsed>(markdown)

      expect(parsed.name).toBe(original.name)
      expect(parsed.properties).toHaveLength(1)
      expect(parsed.properties[0]!.name).toBe('id')
      expect(parsed.properties[0]!.type).toBe('string')
      expect(parsed.properties[0]!.required).toBe(true)
    })
  })
})


// =============================================================================
// Table primitives (shared with @mdxld/extract entity components, mdx-8je.12)
// =============================================================================

describe('table primitives', () => {
  describe('parseTable', () => {
    it('parses headers and rows, keeping empty cells positional', () => {
      const result = parseTable(`| Property | Type | Required | Description |
|----------|------|----------|-------------|
| nickname | string |  | Optional nickname |`)

      expect(result.headers).toEqual(['Property', 'Type', 'Required', 'Description'])
      expect(result.rows).toEqual([{ Property: 'nickname', Type: 'string', Required: '', Description: 'Optional nickname' }])
    })

    it('tolerates a missing separator row and short rows', () => {
      const result = parseTable('| a | b |\n| 1 |')
      expect(result.rows).toEqual([{ a: '1', b: '' }])
    })

    it('returns nothing for a one-line table', () => {
      expect(parseTable('| incomplete table')).toEqual({ headers: [], rows: [] })
      expect(parseTable('')).toEqual({ headers: [], rows: [] })
    })
  })

  describe('renderTable', () => {
    it('renders records keyed by header with a compact separator', () => {
      expect(renderTable(['name', 'slug'], [{ name: 'JavaScript', slug: 'javascript' }])).toBe(
        '| name | slug |\n|---|---|\n| JavaScript | javascript |'
      )
    })

    it('renders array rows with a padded separator', () => {
      expect(renderTable(['Property', 'Type'], [['id', 'string']], { separator: 'padded' })).toBe(
        '| Property | Type |\n|----------|------|\n| id | string |'
      )
    })

    it('renders null as empty and objects as JSON', () => {
      expect(renderTable(['a', 'b'], [{ a: null, b: { x: 1 } }])).toContain('|  | {"x":1} |')
    })

    it('round-trips through parseTable', () => {
      const rows = [
        { name: 'JavaScript', slug: 'javascript' },
        { name: 'TypeScript', slug: '' },
      ]
      expect(parseTable(renderTable(['name', 'slug'], rows)).rows).toEqual(rows)
    })
  })

  it('fromMarkdown reads an optional (empty Required cell) property without shifting columns', () => {
    const result = fromMarkdown<{ properties: Array<Record<string, unknown>> }>(
      toMarkdown({
        name: 'Customer',
        properties: [{ name: 'nickname', type: 'string', required: false, description: 'Optional nickname' }],
      })
    )
    expect(result.properties[0]).toEqual({ name: 'nickname', type: 'string', required: false, description: 'Optional nickname' })
  })
})

// =============================================================================
// One diff implementation in the repo (mdx-8je.12)
// =============================================================================

describe("diffing is not this package's job", () => {
  it('exports no diff / applyExtract - those live in @mdxld/diff', () => {
    const exported = Object.keys(markdown)
    expect(exported).not.toContain('diff')
    expect(exported).not.toContain('applyExtract')
    expect((markdown as Record<string, unknown>).diff).toBeUndefined()
    expect((markdown as Record<string, unknown>).applyExtract).toBeUndefined()
  })
})

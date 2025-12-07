import { describe, it, expect } from 'vitest'
import { toMarkdown, fromMarkdown, diff, applyExtract } from './index.js'

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

      const result = fromMarkdown(markdown)
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

      const result = fromMarkdown(markdown)
      expect(result.properties[0].required).toBe(true)
      expect(result.properties[1].required).toBe(false)
    })

    it('should handle table without required column', () => {
      const markdown = `| Property | Type |
|----------|------|
| id | string |`

      const result = fromMarkdown(markdown)
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
      const parsed = fromMarkdown(markdown)

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
      const parsed = fromMarkdown(markdown)

      expect(parsed.name).toBe(original.name)
      expect(parsed.properties).toHaveLength(1)
      expect(parsed.properties[0].name).toBe('id')
      expect(parsed.properties[0].type).toBe('string')
      expect(parsed.properties[0].required).toBe(true)
    })
  })
})

// =============================================================================
// diff Tests
// =============================================================================

describe('diff', () => {
  describe('detecting changes', () => {
    it('should detect added fields', () => {
      const result = diff({ name: 'Test' }, { name: 'Test', email: 'test@example.com' })

      expect(result.added).toEqual({ email: 'test@example.com' })
      expect(result.hasChanges).toBe(true)
    })

    it('should detect removed fields', () => {
      const result = diff({ name: 'Test', email: 'test@example.com' }, { name: 'Test' })

      expect(result.removed).toContain('email')
      expect(result.hasChanges).toBe(true)
    })

    it('should detect modified fields', () => {
      const result = diff({ name: 'Old' }, { name: 'New' })

      expect(result.modified).toEqual({
        name: { from: 'Old', to: 'New' },
      })
      expect(result.hasChanges).toBe(true)
    })

    it('should detect no changes', () => {
      const result = diff({ name: 'Same' }, { name: 'Same' })

      expect(result.hasChanges).toBe(false)
      expect(result.added).toEqual({})
      expect(result.modified).toEqual({})
      expect(result.removed).toEqual([])
    })
  })

  describe('complex changes', () => {
    it('should handle multiple changes', () => {
      const result = diff(
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 20, d: 4 }
      )

      expect(result.modified).toEqual({ b: { from: 2, to: 20 } })
      expect(result.added).toEqual({ d: 4 })
      expect(result.removed).toContain('c')
    })

    it('should handle nested objects', () => {
      const result = diff(
        { data: { value: 1 } },
        { data: { value: 2 } }
      )

      expect(result.modified).toHaveProperty('data')
    })

    it('should handle array changes', () => {
      const result = diff({ items: [1, 2] }, { items: [1, 2, 3] })

      expect(result.modified.items).toEqual({
        from: [1, 2],
        to: [1, 2, 3],
      })
    })
  })

  describe('edge cases', () => {
    it('should handle empty objects', () => {
      const result = diff({}, {})
      expect(result.hasChanges).toBe(false)
    })

    it('should handle null values', () => {
      const result = diff({ value: null } as any, { value: 'defined' })
      expect(result.modified.value).toEqual({ from: null, to: 'defined' })
    })

    it('should handle undefined vs missing', () => {
      const result = diff({ a: undefined } as any, {})
      expect(result.removed).toContain('a')
    })
  })
})

// =============================================================================
// applyExtract Tests
// =============================================================================

describe('applyExtract', () => {
  describe('basic merging', () => {
    it('should merge extracted data into original', () => {
      const result = applyExtract(
        { name: 'Original', author: 'John' },
        { name: 'Updated' }
      )

      expect(result).toEqual({ name: 'Updated', author: 'John' })
    })

    it('should add new fields', () => {
      const result = applyExtract({ name: 'Test' }, { email: 'test@example.com' })

      expect(result).toEqual({ name: 'Test', email: 'test@example.com' })
    })
  })

  describe('paths option', () => {
    it('should respect paths filter', () => {
      const result = applyExtract(
        { name: 'Original', description: 'Original desc' },
        { name: 'Updated', description: 'Updated desc' },
        { paths: ['name'] }
      )

      expect(result.name).toBe('Updated')
      expect(result.description).toBe('Original desc')
    })

    it('should ignore updates not in paths', () => {
      const result = applyExtract(
        { a: 1, b: 2 },
        { a: 10, b: 20 },
        { paths: ['a'] }
      )

      expect(result).toEqual({ a: 10, b: 2 })
    })
  })

  describe('array merge strategies', () => {
    it('should replace arrays by default', () => {
      const result = applyExtract({ items: ['a', 'b'] }, { items: ['c'] })

      expect(result.items).toEqual(['c'])
    })

    it('should append arrays', () => {
      const result = applyExtract(
        { items: ['a', 'b'] },
        { items: ['c'] },
        { arrayMerge: 'append' }
      )

      expect(result.items).toEqual(['a', 'b', 'c'])
    })

    it('should prepend arrays', () => {
      const result = applyExtract(
        { items: ['a', 'b'] },
        { items: ['c'] },
        { arrayMerge: 'prepend' }
      )

      expect(result.items).toEqual(['c', 'a', 'b'])
    })
  })

  describe('edge cases', () => {
    it('should handle empty extracted data', () => {
      const original = { name: 'Test' }
      const result = applyExtract(original, {})

      expect(result).toEqual(original)
    })

    it('should handle non-array values with array merge', () => {
      const result = applyExtract(
        { value: 'string' },
        { value: 'updated' },
        { arrayMerge: 'append' }
      )

      expect(result.value).toBe('updated')
    })
  })
})

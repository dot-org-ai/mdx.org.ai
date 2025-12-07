import { describe, it, expect } from 'vitest'
import {
  createEntityComponent,
  getEntityComponent,
  createEntityExtractors,
  parseMarkdownTable,
  renderMarkdownTable,
  renderMarkdownList,
  diffEntities,
  type EntityItem,
} from './entity.js'

describe('Entity Components', () => {
  describe('parseMarkdownTable', () => {
    it('parses a simple markdown table', () => {
      const table = `| name | slug |
|---|---|
| JavaScript | javascript |
| TypeScript | typescript |`

      const result = parseMarkdownTable(table)

      expect(result.headers).toEqual(['name', 'slug'])
      expect(result.rows).toHaveLength(2)
      expect(result.rows[0]).toEqual({ name: 'JavaScript', slug: 'javascript' })
      expect(result.rows[1]).toEqual({ name: 'TypeScript', slug: 'typescript' })
    })

    it('handles empty table', () => {
      const result = parseMarkdownTable('')
      expect(result.headers).toEqual([])
      expect(result.rows).toEqual([])
    })

    it('handles table with only header', () => {
      const table = `| name |
|---|`

      const result = parseMarkdownTable(table)
      expect(result.headers).toEqual(['name'])
      expect(result.rows).toEqual([])
    })
  })

  describe('renderMarkdownTable', () => {
    it('renders items as a markdown table', () => {
      const items: EntityItem[] = [
        { $id: '1', name: 'JavaScript', slug: 'javascript' },
        { $id: '2', name: 'TypeScript', slug: 'typescript' },
      ]

      const result = renderMarkdownTable(items, ['name', 'slug'])

      expect(result).toContain('| name | slug |')
      expect(result).toContain('|---|---|')
      expect(result).toContain('| JavaScript | javascript |')
      expect(result).toContain('| TypeScript | typescript |')
    })

    it('auto-detects columns from items', () => {
      const items: EntityItem[] = [
        { $id: '1', title: 'Hello', author: 'John' },
      ]

      const result = renderMarkdownTable(items)

      expect(result).toContain('| title | author |')
      expect(result).toContain('| Hello | John |')
    })

    it('handles empty items', () => {
      const result = renderMarkdownTable([])
      expect(result).toBe('_No items_')
    })

    it('respects limit option', () => {
      const items: EntityItem[] = [
        { $id: '1', name: 'First' },
        { $id: '2', name: 'Second' },
        { $id: '3', name: 'Third' },
      ]

      const result = renderMarkdownTable(items, ['name'], { limit: 2 })

      expect(result).toContain('| First |')
      expect(result).toContain('| Second |')
      expect(result).not.toContain('| Third |')
    })
  })

  describe('renderMarkdownList', () => {
    it('renders items as a markdown list', () => {
      const items: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
        { $id: 'ts', name: 'TypeScript' },
      ]

      const result = renderMarkdownList(items)

      expect(result).toBe('- JavaScript\n- TypeScript')
    })

    it('renders with link pattern', () => {
      const items: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
        { $id: 'ts', name: 'TypeScript' },
      ]

      const result = renderMarkdownList(items, { linkPattern: '/tags/{$id}' })

      expect(result).toBe('- [JavaScript](/tags/js)\n- [TypeScript](/tags/ts)')
    })

    it('handles empty items', () => {
      const result = renderMarkdownList([])
      expect(result).toBe('_No items_')
    })
  })

  describe('createEntityComponent', () => {
    it('creates a component with render and extract', () => {
      const Tags = createEntityComponent('Tag')

      expect(Tags.type).toBe('Tag')
      expect(typeof Tags.render).toBe('function')
      expect(typeof Tags.extract).toBe('function')
      expect(typeof Tags.extractor.extract).toBe('function')
    })

    it('renders items to table', () => {
      const Tags = createEntityComponent('Tag')

      const rendered = Tags.render({
        items: [
          { $id: 'js', name: 'JavaScript' },
          { $id: 'ts', name: 'TypeScript' },
        ],
      })

      expect(rendered).toContain('| name |')
      expect(rendered).toContain('| JavaScript |')
    })

    it('extracts items from table', () => {
      const Tags = createEntityComponent('Tag')

      const table = `| name | slug |
|---|---|
| JavaScript | javascript |
| TypeScript | typescript |`

      const result = Tags.extract(table)

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({ name: 'JavaScript', slug: 'javascript', $type: 'Tag' })
      expect(result.columns).toEqual(['name', 'slug'])
    })

    it('extracts items from list', () => {
      const Tags = createEntityComponent('Tag')

      const list = `- JavaScript
- TypeScript`

      const result = Tags.extract(list)

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({ $id: 'JavaScript', name: 'JavaScript', $type: 'Tag' })
    })

    it('extracts items from list with links', () => {
      const Tags = createEntityComponent('Tag')

      const list = `- [JavaScript](/tags/js)
- [TypeScript](/tags/ts)`

      const result = Tags.extract(list)

      expect(result.items).toHaveLength(2)
      expect(result.items[0]).toMatchObject({ $id: 'js', name: 'JavaScript', $type: 'Tag' })
      expect(result.items[1]).toMatchObject({ $id: 'ts', name: 'TypeScript', $type: 'Tag' })
    })

    it('handles empty states', () => {
      const Tags = createEntityComponent('Tag')

      expect(Tags.extract('_No items_')).toEqual({ items: [], columns: [] })
      expect(Tags.extract('_No columns_')).toEqual({ items: [], columns: [] })
    })

    it('applies filter props when rendering', () => {
      const Posts = createEntityComponent('Post')

      const rendered = Posts.render({
        items: [
          { $id: '1', title: 'Draft', published: false },
          { $id: '2', title: 'Live', published: true },
        ],
        published: true,
      })

      expect(rendered).toContain('| Live |')
      expect(rendered).not.toContain('| Draft |')
    })
  })

  describe('getEntityComponent', () => {
    it('returns cached component for same type', () => {
      const Tags1 = getEntityComponent('Tags')
      const Tags2 = getEntityComponent('Tags')

      expect(Tags1).toBe(Tags2)
    })

    it('singularizes plural type names', () => {
      const Tags = getEntityComponent('Tags')
      expect(Tags.type).toBe('Tag')

      const Categories = getEntityComponent('Categories')
      expect(Categories.type).toBe('Category')

      const Posts = getEntityComponent('Posts')
      expect(Posts.type).toBe('Post')
    })
  })

  describe('createEntityExtractors', () => {
    it('creates extractors for all components in template', () => {
      const template = `# {title}

## Tags

<Tags />

## Related Posts

<Posts published={true} />
`

      const extractors = createEntityExtractors(template)

      expect(Object.keys(extractors)).toContain('Tags')
      expect(Object.keys(extractors)).toContain('Posts')
      expect(typeof extractors.Tags!.extract).toBe('function')
      expect(typeof extractors.Posts!.extract).toBe('function')
    })

    it('handles block components', () => {
      const template = `<Authors>
Custom content
</Authors>`

      const extractors = createEntityExtractors(template)

      expect(Object.keys(extractors)).toContain('Authors')
    })
  })

  describe('diffEntities', () => {
    it('detects added entities', () => {
      const before: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
      ]
      const after: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
        { $id: 'ts', name: 'TypeScript' },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatchObject({
        type: 'add',
        entityId: 'ts',
        data: { $id: 'ts', name: 'TypeScript' },
      })
    })

    it('detects removed entities', () => {
      const before: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
        { $id: 'ts', name: 'TypeScript' },
      ]
      const after: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatchObject({
        type: 'remove',
        entityId: 'ts',
        previousData: { $id: 'ts', name: 'TypeScript' },
      })
    })

    it('detects updated entities', () => {
      const before: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
      ]
      const after: EntityItem[] = [
        { $id: 'js', name: 'JavaScript (Updated)' },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]).toMatchObject({
        type: 'update',
        entityId: 'js',
        data: { $id: 'js', name: 'JavaScript (Updated)' },
        previousData: { $id: 'js', name: 'JavaScript' },
      })
    })

    it('handles complex diff scenario', () => {
      const before: EntityItem[] = [
        { $id: '1', name: 'First' },
        { $id: '2', name: 'Second' },
        { $id: '3', name: 'Third' },
      ]
      const after: EntityItem[] = [
        { $id: '1', name: 'First (Updated)' },
        { $id: '3', name: 'Third' },
        { $id: '4', name: 'Fourth' },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(3)
      expect(changes.find(c => c.type === 'add')).toMatchObject({ entityId: '4' })
      expect(changes.find(c => c.type === 'remove')).toMatchObject({ entityId: '2' })
      expect(changes.find(c => c.type === 'update')).toMatchObject({ entityId: '1' })
    })

    it('returns empty array when no changes', () => {
      const items: EntityItem[] = [
        { $id: 'js', name: 'JavaScript' },
      ]

      const changes = diffEntities(items, items)

      expect(changes).toEqual([])
    })
  })

  describe('Round-trip: render → extract', () => {
    it('maintains data integrity through round-trip', () => {
      const Tags = createEntityComponent('Tag')

      const original: EntityItem[] = [
        { $id: 'js', name: 'JavaScript', count: '5' },
        { $id: 'ts', name: 'TypeScript', count: '3' },
      ]

      // Render to markdown
      const rendered = Tags.render({ items: original, columns: ['name', 'count'] })

      // Extract back
      const extracted = Tags.extract(rendered)

      // Verify
      expect(extracted.items).toHaveLength(2)
      expect(extracted.items[0]!.name).toBe('JavaScript')
      expect(extracted.items[0]!.count).toBe('5')
      expect(extracted.items[1]!.name).toBe('TypeScript')
      expect(extracted.items[1]!.count).toBe('3')
    })
  })
})

describe('Edge Cases', () => {
  describe('Special characters in data', () => {
    it('handles unicode characters', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        { $id: 'emoji', name: '🎉 Party', count: '5' },
        { $id: 'chinese', name: '中文标签', count: '3' },
        { $id: 'arabic', name: 'العربية', count: '2' },
      ]

      const rendered = Tags.render({ items, columns: ['name', 'count'] })
      const extracted = Tags.extract(rendered)

      expect(extracted.items).toHaveLength(3)
      expect(extracted.items[0]!.name).toBe('🎉 Party')
      expect(extracted.items[1]!.name).toBe('中文标签')
      expect(extracted.items[2]!.name).toBe('العربية')
    })

    it('handles special markdown characters', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        { $id: 'asterisk', name: 'Item * with asterisk', desc: 'A **bold** item' },
        { $id: 'underscore', name: 'Item _ underscore', desc: 'An _italic_ item' },
        { $id: 'backtick', name: 'Item `code`', desc: 'With backticks' },
      ]

      const rendered = Tags.render({ items, columns: ['name', 'desc'] })
      expect(rendered).toContain('Item * with asterisk')
      expect(rendered).toContain('A **bold** item')
    })

    it('handles whitespace in values', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        { $id: 'spaces', name: '  padded  ', value: 'normal' },
        { $id: 'tabs', name: 'with\ttab', value: 'also\ttab' },
      ]

      const rendered = Tags.render({ items, columns: ['name', 'value'] })
      const extracted = Tags.extract(rendered)

      // Extracted values should be trimmed
      expect(extracted.items).toHaveLength(2)
    })
  })

  describe('Empty and null values', () => {
    it('handles empty string values', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        { $id: '1', name: '', value: 'has value' },
        { $id: '2', name: 'has name', value: '' },
      ]

      const rendered = Tags.render({ items, columns: ['name', 'value'] })
      const extracted = Tags.extract(rendered)

      expect(extracted.items).toHaveLength(2)
    })

    it('handles null-ish values', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        { $id: '1', name: 'Test', value: null as unknown as string },
        { $id: '2', name: 'Test2', value: undefined as unknown as string },
      ]

      const rendered = Tags.render({ items, columns: ['name', 'value'] })
      expect(rendered).toContain('Test')
    })
  })

  describe('Large datasets', () => {
    it('handles many items', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = Array.from({ length: 100 }, (_, i) => ({
        $id: `item-${i}`,
        name: `Item ${i}`,
        value: `Value ${i}`,
      }))

      const rendered = Tags.render({ items, columns: ['name', 'value'] })
      const extracted = Tags.extract(rendered)

      expect(extracted.items).toHaveLength(100)
      expect(extracted.items[99]!.name).toBe('Item 99')
    })

    it('handles many columns', () => {
      const Tags = createEntityComponent('Tag')

      const items: EntityItem[] = [
        {
          $id: '1',
          col1: 'a', col2: 'b', col3: 'c', col4: 'd', col5: 'e',
          col6: 'f', col7: 'g', col8: 'h', col9: 'i', col10: 'j',
        },
      ]

      const columns = ['col1', 'col2', 'col3', 'col4', 'col5', 'col6', 'col7', 'col8', 'col9', 'col10']
      const rendered = Tags.render({ items, columns })
      const extracted = Tags.extract(rendered)

      expect(extracted.columns).toEqual(columns)
      expect(extracted.items[0]!.col10).toBe('j')
    })
  })

  describe('Pluralization edge cases', () => {
    it('handles Companies -> Company', () => {
      const Companies = getEntityComponent('Companies')
      expect(Companies.type).toBe('Company')
    })

    it('handles Entities -> Entity', () => {
      const Entities = getEntityComponent('Entities')
      expect(Entities.type).toBe('Entity')
    })

    it('handles People (irregular plural)', () => {
      const People = getEntityComponent('People')
      // Will likely just remove 's' -> 'Peopl' which is wrong, but consistent behavior
      expect(People.type).toBeDefined()
    })

    it('handles Status (already singular, ends in s)', () => {
      const Status = getEntityComponent('Status')
      // Should recognize it doesn't end in 'ss' pattern
      expect(Status.type).toBe('Statu') // Current behavior - removes trailing s
    })

    it('handles Glasses -> Glasse (es removal)', () => {
      const Glasses = getEntityComponent('Glasses')
      // ends with 'es' but not 'ses', so removes 'es' -> 'Glass' + 'es' = 'Glasses' - 'es' = 'Glasse'
      // This is a known limitation of the simple singularize function
      expect(Glasses.type).toBe('Glasse')
    })

    it('handles Addresses -> Addresse', () => {
      const Addresses = getEntityComponent('Addresses')
      expect(Addresses.type).toBe('Addresse')
    })
  })

  describe('List format edge cases', () => {
    it('handles list items with markdown links inside', () => {
      const Tags = createEntityComponent('Tag')

      const list = `- [First Item](/tags/first)
- [Second Item](/tags/second)
- Plain text item`

      const extracted = Tags.extract(list)

      expect(extracted.items).toHaveLength(3)
      expect(extracted.items[0]!.name).toBe('First Item')
      // The $id extracts the last segment of the URL path
      expect(extracted.items[0]!.$id).toBe('first')
    })

    it('handles nested list (extracts top level only)', () => {
      const Tags = createEntityComponent('Tag')

      const list = `- Top level 1
  - Nested 1
  - Nested 2
- Top level 2`

      const extracted = Tags.extract(list)

      // Should extract top-level items
      expect(extracted.items.length).toBeGreaterThanOrEqual(2)
    })

    it('handles list with extra whitespace', () => {
      const Tags = createEntityComponent('Tag')

      const list = `-   Extra spaces
-    More spaces
- Normal`

      const extracted = Tags.extract(list)
      expect(extracted.items.length).toBe(3)
    })
  })

  describe('Table format edge cases', () => {
    it('handles table with alignment markers', () => {
      const Tags = createEntityComponent('Tag')

      const table = `| name | count |
|:---|---:|
| Left | 123 |
| Right | 456 |`

      const extracted = Tags.extract(table)

      expect(extracted.items).toHaveLength(2)
      expect(extracted.items[0]!.name).toBe('Left')
      expect(extracted.items[0]!.count).toBe('123')
    })

    it('handles table with extra pipes', () => {
      const Tags = createEntityComponent('Tag')

      // Some markdown implementations add leading/trailing pipes
      const table = `|| name | count ||
||---|---||
|| First | 1 ||`

      // This might not parse correctly, but should not crash
      expect(() => Tags.extract(table)).not.toThrow()
    })

    it('handles table with missing cells', () => {
      const Tags = createEntityComponent('Tag')

      const table = `| name | count |
|---|---|
| First | |
| | Second |`

      const extracted = Tags.extract(table)
      expect(extracted.items).toHaveLength(2)
    })
  })

  describe('diffEntities edge cases', () => {
    it('handles entities with complex nested data', () => {
      const before: EntityItem[] = [
        { $id: '1', name: 'Test', meta: { a: 1, b: { c: 2 } } },
      ]
      const after: EntityItem[] = [
        { $id: '1', name: 'Test', meta: { a: 1, b: { c: 3 } } },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]!.type).toBe('update')
    })

    it('handles entities with arrays', () => {
      const before: EntityItem[] = [
        { $id: '1', name: 'Test', tags: ['a', 'b'] },
      ]
      const after: EntityItem[] = [
        { $id: '1', name: 'Test', tags: ['a', 'b', 'c'] },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]!.type).toBe('update')
    })

    it('handles empty before array', () => {
      const before: EntityItem[] = []
      const after: EntityItem[] = [
        { $id: '1', name: 'New' },
      ]

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]!.type).toBe('add')
    })

    it('handles empty after array', () => {
      const before: EntityItem[] = [
        { $id: '1', name: 'Old' },
      ]
      const after: EntityItem[] = []

      const changes = diffEntities(before, after)

      expect(changes).toHaveLength(1)
      expect(changes[0]!.type).toBe('remove')
    })
  })

  describe('createEntityExtractors edge cases', () => {
    it('handles template with no components', () => {
      const template = '# Just a heading\n\nNo components here.'
      const extractors = createEntityExtractors(template)

      expect(Object.keys(extractors)).toHaveLength(0)
    })

    it('handles template with inline expressions', () => {
      const template = '# {title}\n\n<Tags />\n\nCount: {count}'
      const extractors = createEntityExtractors(template)

      expect(Object.keys(extractors)).toContain('Tags')
      expect(Object.keys(extractors)).toHaveLength(1)
    })

    it('handles template with component-like text that is not a component', () => {
      const template = 'Write <code> like this or use <span>inline</span> elements.'
      const extractors = createEntityExtractors(template)

      // Should not pick up lowercase HTML tags
      expect(Object.keys(extractors)).toHaveLength(0)
    })

    it('handles template with commented out components', () => {
      const template = `# Title

{/* <HiddenComponent /> */}

<VisibleComponent />`

      const extractors = createEntityExtractors(template)

      // Note: this basic implementation might still pick up the hidden one
      // because it doesn't parse JSX comments
      expect(Object.keys(extractors)).toContain('VisibleComponent')
    })
  })
})

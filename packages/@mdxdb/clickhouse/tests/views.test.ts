import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClickHouseViewManager, createClickHouseViewManager } from '../src/views.js'
import type { ClickHouseDatabase } from '../src/index.js'

// Mock database for testing
function createMockDatabase(): ClickHouseDatabase {
  const things = new Map<string, any>()
  const relationships: any[] = []

  return {
    list: vi.fn(async (options) => {
      const result: any[] = []
      for (const [url, thing] of things) {
        if (options?.type && thing.type !== options.type) continue
        if (options?.ns && thing.ns !== options.ns) continue
        result.push(thing)
      }
      return result
    }),

    get: vi.fn(async (url: string) => {
      return things.get(url) ?? null
    }),

    getById: vi.fn(async (ns: string, type: string, id: string) => {
      const url = `https://${ns}/${type}/${id}`
      return things.get(url) ?? null
    }),

    create: vi.fn(async (options) => {
      const url = options.url ?? `https://${options.ns}/${options.type}/${options.id}`
      const thing = {
        url,
        ns: options.ns,
        type: options.type,
        id: options.id,
        data: options.data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      things.set(url, thing)
      return thing
    }),

    update: vi.fn(async (url: string, options) => {
      const existing = things.get(url)
      if (!existing) throw new Error(`Thing not found: ${url}`)
      const updated = { ...existing, data: { ...existing.data, ...options.data }, updatedAt: new Date() }
      things.set(url, updated)
      return updated
    }),

    relate: vi.fn(async (options) => {
      const rel = {
        id: `${options.from}:${options.type}:${options.to}`,
        type: options.type,
        from: options.from,
        to: options.to,
        data: options.data,
        createdAt: new Date(),
      }
      relationships.push(rel)
      return rel
    }),

    unrelate: vi.fn(async (from: string, type: string, to: string) => {
      const idx = relationships.findIndex(
        r => r.from === from && r.type === type && r.to === to
      )
      if (idx >= 0) {
        relationships.splice(idx, 1)
        return true
      }
      return false
    }),

    related: vi.fn(async (url: string, relationshipType?: string, direction: 'from' | 'to' | 'both' = 'from') => {
      const result: any[] = []
      for (const rel of relationships) {
        if (relationshipType && rel.type !== relationshipType) continue
        if (direction === 'to' && rel.from === url) {
          const thing = things.get(rel.to)
          if (thing) result.push(thing)
        }
        if (direction === 'from' && rel.to === url) {
          const thing = things.get(rel.from)
          if (thing) result.push(thing)
        }
      }
      return result
    }),

    // Test helpers
    _things: things,
    _relationships: relationships,
  } as unknown as ClickHouseDatabase
}

describe('ClickHouseViewManager', () => {
  let db: ClickHouseDatabase
  let views: ClickHouseViewManager

  beforeEach(() => {
    db = createMockDatabase()
    views = createClickHouseViewManager(db, 'test.local')
  })

  describe('discoverViews', () => {
    it('discovers view documents from database', async () => {
      // Add view documents to mock database
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n<Posts />',
        },
      })

      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Author',
        data: {
          entityType: 'Author',
          template: '# {name}\n\n<Articles />',
        },
      })

      const discovered = await views.discoverViews()

      expect(discovered).toHaveLength(2)
      expect(discovered.map(v => v.id)).toContain('Tag')
      expect(discovered.map(v => v.id)).toContain('Author')
    })

    it('parses components from template', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n<Posts columns={["title", "date"]} />\n\n<Authors format="list" />',
        },
      })

      const discovered = await views.discoverViews()

      expect(discovered[0]!.components).toHaveLength(2)
      expect(discovered[0]!.components[0]!.name).toBe('Posts')
      expect(discovered[0]!.components[0]!.columns).toEqual(['title', 'date'])
      expect(discovered[0]!.components[1]!.name).toBe('Authors')
      expect(discovered[0]!.components[1]!.format).toBe('list')
    })

    it('returns empty array when no views exist', async () => {
      const discovered = await views.discoverViews()
      expect(discovered).toEqual([])
    })
  })

  describe('getView', () => {
    it('gets a view by ID', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n<Posts />',
        },
      })

      const view = await views.getView('Tag')

      expect(view).not.toBeNull()
      expect(view!.entityType).toBe('Tag')
      expect(view!.components).toHaveLength(1)
      expect(view!.components[0]!.name).toBe('Posts')
    })

    it('handles bracket notation [Tag]', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n<Posts />',
        },
      })

      const view = await views.getView('[Tag]')

      expect(view).not.toBeNull()
      expect(view!.id).toBe('[Tag]')
      expect(view!.entityType).toBe('Tag')
    })

    it('returns null for non-existent view', async () => {
      const view = await views.getView('NonExistent')
      expect(view).toBeNull()
    })

    it('caches views', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n<Posts />',
        },
      })

      const view1 = await views.getView('Tag')
      const view2 = await views.getView('Tag')

      // Should be the same reference (cached)
      expect(view1).toBe(view2)
    })

    it('parses multiple components', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Post',
        data: {
          entityType: 'Post',
          template: `# {title}

<Tags />

<Authors format="list" />

<Categories columns={['name', 'slug']} />`,
        },
      })

      const view = await views.getView('Post')

      expect(view!.components).toHaveLength(3)
      expect(view!.components.map(c => c.name)).toEqual(['Tags', 'Authors', 'Categories'])
      expect(view!.components[1]!.format).toBe('list')
      expect(view!.components[2]!.columns).toEqual(['name', 'slug'])
    })
  })

  describe('inferRelationship', () => {
    it('infers forward relationship for owner context', async () => {
      const rel = await views.inferRelationship('Post', 'Tags')

      expect(rel).not.toBeNull()
      expect(rel!.predicate).toBe('tags')
      expect(rel!.direction).toBe('forward')
    })

    it('infers reverse relationship for non-owner context', async () => {
      const rel = await views.inferRelationship('Tag', 'Posts')

      expect(rel).not.toBeNull()
      expect(rel!.predicate).toBe('tags')
      expect(rel!.direction).toBe('reverse')
    })

    it('handles article -> tag relationship', async () => {
      const rel = await views.inferRelationship('Article', 'Tags')

      expect(rel!.direction).toBe('forward')
    })

    it('handles user -> posts relationship', async () => {
      const rel = await views.inferRelationship('User', 'Posts')

      expect(rel!.direction).toBe('forward')
    })

    it('handles product -> categories relationship', async () => {
      const rel = await views.inferRelationship('Product', 'Categories')

      expect(rel!.direction).toBe('forward')
    })

    it('handles author -> posts relationship', async () => {
      const rel = await views.inferRelationship('Author', 'Posts')

      expect(rel!.direction).toBe('forward')
    })
  })

  describe('component parsing', () => {
    it('parses self-closing components', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '<Posts />',
        },
      })

      const view = await views.getView('Tag')
      expect(view!.components[0]!.name).toBe('Posts')
    })

    it('parses block components', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '<Posts>\nCustom content here\n</Posts>',
        },
      })

      const view = await views.getView('Tag')
      expect(view!.components[0]!.name).toBe('Posts')
    })

    it('parses columns prop', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: `<Posts columns={['title', 'author', 'date']} />`,
        },
      })

      const view = await views.getView('Tag')
      expect(view!.components[0]!.columns).toEqual(['title', 'author', 'date'])
    })

    it('parses format prop', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '<Authors format="list" />',
        },
      })

      const view = await views.getView('Tag')
      expect(view!.components[0]!.format).toBe('list')
    })

    it('singularizes component name to entity type', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '<Posts />',
        },
      })

      const view = await views.getView('Tag')
      expect(view!.components[0]!.entityType).toBe('Post')
    })

    it('handles Categories -> Category singularization', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Post',
        data: {
          entityType: 'Post',
          template: '<Categories />',
        },
      })

      const view = await views.getView('Post')
      expect(view!.components[0]!.entityType).toBe('Category')
    })

    it('deduplicates multiple same-type components', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Multi',
        data: {
          entityType: 'Multi',
          template: `## Recent Posts
<Posts limit={5} />

## Popular Posts
<Posts popular={true} />`,
        },
      })

      const view = await views.getView('Multi')
      // Should only have one unique component type
      expect(view!.components.filter(c => c.name === 'Posts')).toHaveLength(1)
    })
  })

  describe('render', () => {
    it('renders a view with related entities', async () => {
      // Create view
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}\n\n## Posts\n<Posts columns={["title"]} />',
        },
      })

      // Create context entity
      const tagUrl = 'https://test.local/Tag/javascript'
      await db.create({
        ns: 'test.local',
        type: 'Tag',
        id: 'javascript',
        url: tagUrl,
        data: { name: 'JavaScript' },
      })

      // Create related posts
      const post1Url = 'https://test.local/Post/hello'
      await db.create({
        ns: 'test.local',
        type: 'Post',
        id: 'hello',
        url: post1Url,
        data: { title: 'Hello World' },
      })

      // Create relationship
      await db.relate({
        type: 'tags',
        from: post1Url,
        to: tagUrl,
      })

      const result = await views.render('Tag', {
        entityUrl: tagUrl,
      })

      expect(result.markdown).toContain('# JavaScript')
      expect(result.entities.Posts).toBeDefined()
    })

    it('throws when view not found', async () => {
      await expect(
        views.render('NonExistent', { entityUrl: 'https://test.local/Thing/1' })
      ).rejects.toThrow('View not found')
    })

    it('throws when entity not found', async () => {
      await db.create({
        ns: 'test.local',
        type: 'View',
        id: 'Tag',
        data: {
          entityType: 'Tag',
          template: '# {name}',
        },
      })

      await expect(
        views.render('Tag', { entityUrl: 'https://test.local/Tag/nonexistent' })
      ).rejects.toThrow('Entity not found')
    })
  })

  describe('applyMutations', () => {
    it('applies add mutations', async () => {
      await views.applyMutations([
        {
          type: 'add',
          predicate: 'tags',
          from: 'https://test.local/Post/1',
          to: 'https://test.local/Tag/js',
          data: { name: 'JavaScript' },
        },
      ])

      expect(db.relate).toHaveBeenCalledWith({
        type: 'tags',
        from: 'https://test.local/Post/1',
        to: 'https://test.local/Tag/js',
        data: { name: 'JavaScript' },
      })
    })

    it('applies remove mutations', async () => {
      await views.applyMutations([
        {
          type: 'remove',
          predicate: 'tags',
          from: 'https://test.local/Post/1',
          to: 'https://test.local/Tag/js',
        },
      ])

      expect(db.unrelate).toHaveBeenCalledWith(
        'https://test.local/Post/1',
        'tags',
        'https://test.local/Tag/js'
      )
    })

    it('applies update mutations', async () => {
      // Create the entity first
      await db.create({
        ns: 'test.local',
        type: 'Tag',
        id: 'js',
        url: 'https://test.local/Tag/js',
        data: { name: 'JS' },
      })

      await views.applyMutations([
        {
          type: 'update',
          predicate: 'tags',
          from: 'https://test.local/Post/1',
          to: 'https://test.local/Tag/js',
          data: { name: 'JavaScript' },
        },
      ])

      expect(db.update).toHaveBeenCalledWith(
        'https://test.local/Tag/js',
        { data: { name: 'JavaScript' } }
      )
    })
  })

  describe('createEntities', () => {
    it('creates entities that were discovered during sync', async () => {
      await views.createEntities([
        { $id: 'new-tag', $type: 'Tag', name: 'New Tag' },
        { $id: 'another', $type: 'Tag', name: 'Another' },
      ])

      expect(db.create).toHaveBeenCalledTimes(2)
      expect(db.create).toHaveBeenCalledWith({
        ns: 'test.local',
        type: 'Tag',
        id: 'new-tag',
        data: { $id: 'new-tag', $type: 'Tag', name: 'New Tag' },
      })
    })

    it('handles entities without $type', async () => {
      await views.createEntities([
        { $id: 'unknown', name: 'Unknown' },
      ])

      expect(db.create).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'Unknown' })
      )
    })
  })
})

describe('Edge Cases', () => {
  let db: ClickHouseDatabase
  let views: ClickHouseViewManager

  beforeEach(() => {
    db = createMockDatabase()
    views = createClickHouseViewManager(db, 'test.local')
  })

  it('handles empty template content', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'Empty',
      data: {
        entityType: 'Empty',
        template: '',
      },
    })

    const view = await views.getView('Empty')
    expect(view!.components).toEqual([])
  })

  it('handles template with no components', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'Simple',
      data: {
        entityType: 'Simple',
        template: '# {name}\n\nJust some content without any components.',
      },
    })

    const view = await views.getView('Simple')
    expect(view!.components).toEqual([])
  })

  it('handles unicode in template', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'Unicode',
      data: {
        entityType: 'Unicode',
        template: '# {name} 🎉\n\n## 文章列表\n<Posts />',
      },
    })

    const view = await views.getView('Unicode')
    expect(view!.template).toContain('🎉')
    expect(view!.template).toContain('文章列表')
    expect(view!.components).toHaveLength(1)
  })

  it('handles deeply nested expression patterns in template', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'Nested',
      data: {
        entityType: 'Nested',
        template: '# {user.profile.settings.displayName}\n\n<Posts />',
      },
    })

    const view = await views.getView('Nested')
    expect(view!.template).toContain('{user.profile.settings.displayName}')
  })

  it('handles view with missing entityType in data', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'NoType',
      data: {
        template: '<Posts />',
      },
    })

    const discovered = await views.discoverViews()
    expect(discovered[0]!.entityType).toBe('')
  })

  it('handles different namespace', async () => {
    const customViews = createClickHouseViewManager(db, 'custom.domain')

    await db.create({
      ns: 'custom.domain',
      type: 'View',
      id: 'Tag',
      data: {
        entityType: 'Tag',
        template: '<Posts />',
      },
    })

    const discovered = await customViews.discoverViews()
    expect(discovered).toHaveLength(1)
  })

  it('handles component with all props', async () => {
    await db.create({
      ns: 'test.local',
      type: 'View',
      id: 'AllProps',
      data: {
        entityType: 'AllProps',
        template: `<Posts columns={['title', 'date']} format="table" published={true} limit={10} />`,
      },
    })

    const view = await views.getView('AllProps')
    expect(view!.components[0]!.name).toBe('Posts')
    expect(view!.components[0]!.columns).toEqual(['title', 'date'])
    expect(view!.components[0]!.format).toBe('table')
  })
})

describe('Pluralization', () => {
  let db: ClickHouseDatabase
  let views: ClickHouseViewManager

  beforeEach(() => {
    db = createMockDatabase()
    views = createClickHouseViewManager(db)
  })

  it('handles regular plurals: Posts -> Post', async () => {
    await db.create({
      ns: 'localhost',
      type: 'View',
      id: 'Tag',
      data: {
        entityType: 'Tag',
        template: '<Posts />',
      },
    })

    const view = await views.getView('Tag')
    expect(view!.components[0]!.entityType).toBe('Post')
  })

  it('handles -ies plurals: Categories -> Category', async () => {
    await db.create({
      ns: 'localhost',
      type: 'View',
      id: 'Post',
      data: {
        entityType: 'Post',
        template: '<Categories />',
      },
    })

    const view = await views.getView('Post')
    expect(view!.components[0]!.entityType).toBe('Category')
  })

  it('handles -es plurals: Boxes -> Box', async () => {
    await db.create({
      ns: 'localhost',
      type: 'View',
      id: 'Warehouse',
      data: {
        entityType: 'Warehouse',
        template: '<Boxes />',
      },
    })

    const view = await views.getView('Warehouse')
    expect(view!.components[0]!.entityType).toBe('Box')
  })

  it('handles already singular: Author -> Author', async () => {
    await db.create({
      ns: 'localhost',
      type: 'View',
      id: 'Post',
      data: {
        entityType: 'Post',
        template: '<Author />',
      },
    })

    const view = await views.getView('Post')
    expect(view!.components[0]!.entityType).toBe('Author')
  })
})

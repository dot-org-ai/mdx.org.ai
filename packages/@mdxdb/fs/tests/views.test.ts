import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { FsViewManager, createFsViewManager } from '../src/views.js'
import { FsProvider, createFsProvider } from '../src/provider.js'
import type { FsDatabaseConfig } from '../src/types.js'

// Test fixtures directory
const TEST_ROOT = path.join(process.cwd(), '.test-views')

describe('FsViewManager', () => {
  let config: FsDatabaseConfig
  let provider: FsProvider
  let views: FsViewManager

  beforeEach(async () => {
    // Create test directory structure
    config = { root: TEST_ROOT }
    await fs.mkdir(TEST_ROOT, { recursive: true })

    provider = createFsProvider(config)
    views = createFsViewManager(config, provider)
  })

  afterEach(async () => {
    // Cleanup test directory
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('discoverViews', () => {
    it('discovers [Type].mdx view files', async () => {
      // Create a view file
      await fs.writeFile(
        path.join(TEST_ROOT, '[Tag].mdx'),
        `---
$type: View
entityType: Tag
---

# {name}

<Posts />
`
      )

      const discovered = await views.discoverViews()

      expect(discovered).toHaveLength(1)
      expect(discovered[0]!.id).toBe('[Tag]')
      expect(discovered[0]!.entityType).toBe('Tag')
      expect(discovered[0]!.components).toHaveLength(1)
      expect(discovered[0]!.components[0]!.name).toBe('Posts')
    })

    it('discovers multiple view files', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Tag].mdx'), `---\n$type: View\nentityType: Tag\n---\n<Posts />`)
      await fs.writeFile(path.join(TEST_ROOT, '[Author].mdx'), `---\n$type: View\nentityType: Author\n---\n<Posts />`)

      const discovered = await views.discoverViews()

      expect(discovered).toHaveLength(2)
      const ids = discovered.map(v => v.id).sort()
      expect(ids).toEqual(['[Author]', '[Tag]'])
    })

    it('returns empty array when no views exist', async () => {
      const discovered = await views.discoverViews()
      expect(discovered).toEqual([])
    })

    it('ignores non-view files', async () => {
      await fs.writeFile(path.join(TEST_ROOT, 'regular.mdx'), `# Regular file`)
      await fs.writeFile(path.join(TEST_ROOT, 'Post.mdx'), `# Post without brackets`)

      const discovered = await views.discoverViews()
      expect(discovered).toEqual([])
    })
  })

  describe('getView', () => {
    it('gets a view by ID', async () => {
      await fs.writeFile(
        path.join(TEST_ROOT, '[Tag].mdx'),
        `---
$type: View
entityType: Tag
---

# {name}

## Posts
<Posts columns={['title', 'date']} />
`
      )

      const view = await views.getView('[Tag]')

      expect(view).not.toBeNull()
      expect(view!.id).toBe('[Tag]')
      expect(view!.entityType).toBe('Tag')
      expect(view!.components).toHaveLength(1)
      expect(view!.components[0]!.name).toBe('Posts')
      expect(view!.components[0]!.columns).toEqual(['title', 'date'])
    })

    it('returns null for non-existent view', async () => {
      const view = await views.getView('[NonExistent]')
      expect(view).toBeNull()
    })

    it('caches views', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Tag].mdx'), `---\n$type: View\nentityType: Tag\n---\n<Posts />`)

      const view1 = await views.getView('[Tag]')
      const view2 = await views.getView('[Tag]')

      expect(view1).toBe(view2)
    })

    it('infers entity type from view ID if not in frontmatter', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Posts].mdx'), `---\n$type: View\n---\n# Posts\n<Tags />`)

      const view = await views.getView('[Posts]')

      expect(view!.entityType).toBe('Post')
    })

    it('parses multiple components', async () => {
      await fs.writeFile(
        path.join(TEST_ROOT, '[Post].mdx'),
        `---
$type: View
entityType: Post
---

# {title}

<Tags />

<Authors format="list" />

<Categories columns={['name', 'slug']} />
`
      )

      const view = await views.getView('[Post]')

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
  })

  describe('component parsing', () => {
    it('parses self-closing components', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Tag].mdx'), `---\n$type: View\nentityType: Tag\n---\n<Posts />`)

      const view = await views.getView('[Tag]')
      expect(view!.components[0]!.name).toBe('Posts')
    })

    it('parses block components', async () => {
      await fs.writeFile(
        path.join(TEST_ROOT, '[Tag].mdx'),
        `---
$type: View
entityType: Tag
---
<Posts>
Custom content here
</Posts>
`
      )

      const view = await views.getView('[Tag]')
      expect(view!.components[0]!.name).toBe('Posts')
    })

    it('parses columns prop with brackets', async () => {
      await fs.writeFile(
        path.join(TEST_ROOT, '[Tag].mdx'),
        `---\n$type: View\nentityType: Tag\n---\n<Posts columns={['title', 'author', 'date']} />`
      )

      const view = await views.getView('[Tag]')
      expect(view!.components[0]!.columns).toEqual(['title', 'author', 'date'])
    })

    it('parses format prop', async () => {
      await fs.writeFile(
        path.join(TEST_ROOT, '[Tag].mdx'),
        `---\n$type: View\nentityType: Tag\n---\n<Authors format="list" />`
      )

      const view = await views.getView('[Tag]')
      expect(view!.components[0]!.format).toBe('list')
    })

    it('singularizes component name to entity type', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Tag].mdx'), `---\n$type: View\nentityType: Tag\n---\n<Posts />`)

      const view = await views.getView('[Tag]')
      expect(view!.components[0]!.entityType).toBe('Post')
    })

    it('handles Categories -> Category singularization', async () => {
      await fs.writeFile(path.join(TEST_ROOT, '[Post].mdx'), `---\n$type: View\nentityType: Post\n---\n<Categories />`)

      const view = await views.getView('[Post]')
      expect(view!.components[0]!.entityType).toBe('Category')
    })
  })
})

describe('Edge Cases', () => {
  let config: FsDatabaseConfig
  let provider: FsProvider
  let views: FsViewManager

  beforeEach(async () => {
    config = { root: TEST_ROOT }
    await fs.mkdir(TEST_ROOT, { recursive: true })
    provider = createFsProvider(config)
    views = createFsViewManager(config, provider)
  })

  afterEach(async () => {
    try {
      await fs.rm(TEST_ROOT, { recursive: true, force: true })
    } catch {
      // Ignore
    }
  })

  it('handles empty template content', async () => {
    await fs.writeFile(path.join(TEST_ROOT, '[Empty].mdx'), `---\n$type: View\nentityType: Empty\n---\n`)

    const view = await views.getView('[Empty]')
    expect(view!.components).toEqual([])
  })

  it('handles template with no components', async () => {
    await fs.writeFile(
      path.join(TEST_ROOT, '[Simple].mdx'),
      `---
$type: View
entityType: Simple
---

# {name}

Just some content without any components.
`
    )

    const view = await views.getView('[Simple]')
    expect(view!.components).toEqual([])
  })

  it('handles malformed frontmatter gracefully', async () => {
    await fs.writeFile(path.join(TEST_ROOT, '[Broken].mdx'), `not valid yaml\n<Posts />`)

    const view = await views.getView('[Broken]')
    // Should still parse or return null, not throw
    expect(view === null || view.components.length >= 0).toBe(true)
  })

  it('handles unicode in template', async () => {
    await fs.writeFile(
      path.join(TEST_ROOT, '[Unicode].mdx'),
      `---
$type: View
entityType: Unicode
---

# {name} 🎉

## 文章列表
<Posts />
`
    )

    const view = await views.getView('[Unicode]')
    expect(view!.template).toContain('🎉')
    expect(view!.template).toContain('文章列表')
  })

  it('handles deeply nested expressions', async () => {
    await fs.writeFile(
      path.join(TEST_ROOT, '[Nested].mdx'),
      `---
$type: View
entityType: Nested
---

# {user.profile.settings.displayName}

<Posts />
`
    )

    const view = await views.getView('[Nested]')
    expect(view!.template).toContain('{user.profile.settings.displayName}')
  })

  it('handles multiple same-type components', async () => {
    await fs.writeFile(
      path.join(TEST_ROOT, '[Multi].mdx'),
      `---
$type: View
entityType: Multi
---

## Recent Posts
<Posts limit={5} />

## Popular Posts
<Posts popular={true} />
`
    )

    const view = await views.getView('[Multi]')
    // Should only have one unique component type
    expect(view!.components.filter(c => c.name === 'Posts')).toHaveLength(1)
  })

  it('handles view files with .md extension', async () => {
    config = { root: TEST_ROOT, extensions: ['.mdx', '.md'] }
    views = createFsViewManager(config, provider)

    await fs.writeFile(path.join(TEST_ROOT, '[Tag].md'), `---\n$type: View\nentityType: Tag\n---\n<Posts />`)

    const view = await views.getView('[Tag]')
    expect(view).not.toBeNull()
    expect(view!.entityType).toBe('Tag')
  })
})

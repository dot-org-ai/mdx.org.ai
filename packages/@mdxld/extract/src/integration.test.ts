import { describe, it, expect } from 'vitest'
import {
  blogPostTemplate,
  extractBlogPost,
  syncBlogPostEdits,
  PropertyTable,
  ContentManager,
  mdxdbIntegrationExample,
  aiEditingWorkflowExample
} from './integration.js'

describe('Blog Post Round-Trip', () => {
  const rendered = `# My First Post

*By John Doe on 2024-01-15*

This is the content of my first blog post.

---

**Tags:** hello, world`

  it('should extract blog post data from rendered markdown', () => {
    const result = extractBlogPost(rendered)

    expect(result.data).toEqual({
      post: {
        title: 'My First Post',
        author: 'John Doe',
        date: '2024-01-15',
        content: 'This is the content of my first blog post.',
        tags: 'hello, world'
      }
    })
    expect(result.confidence).toBe(1)
  })

  it('should sync edits back to structured data', () => {
    const original = {
      title: 'My First Post',
      author: 'John Doe',
      date: '2024-01-15',
      content: 'This is the content of my first blog post.',
      tags: 'hello, world'
    }

    const edited = `# My Updated Post

*By John Doe on 2024-01-15*

This is the UPDATED content!

---

**Tags:** hello, world, updated`

    const { updated, changes } = syncBlogPostEdits({ post: original }, edited)

    expect(changes.hasChanges).toBe(true)
    expect(changes.modified).toHaveProperty('post.title')
    expect(changes.modified['post.title'].to).toBe('My Updated Post')
    expect(updated.post.title).toBe('My Updated Post')
    expect(updated.post.content).toBe('This is the UPDATED content!')
  })
})

describe('PropertyTable Component', () => {
  it('should render properties to markdown table', () => {
    const props = {
      properties: [
        { name: 'id', type: 'string', description: 'Unique identifier' },
        { name: 'name', type: 'string', description: 'Display name' }
      ]
    }

    const rendered = PropertyTable.render(props)

    expect(rendered).toContain('| Property | Type | Description |')
    expect(rendered).toContain('| id | string | Unique identifier |')
    expect(rendered).toContain('| name | string | Display name |')
  })

  it('should extract properties from markdown table', () => {
    const markdown = `| Property | Type | Description |
|---|---|---|
| id | string | Unique identifier |
| name | string | Display name |`

    const extracted = PropertyTable.extract(markdown)

    expect(extracted).toEqual({
      properties: [
        { name: 'id', type: 'string', description: 'Unique identifier' },
        { name: 'name', type: 'string', description: 'Display name' }
      ]
    })
  })

  it('should round-trip properties correctly', () => {
    const original = {
      properties: [
        { name: 'email', type: 'Email', description: 'Email address' },
        { name: 'phone', type: 'Phone', description: 'Phone number' }
      ]
    }

    const rendered = PropertyTable.render(original)
    const extracted = PropertyTable.extract(rendered)

    expect(extracted).toEqual(original)
  })
})

describe('ContentManager CMS Integration', () => {
  it('should create and retrieve documents', async () => {
    const cms = new ContentManager()

    const doc = await cms.create({
      type: 'BlogPost',
      data: { title: 'Hello', content: 'World' },
      content: '# Hello\n\nWorld',
      template: '# {data.title}\n\n{data.content}'
    })

    expect(doc.id).toBeDefined()
    expect(doc.updatedAt).toBeInstanceOf(Date)

    const retrieved = await cms.get(doc.id)
    expect(retrieved).toEqual(doc)
  })

  it('should update document from edited markdown', async () => {
    const cms = new ContentManager()

    const doc = await cms.create({
      type: 'BlogPost',
      data: { title: 'Original', content: 'Original content' },
      content: '# Original\n\nOriginal content',
      template: '# {data.title}\n\n{data.content}'
    })

    const { doc: updated, changes } = await cms.updateFromMarkdown(
      doc.id,
      '# Updated Title\n\nNew content here'
    )

    expect(changes.hasChanges).toBe(true)
    expect(updated.data.data.title).toBe('Updated Title')
    expect(updated.data.data.content).toBe('New content here')
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(doc.updatedAt.getTime())
  })

  it('should throw for non-existent document', async () => {
    const cms = new ContentManager()

    await expect(
      cms.updateFromMarkdown('non-existent', 'content')
    ).rejects.toThrow('Document not found')
  })
})

describe('mdxdb Integration Example', () => {
  it('should demonstrate full round-trip workflow', async () => {
    const { original, result, changes, updated } = await mdxdbIntegrationExample()

    // Original should be unchanged
    expect(original.title).toBe('Hello World')

    // Result should contain extracted data
    expect(result.data).toBeDefined()

    // Changes should be detected
    expect(changes.hasChanges).toBe(true)

    // Updated should have new values
    expect(updated.post.title).toContain('Updated')
  })
})

describe('AI Editing Workflow Example', () => {
  it('should demonstrate AI editing with extraction', async () => {
    const { original, result, changes } = await aiEditingWorkflowExample()

    // Original should be unchanged
    expect(original.title).toBe('Product Launch')

    // Result should contain extracted data
    expect(result.data).toBeDefined()

    // AI changes should be detected
    expect(changes.hasChanges).toBe(true)
    expect(changes.modified).toHaveProperty('data.title')
  })
})

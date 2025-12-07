/**
 * @mdxdb/github Integration Tests
 *
 * Tests against an actual GitHub repository.
 *
 * Required environment variables:
 *   GITHUB_TOKEN        - GitHub personal access token with repo scope
 *   GITHUB_TEST_OWNER   - Repository owner (user or org)
 *   GITHUB_TEST_REPO    - Repository name
 *   GITHUB_TEST_BRANCH  - Branch to use (default: 'mdxdb-test')
 *
 * Run with:
 *   GITHUB_TOKEN=xxx GITHUB_TEST_OWNER=myorg GITHUB_TEST_REPO=test-repo pnpm --filter @mdxdb/github test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createGitHubDatabase } from '../src/index.js'
import type { Database } from 'mdxdb'
import type { MDXLDDocument, MDXLDData } from 'mdxld'

// Check for required environment variables
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_TEST_OWNER = process.env.GITHUB_TEST_OWNER
const GITHUB_TEST_REPO = process.env.GITHUB_TEST_REPO
const GITHUB_TEST_BRANCH = process.env.GITHUB_TEST_BRANCH || 'mdxdb-test'

const SKIP_INTEGRATION = !GITHUB_TOKEN || !GITHUB_TEST_OWNER || !GITHUB_TEST_REPO

if (SKIP_INTEGRATION) {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║  Skipping GitHub integration tests - missing environment variables          ║
║                                                                              ║
║  To run integration tests, set:                                              ║
║    GITHUB_TOKEN        - GitHub personal access token with repo scope        ║
║    GITHUB_TEST_OWNER   - Repository owner (user or org)                      ║
║    GITHUB_TEST_REPO    - Repository name                                     ║
║    GITHUB_TEST_BRANCH  - Branch to use (optional, default: 'mdxdb-test')     ║
║                                                                              ║
║  Example:                                                                    ║
║    GITHUB_TOKEN=ghp_xxx \\                                                   ║
║    GITHUB_TEST_OWNER=myorg \\                                                ║
║    GITHUB_TEST_REPO=content-test \\                                          ║
║    pnpm --filter @mdxdb/github test:integration                              ║
╚════════════════════════════════════════════════════════════════════════════╝
`)
}

// Generate unique test prefix to avoid collisions
const TEST_PREFIX = `mdxdb-test-${Date.now()}`

describe.skipIf(SKIP_INTEGRATION)('@mdxdb/github Integration Tests', () => {
  let db: Database<MDXLDData>
  const createdDocs: string[] = []

  beforeAll(async () => {
    console.log(`\n🔗 Connecting to GitHub: ${GITHUB_TEST_OWNER}/${GITHUB_TEST_REPO}@${GITHUB_TEST_BRANCH}`)
    console.log(`📁 Test prefix: ${TEST_PREFIX}\n`)

    db = createGitHubDatabase({
      auth: { token: GITHUB_TOKEN! },
      repository: {
        owner: GITHUB_TEST_OWNER!,
        repo: GITHUB_TEST_REPO!,
      },
      branch: GITHUB_TEST_BRANCH,
      basePath: TEST_PREFIX,
      commitMessage: '[mdxdb-test] {path}',
      committer: {
        name: 'mdxdb-test',
        email: 'mdxdb-test@example.com',
      },
    })
  })

  afterAll(async () => {
    // Clean up all created test documents
    console.log(`\n🧹 Cleaning up ${createdDocs.length} test documents...`)

    for (const id of createdDocs) {
      try {
        await db.delete(id)
        console.log(`  ✓ Deleted: ${id}`)
      } catch (error) {
        console.log(`  ✗ Failed to delete: ${id}`, error)
      }
    }

    await db.close?.()
    console.log('✅ Cleanup complete\n')
  })

  describe('Document CRUD', () => {
    it('creates a document via GitHub API', async () => {
      const id = 'crud/create-test'
      const doc: MDXLDDocument = {
        type: 'TestDoc',
        data: {
          title: 'Integration Test Document',
          timestamp: new Date().toISOString(),
        },
        content: '# Integration Test\n\nThis document was created by @mdxdb/github integration tests.',
      }

      const result = await db.set(id, doc)
      createdDocs.push(id)

      expect(result.created).toBe(true)
      expect(result.id).toBe(id)

      console.log(`  ✓ Created document: ${id}`)
    })

    it('retrieves the created document', async () => {
      const id = 'crud/create-test'
      const doc = await db.get(id)

      expect(doc).not.toBeNull()
      expect(doc?.type).toBe('TestDoc')
      expect(doc?.data.title).toBe('Integration Test Document')
      expect(doc?.content).toContain('# Integration Test')

      console.log(`  ✓ Retrieved document: ${id}`)
    })

    it('updates an existing document', async () => {
      const id = 'crud/update-test'

      // Create initial document
      await db.set(id, {
        type: 'TestDoc',
        data: { title: 'Original Title', version: 1 },
        content: '# Original Content',
      })
      createdDocs.push(id)

      // Update it
      const result = await db.set(id, {
        type: 'TestDoc',
        data: { title: 'Updated Title', version: 2 },
        content: '# Updated Content',
      })

      expect(result.created).toBe(false)

      // Verify update
      const doc = await db.get(id)
      expect(doc?.data.title).toBe('Updated Title')
      expect(doc?.data.version).toBe(2)

      console.log(`  ✓ Updated document: ${id}`)
    })

    it('deletes a document', async () => {
      const id = 'crud/delete-test'

      // Create document
      await db.set(id, {
        type: 'TestDoc',
        data: { title: 'To Be Deleted' },
        content: '# Delete Me',
      })

      // Delete it (don't add to createdDocs since we're deleting it here)
      const result = await db.delete(id)
      expect(result.deleted).toBe(true)

      // Verify deletion
      const doc = await db.get(id)
      expect(doc).toBeNull()

      console.log(`  ✓ Deleted document: ${id}`)
    })

    it('returns null for non-existent document', async () => {
      const doc = await db.get('nonexistent/document-xyz-123')
      expect(doc).toBeNull()
    })

    it('respects createOnly option', async () => {
      const id = 'crud/createonly-test'

      // Create first
      await db.set(id, {
        type: 'TestDoc',
        data: { title: 'First' },
        content: '# First',
      })
      createdDocs.push(id)

      // Try to create again with createOnly
      await expect(
        db.set(id, { type: 'TestDoc', data: { title: 'Second' }, content: '# Second' }, { createOnly: true })
      ).rejects.toThrow('already exists')

      console.log(`  ✓ createOnly prevents overwrite`)
    })

    it('respects updateOnly option', async () => {
      await expect(
        db.set(
          'crud/nonexistent-updateonly',
          { type: 'TestDoc', data: { title: 'Test' }, content: '# Test' },
          { updateOnly: true }
        )
      ).rejects.toThrow('does not exist')

      console.log(`  ✓ updateOnly requires existing document`)
    })
  })

  describe('List Operations', () => {
    beforeAll(async () => {
      // Create test documents for listing
      const docs = [
        { id: 'list/post-1', type: 'Post', title: 'First Post' },
        { id: 'list/post-2', type: 'Post', title: 'Second Post' },
        { id: 'list/post-3', type: 'Post', title: 'Third Post' },
        { id: 'list/article-1', type: 'Article', title: 'An Article' },
        { id: 'list/page-1', type: 'Page', title: 'About Page' },
      ]

      for (const d of docs) {
        await db.set(d.id, {
          type: d.type,
          data: { title: d.title },
          content: `# ${d.title}`,
        })
        createdDocs.push(d.id)
      }

      console.log(`  📝 Created ${docs.length} test documents for listing`)
    })

    it('lists all documents', async () => {
      const result = await db.list()

      expect(result.documents.length).toBeGreaterThanOrEqual(5)
      expect(result.total).toBeGreaterThanOrEqual(5)

      console.log(`  ✓ Listed ${result.total} documents`)
    })

    it('lists with pagination', async () => {
      const page1 = await db.list({ limit: 2, offset: 0 })
      const page2 = await db.list({ limit: 2, offset: 2 })

      expect(page1.documents.length).toBe(2)
      expect(page1.hasMore).toBe(true)

      // Documents should be different
      const page1Ids = page1.documents.map((d) => d.id)
      const page2Ids = page2.documents.map((d) => d.id)
      expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false)

      console.log(`  ✓ Pagination works correctly`)
    })

    it('filters by type', async () => {
      const result = await db.list({ type: 'Post' })

      expect(result.documents.length).toBe(3)
      expect(result.documents.every((d) => d.type === 'Post')).toBe(true)

      console.log(`  ✓ Type filter works: found ${result.documents.length} Posts`)
    })

    it('filters by prefix', async () => {
      const result = await db.list({ prefix: 'list/' })

      expect(result.documents.length).toBe(5)

      console.log(`  ✓ Prefix filter works: found ${result.documents.length} in list/`)
    })

    it('sorts by field', async () => {
      const result = await db.list({ sortBy: 'title', sortOrder: 'asc' })

      const titles = result.documents.map((d) => d.data.title as string)
      const sorted = [...titles].sort()
      expect(titles).toEqual(sorted)

      console.log(`  ✓ Sorting works correctly`)
    })
  })

  describe('Search Operations', () => {
    beforeAll(async () => {
      // Create searchable documents
      const docs = [
        { id: 'search/typescript-guide', title: 'TypeScript Guide', content: 'Learn TypeScript basics' },
        { id: 'search/javascript-tips', title: 'JavaScript Tips', content: 'Modern JavaScript patterns' },
        { id: 'search/react-hooks', title: 'React Hooks', content: 'Using hooks in React applications' },
      ]

      for (const d of docs) {
        await db.set(d.id, {
          type: 'Tutorial',
          data: { title: d.title },
          content: `# ${d.title}\n\n${d.content}`,
        })
        createdDocs.push(d.id)
      }

      console.log(`  📝 Created ${docs.length} searchable documents`)

      // Wait a bit for GitHub's search index to update
      console.log(`  ⏳ Waiting for search index...`)
      await new Promise((resolve) => setTimeout(resolve, 2000))
    })

    it('searches documents by content', async () => {
      // Use in-memory fallback search (more reliable for tests)
      const result = await db.search({ query: 'TypeScript' })

      expect(result.documents.length).toBeGreaterThanOrEqual(1)

      console.log(`  ✓ Search found ${result.documents.length} results for "TypeScript"`)
    })

    it('returns scored results', async () => {
      const result = await db.search({ query: 'JavaScript' })

      if (result.documents.length > 0) {
        expect(result.documents[0]).toHaveProperty('score')
      }

      console.log(`  ✓ Search results include scores`)
    })
  })

  describe('Edge Cases', () => {
    it('handles nested paths', async () => {
      const id = 'edge/deeply/nested/path/document'

      await db.set(id, {
        type: 'TestDoc',
        data: { title: 'Deeply Nested' },
        content: '# Nested',
      })
      createdDocs.push(id)

      const doc = await db.get(id)
      expect(doc).not.toBeNull()
      expect(doc?.data.title).toBe('Deeply Nested')

      console.log(`  ✓ Handles deeply nested paths`)
    })

    it('handles special characters in content', async () => {
      const id = 'edge/special-chars'

      await db.set(id, {
        type: 'TestDoc',
        data: {
          title: 'Special: "quotes" & <brackets>',
          emoji: '🚀 👍 ✨',
        },
        content: '# Special Characters\n\nCode: `const x = "hello"`\n\n```js\nconst y = { a: 1 };\n```',
      })
      createdDocs.push(id)

      const doc = await db.get(id)
      expect(doc?.data.emoji).toBe('🚀 👍 ✨')
      expect(doc?.content).toContain('```js')

      console.log(`  ✓ Handles special characters and emoji`)
    })

    it('handles large documents', async () => {
      const id = 'edge/large-doc'
      const largeContent = '# Large Document\n\n' + 'Lorem ipsum dolor sit amet. '.repeat(1000)

      await db.set(id, {
        type: 'TestDoc',
        data: { title: 'Large Document', size: 'large' },
        content: largeContent,
      })
      createdDocs.push(id)

      const doc = await db.get(id)
      expect(doc?.content.length).toBeGreaterThan(10000)

      console.log(`  ✓ Handles large documents (${doc?.content.length} chars)`)
    })
  })
})

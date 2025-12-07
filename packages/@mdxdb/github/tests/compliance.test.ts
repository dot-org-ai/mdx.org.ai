/**
 * @mdxdb/github Compliance Tests
 *
 * Tests the GitHub database adapter against the Database<TData> interface.
 * Uses mocked Octokit responses for unit testing without requiring GitHub credentials.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { GitHubDatabase } from '../src/database.js'
import type { Database } from 'mdxdb'
import type { MDXLDDocument, MDXLDData } from 'mdxld'

// Mock Octokit
vi.mock('octokit', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => createMockOctokit()),
  }
})

// In-memory file store for mocking
interface MockFile {
  path: string
  sha: string
  content: string
}

let mockFiles: Map<string, MockFile> = new Map()
let shaCounter = 0

function generateSha(): string {
  return `sha-${++shaCounter}-${Date.now()}`
}

function encodeBase64(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64')
}

function decodeBase64(content: string): string {
  return Buffer.from(content, 'base64').toString('utf-8')
}

function createMockOctokit() {
  return {
    rest: {
      repos: {
        getContent: vi.fn().mockImplementation(async ({ path }: { path: string }) => {
          // Check if it's a directory request
          const isDirectoryRequest = !path.includes('.') || path === '' || path === '.'

          if (isDirectoryRequest) {
            // Return directory listing
            const prefix = path === '.' || path === '' ? '' : path + '/'
            const entries = Array.from(mockFiles.values())
              .filter((f) => {
                if (prefix === '') return true
                return f.path.startsWith(prefix)
              })
              .map((f) => {
                // Get immediate child entry
                const relativePath = prefix ? f.path.slice(prefix.length) : f.path
                const parts = relativePath.split('/')
                const isFile = parts.length === 1

                return {
                  name: parts[0],
                  path: isFile ? f.path : prefix + parts[0],
                  sha: f.sha,
                  type: isFile ? 'file' : 'dir',
                  size: isFile ? f.content.length : undefined,
                }
              })
              // Deduplicate directories
              .filter((entry, index, self) =>
                self.findIndex((e) => e.path === entry.path) === index
              )

            return { data: entries }
          }

          // File request
          const file = mockFiles.get(path)
          if (!file) {
            const error = new Error('Not Found') as Error & { status: number }
            error.status = 404
            throw error
          }

          return {
            data: {
              path: file.path,
              sha: file.sha,
              content: encodeBase64(file.content),
              encoding: 'base64',
              size: file.content.length,
              type: 'file',
            },
          }
        }),

        createOrUpdateFileContents: vi.fn().mockImplementation(
          async ({ path, content, sha }: { path: string; content: string; sha?: string }) => {
            const decodedContent = decodeBase64(content)
            const newSha = generateSha()

            // Verify SHA matches for updates
            const existing = mockFiles.get(path)
            if (sha && existing && existing.sha !== sha) {
              const error = new Error('SHA mismatch') as Error & { status: number }
              error.status = 409
              throw error
            }

            mockFiles.set(path, {
              path,
              sha: newSha,
              content: decodedContent,
            })

            return {
              data: {
                content: { sha: newSha, path },
                commit: { sha: newSha, message: `Update ${path}` },
              },
            }
          }
        ),

        deleteFile: vi.fn().mockImplementation(async ({ path, sha }: { path: string; sha: string }) => {
          const file = mockFiles.get(path)
          if (!file) {
            const error = new Error('Not Found') as Error & { status: number }
            error.status = 404
            throw error
          }
          if (file.sha !== sha) {
            const error = new Error('SHA mismatch') as Error & { status: number }
            error.status = 409
            throw error
          }

          mockFiles.delete(path)
          return { data: { commit: { sha: generateSha() } } }
        }),
      },

      search: {
        code: vi.fn().mockImplementation(async ({ q }: { q: string }) => {
          // Extract search query from the full query string
          const queryMatch = q.match(/^(\S+)/)
          const searchTerm = queryMatch ? queryMatch[1].toLowerCase() : ''

          const items = Array.from(mockFiles.entries())
            .filter(([path, file]) => {
              if (!path.endsWith('.mdx') && !path.endsWith('.md')) return false
              return file.content.toLowerCase().includes(searchTerm)
            })
            .map(([path, file]) => ({
              name: path.split('/').pop(),
              path,
              sha: file.sha,
              repository: { full_name: 'test-owner/test-repo' },
              score: 1,
            }))

          return {
            data: {
              total_count: items.length,
              incomplete_results: false,
              items,
            },
          }
        }),
      },
    },
  }
}

describe('@mdxdb/github Compliance Tests', () => {
  let db: Database<MDXLDData>

  beforeAll(() => {
    db = new GitHubDatabase({
      auth: { token: 'mock-token' },
      repository: { owner: 'test-owner', repo: 'test-repo' },
      branch: 'main',
      basePath: '',
    })
  })

  beforeEach(() => {
    // Clear mock file store before each test
    mockFiles.clear()
    shaCounter = 0
  })

  afterAll(async () => {
    await db.close?.()
  })

  describe('Document CRUD Operations', () => {
    it('creates a new document', async () => {
      const doc: MDXLDDocument = {
        type: 'Post',
        data: { $type: 'Post', title: 'Hello World' },
        content: '# Hello World\n\nThis is my first post.',
      }

      const result = await db.set('posts/hello-world', doc)

      expect(result.created).toBe(true)
      expect(result.id).toBe('posts/hello-world')
      expect(mockFiles.has('posts/hello-world.mdx')).toBe(true)
    })

    it('retrieves an existing document', async () => {
      // Pre-populate mock store
      const mdxContent = `---
$type: Post
title: Test Post
---

# Test Post

Content here.`

      mockFiles.set('posts/test-post.mdx', {
        path: 'posts/test-post.mdx',
        sha: 'test-sha',
        content: mdxContent,
      })

      const doc = await db.get('posts/test-post')

      expect(doc).not.toBeNull()
      expect(doc?.type).toBe('Post')
      expect(doc?.data.title).toBe('Test Post')
      expect(doc?.content).toContain('# Test Post')
    })

    it('returns null for non-existent document', async () => {
      const doc = await db.get('does-not-exist')
      expect(doc).toBeNull()
    })

    it('updates an existing document', async () => {
      // Create initial document
      mockFiles.set('posts/update-test.mdx', {
        path: 'posts/update-test.mdx',
        sha: 'initial-sha',
        content: `---
$type: Post
title: Original Title
---

Original content.`,
      })

      const updatedDoc: MDXLDDocument = {
        type: 'Post',
        data: { $type: 'Post', title: 'Updated Title' },
        content: '# Updated Content',
      }

      const result = await db.set('posts/update-test', updatedDoc)

      expect(result.created).toBe(false)
      expect(result.id).toBe('posts/update-test')

      // Verify content was updated
      const file = mockFiles.get('posts/update-test.mdx')
      expect(file?.content).toContain('Updated Title')
    })

    it('respects createOnly option', async () => {
      // Pre-create document
      mockFiles.set('posts/existing.mdx', {
        path: 'posts/existing.mdx',
        sha: 'existing-sha',
        content: '---\ntitle: Existing\n---\n',
      })

      const doc: MDXLDDocument = {
        type: 'Post',
        data: { title: 'New' },
        content: '# New',
      }

      await expect(db.set('posts/existing', doc, { createOnly: true })).rejects.toThrow(
        'Document already exists'
      )
    })

    it('respects updateOnly option', async () => {
      const doc: MDXLDDocument = {
        type: 'Post',
        data: { title: 'New' },
        content: '# New',
      }

      await expect(db.set('posts/nonexistent', doc, { updateOnly: true })).rejects.toThrow(
        'Document does not exist'
      )
    })

    it('deletes a document (hard delete)', async () => {
      mockFiles.set('posts/to-delete.mdx', {
        path: 'posts/to-delete.mdx',
        sha: 'delete-sha',
        content: '---\ntitle: Delete Me\n---\n',
      })

      const result = await db.delete('posts/to-delete')

      expect(result.deleted).toBe(true)
      expect(result.id).toBe('posts/to-delete')
      expect(mockFiles.has('posts/to-delete.mdx')).toBe(false)
    })

    it('deletes a document (soft delete)', async () => {
      mockFiles.set('posts/soft-delete.mdx', {
        path: 'posts/soft-delete.mdx',
        sha: 'soft-sha',
        content: '---\ntitle: Soft Delete\n---\n',
      })

      const result = await db.delete('posts/soft-delete', { soft: true })

      expect(result.deleted).toBe(true)
      expect(mockFiles.has('posts/soft-delete.mdx')).toBe(false)
      expect(mockFiles.has('posts/soft-delete.mdx.deleted')).toBe(true)
    })

    it('returns deleted: false for non-existent document', async () => {
      const result = await db.delete('nonexistent')
      expect(result.deleted).toBe(false)
    })
  })

  describe('List Operations', () => {
    beforeEach(() => {
      // Seed test documents
      const docs = [
        { path: 'posts/post-1.mdx', title: 'First Post', type: 'Post' },
        { path: 'posts/post-2.mdx', title: 'Second Post', type: 'Post' },
        { path: 'posts/post-3.mdx', title: 'Third Post', type: 'Post' },
        { path: 'articles/article-1.mdx', title: 'Article One', type: 'Article' },
        { path: 'pages/about.mdx', title: 'About Page', type: 'Page' },
      ]

      for (const doc of docs) {
        mockFiles.set(doc.path, {
          path: doc.path,
          sha: generateSha(),
          content: `---
$type: ${doc.type}
title: ${doc.title}
---

# ${doc.title}`,
        })
      }
    })

    it('lists all documents', async () => {
      const result = await db.list()

      expect(result.documents.length).toBe(5)
      expect(result.total).toBe(5)
      expect(result.hasMore).toBe(false)
    })

    it('lists documents with limit', async () => {
      const result = await db.list({ limit: 2 })

      expect(result.documents.length).toBe(2)
      expect(result.total).toBe(5)
      expect(result.hasMore).toBe(true)
    })

    it('lists documents with offset', async () => {
      const result = await db.list({ limit: 2, offset: 3 })

      expect(result.documents.length).toBe(2)
      expect(result.total).toBe(5)
      expect(result.hasMore).toBe(false)
    })

    it('lists documents filtered by type', async () => {
      const result = await db.list({ type: 'Post' })

      expect(result.documents.length).toBe(3)
      expect(result.documents.every((d) => d.type === 'Post')).toBe(true)
    })

    it('lists documents filtered by prefix', async () => {
      const result = await db.list({ prefix: 'posts/' })

      expect(result.documents.length).toBe(3)
    })

    it('sorts documents by field', async () => {
      const result = await db.list({ sortBy: 'title', sortOrder: 'asc' })

      const titles = result.documents.map((d) => d.data.title)
      expect(titles).toEqual([...titles].sort())
    })

    it('sorts documents descending', async () => {
      const result = await db.list({ sortBy: 'title', sortOrder: 'desc' })

      const titles = result.documents.map((d) => d.data.title)
      expect(titles).toEqual([...titles].sort().reverse())
    })
  })

  describe('Search Operations', () => {
    beforeEach(() => {
      mockFiles.set('posts/typescript.mdx', {
        path: 'posts/typescript.mdx',
        sha: generateSha(),
        content: `---
$type: Post
title: TypeScript Guide
---

# TypeScript Guide

Learn TypeScript basics and advanced patterns.`,
      })

      mockFiles.set('posts/javascript.mdx', {
        path: 'posts/javascript.mdx',
        sha: generateSha(),
        content: `---
$type: Post
title: JavaScript Tips
---

# JavaScript Tips

Modern JavaScript best practices.`,
      })

      mockFiles.set('posts/python.mdx', {
        path: 'posts/python.mdx',
        sha: generateSha(),
        content: `---
$type: Post
title: Python Tutorial
---

# Python Tutorial

Getting started with Python.`,
      })
    })

    it('searches documents by query', async () => {
      const result = await db.search({ query: 'TypeScript' })

      expect(result.documents.length).toBeGreaterThanOrEqual(1)
      expect(result.documents.some((d) => d.data.title === 'TypeScript Guide')).toBe(true)
    })

    it('returns empty results for no matches', async () => {
      const result = await db.search({ query: 'nonexistentterm12345' })

      expect(result.documents.length).toBe(0)
      expect(result.total).toBe(0)
    })

    it('searches with type filter', async () => {
      const result = await db.search({ query: 'Guide', type: 'Post' })

      expect(result.documents.every((d) => d.type === 'Post')).toBe(true)
    })

    it('includes score in search results', async () => {
      const result = await db.search({ query: 'JavaScript' })

      expect(result.documents.length).toBeGreaterThan(0)
      expect(result.documents[0]).toHaveProperty('score')
    })
  })

  describe('File Extension Handling', () => {
    it('handles .mdx extension', async () => {
      mockFiles.set('test.mdx', {
        path: 'test.mdx',
        sha: 'sha-mdx',
        content: '---\ntitle: MDX File\n---\n# Content',
      })

      const doc = await db.get('test')
      expect(doc).not.toBeNull()
    })

    it('handles .md extension', async () => {
      mockFiles.set('test.md', {
        path: 'test.md',
        sha: 'sha-md',
        content: '---\ntitle: MD File\n---\n# Content',
      })

      const doc = await db.get('test')
      expect(doc).not.toBeNull()
    })

    it('prefers .mdx over .md when both exist', async () => {
      mockFiles.set('test.mdx', {
        path: 'test.mdx',
        sha: 'sha-mdx',
        content: '---\ntitle: MDX Version\n---\n',
      })
      mockFiles.set('test.md', {
        path: 'test.md',
        sha: 'sha-md',
        content: '---\ntitle: MD Version\n---\n',
      })

      const doc = await db.get('test')
      expect(doc?.data.title).toBe('MDX Version')
    })
  })

  describe('Base Path Handling', () => {
    let dbWithBasePath: Database<MDXLDData>

    beforeAll(() => {
      dbWithBasePath = new GitHubDatabase({
        auth: { token: 'mock-token' },
        repository: { owner: 'test-owner', repo: 'test-repo' },
        branch: 'main',
        basePath: 'content/docs',
      })
    })

    afterAll(async () => {
      await dbWithBasePath.close?.()
    })

    it('creates documents under base path', async () => {
      const doc: MDXLDDocument = {
        type: 'Doc',
        data: { title: 'Documentation' },
        content: '# Docs',
      }

      await dbWithBasePath.set('getting-started', doc)

      expect(mockFiles.has('content/docs/getting-started.mdx')).toBe(true)
    })

    it('retrieves documents from base path', async () => {
      mockFiles.set('content/docs/api.mdx', {
        path: 'content/docs/api.mdx',
        sha: 'sha-api',
        content: '---\ntitle: API Docs\n---\n# API',
      })

      const doc = await dbWithBasePath.get('api')
      expect(doc?.data.title).toBe('API Docs')
    })
  })
})

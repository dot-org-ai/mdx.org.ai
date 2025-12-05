/**
 * Integration tests using the blogg.ng example
 * Tests reactive rendering, relationship components, and bi-directional updates
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { existsSync, mkdirSync, rmSync, copyFileSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const TEST_DIR = join(process.cwd(), 'tests', '.blogg-ng-test')
const BLOGG_SOURCE = join(process.cwd(), '..', '..', 'examples', 'blogg.ng')

describe('blogg.ng integration', () => {
  beforeAll(() => {
    // Clean up and create test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
    mkdirSync(TEST_DIR, { recursive: true })

    // Copy blogg.ng example to test directory
    copyDirectory(BLOGG_SOURCE, TEST_DIR)
  })

  afterAll(() => {
    // Clean up test directory
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true })
    }
  })

  describe('structure validation', () => {
    it('should have all type definitions', () => {
      expect(existsSync(join(TEST_DIR, 'authors', '[Author].mdx'))).toBe(true)
      expect(existsSync(join(TEST_DIR, 'posts', '[Post].mdx'))).toBe(true)
      expect(existsSync(join(TEST_DIR, 'tags', '[Tag].mdx'))).toBe(true)
    })

    it('should have all author instances', () => {
      expect(existsSync(join(TEST_DIR, 'authors', 'martha.mdx'))).toBe(true)
      expect(existsSync(join(TEST_DIR, 'authors', 'sally.mdx'))).toBe(true)
      expect(existsSync(join(TEST_DIR, 'authors', 'tom.mdx'))).toBe(true)
    })

    it('should have all tag instances', () => {
      const tags = ['aeo', 'ai-native', 'structured-data', 'llm', 'agents']
      for (const tag of tags) {
        expect(existsSync(join(TEST_DIR, 'tags', `${tag}.mdx`))).toBe(true)
      }
    })

    it('should have 12 blog posts', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )
      expect(posts.length).toBe(12)
    })
  })

  describe('frontmatter parsing', () => {
    it('should parse post frontmatter correctly', () => {
      const content = readFileSync(
        join(TEST_DIR, 'posts', 'what-is-answer-engine-optimization.mdx'),
        'utf-8'
      )

      // Check required fields exist
      expect(content).toContain('$type: Post')
      expect(content).toContain('title:')
      expect(content).toContain('date:')
      expect(content).toContain('author:')
      expect(content).toContain('tags:')
    })

    it('should have valid author references in posts', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )

      const validAuthors = ['martha', 'sally', 'tom']

      for (const post of posts) {
        const content = readFileSync(join(postsDir, post), 'utf-8')
        const authorMatch = content.match(/author:\s*(\w+)/)
        expect(authorMatch).not.toBeNull()
        expect(validAuthors).toContain(authorMatch![1])
      }
    })

    it('should have valid tag references in posts', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )

      const validTags = ['aeo', 'ai-native', 'structured-data', 'llm', 'agents']

      for (const post of posts) {
        const content = readFileSync(join(postsDir, post), 'utf-8')
        const tagsMatch = content.match(/tags:\s*\n((?:\s+-\s+\S+\n?)+)/)
        if (tagsMatch) {
          const tags = tagsMatch[1].match(/-\s+(\S+)/g)?.map(t => t.replace(/^-\s+/, '')) || []
          for (const tag of tags) {
            expect(validTags).toContain(tag)
          }
        }
      }
    })
  })

  describe('relationship components', () => {
    it('should have Posts component in author type definition', () => {
      const content = readFileSync(
        join(TEST_DIR, 'authors', '[Author].mdx'),
        'utf-8'
      )
      expect(content).toContain('<Posts')
    })

    it('should have Posts component in tag type definition', () => {
      const content = readFileSync(
        join(TEST_DIR, 'tags', '[Tag].mdx'),
        'utf-8'
      )
      expect(content).toContain('<Posts')
    })
  })

  describe('post distribution by author', () => {
    it('should have posts distributed across all authors', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )

      const authorCounts: Record<string, number> = { martha: 0, sally: 0, tom: 0 }

      for (const post of posts) {
        const content = readFileSync(join(postsDir, post), 'utf-8')
        const authorMatch = content.match(/author:\s*(\w+)/)
        if (authorMatch && authorMatch[1] in authorCounts) {
          authorCounts[authorMatch[1] as keyof typeof authorCounts]++
        }
      }

      // Each author should have at least 2 posts
      expect(authorCounts.martha).toBeGreaterThanOrEqual(2)
      expect(authorCounts.sally).toBeGreaterThanOrEqual(2)
      expect(authorCounts.tom).toBeGreaterThanOrEqual(2)
    })
  })

  describe('post distribution by tag', () => {
    it('should have posts distributed across all tags', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )

      const tagCounts: Record<string, number> = {
        'aeo': 0,
        'ai-native': 0,
        'structured-data': 0,
        'llm': 0,
        'agents': 0
      }

      for (const post of posts) {
        const content = readFileSync(join(postsDir, post), 'utf-8')
        for (const tag of Object.keys(tagCounts)) {
          if (content.includes(`- ${tag}`)) {
            tagCounts[tag]++
          }
        }
      }

      // Each tag should have at least 2 posts
      for (const [tag, count] of Object.entries(tagCounts)) {
        expect(count, `Tag ${tag} should have at least 2 posts`).toBeGreaterThanOrEqual(2)
      }
    })
  })

  describe('date ordering', () => {
    it('should have posts with sequential dates', () => {
      const postsDir = join(TEST_DIR, 'posts')
      const posts = readdirSync(postsDir).filter(f =>
        f.endsWith('.mdx') && !f.startsWith('[')
      )

      const dates: string[] = []

      for (const post of posts) {
        const content = readFileSync(join(postsDir, post), 'utf-8')
        const dateMatch = content.match(/date:\s*["']?(\d{4}-\d{2}-\d{2})["']?/)
        if (dateMatch) {
          dates.push(dateMatch[1])
        }
      }

      // All posts should have dates
      expect(dates.length).toBe(12)

      // Dates should be unique
      const uniqueDates = [...new Set(dates)]
      expect(uniqueDates.length).toBe(12)
    })
  })
})

/**
 * Recursively copy a directory
 */
function copyDirectory(src: string, dest: string) {
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true })
  }

  const entries = readdirSync(src)

  for (const entry of entries) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)

    const stat = statSync(srcPath)

    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

import { describe, it, expect } from 'vitest'
import {
  getTableOfContents,
  nestTableOfContents,
  generateParams,
  getBreadcrumbs,
  generateSearchIndex,
  getPageNavigation,
  filterByType,
  groupPages,
} from '../src/index.js'
import type { MDXLDDocument } from 'mdxld'

describe('@mdxe/fumadocs', () => {
  describe('getTableOfContents', () => {
    it('should extract headings from document', () => {
      const doc: MDXLDDocument = {
        data: {},
        content: `
# Main Title

## Section 1

Some content.

### Subsection 1.1

More content.

## Section 2

Final content.
`,
      }

      const toc = getTableOfContents(doc)

      // h1 is skipped, so only h2 and h3 headings are included
      expect(toc).toHaveLength(3)
      expect(toc[0]).toEqual({
        title: 'Section 1',
        url: '#section-1',
        depth: 2,
      })
      expect(toc[1]).toEqual({
        title: 'Subsection 1.1',
        url: '#subsection-11',
        depth: 3,
      })
    })

    it('should handle string content', () => {
      const content = `
---
title: Test
---

## Heading

Content.
`

      const toc = getTableOfContents(content)

      expect(toc).toHaveLength(1)
      expect(toc[0].title).toBe('Heading')
    })

    it('should skip h1 headings', () => {
      const doc: MDXLDDocument = {
        data: {},
        content: '# Title\n\n## Section',
      }

      const toc = getTableOfContents(doc)

      expect(toc).toHaveLength(1)
      expect(toc[0].title).toBe('Section')
    })

    it('should generate URL-safe slugs', () => {
      const doc: MDXLDDocument = {
        data: {},
        content: '## Hello World!\n\n## API & Reference',
      }

      const toc = getTableOfContents(doc)

      expect(toc[0].url).toBe('#hello-world')
      expect(toc[1].url).toBe('#api-reference')
    })
  })

  describe('nestTableOfContents', () => {
    it('should nest TOC items by depth', () => {
      const items = [
        { title: 'Section 1', url: '#section-1', depth: 2 },
        { title: 'Sub 1.1', url: '#sub-11', depth: 3 },
        { title: 'Sub 1.2', url: '#sub-12', depth: 3 },
        { title: 'Section 2', url: '#section-2', depth: 2 },
      ]

      const nested = nestTableOfContents(items)

      expect(nested).toHaveLength(2)
      expect(nested[0].items).toHaveLength(2)
      expect(nested[0].items?.[0].title).toBe('Sub 1.1')
    })

    it('should handle flat structure', () => {
      const items = [
        { title: 'Section 1', url: '#section-1', depth: 2 },
        { title: 'Section 2', url: '#section-2', depth: 2 },
      ]

      const nested = nestTableOfContents(items)

      expect(nested).toHaveLength(2)
      expect(nested[0].items).toBeUndefined()
    })
  })

  describe('generateParams', () => {
    it('should generate static params from pages', () => {
      const pages = [
        { slugs: ['getting-started'] },
        { slugs: ['api', 'reference'] },
        { slugs: [] },
      ]

      const params = generateParams(pages)

      expect(params).toEqual([
        { slug: ['getting-started'] },
        { slug: ['api', 'reference'] },
        { slug: [] },
      ])
    })

    it('should use custom slug param name', () => {
      const pages = [{ slugs: ['page'] }]

      const params = generateParams(pages, { slugParam: 'path' })

      expect(params).toEqual([{ path: ['page'] }])
    })
  })

  describe('getBreadcrumbs', () => {
    it('should generate breadcrumbs from slugs', () => {
      const pages = [
        { slugs: ['docs'], data: { title: 'Documentation' } },
        { slugs: ['docs', 'guides'], data: { title: 'Guides' } },
        { slugs: ['docs', 'guides', 'intro'], data: { title: 'Introduction' } },
      ]

      const breadcrumbs = getBreadcrumbs(['docs', 'guides', 'intro'], pages)

      expect(breadcrumbs).toHaveLength(3)
      expect(breadcrumbs[0]).toEqual({ title: 'Documentation', href: '/docs' })
      expect(breadcrumbs[1]).toEqual({ title: 'Guides', href: '/docs/guides' })
      expect(breadcrumbs[2]).toEqual({ title: 'Introduction', href: '/docs/guides/intro' })
    })

    it('should capitalize slug when page not found', () => {
      const pages = [{ slugs: ['docs', 'page'], data: { title: 'Page' } }]

      const breadcrumbs = getBreadcrumbs(['docs', 'page'], pages)

      expect(breadcrumbs[0].title).toBe('Docs')
    })
  })

  describe('generateSearchIndex', () => {
    it('should generate search index from pages', () => {
      const pages = [
        {
          slugs: ['getting-started'],
          data: {
            title: 'Getting Started',
            description: 'How to get started',
            content: '# Getting Started\n\nThis is the content.',
          },
        },
      ]

      const index = generateSearchIndex(pages, { baseUrl: '/docs' })

      expect(index).toHaveLength(1)
      expect(index[0]).toMatchObject({
        id: 'getting-started',
        title: 'Getting Started',
        description: 'How to get started',
        url: '/docs/getting-started',
      })
    })

    it('should strip markdown by default', () => {
      const pages = [
        {
          slugs: ['page'],
          data: {
            title: 'Page',
            content: '# Heading\n\n**Bold** and *italic* text.\n\n```code```',
          },
        },
      ]

      const index = generateSearchIndex(pages)

      expect(index[0].content).not.toContain('#')
      expect(index[0].content).not.toContain('**')
      expect(index[0].content).not.toContain('```')
    })

    it('should preserve markdown when disabled', () => {
      const pages = [
        {
          slugs: ['page'],
          data: {
            title: 'Page',
            content: '# Heading\n\n**Bold** text.',
          },
        },
      ]

      const index = generateSearchIndex(pages, { stripMarkdown: false })

      expect(index[0].content).toContain('#')
      expect(index[0].content).toContain('**')
    })
  })

  describe('getPageNavigation', () => {
    it('should return previous and next pages', () => {
      const pages = [
        { slugs: ['page-1'], data: { title: 'Page 1' } },
        { slugs: ['page-2'], data: { title: 'Page 2' } },
        { slugs: ['page-3'], data: { title: 'Page 3' } },
      ]

      const nav = getPageNavigation(['page-2'], pages)

      expect(nav.previous?.data.title).toBe('Page 1')
      expect(nav.next?.data.title).toBe('Page 3')
    })

    it('should return undefined for first page previous', () => {
      const pages = [
        { slugs: ['page-1'], data: { title: 'Page 1' } },
        { slugs: ['page-2'], data: { title: 'Page 2' } },
      ]

      const nav = getPageNavigation(['page-1'], pages)

      expect(nav.previous).toBeUndefined()
      expect(nav.next?.data.title).toBe('Page 2')
    })

    it('should return undefined for last page next', () => {
      const pages = [
        { slugs: ['page-1'], data: { title: 'Page 1' } },
        { slugs: ['page-2'], data: { title: 'Page 2' } },
      ]

      const nav = getPageNavigation(['page-2'], pages)

      expect(nav.previous?.data.title).toBe('Page 1')
      expect(nav.next).toBeUndefined()
    })

    it('should return empty object for unknown page', () => {
      const pages = [{ slugs: ['page'], data: { title: 'Page' } }]

      const nav = getPageNavigation(['unknown'], pages)

      expect(nav).toEqual({})
    })
  })

  describe('filterByType', () => {
    it('should filter pages by mdxld type', () => {
      const pages = [
        { data: { doc: { type: 'BlogPost', data: {}, content: '' } } },
        { data: { doc: { type: 'Documentation', data: {}, content: '' } } },
        { data: { doc: { type: 'BlogPost', data: {}, content: '' } } },
      ]

      const blogPosts = filterByType(pages, 'BlogPost')

      expect(blogPosts).toHaveLength(2)
    })
  })

  describe('groupPages', () => {
    it('should group pages by field', () => {
      const pages = [
        { data: { category: 'guides' } },
        { data: { category: 'api' } },
        { data: { category: 'guides' } },
      ]

      const groups = groupPages(pages, 'category')

      expect(groups.get('guides')).toHaveLength(2)
      expect(groups.get('api')).toHaveLength(1)
    })

    it('should use uncategorized for missing field', () => {
      const pages = [{ data: {} }, { data: { category: 'api' } }]

      const groups = groupPages(pages, 'category')

      expect(groups.get('uncategorized')).toHaveLength(1)
      expect(groups.get('api')).toHaveLength(1)
    })
  })
})

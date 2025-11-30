import { describe, it, expect } from 'vitest'
import {
  createSource,
  createDynamicSource,
  queryToSource,
  isPage,
  isMeta,
  type VirtualFile,
  type VirtualPage,
  type VirtualMeta,
} from '../src/index.js'
import type { MDXLDDocument } from 'mdxld'

describe('@mdxdb/fumadocs', () => {
  const createDoc = (content: string, data: Record<string, unknown> = {}): MDXLDDocument => ({
    data,
    content,
  })

  describe('createSource', () => {
    it('should create source from document tuples', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/getting-started.mdx', createDoc('# Getting Started', { title: 'Getting Started' })],
        ['/docs/api/reference.mdx', createDoc('# API Reference', { title: 'API Reference' })],
      ]

      const source = createSource(documents)

      // Should have 2 pages plus meta files for /docs and /docs/api folders
      expect(source.files.filter(isPage)).toHaveLength(2)
    })

    it('should generate correct slugs', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/getting-started.mdx', createDoc('# Getting Started')],
        ['/docs/guides/advanced.mdx', createDoc('# Advanced Guide')],
      ]

      const source = createSource(documents, { basePath: '/docs' })
      const pages = source.files.filter(isPage)

      expect(pages[0].slugs).toEqual(['getting-started'])
      expect(pages[1].slugs).toEqual(['guides', 'advanced'])
    })

    it('should handle index files', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/index.mdx', createDoc('# Documentation')],
        ['/docs/guides/index.mdx', createDoc('# Guides')],
      ]

      const source = createSource(documents, { basePath: '/docs' })
      const pages = source.files.filter(isPage)

      expect(pages[0].slugs).toEqual([])
      expect(pages[1].slugs).toEqual(['guides'])
    })

    it('should extract title from frontmatter', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/page.mdx', createDoc('Content', { title: 'My Title' })],
      ]

      const source = createSource(documents)
      const page = source.files.find(isPage)

      expect(page?.data.title).toBe('My Title')
    })

    it('should extract title from first heading', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/page.mdx', createDoc('# Heading Title\n\nContent')],
      ]

      const source = createSource(documents)
      const page = source.files.find(isPage)

      expect(page?.data.title).toBe('Heading Title')
    })

    it('should apply filter function', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/public.mdx', createDoc('Public', { draft: false })],
        ['/docs/draft.mdx', createDoc('Draft', { draft: true })],
      ]

      const source = createSource(documents, {
        filter: (doc) => !doc.data.draft,
      })

      expect(source.files.filter(isPage)).toHaveLength(1)
    })

    it('should apply transform function', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/page.mdx', createDoc('Content', { title: 'Original' })],
      ]

      const source = createSource(documents, {
        transform: (doc, path) => ({
          title: 'Transformed: ' + doc.data.title,
          content: doc.content,
          doc,
          customField: path,
        }),
      })

      const page = source.files.find(isPage)

      expect(page?.data.title).toBe('Transformed: Original')
      expect(page?.data.customField).toBe('/docs/page.mdx')
    })

    it('should use custom slugs function', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/content/docs/page.mdx', createDoc('Content')],
      ]

      const source = createSource(documents, {
        slugs: (path) => path.split('/').slice(2).map((s) => s.replace('.mdx', '')),
      })

      const page = source.files.find(isPage)

      expect(page?.slugs).toEqual(['docs', 'page'])
    })

    it('should add meta files for folders', () => {
      const documents: Array<[string, MDXLDDocument]> = [
        ['/docs/guides/getting-started.mdx', createDoc('Content')],
        ['/docs/guides/advanced.mdx', createDoc('Content')],
      ]

      const source = createSource(documents, {
        basePath: 'docs',
        meta: {
          guides: {
            title: 'Guides',
            defaultOpen: true,
          },
        },
      })

      const metaFile = source.files.find(isMeta)

      expect(metaFile).toBeDefined()
      expect(metaFile?.data.title).toBe('Guides')
      expect(metaFile?.data.defaultOpen).toBe(true)
    })

    it('should include document reference in page data', () => {
      const doc = createDoc('# Test', { title: 'Test' })
      const documents: Array<[string, MDXLDDocument]> = [['/page.mdx', doc]]

      const source = createSource(documents)
      const page = source.files.find(isPage)

      expect(page?.data.doc).toBe(doc)
    })
  })

  describe('createDynamicSource', () => {
    it('should fetch and cache documents', async () => {
      let fetchCount = 0
      const dynamicSource = createDynamicSource({
        fetchDocuments: async () => {
          fetchCount++
          return [['/page.mdx', createDoc('# Page')]]
        },
        cacheTTL: 1000,
      })

      await dynamicSource.getSource()
      await dynamicSource.getSource()
      await dynamicSource.getSource()

      expect(fetchCount).toBe(1)
    })

    it('should refresh cache on demand', async () => {
      let fetchCount = 0
      const dynamicSource = createDynamicSource({
        fetchDocuments: async () => {
          fetchCount++
          return [['/page.mdx', createDoc('# Page')]]
        },
      })

      await dynamicSource.getSource()
      await dynamicSource.refresh()

      expect(fetchCount).toBe(2)
    })

    it('should clear cache', async () => {
      let fetchCount = 0
      const dynamicSource = createDynamicSource({
        fetchDocuments: async () => {
          fetchCount++
          return [['/page.mdx', createDoc('# Page')]]
        },
        cacheTTL: 1000,
      })

      await dynamicSource.getSource()
      dynamicSource.clearCache()
      await dynamicSource.getSource()

      expect(fetchCount).toBe(2)
    })
  })

  describe('queryToSource', () => {
    it('should convert document array to source', () => {
      const documents: MDXLDDocument[] = [
        { data: { slug: '/docs/page1' }, content: '# Page 1' },
        { data: { slug: '/docs/page2' }, content: '# Page 2' },
      ]

      const source = queryToSource(documents)

      expect(source.files.filter(isPage)).toHaveLength(2)
    })

    it('should use document id as path', () => {
      const documents: MDXLDDocument[] = [
        { id: '/docs/by-id.mdx', data: {}, content: '# By ID' },
      ]

      const source = queryToSource(documents)
      const page = source.files.find(isPage)

      expect(page?.path).toBe('/docs/by-id.mdx')
    })
  })

  describe('type guards', () => {
    it('isPage should identify page files', () => {
      const page: VirtualPage = {
        path: '/page.mdx',
        type: 'page',
        data: { title: 'Test', content: '', doc: { data: {}, content: '' } },
        slugs: [],
      }

      const meta: VirtualMeta = {
        path: '/meta.json',
        type: 'meta',
        data: { title: 'Folder' },
      }

      expect(isPage(page)).toBe(true)
      expect(isPage(meta)).toBe(false)
    })

    it('isMeta should identify meta files', () => {
      const page: VirtualPage = {
        path: '/page.mdx',
        type: 'page',
        data: { title: 'Test', content: '', doc: { data: {}, content: '' } },
        slugs: [],
      }

      const meta: VirtualMeta = {
        path: '/meta.json',
        type: 'meta',
        data: { title: 'Folder' },
      }

      expect(isMeta(meta)).toBe(true)
      expect(isMeta(page)).toBe(false)
    })
  })
})

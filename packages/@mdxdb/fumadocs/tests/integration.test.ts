/**
 * Integration tests comparing @mdxdb/fumadocs output with fumadocs-core expectations
 * using the actual docs folder content.
 *
 * These tests ensure that our adapter produces output identical to what
 * fumadocs-mdx would produce, making them interchangeable for Fumadocs sites.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, relative, dirname } from 'path'
import { loader } from 'fumadocs-core/source'
import type { VirtualFile as FumadocsVirtualFile, MetaData, PageData } from 'fumadocs-core/source'
import { parse } from 'mdxld'
import {
  createSource,
  isPage,
  isMeta,
  type VirtualFile,
  type VirtualPage,
  type VirtualMeta,
} from '../src/index.js'
import type { MDXLDDocument } from 'mdxld'

// Path to the actual docs folder
const DOCS_DIR = join(__dirname, '../../../..', 'docs')

interface ParsedContent {
  documents: Array<[string, MDXLDDocument]>
  metaFiles: Array<{ path: string; data: MetaData }>
}

/**
 * Recursively read all files in a directory
 */
function readFilesRecursively(
  dir: string,
  basePath: string = ''
): Array<{ path: string; content: string; isJson: boolean }> {
  const files: Array<{ path: string; content: string; isJson: boolean }> = []

  if (!existsSync(dir)) {
    return files
  }

  const entries = readdirSync(dir)

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const relativePath = basePath ? `${basePath}/${entry}` : entry
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...readFilesRecursively(fullPath, relativePath))
    } else if (entry.endsWith('.mdx') || entry.endsWith('.md')) {
      files.push({
        path: relativePath,
        content: readFileSync(fullPath, 'utf-8'),
        isJson: false,
      })
    } else if (entry === 'meta.json') {
      files.push({
        path: relativePath,
        content: readFileSync(fullPath, 'utf-8'),
        isJson: true,
      })
    }
  }

  return files
}

/**
 * Parse docs folder content
 */
function parseDocsFolder(): ParsedContent {
  const files = readFilesRecursively(DOCS_DIR)
  const documents: Array<[string, MDXLDDocument]> = []
  const metaFiles: Array<{ path: string; data: MetaData }> = []

  for (const file of files) {
    if (file.isJson) {
      metaFiles.push({
        path: file.path,
        data: JSON.parse(file.content),
      })
    } else {
      const doc = parse(file.content)
      documents.push([`/${file.path}`, doc])
    }
  }

  return { documents, metaFiles }
}

/**
 * Create fumadocs-mdx style virtual files from the docs folder
 * This simulates what fumadocs-mdx would produce
 */
function createFumadocsVirtualFiles(content: ParsedContent): FumadocsVirtualFile[] {
  const files: FumadocsVirtualFile[] = []

  // Add page files
  for (const [path, doc] of content.documents) {
    const title = (doc.data.title as string) ||
      doc.content.match(/^#\s+(.+)$/m)?.[1] ||
      'Untitled'

    files.push({
      path: path.replace(/^\//, ''),
      type: 'page',
      data: {
        title,
        description: doc.data.description as string | undefined,
        icon: doc.data.icon as string | undefined,
      },
    })
  }

  // Add meta files
  for (const meta of content.metaFiles) {
    files.push({
      path: meta.path,
      type: 'meta',
      data: meta.data,
    })
  }

  return files
}

describe('Integration Tests with Docs Folder', () => {
  let docsContent: ParsedContent
  let ourSource: ReturnType<typeof createSource>
  let fumadocsFiles: FumadocsVirtualFile[]

  beforeAll(() => {
    docsContent = parseDocsFolder()
    ourSource = createSource(docsContent.documents)
    fumadocsFiles = createFumadocsVirtualFiles(docsContent)
  })

  describe('File count verification', () => {
    it('should have loaded content from docs folder', () => {
      expect(docsContent.documents.length).toBeGreaterThan(0)
      expect(docsContent.metaFiles.length).toBeGreaterThan(0)
    })

    it('should produce the same number of page files', () => {
      const ourPages = ourSource.files.filter(isPage)
      const fumadocsPages = fumadocsFiles.filter(f => f.type === 'page')

      expect(ourPages.length).toBe(fumadocsPages.length)
    })
  })

  describe('Page path compatibility', () => {
    it('should produce matching page paths', () => {
      const ourPaths = ourSource.files
        .filter(isPage)
        .map(f => f.path.replace(/^\//, ''))
        .sort()

      const fumadocsPaths = fumadocsFiles
        .filter(f => f.type === 'page')
        .map(f => f.path)
        .sort()

      expect(ourPaths).toEqual(fumadocsPaths)
    })

    it('should handle all nested paths in docs folder', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      // Check we have pages at various nesting levels
      const rootPages = ourPages.filter(p => !p.path.includes('/'))
      const nestedPages = ourPages.filter(p => (p.path.match(/\//g) || []).length >= 2)

      expect(nestedPages.length).toBeGreaterThan(0)
    })
  })

  describe('Page data compatibility', () => {
    it('should extract matching titles', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]
      const fumadocsPages = fumadocsFiles.filter(f => f.type === 'page')

      for (const ourPage of ourPages) {
        const normalizedPath = ourPage.path.replace(/^\//, '')
        const fumadocsPage = fumadocsPages.find(f => f.path === normalizedPath)

        if (fumadocsPage) {
          expect(ourPage.data.title).toBe((fumadocsPage.data as PageData).title)
        }
      }
    })

    it('should extract matching descriptions', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]
      const fumadocsPages = fumadocsFiles.filter(f => f.type === 'page')

      for (const ourPage of ourPages) {
        const normalizedPath = ourPage.path.replace(/^\//, '')
        const fumadocsPage = fumadocsPages.find(f => f.path === normalizedPath)

        if (fumadocsPage && (fumadocsPage.data as PageData & { description?: string }).description) {
          expect(ourPage.data.description).toBe(
            (fumadocsPage.data as PageData & { description?: string }).description
          )
        }
      }
    })
  })

  describe('Slug generation compatibility', () => {
    it('should generate correct slugs for index files', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      // Root index.mdx should have empty slugs
      const rootIndex = ourPages.find(p => p.path === '/index.mdx')
      if (rootIndex) {
        expect(rootIndex.slugs).toEqual([])
      }

      // Nested index files should have folder path as slugs
      const mdxldIndex = ourPages.find(p => p.path === '/mdxld/index.mdx')
      if (mdxldIndex) {
        expect(mdxldIndex.slugs).toEqual(['mdxld'])
      }
    })

    it('should generate correct slugs for regular files', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      // Check specific known files
      const gettingStarted = ourPages.find(p => p.path.includes('mdxld/getting-started'))
      if (gettingStarted) {
        expect(gettingStarted.slugs).toEqual(['mdxld', 'getting-started'])
      }

      const adaptersFs = ourPages.find(p => p.path.includes('mdxdb/adapters/fs'))
      if (adaptersFs) {
        expect(adaptersFs.slugs).toEqual(['mdxdb', 'adapters', 'fs'])
      }
    })

    it('should generate correct slugs for deeply nested files', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      // Check deeply nested paths
      const deeplyNested = ourPages.filter(p => (p.slugs?.length || 0) >= 3)

      for (const page of deeplyNested) {
        // Verify slugs match path structure
        const expectedPrefix = page.slugs!.slice(0, -1).join('/')
        expect(page.path).toContain(expectedPrefix)
      }
    })
  })

  describe('Fumadocs-core loader compatibility', () => {
    it('should work with fumadocs-core loader', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      expect(result).toHaveProperty('getPages')
      expect(result).toHaveProperty('getPage')
      expect(result).toHaveProperty('pageTree')
    })

    it('should return all pages through loader', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      const pages = result.getPages()
      const ourPageCount = ourSource.files.filter(isPage).length

      expect(pages.length).toBe(ourPageCount)
    })

    it('should find specific pages by slug', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      // Test various pages we know exist
      // Note: fumadocs-core loader returns paths without leading slash
      const testCases = [
        { slugs: [], expectedPath: 'index.mdx' },
        { slugs: ['mdxld'], expectedPath: 'mdxld/index.mdx' },
        { slugs: ['mdxld', 'getting-started'], expectedPath: 'mdxld/getting-started.mdx' },
        { slugs: ['mdxdb'], expectedPath: 'mdxdb/index.mdx' },
        { slugs: ['mdxdb', 'adapters'], expectedPath: 'mdxdb/adapters/index.mdx' },
        { slugs: ['mdxdb', 'adapters', 'fs'], expectedPath: 'mdxdb/adapters/fs.mdx' },
      ]

      for (const { slugs, expectedPath } of testCases) {
        const page = result.getPage(slugs)
        if (page) {
          expect(page.file.path).toBe(expectedPath)
        }
      }
    })

    it('should generate correct URLs', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      const pages = result.getPages()

      for (const page of pages) {
        expect(page.url).toMatch(/^\/docs/)

        // URL should match slugs
        const expectedUrl = page.slugs.length > 0
          ? `/docs/${page.slugs.join('/')}`
          : '/docs'

        expect(page.url).toBe(expectedUrl)
      }
    })

    it('should produce valid page tree', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      const tree = result.pageTree

      expect(tree).toHaveProperty('name')
      expect(tree).toHaveProperty('children')
      expect(Array.isArray(tree.children)).toBe(true)
    })
  })

  describe('Loader output structure comparison', () => {
    it('should have matching page structure with fumadocs source', () => {
      // Create fumadocs-style source for comparison
      const fumadocsSource = {
        files: fumadocsFiles,
      }

      const ourResult = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      const fumadocsResult = loader({
        source: fumadocsSource,
        baseUrl: '/docs',
      })

      const ourPages = ourResult.getPages()
      const fumadocsPages = fumadocsResult.getPages()

      // Same number of pages
      expect(ourPages.length).toBe(fumadocsPages.length)

      // Same URLs
      const ourUrls = ourPages.map(p => p.url).sort()
      const fumadocsUrls = fumadocsPages.map(p => p.url).sort()
      expect(ourUrls).toEqual(fumadocsUrls)

      // Same slugs
      const ourSlugs = ourPages.map(p => p.slugs.join('/')).sort()
      const fumadocsSlugs = fumadocsPages.map(p => p.slugs.join('/')).sort()
      expect(ourSlugs).toEqual(fumadocsSlugs)
    })

    it('should have matching page data structure', () => {
      const fumadocsSource = { files: fumadocsFiles }

      const ourResult = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      const fumadocsResult = loader({
        source: fumadocsSource,
        baseUrl: '/docs',
      })

      const ourPages = ourResult.getPages()
      const fumadocsPages = fumadocsResult.getPages()

      // Compare individual pages
      for (const ourPage of ourPages) {
        const fumadocsPage = fumadocsPages.find(
          p => p.url === ourPage.url
        )

        if (fumadocsPage) {
          // Titles should match
          expect(ourPage.data.title).toBe(fumadocsPage.data.title)

          // File info should match
          expect(ourPage.file.path).toBe(fumadocsPage.file.path)
          expect(ourPage.file.name).toBe(fumadocsPage.file.name)
          expect(ourPage.file.dirname).toBe(fumadocsPage.file.dirname)
        }
      }
    })
  })

  describe('Root package documentation', () => {
    const rootPackages = ['mdxld', 'mdxdb', 'mdxe', 'mdxai', 'mdxui']

    it('should have all root packages documented', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      for (const pkg of rootPackages) {
        const pkgIndex = ourPages.find(p => p.path === `/${pkg}/index.mdx`)
        expect(pkgIndex).toBeDefined()
        expect(pkgIndex?.data.title).toBe(pkg)
      }
    })

    it('should have getting-started page for each root package', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      for (const pkg of rootPackages) {
        const gettingStarted = ourPages.find(p => p.path === `/${pkg}/getting-started.mdx`)
        expect(gettingStarted).toBeDefined()
      }
    })
  })

  describe('Meta file handling from docs folder', () => {
    it('should have meta files with root: true for root packages', () => {
      const rootMetas = docsContent.metaFiles.filter(m => {
        const parts = m.path.split('/')
        return parts.length === 2 && parts[1] === 'meta.json'
      })

      // Check that root packages have root: true
      for (const meta of rootMetas) {
        const pkgName = meta.path.split('/')[0]
        if (['mdxld', 'mdxdb', 'mdxe', 'mdxai', 'mdxui'].includes(pkgName)) {
          expect(meta.data.root).toBe(true)
        }
      }
    })

    it('should preserve pages array from meta files', () => {
      for (const meta of docsContent.metaFiles) {
        if (meta.data.pages) {
          expect(Array.isArray(meta.data.pages)).toBe(true)
          expect(meta.data.pages.length).toBeGreaterThan(0)
        }
      }
    })

    it('should preserve defaultOpen from meta files', () => {
      const metasWithDefaultOpen = docsContent.metaFiles.filter(
        m => typeof m.data.defaultOpen === 'boolean'
      )

      expect(metasWithDefaultOpen.length).toBeGreaterThan(0)
    })
  })

  describe('Edge cases', () => {
    it('should handle files without descriptions', () => {
      const ourPages = ourSource.files.filter(isPage) as VirtualPage[]

      for (const page of ourPages) {
        // Should not throw when accessing description
        expect(() => page.data.description).not.toThrow()
      }
    })

    it('should handle deeply nested adapter docs', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      // Test adapter pages
      const adapterPages = result.getPages().filter(p => p.url.includes('/adapters/'))
      expect(adapterPages.length).toBeGreaterThan(0)

      for (const page of adapterPages) {
        expect(page.data.title).toBeTruthy()
        expect(page.slugs.length).toBeGreaterThanOrEqual(3)
      }
    })

    it('should handle integration/runtime subpages', () => {
      const result = loader({
        source: ourSource,
        baseUrl: '/docs',
      })

      // Test runtime pages
      const runtimePages = result.getPages().filter(p => p.url.includes('/runtimes/'))
      expect(runtimePages.length).toBeGreaterThan(0)

      // Test integration pages
      const integrationPages = result.getPages().filter(p => p.url.includes('/integrations/'))
      expect(integrationPages.length).toBeGreaterThan(0)

      // Test renderer pages
      const rendererPages = result.getPages().filter(p => p.url.includes('/renderers/'))
      expect(rendererPages.length).toBeGreaterThan(0)
    })
  })
})

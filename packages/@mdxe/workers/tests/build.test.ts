/**
 * E2E tests for @mdxe/workers build functionality
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { join } from 'node:path'
import { existsSync, rmSync } from 'node:fs'
import { build, buildWorker } from '../src/build.js'
import type { NamespaceBundle, BuildResult } from '../src/types.js'

const FIXTURES_DIR = join(__dirname, 'fixtures', 'sample-site')
const OUT_DIR = join(FIXTURES_DIR, 'dist')

describe('@mdxe/workers build', () => {
  afterAll(() => {
    // Cleanup output directory
    if (existsSync(OUT_DIR)) {
      rmSync(OUT_DIR, { recursive: true, force: true })
    }
  })

  describe('build()', () => {
    it('should build a simple MDX project', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
        verbose: false,
      })

      expect(result.success).toBe(true)
      expect(result.bundle).toBeDefined()
      expect(result.duration).toBeGreaterThan(0)
      expect(result.logs.length).toBeGreaterThan(0)
    })

    it('should find all MDX documents', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      // Should find index.mdx, about.mdx, and docs/index.mdx
      expect(bundle.content.count).toBeGreaterThanOrEqual(3)
      // Index files are stored with their actual paths
      expect(bundle.content.documents['/index']).toBeDefined()
      expect(bundle.content.documents['/about']).toBeDefined()
      expect(bundle.content.documents['/docs']).toBeDefined()
    })

    it('should extract frontmatter data', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      // Check index page frontmatter
      const indexDoc = bundle.content.documents['/index']
      expect(indexDoc.data.title).toBe('Sample Site')
      // MDXLD stores $type without the $ prefix in data
      expect(indexDoc.data.description).toBe('A sample MDX site for testing the build system')

      // Check about page frontmatter
      const aboutDoc = bundle.content.documents['/about']
      expect(aboutDoc.data.title).toBe('About Us')
      expect(aboutDoc.data.description).toBe('Learn more about our sample site')
      expect(aboutDoc.data.author).toBe('Test Author')
    })

    it('should extract exported functions from code blocks', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      // Should have functions extracted from docs/index.mdx
      expect(bundle.content.functions).toBeDefined()
      expect(bundle.content.functions!['/docs#greet']).toBeDefined()
      expect(bundle.content.functions!['/docs#add']).toBeDefined()
    })

    it('should generate valid worker code', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
        minify: false,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      // Worker should have fetch handler
      expect(bundle.worker.main).toContain('fetch')
      // Should contain embedded content (CONTENT variable or inline data)
      expect(bundle.worker.main.length).toBeGreaterThan(1000) // Non-trivial code
      // Should include our test content
      expect(bundle.worker.main).toContain('Sample Site')
    })

    it('should write output to disk when outDir specified', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
        outDir: 'dist',
      })

      expect(result.success).toBe(true)
      expect(existsSync(join(OUT_DIR, 'worker.js'))).toBe(true)
      expect(existsSync(join(OUT_DIR, 'content.json'))).toBe(true)
      expect(existsSync(join(OUT_DIR, 'meta.json'))).toBe(true)
    })

    it('should include build metadata', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
        compatibilityDate: '2024-01-01',
        minify: true,
        sourceMaps: false,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      expect(bundle.meta.name).toBe('sample-site')
      expect(bundle.meta.config.compatibilityDate).toBe('2024-01-01')
      expect(bundle.meta.build.target).toBe('workers')
      expect(bundle.meta.build.minified).toBe(true)
      expect(bundle.meta.build.sourceMaps).toBe(false)
    })

    it('should generate content hash', async () => {
      const result = await build({
        projectDir: FIXTURES_DIR,
      })

      expect(result.success).toBe(true)
      const bundle = result.bundle!

      expect(bundle.content.hash).toBeDefined()
      expect(bundle.content.hash.length).toBeGreaterThan(0)

      // Each document should have its own hash
      for (const doc of Object.values(bundle.content.documents)) {
        expect(doc.hash).toBeDefined()
        expect(doc.hash.length).toBeGreaterThan(0)
      }
    })
  })

  describe('buildWorker()', () => {
    it('should return just the worker code string', async () => {
      const code = await buildWorker(FIXTURES_DIR)

      expect(typeof code).toBe('string')
      expect(code).toContain('fetch') // Has fetch handler
      expect(code.length).toBeGreaterThan(1000) // Non-trivial code
    })
  })
})

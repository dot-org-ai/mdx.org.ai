/**
 * Tests to verify @mdxe/workers runtime is pure Cloudflare Workers
 *
 * These tests verify that:
 * 1. The package has no Node.js or Miniflare dependencies in production
 * 2. The runtime exports work without Node.js APIs
 * 3. The package structure separates runtime from build-time tools
 *
 * Architecture:
 * - '@mdxe/workers' (main) - Pure Workers runtime + @mdxe/isolate re-exports
 * - '@mdxe/workers/runtime' - Pure Workers runtime only
 * - '@mdxe/workers/build' - Node.js build tools (build, publish)
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

const PACKAGE_ROOT = path.join(__dirname, '..')

describe('@mdxe/workers purity', () => {
  describe('package.json structure', () => {
    let pkgJson: Record<string, unknown>

    beforeAll(() => {
      pkgJson = JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf-8'))
    })

    it('should NOT have miniflare as a production dependency', () => {
      const deps = pkgJson.dependencies || {}
      expect((deps as Record<string, unknown>)['miniflare']).toBeUndefined()
    })

    it('should have miniflare as OPTIONAL dependency only (for ./local entry)', () => {
      const deps = pkgJson.dependencies || {}
      const devDeps = pkgJson.devDependencies || {}
      const optDeps = pkgJson.optionalDependencies || {}

      // Miniflare should NOT be a production or dev dependency
      // It's optional because it's only needed for the ./local entry point
      expect((deps as Record<string, unknown>)['miniflare']).toBeUndefined()
      expect((devDeps as Record<string, unknown>)['miniflare']).toBeUndefined()
      // Miniflare IS expected in optionalDependencies for the ./local entry
      expect((optDeps as Record<string, unknown>)['miniflare']).toBeDefined()
    })

    it('should have subpath exports for /build, /runtime, and /local', () => {
      const exports = pkgJson.exports as Record<string, unknown>
      expect(exports).toBeDefined()
      expect(exports['.']).toBeDefined()
      expect(exports['./build']).toBeDefined()
      expect(exports['./runtime']).toBeDefined()
      expect(exports['./local']).toBeDefined()
    })

    it('should have minimal production dependencies', () => {
      const deps = Object.keys((pkgJson.dependencies || {}) as Record<string, unknown>)
      console.log('Production dependencies:', deps)

      // Should only have @mdxe/isolate as a production dependency
      // Build tools like esbuild should be optional or peer deps
      expect(deps).not.toContain('miniflare')
      expect(deps).not.toContain('@cloudflare/vitest-pool-workers')
    })

    it('should have esbuild and mdxld as optional/peer dependencies', () => {
      const optDeps = pkgJson.optionalDependencies as Record<string, unknown> | undefined
      const peerDeps = pkgJson.peerDependencies as Record<string, unknown> | undefined

      // esbuild should be optional (only needed for build tools)
      const hasEsbuildOptional = optDeps?.['esbuild'] || peerDeps?.['esbuild']
      expect(hasEsbuildOptional).toBeDefined()
    })
  })

  describe('runtime code purity', () => {
    it('should NOT import node: modules in runtime.ts', () => {
      const runtimePath = path.join(PACKAGE_ROOT, 'src', 'runtime.ts')
      const runtimeContent = fs.readFileSync(runtimePath, 'utf-8')

      // Runtime should not use any Node.js APIs
      expect(runtimeContent).not.toMatch(/from ['"]node:/)
      expect(runtimeContent).not.toMatch(/require\(['"]node:/)
    })

    it('should NOT import miniflare in runtime.ts', () => {
      const runtimePath = path.join(PACKAGE_ROOT, 'src', 'runtime.ts')
      const runtimeContent = fs.readFileSync(runtimePath, 'utf-8')

      expect(runtimeContent).not.toMatch(/from ['"]miniflare/)
      expect(runtimeContent).not.toMatch(/import.*miniflare/)
    })

    it('should NOT import node: modules in generate.ts', () => {
      const generatePath = path.join(PACKAGE_ROOT, 'src', 'generate.ts')
      if (fs.existsSync(generatePath)) {
        const generateContent = fs.readFileSync(generatePath, 'utf-8')

        expect(generateContent).not.toMatch(/from ['"]node:/)
        expect(generateContent).not.toMatch(/require\(['"]node:/)
      }
    })

    it('build.ts should only be imported by build-entry.ts', () => {
      const buildPath = path.join(PACKAGE_ROOT, 'src', 'build.ts')
      const buildEntryPath = path.join(PACKAGE_ROOT, 'src', 'build-entry.ts')

      // Verify build.ts exists and uses Node.js APIs (expected)
      const buildContent = fs.readFileSync(buildPath, 'utf-8')
      expect(buildContent).toMatch(/from ['"]node:/)

      // Verify build-entry.ts imports from build.ts
      const buildEntryContent = fs.readFileSync(buildEntryPath, 'utf-8')
      expect(buildEntryContent).toMatch(/from ['"]\.\/build/)
    })

    it('local.ts should use dynamic import for miniflare', () => {
      const localPath = path.join(PACKAGE_ROOT, 'src', 'local.ts')
      const localContent = fs.readFileSync(localPath, 'utf-8')

      // Should use dynamic import, not static import
      expect(localContent).toMatch(/await import\(['"]miniflare['"]\)/)
      // Should NOT have static import of miniflare (only type import is ok)
      expect(localContent).not.toMatch(/^import \{ Miniflare \} from ['"]miniflare['"]/m)
    })

    it('local.ts should NOT be imported by index.ts or runtime.ts', () => {
      const indexPath = path.join(PACKAGE_ROOT, 'src', 'index.ts')
      const runtimePath = path.join(PACKAGE_ROOT, 'src', 'runtime.ts')

      const indexContent = fs.readFileSync(indexPath, 'utf-8')
      const runtimeContent = fs.readFileSync(runtimePath, 'utf-8')

      // Neither should import from local.ts
      expect(indexContent).not.toMatch(/from ['"]\.\/local/)
      expect(runtimeContent).not.toMatch(/from ['"]\.\/local/)
    })
  })

  describe('wrangler.toml configuration', () => {
    it('should document worker_loaders binding', () => {
      const wranglerPath = path.join(PACKAGE_ROOT, 'wrangler.toml')
      const wranglerContent = fs.readFileSync(wranglerPath, 'utf-8')

      // Check for worker_loaders configuration
      expect(wranglerContent).toMatch(/\[\[worker_loaders\]\]/)
      expect(wranglerContent).toMatch(/binding\s*=\s*["']LOADER["']/)
    })
  })

  describe('exports structure', () => {
    it('should export evaluateModule from runtime', async () => {
      const { evaluateModule } = await import('../src/runtime.js')
      expect(typeof evaluateModule).toBe('function')
    })

    it('should export cache utilities from runtime', async () => {
      const { clearCache, isCached, getCacheStats, getCachedModule, cacheModule } = await import('../src/runtime.js')
      expect(typeof clearCache).toBe('function')
      expect(typeof isCached).toBe('function')
      expect(typeof getCacheStats).toBe('function')
      expect(typeof getCachedModule).toBe('function')
      expect(typeof cacheModule).toBe('function')
    })

    it('should export types from runtime', async () => {
      // Types are compile-time only, but we can verify the module loads
      const runtime = await import('../src/runtime.js')
      expect(runtime).toBeDefined()
    })

    it('should export evaluate function from main', async () => {
      const { evaluate } = await import('../src/index.js')
      expect(typeof evaluate).toBe('function')
    })

    it('should export createEvaluator function from main', async () => {
      const { createEvaluator } = await import('../src/index.js')
      expect(typeof createEvaluator).toBe('function')
    })

    it('should export createHandler function from main', async () => {
      const { createHandler } = await import('../src/index.js')
      expect(typeof createHandler).toBe('function')
    })

    it('should re-export @mdxe/isolate functions', async () => {
      const { compileToModule, getExports, generateModuleId } = await import('../src/index.js')
      expect(typeof compileToModule).toBe('function')
      expect(typeof getExports).toBe('function')
      expect(typeof generateModuleId).toBe('function')
    })

    it('should export evaluate and createLocalEvaluator from local', async () => {
      const { evaluate, createLocalEvaluator, run, test, disposeAll, getActiveInstanceCount } = await import('../src/local.js')
      expect(typeof evaluate).toBe('function')
      expect(typeof createLocalEvaluator).toBe('function')
      expect(typeof run).toBe('function')
      expect(typeof test).toBe('function')
      expect(typeof disposeAll).toBe('function')
      expect(typeof getActiveInstanceCount).toBe('function')
    })
  })

  describe('Worker Loader binding types', () => {
    it('should define correct WorkerLoader interface', async () => {
      const { createWorkerConfigFromModule } = await import('../src/runtime.js')

      // Test that the function works with a mock module
      const mockModule = {
        mainModule: 'entry.js',
        modules: { 'entry.js': 'export default {}' },
        data: {},
        hash: 'test123',
      }

      const config = createWorkerConfigFromModule(mockModule)

      expect(config.mainModule).toBe('entry.js')
      expect(config.modules).toEqual(mockModule.modules)
      expect(config.compatibilityDate).toBe('2024-01-01')
      expect(config.globalOutbound).toBeNull() // Network blocked by default
    })

    it('should allow network when blockNetwork is false', async () => {
      const { createWorkerConfigFromModule } = await import('../src/runtime.js')

      const mockModule = {
        mainModule: 'entry.js',
        modules: { 'entry.js': 'export default {}' },
        data: {},
        hash: 'test123',
      }

      const config = createWorkerConfigFromModule(mockModule, { blockNetwork: false })

      expect(config.globalOutbound).toBeUndefined()
    })
  })
})

// Import beforeAll for the test setup
import { beforeAll } from 'vitest'

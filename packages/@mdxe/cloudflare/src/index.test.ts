import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { join } from 'node:path'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import type { CloudflareDeployOptions, CloudflareApiConfig, WorkerBinding } from './types.js'

// ===========================================================================
// Test Fixtures and Utilities
// ===========================================================================

const TEST_FIXTURES_DIR = join(process.cwd(), '.test-fixtures-cloudflare')

function createTestDir(name: string): string {
  const dir = join(TEST_FIXTURES_DIR, name)
  mkdirSync(dir, { recursive: true })
  return dir
}

function createPackageJson(dir: string, deps: Record<string, string> = {}): void {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      dependencies: deps,
      scripts: { build: 'echo build' },
    }, null, 2)
  )
}

function createSourceConfig(dir: string, content: string): void {
  writeFileSync(join(dir, 'source.config.ts'), content)
}

function createNextConfig(dir: string): void {
  writeFileSync(join(dir, 'next.config.js'), 'module.exports = {}')
}

function createOutputDir(dir: string, outputDir = 'out'): void {
  const outPath = join(dir, outputDir)
  mkdirSync(outPath, { recursive: true })
  writeFileSync(join(outPath, 'index.html'), '<!DOCTYPE html><html></html>')
}

// Mock fetch for API tests
function createMockFetch(responses: Array<{ success: boolean; result?: unknown; errors?: Array<{ code: number; message: string }> }>) {
  let callIndex = 0
  return vi.fn().mockImplementation(() => {
    const response = responses[callIndex] || { success: true }
    callIndex++
    return Promise.resolve({
      ok: response.success,
      json: () => Promise.resolve(response),
    })
  })
}

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports deploy function', async () => {
    const mod = await import('./index.js')
    expect(mod.deploy).toBeDefined()
    expect(typeof mod.deploy).toBe('function')
  })

  it('exports CloudflareApi class', async () => {
    const mod = await import('./index.js')
    expect(mod.CloudflareApi).toBeDefined()
    expect(typeof mod.CloudflareApi).toBe('function')
  })

  it('exports createCloudflareApi function', async () => {
    const mod = await import('./index.js')
    expect(mod.createCloudflareApi).toBeDefined()
    expect(typeof mod.createCloudflareApi).toBe('function')
  })

  it('exports createCloudflareApiFromEnv function', async () => {
    const mod = await import('./index.js')
    expect(mod.createCloudflareApiFromEnv).toBeDefined()
    expect(typeof mod.createCloudflareApiFromEnv).toBe('function')
  })

  it('exports deployToWorkers function', async () => {
    const mod = await import('./index.js')
    expect(mod.deployToWorkers).toBeDefined()
    expect(typeof mod.deployToWorkers).toBe('function')
  })

  it('exports deployToPages function', async () => {
    const mod = await import('./index.js')
    expect(mod.deployToPages).toBeDefined()
    expect(typeof mod.deployToPages).toBe('function')
  })

  it('exports detectSourceType function', async () => {
    const mod = await import('./index.js')
    expect(mod.detectSourceType).toBeDefined()
    expect(typeof mod.detectSourceType).toBe('function')
  })

  it('exports detectOutputDir function', async () => {
    const mod = await import('./index.js')
    expect(mod.detectOutputDir).toBeDefined()
    expect(typeof mod.detectOutputDir).toBe('function')
  })

  it('exports createProvider function', async () => {
    const mod = await import('./index.js')
    expect(mod.createProvider).toBeDefined()
    expect(typeof mod.createProvider).toBe('function')
  })
})

// ===========================================================================
// detectSourceType() Tests
// ===========================================================================

describe('detectSourceType()', () => {
  beforeEach(() => {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_FIXTURES_DIR)) {
      rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true })
    }
  })

  it('detects static fs adapter from source.config.ts', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-fs')
    createSourceConfig(dir, `import { createFsDatabase } from '@mdxdb/fs'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(true)
    expect(result.adapter).toBe('fs')
  })

  it('detects postgres adapter from source.config.ts', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-postgres')
    createSourceConfig(dir, `import { createDatabase } from '@mdxdb/postgres'\nconnectionString: 'postgres://...'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('postgres')
  })

  it('detects api adapter from source.config.ts', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-api')
    createSourceConfig(dir, `import { createApiClient } from '@mdxdb/api'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('api')
  })

  it('detects mongo adapter from package.json dependencies', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-mongo')
    createPackageJson(dir, { '@mdxdb/mongo': '^1.0.0' })

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('mongo')
  })

  it('detects sqlite adapter from source.config.ts', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-sqlite')
    createSourceConfig(dir, `import { createDatabase } from '@mdxdb/sqlite'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('sqlite')
  })

  it('detects clickhouse adapter from source.config.ts', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-clickhouse')
    createSourceConfig(dir, `import { createDatabase } from '@mdxdb/clickhouse'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('clickhouse')
  })

  it('returns unknown adapter when no config found', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-unknown')
    createPackageJson(dir, {})

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(true)
    expect(result.adapter).toBe('unknown')
  })

  it('checks lib/source.ts path', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-lib-source')
    mkdirSync(join(dir, 'lib'), { recursive: true })
    writeFileSync(join(dir, 'lib', 'source.ts'), `import { createFsDatabase } from '@mdxdb/fs'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(true)
    expect(result.adapter).toBe('fs')
    expect(result.configPath).toContain('lib/source.ts')
  })

  it('checks src/lib/source.ts path', async () => {
    const { detectSourceType } = await import('./workers.js')
    const dir = createTestDir('detect-src-lib-source')
    mkdirSync(join(dir, 'src', 'lib'), { recursive: true })
    writeFileSync(join(dir, 'src', 'lib', 'source.ts'), `import { createApiClient } from '@mdxdb/api'`)

    const result = detectSourceType(dir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('api')
    expect(result.configPath).toContain('src/lib/source.ts')
  })
})

// ===========================================================================
// detectOutputDir() Tests
// ===========================================================================

describe('detectOutputDir()', () => {
  beforeEach(() => {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_FIXTURES_DIR)) {
      rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true })
    }
  })

  it('detects out directory', async () => {
    const { detectOutputDir } = await import('./pages.js')
    const dir = createTestDir('detect-out')
    createOutputDir(dir, 'out')

    const result = detectOutputDir(dir)
    expect(result).toBe('out')
  })

  it('detects dist directory', async () => {
    const { detectOutputDir } = await import('./pages.js')
    const dir = createTestDir('detect-dist')
    createOutputDir(dir, 'dist')

    const result = detectOutputDir(dir)
    expect(result).toBe('dist')
  })

  it('detects build directory', async () => {
    const { detectOutputDir } = await import('./pages.js')
    const dir = createTestDir('detect-build')
    createOutputDir(dir, 'build')

    const result = detectOutputDir(dir)
    expect(result).toBe('build')
  })

  it('returns out for Next.js projects without output dir', async () => {
    const { detectOutputDir } = await import('./pages.js')
    const dir = createTestDir('detect-nextjs')
    createPackageJson(dir, { next: '^14.0.0' })

    const result = detectOutputDir(dir)
    expect(result).toBe('out')
  })

  it('returns dist for Vite projects without output dir', async () => {
    const { detectOutputDir } = await import('./pages.js')
    const dir = createTestDir('detect-vite')
    createPackageJson(dir, { vite: '^5.0.0' })

    const result = detectOutputDir(dir)
    expect(result).toBe('dist')
  })
})

// ===========================================================================
// CloudflareApi Class Tests
// ===========================================================================

describe('CloudflareApi', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true })
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    if (existsSync(TEST_FIXTURES_DIR)) {
      rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true })
    }
  })

  describe('constructor and authentication', () => {
    it('creates instance with required config', async () => {
      const { CloudflareApi } = await import('./api.js')
      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })
      expect(api).toBeDefined()
    })

    it('uses default baseUrl', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: [] }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      await api.listWorkers()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.cloudflare.com/client/v4'),
        expect.any(Object)
      )
    })

    it('uses custom baseUrl', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: [] }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
        baseUrl: 'https://custom.api.example.com',
      })

      await api.listWorkers()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.api.example.com'),
        expect.any(Object)
      )
    })

    it('includes authorization header in requests', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: [] }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'my-secret-token',
      })

      await api.listWorkers()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      )
    })

    it('includes custom headers in requests', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: [] }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
        headers: { 'X-Custom-Header': 'custom-value' },
      })

      await api.listWorkers()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })
  })

  describe('uploadWorker()', () => {
    it('uploads worker script successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: { id: 'worker-123' } }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.uploadWorker('my-worker', 'export default {}', {
        main_module: 'worker.js',
      })

      expect(result.success).toBe(true)
      expect(result.scriptId).toBe('worker-123')
      expect(result.url).toContain('my-worker')
    })

    it('handles upload failure', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: false,
        errors: [{ code: 10000, message: 'Authentication error' }],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'invalid-token',
      })

      const result = await api.uploadWorker('my-worker', 'export default {}', {
        main_module: 'worker.js',
      })

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors?.[0].message).toContain('Authentication')
    })

    it('uses FormData for multipart upload', async () => {
      const { CloudflareApi } = await import('./api.js')
      let capturedBody: unknown

      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = options.body
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, result: { id: 'worker-123' } }),
        })
      })

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      await api.uploadWorker('my-worker', 'export default {}', {
        main_module: 'worker.js',
      })

      expect(capturedBody).toBeInstanceOf(FormData)
    })
  })

  describe('listWorkers()', () => {
    it('returns list of workers', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: true,
        result: [
          { id: 'worker-1', etag: 'abc', modified_on: '2024-01-01' },
          { id: 'worker-2', etag: 'def', modified_on: '2024-01-02' },
        ],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(true)
      expect(result.workers).toHaveLength(2)
      expect(result.workers?.[0].id).toBe('worker-1')
    })

    it('handles empty worker list', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: [] }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(true)
      expect(result.workers).toHaveLength(0)
    })
  })

  describe('getWorker()', () => {
    it('returns worker details', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: true,
        result: { id: 'my-worker', etag: 'abc123', modified_on: '2024-01-01T00:00:00Z' },
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.getWorker('my-worker')

      expect(result.success).toBe(true)
      expect(result.script?.id).toBe('my-worker')
      expect(result.script?.etag).toBe('abc123')
    })

    it('handles worker not found', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: false,
        errors: [{ code: 10007, message: 'Script not found' }],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.getWorker('nonexistent-worker')

      expect(result.success).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('deleteWorker()', () => {
    it('deletes worker successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.deleteWorker('my-worker')

      expect(result.success).toBe(true)
    })

    it('handles delete failure', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: false,
        errors: [{ code: 10007, message: 'Script not found' }],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.deleteWorker('nonexistent-worker')

      expect(result.success).toBe(false)
    })
  })

  describe('createKVNamespace()', () => {
    it('creates KV namespace successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: { id: 'kv-namespace-123' } }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createKVNamespace('MY_KV')

      expect(result.success).toBe(true)
      expect(result.id).toBe('kv-namespace-123')
    })

    it('handles KV namespace creation failure', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: false,
        errors: [{ code: 10000, message: 'Namespace already exists' }],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createKVNamespace('EXISTING_KV')

      expect(result.success).toBe(false)
    })
  })

  describe('createD1Database()', () => {
    it('creates D1 database successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: { uuid: 'd1-db-uuid-456' } }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createD1Database('my-database')

      expect(result.success).toBe(true)
      expect(result.uuid).toBe('d1-db-uuid-456')
    })

    it('handles D1 database creation failure', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: false,
        errors: [{ code: 10000, message: 'Database already exists' }],
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createD1Database('existing-db')

      expect(result.success).toBe(false)
    })
  })

  describe('createPagesProject()', () => {
    it('creates Pages project successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{ success: true, result: { id: 'pages-project-789' } }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createPagesProject('my-site')

      expect(result.success).toBe(true)
      expect(result.id).toBe('pages-project-789')
    })

    it('creates Pages project with options', async () => {
      const { CloudflareApi } = await import('./api.js')
      let capturedBody: unknown

      globalThis.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, result: { id: 'pages-project-789' } }),
        })
      })

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      await api.createPagesProject('my-site', {
        productionBranch: 'production',
        buildCommand: 'npm run build',
        destinationDir: 'dist',
      })

      expect((capturedBody as Record<string, unknown>).production_branch).toBe('production')
      expect((capturedBody as Record<string, unknown>).build_config).toEqual({
        build_command: 'npm run build',
        destination_dir: 'dist',
      })
    })
  })

  describe('createPagesDeployment()', () => {
    it('creates Pages deployment successfully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = createMockFetch([{
        success: true,
        result: { id: 'deployment-abc', url: 'https://my-site.pages.dev' },
      }])

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.createPagesDeployment('my-site', [
        { path: 'index.html', content: '<html></html>' },
      ])

      expect(result.success).toBe(true)
      expect(result.id).toBe('deployment-abc')
      expect(result.url).toBe('https://my-site.pages.dev')
    })
  })

  describe('error handling', () => {
    it('handles network errors gracefully', async () => {
      const { CloudflareApi } = await import('./api.js')
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
      expect(result.errors?.[0].message).toContain('Network error')
    })

    it('handles timeout errors', async () => {
      const { CloudflareApi } = await import('./api.js')

      // Create an abort error
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      globalThis.fetch = vi.fn().mockRejectedValue(abortError)

      const api = new CloudflareApi({
        accountId: 'test-account',
        apiToken: 'test-token',
        timeout: 100,
      })

      const result = await api.listWorkers()

      expect(result.success).toBe(false)
    })
  })
})

// ===========================================================================
// createCloudflareApiFromEnv() Tests
// ===========================================================================

describe('createCloudflareApiFromEnv()', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('creates API client from environment variables', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'

    const { createCloudflareApiFromEnv } = await import('./api.js')
    const api = createCloudflareApiFromEnv()

    expect(api).toBeDefined()
  })

  it('throws error when CLOUDFLARE_ACCOUNT_ID is missing', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'

    const { createCloudflareApiFromEnv } = await import('./api.js')

    expect(() => createCloudflareApiFromEnv()).toThrow('CLOUDFLARE_ACCOUNT_ID')
  })

  it('throws error when CLOUDFLARE_API_TOKEN is missing', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    delete process.env.CLOUDFLARE_API_TOKEN

    const { createCloudflareApiFromEnv } = await import('./api.js')

    expect(() => createCloudflareApiFromEnv()).toThrow('CLOUDFLARE_API_TOKEN')
  })

  it('allows overriding config', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account-id'
    process.env.CLOUDFLARE_API_TOKEN = 'env-api-token'

    const { createCloudflareApiFromEnv } = await import('./api.js')
    const api = createCloudflareApiFromEnv({ timeout: 60000 })

    expect(api).toBeDefined()
  })
})

// ===========================================================================
// deploy() Function Tests
// ===========================================================================

describe('deploy()', () => {
  beforeEach(() => {
    mkdirSync(TEST_FIXTURES_DIR, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(TEST_FIXTURES_DIR)) {
      rmSync(TEST_FIXTURES_DIR, { recursive: true, force: true })
    }
  })

  it('auto-detects static source and selects Pages', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-static')
    createPackageJson(dir, { '@mdxdb/fs': '^1.0.0' })
    createNextConfig(dir)
    createOutputDir(dir, 'out')

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      dryRun: true,
    })

    // Check that pages was selected (static content -> pages)
    expect(result.type).toBe('pages')
    expect(result.logs?.some(log => log.includes('Pages') || log.includes('adapter: fs'))).toBe(true)
  })

  it('auto-detects dynamic source and selects Workers', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-dynamic')
    createPackageJson(dir, { '@mdxdb/api': '^1.0.0' })
    createNextConfig(dir)

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      dryRun: true,
    })

    // Check that workers was selected (dynamic/api -> workers)
    expect(result.type).toBe('workers')
    expect(result.logs?.some(log => log.includes('Workers') || log.includes('adapter: api'))).toBe(true)
  })

  it('respects explicit target: workers', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-explicit-workers')
    createPackageJson(dir, { '@mdxdb/fs': '^1.0.0' })
    createNextConfig(dir)

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      target: 'workers',
      dryRun: true,
    })

    expect(result.type).toBe('workers')
  })

  it('respects explicit target: pages', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-explicit-pages')
    createPackageJson(dir, { '@mdxdb/api': '^1.0.0' })
    createNextConfig(dir)
    createOutputDir(dir, 'out')

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      target: 'pages',
      dryRun: true,
    })

    expect(result.type).toBe('pages')
  })

  it('handles dry run mode', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-dry-run')
    createPackageJson(dir, {})
    createNextConfig(dir)
    createOutputDir(dir, 'out')

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('dry-run'))).toBe(true)
  })

  it('includes logs in result', async () => {
    const { deploy } = await import('./index.js')
    const dir = createTestDir('deploy-logs')
    createPackageJson(dir, {})
    createNextConfig(dir)
    createOutputDir(dir, 'out')

    const result = await deploy({
      projectDir: dir,
      projectName: 'test-project',
      dryRun: true,
    })

    expect(result.logs).toBeDefined()
    expect(Array.isArray(result.logs)).toBe(true)
    expect(result.logs!.length).toBeGreaterThan(0)
  })
})

// ===========================================================================
// createProvider() Tests
// ===========================================================================

describe('createProvider()', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('creates provider with platform cloudflare', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    expect(provider.platform).toBe('cloudflare')
    expect(provider.name).toBe('Cloudflare')
  })

  it('creates provider with deploy function', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    expect(typeof provider.deploy).toBe('function')
  })

  it('creates provider that reads from env vars', async () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'env-account'
    process.env.CLOUDFLARE_API_TOKEN = 'env-token'

    const { createProvider } = await import('./index.js')
    const provider = createProvider()

    expect(provider).toBeDefined()
    expect(typeof provider.deploy).toBe('function')
  })

  it('getWorker returns error when credentials missing', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN

    const { createProvider } = await import('./index.js')
    const provider = createProvider()

    const result = await provider.getWorker?.('test-worker')

    expect(result?.success).toBe(false)
    expect(result?.error).toContain('required')
  })

  it('deleteWorker returns error when credentials missing', async () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.CLOUDFLARE_API_TOKEN

    const { createProvider } = await import('./index.js')
    const provider = createProvider()

    const result = await provider.deleteWorker?.('test-worker')

    expect(result?.success).toBe(false)
    expect(result?.error).toContain('required')
  })
})

// ===========================================================================
// Bindings Configuration Tests
// ===========================================================================

describe('Bindings configuration', () => {
  it('validates KV binding type', () => {
    const binding: WorkerBinding = {
      type: 'kv_namespace',
      name: 'MY_KV',
      namespace_id: 'kv-123',
    }
    expect(binding.type).toBe('kv_namespace')
    expect(binding.name).toBe('MY_KV')
    expect(binding.namespace_id).toBe('kv-123')
  })

  it('validates D1 binding type', () => {
    const binding: WorkerBinding = {
      type: 'd1',
      name: 'MY_DB',
      id: 'd1-uuid-456',
    }
    expect(binding.type).toBe('d1')
    expect(binding.name).toBe('MY_DB')
    expect(binding.id).toBe('d1-uuid-456')
  })

  it('validates R2 binding type', () => {
    const binding: WorkerBinding = {
      type: 'r2_bucket',
      name: 'MY_BUCKET',
      bucket_name: 'my-storage-bucket',
    }
    expect(binding.type).toBe('r2_bucket')
    expect(binding.name).toBe('MY_BUCKET')
    expect(binding.bucket_name).toBe('my-storage-bucket')
  })

  it('validates Vectorize binding type', () => {
    const binding: WorkerBinding = {
      type: 'vectorize',
      name: 'MY_INDEX',
      index_name: 'my-vector-index',
    }
    expect(binding.type).toBe('vectorize')
    expect(binding.name).toBe('MY_INDEX')
    expect(binding.index_name).toBe('my-vector-index')
  })

  it('validates service binding type', () => {
    const binding: WorkerBinding = {
      type: 'service',
      name: 'AUTH_SERVICE',
      service: 'auth-worker',
      environment: 'production',
    }
    expect(binding.type).toBe('service')
    expect(binding.name).toBe('AUTH_SERVICE')
    expect(binding.service).toBe('auth-worker')
    expect(binding.environment).toBe('production')
  })

  it('validates dispatch_namespace binding type', () => {
    const binding: WorkerBinding = {
      type: 'dispatch_namespace',
      name: 'DISPATCH',
      namespace: 'my-namespace',
    }
    expect(binding.type).toBe('dispatch_namespace')
    expect(binding.name).toBe('DISPATCH')
    expect(binding.namespace).toBe('my-namespace')
  })

  it('validates plain_text binding type', () => {
    const binding: WorkerBinding = {
      type: 'plain_text',
      name: 'API_URL',
      text: 'https://api.example.com',
    }
    expect(binding.type).toBe('plain_text')
    expect(binding.name).toBe('API_URL')
    expect(binding.text).toBe('https://api.example.com')
  })

  it('validates secret_text binding type', () => {
    const binding: WorkerBinding = {
      type: 'secret_text',
      name: 'API_KEY',
      text: 'secret-key-value',
    }
    expect(binding.type).toBe('secret_text')
    expect(binding.name).toBe('API_KEY')
    expect(binding.text).toBe('secret-key-value')
  })

  it('validates json binding type', () => {
    const binding: WorkerBinding = {
      type: 'json',
      name: 'CONFIG',
      json: { debug: true, maxRetries: 3 },
    }
    expect(binding.type).toBe('json')
    expect(binding.name).toBe('CONFIG')
    expect(binding.json).toEqual({ debug: true, maxRetries: 3 })
  })

  it('validates assets binding type', () => {
    const binding: WorkerBinding = {
      type: 'assets',
      name: 'ASSETS',
    }
    expect(binding.type).toBe('assets')
    expect(binding.name).toBe('ASSETS')
  })

  it('supports multiple bindings array', () => {
    const bindings: WorkerBinding[] = [
      { type: 'kv_namespace', name: 'MY_KV', namespace_id: 'kv-123' },
      { type: 'd1', name: 'MY_DB', id: 'd1-456' },
      { type: 'r2_bucket', name: 'MY_BUCKET', bucket_name: 'bucket-name' },
      { type: 'vectorize', name: 'MY_INDEX', index_name: 'index-name' },
    ]

    expect(bindings).toHaveLength(4)
    expect(bindings.map(b => b.type)).toEqual(['kv_namespace', 'd1', 'r2_bucket', 'vectorize'])
  })
})

// ===========================================================================
// Vectorize API Tests
// ===========================================================================

describe('Vectorize API', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('creates Vectorize index', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: {
        id: 'vectorize-index-123',
        name: 'my-embeddings',
        config: { dimensions: 1536, metric: 'cosine' },
        created_on: '2024-01-01T00:00:00Z',
        modified_on: '2024-01-01T00:00:00Z',
      },
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.createVectorizeIndex({
      name: 'my-embeddings',
      dimensions: 1536,
      metric: 'cosine',
    })

    expect(result.success).toBe(true)
    expect(result.index?.name).toBe('my-embeddings')
    expect(result.index?.config.dimensions).toBe(1536)
  })

  it('queries Vectorize index', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: {
        matches: [
          { id: 'doc-1', score: 0.95, metadata: { title: 'Doc 1' } },
          { id: 'doc-2', score: 0.85, metadata: { title: 'Doc 2' } },
        ],
      },
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.queryVectors('my-index', new Array(1536).fill(0), { topK: 10 })

    expect(result.success).toBe(true)
    expect(result.matches).toHaveLength(2)
    expect(result.matches?.[0].score).toBe(0.95)
  })

  it('inserts vectors', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: { mutationId: 'mutation-123' },
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.insertVectors('my-index', [
      { id: 'doc-1', values: new Array(1536).fill(0), metadata: { title: 'Doc 1' } },
    ])

    expect(result.success).toBe(true)
    expect(result.mutationId).toBe('mutation-123')
  })

  it('deletes Vectorize index', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{ success: true }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.deleteVectorizeIndex('my-index')

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Dispatch Namespace Tests
// ===========================================================================

describe('Dispatch Namespace API', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it('creates dispatch namespace', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: { namespace_id: 'ns-123' },
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.createDispatchNamespace({ name: 'my-namespace' })

    expect(result.success).toBe(true)
    expect(result.scriptId).toBe('ns-123')
  })

  it('lists dispatch namespaces', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: [
        { name: 'namespace-1' },
        { name: 'namespace-2' },
      ],
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.listDispatchNamespaces()

    expect(result.success).toBe(true)
    expect(result.namespaces).toHaveLength(2)
  })

  it('uploads to dispatch namespace', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{
      success: true,
      result: { id: 'script-123' },
    }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.uploadToNamespace(
      'my-namespace',
      'tenant-script',
      'export default {}',
      { main_module: 'worker.js' }
    )

    expect(result.success).toBe(true)
    expect(result.scriptId).toBe('script-123')
  })

  it('deletes from dispatch namespace', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{ success: true }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.deleteFromNamespace('my-namespace', 'tenant-script')

    expect(result.success).toBe(true)
  })

  it('deletes dispatch namespace', async () => {
    const { CloudflareApi } = await import('./api.js')
    globalThis.fetch = createMockFetch([{ success: true }])

    const api = new CloudflareApi({
      accountId: 'test-account',
      apiToken: 'test-token',
    })

    const result = await api.deleteDispatchNamespace('my-namespace')

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('Type definitions', () => {
  it('CloudflareDeployOptions has required fields', () => {
    const options: CloudflareDeployOptions = {
      projectDir: '/path/to/project',
    }
    expect(options.projectDir).toBeDefined()
  })

  it('CloudflareDeployOptions supports all optional fields', () => {
    const options: CloudflareDeployOptions = {
      projectDir: '/path/to/project',
      projectName: 'my-project',
      accountId: 'account-123',
      apiToken: 'token-456',
      target: 'workers',
      mode: 'opennext',
      compatibilityDate: '2024-01-01',
      compatibilityFlags: ['nodejs_compat'],
      env: { NODE_ENV: 'production' },
      kvNamespaces: { MY_KV: 'kv-123' },
      d1Databases: { MY_DB: 'd1-456' },
      r2Buckets: { MY_BUCKET: 'bucket-789' },
      routes: ['/*'],
      dryRun: true,
      force: false,
      useApi: true,
      apiBaseUrl: 'https://custom.api.com',
      apiHeaders: { 'X-Custom': 'value' },
      dispatchNamespace: 'my-namespace',
      tenantId: 'tenant-abc',
      useManagedApi: false,
      managedApiUrl: 'https://workers.do',
      customDomain: 'example.com',
      zoneId: 'zone-123',
    }

    expect(options.projectDir).toBe('/path/to/project')
    expect(options.target).toBe('workers')
    expect(options.mode).toBe('opennext')
  })

  it('CloudflareApiConfig has required fields', () => {
    const config: CloudflareApiConfig = {
      accountId: 'account-123',
      apiToken: 'token-456',
    }
    expect(config.accountId).toBeDefined()
    expect(config.apiToken).toBeDefined()
  })

  it('CloudflareApiConfig supports optional fields', () => {
    const config: CloudflareApiConfig = {
      accountId: 'account-123',
      apiToken: 'token-456',
      baseUrl: 'https://custom.api.com',
      headers: { 'X-Custom': 'value' },
      timeout: 60000,
    }
    expect(config.baseUrl).toBe('https://custom.api.com')
    expect(config.timeout).toBe(60000)
  })
})

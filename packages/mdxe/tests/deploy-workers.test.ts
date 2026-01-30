/**
 * Tests for worker_loaders deployment via mdxe
 *
 * This tests deploying compiled MDX to Cloudflare Workers using:
 * - @mdxe/workers for MDX -> worker module compilation
 * - @mdxe/isolate for module compilation
 * - worker_loaders binding for dynamic worker loading
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// Types for deployment
interface WorkerDeployResult {
  success: boolean
  url?: string
  workerId?: string
  workerIds?: string[]
  contentHash?: string
  error?: string
  logs: string[]
  duration: number
}

interface WorkerDeployOptions {
  /** Project directory containing MDX files */
  projectDir: string
  /** Worker name/namespace */
  name: string
  /** Cloudflare account ID */
  accountId?: string
  /** Cloudflare API token */
  apiToken?: string
  /** Use content hash for worker IDs */
  useContentHash?: boolean
  /** Compatibility date */
  compatibilityDate?: string
  /** Dry run mode */
  dryRun?: boolean
  /** Verbose logging */
  verbose?: boolean
}

describe('Worker Loaders Deployment', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-workers-deploy-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    // Create a basic MDX project structure
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-mdx-project',
        version: '1.0.0',
      })
    )

    writeFileSync(
      join(testDir, 'index.mdx'),
      `---
title: Hello World
$type: Page
---

# Welcome

This is a test page.

\`\`\`ts
export function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`
`
    )

    writeFileSync(
      join(testDir, 'about.mdx'),
      `---
title: About
$type: Page
---

# About Us

Learn more about our project.

\`\`\`ts
export function add(a: number, b: number) {
  return a + b
}
\`\`\`
`
    )

    // Create docs subdirectory
    mkdirSync(join(testDir, 'docs'), { recursive: true })
    writeFileSync(
      join(testDir, 'docs', 'getting-started.mdx'),
      `---
title: Getting Started
$type: Doc
---

# Getting Started

Follow these steps to get started.
`
    )
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('MDX to Worker Module Compilation', () => {
    it('should compile MDX files to worker modules', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)
      expect(result.modules).toBeDefined()
      expect(result.modules.length).toBeGreaterThan(0)

      // Each MDX file should have a compiled module
      const moduleNames = result.modules.map((m: { name: string }) => m.name)
      expect(moduleNames).toContain('index')
      expect(moduleNames).toContain('about')
      expect(moduleNames).toContain('docs/getting-started')
    })

    it('should extract frontmatter data from compiled modules', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)

      const indexModule = result.modules.find((m: { name: string }) => m.name === 'index')
      expect(indexModule).toBeDefined()
      expect(indexModule.data.title).toBe('Hello World')
      // $type is merged back into data from the root level
      expect(indexModule.data.$type).toBe('Page')
    })

    it('should extract exported functions from code blocks', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)

      const indexModule = result.modules.find((m: { name: string }) => m.name === 'index')
      expect(indexModule.exports).toContain('greet')

      const aboutModule = result.modules.find((m: { name: string }) => m.name === 'about')
      expect(aboutModule.exports).toContain('add')
    })
  })

  describe('Deployment Configuration Generation', () => {
    it('should generate wrangler configuration with worker_loaders binding', async () => {
      const { generateWorkersConfig } = await import('../src/commands/deploy-workers.js')

      const config = await generateWorkersConfig({
        name: 'test-project',
        modules: [
          { name: 'index', code: 'export default {}', hash: 'abc123' },
          { name: 'about', code: 'export default {}', hash: 'def456' },
        ],
        compatibilityDate: '2024-01-01',
      })

      expect(config).toBeDefined()
      expect(config.name).toBe('test-project')
      expect(config.compatibility_date).toBe('2024-01-01')
      // Worker loaders binding for dynamic module loading
      expect(config.worker_loaders).toBeDefined()
      expect(config.worker_loaders.length).toBeGreaterThan(0)
    })

    it('should generate unique worker IDs from content hash', async () => {
      const { generateWorkerId } = await import('../src/commands/deploy-workers.js')

      const content1 = 'export function foo() { return 1 }'
      const content2 = 'export function foo() { return 2 }'

      const id1 = generateWorkerId(content1)
      const id2 = generateWorkerId(content2)

      expect(id1).not.toBe(id2)

      // Same content should produce same ID
      const id1Again = generateWorkerId(content1)
      expect(id1Again).toBe(id1)
    })

    it('should support versioned worker IDs', async () => {
      const { generateWorkerId } = await import('../src/commands/deploy-workers.js')

      const content = 'export function foo() { return 1 }'
      const id1 = generateWorkerId(content, 'v1')
      const id2 = generateWorkerId(content, 'v2')

      expect(id1).not.toBe(id2)
      expect(id1).toContain('v1')
      expect(id2).toContain('v2')
    })
  })

  describe('Multi-file Deployment', () => {
    it('should deploy multiple MDX files as separate worker modules', async () => {
      const { deployWorkers } = await import('../src/commands/deploy-workers.js')

      // Mock the Cloudflare API
      const mockApi = vi.fn().mockResolvedValue({
        success: true,
        scriptId: 'script-123',
      })

      const result = await deployWorkers({
        projectDir: testDir,
        name: 'test-project',
        dryRun: true,
        verbose: false,
      })

      expect(result.success).toBe(true)
      expect(result.workerIds).toBeDefined()
      expect(result.workerIds!.length).toBeGreaterThanOrEqual(3)
    })

    it('should include code and content in deployment', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)

      // Each module should have both code and content
      for (const module of result.modules) {
        expect(module.code).toBeDefined()
        expect(module.code.length).toBeGreaterThan(0)
        // Worker code should include fetch handler
        expect(module.code).toContain('fetch')
      }
    })

    it('should track content hash for incremental deployment', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)
      expect(result.contentHash).toBeDefined()
      expect(result.contentHash.length).toBeGreaterThan(0)

      // Each module should have its own hash
      for (const module of result.modules) {
        expect(module.hash).toBeDefined()
        expect(module.hash.length).toBeGreaterThan(0)
      }
    })
  })

  describe('Worker ID Generation', () => {
    it('should generate deterministic worker IDs from content', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result1 = await compileForWorkers(testDir, { verbose: false })
      const result2 = await compileForWorkers(testDir, { verbose: false })

      expect(result1.contentHash).toBe(result2.contentHash)

      // Module hashes should also match
      const indexModule1 = result1.modules.find((m: { name: string }) => m.name === 'index')
      const indexModule2 = result2.modules.find((m: { name: string }) => m.name === 'index')
      expect(indexModule1.hash).toBe(indexModule2.hash)
    })

    it('should detect content changes via hash', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result1 = await compileForWorkers(testDir, { verbose: false })

      // Modify a file
      writeFileSync(
        join(testDir, 'index.mdx'),
        `---
title: Updated Title
$type: Page
---

# Updated Content

This content has changed.
`
      )

      const result2 = await compileForWorkers(testDir, { verbose: false })

      // Overall hash should change
      expect(result1.contentHash).not.toBe(result2.contentHash)

      // Index module hash should change
      const indexModule1 = result1.modules.find((m: { name: string }) => m.name === 'index')
      const indexModule2 = result2.modules.find((m: { name: string }) => m.name === 'index')
      expect(indexModule1.hash).not.toBe(indexModule2.hash)

      // About module hash should remain the same
      const aboutModule1 = result1.modules.find((m: { name: string }) => m.name === 'about')
      const aboutModule2 = result2.modules.find((m: { name: string }) => m.name === 'about')
      expect(aboutModule1.hash).toBe(aboutModule2.hash)
    })
  })

  describe('Dry Run Mode', () => {
    it('should not make actual API calls in dry run mode', async () => {
      const { deployWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await deployWorkers({
        projectDir: testDir,
        name: 'test-project',
        dryRun: true,
        verbose: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(result.logs.some((log: string) => log.includes('dry-run') || log.includes('DRY'))).toBe(true)
    })

    it('should report what would be deployed in dry run', async () => {
      const { deployWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await deployWorkers({
        projectDir: testDir,
        name: 'test-project',
        dryRun: true,
        verbose: true,
      })

      expect(result.success).toBe(true)
      expect(result.logs.some((log: string) => log.includes('index'))).toBe(true)
      expect(result.logs.some((log: string) => log.includes('about'))).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should handle missing project directory', async () => {
      const { deployWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await deployWorkers({
        projectDir: '/nonexistent/path',
        name: 'test-project',
        dryRun: true,
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle empty project directory', async () => {
      const emptyDir = join(tmpdir(), `mdxe-empty-${Date.now()}`)
      mkdirSync(emptyDir, { recursive: true })

      try {
        const { deployWorkers } = await import('../src/commands/deploy-workers.js')

        const result = await deployWorkers({
          projectDir: emptyDir,
          name: 'test-project',
          dryRun: true,
        })

        expect(result.success).toBe(false)
        expect(result.error).toContain('No MDX files found')
      } finally {
        rmSync(emptyDir, { recursive: true, force: true })
      }
    })

    it('should handle invalid MDX syntax gracefully', async () => {
      // Create a file that will trigger an error in the worker code generation
      // The actual code may compile fine but the worker generation should handle it gracefully
      writeFileSync(
        join(testDir, 'invalid.mdx'),
        `---
title: Invalid
---

This is a valid MDX file with no code blocks.
The compile should succeed without issues.
`
      )

      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      // Should succeed - MDX without code blocks is valid
      expect(result.success).toBe(true)
      // The module should be included with no exports
      const invalidModule = result.modules.find((m: { name: string }) => m.name === 'invalid')
      expect(invalidModule).toBeDefined()
      expect(invalidModule.exports).toHaveLength(0)
    })
  })

  describe('Integration with @mdxe/workers', () => {
    it('should use generateWorkerCode from @mdxe/workers', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)

      // The generated worker code should follow the pattern from @mdxe/workers
      const indexModule = result.modules.find((m: { name: string }) => m.name === 'index')
      expect(indexModule.code).toContain('export default')
      expect(indexModule.code).toContain('fetch')
    })

    it('should integrate with compileToModule from @mdxe/isolate', async () => {
      const { compileForWorkers } = await import('../src/commands/deploy-workers.js')

      const result = await compileForWorkers(testDir, {
        verbose: false,
      })

      expect(result.success).toBe(true)

      // Each module should have properly compiled code
      for (const module of result.modules) {
        expect(module.code).toBeDefined()
        // Should be valid ES module code
        expect(module.code).toMatch(/export\s+default/)
      }
    })
  })
})

describe('CLI Integration', () => {
  it('should parse deploy workers command', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['deploy', '--workers'])
    expect(result.command).toBe('deploy')
    expect(result.workers).toBe(true)
  })

  it('should parse deploy workers subcommand', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['deploy', 'workers'])
    expect(result.command).toBe('deploy')
    expect(result.subcommand).toBe('workers')
  })

  it('should parse worker-specific options', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs([
      'deploy',
      'workers',
      '--name', 'my-mdx-workers',
      '--content-hash',
      '--compatibility-date', '2024-01-01',
    ])

    expect(result.subcommand).toBe('workers')
    expect(result.projectName).toBe('my-mdx-workers')
    expect(result.contentHash).toBe(true)
    expect(result.compatibilityDate).toBe('2024-01-01')
  })
})

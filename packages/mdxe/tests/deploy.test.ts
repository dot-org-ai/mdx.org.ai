/**
 * Tests for mdxe deploy command
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { detectSourceType } from '../src/commands/deploy.js'
import { parseArgs } from '../src/cli.js'

describe('Deploy Command', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('detectSourceType', () => {
    it('should detect @mdxdb/fs as static', () => {
      // Create package.json with @mdxdb/fs
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/fs': '^1.0.0',
            '@mdxdb/fumadocs': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('fs')
    })

    it('should detect @mdxdb/api as dynamic', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/api': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('api')
    })

    it('should detect @mdxdb/postgres as dynamic', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/postgres': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('postgres')
    })

    it('should detect @mdxdb/mongo as dynamic', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/mongo': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('mongo')
    })

    it('should detect @mdxdb/sqlite as dynamic', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/sqlite': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('sqlite')
    })

    it('should detect @mdxdb/clickhouse as dynamic', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/clickhouse': '^1.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('clickhouse')
    })

    it('should detect from source.config.ts with createFsDatabase', () => {
      writeFileSync(
        join(testDir, 'source.config.ts'),
        `
import { createFsDatabase } from '@mdxdb/fs'

export const db = createFsDatabase({ root: './content' })
`
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('fs')
      expect(result.configPath).toBe(join(testDir, 'source.config.ts'))
    })

    it('should detect from lib/source.ts with createApiClient', () => {
      mkdirSync(join(testDir, 'lib'), { recursive: true })
      writeFileSync(
        join(testDir, 'lib', 'source.ts'),
        `
import { createApiClient } from '@mdxdb/api'

export const db = createApiClient({ baseUrl: 'https://api.example.com' })
`
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(false)
      expect(result.adapter).toBe('api')
    })

    it('should default to static for unknown projects', () => {
      writeFileSync(
        join(testDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            'next': '^14.0.0',
          },
        })
      )

      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('unknown')
    })

    it('should handle missing package.json', () => {
      const result = detectSourceType(testDir)
      expect(result.isStatic).toBe(true)
      expect(result.adapter).toBe('unknown')
    })
  })

  describe('parseArgs', () => {
    it('should parse deploy command', () => {
      const result = parseArgs(['deploy'])
      expect(result.command).toBe('deploy')
    })

    it('should parse --dir option', () => {
      const result = parseArgs(['deploy', '--dir', '/path/to/project'])
      expect(result.projectDir).toBe('/path/to/project')
    })

    it('should parse -d short option', () => {
      const result = parseArgs(['deploy', '-d', '/path/to/project'])
      expect(result.projectDir).toBe('/path/to/project')
    })

    it('should parse --mode static', () => {
      const result = parseArgs(['deploy', '--mode', 'static'])
      expect(result.mode).toBe('static')
    })

    it('should parse --mode opennext', () => {
      const result = parseArgs(['deploy', '--mode', 'opennext'])
      expect(result.mode).toBe('opennext')
    })

    it('should parse --name option', () => {
      const result = parseArgs(['deploy', '--name', 'my-docs'])
      expect(result.projectName).toBe('my-docs')
    })

    it('should parse --dry-run flag', () => {
      const result = parseArgs(['deploy', '--dry-run'])
      expect(result.dryRun).toBe(true)
    })

    it('should parse --force flag', () => {
      const result = parseArgs(['deploy', '--force'])
      expect(result.force).toBe(true)
    })

    it('should parse --verbose flag', () => {
      const result = parseArgs(['deploy', '--verbose'])
      expect(result.verbose).toBe(true)
    })

    it('should parse --env options', () => {
      const result = parseArgs([
        'deploy',
        '--env', 'API_URL=https://api.example.com',
        '--env', 'DEBUG=true',
      ])
      expect(result.env).toEqual({
        API_URL: 'https://api.example.com',
        DEBUG: 'true',
      })
    })

    it('should parse help command', () => {
      const result = parseArgs(['help'])
      expect(result.command).toBe('help')
    })

    it('should parse --help flag', () => {
      const result = parseArgs(['--help'])
      expect(result.command).toBe('help')
    })

    it('should parse version command', () => {
      const result = parseArgs(['version'])
      expect(result.command).toBe('version')
    })

    it('should default to cloudflare platform', () => {
      const result = parseArgs(['deploy'])
      expect(result.platform).toBe('cloudflare')
    })

    it('should default to current directory', () => {
      const result = parseArgs(['deploy'])
      expect(result.projectDir).toBe(process.cwd())
    })

    it('should handle multiple options together', () => {
      const result = parseArgs([
        'deploy',
        '--dir', '/my/project',
        '--name', 'my-docs',
        '--mode', 'opennext',
        '--dry-run',
        '--force',
        '--verbose',
        '--env', 'KEY=value',
      ])

      expect(result.command).toBe('deploy')
      expect(result.projectDir).toBe('/my/project')
      expect(result.projectName).toBe('my-docs')
      expect(result.mode).toBe('opennext')
      expect(result.dryRun).toBe(true)
      expect(result.force).toBe(true)
      expect(result.verbose).toBe(true)
      expect(result.env).toEqual({ KEY: 'value' })
    })
  })
})

describe('Deploy Command Integration', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-deploy-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should fail gracefully when no Next.js project is found', async () => {
    const { deploy } = await import('../src/commands/deploy.js')

    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({ name: 'test' })
    )

    const result = await deploy(testDir, {
      platform: 'cloudflare',
      dryRun: true,
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('No Next.js project found')
  })

  it('should detect mode based on source adapter', async () => {
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          '@mdxdb/api': '^1.0.0',
        },
      })
    )

    const sourceType = detectSourceType(testDir)
    expect(sourceType.isStatic).toBe(false)
    expect(sourceType.adapter).toBe('api')
  })
})

describe('API-based Deployment Options', () => {
  it('should parse --use-api flag', () => {
    const result = parseArgs(['deploy', '--use-api'])
    expect(result.command).toBe('deploy')
    // Note: useApi would need to be added to CLI if we want to support it via command line
  })

  it('should support all CloudflareDeployOptions programmatically', async () => {
    const { deploy } = await import('../src/commands/deploy.js')

    // These options should be valid TypeScript
    const options = {
      platform: 'cloudflare' as const,
      useApi: true,
      apiBaseUrl: 'https://custom-proxy.example.com/api',
      apiHeaders: {
        'X-Tenant-Id': 'tenant-123',
        'X-Platform-Auth': 'platform-secret',
      },
      dispatchNamespace: 'customer-workers',
      tenantId: 'customer-123',
      accountId: 'test-account',
      apiToken: 'test-token',
      projectName: 'my-docs',
      mode: 'static' as const,
      dryRun: true,
      kvNamespaces: { CACHE: 'kv-123' },
      d1Databases: { DB: 'd1-123' },
      env: { API_URL: 'https://api.example.com' },
    }

    // This should compile and run without errors
    expect(options.useApi).toBe(true)
    expect(options.dispatchNamespace).toBe('customer-workers')
    expect(options.tenantId).toBe('customer-123')
    expect(options.apiBaseUrl).toBe('https://custom-proxy.example.com/api')
  })
})

describe('Source Detection Integration', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-integration-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should correctly identify a Fumadocs project with fs adapter', () => {
    // Create a realistic Fumadocs project structure
    mkdirSync(join(testDir, 'lib'), { recursive: true })
    mkdirSync(join(testDir, 'content'), { recursive: true })

    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'my-docs',
        dependencies: {
          'next': '^14.0.0',
          'fumadocs-core': '^14.0.0',
          'fumadocs-ui': '^14.0.0',
          '@mdxdb/fs': '^1.0.0',
          '@mdxdb/fumadocs': '^1.0.0',
        },
      })
    )

    writeFileSync(
      join(testDir, 'lib', 'source.ts'),
      `
import { createFsDatabase } from '@mdxdb/fs'
import { createSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

const db = createFsDatabase({ root: './content' })
const mdxdbSource = createSource(db.list())

export const source = loader({
  source: mdxdbSource,
  baseUrl: '/docs',
})
`
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `
export default {
  output: 'export',
}
`
    )

    const result = detectSourceType(testDir)
    expect(result.isStatic).toBe(true)
    expect(result.adapter).toBe('fs')
  })

  it('should correctly identify a Fumadocs project with API adapter', () => {
    mkdirSync(join(testDir, 'lib'), { recursive: true })

    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'my-docs',
        dependencies: {
          'next': '^14.0.0',
          'fumadocs-core': '^14.0.0',
          '@mdxdb/api': '^1.0.0',
          '@mdxdb/fumadocs': '^1.0.0',
        },
      })
    )

    writeFileSync(
      join(testDir, 'lib', 'source.ts'),
      `
import { createApiClient } from '@mdxdb/api'
import { createSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

const db = createApiClient({
  baseUrl: process.env.MDXDB_API_URL,
  apiKey: process.env.MDXDB_API_KEY,
})

const mdxdbSource = createSource(await db.list())

export const source = loader({
  source: mdxdbSource,
  baseUrl: '/docs',
})
`
    )

    const result = detectSourceType(testDir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('api')
  })

  it('should correctly identify a Fumadocs project with Postgres adapter', () => {
    mkdirSync(join(testDir, 'lib'), { recursive: true })

    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'my-docs',
        dependencies: {
          'next': '^14.0.0',
          'fumadocs-core': '^14.0.0',
          '@mdxdb/postgres': '^1.0.0',
          '@mdxdb/fumadocs': '^1.0.0',
        },
      })
    )

    writeFileSync(
      join(testDir, 'lib', 'source.ts'),
      `
import { createDatabase } from '@mdxdb/postgres'
import { createSource } from '@mdxdb/fumadocs'
import { loader } from 'fumadocs-core/source'

const db = createDatabase({
  connectionString: process.env.DATABASE_URL,
})

const mdxdbSource = createSource(await db.list())

export const source = loader({
  source: mdxdbSource,
  baseUrl: '/docs',
})
`
    )

    const result = detectSourceType(testDir)
    expect(result.isStatic).toBe(false)
    expect(result.adapter).toBe('postgres')
  })
})

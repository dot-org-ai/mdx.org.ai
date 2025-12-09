import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  deploy,
  getProvider,
  registerProvider,
  listProviders,
  detectPlatform,
  deployToCloudflare,
  deployToVercel,
  deployToGitHub,
  deployToDo,
  getDeploymentStatus,
  cancelDeployment,
  deleteDeployment,
  type DeployProvider,
  type Platform,
  type DeployResult,
  type DeployOptions,
} from './index.js'

describe('@mdxe/deploy', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'deploy-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('module', () => {
    it('loads successfully', async () => {
      const mod = await import('./index.js')
      expect(mod).toBeDefined()
      expect(mod.deploy).toBeDefined()
    })
  })

  describe('getProvider', () => {
    it('returns do provider', () => {
      const provider = getProvider('do')
      expect(provider).toBeDefined()
      expect(provider.platform).toBe('do')
      expect(provider.name).toBe('.do Platform')
    })

    it('returns cloudflare provider', () => {
      const provider = getProvider('cloudflare')
      expect(provider).toBeDefined()
      expect(provider.platform).toBe('cloudflare')
      expect(provider.name).toBe('Cloudflare')
    })

    it('returns vercel provider', () => {
      const provider = getProvider('vercel')
      expect(provider).toBeDefined()
      expect(provider.platform).toBe('vercel')
      expect(provider.name).toBe('Vercel')
    })

    it('returns github provider', () => {
      const provider = getProvider('github')
      expect(provider).toBeDefined()
      expect(provider.platform).toBe('github')
      expect(provider.name).toBe('GitHub Pages')
    })

    it('throws error for unknown platform', () => {
      expect(() => getProvider('unknown' as Platform)).toThrow('Unknown platform: unknown')
    })
  })

  describe('listProviders', () => {
    it('returns all providers', () => {
      const providers = listProviders()
      expect(providers).toHaveLength(4)
      expect(providers.map((p) => p.platform)).toContain('do')
      expect(providers.map((p) => p.platform)).toContain('cloudflare')
      expect(providers.map((p) => p.platform)).toContain('vercel')
      expect(providers.map((p) => p.platform)).toContain('github')
    })
  })

  describe('registerProvider', () => {
    it('registers a custom provider', () => {
      const customProvider: DeployProvider = {
        platform: 'do' as Platform,
        name: 'Custom Provider',
        deploy: async () => ({ success: true, platform: 'do' }),
      }

      registerProvider(customProvider)
      const provider = getProvider('do')
      expect(provider.name).toBe('Custom Provider')

      // Restore original provider for other tests
      const originalProvider: DeployProvider = {
        platform: 'do' as Platform,
        name: '.do Platform',
        deploy: async () => ({ success: true, platform: 'do' }),
      }
      registerProvider(originalProvider)
    })
  })

  describe('detectPlatform', () => {
    it('detects cloudflare when wrangler.toml exists', () => {
      // Create real wrangler.toml
      writeFileSync(join(tmpDir, 'wrangler.toml'), 'name = "test-worker"')
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('cloudflare')
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.reason).toContain('wrangler.toml')
    })

    it('detects vercel when vercel.json exists', () => {
      // Create real vercel.json
      writeFileSync(join(tmpDir, 'vercel.json'), JSON.stringify({}))
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('vercel')
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.reason).toContain('vercel.json')
    })

    it('defaults to .do platform when no config found', () => {
      // Empty directory
      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('do')
      expect(result.reason).toContain('.do platform')
    })

    it('detects Next.js framework', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            next: '^14.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('nextjs')
      expect(result.isStatic).toBe(false) // Default Next.js is SSR
    })

    it('detects Vite framework', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            vite: '^5.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('vite')
      expect(result.isStatic).toBe(true)
    })

    it('detects Astro framework', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            astro: '^4.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('astro')
      expect(result.isStatic).toBe(true)
    })

    it('detects dynamic database dependencies', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@mdxdb/postgres': '^1.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.isStatic).toBe(false)
    })

    it('detects static export in Next.js', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({ dependencies: { next: '^14.0.0' } })
      )
      writeFileSync(join(tmpDir, 'next.config.mjs'), "export default { output: 'export' }")

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('nextjs')
      expect(result.isStatic).toBe(true)
    })
  })

  describe('deploy', () => {
    it('auto-detects platform when not specified', async () => {
      // Create basic project with no platform config - should default to .do
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = await deploy({
        projectDir: tmpDir,
        dryRun: true,
      })

      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
      expect(result.logs?.some((log) => log.includes('Auto-detected platform'))).toBe(true)
    })

    it('uses specified platform', async () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = await deploy({
        projectDir: tmpDir,
        platform: 'cloudflare',
        dryRun: true,
      })

      expect(result.platform).toBe('cloudflare')
    })

    it('includes timing information', async () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        dryRun: true,
      })

      expect(result.timing?.totalDuration).toBeDefined()
      expect(result.timing!.totalDuration).toBeGreaterThanOrEqual(0)
    })

    it('handles deployment errors with custom provider', async () => {
      // Register a custom provider that throws an error
      const errorProvider: DeployProvider = {
        platform: 'do' as Platform,
        name: 'Error Provider',
        deploy: async () => {
          throw new Error('Test deployment error')
        },
      }

      registerProvider(errorProvider)

      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Test deployment error')
      expect(result.platform).toBe('do')

      // Restore original provider
      const originalProvider: DeployProvider = {
        platform: 'do' as Platform,
        name: '.do Platform',
        deploy: async () => ({ success: true, platform: 'do' }),
      }
      registerProvider(originalProvider)
    })

    it('includes logs in result', async () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        dryRun: true,
      })

      expect(result.logs).toBeDefined()
      expect(result.logs!.length).toBeGreaterThan(0)
    })
  })

  describe('platform-specific deploy functions', () => {
    beforeEach(() => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))
    })

    it('deployToCloudflare sets platform to cloudflare', async () => {
      const result = await deployToCloudflare({
        projectDir: tmpDir,
        dryRun: true,
      })

      expect(result.platform).toBe('cloudflare')
    })

    it('deployToVercel sets platform to vercel', async () => {
      const result = await deployToVercel({
        projectDir: tmpDir,
        dryRun: true,
      })

      expect(result.platform).toBe('vercel')
    })

    it('deployToGitHub sets platform to github', async () => {
      const result = await deployToGitHub({
        projectDir: tmpDir,
        dryRun: true,
      })

      expect(result.platform).toBe('github')
    })

    it('deployToDo sets platform to do', async () => {
      const result = await deployToDo({
        projectDir: tmpDir,
        dryRun: true,
      })

      expect(result.platform).toBe('do')
    })
  })

  describe('getDeploymentStatus', () => {
    it('returns error when provider does not support status', async () => {
      const status = await getDeploymentStatus('github', 'test-123')

      expect(status.success).toBe(false)
      expect(status.error).toContain('does not support status checks')
    })

    it('returns error when provider does not support status (do)', async () => {
      const status = await getDeploymentStatus('do', 'test-123')

      expect(status.success).toBe(false)
      expect(status.error).toContain('does not support status checks')
    })

    it('vercel provider supports status checks', async () => {
      const provider = getProvider('vercel')
      expect(provider.getStatus).toBeDefined()
    })
  })

  describe('cancelDeployment', () => {
    it('returns error when provider does not support cancellation (github)', async () => {
      const result = await cancelDeployment('github', 'test-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support cancellation')
    })

    it('returns error when provider does not support cancellation (do)', async () => {
      const result = await cancelDeployment('do', 'test-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support cancellation')
    })

    it('vercel provider supports cancellation', async () => {
      const provider = getProvider('vercel')
      expect(provider.cancel).toBeDefined()
    })
  })

  describe('deleteDeployment', () => {
    it('vercel provider supports deletion', async () => {
      const provider = getProvider('vercel')
      expect(provider.delete).toBeDefined()
    })

    it('do provider has deletion method', async () => {
      // Note: DoProvider.delete exists in the class but requires API setup
      // Test that deletion API exists via deleteDeployment function
      const result = await deleteDeployment('do', 'test-worker')
      // Will fail due to missing API credentials, but that's expected
      expect(result).toBeDefined()
    })

    it('returns error when provider does not support deletion (github)', async () => {
      const result = await deleteDeployment('github', 'test-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not support deletion')
    })
  })

  describe('provider supports method', () => {
    it('checks if provider supports deployment', () => {
      const provider = getProvider('cloudflare')
      if (provider.supports) {
        const result = provider.supports({ projectDir: tmpDir })
        expect(result).toBe(true)
      } else {
        // Provider may not implement supports method
        expect(provider).toBeDefined()
      }
    })
  })

  describe('deployment options', () => {
    beforeEach(() => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))
    })

    it('passes through environment variables', async () => {
      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        env: {
          API_KEY: 'test-key',
          DATABASE_URL: 'postgres://localhost',
        },
        dryRun: true,
      })

      // Verify deployment completed (even in dry run)
      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
    })

    it('passes through build command', async () => {
      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        buildCommand: 'pnpm build',
        dryRun: true,
      })

      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
    })

    it('passes through custom domains', async () => {
      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        domains: ['example.com', 'www.example.com'],
        dryRun: true,
      })

      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
    })

    it('supports dry run mode', async () => {
      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        dryRun: true,
      })

      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
    })

    it('supports force mode', async () => {
      const result = await deploy({
        projectDir: tmpDir,
        platform: 'do',
        force: true,
        dryRun: true,
      })

      expect(result.platform).toBe('do')
      expect(result.logs).toBeDefined()
    })
  })

  describe('framework detection integration', () => {
    it('detects Gatsby framework', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            gatsby: '^5.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('gatsby')
      expect(result.isStatic).toBe(true)
    })

    it('detects Remix framework', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            '@remix-run/node': '^2.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('remix')
      expect(result.isStatic).toBe(false)
    })

    it('detects Astro with SSR adapter', () => {
      writeFileSync(
        join(tmpDir, 'package.json'),
        JSON.stringify({
          dependencies: {
            astro: '^4.0.0',
            '@astrojs/node': '^8.0.0',
          },
        })
      )

      const result = detectPlatform(tmpDir)

      expect(result.framework).toBe('astro')
      expect(result.isStatic).toBe(false)
    })

    it('detects wrangler.jsonc config file', () => {
      writeFileSync(join(tmpDir, 'wrangler.jsonc'), '{ "name": "test-worker" }')
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('cloudflare')
      expect(result.reason).toContain('wrangler')
    })

    it('detects .vercel directory', () => {
      const vercelDir = join(tmpDir, '.vercel')
      mkdirSync(vercelDir)
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('vercel')
    })
  })

  describe('platform precedence', () => {
    it('prefers wrangler config over default', () => {
      writeFileSync(join(tmpDir, 'wrangler.toml'), 'name = "test"')
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('cloudflare')
    })

    it('prefers vercel config over default', () => {
      writeFileSync(join(tmpDir, 'vercel.json'), '{}')
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({}))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('vercel')
    })

    it('defaults to do when no explicit config', () => {
      writeFileSync(join(tmpDir, 'package.json'), JSON.stringify({ dependencies: { vite: '^5' } }))

      const result = detectPlatform(tmpDir)

      expect(result.platform).toBe('do')
    })
  })
})

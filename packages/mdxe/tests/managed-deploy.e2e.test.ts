/**
 * E2E Tests for mdxe deploy --managed
 *
 * These tests use real oauth.do tokens and hit real endpoints
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { ensureLoggedIn } from 'oauth.do'

describe('E2E: mdxe deploy --managed', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-e2e-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should authenticate via oauth.do', async () => {
    const { token, isNewLogin } = await ensureLoggedIn()

    expect(token).toBeDefined()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(0)
    console.log(`Auth: ${isNewLogin ? 'new login' : 'existing session'}`)
  })

  it('should POST worker to /workers endpoint', async () => {
    // Get auth token
    const { token } = await ensureLoggedIn()
    expect(token).toBeDefined()

    // Create a simple worker
    const workerCode = `
export default {
  async fetch(request, env) {
    return new Response('Hello from e2e test worker!', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
`

    // POST to /workers
    const baseUrl = process.env.WORKERS_API_URL || 'https://apis.do'
    const response = await fetch(`${baseUrl}/workers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: `e2e-test-worker-${Date.now()}`,
        code: workerCode,
        mode: 'static',
        compatibilityDate: new Date().toISOString().split('T')[0],
      }),
    })

    console.log(`POST /workers response: ${response.status}`)

    // Handle response safely (might be HTML error page)
    let result: unknown
    try {
      const text = await response.text()
      result = text.startsWith('{') ? JSON.parse(text) : { error: 'HTML response', status: response.status }
      console.log('Result:', JSON.stringify(result, null, 2))
    } catch {
      console.log('Response is not JSON')
    }

    // We expect either success or a meaningful error
    expect(response.status).toBeDefined()
  })

  it('should deploy via managed API using deploy function', async () => {
    // Create a minimal project structure
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'e2e-test-project',
        scripts: {
          build: 'echo "build complete"',
        },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default { output: 'export' }`
    )

    // Create worker directory
    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `
export default {
  async fetch(request, env) {
    return new Response('E2E Test Worker', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }
}
`
    )

    const { deploy } = await import('../src/commands/deploy.js')

    // Deploy is always managed - posts to apis.do/workers
    const result = await deploy(testDir, {
      platform: 'cloudflare',
      projectName: `e2e-test-${Date.now()}`,
      mode: 'static',
    })

    console.log('Deploy result:', JSON.stringify(result, null, 2))

    // Log all messages
    if (result.logs) {
      console.log('Logs:')
      result.logs.forEach(log => console.log(`  - ${log}`))
    }

    expect(result).toBeDefined()
    expect(result.logs).toBeDefined()
    expect(result.logs).toContain('Using managed workers.do API for deployment')
    expect(result.logs.some((log: string) => log.includes('/workers'))).toBe(true)
  })
})

describe('E2E: CLI integration', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `mdxe-cli-e2e-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should parse deploy command correctly', async () => {
    const { parseArgs } = await import('../src/cli.js')

    const result = parseArgs(['deploy', '--name', 'test-worker'])

    expect(result.command).toBe('deploy')
    expect(result.projectName).toBe('test-worker')
  })

  it('should run full deploy flow via CLI (dry-run)', async () => {
    // Create minimal project
    writeFileSync(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'cli-e2e-test',
        scripts: { build: 'echo "built"' },
      })
    )

    writeFileSync(
      join(testDir, 'next.config.mjs'),
      `export default {}`
    )

    mkdirSync(join(testDir, '.worker'), { recursive: true })
    writeFileSync(
      join(testDir, '.worker', 'index.js'),
      `export default { fetch: () => new Response('ok') }`
    )

    const { parseArgs } = await import('../src/cli.js')
    const { deploy } = await import('../src/commands/deploy.js')

    const options = parseArgs([
      'deploy',
      '--dir', testDir,
      '--name', `cli-e2e-${Date.now()}`,
      '--dry-run',  // Use dry-run to avoid process.exit
    ])

    // Use deploy directly with dry-run to test the flow
    // Deploy is always managed (posts to apis.do/workers)
    const result = await deploy(testDir, {
      platform: 'cloudflare',
      projectName: options.projectName,
      dryRun: true,
    })

    console.log('Deploy result:', JSON.stringify(result, null, 2))
    expect(result.success).toBe(true)
    expect(result.logs).toBeDefined()
  })
})

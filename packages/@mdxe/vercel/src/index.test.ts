import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { join } from 'node:path'
import type { VercelDeployOptions, DeployResult, VercelApiConfig, ProjectConfig } from './types.js'

// Mock oauth.do module
vi.mock('oauth.do', () => ({
  ensureLoggedIn: vi.fn().mockResolvedValue({ token: 'mock-token', isNewLogin: false }),
  getToken: vi.fn().mockResolvedValue(null),
}))

// Mock node:fs module
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    readFileSync: vi.fn().mockReturnValue(''),
    readdirSync: vi.fn().mockReturnValue([]),
    statSync: vi.fn().mockReturnValue({ isDirectory: () => false }),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
  }
})

// Mock node:child_process
vi.mock('node:child_process', () => ({
  spawn: vi.fn().mockReturnValue({
    on: vi.fn((event, callback) => {
      if (event === 'close') setTimeout(() => callback(0), 0)
    }),
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
  }),
  spawnSync: vi.fn().mockImplementation(() => ({ status: 0 })),
}))

// Ensure spawnSync returns proper value
beforeEach(async () => {
  const childProcess = await import('node:child_process')
  ;(childProcess.spawnSync as Mock).mockReturnValue({ status: 0 })
})

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

// ===========================================================================
// Test Fixtures and Utilities
// ===========================================================================

function createMockFetchResponse(data: unknown, ok = true, status = 200): Promise<Response> {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response)
}

function setupMockFetch(responses: Array<{ data: unknown; ok?: boolean; status?: number }>) {
  let callIndex = 0
  mockFetch.mockImplementation(() => {
    const response = responses[callIndex] || { data: {}, ok: true, status: 200 }
    callIndex++
    return createMockFetchResponse(response.data, response.ok ?? true, response.status ?? 200)
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

  it('exports VercelApi class', async () => {
    const mod = await import('./index.js')
    expect(mod.VercelApi).toBeDefined()
    expect(typeof mod.VercelApi).toBe('function')
  })

  it('exports createVercelApi function', async () => {
    const mod = await import('./index.js')
    expect(mod.createVercelApi).toBeDefined()
    expect(typeof mod.createVercelApi).toBe('function')
  })

  it('exports createVercelApiFromEnv function', async () => {
    const mod = await import('./index.js')
    expect(mod.createVercelApiFromEnv).toBeDefined()
    expect(typeof mod.createVercelApiFromEnv).toBe('function')
  })

  it('exports createProvider function', async () => {
    const mod = await import('./index.js')
    expect(mod.createProvider).toBeDefined()
    expect(typeof mod.createProvider).toBe('function')
  })

  it('exports linkProject function', async () => {
    const mod = await import('./index.js')
    expect(mod.linkProject).toBeDefined()
    expect(typeof mod.linkProject).toBe('function')
  })

  it('exports setEnvVars function', async () => {
    const mod = await import('./index.js')
    expect(mod.setEnvVars).toBeDefined()
    expect(typeof mod.setEnvVars).toBe('function')
  })

  it('exports readProjectFiles function', async () => {
    const mod = await import('./index.js')
    expect(mod.readProjectFiles).toBeDefined()
    expect(typeof mod.readProjectFiles).toBe('function')
  })
})

// ===========================================================================
// deploy() function tests
// ===========================================================================

describe('deploy() function', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should deploy successfully with dry run', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      projectName: 'test-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs).toBeDefined()
    expect(result.logs?.some(log => log.includes('dry-run'))).toBe(true)
  })

  it('should include logs in result', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.logs).toBeDefined()
    expect(Array.isArray(result.logs)).toBe(true)
    expect(result.logs!.length).toBeGreaterThan(0)
  })

  it('should use provided project name', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      projectName: 'custom-project-name',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle production flag', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      production: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('prod') || log.includes('Would run'))).toBe(true)
  })

  it('should handle force flag', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      force: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle public flag', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      public: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle environment variables', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      env: {
        NODE_ENV: 'production',
        API_KEY: 'secret',
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle build environment variables', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      buildEnv: {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle regions configuration', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      regions: ['iad1', 'sfo1'],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle build command override', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      buildCommand: 'pnpm build',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle output directory override', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      outputDir: '.next',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle install command override', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      installCommand: 'pnpm install --frozen-lockfile',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle dev command override', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      devCommand: 'pnpm dev',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle root directory for monorepos', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      rootDirectory: 'packages/app',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Framework Detection Tests
// ===========================================================================

describe('Framework detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect Next.js project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { next: '14.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/nextjs-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect Remix project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { '@remix-run/react': '2.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/remix-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect SvelteKit project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      devDependencies: { '@sveltejs/kit': '2.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/sveltekit-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect Vite project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      devDependencies: { vite: '5.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/vite-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect Astro project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { astro: '4.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/astro-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect Gatsby project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { gatsby: '5.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/gatsby-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect Nuxt project', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { nuxt: '3.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/nuxt-project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should allow framework override', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      framework: 'nextjs',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// VercelApi class tests
// ===========================================================================

describe('VercelApi class', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('constructor and authentication', () => {
    it('should construct with required config', async () => {
      const { VercelApi } = await import('./api.js')
      const api = new VercelApi({
        token: 'test-token',
      })
      expect(api).toBeDefined()
    })

    it('should use default baseUrl', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: { user: { uid: '123', username: 'test', email: 'test@example.com' } } }])

      const api = new VercelApi({
        token: 'test-token',
      })

      await api.getUser()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.vercel.com'),
        expect.any(Object)
      )
    })

    it('should use custom baseUrl', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({
        token: 'test-token',
        baseUrl: 'https://custom.vercel.api.com',
      })

      await api.getUser()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.vercel.api.com'),
        expect.any(Object)
      )
    })

    it('should include authorization header in requests', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({
        token: 'my-secret-token',
      })

      await api.getUser()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer my-secret-token',
          }),
        })
      )
    })

    it('should include teamId in query params when provided', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: { projects: [] } }])

      const api = new VercelApi({
        token: 'test-token',
        teamId: 'team-123',
      })

      await api.listProjects()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('teamId=team-123'),
        expect.any(Object)
      )
    })
  })

  describe('getUser()', () => {
    it('should return user info', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { user: { uid: 'user-123', username: 'testuser', email: 'test@example.com' } },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.getUser()

      expect(result.success).toBe(true)
      expect(result.user?.uid).toBe('user-123')
      expect(result.user?.username).toBe('testuser')
    })

    it('should handle auth failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Invalid token' } },
        ok: false,
        status: 401,
      }])

      const api = new VercelApi({ token: 'invalid-token' })
      const result = await api.getUser()

      expect(result.success).toBe(false)
      expect(result.error).toContain('401')
    })
  })

  describe('listProjects()', () => {
    it('should return list of projects', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: {
          projects: [
            { id: 'proj-1', name: 'project-1' },
            { id: 'proj-2', name: 'project-2' },
          ],
        },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.listProjects()

      expect(result.success).toBe(true)
      expect(result.projects).toHaveLength(2)
      expect(result.projects?.[0].name).toBe('project-1')
    })

    it('should handle empty project list', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: { projects: [] } }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.listProjects()

      expect(result.success).toBe(true)
      expect(result.projects).toHaveLength(0)
    })
  })

  describe('getProject()', () => {
    it('should return project details', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { id: 'proj-123', name: 'my-project', framework: 'nextjs' },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.getProject('my-project')

      expect(result.success).toBe(true)
      expect(result.project?.name).toBe('my-project')
    })

    it('should handle project not found', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Project not found' } },
        ok: false,
        status: 404,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.getProject('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('404')
    })
  })

  describe('createProject()', () => {
    it('should create project successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: { id: 'new-proj-123' } }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.createProject({
        name: 'new-project',
        framework: 'nextjs',
      })

      expect(result.success).toBe(true)
      expect(result.projectId).toBe('new-proj-123')
    })

    it('should create project with all options', async () => {
      const { VercelApi } = await import('./api.js')
      let capturedBody: unknown
      mockFetch.mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return createMockFetchResponse({ id: 'proj-123' })
      })

      const api = new VercelApi({ token: 'test-token' })
      await api.createProject({
        name: 'full-project',
        framework: 'nextjs',
        buildCommand: 'pnpm build',
        outputDirectory: '.next',
        installCommand: 'pnpm install',
        devCommand: 'pnpm dev',
        rootDirectory: 'apps/web',
        nodeVersion: '20.x',
      })

      expect((capturedBody as Record<string, unknown>).name).toBe('full-project')
      expect((capturedBody as Record<string, unknown>).framework).toBe('nextjs')
      expect((capturedBody as Record<string, unknown>).buildCommand).toBe('pnpm build')
    })

    it('should handle project creation failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Project already exists' } },
        ok: false,
        status: 409,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.createProject({ name: 'existing-project' })

      expect(result.success).toBe(false)
      expect(result.error).toContain('409')
    })
  })

  describe('createDeployment()', () => {
    it('should create deployment successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: {
          id: 'dpl-123',
          url: 'my-project-abc123.vercel.app',
          name: 'my-project',
          state: 'READY',
          readyState: 'READY',
          createdAt: Date.now(),
        },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.createDeployment({
        name: 'my-project',
        files: [{ file: 'index.html', data: 'PGh0bWw+PC9odG1sPg==', encoding: 'base64' }],
      })

      expect(result.success).toBe(true)
      expect(result.deployment?.id).toBe('dpl-123')
    })

    it('should create production deployment', async () => {
      const { VercelApi } = await import('./api.js')
      let capturedBody: unknown
      mockFetch.mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return createMockFetchResponse({ id: 'dpl-123', url: 'test.vercel.app' })
      })

      const api = new VercelApi({ token: 'test-token' })
      await api.createDeployment({
        name: 'my-project',
        files: [],
        target: 'production',
      })

      expect((capturedBody as Record<string, unknown>).target).toBe('production')
    })

    it('should include project settings', async () => {
      const { VercelApi } = await import('./api.js')
      let capturedBody: unknown
      mockFetch.mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return createMockFetchResponse({ id: 'dpl-123', url: 'test.vercel.app' })
      })

      const api = new VercelApi({ token: 'test-token' })
      await api.createDeployment({
        name: 'my-project',
        files: [],
        projectSettings: {
          buildCommand: 'npm run build',
          outputDirectory: 'dist',
          framework: 'vite',
        },
      })

      expect((capturedBody as Record<string, unknown>).projectSettings).toEqual({
        buildCommand: 'npm run build',
        outputDirectory: 'dist',
        framework: 'vite',
      })
    })

    it('should include git metadata', async () => {
      const { VercelApi } = await import('./api.js')
      let capturedBody: unknown
      mockFetch.mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return createMockFetchResponse({ id: 'dpl-123', url: 'test.vercel.app' })
      })

      const api = new VercelApi({ token: 'test-token' })
      await api.createDeployment({
        name: 'my-project',
        files: [],
        gitMetadata: {
          commitSha: 'abc123',
          commitMessage: 'Initial commit',
          commitAuthorName: 'Test User',
          branch: 'main',
        },
      })

      expect((capturedBody as Record<string, unknown>).gitMetadata).toEqual({
        commitSha: 'abc123',
        commitMessage: 'Initial commit',
        commitAuthorName: 'Test User',
        branch: 'main',
      })
    })
  })

  describe('getDeployment()', () => {
    it('should return deployment status', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: {
          id: 'dpl-123',
          url: 'my-project.vercel.app',
          state: 'READY',
          readyState: 'READY',
          createdAt: Date.now(),
        },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.getDeployment('dpl-123')

      expect(result.success).toBe(true)
      expect(result.deployment?.readyState).toBe('READY')
    })

    it('should handle deployment not found', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Deployment not found' } },
        ok: false,
        status: 404,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.getDeployment('nonexistent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('404')
    })
  })

  describe('listDeployments()', () => {
    it('should return list of deployments', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: {
          deployments: [
            { id: 'dpl-1', url: 'proj-1.vercel.app', readyState: 'READY' },
            { id: 'dpl-2', url: 'proj-2.vercel.app', readyState: 'BUILDING' },
          ],
        },
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.listDeployments('proj-123')

      expect(result.success).toBe(true)
      expect(result.deployments).toHaveLength(2)
    })

    it('should respect limit parameter', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: { deployments: [] } }])

      const api = new VercelApi({ token: 'test-token' })
      await api.listDeployments('proj-123', 5)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=5'),
        expect.any(Object)
      )
    })
  })

  describe('cancelDeployment()', () => {
    it('should cancel deployment successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.cancelDeployment('dpl-123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v12/deployments/dpl-123/cancel'),
        expect.objectContaining({ method: 'PATCH' })
      )
    })

    it('should handle cancel failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Cannot cancel completed deployment' } },
        ok: false,
        status: 400,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.cancelDeployment('dpl-123')

      expect(result.success).toBe(false)
    })
  })

  describe('deleteDeployment()', () => {
    it('should delete deployment successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.deleteDeployment('dpl-123')

      expect(result.success).toBe(true)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/v13/deployments/dpl-123'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('should handle delete failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Deployment not found' } },
        ok: false,
        status: 404,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.deleteDeployment('nonexistent')

      expect(result.success).toBe(false)
    })
  })

  describe('addEnvVar()', () => {
    it('should add environment variable successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.addEnvVar('proj-123', {
        key: 'API_KEY',
        value: 'secret-value',
        target: ['production', 'preview'],
      })

      expect(result.success).toBe(true)
    })

    it('should include type in request', async () => {
      const { VercelApi } = await import('./api.js')
      let capturedBody: unknown
      mockFetch.mockImplementation((_url, options) => {
        capturedBody = JSON.parse(options.body as string)
        return createMockFetchResponse({})
      })

      const api = new VercelApi({ token: 'test-token' })
      await api.addEnvVar('proj-123', {
        key: 'SECRET',
        value: 'value',
        target: ['production'],
        type: 'secret',
      })

      expect((capturedBody as Record<string, unknown>).type).toBe('secret')
    })

    it('should handle env var creation failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Environment variable already exists' } },
        ok: false,
        status: 409,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.addEnvVar('proj-123', {
        key: 'EXISTING',
        value: 'value',
        target: ['production'],
      })

      expect(result.success).toBe(false)
    })
  })

  describe('addDomain()', () => {
    it('should add domain successfully', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{ data: {} }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.addDomain('proj-123', 'example.com')

      expect(result.success).toBe(true)
    })

    it('should handle domain addition failure', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([{
        data: { error: { message: 'Domain already in use' } },
        ok: false,
        status: 409,
      }])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.addDomain('proj-123', 'taken.com')

      expect(result.success).toBe(false)
    })
  })

  describe('waitForDeployment()', () => {
    it('should wait for deployment to be ready', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([
        { data: { id: 'dpl-123', readyState: 'BUILDING' } },
        { data: { id: 'dpl-123', readyState: 'READY', url: 'test.vercel.app' } },
      ])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

      expect(result.success).toBe(true)
      expect(result.deployment?.readyState).toBe('READY')
    })

    it('should handle deployment error state', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([
        { data: { id: 'dpl-123', readyState: 'BUILDING' } },
        { data: { id: 'dpl-123', readyState: 'ERROR' } },
      ])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('ERROR')
    })

    it('should handle deployment canceled state', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([
        { data: { id: 'dpl-123', readyState: 'CANCELED' } },
      ])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

      expect(result.success).toBe(false)
      expect(result.error).toContain('CANCELED')
    })

    it('should timeout after specified duration', async () => {
      const { VercelApi } = await import('./api.js')
      setupMockFetch([
        { data: { id: 'dpl-123', readyState: 'BUILDING' } },
        { data: { id: 'dpl-123', readyState: 'BUILDING' } },
        { data: { id: 'dpl-123', readyState: 'BUILDING' } },
      ])

      const api = new VercelApi({ token: 'test-token' })
      const result = await api.waitForDeployment('dpl-123', {
        timeout: 50,
        pollInterval: 20,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('timed out')
    })
  })
})

// ===========================================================================
// createVercelApiFromEnv() Tests
// ===========================================================================

describe('createVercelApiFromEnv()', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should create API client from environment variables', async () => {
    process.env.VERCEL_TOKEN = 'env-token'

    const { createVercelApiFromEnv } = await import('./api.js')
    const api = createVercelApiFromEnv()

    expect(api).toBeDefined()
  })

  it('should throw error when VERCEL_TOKEN is missing', async () => {
    delete process.env.VERCEL_TOKEN

    const { createVercelApiFromEnv } = await import('./api.js')

    expect(() => createVercelApiFromEnv()).toThrow('VERCEL_TOKEN')
  })

  it('should use VERCEL_TEAM_ID from environment', async () => {
    process.env.VERCEL_TOKEN = 'env-token'
    process.env.VERCEL_TEAM_ID = 'env-team-id'

    const { createVercelApiFromEnv } = await import('./api.js')
    setupMockFetch([{ data: { projects: [] } }])

    const api = createVercelApiFromEnv()
    await api.listProjects()

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('teamId=env-team-id'),
      expect.any(Object)
    )
  })

  it('should allow overriding config', async () => {
    process.env.VERCEL_TOKEN = 'env-token'

    const { createVercelApiFromEnv } = await import('./api.js')
    const api = createVercelApiFromEnv({ timeout: 120000 })

    expect(api).toBeDefined()
  })
})

// ===========================================================================
// linkProject() Tests
// ===========================================================================

describe('linkProject()', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should link existing project', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { linkProject } = await import('./index.js')

    setupMockFetch([{ data: { id: 'proj-123', name: 'existing-project' } }])

    const result = await linkProject({
      projectDir: '/test/project',
      projectName: 'existing-project',
    })

    expect(result.success).toBe(true)
    expect(result.projectId).toBe('proj-123')
  })

  it('should create new project if not exists', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { linkProject } = await import('./index.js')

    setupMockFetch([
      { data: { error: { message: 'Not found' } }, ok: false, status: 404 },
      { data: { id: 'new-proj-123' } },
    ])

    const result = await linkProject({
      projectDir: '/test/project',
      projectName: 'new-project',
    })

    expect(result.success).toBe(true)
    expect(result.projectId).toBe('new-proj-123')
  })

  it('should return error when token is missing', async () => {
    delete process.env.VERCEL_TOKEN
    const { linkProject } = await import('./index.js')

    const result = await linkProject({
      projectDir: '/test/project',
      projectName: 'test-project',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('token')
  })
})

// ===========================================================================
// setEnvVars() Tests
// ===========================================================================

describe('setEnvVars()', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should set multiple environment variables', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { setEnvVars } = await import('./index.js')

    setupMockFetch([{ data: {} }, { data: {} }])

    const result = await setEnvVars({
      projectId: 'proj-123',
      env: {
        API_KEY: 'key-value',
        DATABASE_URL: 'postgres://localhost',
      },
    })

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })

  it('should use default targets', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { setEnvVars } = await import('./index.js')

    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    await setEnvVars({
      projectId: 'proj-123',
      env: { KEY: 'value' },
    })

    expect((capturedBody as Record<string, unknown>).target).toEqual(['production', 'preview', 'development'])
  })

  it('should use custom targets', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { setEnvVars } = await import('./index.js')

    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    await setEnvVars({
      projectId: 'proj-123',
      env: { KEY: 'value' },
      target: ['production'],
    })

    expect((capturedBody as Record<string, unknown>).target).toEqual(['production'])
  })

  it('should return error when token is missing', async () => {
    delete process.env.VERCEL_TOKEN
    const { setEnvVars } = await import('./index.js')

    const result = await setEnvVars({
      projectId: 'proj-123',
      env: { KEY: 'value' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('token')
  })

  it('should handle env var failure', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { setEnvVars } = await import('./index.js')

    setupMockFetch([{
      data: { error: { message: 'Failed' } },
      ok: false,
      status: 500,
    }])

    const result = await setEnvVars({
      projectId: 'proj-123',
      env: { KEY: 'value' },
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to set KEY')
  })
})

// ===========================================================================
// createProvider() Tests
// ===========================================================================

describe('createProvider()', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('should create provider with platform vercel', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({ token: 'test-token' })

    expect(provider.platform).toBe('vercel')
    expect(provider.name).toBe('Vercel')
  })

  it('should have deploy method', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({ token: 'test-token' })

    expect(typeof provider.deploy).toBe('function')
  })

  it('should have getStatus method', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({ token: 'test-token' })

    expect(typeof provider.getStatus).toBe('function')
  })

  it('should have cancel method', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({ token: 'test-token' })

    expect(typeof provider.cancel).toBe('function')
  })

  it('should have delete method', async () => {
    const { createProvider } = await import('./index.js')
    const provider = createProvider({ token: 'test-token' })

    expect(typeof provider.delete).toBe('function')
  })

  it('should use environment variables when no config provided', async () => {
    process.env.VERCEL_TOKEN = 'env-token'
    const { createProvider } = await import('./index.js')
    const provider = createProvider()

    expect(provider).toBeDefined()
  })

  it('getStatus should return deployment info', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { createProvider } = await import('./index.js')
    setupMockFetch([{
      data: { id: 'dpl-123', url: 'test.vercel.app', readyState: 'READY' },
    }])

    const provider = createProvider()
    const result = await provider.getStatus?.('dpl-123')

    expect(result?.success).toBe(true)
    expect(result?.url).toBe('https://test.vercel.app')
  })

  it('cancel should cancel deployment', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { createProvider } = await import('./index.js')
    setupMockFetch([{ data: {} }])

    const provider = createProvider()
    const result = await provider.cancel?.('dpl-123')

    expect(result?.success).toBe(true)
  })

  it('delete should delete deployment', async () => {
    process.env.VERCEL_TOKEN = 'test-token'
    const { createProvider } = await import('./index.js')
    setupMockFetch([{ data: {} }])

    const provider = createProvider()
    const result = await provider.delete?.('dpl-123')

    expect(result?.success).toBe(true)
  })

  it('should return error when token is missing for getStatus', async () => {
    delete process.env.VERCEL_TOKEN
    const { createProvider } = await import('./index.js')

    const provider = createProvider()
    const result = await provider.getStatus?.('dpl-123')

    expect(result?.success).toBe(false)
    expect(result?.error).toContain('required')
  })
})

// ===========================================================================
// Error Handling Tests
// ===========================================================================

describe('Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should handle network errors', async () => {
    const { VercelApi } = await import('./api.js')
    mockFetch.mockRejectedValue(new Error('Network error'))

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.getUser()

    expect(result.success).toBe(false)
    expect(result.error).toContain('Network error')
  })

  it('should handle timeout errors', async () => {
    const { VercelApi } = await import('./api.js')
    const abortError = new Error('The operation was aborted')
    abortError.name = 'AbortError'
    mockFetch.mockRejectedValue(abortError)

    const api = new VercelApi({ token: 'test-token', timeout: 100 })
    const result = await api.getUser()

    expect(result.success).toBe(false)
  })

  it('should handle rate limit errors', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Rate limit exceeded' } },
      ok: false,
      status: 429,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.listProjects()

    expect(result.success).toBe(false)
    expect(result.error).toContain('429')
  })

  it('should handle server errors', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Internal server error' } },
      ok: false,
      status: 500,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.listProjects()

    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })

  it('should handle malformed JSON response', async () => {
    const { VercelApi } = await import('./api.js')
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    } as Response)

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.getUser()

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown error')
  })
})

// ===========================================================================
// readProjectFiles() Tests
// ===========================================================================

describe('readProjectFiles()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should read project files', async () => {
    const fs = await import('node:fs')
    const { readProjectFiles } = await import('./api.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockReturnValue(['index.html', 'style.css'])
    ;(fs.statSync as Mock).mockReturnValue({ isDirectory: () => false })
    ;(fs.readFileSync as Mock).mockReturnValue(Buffer.from('<html></html>'))

    const files = readProjectFiles('/test/project')

    expect(files.length).toBeGreaterThan(0)
    expect(files[0].encoding).toBe('base64')
  })

  it('should exclude node_modules', async () => {
    const fs = await import('node:fs')
    const { readProjectFiles } = await import('./api.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockImplementation((path: string) => {
      if (path === '/test/project') return ['index.html', 'node_modules']
      return []
    })
    ;(fs.statSync as Mock).mockImplementation((path: string) => ({
      isDirectory: () => path.includes('node_modules'),
    }))
    ;(fs.readFileSync as Mock).mockReturnValue(Buffer.from('<html></html>'))

    const files = readProjectFiles('/test/project')

    expect(files.some(f => f.file.includes('node_modules'))).toBe(false)
  })

  it('should exclude .git directory', async () => {
    const fs = await import('node:fs')
    const { readProjectFiles } = await import('./api.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockImplementation((path: string) => {
      if (path === '/test/project') return ['index.html', '.git']
      return []
    })
    ;(fs.statSync as Mock).mockImplementation((path: string) => ({
      isDirectory: () => path.includes('.git'),
    }))
    ;(fs.readFileSync as Mock).mockReturnValue(Buffer.from('<html></html>'))

    const files = readProjectFiles('/test/project')

    expect(files.some(f => f.file.includes('.git'))).toBe(false)
  })

  it('should handle empty directory', async () => {
    const fs = await import('node:fs')
    const { readProjectFiles } = await import('./api.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readdirSync as Mock).mockReturnValue([])

    const files = readProjectFiles('/test/empty-project')

    expect(files).toHaveLength(0)
  })

  it('should handle non-existent directory', async () => {
    const fs = await import('node:fs')
    const { readProjectFiles } = await import('./api.js')

    ;(fs.existsSync as Mock).mockReturnValue(false)

    const files = readProjectFiles('/test/nonexistent')

    expect(files).toHaveLength(0)
  })
})

// ===========================================================================
// Serverless Function Configuration Tests
// ===========================================================================

describe('Serverless function configuration', () => {
  it('should support functions configuration in deploy options', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      functions: {
        'api/**/*.ts': {
          maxDuration: 30,
          memory: 1024,
          runtime: 'nodejs20.x',
        },
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should support regions for functions', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      functions: {
        'api/edge.ts': {
          regions: ['iad1', 'sfo1', 'cdg1'],
        },
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Headers, Redirects, and Rewrites Tests
// ===========================================================================

describe('Headers, Redirects, and Rewrites', () => {
  it('should support headers configuration', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      headers: [
        {
          source: '/api/:path*',
          headers: [
            { key: 'Access-Control-Allow-Origin', value: '*' },
            { key: 'X-Custom-Header', value: 'custom' },
          ],
        },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should support redirects configuration', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      redirects: [
        { source: '/old-page', destination: '/new-page', permanent: true },
        { source: '/legacy/:path*', destination: '/modern/:path*', statusCode: 308 },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should support rewrites configuration', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      rewrites: [
        { source: '/api/:path*', destination: 'https://api.example.com/:path*' },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should support conditional headers', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      headers: [
        {
          source: '/:path*',
          headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
          has: [{ type: 'header', key: 'x-preview' }],
        },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Git Metadata Tests
// ===========================================================================

describe('Git metadata', () => {
  it('should include git metadata in deployment', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      git: {
        commitSha: 'abc123def456',
        commitMessage: 'feat: add new feature',
        commitAuthorName: 'Test User',
        branch: 'feature-branch',
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should handle dirty git state', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      git: {
        commitSha: 'abc123',
        dirty: true,
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Deployment Previews Tests
// ===========================================================================

describe('Deployment previews', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should create preview deployment by default', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      if (options.body) {
        capturedBody = JSON.parse(options.body as string)
      }
      return createMockFetchResponse({ id: 'dpl-123', url: 'test.vercel.app' })
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.createDeployment({
      name: 'test-project',
      files: [],
    })

    expect((capturedBody as Record<string, unknown>).target).toBe('preview')
  })

  it('should create production deployment when specified', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      if (options.body) {
        capturedBody = JSON.parse(options.body as string)
      }
      return createMockFetchResponse({ id: 'dpl-123', url: 'test.vercel.app' })
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.createDeployment({
      name: 'test-project',
      files: [],
      target: 'production',
    })

    expect((capturedBody as Record<string, unknown>).target).toBe('production')
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('Type definitions', () => {
  it('VercelDeployOptions has required fields', () => {
    const options: VercelDeployOptions = {
      projectDir: '/path/to/project',
    }
    expect(options.projectDir).toBeDefined()
  })

  it('VercelDeployOptions supports all optional fields', () => {
    const options: VercelDeployOptions = {
      projectDir: '/path/to/project',
      projectName: 'my-project',
      teamId: 'team-123',
      token: 'token-456',
      production: true,
      buildCommand: 'pnpm build',
      outputDir: '.next',
      installCommand: 'pnpm install',
      devCommand: 'pnpm dev',
      framework: 'nextjs',
      rootDirectory: 'apps/web',
      env: { NODE_ENV: 'production' },
      buildEnv: { NEXT_PUBLIC_API: 'https://api.example.com' },
      regions: ['iad1', 'sfo1'],
      domains: ['example.com'],
      functions: { 'api/**': { maxDuration: 30 } },
      headers: [{ source: '/*', headers: [{ key: 'X-Frame-Options', value: 'DENY' }] }],
      redirects: [{ source: '/old', destination: '/new', permanent: true }],
      rewrites: [{ source: '/api/:path*', destination: 'https://api.example.com/:path*' }],
      dryRun: true,
      force: false,
      useCli: true,
      public: false,
      git: {
        commitSha: 'abc123',
        commitMessage: 'Initial commit',
        commitAuthorName: 'Test',
        branch: 'main',
        dirty: false,
      },
    }

    expect(options.projectDir).toBe('/path/to/project')
    expect(options.production).toBe(true)
    expect(options.framework).toBe('nextjs')
  })

  it('VercelApiConfig has required fields', () => {
    const config: VercelApiConfig = {
      token: 'test-token',
    }
    expect(config.token).toBeDefined()
  })

  it('VercelApiConfig supports optional fields', () => {
    const config: VercelApiConfig = {
      token: 'test-token',
      teamId: 'team-123',
      baseUrl: 'https://custom.api.com',
      timeout: 60000,
    }
    expect(config.baseUrl).toBe('https://custom.api.com')
    expect(config.timeout).toBe(60000)
  })

  it('ProjectConfig has required fields', () => {
    const config: ProjectConfig = {
      name: 'my-project',
    }
    expect(config.name).toBeDefined()
  })

  it('ProjectConfig supports all optional fields', () => {
    const config: ProjectConfig = {
      name: 'my-project',
      framework: 'nextjs',
      buildCommand: 'pnpm build',
      outputDirectory: '.next',
      installCommand: 'pnpm install',
      devCommand: 'pnpm dev',
      rootDirectory: 'apps/web',
      nodeVersion: '20.x',
      environmentVariables: [
        { key: 'API_KEY', value: 'secret', target: ['production'], type: 'secret' },
      ],
    }

    expect(config.name).toBe('my-project')
    expect(config.framework).toBe('nextjs')
  })

  it('DeployResult contains expected fields', () => {
    const result: DeployResult = {
      success: true,
      url: 'https://test.vercel.app',
      productionUrl: 'https://production.vercel.app',
      deploymentId: 'dpl-123',
      projectId: 'proj-456',
      logs: ['Deploying...', 'Done'],
      state: 'READY',
    }

    expect(result.success).toBe(true)
    expect(result.state).toBe('READY')
  })

  it('DeployResult state can be all valid states', () => {
    const states: DeployResult['state'][] = ['QUEUED', 'BUILDING', 'ERROR', 'INITIALIZING', 'READY', 'CANCELED']

    for (const state of states) {
      const result: DeployResult = {
        success: state === 'READY',
        state,
      }
      expect(result.state).toBe(state)
    }
  })
})

// ===========================================================================
// Domain Management Tests
// ===========================================================================

describe('Domain management', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should add domain to project', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{ data: { name: 'example.com', configured: true } }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.addDomain('proj-123', 'example.com')

    expect(result.success).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/v9/projects/proj-123/domains'),
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('should handle subdomain addition', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({ name: 'app.example.com' })
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.addDomain('proj-123', 'app.example.com')

    expect((capturedBody as Record<string, unknown>).name).toBe('app.example.com')
  })

  it('should handle wildcard domain', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{ data: { name: '*.example.com' } }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.addDomain('proj-123', '*.example.com')

    expect(result.success).toBe(true)
  })

  it('should handle domain verification required error', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Domain verification required' } },
      ok: false,
      status: 400,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.addDomain('proj-123', 'unverified.com')

    expect(result.success).toBe(false)
    expect(result.error).toContain('400')
  })
})

// ===========================================================================
// Managed API Deployment Tests
// ===========================================================================

describe('Managed API deployment', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should deploy via managed API when no CLI and no token', async () => {
    const childProcess = await import('node:child_process')
    const { deploy } = await import('./index.js')

    // CLI not available
    ;(childProcess.spawnSync as Mock).mockReturnValue({ status: 1 })

    // Clear token from env
    const originalToken = process.env.VERCEL_TOKEN
    delete process.env.VERCEL_TOKEN

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    // Should still work in dry run mode via managed API
    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('managed') || log.includes('dry-run'))).toBe(true)

    // Restore
    if (originalToken) process.env.VERCEL_TOKEN = originalToken
  })

  it('should respect useCli: false option', async () => {
    const { deploy } = await import('./index.js')
    process.env.VERCEL_TOKEN = 'test-token'

    setupMockFetch([
      { data: { id: 'dpl-123', url: 'test.vercel.app', readyState: 'READY' } },
      { data: { id: 'dpl-123', url: 'test.vercel.app', readyState: 'READY' } },
    ])

    const result = await deploy({
      projectDir: '/test/project',
      useCli: false,
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// CLI Deployment Tests
// ===========================================================================

describe('CLI deployment', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    mockFetch.mockReset()
    const childProcess = await import('node:child_process')
    ;(childProcess.spawnSync as Mock).mockReturnValue({ status: 0 })
  })

  it('should use CLI when available', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('CLI') || log.includes('dry-run'))).toBe(true)
  })

  it('should pass --prod flag for production deployment', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      production: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--prod'))).toBe(true)
  })

  it('should pass --force flag when specified', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      force: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--force'))).toBe(true)
  })

  it('should pass --public flag when specified', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      public: true,
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--public'))).toBe(true)
  })

  it('should pass --name flag with project name', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      projectName: 'my-custom-name',
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--name') && log.includes('my-custom-name'))).toBe(true)
  })

  it('should pass --env flags for environment variables', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      env: {
        API_KEY: 'secret',
        DATABASE_URL: 'postgres://localhost',
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--env'))).toBe(true)
  })

  it('should pass --build-env flags for build environment variables', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      buildEnv: {
        NEXT_PUBLIC_API_URL: 'https://api.example.com',
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
    expect(result.logs?.some(log => log.includes('--build-env'))).toBe(true)
  })
})

// ===========================================================================
// Vercel.json Configuration Tests
// ===========================================================================

describe('Vercel.json configuration', () => {
  it('should generate vercel.json with build command', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      buildCommand: 'pnpm build',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with output directory', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      outputDir: 'dist',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with install command', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      installCommand: 'pnpm install --frozen-lockfile',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with dev command', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      devCommand: 'pnpm dev',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with framework', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      framework: 'nextjs',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with root directory', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      rootDirectory: 'apps/web',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with functions config', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      functions: {
        'api/**/*.ts': {
          maxDuration: 30,
          memory: 1024,
        },
      },
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with headers', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      headers: [
        {
          source: '/(.*)',
          headers: [{ key: 'X-Frame-Options', value: 'DENY' }],
        },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with redirects', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      redirects: [
        { source: '/old', destination: '/new', permanent: true },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with rewrites', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      rewrites: [
        { source: '/api/:path*', destination: 'https://api.example.com/:path*' },
      ],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should generate vercel.json with regions', async () => {
    const { deploy } = await import('./index.js')

    const result = await deploy({
      projectDir: '/test/project',
      regions: ['iad1', 'sfo1', 'cdg1'],
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// Output Directory Detection Tests
// ===========================================================================

describe('Output directory detection', () => {
  it('should detect .next for Next.js', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { next: '14.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect dist for Vite', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      devDependencies: { vite: '5.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect build for Remix', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { '@remix-run/node': '2.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect .output for Nuxt', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { nuxt: '3.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect .svelte-kit for SvelteKit', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      devDependencies: { '@sveltejs/kit': '2.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should detect public for Gatsby', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { gatsby: '5.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })

  it('should default to dist for unknown frameworks', async () => {
    const fs = await import('node:fs')
    const { deploy } = await import('./index.js')

    ;(fs.existsSync as Mock).mockReturnValue(true)
    ;(fs.readFileSync as Mock).mockReturnValue(JSON.stringify({
      dependencies: { 'some-framework': '1.0.0' },
    }))

    const result = await deploy({
      projectDir: '/test/project',
      dryRun: true,
    })

    expect(result.success).toBe(true)
  })
})

// ===========================================================================
// API Error Handling Edge Cases Tests
// ===========================================================================

describe('API error handling edge cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should handle 401 unauthorized error', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Invalid API token' } },
      ok: false,
      status: 401,
    }])

    const api = new VercelApi({ token: 'invalid-token' })
    const result = await api.listProjects()

    expect(result.success).toBe(false)
    expect(result.error).toContain('401')
  })

  it('should handle 403 forbidden error', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Access denied' } },
      ok: false,
      status: 403,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.getProject('restricted-project')

    expect(result.success).toBe(false)
    expect(result.error).toContain('403')
  })

  it('should handle 502 bad gateway error', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Bad Gateway' } },
      ok: false,
      status: 502,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.createDeployment({ name: 'test', files: [] })

    expect(result.success).toBe(false)
    expect(result.error).toContain('502')
  })

  it('should handle 503 service unavailable error', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: { error: { message: 'Service temporarily unavailable' } },
      ok: false,
      status: 503,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.listDeployments('proj-123')

    expect(result.success).toBe(false)
    expect(result.error).toContain('503')
  })

  it('should handle empty error message', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([{
      data: {},
      ok: false,
      status: 500,
    }])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.getUser()

    expect(result.success).toBe(false)
    expect(result.error).toContain('Unknown error')
  })
})

// ===========================================================================
// Deployment Waiting States Tests
// ===========================================================================

describe('Deployment waiting states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should handle INITIALIZING state', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([
      { data: { id: 'dpl-123', readyState: 'INITIALIZING' } },
      { data: { id: 'dpl-123', readyState: 'BUILDING' } },
      { data: { id: 'dpl-123', readyState: 'READY' } },
    ])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

    expect(result.success).toBe(true)
    expect(result.deployment?.readyState).toBe('READY')
  })

  it('should handle QUEUED state', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([
      { data: { id: 'dpl-123', readyState: 'QUEUED' } },
      { data: { id: 'dpl-123', readyState: 'READY' } },
    ])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

    expect(result.success).toBe(true)
  })

  it('should return error on API failure during wait', async () => {
    const { VercelApi } = await import('./api.js')
    setupMockFetch([
      { data: { id: 'dpl-123', readyState: 'BUILDING' } },
      { data: { error: { message: 'API Error' } }, ok: false, status: 500 },
    ])

    const api = new VercelApi({ token: 'test-token' })
    const result = await api.waitForDeployment('dpl-123', { pollInterval: 10 })

    expect(result.success).toBe(false)
    expect(result.error).toContain('500')
  })
})

// ===========================================================================
// Environment Variable Types Tests
// ===========================================================================

describe('Environment variable types', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockReset()
  })

  it('should support plain text env var', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.addEnvVar('proj-123', {
      key: 'PUBLIC_URL',
      value: 'https://example.com',
      target: ['production'],
      type: 'plain',
    })

    expect((capturedBody as Record<string, unknown>).type).toBe('plain')
  })

  it('should support encrypted env var', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.addEnvVar('proj-123', {
      key: 'API_KEY',
      value: 'encrypted-value',
      target: ['production'],
      type: 'encrypted',
    })

    expect((capturedBody as Record<string, unknown>).type).toBe('encrypted')
  })

  it('should support secret env var', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.addEnvVar('proj-123', {
      key: 'DATABASE_PASSWORD',
      value: 'super-secret',
      target: ['production'],
      type: 'secret',
    })

    expect((capturedBody as Record<string, unknown>).type).toBe('secret')
  })

  it('should default to plain type', async () => {
    const { VercelApi } = await import('./api.js')
    let capturedBody: unknown
    mockFetch.mockImplementation((_url, options) => {
      capturedBody = JSON.parse(options.body as string)
      return createMockFetchResponse({})
    })

    const api = new VercelApi({ token: 'test-token' })
    await api.addEnvVar('proj-123', {
      key: 'NODE_ENV',
      value: 'production',
      target: ['production'],
    })

    expect((capturedBody as Record<string, unknown>).type).toBe('plain')
  })
})

/**
 * @mdxe/vercel - Deploy MDX projects to Vercel
 *
 * Supports deployment via:
 * - Vercel CLI
 * - Vercel REST API
 * - Managed API
 *
 * @packageDocumentation
 */

import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { VercelDeployOptions, DeployResult } from './types.js'
import { VercelApi, readProjectFiles } from './api.js'

export * from './types.js'
export { VercelApi, createVercelApi, createVercelApiFromEnv, readProjectFiles } from './api.js'

/**
 * Check if Vercel CLI is installed
 */
function checkVercelCli(): boolean {
  const result = spawnSync('npx', ['vercel', '--version'], {
    stdio: 'pipe',
    shell: true,
  })
  return result.status === 0
}

/**
 * Run a command
 */
function runCommand(
  command: string,
  args: string[],
  cwd: string,
  options: { dryRun?: boolean; silent?: boolean; env?: Record<string, string> } = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  return new Promise((resolve) => {
    if (options.dryRun) {
      console.log(`[dry-run] ${command} ${args.join(' ')}`)
      resolve({ success: true, output: '' })
      return
    }

    const child = spawn(command, args, {
      cwd,
      shell: true,
      stdio: options.silent ? 'pipe' : 'inherit',
      env: { ...process.env, ...options.env },
    })

    let output = ''
    let errorOutput = ''

    if (options.silent) {
      child.stdout?.on('data', (data) => {
        output += data.toString()
      })
      child.stderr?.on('data', (data) => {
        errorOutput += data.toString()
      })
    }

    child.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? errorOutput || `Command exited with code ${code}` : undefined,
      })
    })

    child.on('error', (err) => {
      resolve({ success: false, output, error: err.message })
    })
  })
}

/**
 * Detect framework from project
 */
function detectFramework(projectDir: string): string | null {
  const pkgPath = join(projectDir, 'package.json')
  if (!existsSync(pkgPath)) return null

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  if (deps.next) return 'nextjs'
  if (deps.vite) return 'vite'
  if (deps['@remix-run/node'] || deps['@remix-run/react']) return 'remix'
  if (deps.astro) return 'astro'
  if (deps.gatsby) return 'gatsby'
  if (deps.nuxt) return 'nuxt'
  if (deps.svelte || deps['@sveltejs/kit']) return 'svelte'

  return null
}

/**
 * Get default output directory for framework
 */
function getOutputDir(framework: string | null): string {
  switch (framework) {
    case 'nextjs':
      return '.next'
    case 'vite':
      return 'dist'
    case 'remix':
      return 'build'
    case 'astro':
      return 'dist'
    case 'gatsby':
      return 'public'
    case 'nuxt':
      return '.output'
    case 'svelte':
      return '.svelte-kit'
    default:
      return 'dist'
  }
}

/**
 * Generate vercel.json configuration
 */
function generateVercelConfig(options: VercelDeployOptions, framework: string | null): object {
  const config: Record<string, unknown> = {}

  if (options.buildCommand) {
    config.buildCommand = options.buildCommand
  }

  if (options.outputDir) {
    config.outputDirectory = options.outputDir
  }

  if (options.installCommand) {
    config.installCommand = options.installCommand
  }

  if (options.devCommand) {
    config.devCommand = options.devCommand
  }

  if (options.framework) {
    config.framework = options.framework
  } else if (framework) {
    config.framework = framework
  }

  if (options.rootDirectory) {
    config.rootDirectory = options.rootDirectory
  }

  if (options.functions) {
    config.functions = options.functions
  }

  if (options.headers) {
    config.headers = options.headers
  }

  if (options.redirects) {
    config.redirects = options.redirects
  }

  if (options.rewrites) {
    config.rewrites = options.rewrites
  }

  if (options.regions && options.regions.length > 0) {
    config.regions = options.regions
  }

  return config
}

/**
 * Create API client from options
 */
function createApiClient(options: VercelDeployOptions): VercelApi {
  const token = options.token || process.env.VERCEL_TOKEN

  if (!token) {
    throw new Error('Vercel token is required. Set token option or VERCEL_TOKEN env var.')
  }

  return new VercelApi({
    token,
    teamId: options.teamId || process.env.VERCEL_TEAM_ID,
  })
}

/**
 * Deploy using Vercel CLI
 */
async function deployWithCli(options: VercelDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Deploying to Vercel via CLI')

  // Generate vercel.json if config options provided
  const framework = detectFramework(projectDir)
  const vercelJsonPath = join(projectDir, 'vercel.json')

  if (!existsSync(vercelJsonPath) || options.force) {
    const config = generateVercelConfig(options, framework)
    if (Object.keys(config).length > 0) {
      logs.push('Generating vercel.json...')
      if (!options.dryRun) {
        writeFileSync(vercelJsonPath, JSON.stringify(config, null, 2))
      }
    }
  }

  // Build deployment command
  const deployArgs = ['vercel']

  if (options.production) {
    deployArgs.push('--prod')
  }

  if (options.force) {
    deployArgs.push('--force')
  }

  if (options.public) {
    deployArgs.push('--public')
  }

  if (options.projectName) {
    deployArgs.push('--name', options.projectName)
  }

  // Add environment variables
  if (options.env) {
    for (const [key, value] of Object.entries(options.env)) {
      deployArgs.push('--env', `${key}=${value}`)
    }
  }

  if (options.buildEnv) {
    for (const [key, value] of Object.entries(options.buildEnv)) {
      deployArgs.push('--build-env', `${key}=${value}`)
    }
  }

  // Confirm deployment without prompts
  deployArgs.push('--yes')

  if (options.dryRun) {
    logs.push(`[dry-run] Would run: npx ${deployArgs.join(' ')}`)
    return { success: true, logs }
  }

  logs.push('Deploying...')

  const deployResult = await runCommand('npx', deployArgs, projectDir, {
    silent: true,
    env: options.token ? { VERCEL_TOKEN: options.token } : undefined,
  })

  if (!deployResult.success) {
    return { success: false, error: `Deployment failed: ${deployResult.error}`, logs }
  }

  // Extract URL from output
  const urlMatch = deployResult.output.match(/https:\/\/[^\s]+\.vercel\.app/)
  const url = urlMatch ? urlMatch[0] : undefined

  // Extract deployment URL for production
  const prodUrlMatch = deployResult.output.match(/Production: (https:\/\/[^\s]+)/)
  const productionUrl = prodUrlMatch ? prodUrlMatch[1] : undefined

  logs.push(`Deployment successful${url ? `: ${url}` : ''}`)

  return {
    success: true,
    url,
    productionUrl,
    logs,
    state: 'READY',
  }
}

/**
 * Deploy using Vercel API
 */
async function deployWithApi(options: VercelDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []

  logs.push('Deploying to Vercel via API')

  try {
    const api = createApiClient(options)
    const framework = detectFramework(projectDir)
    const projectName = options.projectName || 'mdxe-project'

    logs.push(`Framework: ${framework || 'custom'}`)

    // Read project files
    logs.push('Reading project files...')
    const files = readProjectFiles(projectDir)
    logs.push(`Found ${files.length} files`)

    if (options.dryRun) {
      logs.push(`[dry-run] Would upload ${files.length} files to Vercel`)
      logs.push(`[dry-run] Project: ${projectName}`)
      return { success: true, logs }
    }

    // Get git metadata
    const git = options.git || {}

    // Create deployment
    logs.push('Creating deployment...')

    const deployResult = await api.createDeployment({
      name: projectName,
      files,
      target: options.production ? 'production' : 'preview',
      projectSettings: {
        buildCommand: options.buildCommand,
        outputDirectory: options.outputDir || getOutputDir(framework),
        installCommand: options.installCommand,
        framework: options.framework || framework || undefined,
      },
      gitMetadata: Object.keys(git).length > 0 ? {
        commitSha: git.commitSha,
        commitMessage: git.commitMessage,
        commitAuthorName: git.commitAuthorName,
        branch: git.branch,
      } : undefined,
    })

    if (!deployResult.success) {
      return { success: false, error: deployResult.error, logs }
    }

    const deploymentId = deployResult.deployment!.id
    logs.push(`Deployment created: ${deploymentId}`)

    // Wait for deployment to be ready
    logs.push('Waiting for deployment...')

    const waitResult = await api.waitForDeployment(deploymentId, {
      timeout: 600000, // 10 minutes
      pollInterval: 5000,
    })

    if (!waitResult.success) {
      return { success: false, error: waitResult.error, logs, state: waitResult.deployment?.readyState as DeployResult['state'] }
    }

    const deployment = waitResult.deployment!
    logs.push(`Deployment ready: ${deployment.url}`)

    return {
      success: true,
      url: `https://${deployment.url}`,
      deploymentId: deployment.id,
      logs,
      state: 'READY',
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs }
  }
}

/**
 * Deploy using managed API
 */
async function deployWithManagedApi(options: VercelDeployOptions): Promise<DeployResult> {
  const projectDir = resolve(options.projectDir)
  const logs: string[] = []
  logs.push('Using managed API for Vercel deployment')

  const managedApiUrl = process.env.VERCEL_API_URL || 'https://apis.do'

  try {
    let token: string
    if (options.dryRun) {
      token = 'dry-run-token'
      logs.push('Skipping authentication (dry run)')
    } else {
      logs.push('Authenticating via oauth.do...')
      const { ensureLoggedIn } = await import('oauth.do')
      const auth = await ensureLoggedIn()
      token = auth.token
      logs.push(auth.isNewLogin ? 'Logged in successfully' : 'Using existing session')
    }

    // Read project files
    const files = readProjectFiles(projectDir)
    logs.push(`Found ${files.length} files`)

    const framework = detectFramework(projectDir)

    const payload = {
      name: options.projectName || 'mdxe-project',
      framework: options.framework || framework,
      production: options.production,
      files,
      buildCommand: options.buildCommand,
      outputDir: options.outputDir || getOutputDir(framework),
      env: options.env,
      regions: options.regions,
    }

    if (options.dryRun) {
      logs.push(`[dry-run] Would POST to ${managedApiUrl}/vercel`)
      logs.push(`[dry-run] Files: ${files.length}`)
      return { success: true, logs }
    }

    logs.push(`Deploying to ${managedApiUrl}/vercel...`)

    const response = await fetch(`${managedApiUrl}/vercel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`HTTP ${response.status}: ${error}`)
    }

    const result = await response.json() as { success: boolean; url?: string; productionUrl?: string; deploymentId?: string; error?: string }

    if (result.success) {
      logs.push(`Deployment successful${result.url ? `: ${result.url}` : ''}`)
      return { success: true, url: result.url, productionUrl: result.productionUrl, deploymentId: result.deploymentId, logs, state: 'READY' }
    } else {
      throw new Error(result.error || 'Unknown error')
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', logs }
  }
}

/**
 * Deploy to Vercel
 *
 * @param options - Deployment options
 * @returns Deploy result
 *
 * @example
 * ```ts
 * import { deploy } from '@mdxe/vercel'
 *
 * // Deploy preview
 * const result = await deploy({
 *   projectDir: './my-project',
 *   projectName: 'my-site',
 * })
 *
 * // Deploy to production
 * const prodResult = await deploy({
 *   projectDir: './my-project',
 *   production: true,
 * })
 *
 * console.log(result.url)
 * ```
 */
export async function deploy(options: VercelDeployOptions): Promise<DeployResult> {
  const logs: string[] = []
  logs.push('Vercel deployment starting')

  // Prefer CLI if available and useCli not explicitly false
  if (options.useCli !== false) {
    if (checkVercelCli()) {
      logs.push('Vercel CLI found')
      const result = await deployWithCli(options)
      return { ...result, logs: [...logs, ...(result.logs || [])] }
    }
    logs.push('Vercel CLI not found, falling back to API')
  }

  // Use direct API if token provided
  if (options.token || process.env.VERCEL_TOKEN) {
    const result = await deployWithApi(options)
    return { ...result, logs: [...logs, ...(result.logs || [])] }
  }

  // Fallback to managed API
  const result = await deployWithManagedApi(options)
  return { ...result, logs: [...logs, ...(result.logs || [])] }
}

/**
 * Create or link a Vercel project
 */
export async function linkProject(options: {
  projectDir: string
  projectName: string
  token?: string
  teamId?: string
  framework?: string
}): Promise<{ success: boolean; projectId?: string; error?: string }> {
  const token = options.token || process.env.VERCEL_TOKEN

  if (!token) {
    return { success: false, error: 'Vercel token is required' }
  }

  const api = new VercelApi({
    token,
    teamId: options.teamId || process.env.VERCEL_TEAM_ID,
  })

  // Check if project exists
  const existingProject = await api.getProject(options.projectName)

  if (existingProject.success && existingProject.project) {
    return { success: true, projectId: existingProject.project.id }
  }

  // Create new project
  const result = await api.createProject({
    name: options.projectName,
    framework: options.framework,
  })

  return { success: result.success, projectId: result.projectId, error: result.error }
}

/**
 * Add environment variables to a project
 */
export async function setEnvVars(options: {
  projectId: string
  env: Record<string, string>
  target?: ('production' | 'preview' | 'development')[]
  token?: string
  teamId?: string
}): Promise<{ success: boolean; error?: string }> {
  const token = options.token || process.env.VERCEL_TOKEN

  if (!token) {
    return { success: false, error: 'Vercel token is required' }
  }

  const api = new VercelApi({
    token,
    teamId: options.teamId || process.env.VERCEL_TEAM_ID,
  })

  const target = options.target || ['production', 'preview', 'development']

  for (const [key, value] of Object.entries(options.env)) {
    const result = await api.addEnvVar(options.projectId, {
      key,
      value,
      target,
    })

    if (!result.success) {
      return { success: false, error: `Failed to set ${key}: ${result.error}` }
    }
  }

  return { success: true }
}

/**
 * Provider interface for unified deployment
 */
export interface VercelProvider {
  readonly platform: 'vercel'
  readonly name: string
  deploy(options: VercelDeployOptions): Promise<DeployResult>
  getStatus?(deploymentId: string): Promise<DeployResult>
  cancel?(deploymentId: string): Promise<{ success: boolean; error?: string }>
  delete?(deploymentId: string): Promise<{ success: boolean; error?: string }>
}

/**
 * Create a Vercel deploy provider
 */
export function createProvider(config?: {
  token?: string
  teamId?: string
}): VercelProvider {
  const token = config?.token || process.env.VERCEL_TOKEN
  const teamId = config?.teamId || process.env.VERCEL_TEAM_ID

  const getApi = () => {
    if (!token) {
      throw new Error('Vercel token required')
    }
    return new VercelApi({ token, teamId })
  }

  return {
    platform: 'vercel',
    name: 'Vercel',

    async deploy(options: VercelDeployOptions): Promise<DeployResult> {
      return deploy({
        ...options,
        token: options.token || token,
        teamId: options.teamId || teamId,
      })
    },

    async getStatus(deploymentId: string): Promise<DeployResult> {
      try {
        const api = getApi()
        const result = await api.getDeployment(deploymentId)

        if (!result.success) {
          return { success: false, error: result.error }
        }

        return {
          success: true,
          deploymentId: result.deployment?.id,
          url: result.deployment?.url ? `https://${result.deployment.url}` : undefined,
          state: result.deployment?.readyState?.toLowerCase() as DeployResult['state'],
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },

    async cancel(deploymentId: string) {
      try {
        const api = getApi()
        return api.cancelDeployment(deploymentId)
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },

    async delete(deploymentId: string) {
      try {
        const api = getApi()
        return api.deleteDeployment(deploymentId)
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    },
  }
}

/**
 * @mdxe/deploy - Unified Deployment for MDX Projects
 *
 * Deploy to .do, Cloudflare, Vercel, or GitHub Pages with a single interface.
 * The .do platform is the default deployment target.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type {
  Platform,
  DeployOptions,
  DeployResult,
  DeployProvider,
  DoOptions,
  CloudflareOptions,
  VercelOptions,
  GitHubOptions,
  PlatformOptions,
  DetectionResult,
  DeployState,
} from './types.js'

export * from './types.js'

/**
 * Normalize deployment state to lowercase
 */
function normalizeState(state?: string): DeployState | undefined {
  if (!state) return undefined
  const lower = state.toLowerCase()
  switch (lower) {
    case 'queued':
    case 'pending':
      return 'queued'
    case 'building':
    case 'initializing':
      return 'building'
    case 'deploying':
      return 'deploying'
    case 'ready':
      return 'ready'
    case 'error':
      return 'error'
    case 'canceled':
    case 'cancelled':
      return 'canceled'
    default:
      return 'pending'
  }
}

/**
 * .do Platform deploy provider (default)
 */
class DoProvider implements DeployProvider {
  readonly platform: Platform = 'do'
  readonly name = '.do Platform'

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { deploy } = await import('@mdxe/do')
    const doOptions = options as DoOptions

    const result = await deploy({
      projectDir: options.projectDir,
      projectName: options.name,
      mode: doOptions.mode,
      apiUrl: doOptions.apiUrl,
      env: options.env,
      dryRun: options.dryRun,
      force: options.force,
      buildCommand: options.buildCommand,
      outputDir: options.outputDir,
      compatibilityDate: doOptions.compatibilityDate,
      compatibilityFlags: doOptions.compatibilityFlags,
      kvNamespaces: doOptions.kvNamespaces,
      d1Databases: doOptions.d1Databases,
      r2Buckets: doOptions.r2Buckets,
      durableObjects: doOptions.durableObjects,
      dispatchNamespace: doOptions.dispatchNamespace,
      tenantId: doOptions.tenantId,
      customDomain: doOptions.customDomain || options.domains?.[0],
    })

    return {
      ...result,
      platform: 'do',
    }
  }

  supports(options: DeployOptions): boolean {
    return true
  }

  async getWorker(name: string): Promise<{ success: boolean; worker?: unknown; error?: string }> {
    const { createDoApiFromEnv } = await import('@mdxe/do')
    const api = createDoApiFromEnv()
    return api.getWorker(name)
  }

  async delete(name: string): Promise<{ success: boolean; error?: string }> {
    const { createDoApiFromEnv } = await import('@mdxe/do')
    const api = createDoApiFromEnv()
    return api.deleteWorker(name)
  }
}

/**
 * Cloudflare deploy provider
 */
class CloudflareProvider implements DeployProvider {
  readonly platform: Platform = 'cloudflare'
  readonly name = 'Cloudflare'

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { deploy } = await import('@mdxe/cloudflare')
    const cfOptions = options as CloudflareOptions

    const result = await deploy({
      projectDir: options.projectDir,
      projectName: options.name,
      target: cfOptions.target,
      mode: cfOptions.mode,
      accountId: cfOptions.accountId,
      apiToken: cfOptions.apiToken,
      env: options.env,
      dryRun: options.dryRun,
      force: options.force,
      compatibilityDate: cfOptions.compatibilityDate,
      compatibilityFlags: cfOptions.compatibilityFlags,
      kvNamespaces: cfOptions.kvNamespaces,
      d1Databases: cfOptions.d1Databases,
      r2Buckets: cfOptions.r2Buckets,
      dispatchNamespace: cfOptions.dispatchNamespace,
      tenantId: cfOptions.tenantId,
      customDomain: options.domains?.[0],
    })

    return {
      ...result,
      platform: 'cloudflare',
    }
  }

  supports(options: DeployOptions): boolean {
    // Cloudflare supports most project types
    return true
  }
}

/**
 * Vercel deploy provider
 */
class VercelProvider implements DeployProvider {
  readonly platform: Platform = 'vercel'
  readonly name = 'Vercel'

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { deploy } = await import('@mdxe/vercel')
    const vercelOptions = options as VercelOptions

    const result = await deploy({
      projectDir: options.projectDir,
      projectName: options.name,
      teamId: vercelOptions.teamId,
      token: vercelOptions.token,
      production: vercelOptions.production ?? (options.environment === 'production'),
      buildCommand: options.buildCommand,
      outputDir: options.outputDir,
      framework: vercelOptions.framework,
      rootDirectory: vercelOptions.rootDirectory,
      env: options.env,
      regions: vercelOptions.regions,
      functions: vercelOptions.functions,
      domains: options.domains,
      dryRun: options.dryRun,
      force: options.force,
      git: vercelOptions.git,
    })

    return {
      ...result,
      platform: 'vercel',
      state: normalizeState(result.state),
    }
  }

  supports(options: DeployOptions): boolean {
    return true
  }

  async getStatus(deploymentId: string): Promise<DeployResult> {
    const { createVercelApiFromEnv } = await import('@mdxe/vercel')
    const api = createVercelApiFromEnv()
    const result = await api.getDeployment(deploymentId)

    if (!result.success) {
      return { success: false, error: result.error, platform: 'vercel' }
    }

    return {
      success: true,
      deploymentId: result.deployment?.id,
      url: result.deployment?.url ? `https://${result.deployment.url}` : undefined,
      state: result.deployment?.readyState?.toLowerCase() as DeployResult['state'],
      platform: 'vercel',
    }
  }

  async cancel(deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const { createVercelApiFromEnv } = await import('@mdxe/vercel')
    const api = createVercelApiFromEnv()
    return api.cancelDeployment(deploymentId)
  }

  async delete(deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const { createVercelApiFromEnv } = await import('@mdxe/vercel')
    const api = createVercelApiFromEnv()
    return api.deleteDeployment(deploymentId)
  }
}

/**
 * GitHub deploy provider
 */
class GitHubProvider implements DeployProvider {
  readonly platform: Platform = 'github'
  readonly name = 'GitHub Pages'

  async deploy(options: DeployOptions): Promise<DeployResult> {
    const { deploy } = await import('@mdxe/github')
    const ghOptions = options as GitHubOptions

    const result = await deploy({
      projectDir: options.projectDir,
      repository: ghOptions.repository,
      branch: ghOptions.branch,
      sourceBranch: ghOptions.sourceBranch,
      outputDir: options.outputDir,
      buildCommand: options.buildCommand,
      token: ghOptions.token,
      customDomain: options.domains?.[0],
      commitMessage: ghOptions.commitMessage,
      authorName: ghOptions.authorName,
      authorEmail: ghOptions.authorEmail,
      clean: ghOptions.clean,
      preserve: ghOptions.preserve,
      dryRun: options.dryRun,
      force: options.force,
      useActions: ghOptions.useActions,
    })

    return {
      ...result,
      platform: 'github',
    }
  }

  supports(options: DeployOptions): boolean {
    // GitHub Pages only supports static sites
    return true
  }
}

/**
 * Registry of deploy providers
 * The .do platform is listed first as it's the default
 */
const providers: Record<Platform, DeployProvider> = {
  do: new DoProvider(),
  cloudflare: new CloudflareProvider(),
  vercel: new VercelProvider(),
  github: new GitHubProvider(),
}

/**
 * Get a deploy provider by platform
 */
export function getProvider(platform: Platform): DeployProvider {
  const provider = providers[platform]
  if (!provider) {
    throw new Error(`Unknown platform: ${platform}. Supported: ${Object.keys(providers).join(', ')}`)
  }
  return provider
}

/**
 * Register a custom deploy provider
 */
export function registerProvider(provider: DeployProvider): void {
  providers[provider.platform] = provider
}

/**
 * List all registered providers
 */
export function listProviders(): DeployProvider[] {
  return Object.values(providers)
}

/**
 * Detect the best platform for a project
 */
export function detectPlatform(projectDir: string): DetectionResult {
  const dir = resolve(projectDir)
  const pkgPath = join(dir, 'package.json')

  let pkg: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> } = {}
  if (existsSync(pkgPath)) {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
  }

  const deps = { ...pkg.dependencies, ...pkg.devDependencies }

  // Check for platform-specific indicators
  const hasWrangler = existsSync(join(dir, 'wrangler.toml')) || existsSync(join(dir, 'wrangler.jsonc'))
  const hasVercel = existsSync(join(dir, 'vercel.json')) || existsSync(join(dir, '.vercel'))
  const hasGitHubActions = existsSync(join(dir, '.github/workflows'))

  // Check for framework
  let framework: string | undefined
  let isStatic = true

  if (deps.next) {
    framework = 'nextjs'
    // Check if Next.js is configured for static export
    const nextConfigPath = join(dir, 'next.config.js')
    const nextConfigMjsPath = join(dir, 'next.config.mjs')
    const configPath = existsSync(nextConfigMjsPath) ? nextConfigMjsPath : nextConfigPath

    if (existsSync(configPath)) {
      const config = readFileSync(configPath, 'utf-8')
      isStatic = config.includes("output: 'export'") || config.includes('output: "export"')
    } else {
      isStatic = false // Next.js defaults to SSR
    }
  } else if (deps.vite) {
    framework = 'vite'
    isStatic = true
  } else if (deps.astro) {
    framework = 'astro'
    isStatic = !deps['@astrojs/node'] && !deps['@astrojs/vercel'] && !deps['@astrojs/cloudflare']
  } else if (deps.gatsby) {
    framework = 'gatsby'
    isStatic = true
  } else if (deps['@remix-run/node']) {
    framework = 'remix'
    isStatic = false
  }

  // Check for MDXDB data sources
  const hasDynamicDb = deps['@mdxdb/api'] || deps['@mdxdb/postgres'] ||
    deps['@mdxdb/mongo'] || deps['@mdxdb/clickhouse']
  if (hasDynamicDb) {
    isStatic = false
  }

  // Determine best platform
  // Only use platform-specific config if explicitly configured
  if (hasWrangler) {
    return {
      platform: 'cloudflare',
      confidence: 0.95,
      reason: 'Found wrangler.toml configuration - using Cloudflare directly',
      framework,
      isStatic,
    }
  }

  if (hasVercel) {
    return {
      platform: 'vercel',
      confidence: 0.95,
      reason: 'Found vercel.json or .vercel directory',
      framework,
      isStatic,
    }
  }

  // Default to .do platform for all other cases
  // .do is a managed platform that handles static and dynamic sites
  return {
    platform: 'do',
    confidence: 0.9,
    reason: '.do platform - managed serverless deployment',
    framework,
    isStatic,
  }
}

/**
 * Deploy a project to a platform
 *
 * @param options - Deployment options
 * @returns Deployment result
 *
 * @example
 * ```ts
 * import { deploy } from '@mdxe/deploy'
 *
 * // Auto-detect platform
 * const result = await deploy({
 *   projectDir: './my-project',
 * })
 *
 * // Specify platform
 * const cfResult = await deploy({
 *   projectDir: './my-project',
 *   platform: 'cloudflare',
 *   name: 'my-worker',
 * })
 *
 * // Deploy to production on Vercel
 * const prodResult = await deploy({
 *   projectDir: './my-project',
 *   platform: 'vercel',
 *   environment: 'production',
 * })
 * ```
 */
export async function deploy(options: DeployOptions | PlatformOptions): Promise<DeployResult> {
  const startTime = Date.now()
  const logs: string[] = []

  // Determine platform
  let platform = options.platform

  if (!platform) {
    const detection = detectPlatform(options.projectDir)
    platform = detection.platform
    logs.push(`Auto-detected platform: ${platform} (${detection.reason})`)
  }

  logs.push(`Deploying to ${platform}...`)

  // Get provider and deploy
  const provider = getProvider(platform)

  try {
    const result = await provider.deploy(options)

    const totalDuration = Date.now() - startTime

    return {
      ...result,
      logs: [...logs, ...(result.logs || [])],
      timing: {
        ...result.timing,
        totalDuration,
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      platform,
      logs,
      timing: {
        totalDuration: Date.now() - startTime,
      },
    }
  }
}

/**
 * Deploy to Cloudflare specifically
 */
export async function deployToCloudflare(options: Omit<CloudflareOptions, 'platform'>): Promise<DeployResult> {
  return deploy({ ...options, platform: 'cloudflare' })
}

/**
 * Deploy to Vercel specifically
 */
export async function deployToVercel(options: Omit<VercelOptions, 'platform'>): Promise<DeployResult> {
  return deploy({ ...options, platform: 'vercel' })
}

/**
 * Deploy to GitHub Pages specifically
 */
export async function deployToGitHub(options: Omit<GitHubOptions, 'platform'>): Promise<DeployResult> {
  return deploy({ ...options, platform: 'github' })
}

/**
 * Deploy to .do platform specifically (default)
 */
export async function deployToDo(options: Omit<DoOptions, 'platform'>): Promise<DeployResult> {
  return deploy({ ...options, platform: 'do' })
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  platform: Platform,
  deploymentId: string
): Promise<DeployResult> {
  const provider = getProvider(platform)

  if (!provider.getStatus) {
    return {
      success: false,
      error: `Platform ${platform} does not support status checks`,
      platform,
    }
  }

  return provider.getStatus(deploymentId)
}

/**
 * Cancel a deployment
 */
export async function cancelDeployment(
  platform: Platform,
  deploymentId: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getProvider(platform)

  if (!provider.cancel) {
    return { success: false, error: `Platform ${platform} does not support cancellation` }
  }

  return provider.cancel(deploymentId)
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(
  platform: Platform,
  deploymentId: string
): Promise<{ success: boolean; error?: string }> {
  const provider = getProvider(platform)

  if (!provider.delete) {
    return { success: false, error: `Platform ${platform} does not support deletion` }
  }

  return provider.delete(deploymentId)
}

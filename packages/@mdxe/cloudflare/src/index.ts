/**
 * @mdxe/cloudflare - Deploy MDX projects to Cloudflare
 *
 * Supports deployment to:
 * - Cloudflare Workers (static assets, OpenNext SSR, Workers for Platforms)
 * - Cloudflare Pages (static sites, branch deployments)
 *
 * @packageDocumentation
 */

export * from './types.js'
export { CloudflareApi, createCloudflareApi, createCloudflareApiFromEnv } from './api.js'
export { deployToWorkers, detectSourceType } from './workers.js'
export { deployToPages, detectOutputDir } from './pages.js'

import type { CloudflareDeployOptions, DeployResult } from './types.js'
import { deployToWorkers, detectSourceType } from './workers.js'
import { deployToPages } from './pages.js'
import { CloudflareApi } from './api.js'

/**
 * Deploy to Cloudflare (auto-detect Workers or Pages)
 *
 * @param options - Deployment options
 * @returns Deploy result
 *
 * @example
 * ```ts
 * import { deploy } from '@mdxe/cloudflare'
 *
 * // Auto-detect best target
 * const result = await deploy({
 *   projectDir: './my-project',
 *   projectName: 'my-site',
 * })
 *
 * // Explicitly deploy to Workers
 * const workersResult = await deploy({
 *   projectDir: './my-project',
 *   target: 'workers',
 * })
 *
 * // Explicitly deploy to Pages
 * const pagesResult = await deploy({
 *   projectDir: './my-project',
 *   target: 'pages',
 * })
 * ```
 */
export async function deploy(options: CloudflareDeployOptions): Promise<DeployResult> {
  const startTime = Date.now()
  const logs: string[] = []
  logs.push('Cloudflare deployment starting')

  // Determine target
  let target = options.target

  if (!target) {
    // Auto-detect based on project type
    const sourceType = detectSourceType(options.projectDir)
    logs.push(`Detected adapter: ${sourceType.adapter || 'unknown'}`)

    // Use Workers for dynamic content (OpenNext), Pages for static
    if (sourceType.isStatic) {
      target = 'pages'
      logs.push('Auto-selected: Cloudflare Pages (static content)')
    } else {
      target = 'workers'
      logs.push('Auto-selected: Cloudflare Workers (dynamic content/SSR)')
    }
  }

  let result: DeployResult
  if (target === 'pages') {
    result = await deployToPages({
      ...options,
      target: 'pages',
    })
  } else {
    result = await deployToWorkers({
      ...options,
      target: 'workers',
    })
  }

  return {
    ...result,
    logs: [...logs, ...(result.logs || [])],
  }
}

/**
 * Provider interface for unified deployment
 */
export interface CloudflareProvider {
  readonly platform: 'cloudflare'
  readonly name: string
  deploy(options: CloudflareDeployOptions): Promise<DeployResult>
  getWorker?(scriptName: string): Promise<{ success: boolean; script?: unknown; error?: string }>
  deleteWorker?(scriptName: string): Promise<{ success: boolean; error?: string }>
}

/**
 * Create a Cloudflare deploy provider
 */
export function createProvider(config?: {
  accountId?: string
  apiToken?: string
}): CloudflareProvider {
  const accountId = config?.accountId || process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = config?.apiToken || process.env.CLOUDFLARE_API_TOKEN

  return {
    platform: 'cloudflare',
    name: 'Cloudflare',

    async deploy(options: CloudflareDeployOptions): Promise<DeployResult> {
      return deploy({
        ...options,
        accountId: options.accountId || accountId,
        apiToken: options.apiToken || apiToken,
      })
    },

    async getWorker(scriptName: string) {
      if (!accountId || !apiToken) {
        return { success: false, error: 'Account ID and API token required' }
      }
      const api = new CloudflareApi({ accountId, apiToken })
      return api.getWorker(scriptName)
    },

    async deleteWorker(scriptName: string) {
      if (!accountId || !apiToken) {
        return { success: false, error: 'Account ID and API token required' }
      }
      const api = new CloudflareApi({ accountId, apiToken })
      return api.deleteWorker(scriptName)
    },
  }
}

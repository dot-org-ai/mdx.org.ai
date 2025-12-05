/**
 * @mdxe/vercel - Vercel REST API Client
 *
 * Provides direct access to Vercel's REST API for deployments
 *
 * @packageDocumentation
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { VercelApiConfig, ProjectConfig, DeploymentInfo } from './types.js'

/**
 * Vercel REST API Client
 */
export class VercelApi {
  private config: Required<VercelApiConfig>

  constructor(config: VercelApiConfig) {
    this.config = {
      token: config.token,
      teamId: config.teamId || '',
      baseUrl: config.baseUrl || 'https://api.vercel.com',
      timeout: config.timeout || 60000,
    }
  }

  /**
   * Build query string with team ID
   */
  private buildQuery(params: Record<string, string> = {}): string {
    if (this.config.teamId) {
      params.teamId = this.config.teamId
    }

    const query = new URLSearchParams(params).toString()
    return query ? `?${query}` : ''
  }

  /**
   * Make an authenticated request to the Vercel API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>
  ): Promise<{ success: boolean; result?: T; error?: string }> {
    const query = this.buildQuery(params)
    const url = `${this.config.baseUrl}${path}${query}`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.config.token}`,
      }

      // Don't set Content-Type for multipart (let fetch set boundary)
      if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } })) as { error?: { message?: string } }
        return { success: false, error: `HTTP ${response.status}: ${error?.error?.message || 'Unknown error'}` }
      }

      const data = await response.json()
      return { success: true, result: data as T }
    } catch (error) {
      clearTimeout(timeoutId)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get current user info
   */
  async getUser(): Promise<{ success: boolean; user?: { uid: string; username: string; email: string }; error?: string }> {
    const response = await this.request<{ user: { uid: string; username: string; email: string } }>('GET', '/v2/user')
    return { success: response.success, user: response.result?.user, error: response.error }
  }

  /**
   * List projects
   */
  async listProjects(): Promise<{ success: boolean; projects?: Array<{ id: string; name: string }>; error?: string }> {
    const response = await this.request<{ projects: Array<{ id: string; name: string }> }>('GET', '/v9/projects')
    return { success: response.success, projects: response.result?.projects, error: response.error }
  }

  /**
   * Get project by name or ID
   */
  async getProject(nameOrId: string): Promise<{ success: boolean; project?: ProjectConfig & { id: string }; error?: string }> {
    const response = await this.request<ProjectConfig & { id: string }>('GET', `/v9/projects/${nameOrId}`)
    return { success: response.success, project: response.result, error: response.error }
  }

  /**
   * Create a new project
   */
  async createProject(config: ProjectConfig): Promise<{ success: boolean; projectId?: string; error?: string }> {
    const response = await this.request<{ id: string }>('POST', '/v9/projects', {
      name: config.name,
      framework: config.framework,
      buildCommand: config.buildCommand,
      outputDirectory: config.outputDirectory,
      installCommand: config.installCommand,
      devCommand: config.devCommand,
      rootDirectory: config.rootDirectory,
      nodeVersion: config.nodeVersion,
    })

    return { success: response.success, projectId: response.result?.id, error: response.error }
  }

  /**
   * Create a deployment
   */
  async createDeployment(options: {
    name: string
    files: Array<{ file: string; data: string; encoding?: 'base64' | 'utf-8' }>
    target?: 'production' | 'preview'
    projectSettings?: {
      buildCommand?: string
      outputDirectory?: string
      installCommand?: string
      framework?: string
    }
    gitMetadata?: {
      commitSha?: string
      commitMessage?: string
      commitAuthorName?: string
      remoteUrl?: string
      branch?: string
    }
  }): Promise<{ success: boolean; deployment?: DeploymentInfo; error?: string }> {
    const response = await this.request<DeploymentInfo>('POST', '/v13/deployments', {
      name: options.name,
      files: options.files,
      target: options.target || 'preview',
      projectSettings: options.projectSettings,
      gitMetadata: options.gitMetadata,
    })

    return { success: response.success, deployment: response.result, error: response.error }
  }

  /**
   * Get deployment status
   */
  async getDeployment(deploymentId: string): Promise<{ success: boolean; deployment?: DeploymentInfo; error?: string }> {
    const response = await this.request<DeploymentInfo>('GET', `/v13/deployments/${deploymentId}`)
    return { success: response.success, deployment: response.result, error: response.error }
  }

  /**
   * List deployments for a project
   */
  async listDeployments(projectId: string, limit = 10): Promise<{ success: boolean; deployments?: DeploymentInfo[]; error?: string }> {
    const response = await this.request<{ deployments: DeploymentInfo[] }>(
      'GET',
      '/v6/deployments',
      undefined,
      { projectId, limit: limit.toString() }
    )
    return { success: response.success, deployments: response.result?.deployments, error: response.error }
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.request('PATCH', `/v12/deployments/${deploymentId}/cancel`)
    return { success: response.success, error: response.error }
  }

  /**
   * Delete a deployment
   */
  async deleteDeployment(deploymentId: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.request('DELETE', `/v13/deployments/${deploymentId}`)
    return { success: response.success, error: response.error }
  }

  /**
   * Add environment variable to project
   */
  async addEnvVar(projectId: string, envVar: {
    key: string
    value: string
    target: ('production' | 'preview' | 'development')[]
    type?: 'plain' | 'encrypted' | 'secret'
  }): Promise<{ success: boolean; error?: string }> {
    const response = await this.request('POST', `/v10/projects/${projectId}/env`, {
      key: envVar.key,
      value: envVar.value,
      target: envVar.target,
      type: envVar.type || 'plain',
    })
    return { success: response.success, error: response.error }
  }

  /**
   * Add domain to project
   */
  async addDomain(projectId: string, domain: string): Promise<{ success: boolean; error?: string }> {
    const response = await this.request('POST', `/v9/projects/${projectId}/domains`, { name: domain })
    return { success: response.success, error: response.error }
  }

  /**
   * Wait for deployment to be ready
   */
  async waitForDeployment(
    deploymentId: string,
    options: { timeout?: number; pollInterval?: number } = {}
  ): Promise<{ success: boolean; deployment?: DeploymentInfo; error?: string }> {
    const timeout = options.timeout || 300000 // 5 minutes default
    const pollInterval = options.pollInterval || 3000 // 3 seconds default
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const result = await this.getDeployment(deploymentId)

      if (!result.success) {
        return { success: false, error: result.error }
      }

      const state = result.deployment?.readyState

      if (state === 'READY') {
        return { success: true, deployment: result.deployment }
      }

      if (state === 'ERROR' || state === 'CANCELED') {
        return { success: false, error: `Deployment ${state}`, deployment: result.deployment }
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval))
    }

    return { success: false, error: 'Deployment timed out' }
  }
}

/**
 * Create a Vercel API client
 */
export function createVercelApi(config: VercelApiConfig): VercelApi {
  return new VercelApi(config)
}

/**
 * Create a Vercel API client from environment variables
 */
export function createVercelApiFromEnv(overrides?: Partial<VercelApiConfig>): VercelApi {
  const token = process.env.VERCEL_TOKEN

  if (!token) {
    throw new Error('VERCEL_TOKEN environment variable is required')
  }

  return new VercelApi({
    token,
    teamId: process.env.VERCEL_TEAM_ID,
    ...overrides,
  })
}

/**
 * Read project files for deployment
 */
export function readProjectFiles(
  projectDir: string,
  exclude: string[] = ['node_modules', '.git', '.vercel', '.next/cache']
): Array<{ file: string; data: string; encoding: 'base64' }> {
  const files: Array<{ file: string; data: string; encoding: 'base64' }> = []

  function readDir(dir: string) {
    if (!existsSync(dir)) return

    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = relative(projectDir, fullPath)

      // Skip excluded paths
      if (exclude.some(ex => relativePath.startsWith(ex) || entry === ex)) {
        continue
      }

      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        readDir(fullPath)
      } else {
        // Read file as base64
        const content = readFileSync(fullPath)
        files.push({
          file: relativePath,
          data: content.toString('base64'),
          encoding: 'base64',
        })
      }
    }
  }

  readDir(projectDir)
  return files
}

export type { VercelApiConfig, ProjectConfig, DeploymentInfo }

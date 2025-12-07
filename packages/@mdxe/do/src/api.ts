/**
 * @mdxe/do - .do Platform API Client
 *
 * @packageDocumentation
 */

import { ensureLoggedIn, getToken } from 'oauth.do'
import type { DeployPayload, DeployResult } from './types.js'

/**
 * Default API URL for the .do platform
 */
export const DEFAULT_API_URL = 'https://apis.do'

/**
 * API configuration
 */
export interface DoApiConfig {
  /** API URL override */
  apiUrl?: string

  /** Authentication token (uses oauth.do if not provided) */
  token?: string
}

/**
 * .do Platform API client
 */
export class DoApi {
  private apiUrl: string
  private token?: string

  constructor(config?: DoApiConfig) {
    this.apiUrl = config?.apiUrl || process.env.DO_API_URL || DEFAULT_API_URL
    this.token = config?.token
  }

  /**
   * Get authentication token
   * Uses provided token, environment variable, or initiates oauth.do flow
   */
  async getAuthToken(options?: { dryRun?: boolean }): Promise<string> {
    if (this.token) {
      return this.token
    }

    // Check environment variables
    const envToken = await getToken()
    if (envToken) {
      return envToken
    }

    // Use oauth.do device flow
    if (options?.dryRun) {
      return 'dry-run-token'
    }

    const result = await ensureLoggedIn()
    return result.token
  }

  /**
   * Deploy a worker to the .do platform
   */
  async deploy(payload: DeployPayload, options?: { dryRun?: boolean }): Promise<DeployResult> {
    const logs: string[] = []

    try {
      const token = await this.getAuthToken(options)

      if (options?.dryRun) {
        logs.push(`[dry-run] Would POST to ${this.apiUrl}/workers`)
        logs.push(`[dry-run] Worker name: ${payload.name}`)
        logs.push(`[dry-run] Mode: ${payload.mode}`)
        logs.push(`[dry-run] Assets: ${payload.assets?.length || 0} files`)
        return { success: true, logs }
      }

      logs.push(`Deploying to ${this.apiUrl}/workers...`)

      const response = await fetch(`${this.apiUrl}/workers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const result = await response.json() as {
        success: boolean
        url?: string
        deploymentId?: string
        workerId?: string
        error?: string
      }

      if (result.success) {
        logs.push(`Deployment successful${result.url ? `: ${result.url}` : ''}`)
        return {
          success: true,
          url: result.url,
          deploymentId: result.deploymentId,
          workerId: result.workerId,
          logs,
        }
      } else {
        throw new Error(result.error || 'Unknown error')
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        logs,
      }
    }
  }

  /**
   * Get worker information
   */
  async getWorker(name: string): Promise<{
    success: boolean
    worker?: {
      id: string
      name: string
      url?: string
      createdAt?: string
      updatedAt?: string
    }
    error?: string
  }> {
    try {
      const token = await this.getAuthToken()

      const response = await fetch(`${this.apiUrl}/workers/${encodeURIComponent(name)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Worker not found' }
        }
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const worker = await response.json() as { id: string; name: string; url?: string; createdAt?: string; updatedAt?: string }
      return { success: true, worker }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * List all workers
   */
  async listWorkers(): Promise<{
    success: boolean
    workers?: Array<{
      id: string
      name: string
      url?: string
      createdAt?: string
    }>
    error?: string
  }> {
    try {
      const token = await this.getAuthToken()

      const response = await fetch(`${this.apiUrl}/workers`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const result = await response.json() as { workers?: unknown[] }
      return { success: true, workers: result.workers as any }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete a worker
   */
  async deleteWorker(name: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAuthToken()

      const response = await fetch(`${this.apiUrl}/workers/${encodeURIComponent(name)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Get deployment logs
   */
  async getLogs(workerId: string, options?: {
    limit?: number
    since?: string
  }): Promise<{
    success: boolean
    logs?: Array<{
      timestamp: string
      level: string
      message: string
    }>
    error?: string
  }> {
    try {
      const token = await this.getAuthToken()

      const params = new URLSearchParams()
      if (options?.limit) params.set('limit', String(options.limit))
      if (options?.since) params.set('since', options.since)

      const response = await fetch(
        `${this.apiUrl}/workers/${encodeURIComponent(workerId)}/logs?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`HTTP ${response.status}: ${error}`)
      }

      const result = await response.json() as { logs?: unknown[] }
      return { success: true, logs: result.logs as any }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

/**
 * Create a .do API client from environment
 */
export function createDoApiFromEnv(): DoApi {
  return new DoApi({
    apiUrl: process.env.DO_API_URL,
    token: process.env.DO_TOKEN || process.env.DO_ADMIN_TOKEN,
  })
}

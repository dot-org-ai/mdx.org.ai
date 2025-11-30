/**
 * Cloudflare Workers API Client
 *
 * Provides direct access to Cloudflare's REST API for deploying Workers,
 * with support for custom authentication, API proxying, and multi-tenant
 * dispatch namespaces.
 *
 * @packageDocumentation
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

/**
 * Cloudflare API configuration
 */
export interface CloudflareApiConfig {
  /** Account ID */
  accountId: string

  /** API token for authentication */
  apiToken: string

  /**
   * Base URL for the Cloudflare API
   * Override this to proxy requests through your own server for custom auth
   * @default 'https://api.cloudflare.com/client/v4'
   */
  baseUrl?: string

  /**
   * Custom headers to include in all requests
   * Useful for adding tenant-specific headers or additional auth
   */
  headers?: Record<string, string>

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number
}

/**
 * Worker script metadata
 */
export interface WorkerMetadata {
  /** Main module name */
  main_module: string
  /** Compatibility date */
  compatibility_date?: string
  /** Compatibility flags */
  compatibility_flags?: string[]
  /** Bindings */
  bindings?: WorkerBinding[]
  /** Tags for organization */
  tags?: string[]
}

/**
 * Worker binding types
 */
export type WorkerBinding =
  | { type: 'kv_namespace'; name: string; namespace_id: string }
  | { type: 'd1'; name: string; id: string }
  | { type: 'r2_bucket'; name: string; bucket_name: string }
  | { type: 'service'; name: string; service: string; environment?: string }
  | { type: 'dispatch_namespace'; name: string; namespace: string }
  | { type: 'plain_text'; name: string; text: string }
  | { type: 'secret_text'; name: string; text: string }
  | { type: 'json'; name: string; json: unknown }
  | { type: 'assets'; name: string }

/**
 * Dispatch namespace configuration
 */
export interface DispatchNamespace {
  /** Namespace name */
  name: string
  /** Optional script limits */
  script_limits?: {
    max_scripts?: number
    max_script_size?: number
  }
}

/**
 * Upload result
 */
export interface UploadResult {
  success: boolean
  scriptId?: string
  url?: string
  errors?: Array<{ code: number; message: string }>
  messages?: string[]
}

/**
 * Asset manifest entry
 */
interface AssetEntry {
  path: string
  hash: string
  size: number
}

/**
 * Cloudflare Workers API Client
 */
export class CloudflareApi {
  private config: Required<CloudflareApiConfig>

  constructor(config: CloudflareApiConfig) {
    this.config = {
      accountId: config.accountId,
      apiToken: config.apiToken,
      baseUrl: config.baseUrl || 'https://api.cloudflare.com/client/v4',
      headers: config.headers || {},
      timeout: config.timeout || 30000,
    }
  }

  /**
   * Make an authenticated request to the Cloudflare API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    contentType?: string
  ): Promise<{ success: boolean; result?: T; errors?: Array<{ code: number; message: string }> }> {
    const url = `${this.config.baseUrl}${path}`

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiToken}`,
      ...this.config.headers,
    }

    if (contentType) {
      headers['Content-Type'] = contentType
    } else if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()
      return data as { success: boolean; result?: T; errors?: Array<{ code: number; message: string }> }
    } catch (error) {
      clearTimeout(timeoutId)
      return {
        success: false,
        errors: [{ code: 0, message: error instanceof Error ? error.message : 'Unknown error' }],
      }
    }
  }

  /**
   * Create a dispatch namespace for multi-tenant deployments
   */
  async createDispatchNamespace(namespace: DispatchNamespace): Promise<UploadResult> {
    const response = await this.request<{ namespace_id: string }>(
      'POST',
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces`,
      { name: namespace.name, ...namespace.script_limits }
    )

    return {
      success: response.success,
      scriptId: response.result?.namespace_id,
      errors: response.errors,
    }
  }

  /**
   * List dispatch namespaces
   */
  async listDispatchNamespaces(): Promise<{ success: boolean; namespaces?: DispatchNamespace[]; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<DispatchNamespace[]>(
      'GET',
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces`
    )

    return {
      success: response.success,
      namespaces: response.result,
      errors: response.errors,
    }
  }

  /**
   * Delete a dispatch namespace
   */
  async deleteDispatchNamespace(namespaceName: string): Promise<UploadResult> {
    const response = await this.request(
      'DELETE',
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${namespaceName}`
    )

    return {
      success: response.success,
      errors: response.errors,
    }
  }

  /**
   * Upload a worker script to a dispatch namespace
   */
  async uploadToNamespace(
    namespaceName: string,
    scriptName: string,
    workerCode: string,
    metadata: WorkerMetadata
  ): Promise<UploadResult> {
    const formData = new FormData()

    // Add the worker script
    formData.append('worker.js', new Blob([workerCode], { type: 'application/javascript' }), 'worker.js')

    // Add metadata
    formData.append('metadata', JSON.stringify({
      ...metadata,
      main_module: 'worker.js',
    }))

    const response = await this.request<{ id: string }>(
      'PUT',
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${namespaceName}/scripts/${scriptName}`,
      formData
    )

    return {
      success: response.success,
      scriptId: response.result?.id,
      errors: response.errors,
    }
  }

  /**
   * Upload a worker script (not to a namespace)
   */
  async uploadWorker(
    scriptName: string,
    workerCode: string,
    metadata: WorkerMetadata
  ): Promise<UploadResult> {
    const formData = new FormData()

    // Add the worker script
    formData.append('worker.js', new Blob([workerCode], { type: 'application/javascript' }), 'worker.js')

    // Add metadata
    formData.append('metadata', JSON.stringify({
      ...metadata,
      main_module: 'worker.js',
    }))

    const response = await this.request<{ id: string }>(
      'PUT',
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}`,
      formData
    )

    return {
      success: response.success,
      scriptId: response.result?.id,
      url: response.success ? `https://${scriptName}.${this.config.accountId}.workers.dev` : undefined,
      errors: response.errors,
    }
  }

  /**
   * Upload a worker with multiple modules (ES modules format)
   */
  async uploadWorkerModules(
    scriptName: string,
    modules: Array<{ name: string; content: string; type?: string }>,
    metadata: WorkerMetadata
  ): Promise<UploadResult> {
    const formData = new FormData()

    // Add all modules
    for (const module of modules) {
      const type = module.type || 'application/javascript+module'
      formData.append(module.name, new Blob([module.content], { type }), module.name)
    }

    // Add metadata
    formData.append('metadata', JSON.stringify(metadata))

    const response = await this.request<{ id: string }>(
      'PUT',
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}`,
      formData
    )

    return {
      success: response.success,
      scriptId: response.result?.id,
      url: response.success ? `https://${scriptName}.${this.config.accountId}.workers.dev` : undefined,
      errors: response.errors,
    }
  }

  /**
   * Delete a worker script
   */
  async deleteWorker(scriptName: string): Promise<UploadResult> {
    const response = await this.request(
      'DELETE',
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}`
    )

    return {
      success: response.success,
      errors: response.errors,
    }
  }

  /**
   * Delete a worker from a dispatch namespace
   */
  async deleteFromNamespace(namespaceName: string, scriptName: string): Promise<UploadResult> {
    const response = await this.request(
      'DELETE',
      `/accounts/${this.config.accountId}/workers/dispatch/namespaces/${namespaceName}/scripts/${scriptName}`
    )

    return {
      success: response.success,
      errors: response.errors,
    }
  }

  /**
   * Get worker script details
   */
  async getWorker(scriptName: string): Promise<{ success: boolean; script?: { id: string; etag: string; modified_on: string }; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ id: string; etag: string; modified_on: string }>(
      'GET',
      `/accounts/${this.config.accountId}/workers/scripts/${scriptName}`
    )

    return {
      success: response.success,
      script: response.result,
      errors: response.errors,
    }
  }

  /**
   * List all workers in account
   */
  async listWorkers(): Promise<{ success: boolean; workers?: Array<{ id: string; etag: string; modified_on: string }>; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<Array<{ id: string; etag: string; modified_on: string }>>(
      'GET',
      `/accounts/${this.config.accountId}/workers/scripts`
    )

    return {
      success: response.success,
      workers: response.result,
      errors: response.errors,
    }
  }

  /**
   * Create a KV namespace
   */
  async createKVNamespace(title: string): Promise<{ success: boolean; id?: string; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ id: string }>(
      'POST',
      `/accounts/${this.config.accountId}/storage/kv/namespaces`,
      { title }
    )

    return {
      success: response.success,
      id: response.result?.id,
      errors: response.errors,
    }
  }

  /**
   * Create a D1 database
   */
  async createD1Database(name: string): Promise<{ success: boolean; uuid?: string; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ uuid: string }>(
      'POST',
      `/accounts/${this.config.accountId}/d1/database`,
      { name }
    )

    return {
      success: response.success,
      uuid: response.result?.uuid,
      errors: response.errors,
    }
  }

  /**
   * Upload static assets for Workers Sites
   */
  async uploadAssets(
    scriptName: string,
    assetsDir: string
  ): Promise<{ success: boolean; manifest?: Record<string, string>; errors?: Array<{ code: number; message: string }> }> {
    // Read all files recursively
    const assets = this.readAssetsRecursively(assetsDir)

    if (assets.length === 0) {
      return {
        success: false,
        errors: [{ code: 0, message: 'No assets found in directory' }],
      }
    }

    // Upload assets in batches
    const manifest: Record<string, string> = {}
    const batchSize = 100

    for (let i = 0; i < assets.length; i += batchSize) {
      const batch = assets.slice(i, i + batchSize)
      const formData = new FormData()

      for (const asset of batch) {
        const content = readFileSync(asset.fullPath)
        formData.append(asset.path, new Blob([content]), asset.path)
        manifest[asset.path] = asset.hash
      }

      const response = await this.request(
        'POST',
        `/accounts/${this.config.accountId}/workers/scripts/${scriptName}/assets`,
        formData
      )

      if (!response.success) {
        return {
          success: false,
          errors: response.errors,
        }
      }
    }

    return {
      success: true,
      manifest,
    }
  }

  /**
   * Read assets directory recursively
   */
  private readAssetsRecursively(
    dir: string,
    basePath: string = ''
  ): Array<{ path: string; fullPath: string; hash: string }> {
    const assets: Array<{ path: string; fullPath: string; hash: string }> = []

    if (!existsSync(dir)) {
      return assets
    }

    const entries = readdirSync(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const relativePath = basePath ? `${basePath}/${entry}` : entry
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        assets.push(...this.readAssetsRecursively(fullPath, relativePath))
      } else {
        // Generate simple hash for deduplication
        const content = readFileSync(fullPath)
        const hash = this.simpleHash(content)
        assets.push({ path: relativePath, fullPath, hash })
      }
    }

    return assets
  }

  /**
   * Simple hash function for asset deduplication
   */
  private simpleHash(content: Buffer): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content[i] ?? 0
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0')
  }

  /**
   * Configure a custom domain for a worker
   */
  async setCustomDomain(
    scriptName: string,
    hostname: string,
    zoneId: string
  ): Promise<UploadResult> {
    const response = await this.request(
      'PUT',
      `/zones/${zoneId}/workers/routes`,
      {
        pattern: `${hostname}/*`,
        script: scriptName,
      }
    )

    return {
      success: response.success,
      url: `https://${hostname}`,
      errors: response.errors,
    }
  }
}

/**
 * Create a Cloudflare API client
 */
export function createCloudflareApi(config: CloudflareApiConfig): CloudflareApi {
  return new CloudflareApi(config)
}

/**
 * Create a Cloudflare API client from environment variables
 */
export function createCloudflareApiFromEnv(overrides?: Partial<CloudflareApiConfig>): CloudflareApi {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID
  const apiToken = process.env.CLOUDFLARE_API_TOKEN

  if (!accountId) {
    throw new Error('CLOUDFLARE_ACCOUNT_ID environment variable is required')
  }

  if (!apiToken) {
    throw new Error('CLOUDFLARE_API_TOKEN environment variable is required')
  }

  return new CloudflareApi({
    accountId,
    apiToken,
    baseUrl: process.env.CLOUDFLARE_API_BASE_URL,
    ...overrides,
  })
}

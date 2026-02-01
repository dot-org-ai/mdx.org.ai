/**
 * @mdxe/cloudflare - Cloudflare REST API Client
 *
 * Provides direct access to Cloudflare's REST API for deploying Workers and Pages,
 * with support for custom authentication, API proxying, and multi-tenant
 * dispatch namespaces.
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type {
  CloudflareApiConfig,
  WorkerMetadata,
  WorkerBinding,
  DispatchNamespace,
  UploadResult,
  VectorizeIndexConfig,
  VectorizeIndex,
  VectorizeVector,
  VectorizeMatch,
} from './types.js'

/**
 * Cloudflare REST API Client
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

    formData.append('worker.js', new Blob([workerCode], { type: 'application/javascript' }), 'worker.js')
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
   * Upload a worker script
   */
  async uploadWorker(
    scriptName: string,
    workerCode: string,
    metadata: WorkerMetadata
  ): Promise<UploadResult> {
    const formData = new FormData()

    formData.append('worker.js', new Blob([workerCode], { type: 'application/javascript' }), 'worker.js')
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

    for (const module of modules) {
      const type = module.type || 'application/javascript+module'
      formData.append(module.name, new Blob([module.content], { type }), module.name)
    }

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

  // ===========================================================================
  // Vectorize API
  // ===========================================================================

  /**
   * Create a Vectorize index
   */
  async createVectorizeIndex(config: VectorizeIndexConfig): Promise<{ success: boolean; index?: VectorizeIndex; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<VectorizeIndex>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes`,
      {
        name: config.name,
        description: config.description,
        config: {
          dimensions: config.dimensions,
          metric: config.metric,
        },
      }
    )

    return {
      success: response.success,
      index: response.result,
      errors: response.errors,
    }
  }

  /**
   * Get a Vectorize index
   */
  async getVectorizeIndex(indexName: string): Promise<{ success: boolean; index?: VectorizeIndex; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<VectorizeIndex>(
      'GET',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}`
    )

    return {
      success: response.success,
      index: response.result,
      errors: response.errors,
    }
  }

  /**
   * List all Vectorize indexes
   */
  async listVectorizeIndexes(): Promise<{ success: boolean; indexes?: VectorizeIndex[]; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<VectorizeIndex[]>(
      'GET',
      `/accounts/${this.config.accountId}/vectorize/indexes`
    )

    return {
      success: response.success,
      indexes: response.result,
      errors: response.errors,
    }
  }

  /**
   * Delete a Vectorize index
   */
  async deleteVectorizeIndex(indexName: string): Promise<{ success: boolean; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request(
      'DELETE',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}`
    )

    return {
      success: response.success,
      errors: response.errors,
    }
  }

  /**
   * Insert vectors into a Vectorize index
   */
  async insertVectors(
    indexName: string,
    vectors: VectorizeVector[]
  ): Promise<{ success: boolean; mutationId?: string; errors?: Array<{ code: number; message: string }> }> {
    // Vectorize uses NDJSON format for bulk inserts
    const ndjson = vectors.map(v => JSON.stringify(v)).join('\n')

    const response = await this.request<{ mutationId: string }>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}/insert`,
      ndjson,
      'application/x-ndjson'
    )

    return {
      success: response.success,
      mutationId: response.result?.mutationId,
      errors: response.errors,
    }
  }

  /**
   * Upsert vectors into a Vectorize index
   */
  async upsertVectors(
    indexName: string,
    vectors: VectorizeVector[]
  ): Promise<{ success: boolean; mutationId?: string; errors?: Array<{ code: number; message: string }> }> {
    const ndjson = vectors.map(v => JSON.stringify(v)).join('\n')

    const response = await this.request<{ mutationId: string }>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}/upsert`,
      ndjson,
      'application/x-ndjson'
    )

    return {
      success: response.success,
      mutationId: response.result?.mutationId,
      errors: response.errors,
    }
  }

  /**
   * Delete vectors from a Vectorize index
   */
  async deleteVectors(
    indexName: string,
    ids: string[]
  ): Promise<{ success: boolean; mutationId?: string; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ mutationId: string }>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}/delete-by-ids`,
      { ids }
    )

    return {
      success: response.success,
      mutationId: response.result?.mutationId,
      errors: response.errors,
    }
  }

  /**
   * Query vectors in a Vectorize index
   */
  async queryVectors(
    indexName: string,
    vector: number[],
    options: {
      topK?: number
      filter?: Record<string, unknown>
      returnValues?: boolean
      returnMetadata?: boolean
      namespace?: string
    } = {}
  ): Promise<{ success: boolean; matches?: VectorizeMatch[]; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ matches: VectorizeMatch[] }>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}/query`,
      {
        vector,
        topK: options.topK ?? 10,
        filter: options.filter,
        returnValues: options.returnValues ?? false,
        returnMetadata: options.returnMetadata ?? true,
        namespace: options.namespace,
      }
    )

    return {
      success: response.success,
      matches: response.result?.matches,
      errors: response.errors,
    }
  }

  /**
   * Get vectors by IDs from a Vectorize index
   */
  async getVectorsByIds(
    indexName: string,
    ids: string[]
  ): Promise<{ success: boolean; vectors?: VectorizeVector[]; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<VectorizeVector[]>(
      'POST',
      `/accounts/${this.config.accountId}/vectorize/indexes/${indexName}/get-by-ids`,
      { ids }
    )

    return {
      success: response.success,
      vectors: response.result,
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
    const assets = await this.readAssetsRecursively(assetsDir)

    if (assets.length === 0) {
      return {
        success: false,
        errors: [{ code: 0, message: 'No assets found in directory' }],
      }
    }

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
  private async readAssetsRecursively(
    dir: string,
    basePath: string = ''
  ): Promise<Array<{ path: string; fullPath: string; hash: string }>> {
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
        const subAssets = await this.readAssetsRecursively(fullPath, relativePath)
        assets.push(...subAssets)
      } else {
        const content = readFileSync(fullPath)
        const hash = await this.secureHash(content)
        assets.push({ path: relativePath, fullPath, hash })
      }
    }

    return assets
  }

  /**
   * Secure hash function for asset deduplication using SHA-256
   */
  private async secureHash(content: Buffer): Promise<string> {
    // Create a new Uint8Array copy to ensure compatibility with crypto.subtle
    const data = Uint8Array.from(content)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
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

  /**
   * Create a Pages project
   */
  async createPagesProject(
    projectName: string,
    options: {
      productionBranch?: string
      buildCommand?: string
      destinationDir?: string
    } = {}
  ): Promise<{ success: boolean; id?: string; errors?: Array<{ code: number; message: string }> }> {
    const response = await this.request<{ id: string }>(
      'POST',
      `/accounts/${this.config.accountId}/pages/projects`,
      {
        name: projectName,
        production_branch: options.productionBranch || 'main',
        build_config: {
          build_command: options.buildCommand,
          destination_dir: options.destinationDir || 'out',
        },
      }
    )

    return {
      success: response.success,
      id: response.result?.id,
      errors: response.errors,
    }
  }

  /**
   * Create a Pages deployment
   */
  async createPagesDeployment(
    projectName: string,
    assets: Array<{ path: string; content: Buffer | string }>,
    options: { branch?: string } = {}
  ): Promise<{ success: boolean; id?: string; url?: string; errors?: Array<{ code: number; message: string }> }> {
    const formData = new FormData()

    for (const asset of assets) {
      const content = typeof asset.content === 'string'
        ? new Blob([asset.content], { type: 'text/plain' })
        : new Blob([asset.content])
      formData.append(asset.path, content, asset.path)
    }

    if (options.branch) {
      formData.append('branch', options.branch)
    }

    const response = await this.request<{ id: string; url: string }>(
      'POST',
      `/accounts/${this.config.accountId}/pages/projects/${projectName}/deployments`,
      formData
    )

    return {
      success: response.success,
      id: response.result?.id,
      url: response.result?.url,
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

export type {
  CloudflareApiConfig,
  WorkerMetadata,
  WorkerBinding,
  DispatchNamespace,
  UploadResult,
  VectorizeIndexConfig,
  VectorizeIndex,
  VectorizeVector,
  VectorizeMatch,
}

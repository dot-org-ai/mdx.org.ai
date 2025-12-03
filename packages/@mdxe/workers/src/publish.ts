/**
 * @mdxe/workers Publish
 *
 * Publish namespace bundles to Cloudflare Workers for Platforms
 *
 * @packageDocumentation
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import type { NamespaceBundle, PublishOptions, PublishResult } from './types.js'

const DEFAULT_API_BASE_URL = 'https://api.cloudflare.com/client/v4'

/**
 * Read OAuth token from wrangler's config file
 */
function getWranglerOAuthToken(): string | undefined {
  // macOS: ~/Library/Preferences/.wrangler/config/default.toml
  // Linux: ~/.config/.wrangler/config/default.toml
  const macPath = join(homedir(), 'Library', 'Preferences', '.wrangler', 'config', 'default.toml')
  const linuxPath = join(homedir(), '.config', '.wrangler', 'config', 'default.toml')

  const configPath = existsSync(macPath) ? macPath : existsSync(linuxPath) ? linuxPath : undefined

  if (!configPath) return undefined

  try {
    const content = readFileSync(configPath, 'utf-8')
    // Simple TOML parsing for oauth_token
    const match = content.match(/oauth_token\s*=\s*"([^"]+)"/)
    if (match?.[1]) {
      // Check if token is expired
      const expirationMatch = content.match(/expiration_time\s*=\s*"([^"]+)"/)
      if (expirationMatch?.[1]) {
        const expiration = new Date(expirationMatch[1])
        if (expiration < new Date()) {
          console.warn('Wrangler OAuth token is expired. Run `wrangler login` to refresh.')
          return undefined
        }
      }
      return match[1]
    }
  } catch {
    // Ignore read errors
  }

  return undefined
}

/**
 * Cloudflare API client for Workers deployment
 */
class CloudflareAPI {
  private baseUrl: string
  private token: string
  private accountId?: string

  constructor(options: { token: string; baseUrl?: string; accountId?: string }) {
    this.token = options.token
    this.baseUrl = options.baseUrl || DEFAULT_API_BASE_URL
    this.accountId = options.accountId
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; result?: T; errors?: Array<{ message: string }> }> {
    const url = `${this.baseUrl}${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...options.headers,
      },
    })

    return response.json() as Promise<{ success: boolean; result?: T; errors?: Array<{ message: string }> }>
  }

  /**
   * Get account ID from token (whoami)
   */
  async getAccountId(): Promise<string | undefined> {
    if (this.accountId) return this.accountId

    const result = await this.request<{ id: string }>('/user')
    if (result.success && result.result) {
      // Get first account
      const accounts = await this.request<Array<{ id: string }>>('/accounts')
      if (accounts.success && accounts.result?.[0]) {
        this.accountId = accounts.result[0].id
        return this.accountId
      }
    }
    return undefined
  }

  /**
   * Upload worker script to a dispatch namespace
   */
  async uploadToNamespace(
    dispatchNamespace: string,
    scriptName: string,
    code: string,
    metadata: {
      compatibilityDate?: string
      compatibilityFlags?: string[]
      bindings?: Array<{ type: string; name: string; [key: string]: unknown }>
    } = {}
  ): Promise<{ success: boolean; scriptId?: string; error?: string }> {
    const accountId = await this.getAccountId()
    if (!accountId) {
      return { success: false, error: 'Could not determine account ID' }
    }

    // Prepare multipart form data
    const formData = new FormData()

    // Worker module - use application/javascript+module for ESM
    const blob = new Blob([code], { type: 'application/javascript+module' })
    formData.append('worker.js', blob, 'worker.js')

    // Metadata - specify main_module for ESM format
    const metadataBlob = new Blob(
      [
        JSON.stringify({
          main_module: 'worker.js',
          compatibility_date: metadata.compatibilityDate || new Date().toISOString().split('T')[0],
          compatibility_flags: metadata.compatibilityFlags,
          bindings: metadata.bindings,
        }),
      ],
      { type: 'application/json' }
    )
    formData.append('metadata', metadataBlob, 'metadata.json')

    const result = await this.request<{ id: string }>(
      `/accounts/${accountId}/workers/dispatch/namespaces/${dispatchNamespace}/scripts/${scriptName}`,
      {
        method: 'PUT',
        body: formData,
      }
    )

    if (result.success && result.result) {
      return { success: true, scriptId: result.result.id }
    }

    return {
      success: false,
      error: result.errors?.map((e) => e.message).join(', ') || 'Upload failed',
    }
  }

  /**
   * Upload worker script (standalone, not dispatch namespace)
   */
  async uploadWorker(
    scriptName: string,
    code: string,
    metadata: {
      compatibilityDate?: string
      compatibilityFlags?: string[]
      bindings?: Array<{ type: string; name: string; [key: string]: unknown }>
    } = {}
  ): Promise<{ success: boolean; scriptId?: string; error?: string }> {
    const accountId = await this.getAccountId()
    if (!accountId) {
      return { success: false, error: 'Could not determine account ID' }
    }

    // Prepare multipart form data
    const formData = new FormData()

    // Worker module - use application/javascript+module for ESM
    const blob = new Blob([code], { type: 'application/javascript+module' })
    formData.append('worker.js', blob, 'worker.js')

    // Metadata - specify main_module for ESM format
    const metadataBlob = new Blob(
      [
        JSON.stringify({
          main_module: 'worker.js',
          compatibility_date: metadata.compatibilityDate || new Date().toISOString().split('T')[0],
          compatibility_flags: metadata.compatibilityFlags,
          bindings: metadata.bindings,
        }),
      ],
      { type: 'application/json' }
    )
    formData.append('metadata', metadataBlob, 'metadata.json')

    const result = await this.request<{ id: string }>(
      `/accounts/${accountId}/workers/scripts/${scriptName}`,
      {
        method: 'PUT',
        body: formData,
      }
    )

    if (result.success && result.result) {
      return { success: true, scriptId: result.result.id }
    }

    return {
      success: false,
      error: result.errors?.map((e) => e.message).join(', ') || 'Upload failed',
    }
  }

  /**
   * Write content to KV namespace
   */
  async writeKV(
    namespaceId: string,
    entries: Array<{ key: string; value: string }>
  ): Promise<{ success: boolean; error?: string }> {
    const accountId = await this.getAccountId()
    if (!accountId) {
      return { success: false, error: 'Could not determine account ID' }
    }

    // Bulk write
    const result = await this.request(
      `/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/bulk`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entries),
      }
    )

    return {
      success: result.success,
      error: result.errors?.map((e) => e.message).join(', '),
    }
  }

  /**
   * Create or get KV namespace
   */
  async ensureKVNamespace(title: string): Promise<{ success: boolean; namespaceId?: string; error?: string }> {
    const accountId = await this.getAccountId()
    if (!accountId) {
      return { success: false, error: 'Could not determine account ID' }
    }

    // List existing namespaces
    const listResult = await this.request<Array<{ id: string; title: string }>>(
      `/accounts/${accountId}/storage/kv/namespaces`
    )

    if (listResult.success && listResult.result) {
      const existing = listResult.result.find((ns) => ns.title === title)
      if (existing) {
        return { success: true, namespaceId: existing.id }
      }
    }

    // Create new namespace
    const createResult = await this.request<{ id: string }>(
      `/accounts/${accountId}/storage/kv/namespaces`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      }
    )

    if (createResult.success && createResult.result) {
      return { success: true, namespaceId: createResult.result.id }
    }

    return {
      success: false,
      error: createResult.errors?.map((e) => e.message).join(', ') || 'Failed to create KV namespace',
    }
  }
}

/**
 * Publish a namespace bundle to Cloudflare Workers
 *
 * @example
 * ```ts
 * import { build, publish } from '@mdxe/workers'
 *
 * // Build the project
 * const buildResult = await build({ projectDir: './my-site' })
 *
 * // Publish to Workers for Platforms
 * const publishResult = await publish(buildResult.bundle!, {
 *   namespace: 'my-site',
 *   token: process.env.CLOUDFLARE_API_TOKEN!,
 *   dispatchNamespace: 'sites',
 * })
 * ```
 */
export async function publish(bundle: NamespaceBundle, options: PublishOptions): Promise<PublishResult> {
  const startTime = Date.now()
  const logs: string[] = []

  const { namespace, dispatchNamespace, accountId, apiBaseUrl, kvNamespaceId, contentStorage = 'embedded', dryRun, verbose } = options

  // Use provided token or fall back to wrangler OAuth
  let token = options.token
  if (!token) {
    token = getWranglerOAuthToken()
    if (token) {
      logs.push('Using wrangler OAuth token')
    }
  }

  if (!token) {
    return {
      success: false,
      error: 'No authentication token. Provide a token or run `wrangler login`.',
      logs,
      duration: Date.now() - startTime,
    }
  }

  try {
    logs.push(`Publishing to namespace: ${namespace}`)

    if (dryRun) {
      logs.push('[DRY RUN] Would publish worker...')
      logs.push(`[DRY RUN] Worker size: ${bundle.worker.main.length} bytes`)
      logs.push(`[DRY RUN] Content documents: ${bundle.content.count}`)
      if (contentStorage !== 'embedded') {
        logs.push(`[DRY RUN] Would upload content to ${contentStorage}`)
      }

      return {
        success: true,
        logs,
        duration: Date.now() - startTime,
        contentHash: bundle.content.hash,
      }
    }

    // Initialize API client
    const api = new CloudflareAPI({
      token,
      baseUrl: apiBaseUrl,
      accountId,
    })

    // Prepare bindings
    const bindings: Array<{ type: string; name: string; [key: string]: unknown }> = []

    // Handle content storage
    if (contentStorage === 'kv') {
      logs.push('Setting up KV storage for content...')

      // Ensure KV namespace exists
      const kvTitle = kvNamespaceId || `mdxe-content-${namespace}`
      const kvResult = await api.ensureKVNamespace(kvTitle)

      if (!kvResult.success) {
        return {
          success: false,
          error: `Failed to setup KV: ${kvResult.error}`,
          logs,
          duration: Date.now() - startTime,
        }
      }

      logs.push(`Using KV namespace: ${kvResult.namespaceId}`)

      // Upload content to KV
      const entries = Object.entries(bundle.content.documents).map(([path, doc]) => ({
        key: path,
        value: JSON.stringify(doc),
      }))

      const writeResult = await api.writeKV(kvResult.namespaceId!, entries)
      if (!writeResult.success) {
        return {
          success: false,
          error: `Failed to write content to KV: ${writeResult.error}`,
          logs,
          duration: Date.now() - startTime,
        }
      }

      logs.push(`Uploaded ${entries.length} documents to KV`)

      // Add KV binding
      bindings.push({
        type: 'kv_namespace',
        name: 'CONTENT',
        namespace_id: kvResult.namespaceId,
      })
    }

    // Add environment variables
    if (options.env) {
      for (const [name, value] of Object.entries(options.env)) {
        bindings.push({ type: 'plain_text', name, text: value })
      }
    }

    // Upload worker
    logs.push('Uploading worker...')

    let uploadResult: { success: boolean; scriptId?: string; error?: string }

    if (dispatchNamespace) {
      // Upload to dispatch namespace (Workers for Platforms)
      logs.push(`Using dispatch namespace: ${dispatchNamespace}`)
      uploadResult = await api.uploadToNamespace(dispatchNamespace, namespace, bundle.worker.main, {
        compatibilityDate: bundle.meta.config.compatibilityDate,
        compatibilityFlags: bundle.meta.config.compatibilityFlags,
        bindings,
      })
    } else {
      // Upload as standalone worker
      uploadResult = await api.uploadWorker(namespace, bundle.worker.main, {
        compatibilityDate: bundle.meta.config.compatibilityDate,
        compatibilityFlags: bundle.meta.config.compatibilityFlags,
        bindings,
      })
    }

    if (!uploadResult.success) {
      return {
        success: false,
        error: uploadResult.error,
        logs,
        duration: Date.now() - startTime,
      }
    }

    logs.push(`Worker uploaded successfully`)
    if (verbose) {
      logs.push(`Script ID: ${uploadResult.scriptId}`)
    }

    const duration = Date.now() - startTime
    logs.push(`Published in ${duration}ms`)

    return {
      success: true,
      scriptId: uploadResult.scriptId,
      contentHash: bundle.content.hash,
      logs,
      duration,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      logs,
      duration: Date.now() - startTime,
    }
  }
}

/**
 * Build and publish in one step (convenience function)
 */
export async function buildAndPublish(
  projectDir: string,
  options: PublishOptions & { minify?: boolean; sourceMaps?: boolean }
): Promise<PublishResult> {
  // Import build dynamically to avoid circular dependency
  const { build } = await import('./build.js')

  const buildResult = await build({
    projectDir,
    minify: options.minify ?? true,
    sourceMaps: options.sourceMaps ?? false,
  })

  if (!buildResult.success || !buildResult.bundle) {
    return {
      success: false,
      error: buildResult.error || 'Build failed',
      logs: buildResult.logs,
      duration: buildResult.duration,
    }
  }

  return publish(buildResult.bundle, options)
}

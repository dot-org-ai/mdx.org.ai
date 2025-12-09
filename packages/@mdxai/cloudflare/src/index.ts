/**
 * @mdxai/cloudflare - Cloudflare Workers AI Provider
 *
 * Provides async/batch-like processing for Cloudflare Workers AI with:
 * - Edge-first execution
 * - No cold starts
 * - Async task queuing via Queues/Durable Objects
 *
 * Note: Cloudflare Workers AI doesn't have a traditional batch API like
 * OpenAI/Anthropic. Instead, this provider implements batch-like semantics
 * using Cloudflare's async primitives (Queues, Durable Objects, etc.)
 *
 * @example
 * ```ts
 * import { CloudflareBatchProvider, createCloudflareBatchProvider } from '@mdxai/cloudflare'
 *
 * const provider = createCloudflareBatchProvider({
 *   accountId: process.env.CF_ACCOUNT_ID,
 *   apiToken: process.env.CF_API_TOKEN,
 * })
 *
 * const submission = await provider.submitBatch([...requests])
 * ```
 *
 * @packageDocumentation
 */

import type {
  AIBatchProvider,
  BatchLimits,
  CompletionRequest,
  CompletionResponse,
  Message,
} from '@mdxai/batch'
import type { BatchRequest, BatchStatus, BatchResult, BatchSubmission } from 'ai-database'

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for Cloudflare Workers AI provider
 */
export interface CloudflareBatchConfig {
  /** Cloudflare Account ID */
  accountId?: string
  /** Cloudflare API Token */
  apiToken?: string
  /** Default model to use */
  defaultModel?: string
  /** Gateway ID for AI Gateway (optional) */
  gatewayId?: string
}

/**
 * Cloudflare Workers AI request format
 */
interface CloudflareAIRequest {
  model: string
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  stream?: boolean
}

/**
 * Cloudflare Workers AI response format
 */
interface CloudflareAIResponse {
  result: {
    response: string
  }
  success: boolean
  errors: Array<{ code: number; message: string }>
}

// =============================================================================
// Cloudflare Batch Provider
// =============================================================================

/**
 * Cloudflare Workers AI provider with batch-like semantics
 *
 * Since Cloudflare doesn't have a native batch API, this provider:
 * 1. Executes requests in parallel with concurrency control
 * 2. Uses Cloudflare's REST API for inference
 * 3. Could be extended to use Queues/Durable Objects for true async
 */
export class CloudflareBatchProvider implements AIBatchProvider {
  readonly name = 'cloudflare'
  readonly supportsBatch = false // No native batch, simulated
  readonly supportsFlex = false

  private accountId: string
  private apiToken: string
  private defaultModel: string
  private gatewayId?: string
  private baseUrl: string

  // Track batches in memory (would use Durable Objects in production)
  private batches = new Map<string, {
    requests: BatchRequest[]
    results: BatchResult[]
    status: BatchStatus['status']
  }>()

  constructor(config: CloudflareBatchConfig = {}) {
    this.accountId = config.accountId ?? process.env.CF_ACCOUNT_ID ?? ''
    this.apiToken = config.apiToken ?? process.env.CF_API_TOKEN ?? ''
    this.defaultModel = config.defaultModel ?? '@cf/meta/llama-3.1-8b-instruct'
    this.gatewayId = config.gatewayId

    // Build base URL (with optional AI Gateway)
    if (this.gatewayId) {
      this.baseUrl = `https://gateway.ai.cloudflare.com/v1/${this.accountId}/${this.gatewayId}/workers-ai`
    } else {
      this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.accountId}/ai/run`
    }
  }

  // ===========================================================================
  // AIBatchProvider Interface
  // ===========================================================================

  createBatchRequest(customId: string, request: CompletionRequest): BatchRequest {
    const cfRequest: CloudflareAIRequest = {
      model: request.model || this.defaultModel,
      messages: request.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: false,
    }

    return {
      customId,
      actionId: customId,
      method: 'cloudflare.ai.run',
      params: cfRequest,
    }
  }

  parseBatchResult(result: BatchResult): CompletionResponse | null {
    if (result.status !== 'success' || !result.result) {
      return null
    }

    const cfResult = result.result as CloudflareAIResponse

    if (!cfResult.success) {
      return null
    }

    return {
      content: cfResult.result.response,
      model: this.defaultModel,
      usage: {
        // Cloudflare doesn't provide token counts in standard response
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
      metadata: { customId: result.customId },
    }
  }

  getSupportedModels(): string[] {
    return [
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/meta/llama-3.1-70b-instruct',
      '@cf/meta/llama-3-8b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/qwen/qwen1.5-14b-chat-awq',
      '@hf/thebloke/deepseek-coder-6.7b-instruct-awq',
    ]
  }

  getLimits(): BatchLimits {
    return {
      maxRequests: 1000, // Simulated batch limit
      resultExpiry: 24,
      maxConcurrentBatches: 10,
    }
  }

  // ===========================================================================
  // BatchProvider Interface
  // ===========================================================================

  async submitBatch(requests: BatchRequest[]): Promise<BatchSubmission> {
    const batchId = `cf_batch_${Date.now()}_${Math.random().toString(36).slice(2)}`

    // Store batch state
    this.batches.set(batchId, {
      requests,
      results: [],
      status: 'in_progress',
    })

    // Execute requests in parallel (simulated batch)
    this.executeBatch(batchId, requests).catch((error) => {
      console.error(`[CloudflareBatchProvider] Batch ${batchId} failed:`, error)
      const batch = this.batches.get(batchId)
      if (batch) {
        batch.status = 'failed'
      }
    })

    return {
      batchId,
      count: requests.length,
      // Cloudflare is fast, estimate based on request count
      estimatedCompletion: new Date(Date.now() + requests.length * 500),
    }
  }

  private async executeBatch(batchId: string, requests: BatchRequest[]): Promise<void> {
    const batch = this.batches.get(batchId)
    if (!batch) return

    const concurrency = 10 // Process 10 at a time
    const chunks: BatchRequest[][] = []

    for (let i = 0; i < requests.length; i += concurrency) {
      chunks.push(requests.slice(i, i + concurrency))
    }

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map(async (request) => {
          try {
            const cfRequest = request.params as CloudflareAIRequest
            const response = await this.runInference(cfRequest)

            return {
              customId: request.customId,
              actionId: request.actionId,
              status: 'success' as const,
              result: response,
            }
          } catch (error) {
            return {
              customId: request.customId,
              actionId: request.actionId,
              status: 'error' as const,
              error: {
                code: 'INFERENCE_ERROR',
                message: (error as Error).message,
              },
            }
          }
        })
      )

      batch.results.push(...results)
    }

    batch.status = 'completed'
  }

  private async runInference(request: CloudflareAIRequest): Promise<CloudflareAIResponse> {
    const url = this.gatewayId
      ? this.baseUrl
      : `${this.baseUrl}/${request.model}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Cloudflare AI error: ${error}`)
    }

    return response.json() as Promise<CloudflareAIResponse>
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    const batch = this.batches.get(batchId)

    if (!batch) {
      return {
        batchId,
        status: 'failed',
        counts: { total: 0, completed: 0, failed: 0 },
        error: 'Batch not found',
      }
    }

    const completed = batch.results.filter((r) => r.status === 'success').length
    const failed = batch.results.filter((r) => r.status === 'error').length

    return {
      batchId,
      status: batch.status,
      counts: {
        total: batch.requests.length,
        completed,
        failed,
      },
    }
  }

  async *streamResults(batchId: string): AsyncIterable<BatchResult> {
    const batch = this.batches.get(batchId)

    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`)
    }

    // Wait for completion if still processing
    while (batch.status === 'in_progress') {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Yield all results
    for (const result of batch.results) {
      yield result
    }
  }
}

// =============================================================================
// Factory
// =============================================================================

export function createCloudflareBatchProvider(config?: CloudflareBatchConfig): CloudflareBatchProvider {
  return new CloudflareBatchProvider(config)
}

export type { CloudflareBatchConfig }

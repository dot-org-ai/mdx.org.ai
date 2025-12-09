/**
 * Claude Message Batches API Provider
 *
 * Implements Anthropic's Message Batches API for batch processing with:
 * - 50% cost reduction vs synchronous API
 * - 24-hour completion SLA
 * - Up to 100,000 requests per batch
 * - Inline array submission
 *
 * @example
 * ```ts
 * import { ClaudeBatchProvider, createClaudeBatchProvider } from '@mdxai/claude/batch'
 *
 * const provider = createClaudeBatchProvider({
 *   apiKey: process.env.ANTHROPIC_API_KEY,
 * })
 *
 * const submission = await provider.submitBatch([
 *   provider.createBatchRequest('req1', {
 *     model: 'claude-3-5-sonnet-20241022',
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *   }),
 * ])
 *
 * for await (const result of provider.streamResults(submission.batchId)) {
 *   console.log(result)
 * }
 * ```
 *
 * @packageDocumentation
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  AIBatchProvider,
  BatchLimits,
  CompletionRequest,
  CompletionResponse,
  AnthropicBatchRequest,
  AnthropicBatchResponse,
} from '@mdxai/batch'
import type { BatchRequest, BatchStatus, BatchResult, BatchSubmission } from 'ai-database'

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for Claude batch provider
 */
export interface ClaudeBatchConfig {
  /** Anthropic API key */
  apiKey?: string
  /** Base URL for API (for proxies) */
  baseURL?: string
  /** Default model to use */
  defaultModel?: string
  /** Custom Anthropic client instance */
  client?: Anthropic
}

// =============================================================================
// Claude Batch Provider
// =============================================================================

/**
 * Anthropic Message Batches API provider implementation
 */
export class ClaudeBatchProvider implements AIBatchProvider {
  readonly name = 'claude'
  readonly supportsBatch = true
  readonly supportsFlex = true // Claude supports flex tier too

  private client: Anthropic
  private defaultModel: string

  constructor(config: ClaudeBatchConfig = {}) {
    this.client = config.client ?? new Anthropic({
      apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseURL,
    })
    this.defaultModel = config.defaultModel ?? 'claude-3-5-sonnet-20241022'
  }

  // ===========================================================================
  // AIBatchProvider Interface
  // ===========================================================================

  createBatchRequest(customId: string, request: CompletionRequest): BatchRequest {
    const anthropicRequest: AnthropicBatchRequest = {
      custom_id: customId,
      params: {
        model: request.model || this.defaultModel,
        max_tokens: request.maxTokens ?? 4096,
        messages: request.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        temperature: request.temperature,
        top_p: request.topP,
        stop_sequences: request.stop,
      },
    }

    // Add system if present
    const systemMessage = request.messages.find((m) => m.role === 'system')
    if (systemMessage || request.system) {
      anthropicRequest.params.system = systemMessage?.content ?? request.system
    }

    return {
      customId,
      actionId: customId,
      method: 'claude.messages.create',
      params: anthropicRequest,
    }
  }

  parseBatchResult(result: BatchResult): CompletionResponse | null {
    if (result.status !== 'success' || !result.result) {
      return null
    }

    const anthropicResult = result.result as AnthropicBatchResponse

    if (anthropicResult.result.type !== 'succeeded' || !anthropicResult.result.message) {
      return null
    }

    const message = anthropicResult.result.message
    const content = message.content
      ?.filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map((c) => c.text)
      .join('') ?? ''

    return {
      content,
      model: message.model,
      usage: {
        inputTokens: message.usage?.input_tokens ?? 0,
        outputTokens: message.usage?.output_tokens ?? 0,
        totalTokens:
          (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0),
      },
      stopReason: message.stop_reason,
      metadata: {
        id: message.id,
        customId: anthropicResult.custom_id,
      },
    }
  }

  getSupportedModels(): string[] {
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ]
  }

  getLimits(): BatchLimits {
    return {
      maxRequests: 100000,
      maxTokensPerRequest: 200000, // For Claude 3.5 Sonnet
      resultExpiry: 29, // Days, not hours
      maxConcurrentBatches: 100,
    }
  }

  // ===========================================================================
  // BatchProvider Interface
  // ===========================================================================

  async submitBatch(requests: BatchRequest[]): Promise<BatchSubmission> {
    // Convert to Anthropic batch format
    const batchRequests = requests.map((req) => {
      const anthropicReq = req.params as AnthropicBatchRequest
      return {
        custom_id: anthropicReq.custom_id,
        params: anthropicReq.params,
      }
    })

    // Create the batch via Anthropic API
    const batch = await this.client.beta.messages.batches.create({
      requests: batchRequests as Anthropic.Beta.Messages.BatchCreateParams['requests'],
    })

    return {
      batchId: batch.id,
      count: requests.length,
      estimatedCompletion: batch.expires_at
        ? new Date(batch.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  }

  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    const batch = await this.client.beta.messages.batches.retrieve(batchId)

    return {
      batchId: batch.id,
      status: this.mapBatchStatus(batch.processing_status),
      counts: {
        total: batch.request_counts.processing +
          batch.request_counts.succeeded +
          batch.request_counts.errored +
          batch.request_counts.canceled +
          batch.request_counts.expired,
        completed: batch.request_counts.succeeded,
        failed: batch.request_counts.errored +
          batch.request_counts.canceled +
          batch.request_counts.expired,
      },
      estimatedCompletion: batch.expires_at
        ? new Date(batch.expires_at)
        : undefined,
    }
  }

  async *streamResults(batchId: string): AsyncIterable<BatchResult> {
    // Get results from the batch
    const results = await this.client.beta.messages.batches.results(batchId)

    // Stream results as they come
    for await (const result of results) {
      const anthropicResult = result as unknown as AnthropicBatchResponse

      yield {
        customId: anthropicResult.custom_id,
        actionId: anthropicResult.custom_id,
        status: anthropicResult.result.type === 'succeeded' ? 'success' : 'error',
        result: anthropicResult.result.type === 'succeeded' ? anthropicResult : undefined,
        error: anthropicResult.result.error
          ? {
              code: anthropicResult.result.error.type,
              message: anthropicResult.result.error.message,
            }
          : undefined,
      }
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private mapBatchStatus(status: string): BatchStatus['status'] {
    switch (status) {
      case 'in_progress':
        return 'in_progress'
      case 'ended':
        return 'completed'
      case 'canceling':
      case 'canceled':
        return 'cancelled'
      default:
        return 'in_progress'
    }
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<void> {
    await this.client.beta.messages.batches.cancel(batchId)
  }

  /**
   * List all batches
   */
  async listBatches(options?: {
    limit?: number
    beforeId?: string
    afterId?: string
  }): Promise<{
    batches: BatchStatus[]
    hasMore: boolean
  }> {
    const response = await this.client.beta.messages.batches.list({
      limit: options?.limit,
      before_id: options?.beforeId,
      after_id: options?.afterId,
    })

    return {
      batches: response.data.map((batch) => ({
        batchId: batch.id,
        status: this.mapBatchStatus(batch.processing_status),
        counts: {
          total: batch.request_counts.processing +
            batch.request_counts.succeeded +
            batch.request_counts.errored +
            batch.request_counts.canceled +
            batch.request_counts.expired,
          completed: batch.request_counts.succeeded,
          failed: batch.request_counts.errored +
            batch.request_counts.canceled +
            batch.request_counts.expired,
        },
        estimatedCompletion: batch.expires_at
          ? new Date(batch.expires_at)
          : undefined,
      })),
      hasMore: response.has_more,
    }
  }

  /**
   * Get the underlying Anthropic client
   */
  getClient(): Anthropic {
    return this.client
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create a Claude batch provider
 */
export function createClaudeBatchProvider(
  config?: ClaudeBatchConfig
): ClaudeBatchProvider {
  return new ClaudeBatchProvider(config)
}

export type { ClaudeBatchConfig }

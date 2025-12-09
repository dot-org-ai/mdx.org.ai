/**
 * @mdxai/openai - OpenAI Batch API Provider
 *
 * Provides batch processing support for OpenAI models with:
 * - 50% cost reduction vs synchronous API
 * - 24-hour completion SLA
 * - Up to 50,000 requests per batch
 * - JSONL file-based submission
 *
 * @example
 * ```ts
 * import { OpenAIBatchProvider, createOpenAIBatchProvider } from '@mdxai/openai'
 *
 * const provider = createOpenAIBatchProvider({
 *   apiKey: process.env.OPENAI_API_KEY,
 * })
 *
 * // Submit a batch
 * const submission = await provider.submitBatch([
 *   provider.createBatchRequest('req1', {
 *     model: 'gpt-4o',
 *     messages: [{ role: 'user', content: 'Hello!' }],
 *   }),
 * ])
 *
 * // Wait for completion
 * for await (const result of provider.streamResults(submission.batchId)) {
 *   console.log(result)
 * }
 * ```
 *
 * @packageDocumentation
 */

import OpenAI from 'openai'
import type {
  AIBatchProvider,
  BatchLimits,
  CompletionRequest,
  CompletionResponse,
  OpenAIBatchRequest,
  OpenAIBatchResponse,
} from '@mdxai/batch'
import type { BatchRequest, BatchStatus, BatchResult, BatchSubmission } from 'ai-database'

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for OpenAI batch provider
 */
export interface OpenAIBatchConfig {
  /** OpenAI API key */
  apiKey?: string
  /** OpenAI organization ID */
  organization?: string
  /** Base URL for API (for proxies) */
  baseURL?: string
  /** Default model to use */
  defaultModel?: string
  /** Custom OpenAI client instance */
  client?: OpenAI
}

// =============================================================================
// OpenAI Batch Provider
// =============================================================================

/**
 * OpenAI batch provider implementation
 */
export class OpenAIBatchProvider implements AIBatchProvider {
  readonly name = 'openai'
  readonly supportsBatch = true
  readonly supportsFlex = false

  private client: OpenAI
  private defaultModel: string

  constructor(config: OpenAIBatchConfig = {}) {
    this.client = config.client ?? new OpenAI({
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY,
      organization: config.organization,
      baseURL: config.baseURL,
    })
    this.defaultModel = config.defaultModel ?? 'gpt-4o-mini'
  }

  // ===========================================================================
  // AIBatchProvider Interface
  // ===========================================================================

  /**
   * Create a batch request from a completion request
   */
  createBatchRequest(customId: string, request: CompletionRequest): BatchRequest {
    const openaiRequest: OpenAIBatchRequest = {
      custom_id: customId,
      method: 'POST',
      url: '/v1/chat/completions',
      body: {
        model: request.model || this.defaultModel,
        messages: request.messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        top_p: request.topP,
        stop: request.stop,
      },
    }

    // Add system message if provided and not already in messages
    if (request.system && !request.messages.some((m) => m.role === 'system')) {
      openaiRequest.body.messages.unshift({
        role: 'system',
        content: request.system,
      })
    }

    return {
      customId,
      actionId: customId, // Map to action ID for tracking
      method: 'openai.chat.completions',
      params: openaiRequest,
    }
  }

  /**
   * Parse a batch result into a completion response
   */
  parseBatchResult(result: BatchResult): CompletionResponse | null {
    if (result.status !== 'success' || !result.result) {
      return null
    }

    const openaiResult = result.result as OpenAIBatchResponse
    if (!openaiResult.response?.body) {
      return null
    }

    const body = openaiResult.response.body
    const choice = body.choices[0]

    return {
      content: choice?.message?.content ?? '',
      model: body.id ?? this.defaultModel,
      usage: {
        inputTokens: body.usage?.prompt_tokens ?? 0,
        outputTokens: body.usage?.completion_tokens ?? 0,
        totalTokens: body.usage?.total_tokens ?? 0,
      },
      stopReason: this.mapStopReason(choice?.finish_reason),
      metadata: {
        id: body.id,
        customId: openaiResult.custom_id,
      },
    }
  }

  /**
   * Get supported models for batch processing
   */
  getSupportedModels(): string[] {
    return [
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4-turbo',
      'gpt-4',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
    ]
  }

  /**
   * Get batch limits
   */
  getLimits(): BatchLimits {
    return {
      maxRequests: 50000,
      maxTokensPerRequest: 128000, // For GPT-4o
      resultExpiry: 24, // Hours
      maxConcurrentBatches: 100,
    }
  }

  // ===========================================================================
  // BatchProvider Interface (from ai-database)
  // ===========================================================================

  /**
   * Submit a batch of requests
   */
  async submitBatch(requests: BatchRequest[]): Promise<BatchSubmission> {
    // Convert to JSONL format
    const jsonlContent = requests
      .map((req) => JSON.stringify(req.params))
      .join('\n')

    // Create a file with the batch data
    const file = await this.client.files.create({
      file: new Blob([jsonlContent], { type: 'application/jsonl' }),
      purpose: 'batch',
    })

    // Create the batch
    const batch = await this.client.batches.create({
      input_file_id: file.id,
      endpoint: '/v1/chat/completions',
      completion_window: '24h',
    })

    return {
      batchId: batch.id,
      count: requests.length,
      estimatedCompletion: batch.expires_at
        ? new Date(batch.expires_at * 1000)
        : new Date(Date.now() + 24 * 60 * 60 * 1000),
    }
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string): Promise<BatchStatus> {
    const batch = await this.client.batches.retrieve(batchId)

    return {
      batchId: batch.id,
      status: this.mapBatchStatus(batch.status),
      counts: {
        total: batch.request_counts?.total ?? 0,
        completed: batch.request_counts?.completed ?? 0,
        failed: batch.request_counts?.failed ?? 0,
      },
      estimatedCompletion: batch.expires_at
        ? new Date(batch.expires_at * 1000)
        : undefined,
      error: batch.errors?.data?.[0]?.message,
    }
  }

  /**
   * Stream results from a completed batch
   */
  async *streamResults(batchId: string): AsyncIterable<BatchResult> {
    const batch = await this.client.batches.retrieve(batchId)

    if (!batch.output_file_id) {
      throw new Error('Batch has no output file')
    }

    // Download the output file
    const fileResponse = await this.client.files.content(batch.output_file_id)
    const content = await fileResponse.text()

    // Parse JSONL and yield results
    for (const line of content.split('\n')) {
      if (!line.trim()) continue

      const result = JSON.parse(line) as OpenAIBatchResponse

      yield {
        customId: result.custom_id,
        actionId: result.custom_id,
        status: result.error ? 'error' : 'success',
        result: result.error ? undefined : result,
        error: result.error
          ? { code: result.error.code, message: result.error.message }
          : undefined,
      }
    }
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private mapBatchStatus(
    status: string
  ): BatchStatus['status'] {
    switch (status) {
      case 'validating':
        return 'validating'
      case 'in_progress':
        return 'in_progress'
      case 'completed':
        return 'completed'
      case 'failed':
        return 'failed'
      case 'expired':
        return 'expired'
      case 'cancelled':
      case 'cancelling':
        return 'cancelled'
      default:
        return 'in_progress'
    }
  }

  private mapStopReason(
    reason?: string
  ): CompletionResponse['stopReason'] {
    switch (reason) {
      case 'stop':
        return 'end_turn'
      case 'length':
        return 'max_tokens'
      case 'stop_sequence':
        return 'stop_sequence'
      default:
        return 'end_turn'
    }
  }

  // ===========================================================================
  // Additional Methods
  // ===========================================================================

  /**
   * Cancel a batch
   */
  async cancelBatch(batchId: string): Promise<void> {
    await this.client.batches.cancel(batchId)
  }

  /**
   * List all batches
   */
  async listBatches(options?: { limit?: number; after?: string }): Promise<{
    batches: BatchStatus[]
    hasMore: boolean
    nextCursor?: string
  }> {
    const response = await this.client.batches.list({
      limit: options?.limit,
      after: options?.after,
    })

    return {
      batches: response.data.map((batch) => ({
        batchId: batch.id,
        status: this.mapBatchStatus(batch.status),
        counts: {
          total: batch.request_counts?.total ?? 0,
          completed: batch.request_counts?.completed ?? 0,
          failed: batch.request_counts?.failed ?? 0,
        },
        estimatedCompletion: batch.expires_at
          ? new Date(batch.expires_at * 1000)
          : undefined,
      })),
      hasMore: response.has_more,
      nextCursor: response.data[response.data.length - 1]?.id,
    }
  }

  /**
   * Get the underlying OpenAI client
   */
  getClient(): OpenAI {
    return this.client
  }
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Create an OpenAI batch provider
 */
export function createOpenAIBatchProvider(
  config?: OpenAIBatchConfig
): OpenAIBatchProvider {
  return new OpenAIBatchProvider(config)
}

// Re-export types
export type {
  OpenAIBatchConfig,
}

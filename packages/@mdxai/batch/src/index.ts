/**
 * @mdxai/batch - Unified batch processing for AI providers
 *
 * Provides a common interface for batch API operations across:
 * - OpenAI Batch API (50% discount, 24h SLA)
 * - Anthropic Message Batches (50% discount, 24h SLA)
 * - Google Vertex AI Batch (50% discount)
 * - AWS Bedrock Batch Inference (50% discount)
 * - Cloudflare Workers AI (async processing)
 *
 * @packageDocumentation
 */

import type {
  ExecutionPriority,
  BatchProvider as BaseBatchProvider,
  BatchRequest,
  BatchStatus,
  BatchResult,
  BatchSubmission,
} from 'ai-database'

// Re-export base types from ai-database
export type { ExecutionPriority, BatchRequest, BatchStatus, BatchResult, BatchSubmission }

// =============================================================================
// Message Types (Common across providers)
// =============================================================================

/**
 * Standard message format for chat completions
 */
export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Common completion request parameters
 */
export interface CompletionRequest {
  /** Model identifier */
  model: string
  /** Messages for chat completion */
  messages: Message[]
  /** Maximum tokens to generate */
  maxTokens?: number
  /** Temperature for sampling */
  temperature?: number
  /** Top-p sampling */
  topP?: number
  /** Stop sequences */
  stop?: string[]
  /** System prompt (extracted to messages for some providers) */
  system?: string
  /** Additional provider-specific options */
  options?: Record<string, unknown>
}

/**
 * Common completion response
 */
export interface CompletionResponse {
  /** Generated content */
  content: string
  /** Model used */
  model: string
  /** Token usage */
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  /** Stop reason */
  stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence'
  /** Provider-specific metadata */
  metadata?: Record<string, unknown>
}

// =============================================================================
// Batch Provider Interface
// =============================================================================

/**
 * Extended batch provider interface with AI-specific methods
 */
export interface AIBatchProvider extends BaseBatchProvider {
  /**
   * Create a batch request from a completion request
   */
  createBatchRequest(
    customId: string,
    request: CompletionRequest
  ): BatchRequest

  /**
   * Parse a batch result into a completion response
   */
  parseBatchResult(result: BatchResult): CompletionResponse | null

  /**
   * Get supported models for batch processing
   */
  getSupportedModels(): string[]

  /**
   * Get batch limits for this provider
   */
  getLimits(): BatchLimits
}

/**
 * Batch processing limits by provider
 */
export interface BatchLimits {
  /** Maximum requests per batch */
  maxRequests: number
  /** Maximum tokens per request */
  maxTokensPerRequest?: number
  /** Maximum total tokens per batch */
  maxTotalTokens?: number
  /** Batch result expiry time (hours) */
  resultExpiry: number
  /** Maximum concurrent batches */
  maxConcurrentBatches?: number
  /** Minimum batch size for discount */
  minBatchSize?: number
}

// =============================================================================
// Provider-Specific Types
// =============================================================================

/**
 * OpenAI batch API types
 */
export interface OpenAIBatchRequest {
  custom_id: string
  method: 'POST'
  url: '/v1/chat/completions'
  body: {
    model: string
    messages: Array<{ role: string; content: string }>
    max_tokens?: number
    temperature?: number
    top_p?: number
    stop?: string[]
  }
}

export interface OpenAIBatchResponse {
  id: string
  custom_id: string
  response: {
    status_code: number
    body: {
      id: string
      choices: Array<{
        message: { role: string; content: string }
        finish_reason: string
      }>
      usage: {
        prompt_tokens: number
        completion_tokens: number
        total_tokens: number
      }
    }
  } | null
  error: {
    code: string
    message: string
  } | null
}

/**
 * Anthropic batch API types
 */
export interface AnthropicBatchRequest {
  custom_id: string
  params: {
    model: string
    max_tokens: number
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    system?: string
    temperature?: number
    top_p?: number
    stop_sequences?: string[]
  }
}

export interface AnthropicBatchResponse {
  custom_id: string
  result: {
    type: 'succeeded' | 'errored' | 'expired' | 'canceled'
    message?: {
      id: string
      content: Array<{ type: 'text'; text: string }>
      model: string
      stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence'
      usage: {
        input_tokens: number
        output_tokens: number
      }
    }
    error?: {
      type: string
      message: string
    }
  }
}

/**
 * Google Vertex AI batch types
 */
export interface GoogleBatchRequest {
  request: {
    contents: Array<{
      role: 'user' | 'model'
      parts: Array<{ text: string }>
    }>
    systemInstruction?: {
      parts: Array<{ text: string }>
    }
    generationConfig?: {
      maxOutputTokens?: number
      temperature?: number
      topP?: number
      stopSequences?: string[]
    }
  }
}

export interface GoogleBatchResponse {
  predictions: Array<{
    candidates: Array<{
      content: {
        role: string
        parts: Array<{ text: string }>
      }
      finishReason: string
    }>
    usageMetadata: {
      promptTokenCount: number
      candidatesTokenCount: number
      totalTokenCount: number
    }
  }>
}

/**
 * AWS Bedrock batch types
 */
export interface BedrockBatchRequest {
  recordId: string
  modelInput: {
    anthropic_version?: string
    max_tokens: number
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    system?: string
    temperature?: number
    top_p?: number
    stop_sequences?: string[]
  }
}

export interface BedrockBatchResponse {
  recordId: string
  modelOutput?: {
    id: string
    content: Array<{ type: 'text'; text: string }>
    stop_reason: string
    usage: {
      input_tokens: number
      output_tokens: number
    }
  }
  error?: string
}

// =============================================================================
// Batch Manager
// =============================================================================

/**
 * Manages batch operations across multiple providers
 */
export class BatchManager {
  private providers = new Map<string, AIBatchProvider>()
  private defaultProvider: string | null = null

  /**
   * Register a batch provider
   */
  registerProvider(name: string, provider: AIBatchProvider): void {
    this.providers.set(name, provider)
    if (!this.defaultProvider) {
      this.defaultProvider = name
    }
  }

  /**
   * Set the default provider
   */
  setDefaultProvider(name: string): void {
    if (!this.providers.has(name)) {
      throw new Error(`Provider not registered: ${name}`)
    }
    this.defaultProvider = name
  }

  /**
   * Get a provider by name
   */
  getProvider(name?: string): AIBatchProvider {
    const providerName = name ?? this.defaultProvider
    if (!providerName) {
      throw new Error('No default provider set')
    }
    const provider = this.providers.get(providerName)
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`)
    }
    return provider
  }

  /**
   * Get all registered providers
   */
  getProviders(): Map<string, AIBatchProvider> {
    return new Map(this.providers)
  }

  /**
   * Submit a batch to a provider
   */
  async submitBatch(
    requests: CompletionRequest[],
    provider?: string
  ): Promise<BatchSubmission> {
    const p = this.getProvider(provider)

    const batchRequests = requests.map((req, i) =>
      p.createBatchRequest(`req_${i}_${Date.now()}`, req)
    )

    return p.submitBatch(batchRequests)
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId: string, provider?: string): Promise<BatchStatus> {
    return this.getProvider(provider).getBatchStatus(batchId)
  }

  /**
   * Stream results from a batch
   */
  async *streamResults(
    batchId: string,
    provider?: string
  ): AsyncIterable<CompletionResponse> {
    const p = this.getProvider(provider)

    for await (const result of p.streamResults(batchId)) {
      const response = p.parseBatchResult(result)
      if (response) {
        yield response
      }
    }
  }

  /**
   * Wait for batch completion and return all results
   */
  async waitForBatch(
    batchId: string,
    provider?: string,
    pollInterval = 5000
  ): Promise<CompletionResponse[]> {
    const p = this.getProvider(provider)

    // Poll until complete
    while (true) {
      const status = await p.getBatchStatus(batchId)

      if (status.status === 'completed') {
        break
      }

      if (status.status === 'failed' || status.status === 'cancelled' || status.status === 'expired') {
        throw new Error(`Batch ${status.status}: ${status.error ?? 'Unknown error'}`)
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval))
    }

    // Collect all results
    const results: CompletionResponse[] = []
    for await (const response of this.streamResults(batchId, provider)) {
      results.push(response)
    }

    return results
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert standard messages to provider-specific format
 */
export function normalizeMessages(
  messages: Message[],
  provider: 'openai' | 'anthropic' | 'google' | 'bedrock'
): { messages: unknown[]; system?: string } {
  const systemMessages = messages.filter((m) => m.role === 'system')
  const chatMessages = messages.filter((m) => m.role !== 'system')
  const system = systemMessages.map((m) => m.content).join('\n') || undefined

  switch (provider) {
    case 'openai':
      // OpenAI supports system role directly
      return { messages }

    case 'anthropic':
    case 'bedrock':
      // Anthropic/Bedrock use separate system parameter
      return {
        messages: chatMessages.map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        system,
      }

    case 'google':
      // Google uses different role names
      return {
        messages: chatMessages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
        system,
      }
  }
}

/**
 * Estimate token count (rough approximation)
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4)
}

/**
 * Calculate batch discount
 */
export function calculateDiscount(
  provider: 'openai' | 'anthropic' | 'google' | 'bedrock' | 'cloudflare',
  priority: ExecutionPriority
): number {
  // Batch tier gets 50% discount on most providers
  if (priority === 'batch') {
    switch (provider) {
      case 'openai':
      case 'anthropic':
      case 'google':
      case 'bedrock':
        return 0.5 // 50% discount
      case 'cloudflare':
        return 0 // No discount, just async
    }
  }

  // Flex tier varies by provider
  if (priority === 'flex') {
    switch (provider) {
      case 'anthropic':
        return 0.25 // 25% discount for flex
      default:
        return 0
    }
  }

  return 0
}

// =============================================================================
// Singleton Instance
// =============================================================================

let defaultManager: BatchManager | null = null

/**
 * Get the default batch manager
 */
export function getBatchManager(): BatchManager {
  if (!defaultManager) {
    defaultManager = new BatchManager()
  }
  return defaultManager
}

/**
 * Set the default batch manager
 */
export function setBatchManager(manager: BatchManager | null): void {
  defaultManager = manager
}

/**
 * Create a new batch manager
 */
export function createBatchManager(): BatchManager {
  return new BatchManager()
}

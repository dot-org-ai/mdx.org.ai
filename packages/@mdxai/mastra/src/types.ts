/**
 * @mdxai/mastra Types
 *
 * @packageDocumentation
 */

import type { Database } from '@mdxdb/fs'
import type { MDXLDData, MDXLDDocument } from 'mdxld'

/**
 * Mastra agent configuration from MDX document
 */
export interface MastraAgentConfig {
  /** Agent name */
  name: string
  /** Model to use (e.g., 'claude-sonnet-4', 'gpt-4') */
  model?: string
  /** System instructions/prompt */
  instructions?: string
  /** Tool names to enable */
  tools?: string[]
  /** Memory configuration */
  memory?: {
    /** Enable memory */
    enabled?: boolean
    /** Memory backend */
    backend?: 'vector' | 'conversation' | 'both'
  }
  /** Additional configuration */
  config?: Record<string, unknown>
}

/**
 * Mastra workflow step definition
 */
export interface MastraWorkflowStep {
  /** Step name */
  name: string
  /** Step description */
  description?: string
  /** Agent to use for this step */
  agent?: string
  /** Step handler function */
  handler: (context: MastraWorkflowContext) => Promise<unknown>
}

/**
 * Mastra workflow context
 */
export interface MastraWorkflowContext {
  /** Input data */
  input: unknown
  /** Previous step outputs */
  steps: Record<string, { output: unknown }>
  /** Available agents */
  agents: Record<string, MastraAgent>
  /** Workflow state */
  state: Record<string, unknown>
}

/**
 * Mastra agent instance
 */
export interface MastraAgent {
  /** Agent name */
  name: string
  /** Run the agent with a prompt */
  run(prompt: string, options?: MastraRunOptions): Promise<MastraAgentResponse>
  /** Stream agent responses */
  stream(prompt: string, options?: MastraRunOptions): AsyncGenerator<MastraStreamChunk>
  /** Generate structured output */
  generate<T = unknown>(prompt: string, options?: MastraGenerateOptions): Promise<T>
}

/**
 * Options for running an agent
 */
export interface MastraRunOptions {
  /** Additional context */
  context?: Record<string, unknown>
  /** Temperature */
  temperature?: number
  /** Max tokens */
  maxTokens?: number
  /** Tools to enable */
  tools?: string[]
  /** Memory settings */
  memory?: {
    /** Thread ID for conversation continuity */
    threadId?: string
    /** Enable memory for this run */
    enabled?: boolean
  }
}

/**
 * Agent response
 */
export interface MastraAgentResponse {
  /** Response text */
  text: string
  /** Tool calls made */
  toolCalls?: MastraToolCall[]
  /** Metadata */
  metadata?: {
    /** Model used */
    model?: string
    /** Tokens used */
    usage?: {
      prompt: number
      completion: number
      total: number
    }
    /** Finish reason */
    finishReason?: string
  }
}

/**
 * Tool call information
 */
export interface MastraToolCall {
  /** Tool name */
  name: string
  /** Tool input */
  input: Record<string, unknown>
  /** Tool output */
  output?: unknown
}

/**
 * Stream chunk from agent
 */
export interface MastraStreamChunk {
  /** Chunk type */
  type: 'text' | 'tool_call' | 'done'
  /** Text delta (for text chunks) */
  text?: string
  /** Tool call (for tool_call chunks) */
  toolCall?: MastraToolCall
  /** Metadata (for done chunks) */
  metadata?: MastraAgentResponse['metadata']
}

/**
 * Options for structured generation
 */
export interface MastraGenerateOptions {
  /** JSON schema for output */
  schema?: Record<string, unknown>
  /** Zod schema for output */
  zodSchema?: unknown
  /** Temperature */
  temperature?: number
  /** Max tokens */
  maxTokens?: number
}

/**
 * Mastra workflow configuration
 */
export interface MastraWorkflowConfig {
  /** Workflow name */
  name: string
  /** Workflow description */
  description?: string
  /** MDX documents for agents */
  agents?: Record<string, MDXLDDocument<MDXLDData>>
  /** Database for state persistence */
  database?: Database<MDXLDData>
  /** Initial state */
  state?: Record<string, unknown>
}

/**
 * Mastra workflow instance
 */
export interface MastraWorkflow {
  /** Workflow name */
  name: string
  /** Add a step to the workflow */
  step(name: string, handler: MastraWorkflowStep['handler']): this
  /** Add a parallel step */
  parallel(steps: Record<string, MastraWorkflowStep['handler']>): this
  /** Add a conditional branch */
  branch(
    condition: (context: MastraWorkflowContext) => boolean | Promise<boolean>,
    trueBranch: MastraWorkflowStep['handler'],
    falseBranch?: MastraWorkflowStep['handler']
  ): this
  /** Run the workflow */
  run(input: unknown): Promise<unknown>
  /** Stream workflow execution */
  stream(input: unknown): AsyncGenerator<MastraWorkflowEvent>
}

/**
 * Workflow execution event
 */
export interface MastraWorkflowEvent {
  /** Event type */
  type: 'step_start' | 'step_complete' | 'step_error' | 'workflow_complete'
  /** Step name */
  step?: string
  /** Step output */
  output?: unknown
  /** Error if any */
  error?: Error
  /** Workflow state */
  state?: Record<string, unknown>
}

/**
 * Mastra tool definition
 */
export interface MastraTool {
  /** Tool name */
  name: string
  /** Tool description */
  description: string
  /** Tool input schema */
  schema: Record<string, unknown>
  /** Tool handler */
  handler: (input: Record<string, unknown>) => Promise<unknown>
}

/**
 * Memory backend configuration
 */
export interface MastraMemoryConfig {
  /** Memory type */
  type: 'vector' | 'conversation' | 'both'
  /** Database for storage */
  database?: Database<MDXLDData>
  /** Collection name */
  collection?: string
  /** Embedding model */
  embeddingModel?: string
}

/**
 * Core types for Agent Session Platform
 *
 * These types define the shape of session state, events, and UI components
 * for the MDX-first progressive UI system.
 */

/**
 * Session execution status
 */
export type SessionStatus = 'idle' | 'running' | 'completed' | 'error'

/**
 * Session execution mode
 */
export type ExecutionMode = 'do-native' | 'sandbox' | 'local'

/**
 * Plan step status for execution tracking
 */
export type PlanStepStatus = 'pending' | 'active' | 'completed' | 'skipped'

/**
 * Todo item status (matches digital-tasks markers)
 */
export type TodoStatus = 'pending' | 'in_progress' | 'completed'

/**
 * Tool execution status
 */
export type ToolStatus = 'running' | 'success' | 'error'

/**
 * Main session state structure
 * Aggregates all data for a Claude Agent SDK session
 */
export interface SessionState {
  id: string
  status: SessionStatus
  executionMode?: ExecutionMode
  model: string
  cwd?: string
  startedAt: Date
  completedAt?: Date
  error?: string

  // Extracted from SDK messages
  plan: PlanStep[]
  todos: Todo[]
  tools: ToolExecution[]
  messages: Message[]

  // From result message
  cost: number
  duration: number
  usage: Usage
}

/**
 * Plan step for execution tracking
 * Extracted from agent's reasoning or explicit planning
 */
export interface PlanStep {
  id: string
  description: string
  status: PlanStepStatus
}

/**
 * Todo item from TodoWrite tool calls
 */
export interface Todo {
  content: string
  activeForm: string
  status: TodoStatus
}

/**
 * Tool execution tracking
 * Captures input, output, timing for each tool call
 */
export interface ToolExecution {
  id: string
  tool: string
  input: unknown
  output?: unknown
  status: ToolStatus
  startedAt: Date
  completedAt?: Date
  duration?: number
  error?: string
}

/**
 * Message from Claude Agent SDK
 */
export interface Message {
  id: string
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result'
  content: string | unknown
  timestamp: Date
}

/**
 * Token usage tracking
 */
export interface Usage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  cacheCreationTokens?: number
  cacheReadTokens?: number
}

/**
 * Stream event from Claude Agent SDK
 * Normalized format for both local and DO-native execution
 */
export type StreamEvent =
  | AssistantEvent
  | ToolUseEvent
  | ToolResultEvent
  | ResultEvent
  | ErrorEvent
  | UnknownEvent

export interface AssistantEvent {
  type: 'assistant'
  content: string
  timestamp?: Date
}

export interface ToolUseEvent {
  type: 'tool_use'
  id: string
  tool: string
  input: unknown
  timestamp?: Date
}

export interface ToolResultEvent {
  type: 'tool_result'
  id: string
  output: unknown
  error?: string
  timestamp?: Date
}

export interface ResultEvent {
  type: 'result'
  cost: number
  duration: number
  usage: Usage
  timestamp?: Date
}

export interface ErrorEvent {
  type: 'error'
  error: string
  timestamp?: Date
}

export interface UnknownEvent {
  type: 'unknown'
  raw: unknown
  timestamp?: Date
}

/**
 * Session configuration for creating new sessions
 */
export interface SessionConfig {
  sessionId?: string
  prompt: string
  model?: string
  cwd?: string
  executionMode?: ExecutionMode
  repo?: string
  files?: Record<string, string>
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: 'auth'; token: string }
  | { type: 'state'; data: SessionState }
  | { type: 'event'; event: StreamEvent; state: SessionState }
  | { type: 'error'; error: string }

/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  SESSIONS: DurableObjectNamespace
  OAUTH_ISSUER?: string
  DATABASE_URL?: string
  ANTHROPIC_API_KEY?: string
}

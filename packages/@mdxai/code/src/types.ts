/**
 * Core types for agent sessions
 * Re-exported from @mdxai/service in the future
 */

export interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  model: string
  cwd: string
  startedAt: Date
  completedAt?: Date

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

export interface PlanStep {
  id: string
  description: string
  status: 'pending' | 'active' | 'completed' | 'skipped'
}

export interface Todo {
  content: string
  activeForm: string
  status: 'pending' | 'in_progress' | 'completed'
}

export interface ToolExecution {
  id: string
  tool: string
  input: unknown
  output?: unknown
  status: 'running' | 'success' | 'error'
  startedAt: Date
  completedAt?: Date
}

export interface Message {
  id: string
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result'
  content: string
  timestamp: Date
}

export interface Usage {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

export interface StreamEvent {
  type: string
  data?: unknown
  timestamp: Date
}

export interface SessionConfig {
  sessionId: string
  prompt: string
  cwd?: string
  model?: string
  mode?: 'local' | 'native' | 'sandbox'
}

export interface SpawnOptions {
  prompt: string
  cwd?: string
  model?: string
}

export interface SessionResponse {
  sessionId: string
  status: string
  url: string
}

/**
 * Agent SDK V2 integration
 *
 * This module provides integration with Claude Agent SDK V2 for DO-native execution.
 * Agents can run directly in the Durable Object without needing a separate VM.
 *
 * TODO: Implement full Agent SDK V2 integration
 */

import type { StreamEvent } from '../types'

export * from './session'
export * from './tools'
export * from './events'

/**
 * Agent configuration
 */
export interface AgentConfig {
  sessionId: string
  model?: string
  onEvent: (event: StreamEvent) => void
}

/**
 * Tool definition for Agent SDK
 */
export interface Tool {
  name: string
  description: string
  input_schema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
  execute: (input: unknown) => Promise<unknown>
}

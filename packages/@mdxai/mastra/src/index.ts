/**
 * @mdxai/mastra - Mastra AI Framework Integration
 *
 * Integrates Mastra AI framework with MDX-based agent and workflow definitions.
 * Provides agent creation, workflow orchestration, tool integration, memory management,
 * and streaming support.
 *
 * @packageDocumentation
 */

export const name = '@mdxai/mastra'

// Agent creation and management
export { createMastraAgent, createMastraAgents } from './agent.js'

// Workflow orchestration
export { createMastraWorkflow } from './workflow.js'

// Tool integration
export { createMastraDbTools, createMastraToolsFromDocs } from './tools.js'

// Memory management
export { createMastraMemory, type MastraMemory, type ConversationEntry, type VectorEntry } from './memory.js'

// Types
export type {
  MastraAgent,
  MastraAgentConfig,
  MastraAgentResponse,
  MastraRunOptions,
  MastraStreamChunk,
  MastraGenerateOptions,
  MastraWorkflow,
  MastraWorkflowConfig,
  MastraWorkflowContext,
  MastraWorkflowStep,
  MastraWorkflowEvent,
  MastraTool,
  MastraToolCall,
  MastraMemoryConfig,
} from './types.js'

// Re-export relevant types from dependencies
export type { Database, ListOptions, SearchOptions, GetOptions, SetOptions, DeleteOptions } from '@mdxdb/fs'
export type { MDXLDDocument, MDXLDData } from 'mdxld'

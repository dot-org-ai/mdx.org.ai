/**
 * @mdxai/mastra Agent
 *
 * Agent creation and management with Mastra
 *
 * @packageDocumentation
 */

import type { MDXLDDocument, MDXLDData } from 'mdxld'
import type {
  MastraAgent,
  MastraAgentConfig,
  MastraAgentResponse,
  MastraRunOptions,
  MastraStreamChunk,
  MastraGenerateOptions,
  MastraTool,
} from './types.js'

/**
 * Create a Mastra agent from an MDX document
 *
 * @example
 * ```ts
 * import { createMastraAgent } from '@mdxai/mastra'
 * import { parse } from 'mdxld'
 *
 * const doc = parse(`---
 * $type: Agent
 * name: Assistant
 * model: claude-sonnet-4
 * tools:
 *   - search
 *   - calculator
 * ---
 *
 * You are a helpful assistant that can search the web and perform calculations.
 * `)
 *
 * const agent = createMastraAgent(doc)
 * const response = await agent.run('What is 2 + 2?')
 * ```
 */
export function createMastraAgent(
  doc: MDXLDDocument<MDXLDData>,
  options: {
    tools?: MastraTool[]
    config?: Record<string, unknown>
  } = {}
): MastraAgent {
  // Extract agent configuration from document
  const config: MastraAgentConfig = {
    name: doc.data.name as string || 'agent',
    model: doc.data.model as string,
    instructions: doc.content || (doc.data.instructions as string),
    tools: doc.data.tools as string[] | undefined,
    memory: doc.data.memory as MastraAgentConfig['memory'],
    config: { ...(doc.data.config as Record<string, unknown>), ...options.config },
  }

  // Memory storage for conversation history
  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = []

  /**
   * Run the agent with a prompt
   */
  async function run(prompt: string, runOptions: MastraRunOptions = {}): Promise<MastraAgentResponse> {
    // Add user message to history
    conversationHistory.push({ role: 'user', content: prompt })

    // Build messages array
    const messages = [...conversationHistory]

    // Simulate agent response (in real implementation, would call Mastra Agent API)
    // For now, return a placeholder response
    const response: MastraAgentResponse = {
      text: `Agent ${config.name} received: ${prompt}`,
      metadata: {
        model: config.model || 'default',
        usage: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        finishReason: 'stop',
      },
    }

    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: response.text })

    return response
  }

  /**
   * Stream agent responses
   */
  async function* stream(prompt: string, runOptions: MastraRunOptions = {}): AsyncGenerator<MastraStreamChunk> {
    // Add user message to history
    conversationHistory.push({ role: 'user', content: prompt })

    // Simulate streaming response
    const responseText = `Agent ${config.name} received: ${prompt}`
    const words = responseText.split(' ')

    for (const word of words) {
      yield {
        type: 'text',
        text: word + ' ',
      }
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 50))
    }

    // Add assistant response to history
    conversationHistory.push({ role: 'assistant', content: responseText })

    // Final chunk
    yield {
      type: 'done',
      metadata: {
        model: config.model || 'default',
        usage: {
          prompt: 0,
          completion: 0,
          total: 0,
        },
        finishReason: 'stop',
      },
    }
  }

  /**
   * Generate structured output
   */
  async function generate<T = unknown>(prompt: string, generateOptions: MastraGenerateOptions = {}): Promise<T> {
    // In real implementation, would use Mastra's structured output generation
    // For now, return a placeholder
    const response = await run(prompt)
    return response.text as T
  }

  return {
    name: config.name,
    run,
    stream,
    generate,
  }
}

/**
 * Create multiple agents from MDX documents
 *
 * @example
 * ```ts
 * import { createMastraAgents } from '@mdxai/mastra'
 *
 * const agents = createMastraAgents({
 *   researcher: researcherDoc,
 *   writer: writerDoc,
 *   editor: editorDoc,
 * })
 *
 * const research = await agents.researcher.run('Research AI trends')
 * const article = await agents.writer.run(`Write about: ${research.text}`)
 * ```
 */
export function createMastraAgents(
  documents: Record<string, MDXLDDocument<MDXLDData>>,
  options: {
    tools?: MastraTool[]
    config?: Record<string, unknown>
  } = {}
): Record<string, MastraAgent> {
  const agents: Record<string, MastraAgent> = {}

  for (const [name, doc] of Object.entries(documents)) {
    agents[name] = createMastraAgent(doc, options)
  }

  return agents
}

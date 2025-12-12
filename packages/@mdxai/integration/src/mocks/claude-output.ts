/**
 * Mock Claude Code Output Generator
 *
 * Generates realistic Claude Code stream-json output for integration testing.
 * Mimics the actual output format from `claude --output-format stream-json`
 */

import type {
  StreamEvent,
  AssistantEvent,
  ToolUseEvent,
  ToolResultEvent,
  ResultEvent,
  ErrorEvent,
  Usage,
  Todo,
} from '@mdxai/service'

/**
 * Configuration for generating a complete session flow
 */
export interface SessionFlowConfig {
  steps: StepConfig[]
  model?: string
  baseDelay?: number
}

/**
 * Configuration for individual steps in a session
 */
export type StepConfig =
  | AssistantStepConfig
  | ToolStepConfig
  | ErrorStepConfig

export interface AssistantStepConfig {
  type: 'assistant'
  content: string
}

export interface ToolStepConfig {
  type: 'tool'
  tool: string
  input: unknown
  output?: unknown
  error?: string
}

export interface ErrorStepConfig {
  type: 'error'
  error: string
}

/**
 * Generate a unique ID for tool uses
 */
let toolUseIdCounter = 0
export function generateToolId(): string {
  return `toolu_${++toolUseIdCounter}_${Date.now().toString(36)}`
}

/**
 * Reset the tool ID counter (useful for tests)
 */
export function resetToolIdCounter(): void {
  toolUseIdCounter = 0
}

/**
 * Create a mock assistant event
 */
export function mockAssistantEvent(content: string): AssistantEvent {
  return {
    type: 'assistant',
    content,
    timestamp: new Date(),
  }
}

/**
 * Create a mock tool_use event
 */
export function mockToolUseEvent(
  tool: string,
  input: unknown,
  id?: string
): ToolUseEvent {
  return {
    type: 'tool_use',
    id: id ?? generateToolId(),
    tool,
    input,
    timestamp: new Date(),
  }
}

/**
 * Create a mock tool_result event
 */
export function mockToolResultEvent(
  id: string,
  output: unknown,
  error?: string
): ToolResultEvent {
  return {
    type: 'tool_result',
    id,
    output,
    error,
    timestamp: new Date(),
  }
}

/**
 * Create a mock result event with cost and usage
 */
export function mockResultEvent(cost: number, usage: Usage): ResultEvent {
  return {
    type: 'result',
    cost,
    duration: usage.totalTokens * 10, // Approximate duration based on tokens
    usage,
    timestamp: new Date(),
  }
}

/**
 * Create a mock error event
 */
export function mockErrorEvent(error: string): ErrorEvent {
  return {
    type: 'error',
    error,
    timestamp: new Date(),
  }
}

/**
 * Create a mock TodoWrite tool_use event
 */
export function mockTodoWriteEvent(todos: Todo[]): ToolUseEvent {
  return mockToolUseEvent('TodoWrite', { todos })
}

/**
 * Create a mock Read tool_use event
 */
export function mockReadEvent(filePath: string): ToolUseEvent {
  return mockToolUseEvent('Read', { file_path: filePath })
}

/**
 * Create a mock Write tool_use event
 */
export function mockWriteEvent(filePath: string, content: string): ToolUseEvent {
  return mockToolUseEvent('Write', { file_path: filePath, content })
}

/**
 * Create a mock Edit tool_use event
 */
export function mockEditEvent(
  filePath: string,
  oldString: string,
  newString: string
): ToolUseEvent {
  return mockToolUseEvent('Edit', {
    file_path: filePath,
    old_string: oldString,
    new_string: newString,
  })
}

/**
 * Create a mock Bash tool_use event
 */
export function mockBashEvent(command: string): ToolUseEvent {
  return mockToolUseEvent('Bash', { command })
}

/**
 * Create a mock Grep tool_use event
 */
export function mockGrepEvent(pattern: string, path?: string): ToolUseEvent {
  return mockToolUseEvent('Grep', { pattern, path })
}

/**
 * Create a mock Glob tool_use event
 */
export function mockGlobEvent(pattern: string, path?: string): ToolUseEvent {
  return mockToolUseEvent('Glob', { pattern, path })
}

/**
 * Generate usage stats based on content size
 */
export function generateUsage(
  inputTokens: number = 1000,
  outputTokens: number = 500,
  cacheCreationTokens?: number,
  cacheReadTokens?: number
): Usage {
  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cacheCreationTokens,
    cacheReadTokens,
  }
}

/**
 * Generate cost based on token usage
 * Using approximate Claude pricing: $15/MTok input, $75/MTok output
 */
export function calculateCost(usage: Usage): number {
  const inputCost = (usage.inputTokens / 1_000_000) * 15
  const outputCost = (usage.outputTokens / 1_000_000) * 75
  return parseFloat((inputCost + outputCost).toFixed(4))
}

/**
 * Generate a complete session flow from step configurations
 * Returns an array of StreamEvents in order
 */
export function generateSessionFlow(config: SessionFlowConfig): StreamEvent[] {
  const events: StreamEvent[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const step of config.steps) {
    switch (step.type) {
      case 'assistant':
        events.push(mockAssistantEvent(step.content))
        totalOutputTokens += Math.ceil(step.content.length / 4) // Rough token estimate
        break

      case 'tool': {
        const toolUseEvent = mockToolUseEvent(step.tool, step.input)
        events.push(toolUseEvent)

        // Simulate tool execution delay would happen here in real scenario
        const resultEvent = mockToolResultEvent(
          toolUseEvent.id,
          step.output ?? `Result of ${step.tool}`,
          step.error
        )
        events.push(resultEvent)

        totalInputTokens += 100 // Tool input tokens estimate
        totalOutputTokens += 50 // Tool result tokens estimate
        break
      }

      case 'error':
        events.push(mockErrorEvent(step.error))
        break
    }
  }

  // Add final result event
  const usage = generateUsage(totalInputTokens, totalOutputTokens)
  events.push(mockResultEvent(calculateCost(usage), usage))

  return events
}

/**
 * Generate a realistic session flow for a simple file read task
 */
export function generateReadFileFlow(filePath: string, content: string): StreamEvent[] {
  return generateSessionFlow({
    steps: [
      { type: 'assistant', content: `I'll read the file at ${filePath} for you.` },
      { type: 'tool', tool: 'Read', input: { file_path: filePath }, output: content },
      { type: 'assistant', content: `Here's the content of the file:\n\n${content}` },
    ],
  })
}

/**
 * Generate a realistic session flow for a code editing task
 */
export function generateEditCodeFlow(
  filePath: string,
  description: string,
  oldCode: string,
  newCode: string
): StreamEvent[] {
  return generateSessionFlow({
    steps: [
      {
        type: 'assistant',
        content: `I'll help you ${description}. Let me first read the current file.`,
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Read current file', activeForm: 'Reading current file', status: 'in_progress' },
            { content: 'Make the edit', activeForm: 'Making the edit', status: 'pending' },
            { content: 'Verify changes', activeForm: 'Verifying changes', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'Read',
        input: { file_path: filePath },
        output: oldCode,
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Read current file', activeForm: 'Reading current file', status: 'completed' },
            { content: 'Make the edit', activeForm: 'Making the edit', status: 'in_progress' },
            { content: 'Verify changes', activeForm: 'Verifying changes', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'assistant',
        content: `I found the code. Now I'll make the edit.`,
      },
      {
        type: 'tool',
        tool: 'Edit',
        input: { file_path: filePath, old_string: oldCode, new_string: newCode },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Read current file', activeForm: 'Reading current file', status: 'completed' },
            { content: 'Make the edit', activeForm: 'Making the edit', status: 'completed' },
            { content: 'Verify changes', activeForm: 'Verifying changes', status: 'completed' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'assistant',
        content: `Done! I've ${description}. The changes have been applied.`,
      },
    ],
  })
}

/**
 * Generate a realistic session flow for running tests
 */
export function generateTestRunFlow(
  command: string,
  passed: number,
  failed: number,
  output: string
): StreamEvent[] {
  const hasFailed = failed > 0
  return generateSessionFlow({
    steps: [
      {
        type: 'assistant',
        content: `I'll run the tests for you.`,
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Run tests', activeForm: 'Running tests', status: 'in_progress' },
            { content: 'Report results', activeForm: 'Reporting results', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'Bash',
        input: { command },
        output,
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Run tests', activeForm: 'Running tests', status: 'completed' },
            { content: 'Report results', activeForm: 'Reporting results', status: 'completed' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'assistant',
        content: hasFailed
          ? `Tests completed with ${failed} failure(s) out of ${passed + failed} tests.`
          : `All ${passed} tests passed successfully!`,
      },
    ],
  })
}

/**
 * Generate a session flow with an error
 */
export function generateErrorFlow(
  errorMessage: string,
  context?: string
): StreamEvent[] {
  const events: StreamEvent[] = []

  if (context) {
    events.push(mockAssistantEvent(context))
  }

  events.push(mockErrorEvent(errorMessage))

  return events
}

/**
 * Convert events to stream-json format (newline-delimited JSON)
 */
export function eventsToStreamJson(events: StreamEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join('\n') + '\n'
}

/**
 * Create a readable stream from events (simulates stdout from Claude)
 */
export function createEventStream(
  events: StreamEvent[],
  delayMs: number = 10
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let index = 0

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (index >= events.length) {
        controller.close()
        return
      }

      // Add delay to simulate real streaming
      if (delayMs > 0 && index > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      const line = JSON.stringify(events[index]) + '\n'
      controller.enqueue(encoder.encode(line))
      index++
    },
  })
}

/**
 * Generate a complex multi-step session with various tool types
 */
export function generateComplexSessionFlow(): StreamEvent[] {
  return generateSessionFlow({
    steps: [
      {
        type: 'assistant',
        content: "I'll help you implement this feature. Let me start by understanding the codebase.",
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Explore codebase', activeForm: 'Exploring codebase', status: 'in_progress' },
            { content: 'Implement feature', activeForm: 'Implementing feature', status: 'pending' },
            { content: 'Write tests', activeForm: 'Writing tests', status: 'pending' },
            { content: 'Run tests', activeForm: 'Running tests', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'Glob',
        input: { pattern: 'src/**/*.ts' },
        output: ['src/index.ts', 'src/utils.ts', 'src/types.ts'],
      },
      {
        type: 'tool',
        tool: 'Grep',
        input: { pattern: 'export function', path: 'src/' },
        output: 'src/utils.ts:1: export function helper() {',
      },
      {
        type: 'tool',
        tool: 'Read',
        input: { file_path: 'src/utils.ts' },
        output: 'export function helper() {\n  return true\n}',
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Explore codebase', activeForm: 'Exploring codebase', status: 'completed' },
            { content: 'Implement feature', activeForm: 'Implementing feature', status: 'in_progress' },
            { content: 'Write tests', activeForm: 'Writing tests', status: 'pending' },
            { content: 'Run tests', activeForm: 'Running tests', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'assistant',
        content: "I've explored the codebase. Now I'll implement the feature.",
      },
      {
        type: 'tool',
        tool: 'Write',
        input: {
          file_path: 'src/feature.ts',
          content: 'export function newFeature() {\n  return "implemented"\n}',
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Explore codebase', activeForm: 'Exploring codebase', status: 'completed' },
            { content: 'Implement feature', activeForm: 'Implementing feature', status: 'completed' },
            { content: 'Write tests', activeForm: 'Writing tests', status: 'in_progress' },
            { content: 'Run tests', activeForm: 'Running tests', status: 'pending' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'Write',
        input: {
          file_path: 'src/feature.test.ts',
          content:
            "import { newFeature } from './feature'\n\ntest('newFeature works', () => {\n  expect(newFeature()).toBe('implemented')\n})",
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Explore codebase', activeForm: 'Exploring codebase', status: 'completed' },
            { content: 'Implement feature', activeForm: 'Implementing feature', status: 'completed' },
            { content: 'Write tests', activeForm: 'Writing tests', status: 'completed' },
            { content: 'Run tests', activeForm: 'Running tests', status: 'in_progress' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'tool',
        tool: 'Bash',
        input: { command: 'npm test' },
        output: 'PASS src/feature.test.ts\n  ✓ newFeature works (2ms)\n\nTest Suites: 1 passed\nTests: 1 passed',
      },
      {
        type: 'tool',
        tool: 'TodoWrite',
        input: {
          todos: [
            { content: 'Explore codebase', activeForm: 'Exploring codebase', status: 'completed' },
            { content: 'Implement feature', activeForm: 'Implementing feature', status: 'completed' },
            { content: 'Write tests', activeForm: 'Writing tests', status: 'completed' },
            { content: 'Run tests', activeForm: 'Running tests', status: 'completed' },
          ],
        },
        output: { success: true },
      },
      {
        type: 'assistant',
        content: "Done! I've implemented the feature, written tests, and verified they pass.",
      },
    ],
  })
}

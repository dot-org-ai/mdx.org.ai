/**
 * Types test
 *
 * Basic type checking and validation tests
 */

import { describe, it, expect } from 'vitest'
import type {
  SessionState,
  StreamEvent,
  SessionConfig,
  WebSocketMessage,
} from './types'

describe('Types', () => {
  it('should define SessionState interface', () => {
    const state: SessionState = {
      id: 'test-session',
      status: 'idle',
      model: 'claude-sonnet-4-20250514',
      startedAt: new Date(),
      plan: [],
      todos: [],
      tools: [],
      messages: [],
      cost: 0,
      duration: 0,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      },
    }

    expect(state.id).toBe('test-session')
    expect(state.status).toBe('idle')
  })

  it('should define StreamEvent types', () => {
    const assistantEvent: StreamEvent = {
      type: 'assistant',
      content: 'Hello',
    }

    const toolUseEvent: StreamEvent = {
      type: 'tool_use',
      id: 'tool-1',
      tool: 'Read',
      input: { file_path: '/test' },
    }

    expect(assistantEvent.type).toBe('assistant')
    expect(toolUseEvent.type).toBe('tool_use')
  })

  it('should define WebSocketMessage types', () => {
    const stateMessage: WebSocketMessage = {
      type: 'state',
      data: {
        id: 'test',
        status: 'running',
        model: 'claude-sonnet-4-20250514',
        startedAt: new Date(),
        plan: [],
        todos: [],
        tools: [],
        messages: [],
        cost: 0,
        duration: 0,
        usage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
        },
      },
    }

    expect(stateMessage.type).toBe('state')
  })

  it('should define SessionConfig interface', () => {
    const config: SessionConfig = {
      prompt: 'Test prompt',
      model: 'claude-sonnet-4-20250514',
      cwd: '/test',
    }

    expect(config.prompt).toBe('Test prompt')
  })
})

/**
 * Integration tests for @mdxai/mastra
 */

import { describe, it, expect } from 'vitest'
import { createMastraAgent, createMastraWorkflow, createMastraDbTools, createMastraMemory } from './index.js'
import { parse } from 'mdxld'
import { createFsDatabase } from '@mdxdb/fs'
import { tmpdir } from 'os'
import { join } from 'path'

describe('@mdxai/mastra integration', () => {
  it('should create an agent from MDX document', () => {
    const doc = parse(`---
$type: Agent
name: TestAgent
model: claude-sonnet-4
---

You are a test agent.
`)

    const agent = createMastraAgent(doc)
    expect(agent).toBeDefined()
    expect(agent.name).toBe('TestAgent')
    expect(typeof agent.run).toBe('function')
    expect(typeof agent.stream).toBe('function')
    expect(typeof agent.generate).toBe('function')
  })

  it('should run an agent', async () => {
    const doc = parse(`---
$type: Agent
name: SimpleAgent
---

Simple agent
`)

    const agent = createMastraAgent(doc)
    const response = await agent.run('Hello')

    expect(response).toBeDefined()
    expect(response.text).toContain('SimpleAgent')
    expect(response.metadata).toBeDefined()
  })

  it('should stream agent responses', async () => {
    const doc = parse(`---
$type: Agent
name: StreamAgent
---

Streaming agent
`)

    const agent = createMastraAgent(doc)
    const chunks: string[] = []

    for await (const chunk of agent.stream('Test')) {
      if (chunk.type === 'text' && chunk.text) {
        chunks.push(chunk.text)
      }
    }

    expect(chunks.length).toBeGreaterThan(0)
  })

  it('should create a workflow', () => {
    const workflow = createMastraWorkflow({
      name: 'test-workflow',
    })

    expect(workflow).toBeDefined()
    expect(workflow.name).toBe('test-workflow')
    expect(typeof workflow.step).toBe('function')
    expect(typeof workflow.parallel).toBe('function')
    expect(typeof workflow.branch).toBe('function')
    expect(typeof workflow.run).toBe('function')
  })

  it('should execute workflow steps', async () => {
    const workflow = createMastraWorkflow({
      name: 'simple-workflow',
    })

    let step1Executed = false
    let step2Executed = false

    workflow
      .step('first', async () => {
        step1Executed = true
        return 'step1'
      })
      .step('second', async (ctx) => {
        step2Executed = true
        expect(ctx.steps.first.output).toBe('step1')
        return 'step2'
      })

    const result = await workflow.run('test input')

    expect(step1Executed).toBe(true)
    expect(step2Executed).toBe(true)
    expect(result).toBe('step2')
  })

  it('should create database tools', () => {
    const tmpDir = join(tmpdir(), `mastra-test-${Date.now()}`)
    const db = createFsDatabase({ root: tmpDir })
    const tools = createMastraDbTools(db)

    expect(tools).toBeDefined()
    expect(tools.length).toBe(5)
    expect(tools.map(t => t.name)).toEqual([
      'mdxdb_list',
      'mdxdb_search',
      'mdxdb_get',
      'mdxdb_set',
      'mdxdb_delete',
    ])
  })

  it('should create memory backend', () => {
    const tmpDir = join(tmpdir(), `mastra-memory-${Date.now()}`)
    const db = createFsDatabase({ root: tmpDir })
    const memory = createMastraMemory({
      type: 'both',
      database: db,
    })

    expect(memory).toBeDefined()
    expect(typeof memory.addConversation).toBe('function')
    expect(typeof memory.getConversation).toBe('function')
    expect(typeof memory.addVector).toBe('function')
    expect(typeof memory.searchVector).toBe('function')
  })

  it('should handle parallel workflow steps', async () => {
    const workflow = createMastraWorkflow({
      name: 'parallel-workflow',
    })

    const results: string[] = []

    workflow.parallel({
      a: async () => {
        results.push('a')
        return 'result-a'
      },
      b: async () => {
        results.push('b')
        return 'result-b'
      },
      c: async () => {
        results.push('c')
        return 'result-c'
      },
    })

    const result = await workflow.run('test')

    expect(results).toHaveLength(3)
    expect(result).toEqual({
      a: 'result-a',
      b: 'result-b',
      c: 'result-c',
    })
  })

  it('should handle conditional branching', async () => {
    const workflow = createMastraWorkflow({
      name: 'conditional-workflow',
    })

    workflow
      .step('evaluate', async (ctx) => {
        return ctx.input === 'yes' ? true : false
      })
      .branch(
        (ctx) => ctx.steps.evaluate.output === true,
        async () => 'true-branch',
        async () => 'false-branch'
      )

    const result1 = await workflow.run('yes')
    expect(result1).toBe('true-branch')

    const result2 = await workflow.run('no')
    expect(result2).toBe('false-branch')
  })

  it('should add and retrieve conversation history', async () => {
    const tmpDir = join(tmpdir(), `mastra-conv-${Date.now()}`)
    const db = createFsDatabase({ root: tmpDir })
    const memory = createMastraMemory({
      type: 'conversation',
      database: db,
    })

    const threadId = 'test-thread'

    await memory.addConversation?.({
      threadId,
      role: 'user',
      content: 'Hello',
    })

    await memory.addConversation?.({
      threadId,
      role: 'assistant',
      content: 'Hi there!',
    })

    const history = await memory.getConversation?.(threadId)

    expect(history).toBeDefined()
    expect(history?.length).toBe(2)
    expect(history?.[0]?.content).toBe('Hello')
    expect(history?.[1]?.content).toBe('Hi there!')
  })
})

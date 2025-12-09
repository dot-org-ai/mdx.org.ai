/**
 * Example: Multi-agent workflow with Mastra
 */

import { createMastraWorkflow } from '@mdxai/mastra'
import { parse } from 'mdxld'

// Define multiple agents
const researcherDoc = parse(`---
$type: Agent
name: Researcher
model: claude-sonnet-4
---

You are a research specialist. Your job is to gather comprehensive information
on any topic and present it in a structured format with citations.
`)

const writerDoc = parse(`---
$type: Agent
name: Writer
model: gpt-4
---

You are a professional writer. Transform research findings into engaging,
well-structured articles that are easy to read and informative.
`)

const editorDoc = parse(`---
$type: Agent
name: Editor
model: claude-sonnet-4
---

You are an editor. Review written content for clarity, grammar, and flow.
Suggest improvements and ensure the content meets high quality standards.
`)

// Create workflow with multiple agents
const workflow = createMastraWorkflow({
  name: 'content-pipeline',
  agents: {
    researcher: researcherDoc,
    writer: writerDoc,
    editor: editorDoc,
  },
})

// Define workflow steps
workflow
  .step('research', async (ctx) => {
    console.log('Step 1: Researching...')
    const result = await ctx.agents.researcher.run(ctx.input as string)
    return result.text
  })
  .step('write', async (ctx) => {
    console.log('Step 2: Writing article...')
    const research = ctx.steps.research.output as string
    const result = await ctx.agents.writer.run(
      `Write an article based on this research:\n\n${research}`
    )
    return result.text
  })
  .step('edit', async (ctx) => {
    console.log('Step 3: Editing...')
    const article = ctx.steps.write.output as string
    const result = await ctx.agents.editor.run(
      `Review and improve this article:\n\n${article}`
    )
    return result.text
  })

// Example 1: Run workflow
async function runWorkflow() {
  const result = await workflow.run('Write an article about AI trends in 2025')
  console.log('\nFinal article:', result)
}

// Example 2: Stream workflow execution
async function streamWorkflow() {
  console.log('Streaming workflow execution:')
  for await (const event of workflow.stream('Explain machine learning to beginners')) {
    switch (event.type) {
      case 'step_start':
        console.log(`\n▶ Starting step: ${event.step}`)
        break
      case 'step_complete':
        console.log(`✓ Completed step: ${event.step}`)
        break
      case 'step_error':
        console.error(`✗ Error in step ${event.step}:`, event.error)
        break
      case 'workflow_complete':
        console.log('\n✓ Workflow complete!')
        console.log('Final output:', event.output)
        break
    }
  }
}

// Example 3: Parallel steps
const parallelWorkflow = createMastraWorkflow({
  name: 'parallel-research',
  agents: {
    researcher: researcherDoc,
  },
})

parallelWorkflow
  .parallel({
    'tech-research': async (ctx) => {
      return ctx.agents.researcher.run('Research technology trends')
    },
    'market-research': async (ctx) => {
      return ctx.agents.researcher.run('Research market trends')
    },
    'social-research': async (ctx) => {
      return ctx.agents.researcher.run('Research social trends')
    },
  })
  .step('synthesize', async (ctx) => {
    const parallelResults = ctx.steps['parallel-0'].output as Record<string, unknown>
    return `Synthesis of all research:\n${JSON.stringify(parallelResults, null, 2)}`
  })

async function runParallelWorkflow() {
  const result = await parallelWorkflow.run('2025 trends')
  console.log('Synthesized research:', result)
}

// Example 4: Conditional branching
const conditionalWorkflow = createMastraWorkflow({
  name: 'conditional-pipeline',
  agents: {
    researcher: researcherDoc,
    writer: writerDoc,
  },
})

conditionalWorkflow
  .step('research', async (ctx) => {
    const result = await ctx.agents.researcher.run(ctx.input as string)
    return result.text
  })
  .branch(
    // Condition: check if research is substantial
    async (ctx) => {
      const research = ctx.steps.research.output as string
      return research.length > 500
    },
    // True branch: write detailed article
    async (ctx) => {
      return ctx.agents.writer.run('Write a detailed 1000-word article')
    },
    // False branch: write brief summary
    async (ctx) => {
      return ctx.agents.writer.run('Write a brief 200-word summary')
    }
  )

async function runConditionalWorkflow() {
  const result = await conditionalWorkflow.run('Quantum computing basics')
  console.log('Article (length-dependent):', result)
}

// Run all examples
async function main() {
  await runWorkflow()
  await streamWorkflow()
  await runParallelWorkflow()
  await runConditionalWorkflow()
}

main().catch(console.error)

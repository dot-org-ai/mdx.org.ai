/**
 * Example: Creating and using a Mastra agent from an MDX document
 */

import { createMastraAgent } from '@mdxai/mastra'
import { parse } from 'mdxld'

// Define an agent in MDX format
const agentDoc = parse(`---
$type: Agent
name: ResearchAssistant
model: claude-sonnet-4
tools:
  - search
  - calculator
memory:
  enabled: true
  backend: both
---

You are a helpful research assistant that can search the web and perform calculations.
Always cite your sources and explain your reasoning.
`)

// Create the agent
const agent = createMastraAgent(agentDoc)

// Example 1: Simple run
async function simpleExample() {
  const response = await agent.run('What is the population of Tokyo?')
  console.log('Response:', response.text)
}

// Example 2: Streaming response
async function streamingExample() {
  console.log('Streaming response:')
  for await (const chunk of agent.stream('Tell me about quantum computing')) {
    if (chunk.type === 'text') {
      process.stdout.write(chunk.text)
    } else if (chunk.type === 'tool_call') {
      console.log('\nTool call:', chunk.toolCall?.name)
    } else if (chunk.type === 'done') {
      console.log('\n\nDone!')
      console.log('Metadata:', chunk.metadata)
    }
  }
}

// Example 3: Structured generation
async function structuredExample() {
  const summary = await agent.generate('Summarize quantum computing in 3 bullet points', {
    schema: {
      type: 'object',
      properties: {
        bullets: {
          type: 'array',
          items: { type: 'string' },
        },
      },
    },
  })
  console.log('Structured output:', summary)
}

// Run examples
async function main() {
  await simpleExample()
  await streamingExample()
  await structuredExample()
}

main().catch(console.error)

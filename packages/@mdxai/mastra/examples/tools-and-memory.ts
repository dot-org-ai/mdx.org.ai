/**
 * Example: Using tools and memory with Mastra agents
 */

import { createMastraAgent, createMastraDbTools, createMastraMemory } from '@mdxai/mastra'
import { createFsDatabase } from '@mdxdb/fs'
import { parse } from 'mdxld'

// Create a database for content storage
const contentDb = createFsDatabase({ root: './content' })

// Create a database for agent memory
const memoryDb = createFsDatabase({ root: './memory' })

// Create database tools
const tools = createMastraDbTools(contentDb)

// Create memory backend
const memory = createMastraMemory({
  type: 'both', // conversation + vector memory
  database: memoryDb,
  collection: 'agent-memory',
})

// Define an agent with tools
const agentDoc = parse(`---
$type: Agent
name: ContentManager
model: claude-sonnet-4
tools:
  - mdxdb_list
  - mdxdb_search
  - mdxdb_get
  - mdxdb_set
  - mdxdb_delete
---

You are a content management assistant. You can help users organize, search,
and manage their content using the database tools available to you.
Always be helpful and thorough in your responses.
`)

// Create agent with tools
const agent = createMastraAgent(agentDoc, { tools })

// Example 1: Conversation history
async function conversationExample() {
  const threadId = 'user-session-1'

  // Add conversation entries
  await memory.addConversation?.({
    threadId,
    role: 'user',
    content: 'Hello! Can you help me manage my content?',
  })

  await memory.addConversation?.({
    threadId,
    role: 'assistant',
    content: 'Of course! I can help you list, search, create, and delete content. What would you like to do?',
  })

  await memory.addConversation?.({
    threadId,
    role: 'user',
    content: 'Can you search for articles about AI?',
  })

  // Retrieve conversation history
  const history = await memory.getConversation?.(threadId)
  console.log('Conversation history:', history)

  // Clear conversation when done
  // await memory.clearConversation?.(threadId)
}

// Example 2: Vector memory for semantic recall
async function vectorMemoryExample() {
  // Store important facts in vector memory
  await memory.addVector?.({
    content: 'The MDX format combines Markdown with JSX components for powerful documentation.',
    metadata: { category: 'mdx', topic: 'format' },
  })

  await memory.addVector?.({
    content: 'Mastra is a TypeScript AI framework for building agents and workflows.',
    metadata: { category: 'mastra', topic: 'framework' },
  })

  await memory.addVector?.({
    content: 'MDXDB provides a database abstraction for MDX documents with multiple backends.',
    metadata: { category: 'mdxdb', topic: 'storage' },
  })

  // Search vector memory
  const results = await memory.searchVector?.('What is MDX?')
  console.log('Vector search results:', results)
}

// Example 3: Agent with database tools
async function agentWithToolsExample() {
  // Create some test content
  await contentDb.set('posts/hello-world', {
    type: 'BlogPost',
    data: {
      title: 'Hello World',
      author: 'John Doe',
      publishedAt: '2025-01-01',
    },
    content: 'This is my first blog post!',
  })

  await contentDb.set('posts/ai-trends', {
    type: 'BlogPost',
    data: {
      title: 'AI Trends 2025',
      author: 'Jane Smith',
      publishedAt: '2025-01-15',
    },
    content: 'Exploring the latest trends in artificial intelligence...',
  })

  // Agent can use tools to interact with database
  const response = await agent.run('List all blog posts in the database')
  console.log('Agent response:', response.text)

  const searchResponse = await agent.run('Search for posts about AI')
  console.log('Search response:', searchResponse.text)
}

// Example 4: Combining conversation and vector memory
async function combinedMemoryExample() {
  const threadId = 'user-session-2'

  // User asks a question
  await memory.addConversation?.({
    threadId,
    role: 'user',
    content: 'What do you know about MDX?',
  })

  // Agent searches vector memory for relevant information
  const vectorResults = await memory.searchVector?.('MDX')

  // Generate response using vector search results
  const context = vectorResults?.map(v => v.content).join('\n') || ''
  const agentResponse = `Based on my knowledge: ${context}`

  await memory.addConversation?.({
    threadId,
    role: 'assistant',
    content: agentResponse,
  })

  // Continue conversation
  const fullHistory = await memory.getConversation?.(threadId)
  console.log('Full conversation with context:', fullHistory)
}

// Example 5: Custom tool from MDX
async function customToolExample() {
  const toolDoc = parse(`---
$type: Tool
name: calculator
description: Perform mathematical calculations
schema:
  type: object
  properties:
    expression:
      type: string
      description: Mathematical expression to evaluate
---

function handler({ expression }) {
  try {
    // Note: In production, use a safe math evaluator
    const result = eval(expression)
    return { result, expression }
  } catch (error) {
    return { error: error.message }
  }
}
`)

  console.log('Custom tool definition:', toolDoc)
  // In a real implementation, this would be evaluated and registered
}

// Run all examples
async function main() {
  console.log('=== Conversation History Example ===')
  await conversationExample()

  console.log('\n=== Vector Memory Example ===')
  await vectorMemoryExample()

  console.log('\n=== Agent with Tools Example ===')
  await agentWithToolsExample()

  console.log('\n=== Combined Memory Example ===')
  await combinedMemoryExample()

  console.log('\n=== Custom Tool Example ===')
  await customToolExample()
}

main().catch(console.error)

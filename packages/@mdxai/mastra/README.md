# @mdxai/mastra

Mastra AI framework integration for MDXAI. Build AI agents and workflows with MDX-driven prompts and Mastra's orchestration capabilities.

## Features

- **Agent Workflows** - Define AI agent workflows in MDX
- **Tool Integration** - Use Mastra tools from MDX documents
- **Memory** - Persistent agent memory with MDXDB
- **Streaming** - Stream responses from Mastra agents
- **Multi-Agent** - Orchestrate multiple agents from MDX
- **Type-Safe** - Full TypeScript support

## Installation

```bash
npm install @mdxai/mastra @mastra/core
# or
pnpm add @mdxai/mastra @mastra/core
# or
yarn add @mdxai/mastra @mastra/core
```

## Agent API

```typescript
import { createMastraAgent, MastraWorkflow } from '@mdxai/mastra'
import { parse } from 'mdxld'

// Create agent from MDX document
const doc = parse(`---
$type: Agent
name: Assistant
model: claude-sonnet-4-20250514
tools:
  - search
  - calculator
---

You are a helpful assistant that can search the web and perform calculations.
`)

const agent = createMastraAgent(doc)

// Run agent
const response = await agent.run('What is 2 + 2?')

// Stream responses
for await (const chunk of agent.stream('Tell me about MDX')) {
  console.log(chunk)
}
```

## Workflow API

```typescript
import { MastraWorkflow } from '@mdxai/mastra'

const workflow = new MastraWorkflow({
  agents: {
    researcher: researcherDoc,
    writer: writerDoc
  }
})

// Define workflow steps
workflow
  .step('research', async (ctx) => {
    return ctx.agents.researcher.run(ctx.input)
  })
  .step('write', async (ctx) => {
    return ctx.agents.writer.run(ctx.steps.research.output)
  })

const result = await workflow.run('Write an article about AI')
```

## Tools Integration

```typescript
import { createMastraDbTools } from '@mdxai/mastra'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './content' })
const tools = createMastraDbTools(db)

const agent = createMastraAgent(doc, { tools })

// Agent can now use database tools:
// - mdxdb_list: List documents
// - mdxdb_search: Search documents
// - mdxdb_get: Get a document
// - mdxdb_set: Create/update document
// - mdxdb_delete: Delete document
```

## Memory Management

```typescript
import { createMastraMemory } from '@mdxai/mastra'
import { createFsDatabase } from '@mdxdb/fs'

const db = createFsDatabase({ root: './memory' })
const memory = createMastraMemory({
  type: 'both', // 'conversation', 'vector', or 'both'
  database: db,
  collection: 'agent-memory',
})

// Store conversation
await memory.addConversation({
  threadId: 'thread-1',
  role: 'user',
  content: 'Hello!',
})

// Retrieve history
const history = await memory.getConversation('thread-1')

// Vector memory
await memory.addVector({
  content: 'Important fact',
  metadata: { category: 'fact' },
})

const results = await memory.searchVector('fact about...')
```

## Streaming Support

```typescript
import { createMastraAgent } from '@mdxai/mastra'

const agent = createMastraAgent(doc)

// Stream responses
for await (const chunk of agent.stream('Tell me about MDX')) {
  if (chunk.type === 'text') {
    process.stdout.write(chunk.text)
  }
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Core MDXAI package |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [mastra](https://mastra.ai) | Mastra AI framework |

## Contributing

Contributions welcome! If you'd like to help implement this package, please open an issue to discuss the approach.

## License

MIT

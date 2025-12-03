# @mdxai/mastra

Mastra AI framework integration for MDXAI. Build AI agents and workflows with MDX-driven prompts and Mastra's orchestration capabilities.

> **Note:** This package is currently a placeholder. Implementation coming soon.

## Planned Features

- **Agent Workflows** - Define AI agent workflows in MDX
- **Tool Integration** - Use Mastra tools from MDX documents
- **Memory** - Persistent agent memory with MDXDB
- **Streaming** - Stream responses from Mastra agents
- **Multi-Agent** - Orchestrate multiple agents from MDX
- **Type-Safe** - Full TypeScript support

## Planned API

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

## Planned Workflow API

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

## Installation

```bash
npm install @mdxai/mastra
# or
pnpm add @mdxai/mastra
# or
yarn add @mdxai/mastra
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

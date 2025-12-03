# @mdxai/agentkit

Agent toolkit for MDXAI. Build, compose, and deploy AI agents using MDX documents as agent definitions.

> **Note:** This package is currently a placeholder. Implementation coming soon.

## Planned Features

- **Agent Definitions** - Define agents in MDX with YAML frontmatter
- **Tool Registry** - Register and compose agent tools
- **Agent Composition** - Build multi-agent systems
- **Execution Context** - Shared state across agent invocations
- **Lifecycle Hooks** - Before/after execution hooks
- **Type-Safe** - Full TypeScript support

## Planned API

```typescript
import { Agent, Tool, AgentKit } from '@mdxai/agentkit'
import { parse } from 'mdxld'

// Define an agent from MDX
const agentDoc = parse(`---
$type: Agent
name: CodeReviewer
description: Reviews code and provides suggestions
capabilities:
  - code-review
  - suggestions
---

You are an expert code reviewer. Analyze the provided code and give constructive feedback.

## Guidelines
- Focus on readability and maintainability
- Suggest performance improvements
- Check for common security issues
`)

// Create agent
const reviewer = new Agent(agentDoc)

// Register tools
reviewer.registerTool(
  new Tool({
    name: 'analyze-complexity',
    description: 'Analyze code complexity',
    execute: async (code) => analyzeComplexity(code)
  })
)

// Run agent
const review = await reviewer.run({
  code: 'function add(a, b) { return a + b }'
})
```

## Planned AgentKit API

```typescript
import { AgentKit } from '@mdxai/agentkit'

// Create agent kit with multiple agents
const kit = new AgentKit({
  agents: {
    reviewer: reviewerDoc,
    fixer: fixerDoc,
    tester: testerDoc
  },

  // Shared tools
  tools: [analyzeComplexity, generateTests],

  // Shared context
  context: {
    repository: 'my-project',
    branch: 'main'
  }
})

// Execute agent pipeline
const result = await kit.pipeline([
  { agent: 'reviewer', input: code },
  { agent: 'fixer', input: (prev) => prev.suggestions },
  { agent: 'tester', input: (prev) => prev.fixedCode }
])
```

## Planned Tool Definition

```typescript
import { defineTool } from '@mdxai/agentkit'

const searchTool = defineTool({
  name: 'web-search',
  description: 'Search the web for information',
  parameters: {
    query: { type: 'string', description: 'Search query' },
    limit: { type: 'number', default: 10 }
  },
  execute: async ({ query, limit }) => {
    const results = await search(query, limit)
    return results
  }
})
```

## Installation

```bash
npm install @mdxai/agentkit
# or
pnpm add @mdxai/agentkit
# or
yarn add @mdxai/agentkit
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Core MDXAI package |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [@mdxai/mastra](https://www.npmjs.com/package/@mdxai/mastra) | Mastra integration |

## Contributing

Contributions welcome! If you'd like to help implement this package, please open an issue to discuss the approach.

## License

MIT

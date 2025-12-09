# @mdxai/agentkit

Agent composition toolkit for building, composing, and managing AI agents in the mdxai ecosystem.

## Features

- **Agent Definition**: Create agents with configuration, tools, and lifecycle hooks
- **Tool Registry**: Manage and register tools that agents can use
- **Agent Composition**: Compose multiple agents into orchestrators and delegating patterns
- **Shared Execution Context**: Share state and data across multiple agents
- **Lifecycle Hooks**: Hook into agent lifecycle events (onStart, onStop, onError, onToolCall, etc.)
- **Type-Safe**: Full TypeScript support with generic types

## Installation

```bash
pnpm add @mdxai/agentkit
```

## Quick Start

### Creating a Simple Agent

```typescript
import { createAgent, createTool } from '@mdxai/agentkit'
import { z } from 'zod'

// Create a tool
const calculateTool = createTool(
  'calculate',
  'Perform mathematical calculations',
  async (input: { expression: string }, context) => {
    context.log(`Calculating: ${input.expression}`)
    // Simplified calculation logic
    return eval(input.expression)
  },
  z.object({
    expression: z.string().describe('Mathematical expression to evaluate'),
  })
)

// Create an agent
const mathAgent = createAgent({
  id: 'math-assistant',
  name: 'Math Assistant',
  description: 'Helps with mathematical calculations',
  instructions: 'You are a helpful math assistant',
  tools: [calculateTool],
  hooks: {
    onStart: async (context) => {
      context.log('Math agent started')
    },
    onToolCall: async (toolName, input, context) => {
      context.log(`Calling tool: ${toolName}`)
    },
  },
})

// Run the agent
const result = await mathAgent.run({
  input: 'Calculate 2 + 2',
})

console.log(result.message)
```

### Using the Tool Registry

```typescript
import { ToolRegistry, createTool } from '@mdxai/agentkit'

const registry = new ToolRegistry()

// Register tools
registry.register(
  createTool('greet', 'Greet a user', async (input: { name: string }) => {
    return `Hello, ${input.name}!`
  })
)

registry.register(
  createTool('farewell', 'Say goodbye', async (input: { name: string }) => {
    return `Goodbye, ${input.name}!`
  })
)

// Get a tool
const greetTool = registry.get('greet')

// List all tools
const allTools = registry.all()
console.log('Available tools:', registry.names())
```

### Composing Multiple Agents

```typescript
import { createAgent, composeAgents, createEchoTool } from '@mdxai/agentkit'

// Create specialized agents
const researchAgent = createAgent({
  id: 'researcher',
  name: 'Research Agent',
  description: 'Performs research tasks',
  tools: [createEchoTool()],
})

const writerAgent = createAgent({
  id: 'writer',
  name: 'Writer Agent',
  description: 'Writes content',
  tools: [createEchoTool()],
})

const editorAgent = createAgent({
  id: 'editor',
  name: 'Editor Agent',
  description: 'Edits and refines content',
  tools: [createEchoTool()],
})

// Compose into an orchestrator
const contentTeam = composeAgents(
  'content-team',
  [researchAgent, writerAgent, editorAgent],
  {
    strategy: 'sequential',
    instructions: 'Coordinate research, writing, and editing tasks',
  }
)

// Run the orchestrator
const result = await contentTeam.run({
  input: 'Create an article about AI agents',
})
```

### Delegating Agent Pattern

```typescript
import { createDelegatingAgent, createAgent } from '@mdxai/agentkit'

// Create specialized agents
const pythonAgent = createAgent({
  id: 'python',
  name: 'Python Expert',
  tools: [/* Python-specific tools */],
})

const jsAgent = createAgent({
  id: 'javascript',
  name: 'JavaScript Expert',
  tools: [/* JavaScript-specific tools */],
})

const rustAgent = createAgent({
  id: 'rust',
  name: 'Rust Expert',
  tools: [/* Rust-specific tools */],
})

// Create a delegating agent
const codingAgent = createDelegatingAgent(
  'coding-assistant',
  {
    python: pythonAgent,
    javascript: jsAgent,
    rust: rustAgent,
  },
  {
    instructions: 'Delegate coding questions to language experts',
    defaultDelegate: 'javascript',
  }
)

const result = await codingAgent.run({
  input: 'Help me write a Python function',
})
```

### Shared Execution Context

```typescript
import { ExecutionContext, createAgent } from '@mdxai/agentkit'

const context = new ExecutionContext()

// Create and register agents
const agent1 = createAgent({ id: 'agent-1', name: 'Agent 1' })
const agent2 = createAgent({ id: 'agent-2', name: 'Agent 2' })

context.registerAgent(agent1)
context.registerAgent(agent2)

// Share data across agents
context.set('projectName', 'My Project')
context.set('version', '1.0.0')

// Run agents with shared context
const result1 = await context.runAgent('agent-1', 'Analyze the project')
const result2 = await context.runAgent('agent-2', 'Generate documentation')

// Access shared data
console.log('Project:', context.get('projectName'))
```

### Lifecycle Hooks

```typescript
import { createAgent } from '@mdxai/agentkit'

const agent = createAgent({
  id: 'monitored-agent',
  name: 'Monitored Agent',
  hooks: {
    onStart: async (context) => {
      console.log('Agent starting...')
      context.set('startTime', Date.now())
    },
    onStop: async (context) => {
      const startTime = context.get<number>('startTime')
      const duration = Date.now() - (startTime || 0)
      console.log(`Agent stopped. Duration: ${duration}ms`)
    },
    onBeforeStep: async (context) => {
      console.log(`Step ${context.state.step} starting...`)
    },
    onAfterStep: async (context) => {
      console.log(`Step ${context.state.step} completed`)
    },
    onError: async (error, context) => {
      console.error('Agent error:', error.message)
      // Log error to monitoring service
    },
    onToolCall: async (toolName, input, context) => {
      console.log(`Calling tool: ${toolName}`, input)
    },
    onToolResult: async (toolName, result, context) => {
      console.log(`Tool ${toolName} result:`, result)
    },
  },
})
```

## API Reference

### Types

#### `Tool<TInput, TOutput>`
Tool definition with name, description, input schema, and handler function.

```typescript
interface Tool<TInput = unknown, TOutput = unknown> {
  name: string
  description: string
  inputSchema?: z.ZodType<TInput>
  handler: (input: TInput, context: AgentContext) => Promise<TOutput>
}
```

#### `AgentConfig`
Configuration for creating an agent.

```typescript
interface AgentConfig {
  id: string
  name: string
  description?: string
  instructions?: string
  tools?: readonly Tool[]
  initialState?: Partial<AgentState>
  hooks?: {
    onStart?: LifecycleHook
    onStop?: LifecycleHook
    onBeforeStep?: LifecycleHook
    onAfterStep?: LifecycleHook
    onError?: (error: Error, context: AgentContext) => void | Promise<void>
    onToolCall?: (toolName: string, input: unknown, context: AgentContext) => void | Promise<void>
    onToolResult?: (toolName: string, result: unknown, context: AgentContext) => void | Promise<void>
  }
  maxSteps?: number
  parent?: Agent
}
```

#### `AgentContext`
Context object passed to tools and hooks.

```typescript
interface AgentContext {
  agentId: string
  state: AgentState
  tools: Tool[]
  call: <TInput, TOutput>(toolName: string, input: TInput) => Promise<TOutput>
  send: (message: string | Message) => Promise<void>
  get: <T>(key: string) => T | undefined
  set: (key: string, value: unknown) => void
  log: (message: string, level?: 'info' | 'warn' | 'error') => void
}
```

#### `RunOptions`
Options for running an agent.

```typescript
interface RunOptions {
  input: string | Message | Message[]
  maxSteps?: number
  context?: Record<string, unknown>
}
```

#### `RunResult`
Result from running an agent.

```typescript
interface RunResult {
  message: string
  messages: Message[]
  state: AgentState
  steps: number
  success: boolean
  error?: Error
}
```

### Functions

#### `createAgent(config: AgentConfig): Agent`
Create a new agent with the given configuration.

#### `createTool<TInput, TOutput>(...): Tool`
Create a tool with name, description, handler, and optional input schema.

```typescript
function createTool<TInput = unknown, TOutput = unknown>(
  name: string,
  description: string,
  handler: (input: TInput, context: AgentContext) => Promise<TOutput>,
  inputSchema?: z.ZodType<TInput>
): Tool<TInput, TOutput>
```

#### `composeAgents(id, agents, options): Agent`
Compose multiple agents into an orchestrator.

```typescript
function composeAgents(
  id: string,
  agents: Agent[],
  options?: {
    instructions?: string
    strategy?: 'sequential' | 'parallel' | 'router'
    router?: (input: string, agents: Agent[]) => Promise<Agent>
  }
): Agent
```

#### `createDelegatingAgent(id, delegates, options): Agent`
Create an agent that delegates to other agents.

```typescript
function createDelegatingAgent(
  id: string,
  delegates: Record<string, Agent>,
  options?: {
    instructions?: string
    defaultDelegate?: string
  }
): Agent
```

#### `createEchoTool(): Tool`
Create a simple echo tool for testing.

#### `createAgentTool(agent): Tool`
Create a tool that runs another agent.

### Classes

#### `ToolRegistry`
Registry for managing agent tools.

```typescript
class ToolRegistry {
  register<TInput, TOutput>(tool: Tool<TInput, TOutput>): void
  unregister(name: string): boolean
  get(name: string): Tool | undefined
  has(name: string): boolean
  all(): Tool[]
  names(): string[]
  clear(): void
  static createTool<TInput, TOutput>(...): Tool<TInput, TOutput>
}
```

#### `ExecutionContext`
Shared execution context for multiple agents.

```typescript
class ExecutionContext {
  registerAgent(agent: Agent): void
  getAgent(id: string): Agent | undefined
  getAllAgents(): Agent[]
  set(key: string, value: unknown): void
  get<T>(key: string): T | undefined
  has(key: string): boolean
  delete(key: string): boolean
  clear(): void
  runAgent(agentId: string, input: string | Message | Message[]): Promise<RunResult>
}
```

## Integration with mdxai Ecosystem

@mdxai/agentkit works seamlessly with other mdxai packages:

- **@mdxai/claude**: Use Claude SDK tools with agents
- **mdxai**: Access AI functions and workflows
- **@mdxdb/fs**: Store agent state and conversations
- **@mdxe/node**: Execute agent code in Node.js runtime

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxai](https://www.npmjs.com/package/mdxai) | Core MDXAI package |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude integration |
| [@mdxai/mastra](https://www.npmjs.com/package/@mdxai/mastra) | Mastra integration |

## License

MIT

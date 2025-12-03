# mdxai

Unified AI SDK for MDX-based applications. Combines AI functions, workflows, database operations, and experiment tracking into a single cohesive package.

## Installation

```bash
npm install mdxai
# or
pnpm add mdxai
# or
yarn add mdxai
```

## Features

mdxai combines multiple AI primitives into a unified SDK:

### Core Primitives

- **ai-functions** - RPC primitives, generation, embeddings, auto-define
- **ai-workflows** - Event-driven workflows with `$` context
- **ai-database** - Simplified AI-powered database interface
- **ai-providers** - Unified AI provider registry with Cloudflare AI Gateway support
- **ai-experiments** - A/B testing, parameter exploration, and experiment tracking
- **language-models** - Model listing, resolution, and alias management

### Agent & Worker Primitives

- **autonomous-agents** - Build autonomous AI agents with goals, teams, and KPIs
- **digital-workers** - Common interface for AI agents and humans within company boundaries
- **human-in-the-loop** - Human oversight, approvals, and intervention workflows
- **services-as-software** - AI-powered services with pricing, subscriptions, and business logic

### Additional Features

- **Persistence** - mdxdb-backed storage for functions and workflows
- **Event Tracking** - Analytics and conversion tracking
- **MCP Server** - Claude integration via Model Context Protocol
- **Helper Factories** - Pre-configured contexts for common use cases

## Quick Start

```typescript
import { $, createContext } from 'mdxai'

// Use the default context
await $.db.set('users/john', { name: 'John Doe', email: 'john@example.com' })

// AI operations with auto-define
const summary = await $.ai.summarize({ text: 'Long article content...' })

// Event handling
$.on.User.created(async (user, $) => {
  $.log('New user:', user.name)
  await $.send('Email.welcome', { to: user.email })
})

// Or create a custom context
const ctx = createContext({
  db: 'myapp.example.com',
  ns: 'production',
})
```

## Primitives Documentation

### AI Providers

Unified access to multiple AI providers with optional Cloudflare AI Gateway integration.

```typescript
import { createRegistry, model, embeddingModel, createModelContext } from 'mdxai'

// Configure with Cloudflare AI Gateway
const registry = createRegistry({
  cloudflareGateway: 'my-gateway',
  cloudflareAccountId: 'account-123',
})

// Use models by string identifier
const gpt4 = model('gpt-4')
const claude = model('claude-3-opus')

// Or use the model context helper
const ctx = createModelContext({
  gateway: 'my-gateway',
  accountId: 'account-123',
})

const response = await generateText({
  model: ctx.model('gpt-4'),
  prompt: 'Hello world',
})
```

### AI Experiments

Run experiments, track variants, and make data-driven decisions.

```typescript
import { Experiment, cartesian, createExperimentContext, createFileBackend } from 'mdxai'

// Simple experiment
const experiment = Experiment({
  name: 'model-comparison',
  variants: [
    { name: 'gpt-4', value: 'gpt-4', weight: 0.5 },
    { name: 'claude', value: 'claude-3-opus', weight: 0.5 },
  ],
})

const results = await experiment.run(async (variant) => {
  return await generateText({
    model: variant.value,
    prompt: 'Summarize this article',
  })
})

// Cartesian product for parameter grids
const grid = cartesian({
  model: ['gpt-4', 'claude-3-opus'],
  temperature: [0, 0.5, 1.0],
  maxTokens: [100, 500],
})
// Generates 12 combinations (2 * 3 * 2)

// Use experiment context with tracking
const ctx = createExperimentContext({
  backend: createFileBackend('./experiments.jsonl'),
})

const variant = await ctx.decide(['blue', 'green', 'red'])
await ctx.track('button_click', { variant, converted: true })
```

### Autonomous Agents

Build AI agents with roles, goals, teams, and metrics.

```typescript
import { Agent, AgentRole, AgentTeam, AgentGoals, createAgentContext } from 'mdxai'

// Define a role
const productManager = AgentRole({
  name: 'Product Manager',
  description: 'Manages product strategy and roadmap',
  skills: ['product strategy', 'user research', 'roadmap planning'],
  permissions: ['create_roadmap', 'approve_features'],
})

// Create an agent
const agent = Agent({
  name: 'ProductAgent',
  role: productManager,
  mode: 'autonomous', // or 'supervised'
  goals: [
    {
      id: 'g1',
      description: 'Define Q1 roadmap',
      target: '100%',
      deadline: '2024-03-31',
    },
  ],
})

// Execute tasks
const result = await agent.do('Create product brief for feature X')

// Make decisions
const choice = await agent.decide(['Feature A', 'Feature B', 'Feature C'], 'Which feature to prioritize?')

// Request approval
const approval = await agent.approve({
  title: 'Budget Request',
  description: 'Request $50k for research',
  data: { amount: 50000 },
  priority: 'high',
})

// Or use the agent context helper
const ctx = createAgentContext({
  name: 'ProductAgent',
  role: productManager,
  mode: 'autonomous',
})

await ctx.do('Analyze market trends')
```

### Digital Workers

Common interface for AI agents and humans within company boundaries.

```typescript
import { DigitalWorkerRole, DigitalWorkerTeam, workerDo, workerApprove } from 'mdxai'

// Define worker roles
const engineer = DigitalWorkerRole({
  name: 'Software Engineer',
  skills: ['coding', 'debugging', 'testing'],
})

const manager = DigitalWorkerRole({
  name: 'Engineering Manager',
  skills: ['code review', 'team management', 'planning'],
})

// Create a team
const team = DigitalWorkerTeam({
  name: 'Platform Team',
  members: [
    { role: engineer, capacity: 1.0 },
    { role: manager, capacity: 0.5 },
  ],
})

// Execute tasks
await workerDo('Implement authentication feature', { assignee: engineer })

// Request approval
const approved = await workerApprove({
  title: 'Deploy to Production',
  description: 'Deploy v2.0.0',
  approver: manager,
})
```

### Human in the Loop

Integrate human oversight and decision-making into AI workflows.

```typescript
import { Human, humanApprove, humanAsk, humanNotify, registerHuman } from 'mdxai'

// Create human manager
const human = Human({
  defaultTimeout: 3600000, // 1 hour
  autoEscalate: true,
  escalationChain: ['tech-lead@example.com', 'director@example.com'],
})

// Request approval from human
const result = await humanApprove({
  title: 'Deploy to production',
  description: 'Approve deployment of v2.0.0',
  subject: 'Production Deployment',
  assignee: 'tech-lead@example.com',
  priority: 'high',
  timeout: 1800000, // 30 minutes
})

if (result.approved) {
  await deploy()
  await humanNotify({
    type: 'success',
    title: 'Deployment complete',
    message: 'v2.0.0 deployed successfully',
    recipient: 'team@example.com',
  })
} else {
  await humanNotify({
    type: 'warning',
    title: 'Deployment cancelled',
    message: `Reason: ${result.reason}`,
    recipient: 'team@example.com',
  })
}

// Ask human a question
const answer = await humanAsk({
  question: 'Should we prioritize Feature A or Feature B?',
  options: ['Feature A', 'Feature B'],
  assignee: 'product-manager@example.com',
})
```

### Services as Software

Build AI-powered services with pricing, subscriptions, and business logic.

```typescript
import { Service, Endpoint, POST, createServiceContext, Plan } from 'mdxai'

// Define a service
const summaryService = Service({
  name: 'SummaryService',
  description: 'Generates summaries of documents',
  version: '1.0.0',
  endpoints: {
    '/summarize': {
      POST: async ({ text }) => {
        const { object } = await generateObject({
          schema: z.object({ summary: z.string() }),
          prompt: `Summarize: ${text}`,
        })
        return object
      },
    },
  },
  pricing: {
    model: 'usage',
    unit: 'request',
    price: 0.01,
    currency: 'USD',
  },
})

// Create subscription plans
const freePlan = Plan({
  id: 'free',
  name: 'Free',
  price: 0,
  interval: 'month',
  limits: {
    requests: 100,
  },
})

const proPlan = Plan({
  id: 'pro',
  name: 'Pro',
  price: 29,
  interval: 'month',
  limits: {
    requests: 10000,
  },
})

// Use service context
const ctx = createServiceContext({
  name: 'SummaryService',
  description: 'AI-powered document summarization',
  version: '1.0.0',
  endpoints: {
    '/summarize': {
      POST: async ({ text }) => {
        return await ctx.generate({
          schema: z.object({ summary: z.string() }),
          prompt: `Summarize: ${text}`,
        })
      },
    },
  },
  pricing: {
    model: 'subscription',
    plans: [freePlan, proPlan],
  },
})

// Create quotes
const quote = await ctx.quote({
  items: [{ sku: 'summary', quantity: 100 }],
})

// Create orders
const order = await ctx.order({
  items: [{ sku: 'summary', quantity: 100 }],
  customer: 'customer-123',
})

// Subscribe to plan
const subscription = await ctx.subscribe({
  plan: 'pro',
  customer: 'customer-123',
})
```

### Language Models

List, search, and resolve language model identifiers.

```typescript
import { listModels, searchModels, resolveModel, MODEL_ALIASES } from 'mdxai'

// List all available models
const allModels = listModels()
console.log(`Found ${allModels.length} models`)

// Search for specific models
const claudeModels = searchModels('claude')
const gptModels = searchModels('gpt')

// Resolve aliases
const resolved = resolveModel('sonnet') // Resolves to claude-3-5-sonnet-20241022
const model = resolveModel('gpt-4o') // Returns full model info

// Get specific model
const gpt4 = getModel('gpt-4-turbo')
console.log(`Model: ${gpt4.id}, Provider: ${gpt4.provider}`)

// Available aliases
console.log(MODEL_ALIASES)
// {
//   'sonnet': 'claude-3-5-sonnet-20241022',
//   'opus': 'claude-3-opus-20240229',
//   'haiku': 'claude-3-5-haiku-20241022',
//   'gpt-4o': 'gpt-4o-2024-11-20',
//   ...
// }
```

## API Reference

### Unified Context (`$`)

The `$` object provides a unified interface combining database, AI, and workflow capabilities.

#### `createContext(options?)`

Create a new unified context.

```typescript
function createContext(options?: ContextOptions): UnifiedContext

interface ContextOptions {
  db?: AnyDatabase | DBOptions | string  // Database config
  ai?: AIProxy | Record<string, unknown>  // AI config
  ns?: string                             // Namespace
  state?: Record<string, unknown>         // Initial state
}
```

**Example:**

```typescript
import { createContext } from 'mdxai'

// With connection string
const $ = createContext({ db: 'myapp.example.com' })

// With full config
const $ = createContext({
  db: { ns: 'myapp', provider: 'sqlite' },
  ns: 'production',
  state: { version: '1.0.0' }
})
```

#### Context Properties

| Property | Type | Description |
|----------|------|-------------|
| `$.db` | `AnyDatabase` | Database instance |
| `$.ai` | `AIProxy` | AI instance with auto-define |
| `$.on` | `OnProxy` | Event handler registration |
| `$.every` | `EveryProxy` | Schedule handler registration |
| `$.send` | `Function` | Send events |
| `$.do` | `Function` | Durable action execution |
| `$.try` | `Function` | Non-durable action execution |
| `$.log` | `Function` | Logging |
| `$.state` | `Object` | Shared state |
| `$.generate` | `Function` | Generate structured objects |
| `$.generateText` | `Function` | Generate text |

### Database Operations

mdxai re-exports database functionality from `ai-database` and `mdxdb`.

```typescript
import { DB, db, configureDB, MemoryDB, createMemoryDB } from 'mdxai'
import { createFsDatabase } from 'mdxai'
import { createSqliteDatabase } from 'mdxai'

// Quick setup
const database = DB('myapp.example.com')

// Or use context
await $.db.set('users/john', { name: 'John' })
const user = await $.db.get('users/john')
const users = await $.db.list({ type: 'User' })
const results = await $.db.search({ query: 'john', semantic: true })
```

### AI Functions

Re-exports from `ai-functions` for AI operations.

```typescript
import { AI, ai, generateObject, generateText } from 'mdxai'

// Auto-define functions
const result = await ai.analyzeCode({ code: 'function foo() {}' })

// Generate structured data
const { object } = await generateObject({
  model: 'gpt-4',
  schema: z.object({ summary: z.string() }),
  prompt: 'Summarize this article...'
})

// Generate text
const { text } = await generateText({
  model: 'gpt-4',
  prompt: 'Write a haiku about coding'
})
```

### Workflows

Event-driven workflows with durable execution.

```typescript
import { Workflow, on, every, send } from 'mdxai'

// Register event handlers
$.on.Order.created(async (order, $) => {
  $.log('Processing order:', order.id)

  // Durable action (retried on failure)
  await $.do('Payment.charge', { amount: order.total })

  // Send follow-up event
  await $.send('Email.confirmation', { orderId: order.id })
})

// Schedule recurring tasks
$.every('1h').run(async ($) => {
  $.log('Hourly cleanup running...')
})

// Create standalone workflow
const orderWorkflow = Workflow($ => {
  $.on.Order.created(handleOrder)
  $.on.Payment.completed(handlePayment)
})

await orderWorkflow.start()
await orderWorkflow.send('Order.created', { id: '123' })
```

### Persistent Workflows

Store workflow state in mdxdb.

```typescript
import { createPersistentWorkflow, createFsDatabase } from 'mdxai'

const db = await createFsDatabase({ basePath: './data' })

const workflow = createPersistentWorkflow('order-processing', db, $ => {
  $.on.Order.created(async (order, $) => {
    await $.db.set(`orders/${order.id}`, order)
    await $.send('Email.confirmation', { orderId: order.id })
  })
})

await workflow.start()
```

### Database Tools for AI Agents

Create tools that AI agents can use to interact with your database.

```typescript
import { createDatabaseTools, createFsDatabase } from 'mdxai'

const db = await createFsDatabase({ basePath: './data' })
const tools = createDatabaseTools(db)

// tools contains:
// - mdxdb_list: List documents by type
// - mdxdb_search: Semantic search
// - mdxdb_get: Get document by ID
// - mdxdb_set: Create/update document
// - mdxdb_delete: Delete document

// Use with Claude or other AI agents
const response = await agent.run({
  tools: tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: { type: 'object', properties: {...} }
  })),
  toolHandler: async (name, args) => {
    const tool = tools.find(t => t.name === name)
    return tool?.handler(args)
  }
})
```

### MCP Server

Run mdxai as an MCP server for Claude integration.

```typescript
import { createMcpServer, runMcpServer } from 'mdxai'

// Create and configure server
const server = createMcpServer({
  name: 'my-mdxai-server',
  version: '1.0.0',
  db: await createFsDatabase({ basePath: './data' })
})

// Run with stdio transport
await runMcpServer(server)
```

### Experiments

A/B testing and feature flags.

```typescript
import { experiment, decide } from 'mdxai'

// Full experiment configuration
const { variant, value } = await experiment({
  name: 'button-color',
  variants: [
    { name: 'control', weight: 0.5, value: 'blue' },
    { name: 'treatment', weight: 0.5, value: 'green' },
  ],
  userId: 'user-123',
})

// Simple decision helper
const color = await decide(['blue', 'green', 'red'], 'button-color-test')
```

### Event Tracking

Analytics and conversion tracking.

```typescript
import { track, trackConversion } from 'mdxai'

// Track events
await track('page.view', { path: '/home', userId: 'user-123' })
await track('button.click', { buttonId: 'signup' })

// Track experiment conversions
await trackConversion('button-color', 'signup', {
  userId: 'user-123',
  value: 49.99
})
```

### Utilities

#### `delay(duration)`

Delay execution.

```typescript
import { delay } from 'mdxai'

await delay(1000)     // 1 second
await delay('5s')     // 5 seconds
await delay('1m')     // 1 minute
await delay('1h')     // 1 hour
await delay('1d')     // 1 day
```

## Persistence Provider

Store AI function definitions and workflow state in mdxdb.

```typescript
import { createPersistentRegistry, createFsDatabase } from 'mdxai'

const db = await createFsDatabase({ basePath: './data' })

const registry = await createPersistentRegistry({
  db,
  namespace: 'my-app'
})

// Functions are automatically persisted
await registry.define('summarize', {
  description: 'Summarize text',
  parameters: { text: 'string' },
  handler: async ({ text }) => ({ summary: '...' })
})
```

## Examples

### Complete Application

```typescript
import { createContext, createFsDatabase, Workflow } from 'mdxai'

// Initialize
const db = await createFsDatabase({ basePath: './data' })
const $ = createContext({ db })

// Define event handlers
$.on.User.signup(async (user, $) => {
  // Store user
  await $.db.set(`users/${user.id}`, {
    ...user,
    createdAt: new Date().toISOString()
  })

  // Send welcome email
  await $.send('Email.welcome', { userId: user.id })

  // Track event
  await track('user.signup', { userId: user.id })
})

$.on.Email.welcome(async ({ userId }, $) => {
  const user = await $.db.get(`users/${userId}`)

  // Generate personalized email
  const { text } = await $.generateText({
    prompt: `Write a welcome email for ${user.name}`
  })

  // Send email (implementation depends on your email provider)
  $.log('Sending welcome email:', text)
})

// Start processing
const workflow = Workflow($ => {
  // Handlers are already registered on $
})

await workflow.start()

// Trigger signup
await workflow.send('User.signup', {
  id: 'user-123',
  name: 'Jane Doe',
  email: 'jane@example.com'
})
```

### AI-Powered Search

```typescript
import { $, createDatabaseTools } from 'mdxai'

// Index documents
await $.db.set('docs/getting-started', {
  title: 'Getting Started',
  content: 'Welcome to our documentation...',
  type: 'Document'
})

// Semantic search
const results = await $.db.search({
  query: 'how do I get started?',
  semantic: true,
  limit: 5
})

// Or use with AI agent
const tools = createDatabaseTools($.db)
const searchTool = tools.find(t => t.name === 'mdxdb_search')
const response = await searchTool.handler({
  query: 'getting started guide',
  semantic: true
})
```

## Re-exports

mdxai re-exports functionality from all primitive packages for convenience:

### Core Primitives

| Package | Key Exports |
|---------|------------|
| `ai-functions` | `AI`, `ai`, `generateObject`, `generateText`, `RPC`, `RPCPromise`, `autoDefine` |
| `ai-workflows` | `Workflow`, `on`, `every`, `send`, `createWorkflowContext`, `createIsolatedContext` |
| `ai-database` | `DB`, `db`, `configureDB`, `MemoryDB`, `createMemoryDB` |
| `ai-providers` | `createRegistry`, `model`, `embeddingModel`, `configureRegistry`, `DIRECT_PROVIDERS` |
| `ai-experiments` | `Experiment`, `cartesian`, `decide*`, `track`, `flush`, `configureTracking` |
| `language-models` | `resolveModel`, `listModels`, `searchModels`, `getModel`, `MODEL_ALIASES` |

### Agent & Worker Primitives

| Package | Key Exports |
|---------|------------|
| `autonomous-agents` | `Agent`, `AgentRole`, `AgentTeam`, `AgentGoals`, action primitives (prefixed with `agent*`) |
| `digital-workers` | `DigitalWorkerRole`, `DigitalWorkerTeam`, worker primitives (prefixed with `worker*`) |
| `human-in-the-loop` | `Human`, `HumanManager`, `InMemoryHumanStore`, human primitives (prefixed with `human*`) |
| `services-as-software` | `Service`, `Endpoint`, `ServiceClient`, `Plan`, service primitives (prefixed with `service*`) |

### Database & Storage

| Package | Key Exports |
|---------|------------|
| `@mdxdb/fs` | `createFsDatabase` |
| `@mdxdb/sqlite` | `createSqliteDatabase` |
| `mdxld` | `MDXLDDocument`, `MDXLDData`, `Relationship` types |

### Helper Factories

mdxai provides specialized context factories that combine multiple primitives:

- `createAgentContext()` - Combines `ai-functions` + `autonomous-agents`
- `createServiceContext()` - Combines `services-as-software` + `ai-functions`
- `createExperimentContext()` - Pre-configured `ai-experiments` with tracking
- `createModelContext()` - Pre-configured `ai-providers` + `language-models`

## Types

### `UnifiedContext`

```typescript
interface UnifiedContext {
  db: AnyDatabase
  ai: AIProxy & { createDatabaseTools: (db: AnyDatabase) => DatabaseTool[] }
  on: OnProxy
  every: EveryProxy
  send: <T>(event: string, data: T) => Promise<void>
  do: <TData, TResult>(event: string, data: TData) => Promise<TResult>
  try: <TData, TResult>(event: string, data: TData) => Promise<TResult>
  log: (message: string, data?: unknown) => void
  state: Record<string, unknown>
  generate: typeof generateObject
  generateText: typeof generateText
}
```

### `DatabaseTool`

```typescript
interface DatabaseTool {
  name: string
  description: string
  handler: (args: Record<string, unknown>) => Promise<ToolResponse>
}

interface ToolResponse {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
}
```

### `ExperimentConfig`

```typescript
interface ExperimentConfig<T = unknown> {
  name: string
  variants: ExperimentVariant<T>[]
  userId?: string
}

interface ExperimentVariant<T = unknown> {
  name: string
  weight: number
  value: T
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [mdxe](https://www.npmjs.com/package/mdxe) | MDX execution and deployment |
| [mdxui](https://www.npmjs.com/package/mdxui) | UI component abstractions |
| [@mdxai/claude](https://www.npmjs.com/package/@mdxai/claude) | Claude-specific integrations |

## License

MIT

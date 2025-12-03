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

- **AI Functions** - RPC primitives, generation, embeddings, auto-define
- **Workflows** - Event-driven workflows with `$` context
- **Database** - Simplified AI-powered database interface
- **Persistence** - mdxdb-backed storage for functions and workflows
- **Experiments** - A/B testing and feature flags
- **Event Tracking** - Analytics and conversion tracking
- **MCP Server** - Claude integration via Model Context Protocol

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

mdxai re-exports functionality from several packages for convenience:

| Package | Exports |
|---------|---------|
| `ai-functions` | `AI`, `ai`, `generateObject`, `generateText`, RPC primitives |
| `ai-workflows` | `Workflow`, `on`, `every`, `send`, context utilities |
| `ai-database` | `DB`, `db`, `configureDB`, `MemoryDB` |
| `@mdxdb/fs` | `createFsDatabase` |
| `@mdxdb/sqlite` | `createSqliteDatabase` |
| `mdxld` | `MDXLDDocument`, `MDXLDData`, `Relationship` types |

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

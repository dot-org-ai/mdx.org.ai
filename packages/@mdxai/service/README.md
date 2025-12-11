# @mdxai/service

Agent session platform with MDX-first progressive UI - Cloudflare Worker with Durable Objects.

## Overview

`@mdxai/service` provides a Cloudflare Worker that manages Claude Agent SDK sessions using Durable Objects for persistent state and WebSocket connections. Sessions can be executed in three modes:

- **DO-native**: Agent SDK V2 runs directly in Durable Object (no VM needed)
- **Sandbox**: Cloudflare Sandbox with Docker container for git/filesystem operations
- **Local**: Local `pnpm claude` process streams events to SessionDO

All execution modes stream events to the same SessionDO for unified state management and real-time UI updates.

## Features

- **Durable Object Sessions**: Persistent session state with automatic storage
- **WebSocket Broadcasting**: Real-time updates to multiple connected clients
- **MDX Rendering**: Session state renders to semantic MDX components
- **Multiple Output Formats**: MDX → HTML, Markdown, JSON, React, etc.
- **OAuth Integration**: Token validation with oauth.do (TODO)
- **Event Streaming**: Unified event format from local, sandbox, or DO-native execution

## Installation

```bash
pnpm add @mdxai/service
```

## Usage

### Deploy Worker

```bash
cd packages/@mdxai/service
pnpm deploy
```

### Create Session (API)

```bash
curl -X POST https://agents.do/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Implement user authentication"}'

# Response:
# {
#   "sessionId": "uuid",
#   "url": "/sessions/uuid",
#   "wsUrl": "/sessions/uuid/ws"
# }
```

### Connect via WebSocket

```typescript
const ws = new WebSocket('wss://agents.do/sessions/uuid/ws')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  if (message.type === 'state') {
    console.log('Initial state:', message.data)
  }

  if (message.type === 'event') {
    console.log('Event:', message.event)
    console.log('Updated state:', message.state)
  }
}
```

### Post Events

```bash
curl -X POST https://agents.do/sessions/uuid/event \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "tool_use",
    "id": "tool-1",
    "tool": "Read",
    "input": {"file_path": "/path/to/file"}
  }'
```

### Get Session State

```bash
# JSON state
curl https://agents.do/sessions/uuid

# MDX representation
curl https://agents.do/sessions/uuid/mdx

# Markdown representation (GitHub-optimized)
curl https://agents.do/sessions/uuid/markdown
```

## API Reference

### Worker Endpoints

#### `POST /sessions`
Create new session. Returns `{ sessionId, url, wsUrl }`.

#### `GET /sessions/:id`
Get session state as JSON.

#### `GET /sessions/:id/mdx`
Get session state as MDX document.

#### `GET /sessions/:id/markdown`
Get session state as GitHub-flavored Markdown.

#### `POST /sessions/:id/event`
Post event to session. Body is `StreamEvent`.

#### `GET /sessions/:id/ws` (WebSocket)
Connect to session for real-time updates.

#### `POST /sessions/:id/run/native`
Trigger DO-native execution (Agent SDK V2 in DO).

### Types

```typescript
// Session state
interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  executionMode?: 'do-native' | 'sandbox' | 'local'
  model: string
  cwd?: string
  startedAt: Date
  completedAt?: Date
  error?: string
  plan: PlanStep[]
  todos: Todo[]
  tools: ToolExecution[]
  messages: Message[]
  cost: number
  duration: number
  usage: Usage
}

// Stream events
type StreamEvent =
  | { type: 'assistant'; content: string }
  | { type: 'tool_use'; id: string; tool: string; input: unknown }
  | { type: 'tool_result'; id: string; output: unknown; error?: string }
  | { type: 'result'; cost: number; duration: number; usage: Usage }
  | { type: 'error'; error: string }

// WebSocket messages
type WebSocketMessage =
  | { type: 'auth'; token: string }
  | { type: 'state'; data: SessionState }
  | { type: 'event'; event: StreamEvent; state: SessionState }
  | { type: 'error'; error: string }
```

## MDX Components

Session state renders to semantic MDX components:

```mdx
---
$type: AgentSession
$id: uuid
status: running
---

<SessionHeader status="running" model="claude-sonnet-4" />

<ProjectPlan steps={[...]} />

<TodoList todos={[...]} />

<ToolHistory tools={[...]} />

<SessionFooter cost={0.05} duration={1234} />
```

These components can be rendered by:
- `@mdxui/html` → HTML for web
- `@mdxui/markdown` → Markdown for GitHub
- `@mdxui/json` → JSON for APIs
- `@mdxui/slack` → Slack blocks
- `@mdxui/email` → Email HTML

## Development

```bash
# Install dependencies
pnpm install

# Run local dev server
pnpm dev

# Build package
pnpm build

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## Wrangler Configuration

```toml
name = "agents-do"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "SESSIONS", class_name = "SessionDO" }
]

[[migrations]]
tag = "v1"
new_classes = ["SessionDO"]
```

## Architecture

```
@mdxai/service
├── Worker (Hono app)
│   ├── POST /sessions → create session
│   ├── GET /sessions/:id → get state
│   └── * /sessions/:id/* → proxy to DO
│
└── SessionDO (Durable Object)
    ├── State persistence (DO storage)
    ├── WebSocket broadcasting
    ├── Event handling (local/sandbox/native)
    ├── MDX rendering
    └── Agent SDK V2 execution (TODO)
```

## TODO

- [ ] Implement OAuth token validation with oauth.do
- [ ] Implement Agent SDK V2 integration for DO-native mode
- [ ] Implement ai-database tools (mdxdb_read, mdxdb_write)
- [ ] Add session listing with KV or DO listing API
- [ ] Implement proper event normalization
- [ ] Add session cleanup/expiration
- [ ] Add rate limiting
- [ ] Add session analytics

## Related Packages

- `@mdxai/code` - CLI for running sessions locally
- `@mdxai/sandbox` - Cloudflare Sandbox execution
- `@mdxui/plan` - Dashboard UI
- `@mdxe/workers` - MDX evaluation in Workers
- `ai-database` - Schema-first database for mdxdb tools

## License

MIT

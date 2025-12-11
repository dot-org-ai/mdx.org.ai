# @mdxai/code

CLI and client SDK for Claude Agent sessions with MDX visualization.

## Installation

```bash
pnpm add @mdxai/code
```

## CLI Usage

### Authentication

```bash
# Login to agents.do (not yet implemented)
mdxai-code login

# Use environment variable instead
export MDXAI_TOKEN="your-token"
```

### Running Sessions

```bash
# Run locally (default) - spawns pnpm claude on your machine
mdxai-code run "Implement user authentication" --cwd ./packages/auth

# Run in DO-native mode - Agent SDK V2 in Durable Object
mdxai-code run "Create a business plan" --mode native

# Run in sandbox mode - Docker container with git access
mdxai-code run "Fix bug in repo" --mode sandbox

# Specify model
mdxai-code run "Write tests" --model opus

# Watch a session
mdxai-code watch abc123

# List all sessions
mdxai-code list

# Open dashboard in browser
mdxai-code dashboard
```

## Programmatic Usage

### Running Sessions

```typescript
import { runSession, getAuthToken } from '@mdxai/code'

const token = await getAuthToken()

// Create session
const response = await fetch('https://agents.do/sessions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ prompt: 'Implement auth' }),
})

const { sessionId } = await response.json()

// Run locally and stream to service
await runSession(
  {
    sessionId,
    prompt: 'Implement auth',
    cwd: './auth',
  },
  token
)
```

### Client SDK

```typescript
import { ApiClient, SessionClient } from '@mdxai/code'

// REST API client
const api = new ApiClient({ authToken: token })
const sessions = await api.listSessions()
const state = await api.getSession(sessionId)
const mdx = await api.getSessionMDX(sessionId)

// WebSocket client
const client = new SessionClient({ sessionId })
client.onState((state) => {
  console.log('Session updated:', state)
})
client.connect()
```

### React Components

```tsx
import { useSession, SessionCard, SessionDashboard } from '@mdxai/code'

function MyComponent({ sessionId }) {
  const state = useSession(sessionId)

  if (!state) return <div>Loading...</div>

  return <SessionCard state={state} />
}

function Dashboard({ sessionIds }) {
  return <SessionDashboard sessionIds={sessionIds} />
}
```

## Architecture

- **CLI**: Spawns `pnpm claude` processes and streams events
- **Runner**: Process management and event parsing
- **Auth**: Token management (oauth.do integration pending)
- **Client**: REST API and WebSocket clients
- **Components**: React components for session visualization

## Execution Modes

| Mode | Where Claude Runs | Use Case |
|------|-------------------|----------|
| **local** | Your machine (pnpm claude) | Development, local files |
| **native** | SessionDO (Agent SDK V2) | Autonomous execution, URL-based MDX |
| **sandbox** | Cloudflare Sandbox (Docker) | Git repos, filesystem operations |

All modes stream events to the same SessionDO for state management.

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck
```

## License

MIT

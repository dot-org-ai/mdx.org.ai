# @mdxai/sandbox

Cloudflare Sandbox execution for Claude Code - run AI agents with full filesystem and git access.

## Overview

`@mdxai/sandbox` provides a secure, containerized environment for running Claude Code CLI in Cloudflare's Sandbox infrastructure. This enables agent sessions that require traditional file operations, git repositories, and build tools.

## Features

- **Docker-based execution**: Pre-built container with Node.js, pnpm, git, and Claude Code
- **Git repository support**: Clone and work with repositories
- **Stream JSON parsing**: Parse Claude Code's `--output-format stream-json` output
- **Event reporting**: Stream events to SessionDO for real-time UI updates
- **Retry logic**: Automatic retry with exponential backoff for failed requests
- **Type-safe**: Full TypeScript types with Zod validation

## Architecture

```
┌─────────────────────────────────────────┐
│   Cloudflare Worker (agents.do)         │
│   ┌─────────────────────────────────┐   │
│   │     SessionDO                   │   │
│   │  • WebSocket broadcast          │   │
│   │  • State management             │   │
│   │  • /event endpoint              │   │
│   └──────────────▲──────────────────┘   │
└──────────────────┼──────────────────────┘
                   │ POST /event
                   │ (StreamEvents)
┌──────────────────┼──────────────────────┐
│   Cloudflare Sandbox                    │
│   ┌──────────────┴──────────────────┐   │
│   │  Docker Container               │   │
│   │  • git clone repo               │   │
│   │  • pnpm claude --stream-json    │   │
│   │  • Parse events                 │   │
│   │  • POST to SessionDO            │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Installation

```bash
pnpm add @mdxai/sandbox
```

## Usage

### Basic Execution

```typescript
import { executeInSandbox, reportSandboxEvents } from '@mdxai/sandbox'

// Get sandbox binding from environment
const sandbox = env.SANDBOX

// Execute Claude Code in sandbox
const proc = await executeInSandbox(sandbox, {
  sessionId: 'session-123',
  prompt: 'Fix the bug in main.ts',
  repo: 'https://github.com/user/repo',
  branch: 'main',
  model: 'sonnet',
})

// Stream events to SessionDO
await reportSandboxEvents(proc, {
  sessionUrl: 'https://agents.do/sessions/session-123',
  authToken: env.AUTH_TOKEN,
})
```

### With Initial Files

```typescript
const proc = await executeInSandbox(sandbox, {
  sessionId: 'session-456',
  prompt: 'Implement the new feature',
  files: {
    'instructions.md': '# Requirements\n\n- Add user authentication\n- Use JWT tokens',
    '.env': 'DATABASE_URL=postgres://...',
  },
  model: 'sonnet',
})
```

### Manual Event Processing

```typescript
import { streamEvents } from '@mdxai/sandbox'

const proc = await executeInSandbox(sandbox, config)

// Process events manually
for await (const event of streamEvents(proc.stdout)) {
  console.log(`Event: ${event.type}`, event)

  if (event.type === 'tool_use') {
    console.log(`Tool call: ${event.tool}`)
  }
}
```

### With Custom Reporter

```typescript
import { SandboxReporter } from '@mdxai/sandbox'

const reporter = new SandboxReporter({
  sessionUrl: 'https://agents.do/sessions/session-789',
  authToken: env.AUTH_TOKEN,
  retryAttempts: 5,
  retryDelay: 2000,
})

await reporter.streamToSession(proc)
```

## Configuration

### SandboxConfig

```typescript
interface SandboxConfig {
  sessionId: string           // Session ID for event reporting
  prompt: string             // Prompt to pass to Claude Code
  repo?: string              // Git repository URL to clone
  branch?: string            // Git branch to checkout
  cwd?: string               // Working directory (relative to /workspace)
  model?: string             // Claude model (default: 'sonnet')
  files?: Record<string, string>  // Initial files to write
  env?: Record<string, string>    // Environment variables
  timeout?: number           // Execution timeout in ms (default: 600000)
}
```

### ReporterConfig

```typescript
interface ReporterConfig {
  sessionUrl: string         // SessionDO URL (e.g., https://agents.do/sessions/123)
  authToken?: string         // Bearer token for authentication
  retryAttempts?: number     // Number of retry attempts (default: 3)
  retryDelay?: number        // Initial retry delay in ms (default: 1000)
}
```

## Stream Events

Claude Code with `--output-format stream-json` outputs events as newline-delimited JSON:

```typescript
type StreamEvent =
  | { type: 'assistant'; content: string }
  | { type: 'tool_use'; tool: string; input: unknown }
  | { type: 'tool_result'; tool_use_id?: string; output: unknown }
  | { type: 'result'; usage?: Usage; stop_reason?: string }
  | { type: 'error'; error: string; details?: unknown }
  | { type: 'complete'; exitCode: number }
```

## Container Image

The sandbox container includes:

- **Node.js 20** (slim)
- **pnpm** (latest)
- **git** with global config
- **@anthropic-ai/claude-code** (when published)

### Building Custom Images

You can extend the base Dockerfile:

```dockerfile
FROM ./container/Dockerfile

# Install additional tools
RUN apt-get update && apt-get install -y \
    python3 \
    build-essential

# Install project-specific dependencies
RUN pnpm add -g typescript tsx
```

## Development

```bash
# Install dependencies
pnpm install

# Type check
pnpm type-check

# Build
pnpm build

# Run local dev server
pnpm dev
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to staging
wrangler deploy --env staging
```

## Integration with @mdxai/service

The sandbox package is designed to work seamlessly with `@mdxai/service`:

```typescript
// In SessionDO (agents.do)
export class SessionDO implements DurableObject {
  async runInSandbox(config: SandboxConfig) {
    // Trigger sandbox execution
    await env.SANDBOX_WORKER.fetch(new Request('https://sandbox/execute', {
      method: 'POST',
      body: JSON.stringify({
        ...config,
        sessionUrl: `https://agents.do/sessions/${this.id}`,
        authToken: this.generateToken(),
      }),
    }))
  }
}
```

## Error Handling

The sandbox package includes robust error handling:

- **Network errors**: Automatic retry with exponential backoff
- **Process errors**: Captured and reported as error events
- **Timeout errors**: Process killed and error reported
- **Parse errors**: Invalid JSON lines are logged and skipped

## Security Considerations

- **API Keys**: Pass `ANTHROPIC_API_KEY` via environment variables
- **Authentication**: Use auth tokens for SessionDO communication
- **Git Credentials**: Use read-only tokens or SSH keys
- **Sandbox Isolation**: Cloudflare Sandbox provides isolation between executions

## Limitations

- **Beta Status**: Cloudflare Sandbox is in beta, APIs may change
- **Resource Limits**: Subject to Cloudflare's sandbox resource limits
- **Timeout**: Default 10-minute timeout for long-running operations
- **Storage**: Ephemeral filesystem, no persistence between executions

## Examples

See the [examples](./examples) directory for complete examples:

- `basic-execution.ts` - Simple sandbox execution
- `git-workflow.ts` - Working with git repositories
- `parallel-sessions.ts` - Running multiple sessions in parallel
- `custom-reporter.ts` - Custom event processing

## Related Packages

- **[@mdxai/service](../service)** - SessionDO and worker infrastructure
- **[@mdxai/code](../../../@mdxai/code)** - CLI and client SDK
- **[@mdxui/plan](../../../@mdxui/plan)** - Dashboard UI

## License

MIT

# @mdxui/plan

AI SDK Elements-style dashboard for monitoring Claude Agent SDK sessions in real-time.

## Overview

`@mdxui/plan` provides a polished Vite/React dashboard application for visualizing agent execution sessions. It features real-time updates via WebSocket, AI SDK Elements-inspired components, and a clean, modern UI built with Tailwind CSS.

## Features

- **Real-time Updates**: WebSocket-based live session monitoring
- **AI SDK Elements Style**: Polished components inspired by Vercel's AI SDK Elements
- **Multi-Session Dashboard**: Grid view of all active sessions
- **Execution Plan Viewer**: Step-by-step visualization with status indicators
- **Todo Progress Tracker**: Real-time task completion tracking
- **Tool Timeline**: Expandable tool execution history with input/output
- **Cost & Usage Metrics**: Token usage and cost visualization
- **Diff Viewer**: Syntax-highlighted code diffs

## Getting Started

### Installation

```bash
cd packages/@mdxui/plan
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
pnpm build
```

### Preview Production Build

```bash
pnpm preview
```

## Configuration

Set the API base URL via environment variable:

```bash
# .env.local
VITE_API_URL=https://agents.do
```

## Components

### Dashboard

Main component that displays a grid of all sessions.

```tsx
import { Dashboard } from '@mdxui/plan'

<Dashboard baseUrl="https://agents.do" />
```

### SessionCard

Individual session card with real-time updates.

```tsx
import { SessionCard } from '@mdxui/plan'

<SessionCard sessionId="session-123" baseUrl="https://agents.do" />
```

### PlanViewer

AI SDK Elements-style execution plan with animated step indicators.

```tsx
import { PlanViewer } from '@mdxui/plan'

<PlanViewer steps={planSteps} />
```

### ToolTimeline

Expandable timeline of tool executions with input/output.

```tsx
import { ToolTimeline } from '@mdxui/plan'

<ToolTimeline tools={toolExecutions} />
```

### TodoProgress

Task list with progress bar.

```tsx
import { TodoProgress } from '@mdxui/plan'

<TodoProgress todos={todos} />
```

### CostMeter

Cost and token usage visualization.

```tsx
import { CostMeter } from '@mdxui/plan'

<CostMeter cost={0.05} duration={12000} usage={tokenUsage} />
```

### DiffViewer

Syntax-highlighted diff viewer.

```tsx
import { DiffViewer } from '@mdxui/plan'

<DiffViewer diff={gitDiff} />
```

### StatusIndicator

Session status badge with animation.

```tsx
import { StatusIndicator } from '@mdxui/plan'

<StatusIndicator status="running" />
```

## Hooks

### useSession

Subscribe to a single session via WebSocket.

```tsx
import { useSession } from '@mdxui/plan'

const { state, isConnected, error } = useSession(sessionId, baseUrl)
```

### useSessions

Fetch multiple sessions via REST API (React Query).

```tsx
import { useSessions } from '@mdxui/plan'

const { data: sessions, isLoading, error } = useSessions({ baseUrl })
```

### useAuth

Authentication hook for oauth.do integration (placeholder).

```tsx
import { useAuth } from '@mdxui/plan'

const { token, isAuthenticated, login, logout } = useAuth()
```

## Architecture

```
src/
├── components/       # React components
│   ├── Dashboard.tsx
│   ├── SessionCard.tsx
│   ├── PlanViewer.tsx
│   ├── TodoProgress.tsx
│   ├── ToolTimeline.tsx
│   ├── CostMeter.tsx
│   ├── DiffViewer.tsx
│   └── StatusIndicator.tsx
├── hooks/           # React hooks
│   ├── useSession.ts
│   ├── useSessions.ts
│   └── useAuth.ts
├── lib/             # Utilities
│   ├── client.ts    # WebSocket client
│   ├── api.ts       # REST API helpers
│   ├── utils.ts     # cn() helper
│   └── formatters.ts # Duration, cost formatting
└── styles/
    └── globals.css  # Tailwind base styles
```

## Styling

Uses Tailwind CSS with custom design tokens:

- **Colors**: Primary, secondary, muted, accent, destructive
- **Animations**: fade-in, slide-in, pulse, spin
- **Typography**: Font smoothing and feature settings
- **Dark Mode**: Built-in dark mode support (class-based)

## WebSocket Protocol

The dashboard connects to sessions via WebSocket:

```
wss://agents.do/sessions/:sessionId
```

Expected message format:

```typescript
{
  type: 'state',
  data: SessionState
}
```

## REST API

The dashboard fetches sessions via REST API:

```
GET  /sessions          # List all sessions
GET  /sessions/:id/state # Get session state
POST /sessions          # Create new session
```

## Integration

Designed to work with:

- **@mdxai/service**: Cloudflare Worker with Durable Objects
- **@mdxai/code**: CLI and client SDK
- **oauth.do**: Authentication service

## License

MIT

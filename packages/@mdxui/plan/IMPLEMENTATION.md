# @mdxui/plan Implementation

This document describes the implementation of the `@mdxui/plan` package - a Vite/React dashboard for monitoring Claude Agent SDK sessions.

## Overview

A polished, production-ready dashboard application inspired by Vercel's AI SDK Elements, featuring real-time WebSocket updates, responsive design, and a comprehensive component library for visualizing agent execution.

## Package Structure

```
@mdxui/plan/
├── src/
│   ├── components/           # React components
│   │   ├── Dashboard.tsx           # Multi-session grid view
│   │   ├── SessionCard.tsx         # Individual session card
│   │   ├── PlanViewer.tsx          # AI SDK-style execution plan
│   │   ├── TodoProgress.tsx        # Task list with progress bar
│   │   ├── ToolTimeline.tsx        # Expandable tool execution history
│   │   ├── CostMeter.tsx           # Cost and token usage display
│   │   ├── DiffViewer.tsx          # Syntax-highlighted diffs
│   │   └── StatusIndicator.tsx     # Animated status badge
│   │
│   ├── hooks/                # React hooks
│   │   ├── useSession.ts           # Single session WebSocket hook
│   │   ├── useSessions.ts          # Multi-session REST API hook
│   │   └── useAuth.ts              # oauth.do authentication hook
│   │
│   ├── lib/                  # Utilities and clients
│   │   ├── client.ts               # WebSocket client class
│   │   ├── api.ts                  # REST API client class
│   │   ├── utils.ts                # cn() Tailwind utility
│   │   └── formatters.ts           # Duration, cost, token formatters
│   │
│   ├── styles/
│   │   └── globals.css             # Tailwind CSS + custom variables
│   │
│   ├── App.tsx               # Root application component
│   ├── main.tsx              # Vite entry point
│   ├── index.ts              # Package exports
│   └── vite-env.d.ts         # TypeScript environment types
│
├── index.html                # HTML template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tsconfig.node.json        # Node-specific TS config
├── vite.config.ts            # Vite configuration
├── tailwind.config.ts        # Tailwind CSS configuration
├── postcss.config.js         # PostCSS configuration
├── .eslintrc.cjs             # ESLint configuration
├── .gitignore                # Git ignore rules
├── .env.example              # Environment variables template
├── README.md                 # Package documentation
└── IMPLEMENTATION.md         # This file
```

## Key Features

### 1. Real-Time WebSocket Updates

**Implementation**: `src/lib/client.ts`

The `SessionClient` class manages WebSocket connections with:
- Automatic reconnection with exponential backoff
- Multiple subscriber support
- Type-safe message handling
- Connection state tracking

```typescript
const client = new SessionClient(sessionId, baseUrl)
const unsubscribe = client.subscribe((state) => {
  console.log('New state:', state)
})
```

### 2. AI SDK Elements-Style Components

**Implementation**: `src/components/PlanViewer.tsx`

Inspired by https://ai-sdk.dev/elements/components/plan, features:
- Animated step indicators (pending, active, completed, skipped)
- Smooth transitions with Tailwind animations
- Status-based color coding
- Clean, modern design

### 3. Component Library

All components are:
- Fully typed with TypeScript
- Responsive and mobile-friendly
- Animated with Tailwind CSS
- Exported for reuse in other packages

#### Components:

- **Dashboard**: Multi-session grid with loading and error states
- **SessionCard**: Real-time session viewer with all metrics
- **PlanViewer**: Step-by-step execution visualization
- **TodoProgress**: Task list with progress bar
- **ToolTimeline**: Expandable tool call history
- **CostMeter**: Cost and token usage metrics
- **DiffViewer**: Syntax-highlighted code diffs
- **StatusIndicator**: Animated status badges

### 4. React Query Integration

**Implementation**: `src/hooks/useSessions.ts`

Uses @tanstack/react-query for:
- Automatic background refetching
- Request deduplication
- Cache management
- Loading and error states

### 5. Tailwind CSS Design System

**Implementation**: `tailwind.config.ts` + `src/styles/globals.css`

Features:
- CSS variables for theming
- Dark mode support (class-based)
- Custom animations (fade-in, slide-in, pulse, spin)
- Consistent spacing and typography
- shadcn/ui-inspired color palette

### 6. Type Safety

**Implementation**: `src/lib/client.ts`

Comprehensive TypeScript types:
```typescript
interface SessionState {
  id: string
  status: 'idle' | 'running' | 'completed' | 'error'
  model: string
  cwd: string
  startedAt: Date | string
  completedAt?: Date | string
  plan: PlanStep[]
  todos: Todo[]
  tools: ToolExecution[]
  messages: Message[]
  cost: number
  duration: number
  usage?: Usage
}
```

## Design Decisions

### 1. Vite over Next.js

**Rationale**:
- Faster development server
- Simpler configuration
- Better for standalone dashboard
- Can be embedded in Next.js if needed later

### 2. React Query for REST

**Rationale**:
- Automatic caching and refetching
- Better loading/error state management
- Industry standard for data fetching

### 3. WebSocket for Real-Time

**Rationale**:
- Lower latency than polling
- Efficient for multiple clients
- Native browser support

### 4. Tailwind CSS

**Rationale**:
- Rapid development
- Consistent design system
- Excellent TypeScript support
- Easy theming with CSS variables

### 5. Lucide Icons

**Rationale**:
- Modern, consistent icon set
- Tree-shakeable
- React-first API
- Better than Font Awesome for this use case

## Usage Examples

### Basic Dashboard

```tsx
import { Dashboard } from '@mdxui/plan'

function App() {
  return <Dashboard baseUrl="https://agents.do" />
}
```

### Custom Session View

```tsx
import { SessionCard, PlanViewer, ToolTimeline } from '@mdxui/plan'
import { useSession } from '@mdxui/plan'

function CustomView({ sessionId }: { sessionId: string }) {
  const { state } = useSession(sessionId)

  return (
    <div>
      <h1>{state.id}</h1>
      <PlanViewer steps={state.plan} />
      <ToolTimeline tools={state.tools} />
    </div>
  )
}
```

### Programmatic Control

```tsx
import { SessionClient } from '@mdxui/plan'

const client = new SessionClient('session-123', 'wss://agents.do')

client.subscribe((state) => {
  console.log('Status:', state.status)
  console.log('Progress:', state.todos.filter(t => t.status === 'completed').length)
})
```

## Integration Points

### With @mdxai/service

The dashboard expects the following WebSocket protocol:

```typescript
// On connection, server sends:
{ type: 'state', data: SessionState }

// On updates:
{ type: 'event', event: StreamEvent, state: SessionState }
```

### With @mdxai/code

The CLI can open the dashboard:

```bash
mdxai-code run "task"
# Opens: https://agents.do/sessions/<id>
```

### With oauth.do

The `useAuth` hook provides authentication:

```typescript
const { token, isAuthenticated, login } = useAuth()
```

## Testing Strategy

### Unit Tests (Future)

- Component rendering
- Hook behavior
- Formatter functions
- Client connection logic

### Integration Tests (Future)

- WebSocket reconnection
- API error handling
- Multi-session coordination

### E2E Tests (Future)

- Full dashboard flow
- Session creation and monitoring
- Real-time updates

## Performance Considerations

### 1. WebSocket Connection Management

- Single connection per session
- Automatic reconnection
- Exponential backoff to prevent server overload

### 2. React Query Caching

- Stale-while-revalidate pattern
- Automatic garbage collection
- Request deduplication

### 3. Component Optimization

- Minimal re-renders
- CSS animations (hardware-accelerated)
- Virtualization for large tool lists (future)

### 4. Bundle Size

Current dependencies:
- React: ~40KB
- React Query: ~15KB
- Lucide React: ~5KB (tree-shaken)
- Total: ~60KB (gzipped)

## Future Enhancements

### Phase 1: Core Features
- [x] Real-time WebSocket updates
- [x] AI SDK Elements-style components
- [x] Multi-session dashboard
- [x] Tool timeline with expandable details
- [x] Cost and usage metrics

### Phase 2: Advanced Features
- [ ] Virtual scrolling for large tool lists
- [ ] Session search and filtering
- [ ] Export session data (JSON, MDX, Markdown)
- [ ] Session comparison view
- [ ] Dark mode toggle UI

### Phase 3: Collaboration
- [ ] Share session links
- [ ] Session comments/annotations
- [ ] Team dashboard with multiple users
- [ ] Slack/Discord notifications

### Phase 4: Analytics
- [ ] Cost tracking over time
- [ ] Success rate metrics
- [ ] Performance analytics
- [ ] Tool usage statistics

## Development Workflow

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Open http://localhost:5173
```

### Building

```bash
# Production build
pnpm build

# Preview build
pnpm preview
```

### Linting

```bash
# Run ESLint
pnpm lint
```

## Environment Variables

```bash
# API base URL
VITE_API_URL=https://agents.do

# For local development
VITE_API_URL=http://localhost:8787
```

## Deployment Options

### 1. Cloudflare Pages

```bash
pnpm build
# Upload dist/ to Cloudflare Pages
```

### 2. Vercel

```bash
# Connect GitHub repo to Vercel
# Auto-deploys on push
```

### 3. Static Hosting

```bash
pnpm build
# Upload dist/ to any static host
```

## Contributing

When adding new components:

1. Create component in `src/components/`
2. Export from `src/index.ts`
3. Add to README.md
4. Add usage example
5. Ensure TypeScript types are complete

## License

MIT - See LICENSE file for details

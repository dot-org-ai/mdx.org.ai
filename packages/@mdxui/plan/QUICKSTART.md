# Quick Start Guide - @mdxui/plan

Get the agent session dashboard up and running in 5 minutes.

## Installation

```bash
cd packages/@mdxui/plan
pnpm install
```

## Development Server

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Configuration

Create a `.env.local` file:

```bash
VITE_API_URL=https://agents.do
```

For local development with a local API:

```bash
VITE_API_URL=http://localhost:8787
```

## Building for Production

```bash
pnpm build
```

The built files will be in the `dist/` directory.

## Preview Production Build

```bash
pnpm preview
```

## Project Structure

```
src/
├── components/       # UI components
├── hooks/           # React hooks
├── lib/             # Utilities and clients
└── styles/          # CSS styles
```

## Key Components

### Dashboard

Shows all sessions in a grid:

```tsx
import { Dashboard } from './components/Dashboard'

<Dashboard baseUrl="https://agents.do" />
```

### SessionCard

Shows a single session with real-time updates:

```tsx
import { SessionCard } from './components/SessionCard'

<SessionCard sessionId="session-123" baseUrl="https://agents.do" />
```

### PlanViewer

AI SDK Elements-style execution plan:

```tsx
import { PlanViewer } from './components/PlanViewer'

<PlanViewer steps={planSteps} />
```

## Hooks

### useSession

Real-time session updates via WebSocket:

```tsx
import { useSession } from './hooks/useSession'

const { state, isConnected, error } = useSession(sessionId, baseUrl)
```

### useSessions

Fetch all sessions via REST API:

```tsx
import { useSessions } from './hooks/useSessions'

const { data: sessions, isLoading } = useSessions({ baseUrl })
```

## Customization

### Colors

Edit `tailwind.config.ts` to change the color scheme:

```typescript
theme: {
  extend: {
    colors: {
      primary: "hsl(var(--primary))",
      // Add your colors
    }
  }
}
```

### Animations

Edit `src/styles/globals.css` to adjust animations:

```css
@layer utilities {
  .animate-in {
    animation: fade-in 0.3s ease-out;
  }
}
```

## Troubleshooting

### Build Errors

If TypeScript errors occur:

```bash
pnpm build --force
```

### WebSocket Connection Issues

Check that the API URL is correct and accessible:

```bash
curl https://agents.do/sessions
```

### Hot Reload Not Working

Restart the dev server:

```bash
pnpm dev
```

## Next Steps

1. Integrate with `@mdxai/service` for real backend
2. Add authentication with `oauth.do`
3. Deploy to Cloudflare Pages or Vercel
4. Customize components for your use case

## Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

## Support

For issues and questions:
- Check the [README.md](./README.md)
- Review [IMPLEMENTATION.md](./IMPLEMENTATION.md)
- Open an issue on GitHub

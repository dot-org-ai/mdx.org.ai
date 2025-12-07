# @mdxui/mantine

Mantine UI components mapped to MDXUI abstract types - 120+ responsive components with dark/light themes.

## Installation

```bash
pnpm add @mdxui/mantine @mantine/core @mantine/hooks
```

## Usage

```tsx
import { AdminLayout } from '@mdxui/mantine/templates/layouts'
import { useDisclosure } from '@mdxui/mantine'

function Dashboard() {
  return (
    <AdminLayout
      title="My Dashboard"
      navigation={[
        { label: 'Home', path: '/' },
        { label: 'Settings', path: '/settings' }
      ]}
    >
      <h1>Dashboard Content</h1>
    </AdminLayout>
  )
}
```

## Components

### Core Components

```tsx
import {
  AppShellWrapper,
  SpotlightProvider,
  NotificationProvider
} from '@mdxui/mantine/components'
```

Available components:
- `AppShellWrapper` - Application shell layout
- `SpotlightProvider` - Command palette (Cmd+K)
- `NotificationProvider` - Toast notifications
- `StepperWrapper` - Multi-step forms
- `TimelineWrapper` - Event timeline

### Templates

Pre-built layouts with integrated Mantine features:

```tsx
import { AdminLayout } from '@mdxui/mantine/templates/layouts'

<AdminLayout
  title="Admin Panel"
  navigation={navItems}
  withSpotlight={true}
  withNotifications={true}
>
  {children}
</AdminLayout>
```

## Re-exported Hooks

Common Mantine hooks are re-exported for convenience:

```tsx
import {
  useDisclosure,    // Toggle state management
  useMediaQuery,    // Responsive media queries
  useColorScheme    // Dark/light mode detection
} from '@mdxui/mantine'

const [opened, { open, close }] = useDisclosure(false)
const isMobile = useMediaQuery('(max-width: 768px)')
const colorScheme = useColorScheme()
```

## Features

- Full Mantine v7 component library
- Dark/light theme support out of the box
- Spotlight (Cmd+K command palette)
- Notification system with toast UI
- Responsive AppShell layouts
- Multi-step forms with Stepper
- Timeline components for events
- TypeScript types included

## Exports

| Export | Description |
|--------|-------------|
| `/components` | Core wrapped components |
| `/templates` | Pre-built layouts (legacy) |
| `/templates/layouts` | Unified layout system (recommended) |

## Dependencies

- `@mantine/core` - Core component library
- `@mantine/hooks` - React hooks
- `@mantine/notifications` - Notification system
- `@mantine/spotlight` - Command palette

## License

MIT

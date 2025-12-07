# @mdxui/chat

AI chat component with customizable appearance, theming, and message streaming support.

## Installation

```bash
pnpm add @mdxui/chat
```

## Usage

```tsx
import { Chat } from '@mdxui/chat'

function MyApp() {
  const [messages, setMessages] = useState([
    { id: '1', role: 'assistant', content: 'How can I help you?' }
  ])

  const handleSendMessage = (content: string) => {
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content }
    ])
    // Call your AI backend here
  }

  return (
    <Chat
      messages={messages}
      onSendMessage={handleSendMessage}
      loading={false}
      darkMode={true}
      showAvatars={true}
      variant="default"
    />
  )
}
```

## Variants

- `default` - Standard chat window with fixed height
- `sidebar` - Narrow sidebar layout (320px default)
- `inline` - Embedded in content with custom dimensions
- `fullscreen` - Fixed overlay covering entire viewport

## Features

- Multiple layout variants (default, sidebar, inline, fullscreen)
- Built-in dark/light themes with full customization
- Message streaming support with `isStreaming` flag
- Custom message and input renderers
- Optional timestamps and avatars
- Auto-scroll to bottom
- Disabled state during loading
- Footer content area

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `messages` | `ChatMessage[]` | `[]` | Chat message history |
| `onSendMessage` | `(message: string) => void` | - | Called when user sends message |
| `loading` | `boolean` | `false` | Show loading indicator |
| `variant` | `ChatVariant` | `'default'` | Layout variant |
| `darkMode` | `boolean` | `true` | Use dark theme |
| `theme` | `ChatTheme` | - | Custom theme override |
| `showTimestamps` | `boolean` | `false` | Display message timestamps |
| `showAvatars` | `boolean` | `false` | Display user/assistant avatars |

## Types

```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
  metadata?: Record<string, unknown>
  isStreaming?: boolean  // For in-progress AI responses
}

interface ChatTheme {
  background?: string
  foreground?: string
  userBubble?: string
  assistantBubble?: string
  inputBackground?: string
  border?: string
  accent?: string
}
```

## License

MIT

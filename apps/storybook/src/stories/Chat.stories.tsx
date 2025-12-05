import type { Meta, StoryObj } from '@storybook/react'
import { Chat, type ChatMessage } from '@mdxui/chat'
import { useState } from 'react'

const meta: Meta<typeof Chat> = {
  title: 'Widgets/Chat',
  component: Chat,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'sidebar', 'inline', 'fullscreen'],
    },
    darkMode: {
      control: 'boolean',
    },
    showTimestamps: {
      control: 'boolean',
    },
    showAvatars: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    height: {
      control: 'number',
    },
    width: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

// Sample messages for stories
const sampleMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'How do I add frontmatter to an MDX file?',
    timestamp: new Date(Date.now() - 60000),
  },
  {
    id: '2',
    role: 'assistant',
    content: `To add frontmatter to an MDX file, start your file with three dashes (---), add your YAML metadata, and close with three more dashes.

For example:
\`\`\`yaml
---
title: My Post
date: 2024-01-15
author: John Doe
---
\`\`\`

The frontmatter will be parsed and available as data in your MDX components.`,
    timestamp: new Date(Date.now() - 30000),
  },
  {
    id: '3',
    role: 'user',
    content: 'Can I use TypeScript types in the frontmatter?',
    timestamp: new Date(),
  },
]

const codingMessages: ChatMessage[] = [
  {
    id: '1',
    role: 'user',
    content: 'Write a function to check if a number is prime',
  },
  {
    id: '2',
    role: 'assistant',
    content: `Here's a TypeScript function to check if a number is prime:

\`\`\`typescript
function isPrime(n: number): boolean {
  if (n <= 1) return false
  if (n <= 3) return true
  if (n % 2 === 0 || n % 3 === 0) return false

  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) {
      return false
    }
  }
  return true
}
\`\`\`

This uses trial division with optimization - it only checks up to √n and skips multiples of 2 and 3.`,
  },
]

// ===================
// Basic Variants
// ===================

export const Default: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    height: 500,
    width: 400,
  },
}

export const Sidebar: Story = {
  args: {
    messages: sampleMessages,
    title: 'Chat',
    variant: 'sidebar',
    width: 320,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 600, display: 'flex' }}>
        <div style={{ flex: 1, background: '#1e1e1e' }} />
        <Story />
      </div>
    ),
  ],
}

export const Inline: Story = {
  args: {
    messages: sampleMessages,
    title: 'Help',
    variant: 'inline',
    height: 400,
    width: 500,
  },
}

export const Fullscreen: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    variant: 'fullscreen',
    showAvatars: true,
  },
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
        <Story />
      </div>
    ),
  ],
}

// ===================
// Themes
// ===================

export const LightMode: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    darkMode: false,
    height: 500,
    width: 400,
  },
}

export const CustomTheme: Story = {
  args: {
    messages: sampleMessages,
    title: 'Custom Chat',
    height: 500,
    width: 400,
    theme: {
      background: '#1a1a2e',
      foreground: '#eaeaea',
      userBubble: '#4a47a3',
      assistantBubble: '#16213e',
      inputBackground: '#0f0f23',
      border: '#2a2a4a',
      accent: '#e94560',
    },
  },
}

// ===================
// Features
// ===================

export const WithTimestamps: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    showTimestamps: true,
    height: 500,
    width: 400,
  },
}

export const WithAvatars: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    showAvatars: true,
    height: 500,
    width: 400,
  },
}

export const WithAvatarsAndTimestamps: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    showAvatars: true,
    showTimestamps: true,
    height: 500,
    width: 400,
  },
}

export const CustomAvatars: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    showAvatars: true,
    userAvatar: '🧑‍💻',
    assistantAvatar: '🤖',
    height: 500,
    width: 400,
  },
}

// ===================
// States
// ===================

export const Loading: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    loading: true,
    loadingText: 'Thinking...',
    height: 500,
    width: 400,
  },
}

export const CustomLoadingText: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    loading: true,
    loadingText: 'Analyzing your code...',
    height: 500,
    width: 400,
  },
}

export const Disabled: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    disabled: true,
    height: 500,
    width: 400,
  },
}

export const Empty: Story = {
  args: {
    messages: [],
    title: 'New Chat',
    placeholder: 'Ask me anything...',
    height: 500,
    width: 400,
  },
}

// ===================
// Content Types
// ===================

export const CodeConversation: Story = {
  args: {
    messages: codingMessages,
    title: 'Code Assistant',
    height: 500,
    width: 450,
  },
}

export const StreamingMessage: Story = {
  args: {
    messages: [
      ...sampleMessages,
      {
        id: '4',
        role: 'assistant',
        content: 'Yes, you can define TypeScript types for your frontmatter using...',
        isStreaming: true,
      },
    ],
    title: 'AI Assistant',
    height: 500,
    width: 400,
  },
}

// ===================
// Header Customization
// ===================

export const WithHeaderActions: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    height: 500,
    width: 400,
    headerActions: (
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: 4,
          }}
          onClick={() => alert('Settings clicked')}
        >
          ⚙️
        </button>
        <button
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: 4,
          }}
          onClick={() => alert('Clear clicked')}
        >
          🗑️
        </button>
      </div>
    ),
  },
}

// ===================
// Interactive Examples
// ===================

export const Interactive: Story = {
  render: () => {
    const [messages, setMessages] = useState<ChatMessage[]>(sampleMessages)
    const [loading, setLoading] = useState(false)

    const handleSend = (content: string) => {
      // Add user message
      const userMessage: ChatMessage = {
        id: String(Date.now()),
        role: 'user',
        content,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setLoading(true)

      // Simulate AI response
      setTimeout(() => {
        const assistantMessage: ChatMessage = {
          id: String(Date.now() + 1),
          role: 'assistant',
          content: `I received your message: "${content}"\n\nThis is a simulated response. In a real application, this would be connected to an AI API.`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        setLoading(false)
      }, 1500)
    }

    return (
      <Chat
        messages={messages}
        onSendMessage={handleSend}
        loading={loading}
        title="Interactive Demo"
        showAvatars
        showTimestamps
        height={500}
        width={400}
      />
    )
  },
}

export const WithFooter: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    height: 500,
    width: 400,
    footer: (
      <div style={{ fontSize: 12, opacity: 0.6, textAlign: 'center' }}>
        Powered by Claude AI • <a href="#" style={{ color: 'inherit' }}>Terms</a> • <a href="#" style={{ color: 'inherit' }}>Privacy</a>
      </div>
    ),
  },
}

// ===================
// Additional Themes
// ===================

export const GreenTheme: Story = {
  args: {
    messages: sampleMessages,
    title: 'Eco Chat',
    height: 500,
    width: 400,
    theme: {
      background: '#0d1f0d',
      foreground: '#e0ffe0',
      userBubble: '#1a4d1a',
      assistantBubble: '#0f2f0f',
      inputBackground: '#0a1a0a',
      border: '#2d5a2d',
      accent: '#4caf50',
    },
  },
}

export const PurpleTheme: Story = {
  args: {
    messages: sampleMessages,
    title: 'Night Owl',
    height: 500,
    width: 400,
    theme: {
      background: '#1a1025',
      foreground: '#e8e0f0',
      userBubble: '#4a3070',
      assistantBubble: '#2a1a40',
      inputBackground: '#150d20',
      border: '#3d2a5a',
      accent: '#9c27b0',
    },
  },
}

export const OrangeTheme: Story = {
  args: {
    messages: sampleMessages,
    title: 'Warm Chat',
    height: 500,
    width: 400,
    darkMode: false,
    theme: {
      background: '#fff8f0',
      foreground: '#4a3020',
      userBubble: '#ffe0c0',
      assistantBubble: '#fff0e0',
      inputBackground: '#ffffff',
      border: '#e0c0a0',
      accent: '#ff9800',
    },
  },
}

// ===================
// Size Variations
// ===================

export const Compact: Story = {
  args: {
    messages: sampleMessages.slice(0, 2),
    title: 'Quick Help',
    height: 300,
    width: 300,
  },
}

export const Wide: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    height: 400,
    width: 600,
    showAvatars: true,
  },
}

export const Tall: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    height: 700,
    width: 350,
    showAvatars: true,
    showTimestamps: true,
  },
}

// ===================
// Long Conversations
// ===================

const longConversation: ChatMessage[] = [
  { id: '1', role: 'user', content: 'What is TypeScript?' },
  { id: '2', role: 'assistant', content: 'TypeScript is a strongly typed programming language that builds on JavaScript. It adds optional static typing and class-based object-oriented programming to the language.' },
  { id: '3', role: 'user', content: 'How do I install it?' },
  { id: '4', role: 'assistant', content: 'You can install TypeScript using npm:\n\n```bash\nnpm install -g typescript\n```\n\nOr as a dev dependency in your project:\n\n```bash\nnpm install --save-dev typescript\n```' },
  { id: '5', role: 'user', content: 'What about configuration?' },
  { id: '6', role: 'assistant', content: 'Create a tsconfig.json file in your project root. You can generate one with:\n\n```bash\ntsc --init\n```\n\nThis will create a default configuration file with common options.' },
  { id: '7', role: 'user', content: 'Can you show me a simple example?' },
  { id: '8', role: 'assistant', content: 'Here\'s a simple TypeScript example:\n\n```typescript\ninterface Person {\n  name: string;\n  age: number;\n}\n\nfunction greet(person: Person): string {\n  return `Hello, ${person.name}!`;\n}\n\nconst user: Person = {\n  name: "Alice",\n  age: 30\n};\n\nconsole.log(greet(user));\n```' },
  { id: '9', role: 'user', content: 'Thanks! What about React with TypeScript?' },
  { id: '10', role: 'assistant', content: 'React works great with TypeScript! Here\'s how to type a component:\n\n```tsx\ninterface ButtonProps {\n  label: string;\n  onClick: () => void;\n  disabled?: boolean;\n}\n\nconst Button: React.FC<ButtonProps> = ({\n  label,\n  onClick,\n  disabled = false\n}) => (\n  <button onClick={onClick} disabled={disabled}>\n    {label}\n  </button>\n);\n```' },
]

export const LongConversation: Story = {
  args: {
    messages: longConversation,
    title: 'Learning TypeScript',
    height: 600,
    width: 450,
    showAvatars: true,
  },
}

// ===================
// Custom Rendering
// ===================

export const CustomMessageRenderer: Story = {
  args: {
    messages: sampleMessages,
    title: 'Custom Styled',
    height: 500,
    width: 400,
  },
  render: (args) => (
    <Chat
      {...args}
      renderMessage={(message) => (
        <div
          key={message.id}
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 16,
            background: message.role === 'user'
              ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : 'linear-gradient(135deg, #2d3436 0%, #000000 100%)',
            color: '#fff',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontSize: 10, opacity: 0.7, marginBottom: 4, textTransform: 'uppercase' }}>
            {message.role === 'user' ? 'You' : 'AI'}
          </div>
          <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        </div>
      )}
    />
  ),
}

// ===================
// Sidebar Variations
// ===================

export const SidebarLight: Story = {
  args: {
    messages: sampleMessages,
    title: 'Help',
    variant: 'sidebar',
    width: 320,
    darkMode: false,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 600, display: 'flex' }}>
        <div style={{ flex: 1, background: '#f5f5f5' }} />
        <Story />
      </div>
    ),
  ],
}

export const SidebarNarrow: Story = {
  args: {
    messages: sampleMessages,
    title: 'Chat',
    variant: 'sidebar',
    width: 280,
    showAvatars: true,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 600, display: 'flex' }}>
        <div style={{ flex: 1, background: '#1e1e1e' }} />
        <Story />
      </div>
    ),
  ],
}

export const SidebarWide: Story = {
  args: {
    messages: sampleMessages,
    title: 'AI Assistant',
    variant: 'sidebar',
    width: 400,
    showAvatars: true,
    showTimestamps: true,
  },
  decorators: [
    (Story) => (
      <div style={{ height: 600, display: 'flex' }}>
        <div style={{ flex: 1, background: '#1e1e1e' }} />
        <Story />
      </div>
    ),
  ],
}

// ===================
// All Features Combined
// ===================

export const FullFeatured: Story = {
  args: {
    messages: longConversation.slice(0, 6),
    title: 'Full Featured Chat',
    height: 600,
    width: 450,
    showAvatars: true,
    showTimestamps: true,
    userAvatar: '👩‍💻',
    assistantAvatar: '🤖',
    headerActions: (
      <div style={{ display: 'flex', gap: 4 }}>
        <button style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}>📋</button>
        <button style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}>⚙️</button>
        <button style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 4 }}>🗑️</button>
      </div>
    ),
    footer: (
      <div style={{ fontSize: 11, opacity: 0.5, textAlign: 'center' }}>
        AI may make mistakes. Verify important information.
      </div>
    ),
  },
}

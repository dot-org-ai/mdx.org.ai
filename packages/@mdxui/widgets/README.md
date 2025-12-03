# @mdxui/widgets

Advanced widgets for MDX applications including chatbox, editor, and searchbox components.

## Installation

```bash
npm install @mdxui/widgets
# or
pnpm add @mdxui/widgets
# or
yarn add @mdxui/widgets
```

## Features

- **Chatbox** - AI chat interface components
- **Editor** - MDX code editor with preview
- **Searchbox** - Command palette style search
- **Theme Provider** - Dark/light mode support
- **Autosave** - Automatic content saving
- **Responsive** - Mobile-friendly layouts
- **Type-Safe** - Full TypeScript support

## Quick Start

```tsx
import { Chatbox, Editor, Searchbox, ThemeProvider } from '@mdxui/widgets'

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <Editor
        defaultValue="# Hello World"
        onChange={(value) => console.log(value)}
      />
    </ThemeProvider>
  )
}
```

## Components

### Chatbox

AI chat interface with message history and streaming support.

```tsx
import { Chatbox, ChatMessage, ChatInput } from '@mdxui/widgets'

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([])

  return (
    <Chatbox>
      {messages.map((msg) => (
        <ChatMessage
          key={msg.id}
          role={msg.role}
          content={msg.content}
        />
      ))}
      <ChatInput
        onSubmit={async (input) => {
          // Send message to AI
          const response = await sendMessage(input)
          setMessages([...messages, response])
        }}
        placeholder="Ask a question..."
      />
    </Chatbox>
  )
}
```

#### Chatbox Components

```tsx
import {
  Chatbox,
  ChatMessage,
  ChatInput,
  ChatHeader,
  ChatActions,
  ChatSuggestions
} from '@mdxui/widgets'

<Chatbox className="h-[600px]">
  <ChatHeader
    title="AI Assistant"
    subtitle="Powered by Claude"
    onClose={() => {}}
  />

  <div className="flex-1 overflow-auto">
    <ChatMessage role="assistant" content="Hello! How can I help?" />
    <ChatMessage role="user" content="Tell me about MDX" />
    <ChatMessage role="assistant" content="MDX combines..." streaming />
  </div>

  <ChatSuggestions
    suggestions={[
      'What is MDX?',
      'How do I get started?',
      'Show me examples'
    ]}
    onSelect={(suggestion) => handleSend(suggestion)}
  />

  <ChatInput
    onSubmit={handleSend}
    disabled={isLoading}
    placeholder="Type your message..."
  />

  <ChatActions>
    <Button variant="ghost" size="sm">Clear</Button>
    <Button variant="ghost" size="sm">Export</Button>
  </ChatActions>
</Chatbox>
```

### Editor

Full-featured MDX editor with live preview.

```tsx
import { Editor, EditorPreview, EditorToolbar } from '@mdxui/widgets'

function MDXEditor() {
  const [content, setContent] = useState('# Hello World')

  return (
    <Editor
      value={content}
      onChange={setContent}
      language="mdx"
      theme="dark"
    >
      <EditorToolbar>
        <Button onClick={() => insertHeading()}>H1</Button>
        <Button onClick={() => insertBold()}>B</Button>
        <Button onClick={() => insertItalic()}>I</Button>
      </EditorToolbar>

      <div className="flex">
        <Editor.Code className="w-1/2" />
        <EditorPreview className="w-1/2" />
      </div>
    </Editor>
  )
}
```

#### Editor Features

```tsx
import { Editor, useEditor } from '@mdxui/widgets'

function AdvancedEditor() {
  const editor = useEditor({
    defaultValue: '# Welcome',
    language: 'mdx',
    autosave: true,
    autosaveDelay: 1000
  })

  return (
    <Editor {...editor}>
      {/* Toolbar with formatting options */}
      <EditorToolbar>
        <ToggleGroup type="single">
          <ToggleGroupItem value="h1" onClick={() => editor.format('h1')}>
            H1
          </ToggleGroupItem>
          <ToggleGroupItem value="h2" onClick={() => editor.format('h2')}>
            H2
          </ToggleGroupItem>
        </ToggleGroup>

        <Separator orientation="vertical" />

        <Button variant="ghost" onClick={() => editor.format('bold')}>
          <Bold className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => editor.format('italic')}>
          <Italic className="h-4 w-4" />
        </Button>
        <Button variant="ghost" onClick={() => editor.format('code')}>
          <Code className="h-4 w-4" />
        </Button>
      </EditorToolbar>

      {/* Split view */}
      <Resizable>
        <ResizablePanel>
          <Editor.Code
            lineNumbers
            highlightActiveLine
            tabSize={2}
          />
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel>
          <EditorPreview
            className="prose dark:prose-invert"
          />
        </ResizablePanel>
      </Resizable>

      {/* Status bar */}
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>Line {editor.cursor.line}, Col {editor.cursor.column}</span>
        <span>{editor.saved ? 'Saved' : 'Unsaved'}</span>
      </div>
    </Editor>
  )
}
```

### Searchbox

Command palette style search interface.

```tsx
import { Searchbox, SearchResults, SearchInput } from '@mdxui/widgets'

function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  return (
    <Searchbox open={isOpen} onOpenChange={setIsOpen}>
      <SearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search documentation..."
      />

      <SearchResults>
        {results.map((result) => (
          <SearchResults.Item
            key={result.id}
            title={result.title}
            description={result.description}
            href={result.url}
            icon={<FileText />}
          />
        ))}
      </SearchResults>
    </Searchbox>
  )
}
```

#### Searchbox with Categories

```tsx
import {
  Searchbox,
  SearchInput,
  SearchResults,
  SearchGroup,
  SearchItem,
  SearchEmpty
} from '@mdxui/widgets'

<Searchbox>
  <SearchInput placeholder="Search or type a command..." />

  <SearchEmpty>No results found.</SearchEmpty>

  <SearchGroup heading="Pages">
    <SearchItem href="/docs">Documentation</SearchItem>
    <SearchItem href="/api">API Reference</SearchItem>
    <SearchItem href="/examples">Examples</SearchItem>
  </SearchGroup>

  <SearchGroup heading="Actions">
    <SearchItem onSelect={() => toggleTheme()}>
      Toggle Theme
      <Kbd>⌘T</Kbd>
    </SearchItem>
    <SearchItem onSelect={() => openSettings()}>
      Settings
      <Kbd>⌘,</Kbd>
    </SearchItem>
  </SearchGroup>
</Searchbox>
```

### ThemeProvider

Manage dark/light mode across your application.

```tsx
import { ThemeProvider, useTheme } from '@mdxui/widgets'

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-app-theme">
      <Content />
    </ThemeProvider>
  )
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  )
}
```

## Hooks

### `useAutosave`

Automatically save content after a delay.

```tsx
import { useAutosave } from '@mdxui/widgets'

function AutosaveEditor() {
  const [content, setContent] = useState('')

  const { isSaving, lastSaved } = useAutosave({
    data: content,
    onSave: async (data) => {
      await saveToServer(data)
    },
    delay: 2000  // 2 seconds
  })

  return (
    <div>
      <textarea value={content} onChange={(e) => setContent(e.target.value)} />
      <span>{isSaving ? 'Saving...' : `Last saved: ${lastSaved}`}</span>
    </div>
  )
}
```

### `useEditorLayout`

Manage editor layout state (split, preview, code-only).

```tsx
import { useEditorLayout } from '@mdxui/widgets'

function LayoutSwitcher() {
  const { layout, setLayout } = useEditorLayout()

  return (
    <ToggleGroup value={layout} onValueChange={setLayout}>
      <ToggleGroupItem value="code">Code</ToggleGroupItem>
      <ToggleGroupItem value="split">Split</ToggleGroupItem>
      <ToggleGroupItem value="preview">Preview</ToggleGroupItem>
    </ToggleGroup>
  )
}
```

### `useMediaQuery`

Responsive design hook.

```tsx
import { useMediaQuery } from '@mdxui/widgets'

function ResponsiveLayout() {
  const isMobile = useMediaQuery('(max-width: 768px)')
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)')

  if (isMobile) {
    return <MobileLayout />
  }

  return <DesktopLayout />
}
```

## Utilities

### `cn`

Merge class names with Tailwind CSS.

```tsx
import { cn } from '@mdxui/widgets'

<div className={cn(
  'base-class',
  isActive && 'active',
  variant === 'primary' ? 'bg-blue-500' : 'bg-gray-500'
)} />
```

## UI Components

The package re-exports essential UI components:

```tsx
import {
  Button,
  Input,
  Textarea,
  Dialog,
  Command,
  Tabs,
  Select,
  DropdownMenu,
  Tooltip,
  Toggle,
  ToggleGroup,
  Separator,
  Resizable,
  Kbd,
  AlertDialog,
  Sonner
} from '@mdxui/widgets'
```

## Examples

### Full Chat Application

```tsx
import {
  Chatbox,
  ChatMessage,
  ChatInput,
  ChatHeader,
  ThemeProvider
} from '@mdxui/widgets'

function ChatApp() {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSend = async (content: string) => {
    const userMessage = { id: Date.now(), role: 'user', content }
    setMessages((prev) => [...prev, userMessage])
    setIsLoading(true)

    const response = await fetch('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ messages: [...messages, userMessage] })
    })

    const data = await response.json()
    setMessages((prev) => [...prev, data.message])
    setIsLoading(false)
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <Chatbox className="h-screen max-w-2xl mx-auto">
        <ChatHeader title="AI Chat" />

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map((msg) => (
            <ChatMessage key={msg.id} {...msg} />
          ))}
          {isLoading && <ChatMessage role="assistant" content="" streaming />}
        </div>

        <ChatInput
          onSubmit={handleSend}
          disabled={isLoading}
          placeholder="Type a message..."
        />
      </Chatbox>
    </ThemeProvider>
  )
}
```

### Documentation Search

```tsx
import { Searchbox, SearchInput, SearchResults } from '@mdxui/widgets'
import { useHotkeys } from 'react-hotkeys-hook'

function DocSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])

  useHotkeys('cmd+k', () => setOpen(true))

  useEffect(() => {
    if (query) {
      searchDocs(query).then(setResults)
    }
  }, [query])

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Search <Kbd>⌘K</Kbd>
      </Button>

      <Searchbox open={open} onOpenChange={setOpen}>
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search documentation..."
        />

        <SearchResults>
          {results.map((result) => (
            <SearchResults.Item
              key={result.id}
              title={result.title}
              description={result.excerpt}
              href={result.url}
              onSelect={() => setOpen(false)}
            />
          ))}
        </SearchResults>
      </Searchbox>
    </>
  )
}
```

## Types

### Chat Types

```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt?: Date
}

interface ChatboxProps {
  children: React.ReactNode
  className?: string
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  streaming?: boolean
}

interface ChatInputProps {
  onSubmit: (content: string) => void
  placeholder?: string
  disabled?: boolean
}
```

### Editor Types

```typescript
interface EditorProps {
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  language?: 'mdx' | 'markdown' | 'javascript' | 'typescript'
  theme?: 'light' | 'dark'
}

interface UseEditorOptions {
  defaultValue?: string
  language?: string
  autosave?: boolean
  autosaveDelay?: number
}
```

### Search Types

```typescript
interface SearchResult {
  id: string
  title: string
  description?: string
  url: string
  category?: string
}

interface SearchboxProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [@mdxui/shadcn](https://www.npmjs.com/package/@mdxui/shadcn) | UI components |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [react](https://www.npmjs.com/package/react) | React framework |

## License

MIT

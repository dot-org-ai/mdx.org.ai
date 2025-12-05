import type { Meta, StoryObj } from '@storybook/react'
import { Editor, type FileTreeItem, type ChatMessage } from '@mdxui/editor'

const meta: Meta<typeof Editor> = {
  title: 'Widgets/Editor',
  component: Editor,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    theme: {
      control: 'select',
      options: ['vs', 'vs-dark', 'hc-black', 'hc-light'],
    },
    language: {
      control: 'select',
      options: ['mdx', 'markdown', 'typescript', 'javascript', 'json', 'yaml'],
    },
    layout: {
      control: 'select',
      options: ['minimal', 'editor', 'split', 'full'],
      description: 'Layout preset',
    },
    secondaryPosition: {
      control: 'select',
      options: ['right', 'bottom'],
    },
    height: {
      control: 'text',
    },
    readOnly: {
      control: 'boolean',
    },
    sidebarWidth: {
      control: 'number',
    },
    chatWidth: {
      control: 'number',
    },
  },
}

export default meta
type Story = StoryObj<typeof meta>

const sampleMdx = `---
title: Hello World
description: A sample MDX document
author: mdxdb
date: 2024-01-15
---

# Welcome to MDX

This is a sample **MDX** document with:

- Frontmatter metadata
- Markdown content
- JSX components

<Card title="Example">
  This is a card component rendered in MDX.
</Card>

## Code Example

\`\`\`typescript
function greet(name: string) {
  return \`Hello, \${name}!\`
}
\`\`\`
`

const sampleMarkdown = `# Markdown Document

This is a **bold** text and this is *italic*.

## Lists

- Item 1
- Item 2
- Item 3

## Code

\`\`\`javascript
console.log('Hello, World!')
\`\`\`
`

const sampleTypeScript = `interface User {
  id: string
  name: string
  email: string
}

async function fetchUser(id: string): Promise<User> {
  const response = await fetch(\`/api/users/\${id}\`)
  return response.json()
}

export { fetchUser, type User }
`

// Sample data for sidebar stories
const sampleFiles: FileTreeItem[] = [
  {
    id: '1',
    name: 'posts',
    path: '/posts',
    type: 'folder',
    children: [
      { id: '2', name: 'hello-world.mdx', path: '/posts/hello-world.mdx', type: 'file' },
      { id: '3', name: 'getting-started.mdx', path: '/posts/getting-started.mdx', type: 'file' },
      { id: '4', name: 'advanced-tips.mdx', path: '/posts/advanced-tips.mdx', type: 'file' },
    ],
  },
  {
    id: '5',
    name: 'docs',
    path: '/docs',
    type: 'folder',
    children: [
      { id: '6', name: 'api-reference.mdx', path: '/docs/api-reference.mdx', type: 'file' },
      { id: '7', name: 'configuration.mdx', path: '/docs/configuration.mdx', type: 'file' },
    ],
  },
  { id: '8', name: 'README.mdx', path: '/README.mdx', type: 'file' },
]

// Sample chat messages
const sampleMessages: ChatMessage[] = [
  { id: '1', role: 'user', content: 'How do I add frontmatter to an MDX file?' },
  { id: '2', role: 'assistant', content: 'To add frontmatter to an MDX file, start your file with three dashes (---), add your YAML metadata, and close with three more dashes. For example:\n\n---\ntitle: My Post\ndate: 2024-01-15\n---' },
  { id: '3', role: 'user', content: 'Can I use TypeScript types in the frontmatter?' },
]

// ===================
// Layout Presets
// ===================

export const Minimal: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'minimal',
    theme: 'vs-dark',
    height: 500,
  },
}

export const EditorOnly: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    theme: 'vs-dark',
    height: 500,
  },
}

export const SplitView: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'split',
    theme: 'vs-dark',
    height: 500,
  },
}

export const FullLayout: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'full',
    theme: 'vs-dark',
    height: 600,
    files: sampleFiles,
    selectedFile: '/posts/hello-world.mdx',
    messages: sampleMessages,
  },
}

// ===================
// Panel Configurations
// ===================

export const WithSidebar: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { sidebar: true },
    theme: 'vs-dark',
    height: 500,
    files: sampleFiles,
    selectedFile: '/posts/hello-world.mdx',
  },
}

export const WithChat: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { chat: true },
    theme: 'vs-dark',
    height: 500,
    messages: sampleMessages,
  },
}

export const WithPreview: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { preview: true },
    theme: 'vs-dark',
    height: 500,
    data: { title: 'Hello World', description: 'A sample MDX document' },
  },
}

export const WithAST: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { ast: true },
    theme: 'vs-dark',
    height: 500,
  },
}

export const PreviewBottom: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'split',
    secondaryPosition: 'bottom',
    theme: 'vs-dark',
    height: 600,
  },
}

export const SidebarAndPreview: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { sidebar: true, preview: true },
    theme: 'vs-dark',
    height: 500,
    files: sampleFiles,
    selectedFile: '/posts/hello-world.mdx',
    data: { title: 'Hello World', description: 'A sample MDX document' },
  },
}

// ===================
// Themes
// ===================

export const LightTheme: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    theme: 'vs',
    height: 500,
  },
}

export const HighContrastDark: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    theme: 'hc-black',
    height: 500,
  },
}

// ===================
// Languages
// ===================

export const Markdown: Story = {
  args: {
    defaultValue: sampleMarkdown,
    language: 'markdown',
    layout: 'split',
    theme: 'vs-dark',
    height: 400,
  },
}

export const TypeScript: Story = {
  args: {
    defaultValue: sampleTypeScript,
    language: 'typescript',
    layout: 'editor',
    theme: 'vs-dark',
    height: 400,
  },
}

// ===================
// Editor States
// ===================

export const ReadOnly: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    readOnly: true,
    theme: 'vs-dark',
    height: 500,
  },
}

export const SmallEditor: Story = {
  args: {
    defaultValue: '# Small Editor\n\nThis is a small editor.',
    layout: 'minimal',
    height: 200,
    theme: 'vs-dark',
  },
}

export const LargeEditor: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'full',
    height: 800,
    theme: 'vs-dark',
    files: sampleFiles,
    messages: sampleMessages,
  },
}

// ===================
// Interactive Examples
// ===================

export const WithOnChange: Story = {
  args: {
    defaultValue: '# Edit me\n\nTry editing this content!',
    layout: 'editor',
    theme: 'vs-dark',
    height: 400,
  },
  render: (args) => {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Check the Actions panel to see onChange events
        </p>
        <Editor
          {...args}
          onChange={(value) => {
            console.log('Content changed:', value?.substring(0, 50) + '...')
          }}
        />
      </div>
    )
  },
}

export const WithFileSelection: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { sidebar: true },
    theme: 'vs-dark',
    height: 500,
    files: sampleFiles,
    selectedFile: '/posts/hello-world.mdx',
  },
  render: (args) => {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Click on files in the sidebar to see selection events
        </p>
        <Editor
          {...args}
          onFileSelect={(path) => {
            console.log('File selected:', path)
          }}
        />
      </div>
    )
  },
}

export const WithChatInteraction: Story = {
  args: {
    defaultValue: sampleMdx,
    layout: 'editor',
    panels: { chat: true },
    theme: 'vs-dark',
    height: 500,
    messages: sampleMessages,
  },
  render: (args) => {
    return (
      <div>
        <p className="text-sm text-gray-500 mb-2">
          Type a message in the chat to see send events
        </p>
        <Editor
          {...args}
          onSendMessage={(message) => {
            console.log('Message sent:', message)
          }}
        />
      </div>
    )
  },
}

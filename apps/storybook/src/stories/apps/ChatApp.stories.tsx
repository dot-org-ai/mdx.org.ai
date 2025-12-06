import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { MessageSquare, Bot, User, Send, Paperclip, Settings, Plus, Sparkles, Code, FileText } from 'lucide-react'

// Message preview
const MessagePreview = ({
  role,
  content,
  hasCode,
}: {
  role: 'user' | 'assistant'
  content: string
  hasCode?: boolean
}) => (
  <div className={`flex gap-2 ${role === 'user' ? 'justify-end' : ''}`}>
    {role === 'assistant' && (
      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
        <Bot className="h-3 w-3 text-primary-foreground" />
      </div>
    )}
    <div className={`
      max-w-[200px] p-2 rounded-lg text-xs
      ${role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}
    `}>
      {content}
      {hasCode && (
        <div className="mt-1 p-1 bg-slate-900 rounded text-[10px] font-mono text-green-400">
          {'// code snippet'}
        </div>
      )}
    </div>
    {role === 'user' && (
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        <User className="h-3 w-3" />
      </div>
    )}
  </div>
)

// ChatApp component
const ChatApp = ({
  name,
  description,
  type,
  agent,
  capabilities,
  features,
  sampleMessages,
}: {
  name: string
  description: string
  type: 'AI Assistant' | 'Customer Support' | 'Team Chat' | 'Voice'
  agent: {
    name: string
    model: string
    personality: string
  }
  capabilities: string[]
  features: string[]
  sampleMessages: Array<{ role: 'user' | 'assistant', content: string, hasCode?: boolean }>
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
          <MessageSquare className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Chat App</CardTitle>
            <Badge>{type}</Badge>
          </div>
          <CardDescription>Conversational AI interface</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* App info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Agent info */}
      <div className="flex items-center gap-3 p-3 border rounded-lg">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-sm">{agent.name}</div>
          <div className="text-xs text-muted-foreground">{agent.personality}</div>
        </div>
        <Badge variant="outline" className="text-xs">{agent.model}</Badge>
      </div>

      {/* Chat preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex h-64">
          {/* Conversation list */}
          <div className="w-48 border-r bg-muted/30 p-2">
            <Button variant="outline" size="sm" className="w-full mb-2">
              <Plus className="h-3 w-3 mr-1" />
              New Chat
            </Button>
            <div className="space-y-1">
              <div className="p-2 bg-background rounded text-xs">
                <div className="font-medium truncate">Current chat</div>
                <div className="text-muted-foreground truncate">Just now</div>
              </div>
              <div className="p-2 text-xs text-muted-foreground">
                <div className="truncate">Previous chat</div>
                <div className="truncate">2 hours ago</div>
              </div>
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="h-10 border-b px-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{agent.name}</span>
              </div>
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 p-3 space-y-3 overflow-auto">
              {sampleMessages.map((msg, i) => (
                <MessagePreview key={i} {...msg} />
              ))}
            </div>

            {/* Input */}
            <div className="p-2 border-t">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <div className="flex-1 h-9 bg-muted rounded border px-3 flex items-center text-sm text-muted-foreground">
                  Type a message...
                </div>
                <Button size="sm">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              {/* Suggestions */}
              <div className="flex gap-1 mt-2">
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                  <Sparkles className="h-2 w-2 mr-0.5" />
                  Explain this
                </Badge>
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                  <Code className="h-2 w-2 mr-0.5" />
                  Write code
                </Badge>
                <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                  <FileText className="h-2 w-2 mr-0.5" />
                  Summarize
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Capabilities */}
      <div>
        <h4 className="text-sm font-medium mb-2">Agent Capabilities</h4>
        <div className="flex flex-wrap gap-1">
          {capabilities.map(cap => (
            <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h4 className="text-sm font-medium mb-2">Features</h4>
        <div className="flex flex-wrap gap-1">
          {features.map(feature => (
            <Badge key={feature} variant="outline" className="text-xs">{feature}</Badge>
          ))}
        </div>
      </div>

      {/* Structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">APP STRUCTURE</div>
        <div className="font-mono text-xs space-y-1 text-muted-foreground">
          <div>ChatApp</div>
          <div className="ml-4">├── Panel: Sidebar (Conversations)</div>
          <div className="ml-4">└── Panel: Main</div>
          <div className="ml-8">├── ChatHeader</div>
          <div className="ml-8">├── MessageList</div>
          <div className="ml-8">│   ├── UserMessage</div>
          <div className="ml-8">│   └── AssistantMessage</div>
          <div className="ml-8">│       ├── Markdown</div>
          <div className="ml-8">│       ├── CodeBlock</div>
          <div className="ml-8">│       └── ToolResult</div>
          <div className="ml-8">└── ChatInput + Suggestions</div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Configure Agent</Button>
        <Button size="sm">Launch Chat</Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof ChatApp> = {
  title: 'Apps/ChatApp',
  component: ChatApp,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A ChatApp provides a conversational interface with an AI agent, supporting text, code, and tool interactions.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const AIAssistant: Story = {
  args: {
    name: 'AI Assistant',
    description: 'General-purpose AI assistant for coding and writing',
    type: 'AI Assistant',
    agent: {
      name: 'Claude',
      model: 'Claude Opus',
      personality: 'Helpful, precise, and creative',
    },
    capabilities: ['Code Generation', 'Code Review', 'Writing', 'Research', 'Analysis', 'Debugging'],
    features: ['Markdown', 'Code Highlighting', 'File Attachments', 'History', 'Export', 'System Prompts'],
    sampleMessages: [
      { role: 'user', content: 'Help me write a React component' },
      { role: 'assistant', content: 'I\'d be happy to help! What kind of component would you like to create?', hasCode: false },
      { role: 'user', content: 'A button with loading state' },
      { role: 'assistant', content: 'Here\'s a Button component with loading state:', hasCode: true },
    ],
  },
}

export const CodingAssistant: Story = {
  args: {
    name: 'CodePilot',
    description: 'Specialized coding assistant for developers',
    type: 'AI Assistant',
    agent: {
      name: 'CodePilot',
      model: 'Claude Sonnet',
      personality: 'Technical, precise, best-practices focused',
    },
    capabilities: ['Code Generation', 'Refactoring', 'Testing', 'Documentation', 'Code Review', 'Debugging'],
    features: ['IDE Integration', 'Context Awareness', 'Multi-file Edits', 'Diff View', 'Terminal Access'],
    sampleMessages: [
      { role: 'user', content: 'Review this function for bugs' },
      { role: 'assistant', content: 'I found 2 potential issues:\n1. Missing null check\n2. Race condition', hasCode: true },
    ],
  },
}

export const CustomerSupport: Story = {
  args: {
    name: 'Support Bot',
    description: 'AI-powered customer support chat',
    type: 'Customer Support',
    agent: {
      name: 'Support Assistant',
      model: 'Claude Haiku',
      personality: 'Friendly, patient, solution-oriented',
    },
    capabilities: ['FAQ Answers', 'Ticket Creation', 'Order Lookup', 'Refund Processing', 'Escalation'],
    features: ['Knowledge Base', 'Ticket Integration', 'Human Handoff', 'Sentiment Analysis', 'CSAT Survey'],
    sampleMessages: [
      { role: 'user', content: 'I need help with my order' },
      { role: 'assistant', content: 'I\'d be happy to help! Could you provide your order number?' },
    ],
  },
}

export const ResearchAssistant: Story = {
  args: {
    name: 'Research AI',
    description: 'AI assistant for research and analysis',
    type: 'AI Assistant',
    agent: {
      name: 'ResearchBot',
      model: 'Claude Opus',
      personality: 'Thorough, analytical, citation-focused',
    },
    capabilities: ['Web Search', 'Paper Analysis', 'Summarization', 'Citation', 'Data Extraction', 'Comparison'],
    features: ['Source Links', 'PDF Analysis', 'Export to Notion', 'Bibliography', 'Fact Checking'],
    sampleMessages: [
      { role: 'user', content: 'Compare React vs Vue for enterprise apps' },
      { role: 'assistant', content: 'Here\'s a detailed comparison based on recent benchmarks and adoption data...' },
    ],
  },
}

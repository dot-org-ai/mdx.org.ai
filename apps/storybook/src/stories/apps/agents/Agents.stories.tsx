import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Bot, Send, Paperclip, Settings, Code, FileText, Target, Users, Lightbulb, MessageSquare, Sparkles, GitBranch, BookOpen, HelpCircle } from 'lucide-react'

// Message component
const Message = ({
  role,
  content,
  hasCode,
}: {
  role: 'user' | 'assistant'
  content: string
  hasCode?: boolean
}) => (
  <div className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
      role === 'assistant' ? 'bg-primary text-white' : 'bg-slate-100'
    }`}>
      {role === 'assistant' ? <Bot className="h-4 w-4" /> : <span className="text-xs font-medium">You</span>}
    </div>
    <div className={`max-w-md p-3 rounded-lg ${
      role === 'user' ? 'bg-primary text-white' : 'bg-slate-100'
    }`}>
      <div className="text-sm">{content}</div>
      {hasCode && (
        <div className="mt-2 p-2 bg-slate-900 text-slate-300 rounded text-xs font-mono">
          <div className="text-purple-400">function</div>
          <div className="text-slate-500">  // generated code...</div>
        </div>
      )}
    </div>
  </div>
)

// Agent preview wrapper
const AgentPreview = ({
  role,
  description,
  capabilities,
  model,
  icon: Icon,
  color,
  conversation,
  tools,
}: {
  role: string
  description: string
  capabilities: string[]
  model: string
  icon: React.ElementType
  color: string
  conversation: Array<{ role: 'user' | 'assistant', content: string, hasCode?: boolean }>
  tools?: string[]
}) => (
  <Card className="w-[700px]">
    <CardContent className="p-0">
      {/* Header */}
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-3 mb-2">
          <div className={`h-10 w-10 rounded-full ${color} flex items-center justify-center`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-semibold">{role}</div>
            <div className="text-xs text-muted-foreground">{description}</div>
          </div>
          <Badge variant="outline" className="ml-auto">{model}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {capabilities.map((cap, i) => (
            <Badge key={i} variant="secondary" className="text-xs">{cap}</Badge>
          ))}
        </div>
      </div>

      {/* Code example */}
      <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 border-b">
        <span className="text-purple-400">{'<App'}</span>
        <span className="text-cyan-400"> agent</span>
        <span className="text-slate-500">=</span>
        <span className="text-green-400">{`{${role.replace(/\s+/g, '')}}`}</span>
        <span className="text-purple-400">{'>'}</span>
        <div className="ml-4">
          <span className="text-purple-400">{'<'}</span>
          <span className="text-yellow-400">Chat</span>
          <span className="text-purple-400">{' />'}</span>
        </div>
        <div className="ml-4">
          <span className="text-purple-400">{'<'}</span>
          <span className="text-yellow-400">History</span>
          <span className="text-purple-400">{' />'}</span>
        </div>
        <span className="text-purple-400">{'</App>'}</span>
      </div>

      {/* Chat preview */}
      <div className="h-80 flex flex-col bg-white">
        {/* Chat header */}
        <div className="h-12 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className={`h-6 w-6 rounded-full ${color} flex items-center justify-center`}>
              <Icon className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-sm">{role}</span>
            <Badge variant="outline" className="text-[10px]">Online</Badge>
          </div>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </div>

        {/* Messages */}
        <div className="flex-1 p-4 overflow-auto space-y-4 bg-slate-50">
          {conversation.map((msg, i) => (
            <Message key={i} {...msg} />
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Paperclip className="h-4 w-4" />
            </Button>
            <div className="flex-1 h-9 bg-slate-100 rounded border px-3 flex items-center text-sm text-muted-foreground">
              Ask {role}...
            </div>
            <Button size="sm">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          {tools && (
            <div className="flex gap-1 mt-2">
              {tools.map((tool, i) => (
                <Badge key={i} variant="outline" className="text-[10px] cursor-pointer hover:bg-slate-100">
                  <Sparkles className="h-2 w-2 mr-0.5" />
                  {tool}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </CardContent>
  </Card>
)

// Strategic Planning Agent
const StrategicPlanningAgent = () => (
  <AgentPreview
    role="Strategic Planning"
    description="Helps clarify vision, analyze markets, and develop actionable strategies"
    capabilities={['Analysis', 'Frameworks', 'Recommendations', 'Planning']}
    model="Claude Opus"
    icon={Target}
    color="bg-violet-500"
    tools={['SWOT Analysis', 'Lean Canvas', 'OKRs']}
    conversation={[
      { role: 'user', content: 'Help me define our product strategy for Q2' },
      { role: 'assistant', content: 'I\'d be happy to help with your Q2 product strategy. Let\'s start by understanding your current position. What are your top 3 product priorities right now, and what market signals are you seeing?' },
      { role: 'user', content: 'We want to expand to enterprise but also keep growing SMB' },
      { role: 'assistant', content: 'That\'s a common tension. Let me help you think through this with a framework:\n\n1. **Market Sizing**: What\'s the TAM for each segment?\n2. **Resource Allocation**: Can you serve both without diluting focus?\n3. **Product Fit**: Does your current product serve enterprise needs?\n\nShall I create a Lean Canvas to map this out?' },
    ]}
  />
)

// Code Review Agent
const CodeReviewAgent = () => (
  <AgentPreview
    role="Code Review"
    description="Reviews code for bugs, security issues, and best practices"
    capabilities={['Bug Detection', 'Security Audit', 'Best Practices', 'Refactoring']}
    model="Claude Sonnet"
    icon={Code}
    color="bg-cyan-500"
    tools={['Analyze PR', 'Check Types', 'Find Issues']}
    conversation={[
      { role: 'user', content: 'Review this authentication function for security issues' },
      { role: 'assistant', content: 'I\'ve analyzed the code and found 3 potential issues:\n\n🔴 **Critical**: Password is logged in plaintext on line 23\n🟡 **Warning**: No rate limiting on login attempts\n🟢 **Suggestion**: Consider using bcrypt instead of sha256\n\nWant me to show you the fixes?', hasCode: true },
    ]}
  />
)

// Customer Support Agent
const CustomerSupportAgent = () => (
  <AgentPreview
    role="Customer Support"
    description="Handles customer inquiries, tickets, and escalations"
    capabilities={['FAQ Answers', 'Ticket Routing', 'Refunds', 'Escalation']}
    model="Claude Haiku"
    icon={HelpCircle}
    color="bg-green-500"
    tools={['Search KB', 'Create Ticket', 'Escalate']}
    conversation={[
      { role: 'user', content: 'A customer is asking about our refund policy' },
      { role: 'assistant', content: 'Based on our knowledge base, here\'s our refund policy:\n\n• **30-day money-back guarantee** for all plans\n• **Pro-rated refunds** for annual subscriptions\n• **No refunds** after 30 days\n\nShall I draft a response for this customer?' },
    ]}
  />
)

// Content Writer Agent
const ContentWriterAgent = () => (
  <AgentPreview
    role="Content Writer"
    description="Creates blog posts, documentation, and marketing copy"
    capabilities={['Blog Posts', 'Documentation', 'Copy', 'SEO']}
    model="Claude Sonnet"
    icon={FileText}
    color="bg-orange-500"
    tools={['Outline', 'Draft', 'SEO Check']}
    conversation={[
      { role: 'user', content: 'Write a blog post about our new API versioning feature' },
      { role: 'assistant', content: 'I\'ll create a blog post. Here\'s a suggested structure:\n\n**Title**: "Introducing API Versioning: Ship Breaking Changes with Confidence"\n\n**Outline**:\n1. The problem with breaking changes\n2. How our versioning works\n3. Migration guide\n4. Best practices\n\nShall I draft the full post?' },
    ]}
  />
)

// Research Agent
const ResearchAgent = () => (
  <AgentPreview
    role="Research Assistant"
    description="Conducts market research, competitive analysis, and data gathering"
    capabilities={['Web Search', 'Analysis', 'Summarization', 'Reports']}
    model="Claude Opus"
    icon={Lightbulb}
    color="bg-amber-500"
    tools={['Search Web', 'Analyze Data', 'Compare']}
    conversation={[
      { role: 'user', content: 'Research our top 3 competitors pricing strategies' },
      { role: 'assistant', content: 'I\'ve analyzed the pricing pages of your top competitors:\n\n**Competitor A**: Usage-based, starts at $0.01/request\n**Competitor B**: Per-seat, $20/user/month\n**Competitor C**: Flat-rate tiers, $49-$199/month\n\nKey insight: All three offer free tiers. Want me to create a detailed comparison matrix?' },
    ]}
  />
)

// DevOps Agent
const DevOpsAgent = () => (
  <AgentPreview
    role="DevOps"
    description="Manages deployments, infrastructure, and monitoring"
    capabilities={['Deploy', 'Monitor', 'Scale', 'Debug']}
    model="Claude Sonnet"
    icon={GitBranch}
    color="bg-slate-600"
    tools={['Deploy', 'Check Status', 'Rollback']}
    conversation={[
      { role: 'user', content: 'Deploy the latest release to production' },
      { role: 'assistant', content: '✅ Pre-flight checks passed:\n• Tests: 247/247 passing\n• Build: Success (2m 34s)\n• Security scan: No vulnerabilities\n\n🚀 Deploying v2.4.1 to production...\n\nProgress: ████████░░ 80%\n\nETA: 45 seconds' },
    ]}
  />
)

const meta: Meta = {
  title: 'Apps/Agents',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const StrategicPlanning: StoryObj = { render: () => <StrategicPlanningAgent /> }
export const CodeReview: StoryObj = { render: () => <CodeReviewAgent /> }
export const CustomerSupport: StoryObj = { render: () => <CustomerSupportAgent /> }
export const ContentWriter: StoryObj = { render: () => <ContentWriterAgent /> }
export const Research: StoryObj = { render: () => <ResearchAgent /> }
export const DevOps: StoryObj = { render: () => <DevOpsAgent /> }

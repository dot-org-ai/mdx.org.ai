import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Avatar, AvatarFallback, Button } from '@mdxui/shadcn'

// Conceptual Agent component - demonstrates the abstract
const Agent = ({
  name,
  description,
  capabilities,
  avatar,
  status,
  site,
  app
}: {
  name: string
  description: string
  capabilities: string[]
  avatar?: string
  status?: 'online' | 'offline' | 'busy'
  site?: { pages: string[], theme: string }
  app?: { views: string[], layout: string }
}) => (
  <Card className="w-[500px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16">
          <AvatarFallback className="text-xl">{name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant={status === 'online' ? 'default' : status === 'busy' ? 'secondary' : 'outline'}>
              {status || 'online'}
            </Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div>
        <h4 className="text-sm font-medium mb-2">Capabilities</h4>
        <div className="flex flex-wrap gap-2">
          {capabilities.map(cap => (
            <Badge key={cap} variant="secondary">{cap}</Badge>
          ))}
        </div>
      </div>

      {site && (
        <div>
          <h4 className="text-sm font-medium mb-2">Site</h4>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{site.pages.length} pages</span>
            <span className="mx-2">·</span>
            <span>{site.theme} theme</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {site.pages.map(page => (
              <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
            ))}
          </div>
        </div>
      )}

      {app && (
        <div>
          <h4 className="text-sm font-medium mb-2">App</h4>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono">{app.views.length} views</span>
            <span className="mx-2">·</span>
            <span>{app.layout} layout</span>
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {app.views.map(view => (
              <code key={view} className="text-xs bg-muted px-1 py-0.5 rounded">{view}</code>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        {site && <Button variant="outline" size="sm">Visit Site</Button>}
        {app && <Button size="sm">Open App</Button>}
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Agent> = {
  title: 'Abstracts/Agent',
  component: Agent,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An Agent is an AI entity with personality, capabilities, and interface. Agents can have both a Site (marketing/docs) and an App (interactive interface).',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'Claude',
    description: 'AI assistant for software engineering',
    capabilities: ['code', 'research', 'planning', 'debugging'],
    status: 'online',
    site: {
      pages: ['/', '/docs', '/pricing', '/blog'],
      theme: 'dark',
    },
    app: {
      views: ['chat', 'workspace', 'settings'],
      layout: 'sidebar',
    },
  },
}

export const SiteOnly: Story = {
  args: {
    name: 'DocBot',
    description: 'Documentation assistant for developers',
    capabilities: ['docs', 'search', 'examples'],
    status: 'online',
    site: {
      pages: ['/', '/guides', '/api', '/examples'],
      theme: 'light',
    },
  },
}

export const AppOnly: Story = {
  args: {
    name: 'CodePilot',
    description: 'Real-time pair programming assistant',
    capabilities: ['autocomplete', 'refactor', 'explain', 'test'],
    status: 'busy',
    app: {
      views: ['editor', 'diff', 'terminal', 'chat'],
      layout: 'workspace',
    },
  },
}

export const MultipleAgents: Story = {
  render: () => (
    <div className="space-y-4">
      <Agent
        name="Writer"
        description="Content creation and editing"
        capabilities={['write', 'edit', 'summarize']}
        status="online"
        site={{ pages: ['/', '/blog'], theme: 'light' }}
      />
      <Agent
        name="Analyst"
        description="Data analysis and visualization"
        capabilities={['analyze', 'visualize', 'report']}
        status="online"
        app={{ views: ['dashboard', 'query', 'charts'], layout: 'dashboard' }}
      />
      <Agent
        name="DevOps"
        description="Infrastructure and deployment"
        capabilities={['deploy', 'monitor', 'scale', 'alert']}
        status="offline"
        app={{ views: ['pipelines', 'logs', 'metrics'], layout: 'minimal' }}
      />
    </div>
  ),
}

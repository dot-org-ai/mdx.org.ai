import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { AppWindow, Package, Building2, Bot, Code, BarChart3, Shield, MessageSquare, Play, Settings } from 'lucide-react'

// Props display
const PropsDisplay = ({ props }: { props: Record<string, string | boolean> }) => (
  <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg">
    <span className="text-purple-400">{'<App'}</span>
    {Object.entries(props).map(([key, value]) => (
      <div key={key} className="ml-4">
        <span className="text-cyan-400">{key}</span>
        <span className="text-slate-500">=</span>
        {typeof value === 'boolean' ? (
          <span className="text-orange-400">{String(value)}</span>
        ) : (
          <span className="text-green-400">{`{${value}}`}</span>
        )}
      </div>
    ))}
    <span className="text-purple-400">{'/>'}</span>
  </div>
)

// View preview
const ViewPreview = ({ path, widgets }: { path: string, widgets: string[] }) => (
  <div className="flex items-center gap-2 text-xs">
    <code className="bg-muted px-1.5 py-0.5 rounded">{path}</code>
    <span className="text-muted-foreground">→</span>
    <div className="flex gap-1 flex-wrap">
      {widgets.map(w => (
        <Badge key={w} variant="outline" className="text-[10px]">{w}</Badge>
      ))}
    </div>
  </div>
)

// App component showing props-based rendering
const App = ({
  appProps,
  displayName,
  description,
  icon: Icon,
  color,
  layout,
  views,
  auth,
}: {
  appProps: Record<string, string | boolean>
  displayName: string
  description: string
  icon: React.ElementType
  color: string
  layout: 'dashboard' | 'sidebar' | 'workspace' | 'minimal' | 'split'
  views: Array<{ path: string, widgets: string[] }>
  auth: 'required' | 'optional' | 'none'
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>App</CardTitle>
            <Badge>{displayName}</Badge>
            <Badge variant="outline">{layout}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Props that define this app */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">PROPS DEFINE THE SHAPE</div>
        <PropsDisplay props={appProps} />
      </div>

      {/* Layout preview */}
      <div className="border rounded-lg overflow-hidden h-40">
        {layout === 'dashboard' && (
          <div className="flex flex-col h-full">
            <div className="h-10 border-b bg-muted flex items-center px-3 text-xs">
              <span className="font-medium">Dashboard</span>
              <span className="ml-auto text-muted-foreground">Header</span>
            </div>
            <div className="flex-1 grid grid-cols-3 gap-1 p-2">
              <div className="bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Stats</div>
              <div className="bg-muted/50 rounded col-span-2 flex items-center justify-center text-xs text-muted-foreground">Charts</div>
              <div className="bg-muted/50 rounded col-span-2 flex items-center justify-center text-xs text-muted-foreground">Table</div>
              <div className="bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Activity</div>
            </div>
          </div>
        )}
        {layout === 'sidebar' && (
          <div className="flex h-full">
            <div className="w-40 bg-muted border-r p-2 text-xs text-muted-foreground">
              <div className="font-medium mb-2">Navigation</div>
              <div className="space-y-1">
                <div className="p-1 bg-background rounded">Dashboard</div>
                <div className="p-1">Content</div>
                <div className="p-1">Users</div>
                <div className="p-1">Settings</div>
              </div>
            </div>
            <div className="flex-1 p-2 flex items-center justify-center text-xs text-muted-foreground">
              Main Content
            </div>
          </div>
        )}
        {layout === 'workspace' && (
          <div className="flex h-full">
            <div className="w-10 bg-muted border-r flex flex-col items-center py-2 gap-2">
              <div className="w-6 h-6 bg-background rounded" />
              <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
              <div className="w-6 h-6 bg-muted-foreground/20 rounded" />
            </div>
            <div className="w-32 border-r p-2 text-xs text-muted-foreground">
              File Tree
            </div>
            <div className="flex-1 p-2 text-xs text-muted-foreground flex items-center justify-center">
              Editor
            </div>
            <div className="w-48 border-l p-2 text-xs text-muted-foreground">
              Aside Panel
            </div>
          </div>
        )}
        {layout === 'split' && (
          <div className="flex h-full">
            <div className="w-48 border-r p-2 text-xs text-muted-foreground">
              <div className="font-medium mb-2">Conversations</div>
              <div className="space-y-1">
                <div className="p-1 bg-background rounded">Current</div>
                <div className="p-1">Previous</div>
              </div>
            </div>
            <div className="flex-1 flex flex-col">
              <div className="flex-1 p-2 text-xs text-muted-foreground flex items-center justify-center">
                Messages
              </div>
              <div className="h-12 border-t p-2 text-xs text-muted-foreground">
                Input
              </div>
            </div>
          </div>
        )}
        {layout === 'minimal' && (
          <div className="flex flex-col h-full">
            <div className="h-10 border-b flex items-center justify-center text-xs text-muted-foreground">
              Header
            </div>
            <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
              Content
            </div>
          </div>
        )}
      </div>

      {/* Views */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">VIEWS</div>
        <div className="space-y-2">
          {views.map(view => (
            <ViewPreview key={view.path} {...view} />
          ))}
        </div>
      </div>

      {/* Auth badge */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Auth:</span>
        <Badge variant={auth === 'required' ? 'default' : 'secondary'}>{auth}</Badge>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        <Button size="sm">
          <Play className="h-4 w-4 mr-1" />
          Launch
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof App> = {
  title: 'Apps/App',
  component: App,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'App is a props-driven container. The props you pass determine what kind of app gets rendered. Pass `product` for a dashboard, `business` for admin, `agent` for chat, etc.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Dashboard: Story = {
  args: {
    appProps: {
      product: 'widget',
    },
    displayName: 'Dashboard',
    description: 'Product analytics and metrics',
    icon: BarChart3,
    color: 'from-indigo-500 to-purple-600',
    layout: 'dashboard',
    auth: 'required',
    views: [
      { path: '/', widgets: ['Stats', 'RevenueChart', 'UsersChart', 'Activity'] },
      { path: '/analytics', widgets: ['Metrics', 'Funnel', 'Cohorts'] },
      { path: '/users', widgets: ['UserTable', 'Segments'] },
      { path: '/settings', widgets: ['ProductSettings', 'Billing'] },
    ],
  },
}

export const AdminApp: Story = {
  args: {
    appProps: {
      business: 'acme',
    },
    displayName: 'Admin',
    description: 'Content and user management',
    icon: Shield,
    color: 'from-amber-500 to-orange-600',
    layout: 'sidebar',
    auth: 'required',
    views: [
      { path: '/', widgets: ['DashboardStats', 'RecentActivity'] },
      { path: '/content', widgets: ['ContentTable', 'Editor'] },
      { path: '/users', widgets: ['UserTable', 'RoleManager'] },
      { path: '/settings', widgets: ['GeneralSettings', 'Integrations'] },
    ],
  },
}

export const Chat: Story = {
  args: {
    appProps: {
      agent: 'claude',
    },
    displayName: 'Chat',
    description: 'Conversational AI interface',
    icon: MessageSquare,
    color: 'from-emerald-500 to-teal-600',
    layout: 'split',
    auth: 'optional',
    views: [
      { path: '/', widgets: ['ConversationList', 'MessageList', 'ChatInput'] },
      { path: '/settings', widgets: ['AgentConfig', 'ModelSelect', 'SystemPrompt'] },
    ],
  },
}

export const Workspace: Story = {
  args: {
    appProps: {
      product: 'widget',
      workspace: true,
    },
    displayName: 'Workspace',
    description: 'IDE-like creation environment',
    icon: Code,
    color: 'from-cyan-500 to-blue-600',
    layout: 'workspace',
    auth: 'optional',
    views: [
      { path: '/', widgets: ['FileTree', 'Editor', 'Terminal', 'AIChat'] },
      { path: '/preview', widgets: ['FileTree', 'Preview', 'DevTools'] },
      { path: '/settings', widgets: ['EditorSettings', 'Extensions'] },
    ],
  },
}

export const BusinessDashboard: Story = {
  args: {
    appProps: {
      business: 'acme',
      products: '[widget, analytics]',
    },
    displayName: 'Business Dashboard',
    description: 'Executive overview of all products',
    icon: Building2,
    color: 'from-slate-600 to-slate-800',
    layout: 'dashboard',
    auth: 'required',
    views: [
      { path: '/', widgets: ['KPIs', 'RevenueByProduct', 'Growth'] },
      { path: '/products', widgets: ['ProductTable', 'ProductMetrics'] },
      { path: '/team', widgets: ['TeamTable', 'Performance'] },
    ],
  },
}

export const AgentBuilder: Story = {
  args: {
    appProps: {
      agent: 'custom',
      workspace: true,
    },
    displayName: 'Agent Builder',
    description: 'Build and configure AI agents',
    icon: Bot,
    color: 'from-violet-500 to-purple-600',
    layout: 'workspace',
    auth: 'required',
    views: [
      { path: '/', widgets: ['AgentConfig', 'ToolEditor', 'TestChat'] },
      { path: '/tools', widgets: ['ToolList', 'ToolEditor'] },
      { path: '/prompts', widgets: ['PromptEditor', 'Variables'] },
      { path: '/test', widgets: ['TestChat', 'Logs'] },
    ],
  },
}

export const ProductApp: Story = {
  args: {
    appProps: {
      product: 'widget',
    },
    displayName: 'Product App',
    description: 'The actual product application',
    icon: Package,
    color: 'from-blue-500 to-cyan-500',
    layout: 'minimal',
    auth: 'required',
    views: [
      { path: '/', widgets: ['MainWidget'] },
      { path: '/settings', widgets: ['UserSettings', 'Preferences'] },
    ],
  },
}

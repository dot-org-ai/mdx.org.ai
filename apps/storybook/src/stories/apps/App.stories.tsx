import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { AppWindow, Layers, PanelLeft, Settings, Play } from 'lucide-react'

// View preview
const ViewPreview = ({ path, title, panels }: { path: string, title: string, panels: string[] }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <code className="text-xs bg-muted px-2 py-1 rounded">{path}</code>
      <span className="text-xs text-muted-foreground">{panels.length} panels</span>
    </div>
    <div className="font-medium text-sm">{title}</div>
    <div className="flex flex-wrap gap-1 mt-2">
      {panels.map(panel => (
        <Badge key={panel} variant="outline" className="text-xs">{panel}</Badge>
      ))}
    </div>
  </div>
)

// Conceptual App component
const App = ({
  name,
  description,
  layout,
  auth,
  views,
}: {
  name: string
  description: string
  layout: 'sidebar' | 'dashboard' | 'workspace' | 'minimal'
  auth: 'required' | 'optional' | 'none'
  views: Array<{ path: string, title: string, panels: string[] }>
}) => (
  <Card className="w-[550px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-primary flex items-center justify-center">
          <AppWindow className="h-7 w-7 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant={auth === 'required' ? 'default' : 'secondary'}>{auth} auth</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Layout info */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <PanelLeft className="h-4 w-4" />
          <span>{layout} layout</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Layers className="h-4 w-4" />
          <span>{views.length} views</span>
        </div>
      </div>

      {/* App structure visualization */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">APP STRUCTURE</div>
        <div className="font-mono text-sm space-y-1">
          <div className="text-primary">App</div>
          <div className="ml-4">├── Layout <span className="text-muted-foreground">({layout})</span></div>
          <div className="ml-4">├── Auth <span className="text-muted-foreground">({auth})</span></div>
          <div className="ml-4">└── Views</div>
          {views.map((view, i) => (
            <div key={view.path} className="ml-8">
              {i === views.length - 1 ? '└──' : '├──'} {view.path} <span className="text-muted-foreground">→ {view.panels.length} panels</span>
            </div>
          ))}
        </div>
      </div>

      {/* Layout diagram */}
      <div>
        <h4 className="text-sm font-medium mb-2">Layout Preview</h4>
        <div className="border rounded-lg overflow-hidden">
          {layout === 'sidebar' && (
            <div className="flex h-32">
              <div className="w-1/4 bg-muted border-r flex items-center justify-center text-xs text-muted-foreground">Sidebar</div>
              <div className="flex-1 flex flex-col">
                <div className="h-8 border-b bg-muted/50 flex items-center justify-center text-xs text-muted-foreground">Header</div>
                <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Main Panel</div>
              </div>
            </div>
          )}
          {layout === 'dashboard' && (
            <div className="flex flex-col h-32">
              <div className="h-10 border-b bg-muted flex items-center justify-center text-xs text-muted-foreground">Top Navigation</div>
              <div className="flex-1 grid grid-cols-3 gap-1 p-1">
                <div className="bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Panel 1</div>
                <div className="bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Panel 2</div>
                <div className="bg-muted/50 rounded flex items-center justify-center text-xs text-muted-foreground">Panel 3</div>
              </div>
            </div>
          )}
          {layout === 'workspace' && (
            <div className="flex h-32">
              <div className="w-12 bg-muted border-r flex items-center justify-center text-xs text-muted-foreground rotate-[-90deg]">Nav</div>
              <div className="w-1/4 bg-muted/50 border-r flex items-center justify-center text-xs text-muted-foreground">Tree</div>
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Editor</div>
              <div className="w-1/4 bg-muted/50 border-l flex items-center justify-center text-xs text-muted-foreground">Aside</div>
            </div>
          )}
          {layout === 'minimal' && (
            <div className="flex flex-col h-32">
              <div className="h-10 border-b flex items-center justify-center text-xs text-muted-foreground">Header</div>
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">Content</div>
            </div>
          )}
        </div>
      </div>

      {/* Views */}
      <div>
        <h4 className="text-sm font-medium mb-2">Views</h4>
        <div className="space-y-2">
          {views.slice(0, 3).map(view => (
            <ViewPreview key={view.path} {...view} />
          ))}
          {views.length > 3 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              +{views.length - 3} more views
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">
          <Settings className="h-4 w-4 mr-1" />
          Configure
        </Button>
        <Button size="sm">
          <Play className="h-4 w-4 mr-1" />
          Launch App
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof App> = {
  title: 'Containers/App',
  component: App,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An App is an interaction-driven container. Apps contain Views, which contain Panels, which contain Widgets. Apps are for dashboards, tools, and interactive experiences.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'Dashboard',
    description: 'Analytics and monitoring dashboard',
    layout: 'dashboard',
    auth: 'required',
    views: [
      { path: '/dashboard', title: 'Overview', panels: ['Stats', 'Charts', 'Activity'] },
      { path: '/analytics', title: 'Analytics', panels: ['Metrics', 'Trends', 'Reports'] },
      { path: '/settings', title: 'Settings', panels: ['Profile', 'Preferences', 'Billing'] },
    ],
  },
}

export const SidebarApp: Story = {
  args: {
    name: 'Admin Panel',
    description: 'Content management system',
    layout: 'sidebar',
    auth: 'required',
    views: [
      { path: '/content', title: 'Content', panels: ['List', 'Editor'] },
      { path: '/media', title: 'Media', panels: ['Gallery', 'Upload'] },
      { path: '/users', title: 'Users', panels: ['Table', 'Details'] },
      { path: '/settings', title: 'Settings', panels: ['General', 'Security'] },
    ],
  },
}

export const WorkspaceApp: Story = {
  args: {
    name: 'Code Studio',
    description: 'IDE-like development environment',
    layout: 'workspace',
    auth: 'optional',
    views: [
      { path: '/editor', title: 'Editor', panels: ['FileTree', 'Editor', 'Terminal', 'Chat'] },
      { path: '/preview', title: 'Preview', panels: ['FileTree', 'Browser', 'Console'] },
      { path: '/diff', title: 'Diff', panels: ['FileTree', 'DiffView', 'History'] },
    ],
  },
}

export const MinimalApp: Story = {
  args: {
    name: 'Focus',
    description: 'Distraction-free writing app',
    layout: 'minimal',
    auth: 'none',
    views: [
      { path: '/', title: 'Write', panels: ['Editor'] },
      { path: '/preview', title: 'Preview', panels: ['Rendered'] },
      { path: '/export', title: 'Export', panels: ['Options', 'Preview'] },
    ],
  },
}

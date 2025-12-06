import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, Badge } from '@mdxui/shadcn'
import { Home, Users, Package, Settings, BarChart3, FileText, Search, Bell, ChevronRight, MoreHorizontal, FolderTree, MessageSquare, Terminal } from 'lucide-react'

// Layout preview component
const LayoutPreview = ({
  name,
  description,
  structure,
  useCase,
  children,
}: {
  name: string
  description: string
  structure: string
  useCase: string
  children: React.ReactNode
}) => (
  <Card className="w-[800px]">
    <CardContent className="p-6 space-y-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold">{name}</h3>
          <Badge variant="outline">{useCase}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground mt-1">Structure: {structure}</p>
      </div>

      {/* Visual preview */}
      <div className="border rounded-lg overflow-hidden bg-white h-72">
        {children}
      </div>

      {/* Code example */}
      <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg">
        <span className="text-purple-400">{'<App'}</span>
        <span className="text-cyan-400"> layout</span>
        <span className="text-slate-500">=</span>
        <span className="text-green-400">"{name.toLowerCase()}"</span>
        <span className="text-purple-400">{'>'}</span>
        <div className="ml-4 text-slate-500">...</div>
        <span className="text-purple-400">{'</App>'}</span>
      </div>
    </CardContent>
  </Card>
)

// Dashboard Layout
const DashboardLayout = () => (
  <LayoutPreview
    name="Dashboard"
    description="Top navigation with grid of cards/widgets below"
    structure="TopNav → Grid"
    useCase="Analytics"
  >
    <div className="h-full flex flex-col">
      {/* Top nav */}
      <div className="h-14 border-b bg-slate-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <div className="font-bold">Dashboard</div>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span className="text-primary font-medium">Overview</span>
            <span>Analytics</span>
            <span>Reports</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Bell className="h-4 w-4 text-muted-foreground" />
          <div className="h-8 w-8 rounded-full bg-primary/10" />
        </div>
      </div>

      {/* Grid content */}
      <div className="flex-1 p-4 bg-slate-50">
        <div className="grid grid-cols-4 gap-4 mb-4">
          {['Revenue', 'Users', 'Orders', 'Growth'].map((stat, i) => (
            <div key={i} className="bg-white p-4 rounded-lg border">
              <div className="text-xs text-muted-foreground">{stat}</div>
              <div className="text-2xl font-bold mt-1">$12,345</div>
              <div className="text-xs text-green-600 mt-1">+12%</div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-white p-4 rounded-lg border h-32 flex items-center justify-center text-sm text-muted-foreground">
            Revenue Chart
          </div>
          <div className="bg-white p-4 rounded-lg border h-32 flex items-center justify-center text-sm text-muted-foreground">
            Activity Feed
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Sidebar Layout
const SidebarLayout = () => (
  <LayoutPreview
    name="Sidebar"
    description="Left navigation sidebar with main content area"
    structure="Sidebar → Content"
    useCase="Admin"
  >
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-56 border-r bg-slate-50 flex flex-col">
        <div className="h-14 border-b flex items-center px-4">
          <div className="font-bold">Admin</div>
        </div>
        <div className="flex-1 p-3">
          <div className="space-y-1">
            {[
              { icon: Home, label: 'Dashboard', active: false },
              { icon: Users, label: 'Customers', active: true },
              { icon: Package, label: 'Orders', active: false },
              { icon: FileText, label: 'Products', active: false },
              { icon: BarChart3, label: 'Analytics', active: false },
            ].map((item, i) => (
              <div key={i} className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${item.active ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-slate-100'}`}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 px-3 py-2 rounded text-sm text-muted-foreground hover:bg-slate-100">
            <Settings className="h-4 w-4" />
            Settings
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="text-lg font-semibold">Customers</div>
          <button className="bg-primary text-white text-sm px-4 py-2 rounded">Add Customer</button>
        </div>
        <div className="flex-1 p-4">
          <div className="border rounded-lg">
            <div className="grid grid-cols-4 gap-4 p-3 border-b bg-slate-50 text-xs font-medium text-muted-foreground">
              <span>Name</span>
              <span>Email</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 p-3 border-b text-sm">
                <span>John Doe</span>
                <span className="text-muted-foreground">john@example.com</span>
                <span><Badge variant="secondary" className="text-xs">Active</Badge></span>
                <span><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Workspace Layout
const WorkspaceLayout = () => (
  <LayoutPreview
    name="Workspace"
    description="IDE-like layout with activity bar, sidebar, editor, and panels"
    structure="ActivityBar → Sidebar → Editor → Aside → Bottom"
    useCase="IDE"
  >
    <div className="h-full flex bg-slate-900 text-white">
      {/* Activity bar */}
      <div className="w-12 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-2 gap-3">
        <div className="w-8 h-8 rounded flex items-center justify-center bg-slate-700">
          <FolderTree className="h-4 w-4" />
        </div>
        <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
        </div>
        <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
          <MessageSquare className="h-4 w-4 text-slate-400" />
        </div>
        <div className="flex-1" />
        <div className="w-8 h-8 rounded flex items-center justify-center hover:bg-slate-700">
          <Settings className="h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-48 border-r border-slate-700 p-2">
        <div className="text-xs text-slate-400 mb-2">EXPLORER</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-1 text-slate-300">
            <ChevronRight className="h-3 w-3" /> src
          </div>
          <div className="ml-4 text-slate-400">components</div>
          <div className="ml-4 text-slate-400">pages</div>
          <div className="ml-4 text-slate-300 bg-slate-700 px-1 rounded">index.tsx</div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 flex flex-col">
        {/* Tabs */}
        <div className="h-9 border-b border-slate-700 flex items-center px-2">
          <div className="px-3 py-1 bg-slate-900 text-xs rounded-t flex items-center gap-1">
            <FileText className="h-3 w-3" />
            index.tsx
          </div>
        </div>
        {/* Editor content */}
        <div className="flex-1 p-3 font-mono text-xs">
          <div><span className="text-purple-400">import</span> {'{ useState }'} <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span></div>
          <div className="text-slate-500">// Your code here</div>
        </div>
        {/* Bottom panel */}
        <div className="h-24 border-t border-slate-700">
          <div className="flex items-center gap-2 px-2 h-8 border-b border-slate-700">
            <span className="text-xs text-slate-300">Terminal</span>
            <span className="text-xs text-slate-500">Problems</span>
          </div>
          <div className="p-2 font-mono text-xs text-slate-400">
            $ npm run dev<br />
            <span className="text-green-400">ready</span> - started on localhost:3000
          </div>
        </div>
      </div>

      {/* Aside */}
      <div className="w-56 border-l border-slate-700 p-2">
        <div className="text-xs text-slate-400 mb-2">AI ASSISTANT</div>
        <div className="text-xs text-slate-500">Ask me anything...</div>
      </div>
    </div>
  </LayoutPreview>
)

// Split Layout
const SplitLayout = () => (
  <LayoutPreview
    name="Split"
    description="Two-pane layout with list on left, detail on right"
    structure="List → Detail"
    useCase="Chat, Email"
  >
    <div className="h-full flex">
      {/* List panel */}
      <div className="w-72 border-r flex flex-col">
        <div className="h-14 border-b flex items-center justify-between px-4">
          <div className="font-semibold">Messages</div>
          <Badge>3 new</Badge>
        </div>
        <div className="flex-1 overflow-auto">
          {[
            { name: 'Sarah Chen', msg: 'Can you review the PR?', time: '2m', active: true },
            { name: 'Mike Johnson', msg: 'Sounds good!', time: '1h', active: false },
            { name: 'Emily Rodriguez', msg: 'Let me check...', time: '3h', active: false },
          ].map((chat, i) => (
            <div key={i} className={`p-3 border-b cursor-pointer ${chat.active ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center justify-between">
                <div className="font-medium text-sm">{chat.name}</div>
                <div className="text-xs text-muted-foreground">{chat.time}</div>
              </div>
              <div className="text-sm text-muted-foreground truncate">{chat.msg}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-1 flex flex-col">
        <div className="h-14 border-b flex items-center px-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">SC</div>
            <div>
              <div className="font-medium text-sm">Sarah Chen</div>
              <div className="text-xs text-muted-foreground">Online</div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-4 bg-slate-50">
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex-shrink-0" />
              <div className="bg-white p-3 rounded-lg border text-sm max-w-xs">
                Can you review the PR?
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <div className="bg-primary text-white p-3 rounded-lg text-sm max-w-xs">
                Sure, looking at it now
              </div>
            </div>
          </div>
        </div>
        <div className="h-16 border-t p-3">
          <div className="h-full bg-slate-100 rounded border px-3 flex items-center text-sm text-muted-foreground">
            Type a message...
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

// Minimal Layout
const MinimalLayout = () => (
  <LayoutPreview
    name="Minimal"
    description="Simple header with focused content area"
    structure="Header → Content"
    useCase="Focused"
  >
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="h-14 border-b flex items-center justify-between px-4">
        <div className="font-bold">Writer</div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Auto-saved</span>
          <button className="bg-primary text-white text-sm px-4 py-1.5 rounded">Publish</button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-8 bg-slate-50">
        <div className="w-full max-w-2xl bg-white p-8 rounded-lg border shadow-sm">
          <input
            type="text"
            placeholder="Title"
            className="w-full text-2xl font-bold border-none outline-none mb-4"
          />
          <div className="text-muted-foreground">
            Start writing...
          </div>
        </div>
      </div>
    </div>
  </LayoutPreview>
)

const meta: Meta = {
  title: 'Apps/Layouts',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const Dashboard: StoryObj = { render: () => <DashboardLayout /> }
export const Sidebar: StoryObj = { render: () => <SidebarLayout /> }
export const Workspace: StoryObj = { render: () => <WorkspaceLayout /> }
export const Split: StoryObj = { render: () => <SplitLayout /> }
export const Minimal: StoryObj = { render: () => <MinimalLayout /> }

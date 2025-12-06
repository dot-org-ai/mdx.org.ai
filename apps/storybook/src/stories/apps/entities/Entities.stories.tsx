import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Table, Grid3X3, Columns, Calendar, Clock, MoreHorizontal, Plus, Search, Filter, ChevronRight, ArrowUpDown } from 'lucide-react'

// Entity preview wrapper
const EntityPreview = ({
  name,
  listVariant,
  description,
  children,
}: {
  name: string
  listVariant: string
  description: string
  children: React.ReactNode
}) => (
  <Card className="w-[800px]">
    <CardContent className="p-0">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline">{name}</Badge>
          <Badge>list="{listVariant}"</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 border-b">
        <span className="text-purple-400">{'<'}</span>
        <span className="text-yellow-400">{name}</span>
        <span className="text-cyan-400"> list</span>
        <span className="text-slate-500">=</span>
        <span className="text-green-400">"{listVariant}"</span>
        <span className="text-purple-400">{' />'}</span>
        <span className="text-slate-500 ml-4">{'// → /{name.toLowerCase()}s, /{name.toLowerCase()}s/:id, etc.'}</span>
      </div>
      <div className="bg-white">
        {children}
      </div>
    </CardContent>
  </Card>
)

// Table List
const TableList = () => (
  <EntityPreview name="Customers" listVariant="table" description="Data-heavy, sortable, filterable rows">
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input className="pl-9 pr-4 py-2 border rounded text-sm w-64" placeholder="Search customers..." />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Customer
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg">
        <div className="grid grid-cols-5 gap-4 p-3 border-b bg-slate-50 text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
          <span>Email</span>
          <span>Tier</span>
          <span>Created</span>
          <span></span>
        </div>
        {[
          { name: 'Sarah Chen', email: 'sarah@company.com', tier: 'Enterprise', created: 'Jan 15, 2025' },
          { name: 'Mike Johnson', email: 'mike@startup.io', tier: 'Pro', created: 'Feb 3, 2025' },
          { name: 'Emily Rodriguez', email: 'emily@agency.co', tier: 'Free', created: 'Mar 12, 2025' },
          { name: 'David Kim', email: 'david@corp.com', tier: 'Pro', created: 'Mar 20, 2025' },
        ].map((row, i) => (
          <div key={i} className="grid grid-cols-5 gap-4 p-3 border-b last:border-0 text-sm items-center hover:bg-slate-50 cursor-pointer">
            <span className="font-medium">{row.name}</span>
            <span className="text-muted-foreground">{row.email}</span>
            <span>
              <Badge variant={row.tier === 'Enterprise' ? 'default' : row.tier === 'Pro' ? 'secondary' : 'outline'} className="text-xs">
                {row.tier}
              </Badge>
            </span>
            <span className="text-muted-foreground">{row.created}</span>
            <span className="flex justify-end">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </span>
          </div>
        ))}
      </div>
    </div>
  </EntityPreview>
)

// Cards List
const CardsList = () => (
  <EntityPreview name="Projects" listVariant="cards" description="Visual card grid for rich previews">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <input className="px-3 py-2 border rounded text-sm w-64" placeholder="Search projects..." />
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Project
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { name: 'Marketing Site', status: 'Active', members: 4, color: 'bg-blue-500' },
          { name: 'Mobile App', status: 'In Progress', members: 6, color: 'bg-purple-500' },
          { name: 'API v2', status: 'Planning', members: 3, color: 'bg-green-500' },
          { name: 'Dashboard', status: 'Active', members: 5, color: 'bg-orange-500' },
          { name: 'Docs Refresh', status: 'In Progress', members: 2, color: 'bg-pink-500' },
          { name: 'Analytics', status: 'Planning', members: 4, color: 'bg-cyan-500' },
        ].map((project, i) => (
          <div key={i} className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer">
            <div className={`h-2 w-12 rounded-full ${project.color} mb-3`} />
            <h3 className="font-medium mb-1">{project.name}</h3>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">{project.status}</Badge>
              <span className="text-xs text-muted-foreground">{project.members} members</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </EntityPreview>
)

// Kanban List
const KanbanList = () => (
  <EntityPreview name="Tasks" listVariant="kanban" description="Status-based columns for workflows">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <span className="font-medium">Sprint 12</span>
          <Badge variant="outline">24 tasks</Badge>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Task
        </Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {[
          { title: 'To Do', count: 8, items: ['Setup CI/CD', 'Design review', 'Write tests'] },
          { title: 'In Progress', count: 6, items: ['Auth flow', 'Dashboard'] },
          { title: 'Review', count: 4, items: ['API docs', 'Landing page'] },
          { title: 'Done', count: 6, items: ['User model', 'Login page', 'DB schema'] },
        ].map((col, i) => (
          <div key={i} className="w-64 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{col.title}</span>
              <Badge variant="secondary" className="text-xs">{col.count}</Badge>
            </div>
            <div className="bg-slate-50 rounded-lg p-2 space-y-2 min-h-[200px]">
              {col.items.map((item, j) => (
                <div key={j} className="bg-white p-3 rounded border shadow-sm cursor-pointer hover:shadow-md transition-shadow">
                  <div className="text-sm">{item}</div>
                  <div className="flex items-center justify-between mt-2">
                    <Badge variant="outline" className="text-[10px]">Feature</Badge>
                    <div className="h-5 w-5 rounded-full bg-primary/10" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </EntityPreview>
)

// Timeline List
const TimelineList = () => (
  <EntityPreview name="Activities" listVariant="timeline" description="Chronological feed of events">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <span className="font-medium">Recent Activity</span>
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
      </div>

      <div className="space-y-4">
        {[
          { action: 'Created', entity: 'New project "Marketing Site"', user: 'Sarah', time: '2 hours ago', icon: Plus },
          { action: 'Updated', entity: 'Task "Auth flow" moved to Review', user: 'Mike', time: '4 hours ago', icon: ArrowUpDown },
          { action: 'Commented', entity: 'on "Dashboard wireframes"', user: 'Emily', time: 'Yesterday', icon: ChevronRight },
          { action: 'Completed', entity: 'Sprint 11 milestone', user: 'Team', time: '2 days ago', icon: ChevronRight },
        ].map((activity, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <activity.icon className="h-4 w-4 text-primary" />
              </div>
              {i < 3 && <div className="w-px h-full bg-border mt-2" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{activity.user}</span>
                <span className="text-sm text-muted-foreground">{activity.action}</span>
              </div>
              <div className="text-sm">{activity.entity}</div>
              <div className="text-xs text-muted-foreground mt-1">{activity.time}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </EntityPreview>
)

// Calendar List
const CalendarList = () => (
  <EntityPreview name="Events" listVariant="calendar" description="Date-based grid view">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm">Today</Button>
          <span className="font-medium">March 2025</span>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Event
        </Button>
      </div>

      <div className="border rounded-lg">
        {/* Days header */}
        <div className="grid grid-cols-7 border-b">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {Array.from({ length: 35 }, (_, i) => {
            const day = i - 5 // Start from previous month
            const isCurrentMonth = day > 0 && day <= 31
            const hasEvent = [5, 12, 18, 25].includes(day)
            return (
              <div key={i} className={`h-20 p-1 border-b border-r ${!isCurrentMonth ? 'bg-slate-50' : ''}`}>
                <div className={`text-xs ${!isCurrentMonth ? 'text-muted-foreground' : ''}`}>
                  {isCurrentMonth ? day : ''}
                </div>
                {hasEvent && isCurrentMonth && (
                  <div className="mt-1 text-[10px] bg-primary/10 text-primary px-1 py-0.5 rounded truncate">
                    Team Meeting
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  </EntityPreview>
)

// Grid List
const GridList = () => (
  <EntityPreview name="Products" listVariant="grid" description="Visual grid for media/products">
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <input className="px-3 py-2 border rounded text-sm w-64" placeholder="Search products..." />
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { name: 'Pro Plan', price: '$29', status: 'Active' },
          { name: 'Team Plan', price: '$79', status: 'Active' },
          { name: 'Enterprise', price: '$199', status: 'Active' },
          { name: 'Starter', price: '$0', status: 'Draft' },
        ].map((product, i) => (
          <div key={i} className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <div className="h-24 bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center">
              <span className="text-2xl font-bold text-muted-foreground/30">{product.name[0]}</span>
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm">{product.name}</span>
                <Badge variant={product.status === 'Active' ? 'default' : 'secondary'} className="text-xs">
                  {product.status}
                </Badge>
              </div>
              <div className="text-lg font-bold mt-1">{product.price}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </EntityPreview>
)

const meta: Meta = {
  title: 'Apps/Entities',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const TableView: StoryObj = { render: () => <TableList /> }
export const CardsView: StoryObj = { render: () => <CardsList /> }
export const KanbanView: StoryObj = { render: () => <KanbanList /> }
export const TimelineView: StoryObj = { render: () => <TimelineList /> }
export const CalendarView: StoryObj = { render: () => <CalendarList /> }
export const GridView: StoryObj = { render: () => <GridList /> }

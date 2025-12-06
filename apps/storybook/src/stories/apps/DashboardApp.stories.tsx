import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Progress } from '@mdxui/shadcn'
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Activity, RefreshCw, Download, Settings } from 'lucide-react'

// Stat card preview
const StatCard = ({
  title,
  value,
  trend,
  icon: Icon,
}: {
  title: string
  value: string
  trend: number
  icon: React.ElementType
}) => (
  <div className="border rounded-lg p-3 flex-1">
    <div className="flex items-center justify-between mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      {trend !== 0 && (
        <div className={`flex items-center text-xs ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <div className="text-lg font-bold">{value}</div>
    <div className="text-xs text-muted-foreground">{title}</div>
  </div>
)

// View preview
const ViewPreview = ({ title, widgets }: { title: string, widgets: string[] }) => (
  <div className="border rounded-lg p-2">
    <div className="text-xs font-medium mb-1">{title}</div>
    <div className="flex flex-wrap gap-1">
      {widgets.map(widget => (
        <Badge key={widget} variant="outline" className="text-[10px]">{widget}</Badge>
      ))}
    </div>
  </div>
)

// DashboardApp component
const DashboardApp = ({
  name,
  description,
  type,
  layout,
  stats,
  views,
  widgets,
  refreshInterval,
}: {
  name: string
  description: string
  type: 'Analytics' | 'Developer' | 'Executive' | 'Sales' | 'Marketing'
  layout: 'dashboard' | 'sidebar'
  stats: Array<{ title: string, value: string, trend: number, icon: 'users' | 'revenue' | 'activity' | 'growth' }>
  views: Array<{ title: string, widgets: string[] }>
  widgets: string[]
  refreshInterval: number
}) => {
  const iconMap = {
    users: Users,
    revenue: DollarSign,
    activity: Activity,
    growth: TrendingUp,
  }

  return (
    <Card className="w-[600px]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <BarChart3 className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>Dashboard App</CardTitle>
              <Badge>{type}</Badge>
            </div>
            <CardDescription>Metrics, charts, and data exploration</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* App info */}
        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
          <div>
            <div className="font-semibold">{name}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          <Badge variant="outline">{layout}</Badge>
        </div>

        {/* Stats preview */}
        <div className="flex gap-2">
          {stats.map(stat => (
            <StatCard key={stat.title} {...stat} icon={iconMap[stat.icon]} />
          ))}
        </div>

        {/* Chart placeholder */}
        <div className="border rounded-lg p-4 h-32 bg-muted/20 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">
            Interactive charts: Line, Bar, Area, Pie, Scatter
          </div>
        </div>

        {/* Views */}
        <div>
          <h4 className="text-sm font-medium mb-2">Views</h4>
          <div className="grid grid-cols-2 gap-2">
            {views.map(view => (
              <ViewPreview key={view.title} {...view} />
            ))}
          </div>
        </div>

        {/* Available widgets */}
        <div>
          <h4 className="text-sm font-medium mb-2">Widgets</h4>
          <div className="flex flex-wrap gap-1">
            {widgets.map(widget => (
              <Badge key={widget} variant="secondary" className="text-xs">{widget}</Badge>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            <span>Refresh: {refreshInterval}s</span>
          </div>
          <div className="flex items-center gap-1">
            <Download className="h-3 w-3" />
            <span>Export to CSV/PDF</span>
          </div>
          <Badge variant="outline" className="text-[10px]">Required Auth</Badge>
        </div>

        {/* Structure */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">APP STRUCTURE</div>
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            <div>DashboardApp</div>
            <div className="ml-4">├── Header (DateRange, Refresh, Export)</div>
            <div className="ml-4">├── View: Overview</div>
            <div className="ml-8">├── StatsRow</div>
            <div className="ml-8">├── Charts Panel</div>
            <div className="ml-8">└── Activity Feed</div>
            <div className="ml-4">├── View: Details</div>
            <div className="ml-8">├── DataTable</div>
            <div className="ml-8">└── Filters Panel</div>
            <div className="ml-4">└── View: Reports</div>
            <div className="ml-8">└── ReportBuilder</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            Configure
          </Button>
          <Button size="sm">Launch App</Button>
        </div>
      </CardContent>
    </Card>
  )
}

const meta: Meta<typeof DashboardApp> = {
  title: 'Apps/DashboardApp',
  component: DashboardApp,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A DashboardApp displays real-time metrics, interactive charts, and data tables with filtering, export, and drill-down capabilities.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const AnalyticsDashboard: Story = {
  args: {
    name: 'Analytics Dashboard',
    description: 'Track user behavior and conversion metrics',
    type: 'Analytics',
    layout: 'dashboard',
    refreshInterval: 30,
    stats: [
      { title: 'Active Users', value: '12,453', trend: 12, icon: 'users' },
      { title: 'Revenue', value: '$45,231', trend: 8, icon: 'revenue' },
      { title: 'Conversion', value: '3.2%', trend: -2, icon: 'activity' },
      { title: 'Growth', value: '+24%', trend: 24, icon: 'growth' },
    ],
    views: [
      { title: 'Overview', widgets: ['Stats', 'Charts', 'Activity'] },
      { title: 'Users', widgets: ['Table', 'Segments', 'Cohorts'] },
      { title: 'Revenue', widgets: ['MRR', 'Churn', 'LTV'] },
      { title: 'Reports', widgets: ['Builder', 'Scheduled', 'Export'] },
    ],
    widgets: ['LineChart', 'BarChart', 'PieChart', 'DataTable', 'StatCard', 'Funnel', 'Heatmap'],
  },
}

export const DeveloperDashboard: Story = {
  args: {
    name: 'Dev Console',
    description: 'Monitor services, logs, and deployments',
    type: 'Developer',
    layout: 'sidebar',
    refreshInterval: 10,
    stats: [
      { title: 'Uptime', value: '99.99%', trend: 0, icon: 'activity' },
      { title: 'Requests/s', value: '4,521', trend: 15, icon: 'activity' },
      { title: 'Error Rate', value: '0.02%', trend: -8, icon: 'activity' },
      { title: 'P99 Latency', value: '45ms', trend: -12, icon: 'activity' },
    ],
    views: [
      { title: 'Overview', widgets: ['ServiceHealth', 'Metrics', 'Alerts'] },
      { title: 'Logs', widgets: ['LogViewer', 'Search', 'Filters'] },
      { title: 'Traces', widgets: ['TraceExplorer', 'Spans', 'Timeline'] },
      { title: 'Deployments', widgets: ['Pipeline', 'History', 'Rollback'] },
    ],
    widgets: ['LogViewer', 'TraceExplorer', 'ServiceMap', 'AlertsFeed', 'MetricChart', 'Timeline'],
  },
}

export const ExecutiveDashboard: Story = {
  args: {
    name: 'Executive Dashboard',
    description: 'High-level business metrics and KPIs',
    type: 'Executive',
    layout: 'dashboard',
    refreshInterval: 300,
    stats: [
      { title: 'ARR', value: '$2.4M', trend: 18, icon: 'revenue' },
      { title: 'Customers', value: '1,234', trend: 12, icon: 'users' },
      { title: 'NPS', value: '72', trend: 5, icon: 'activity' },
      { title: 'Burn Rate', value: '$120K', trend: -8, icon: 'revenue' },
    ],
    views: [
      { title: 'Overview', widgets: ['KPIs', 'Revenue', 'Growth'] },
      { title: 'Sales', widgets: ['Pipeline', 'Forecast', 'Deals'] },
      { title: 'Finance', widgets: ['P&L', 'Runway', 'Burn'] },
      { title: 'Team', widgets: ['Headcount', 'Hiring', 'Retention'] },
    ],
    widgets: ['KPICard', 'TrendChart', 'PipelineView', 'Scoreboard', 'GoalTracker'],
  },
}

export const SalesDashboard: Story = {
  args: {
    name: 'Sales Dashboard',
    description: 'Track pipeline, deals, and team performance',
    type: 'Sales',
    layout: 'sidebar',
    refreshInterval: 60,
    stats: [
      { title: 'Pipeline', value: '$1.2M', trend: 24, icon: 'revenue' },
      { title: 'Won Deals', value: '45', trend: 15, icon: 'activity' },
      { title: 'Win Rate', value: '28%', trend: 3, icon: 'growth' },
      { title: 'Avg Deal', value: '$12,450', trend: 8, icon: 'revenue' },
    ],
    views: [
      { title: 'Pipeline', widgets: ['Kanban', 'Forecast', 'Value'] },
      { title: 'Deals', widgets: ['Table', 'Timeline', 'Documents'] },
      { title: 'Accounts', widgets: ['List', 'Health', 'Activity'] },
      { title: 'Leaderboard', widgets: ['Rankings', 'Quotas', 'Commissions'] },
    ],
    widgets: ['Kanban', 'DealCard', 'ForecastChart', 'Leaderboard', 'ActivityFeed'],
  },
}

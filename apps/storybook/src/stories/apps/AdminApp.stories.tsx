import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Shield, Users, FileText, Settings, Database, Lock, Plus, Search, Filter, MoreVertical } from 'lucide-react'

// Entity row preview
const EntityRow = ({ name, status, count }: { name: string, status: string, count: number }) => (
  <div className="flex items-center justify-between py-2 border-b last:border-0">
    <div className="flex items-center gap-2">
      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-xs font-medium">
        {name[0]}
      </div>
      <div>
        <div className="text-sm font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{count} items</div>
      </div>
    </div>
    <Badge variant={status === 'Active' ? 'default' : 'secondary'}>{status}</Badge>
  </div>
)

// AdminApp component
const AdminApp = ({
  name,
  description,
  type,
  entities,
  features,
  roles,
}: {
  name: string
  description: string
  type: 'CMS' | 'UserAdmin' | 'Settings' | 'Full'
  entities: Array<{ name: string, status: string, count: number }>
  features: string[]
  roles: string[]
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Admin App</CardTitle>
            <Badge>{type}</Badge>
          </div>
          <CardDescription>Content and user management</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* App info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Layout preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className="flex h-48">
          {/* Sidebar */}
          <div className="w-48 bg-muted border-r p-3">
            <div className="text-xs font-medium text-muted-foreground mb-3">NAVIGATION</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 p-2 bg-background rounded text-sm">
                <FileText className="h-4 w-4" />
                <span>Content</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Users</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Database className="h-4 w-4" />
                <span>Media</span>
              </div>
              <div className="flex items-center gap-2 p-2 text-sm text-muted-foreground">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </div>
            </div>
          </div>
          {/* Main content */}
          <div className="flex-1 p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-sm">Content</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Search className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm">
                  <Filter className="h-3 w-3" />
                </Button>
                <Button size="sm">
                  <Plus className="h-3 w-3 mr-1" />
                  New
                </Button>
              </div>
            </div>
            <div className="border rounded-lg p-2">
              {entities.slice(0, 3).map(entity => (
                <EntityRow key={entity.name} {...entity} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Managed entities */}
      <div>
        <h4 className="text-sm font-medium mb-2">Managed Entities</h4>
        <div className="flex flex-wrap gap-1">
          {entities.map(entity => (
            <Badge key={entity.name} variant="outline" className="text-xs">
              {entity.name} ({entity.count})
            </Badge>
          ))}
        </div>
      </div>

      {/* Roles */}
      <div>
        <h4 className="text-sm font-medium mb-2">Admin Roles</h4>
        <div className="flex flex-wrap gap-1">
          {roles.map(role => (
            <Badge key={role} variant="secondary" className="text-xs">
              <Lock className="h-3 w-3 mr-1" />
              {role}
            </Badge>
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
          <div>AdminApp</div>
          <div className="ml-4">├── Sidebar Navigation</div>
          <div className="ml-4">├── View: List</div>
          <div className="ml-8">├── SearchBar + Filters</div>
          <div className="ml-8">├── DataTable</div>
          <div className="ml-8">└── BulkActions + Pagination</div>
          <div className="ml-4">├── View: Detail</div>
          <div className="ml-8">├── EntityForm</div>
          <div className="ml-8">└── ActionBar</div>
          <div className="ml-4">└── View: Settings</div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Configure</Button>
        <Button size="sm">Launch Admin</Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof AdminApp> = {
  title: 'Apps/AdminApp',
  component: AdminApp,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An AdminApp provides a sidebar-based interface for managing content, users, and settings with role-based access control.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const CMSAdmin: Story = {
  args: {
    name: 'Content Admin',
    description: 'Manage blog posts, pages, and media',
    type: 'CMS',
    entities: [
      { name: 'Posts', status: 'Active', count: 234 },
      { name: 'Pages', status: 'Active', count: 45 },
      { name: 'Media', status: 'Active', count: 1892 },
      { name: 'Categories', status: 'Active', count: 18 },
      { name: 'Tags', status: 'Active', count: 156 },
    ],
    features: ['Rich Text Editor', 'Media Upload', 'SEO Tools', 'Scheduling', 'Revisions', 'Preview'],
    roles: ['Super Admin', 'Editor', 'Author', 'Contributor'],
  },
}

export const UserAdmin: Story = {
  args: {
    name: 'User Admin',
    description: 'Manage users, roles, and permissions',
    type: 'UserAdmin',
    entities: [
      { name: 'Users', status: 'Active', count: 12453 },
      { name: 'Roles', status: 'Active', count: 8 },
      { name: 'Teams', status: 'Active', count: 45 },
      { name: 'Invites', status: 'Active', count: 23 },
      { name: 'Sessions', status: 'Active', count: 3421 },
    ],
    features: ['User Import', 'SSO', 'MFA', 'Audit Log', 'Session Management', 'RBAC'],
    roles: ['Super Admin', 'User Admin', 'Support'],
  },
}

export const EcommerceAdmin: Story = {
  args: {
    name: 'Store Admin',
    description: 'Manage products, orders, and customers',
    type: 'Full',
    entities: [
      { name: 'Products', status: 'Active', count: 892 },
      { name: 'Orders', status: 'Active', count: 4521 },
      { name: 'Customers', status: 'Active', count: 8923 },
      { name: 'Categories', status: 'Active', count: 34 },
      { name: 'Coupons', status: 'Active', count: 12 },
      { name: 'Reviews', status: 'Active', count: 2341 },
    ],
    features: ['Inventory', 'Order Fulfillment', 'Shipping', 'Taxes', 'Discounts', 'Analytics'],
    roles: ['Admin', 'Store Manager', 'Fulfillment', 'Support'],
  },
}

export const SettingsAdmin: Story = {
  args: {
    name: 'Settings',
    description: 'Configure application settings and integrations',
    type: 'Settings',
    entities: [
      { name: 'General', status: 'Active', count: 12 },
      { name: 'Integrations', status: 'Active', count: 8 },
      { name: 'Billing', status: 'Active', count: 1 },
      { name: 'API Keys', status: 'Active', count: 5 },
      { name: 'Webhooks', status: 'Active', count: 3 },
    ],
    features: ['OAuth Apps', 'API Keys', 'Webhooks', 'Custom Domains', 'Email Settings', 'Backup'],
    roles: ['Owner', 'Admin'],
  },
}

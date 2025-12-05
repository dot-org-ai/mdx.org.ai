import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Building2, Globe, Users, Mail } from 'lucide-react'

// Conceptual Business component
const Business = ({
  name,
  description,
  industry,
  size,
  website,
  site,
  app,
}: {
  name: string
  description: string
  industry: string
  size: 'startup' | 'small' | 'medium' | 'enterprise'
  website?: string
  site?: { pages: string[] }
  app?: { views: string[] }
}) => (
  <Card className="w-[500px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="outline">{industry}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4" />
          <span className="capitalize">{size}</span>
        </div>
        {website && (
          <div className="flex items-center gap-1">
            <Globe className="h-4 w-4" />
            <span>{website}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {site && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Site</h4>
            <p className="text-xs text-muted-foreground mb-2">Marketing & Content</p>
            <div className="flex flex-wrap gap-1">
              {site.pages.map(page => (
                <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
              ))}
            </div>
          </div>
        )}
        {app && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">App</h4>
            <p className="text-xs text-muted-foreground mb-2">Customer Portal</p>
            <div className="flex flex-wrap gap-1">
              {app.views.map(view => (
                <code key={view} className="text-xs bg-muted px-1 py-0.5 rounded">{view}</code>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {site && <Button variant="outline" size="sm">Visit Website</Button>}
        {app && <Button size="sm">Customer Portal</Button>}
        <Button variant="ghost" size="sm">
          <Mail className="h-4 w-4 mr-1" />
          Contact
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Business> = {
  title: 'Abstracts/Business',
  component: Business,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Business represents a company or organization. Businesses have a marketing Site and potentially a customer-facing App.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'Acme Corp',
    description: 'Building the future of productivity software',
    industry: 'SaaS',
    size: 'medium',
    website: 'acme.com',
    site: {
      pages: ['/', '/about', '/pricing', '/blog', '/careers'],
    },
    app: {
      views: ['dashboard', 'projects', 'team', 'billing'],
    },
  },
}

export const Startup: Story = {
  args: {
    name: 'DevFlow',
    description: 'Streamline your development workflow',
    industry: 'Developer Tools',
    size: 'startup',
    website: 'devflow.io',
    site: {
      pages: ['/', '/features', '/pricing'],
    },
    app: {
      views: ['workspace', 'settings'],
    },
  },
}

export const Enterprise: Story = {
  args: {
    name: 'GlobalTech Solutions',
    description: 'Enterprise software and consulting',
    industry: 'Enterprise',
    size: 'enterprise',
    website: 'globaltech.com',
    site: {
      pages: ['/', '/solutions', '/industries', '/partners', '/resources', '/contact'],
    },
    app: {
      views: ['dashboard', 'analytics', 'reports', 'admin', 'integrations'],
    },
  },
}

import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Package, Star, Download, ExternalLink } from 'lucide-react'

// Conceptual Product component
const Product = ({
  name,
  tagline,
  description,
  category,
  pricing,
  rating,
  downloads,
  site,
  app,
}: {
  name: string
  tagline: string
  description: string
  category: string
  pricing: 'free' | 'freemium' | 'paid' | 'enterprise'
  rating?: number
  downloads?: string
  site?: { pages: string[] }
  app?: { views: string[] }
}) => (
  <Card className="w-[500px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
          <Package className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant={pricing === 'free' ? 'secondary' : pricing === 'enterprise' ? 'default' : 'outline'}>
              {pricing}
            </Badge>
          </div>
          <CardDescription>{tagline}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline">{category}</Badge>
        {rating && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span>{rating}</span>
          </div>
        )}
        {downloads && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Download className="h-4 w-4" />
            <span>{downloads}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {site && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Product Site</h4>
            <div className="flex flex-wrap gap-1">
              {site.pages.map(page => (
                <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
              ))}
            </div>
          </div>
        )}
        {app && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Product App</h4>
            <div className="flex flex-wrap gap-1">
              {app.views.map(view => (
                <code key={view} className="text-xs bg-muted px-1 py-0.5 rounded">{view}</code>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {site && (
          <Button variant="outline" size="sm">
            Learn More
            <ExternalLink className="h-3 w-3 ml-1" />
          </Button>
        )}
        {app && <Button size="sm">Try Free</Button>}
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Product> = {
  title: 'Abstracts/Product',
  component: Product,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Product is a SaaS offering or digital product. Products have a marketing Site and a functional App.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'FlowBoard',
    tagline: 'Project management reimagined',
    description: 'A modern project management tool with AI-powered insights, real-time collaboration, and beautiful visualizations.',
    category: 'Productivity',
    pricing: 'freemium',
    rating: 4.8,
    downloads: '50K+',
    site: {
      pages: ['/', '/features', '/pricing', '/docs', '/changelog'],
    },
    app: {
      views: ['boards', 'timeline', 'calendar', 'reports', 'settings'],
    },
  },
}

export const FreeProduct: Story = {
  args: {
    name: 'OpenNote',
    tagline: 'Beautiful notes, open source',
    description: 'A free, open-source note-taking app with markdown support and end-to-end encryption.',
    category: 'Notes',
    pricing: 'free',
    rating: 4.9,
    downloads: '100K+',
    site: {
      pages: ['/', '/features', '/community'],
    },
    app: {
      views: ['notes', 'folders', 'search', 'settings'],
    },
  },
}

export const EnterpriseProduct: Story = {
  args: {
    name: 'DataVault',
    tagline: 'Enterprise data platform',
    description: 'Secure, compliant data management for enterprise organizations with advanced analytics and governance.',
    category: 'Data Platform',
    pricing: 'enterprise',
    site: {
      pages: ['/', '/solutions', '/security', '/compliance', '/case-studies', '/contact'],
    },
    app: {
      views: ['dashboard', 'datasets', 'pipelines', 'governance', 'admin'],
    },
  },
}

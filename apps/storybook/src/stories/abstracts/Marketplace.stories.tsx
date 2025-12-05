import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Input } from '@mdxui/shadcn'
import { Search, ShoppingCart, Star, DollarSign, Package } from 'lucide-react'

// Marketplace item
const MarketplaceItem = ({
  name,
  seller,
  price,
  rating,
  category
}: {
  name: string
  seller: string
  price: string
  rating: number
  category: string
}) => (
  <div className="border rounded-lg p-3">
    <div className="h-20 bg-muted rounded mb-2 flex items-center justify-center">
      <Package className="h-8 w-8 text-muted-foreground" />
    </div>
    <div className="font-medium text-sm truncate">{name}</div>
    <div className="text-xs text-muted-foreground">{seller}</div>
    <div className="flex items-center justify-between mt-2">
      <div className="flex items-center gap-1">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs">{rating}</span>
      </div>
      <Badge variant="secondary" className="text-xs">{price}</Badge>
    </div>
  </div>
)

// Conceptual Marketplace component
const Marketplace = ({
  name,
  description,
  type,
  itemCount,
  sellerCount,
  categories,
  featured,
  site,
  app,
}: {
  name: string
  description: string
  type: 'products' | 'services' | 'digital' | 'templates'
  itemCount: number
  sellerCount: number
  categories: string[]
  featured: Array<{ name: string, seller: string, price: string, rating: number, category: string }>
  site?: { pages: string[] }
  app?: { views: string[] }
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="outline">{itemCount.toLocaleString()} items</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge className="capitalize">{type}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Stats */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Package className="h-4 w-4" />
          <span>{itemCount.toLocaleString()} items</span>
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="h-4 w-4" />
          <span>{sellerCount.toLocaleString()} sellers</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search marketplace..." className="pl-8" />
        </div>
        <Button variant="outline" size="icon">
          <ShoppingCart className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Badge key={cat} variant="secondary">{cat}</Badge>
        ))}
      </div>

      {/* Featured items */}
      <div>
        <h4 className="text-sm font-medium mb-2">Featured</h4>
        <div className="grid grid-cols-3 gap-2">
          {featured.slice(0, 3).map(item => (
            <MarketplaceItem key={item.name} {...item} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        {site && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-1">Marketplace Site</h4>
            <div className="flex flex-wrap gap-1">
              {site.pages.map(page => (
                <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
              ))}
            </div>
          </div>
        )}
        {app && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-1">Marketplace App</h4>
            <div className="flex flex-wrap gap-1">
              {app.views.map(view => (
                <code key={view} className="text-xs bg-muted px-1 py-0.5 rounded">{view}</code>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm">Browse All</Button>
        <Button size="sm">Become a Seller</Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Marketplace> = {
  title: 'Abstracts/Marketplace',
  component: Marketplace,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Marketplace is a platform for buying and selling products or services. Marketplaces have both a storefront Site and a transactional App.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'TemplateHub',
    description: 'Premium templates for modern web development',
    type: 'templates',
    itemCount: 2500,
    sellerCount: 450,
    categories: ['Landing Pages', 'Dashboards', 'E-commerce', 'SaaS', 'Portfolios'],
    featured: [
      { name: 'SaaS Starter', seller: 'ProTemplates', price: '$49', rating: 4.9, category: 'SaaS' },
      { name: 'Dashboard Pro', seller: 'UIKings', price: '$79', rating: 4.8, category: 'Dashboard' },
      { name: 'E-Shop Theme', seller: 'DesignCraft', price: '$59', rating: 4.7, category: 'E-commerce' },
    ],
    site: {
      pages: ['/', '/browse', '/categories', '/sellers', '/pricing'],
    },
    app: {
      views: ['shop', 'cart', 'purchases', 'seller-dashboard'],
    },
  },
}

export const DigitalMarketplace: Story = {
  args: {
    name: 'PluginStore',
    description: 'Extensions and plugins for your favorite tools',
    type: 'digital',
    itemCount: 8500,
    sellerCount: 1200,
    categories: ['VSCode', 'Figma', 'Chrome', 'Slack', 'Notion'],
    featured: [
      { name: 'AI Assistant', seller: 'CodeLabs', price: 'Free', rating: 4.9, category: 'VSCode' },
      { name: 'Auto Layout Pro', seller: 'FigmaPlus', price: '$12/mo', rating: 4.8, category: 'Figma' },
      { name: 'Tab Manager', seller: 'BrowserTools', price: '$5', rating: 4.6, category: 'Chrome' },
    ],
    site: {
      pages: ['/', '/discover', '/developers', '/docs'],
    },
    app: {
      views: ['browse', 'installed', 'updates', '/developer'],
    },
  },
}

export const ServiceMarketplace: Story = {
  args: {
    name: 'FreelanceHub',
    description: 'Connect with skilled freelancers',
    type: 'services',
    itemCount: 15000,
    sellerCount: 5000,
    categories: ['Development', 'Design', 'Writing', 'Marketing', 'Video'],
    featured: [
      { name: 'Full Stack Dev', seller: 'John D.', price: '$75/hr', rating: 5.0, category: 'Development' },
      { name: 'Brand Identity', seller: 'Sarah K.', price: '$500', rating: 4.9, category: 'Design' },
      { name: 'SEO Audit', seller: 'Mike R.', price: '$200', rating: 4.8, category: 'Marketing' },
    ],
    site: {
      pages: ['/', '/find-talent', '/post-job', '/how-it-works'],
    },
    app: {
      views: ['browse', 'messages', 'projects', 'payments'],
    },
  },
}

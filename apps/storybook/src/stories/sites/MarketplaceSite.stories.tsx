import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Store, ShoppingCart, Users, DollarSign, Star, Package, ExternalLink, TrendingUp } from 'lucide-react'

// Product card preview
const ProductCard = ({
  name,
  seller,
  price,
  sales,
  rating,
}: {
  name: string
  seller: string
  price: number
  sales: number
  rating: number
}) => (
  <div className="border rounded-lg p-3 flex-1 min-w-[140px]">
    <div className="h-12 w-full rounded bg-gradient-to-br from-muted to-muted/50 mb-2" />
    <div className="font-medium text-sm truncate">{name}</div>
    <div className="text-xs text-muted-foreground mb-1">by {seller}</div>
    <div className="flex items-center justify-between">
      <span className="font-bold text-sm">${price}</span>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        {rating}
      </div>
    </div>
    <div className="text-xs text-muted-foreground mt-1">{sales.toLocaleString()} sales</div>
  </div>
)

// MarketplaceSite component
const MarketplaceSite = ({
  domain,
  name,
  description,
  type,
  model,
  stats,
  categories,
  sampleProducts,
  features,
}: {
  domain: string
  name: string
  description: string
  type: 'Digital Products' | 'Physical Goods' | 'Services' | 'NFTs'
  model: 'commission' | 'subscription' | 'listing-fee'
  stats: {
    sellers: number
    products: number
    sales: number
    gmv: number
  }
  categories: string[]
  sampleProducts: Array<{
    name: string
    seller: string
    price: number
    sales: number
    rating: number
  }>
  features: string[]
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
          <Store className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Marketplace Site</CardTitle>
            <Badge variant="secondary">{type}</Badge>
          </div>
          <CardDescription>Multi-vendor commerce platform</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Marketplace info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center justify-between mb-1">
          <div className="font-semibold">{name}</div>
          <Badge>{model} model</Badge>
        </div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Users className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">{stats.sellers.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Sellers</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <Package className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">{stats.products.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Products</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <ShoppingCart className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">{stats.sales.toLocaleString()}</div>
          <div className="text-xs text-muted-foreground">Sales</div>
        </div>
        <div className="text-center p-2 bg-muted/30 rounded-lg">
          <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
          <div className="text-lg font-bold">${(stats.gmv / 1000000).toFixed(1)}M</div>
          <div className="text-xs text-muted-foreground">GMV</div>
        </div>
      </div>

      {/* Categories */}
      <div>
        <h4 className="text-sm font-medium mb-2">Categories</h4>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <Badge key={cat} variant="outline" className="text-xs cursor-pointer hover:bg-muted">{cat}</Badge>
          ))}
        </div>
      </div>

      {/* Sample products */}
      <div>
        <h4 className="text-sm font-medium mb-2">Featured Products</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sampleProducts.map(product => (
            <ProductCard key={product.name} {...product} />
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <h4 className="text-sm font-medium mb-2">Platform Features</h4>
        <div className="flex flex-wrap gap-1">
          {features.map(feature => (
            <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
          ))}
        </div>
      </div>

      {/* Structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">SITE STRUCTURE</div>
        <div className="font-mono text-xs space-y-1 text-muted-foreground">
          <div>MarketplaceSite</div>
          <div className="ml-4">├── MarketplaceHero</div>
          <div className="ml-4">├── FeaturedProducts</div>
          <div className="ml-4">├── Categories</div>
          <div className="ml-4">├── ProductGrid + Filters</div>
          <div className="ml-4">├── SellerSpotlight</div>
          <div className="ml-4">├── ProductDetail</div>
          <div className="ml-8">├── Gallery + Info + Purchase</div>
          <div className="ml-8">├── SellerInfo + Reviews</div>
          <div className="ml-8">└── RelatedProducts</div>
          <div className="ml-4">├── SellerProfile</div>
          <div className="ml-4">└── BecomeASeller</div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Manage Products</Button>
        <Button variant="outline" size="sm">Seller Dashboard</Button>
        <Button size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof MarketplaceSite> = {
  title: 'Sites/MarketplaceSite',
  component: MarketplaceSite,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A MarketplaceSite enables multi-vendor commerce with product listings, seller profiles, reviews, and transaction management.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const DigitalProducts: Story = {
  args: {
    domain: 'gumroad.com',
    name: 'Digital Market',
    description: 'Sell digital products directly to your audience',
    type: 'Digital Products',
    model: 'commission',
    stats: { sellers: 12500, products: 85000, sales: 2400000, gmv: 45000000 },
    categories: ['Templates', 'Courses', 'E-books', 'Software', 'Music', 'Art', 'Fonts', 'Icons'],
    sampleProducts: [
      { name: 'Notion Templates', seller: 'ProductivityPro', price: 29, sales: 12453, rating: 4.8 },
      { name: 'UI Kit Pro', seller: 'DesignStudio', price: 79, sales: 8234, rating: 4.9 },
      { name: 'Video Course', seller: 'TechTeacher', price: 149, sales: 3421, rating: 4.7 },
    ],
    features: ['Instant Delivery', 'License Keys', 'Analytics', 'Coupons', 'Affiliates', 'Subscriptions'],
  },
}

export const FreelanceServices: Story = {
  args: {
    domain: 'services.market',
    name: 'Service Market',
    description: 'Find and hire expert freelancers',
    type: 'Services',
    model: 'commission',
    stats: { sellers: 45000, products: 125000, sales: 890000, gmv: 78000000 },
    categories: ['Development', 'Design', 'Writing', 'Marketing', 'Video', 'Audio', 'Business', 'AI'],
    sampleProducts: [
      { name: 'Website Development', seller: 'WebPro', price: 500, sales: 2341, rating: 4.9 },
      { name: 'Logo Design', seller: 'BrandMaster', price: 150, sales: 5621, rating: 4.8 },
      { name: 'SEO Audit', seller: 'GrowthHacker', price: 200, sales: 1892, rating: 4.7 },
    ],
    features: ['Escrow Payments', 'Milestones', 'Chat', 'Video Calls', 'Reviews', 'Disputes'],
  },
}

export const TemplateMarketplace: Story = {
  args: {
    domain: 'templates.dev',
    name: 'Template Market',
    description: 'Premium templates for developers and designers',
    type: 'Digital Products',
    model: 'commission',
    stats: { sellers: 3200, products: 18000, sales: 450000, gmv: 12000000 },
    categories: ['React', 'Next.js', 'Tailwind', 'Figma', 'Framer', 'Webflow', 'WordPress', 'Shopify'],
    sampleProducts: [
      { name: 'SaaS Starter', seller: 'ShipFast', price: 199, sales: 4521, rating: 4.9 },
      { name: 'Admin Dashboard', seller: 'UIKitPro', price: 79, sales: 8923, rating: 4.8 },
      { name: 'Landing Pages', seller: 'ConvertKit', price: 49, sales: 12341, rating: 4.7 },
    ],
    features: ['Source Code', 'Lifetime Updates', 'Support', 'Documentation', 'License Options'],
  },
}

export const NFTMarketplace: Story = {
  args: {
    domain: 'nft.gallery',
    name: 'NFT Gallery',
    description: 'Discover, collect, and sell digital art',
    type: 'NFTs',
    model: 'commission',
    stats: { sellers: 8900, products: 125000, sales: 67000, gmv: 890000000 },
    categories: ['Art', 'Photography', 'Music', 'Gaming', 'Collectibles', 'Utility', 'Virtual Worlds'],
    sampleProducts: [
      { name: 'Genesis Collection', seller: 'CryptoArtist', price: 2500, sales: 234, rating: 4.9 },
      { name: 'Pixel Punks', seller: 'PixelMaster', price: 800, sales: 1234, rating: 4.8 },
      { name: 'AI Landscapes', seller: 'AICreator', price: 150, sales: 3421, rating: 4.6 },
    ],
    features: ['Wallet Connect', 'Auctions', 'Royalties', 'Collections', 'Rarity', 'Provenance'],
  },
}

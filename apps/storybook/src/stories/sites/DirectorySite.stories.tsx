import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Search, Grid, Filter, Star, ExternalLink, MapPin, Tag, Layers } from 'lucide-react'

// Listing card preview
const ListingCard = ({
  name,
  category,
  rating,
  reviews,
  tags,
}: {
  name: string
  category: string
  rating: number
  reviews: number
  tags: string[]
}) => (
  <div className="border rounded-lg p-3 flex-1 min-w-[140px]">
    <div className="h-8 w-8 rounded bg-muted mb-2" />
    <div className="font-medium text-sm truncate">{name}</div>
    <div className="text-xs text-muted-foreground mb-2">{category}</div>
    <div className="flex items-center gap-1 text-xs">
      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
      <span>{rating}</span>
      <span className="text-muted-foreground">({reviews})</span>
    </div>
    <div className="flex flex-wrap gap-1 mt-2">
      {tags.slice(0, 2).map(tag => (
        <Badge key={tag} variant="outline" className="text-[9px] px-1">{tag}</Badge>
      ))}
    </div>
  </div>
)

// DirectorySite component
const DirectorySite = ({
  domain,
  name,
  description,
  entityType,
  categories,
  totalListings,
  filters,
  sampleListings,
}: {
  domain: string
  name: string
  description: string
  entityType: string
  categories: string[]
  totalListings: number
  filters: string[]
  sampleListings: Array<{
    name: string
    category: string
    rating: number
    reviews: number
    tags: string[]
  }>
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Grid className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Directory Site</CardTitle>
            <Badge variant="secondary">{entityType}</Badge>
          </div>
          <CardDescription>Searchable listings with categories</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Directory info */}
      <div className="p-3 bg-muted/50 rounded-lg">
        <div className="font-semibold">{name}</div>
        <div className="text-sm text-muted-foreground">{description}</div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Layers className="h-4 w-4" />
          <span>{totalListings.toLocaleString()} listings</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Tag className="h-4 w-4" />
          <span>{categories.length} categories</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>{filters.length} filters</span>
        </div>
      </div>

      {/* Search preview */}
      <div className="border rounded-lg p-4">
        <div className="flex gap-2 mb-3">
          <div className="flex-1 h-9 bg-muted rounded border px-3 flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Search {totalListings.toLocaleString()} {entityType.toLowerCase()}...</span>
          </div>
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {categories.map(cat => (
            <Badge key={cat} variant="outline" className="text-xs cursor-pointer hover:bg-muted">{cat}</Badge>
          ))}
        </div>
      </div>

      {/* Sample listings */}
      <div>
        <h4 className="text-sm font-medium mb-2">Sample Listings</h4>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sampleListings.map(listing => (
            <ListingCard key={listing.name} {...listing} />
          ))}
        </div>
      </div>

      {/* Filters */}
      <div>
        <h4 className="text-sm font-medium mb-2">Available Filters</h4>
        <div className="flex flex-wrap gap-1">
          {filters.map(filter => (
            <Badge key={filter} variant="secondary" className="text-xs">{filter}</Badge>
          ))}
        </div>
      </div>

      {/* Structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">SITE STRUCTURE</div>
        <div className="font-mono text-xs space-y-1 text-muted-foreground">
          <div>DirectorySite</div>
          <div className="ml-4">├── DirectoryHero + Search</div>
          <div className="ml-4">├── FeaturedListings</div>
          <div className="ml-4">├── CategoryNav</div>
          <div className="ml-4">├── ListingGrid + Filters + Pagination</div>
          <div className="ml-4">└── ListingDetail (individual pages)</div>
          <div className="ml-8">├── Header + Gallery</div>
          <div className="ml-8">├── Description + Features</div>
          <div className="ml-8">├── Reviews</div>
          <div className="ml-8">└── RelatedListings</div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Manage Listings</Button>
        <Button size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof DirectorySite> = {
  title: 'Sites/DirectorySite',
  component: DirectorySite,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A DirectorySite is a searchable collection of listings organized by categories with filtering, reviews, and individual detail pages.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const AIToolsDirectory: Story = {
  args: {
    domain: 'aitools.directory',
    name: 'AI Tools Directory',
    description: 'Discover the best AI tools for every use case',
    entityType: 'AI Tools',
    totalListings: 2847,
    categories: ['Writing', 'Image', 'Code', 'Audio', 'Video', 'Productivity', 'Research', 'Marketing'],
    filters: ['Pricing', 'Rating', 'Features', 'Platform', 'API Available', 'Open Source'],
    sampleListings: [
      { name: 'ChatGPT', category: 'Writing', rating: 4.8, reviews: 12453, tags: ['Free tier', 'API'] },
      { name: 'Midjourney', category: 'Image', rating: 4.7, reviews: 8234, tags: ['Paid', 'Discord'] },
      { name: 'Copilot', category: 'Code', rating: 4.6, reviews: 5621, tags: ['Paid', 'IDE'] },
    ],
  },
}

export const StartupDirectory: Story = {
  args: {
    domain: 'startups.fyi',
    name: 'Startup Directory',
    description: 'Browse 10,000+ startups by industry and stage',
    entityType: 'Startups',
    totalListings: 10234,
    categories: ['SaaS', 'Fintech', 'Health', 'E-commerce', 'AI/ML', 'Climate', 'Consumer', 'B2B'],
    filters: ['Stage', 'Funding', 'Team Size', 'Location', 'Founded Year', 'Hiring'],
    sampleListings: [
      { name: 'Vercel', category: 'Developer Tools', rating: 4.9, reviews: 2341, tags: ['Series D', 'Remote'] },
      { name: 'Linear', category: 'Productivity', rating: 4.8, reviews: 1892, tags: ['Series B', 'SF'] },
      { name: 'Resend', category: 'Developer Tools', rating: 4.7, reviews: 891, tags: ['Seed', 'Email'] },
    ],
  },
}

export const JobBoard: Story = {
  args: {
    domain: 'remotejobs.io',
    name: 'Remote Jobs',
    description: 'Find your next remote opportunity',
    entityType: 'Jobs',
    totalListings: 15678,
    categories: ['Engineering', 'Design', 'Product', 'Marketing', 'Sales', 'Support', 'Operations'],
    filters: ['Salary Range', 'Experience', 'Timezone', 'Company Size', 'Benefits', 'Contract Type'],
    sampleListings: [
      { name: 'Senior Engineer', category: 'Engineering', rating: 4.5, reviews: 89, tags: ['$150-200k', 'Full-time'] },
      { name: 'Product Designer', category: 'Design', rating: 4.3, reviews: 45, tags: ['$120-150k', 'Full-time'] },
      { name: 'DevRel Lead', category: 'Marketing', rating: 4.6, reviews: 23, tags: ['$130-160k', 'Remote'] },
    ],
  },
}

export const LocalBusinessDirectory: Story = {
  args: {
    domain: 'sf.local',
    name: 'SF Local',
    description: 'Discover the best local businesses in San Francisco',
    entityType: 'Businesses',
    totalListings: 8923,
    categories: ['Restaurants', 'Cafes', 'Shops', 'Services', 'Health', 'Entertainment', 'Outdoors'],
    filters: ['Price Range', 'Rating', 'Open Now', 'Distance', 'Neighborhood', 'Amenities'],
    sampleListings: [
      { name: 'Tartine', category: 'Bakery', rating: 4.8, reviews: 3421, tags: ['$$', 'Mission'] },
      { name: 'Blue Bottle', category: 'Coffee', rating: 4.5, reviews: 2893, tags: ['$$', 'Multiple'] },
      { name: 'Nopalito', category: 'Mexican', rating: 4.7, reviews: 1892, tags: ['$$', 'NOPA'] },
    ],
  },
}

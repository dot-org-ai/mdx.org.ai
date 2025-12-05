import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Avatar, AvatarFallback, Input } from '@mdxui/shadcn'
import { Search, MapPin, Filter, Grid, List } from 'lucide-react'

// Directory listing item
const DirectoryItem = ({ name, type, location, tags }: { name: string, type: string, location?: string, tags?: string[] }) => (
  <div className="flex items-center gap-3 p-3 border rounded-lg">
    <Avatar>
      <AvatarFallback>{name[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="font-medium truncate">{name}</div>
      <div className="text-sm text-muted-foreground flex items-center gap-2">
        <span>{type}</span>
        {location && (
          <>
            <span>·</span>
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
          </>
        )}
      </div>
    </div>
    {tags && (
      <div className="flex gap-1">
        {tags.slice(0, 2).map(tag => (
          <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
        ))}
      </div>
    )}
  </div>
)

// Conceptual Directory component
const Directory = ({
  name,
  description,
  type,
  itemCount,
  categories,
  listings,
  site,
  app,
}: {
  name: string
  description: string
  type: 'people' | 'places' | 'businesses' | 'resources'
  itemCount: number
  categories: string[]
  listings: Array<{ name: string, type: string, location?: string, tags?: string[] }>
  site?: { pages: string[] }
  app?: { views: string[] }
}) => (
  <Card className="w-[550px]">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="outline">{itemCount} listings</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
        <Badge className="capitalize">{type}</Badge>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search directory..." className="pl-8" />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon">
          <Grid className="h-4 w-4" />
        </Button>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <Badge key={cat} variant="secondary">{cat}</Badge>
        ))}
      </div>

      {/* Sample listings */}
      <div className="space-y-2">
        {listings.slice(0, 3).map(listing => (
          <DirectoryItem key={listing.name} {...listing} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        {site && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-1">Directory Site</h4>
            <div className="flex flex-wrap gap-1">
              {site.pages.map(page => (
                <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
              ))}
            </div>
          </div>
        )}
        {app && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-1">Directory App</h4>
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
        <Button size="sm">Add Listing</Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Directory> = {
  title: 'Abstracts/Directory',
  component: Directory,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Directory is a collection of listings (people, places, businesses, resources). Directories have both a browsable Site and a searchable App.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'TechPeople',
    description: 'Find and connect with tech professionals',
    type: 'people',
    itemCount: 12500,
    categories: ['Engineers', 'Designers', 'Product', 'Data', 'DevOps'],
    listings: [
      { name: 'Alex Chen', type: 'Senior Engineer', location: 'San Francisco', tags: ['React', 'Node.js'] },
      { name: 'Sarah Kim', type: 'Product Designer', location: 'New York', tags: ['Figma', 'UX'] },
      { name: 'Marcus Johnson', type: 'Data Scientist', location: 'Austin', tags: ['Python', 'ML'] },
    ],
    site: {
      pages: ['/', '/browse', '/categories', '/about'],
    },
    app: {
      views: ['search', 'profile', 'connections', 'messages'],
    },
  },
}

export const BusinessDirectory: Story = {
  args: {
    name: 'LocalBiz',
    description: 'Discover local businesses in your area',
    type: 'businesses',
    itemCount: 8500,
    categories: ['Restaurants', 'Services', 'Retail', 'Health', 'Entertainment'],
    listings: [
      { name: 'Blue Sky Cafe', type: 'Restaurant', location: 'Downtown', tags: ['Coffee', 'Brunch'] },
      { name: 'TechFix Pro', type: 'Services', location: 'Midtown', tags: ['Repairs', 'Electronics'] },
      { name: 'Green Market', type: 'Retail', location: 'Westside', tags: ['Organic', 'Local'] },
    ],
    site: {
      pages: ['/', '/explore', '/categories', '/claim'],
    },
    app: {
      views: ['map', 'list', 'favorites', 'reviews'],
    },
  },
}

export const ResourceDirectory: Story = {
  args: {
    name: 'DevResources',
    description: 'Curated resources for developers',
    type: 'resources',
    itemCount: 3200,
    categories: ['Libraries', 'Tools', 'Tutorials', 'APIs', 'Templates'],
    listings: [
      { name: 'React Query', type: 'Library', tags: ['React', 'Data Fetching'] },
      { name: 'Figma', type: 'Tool', tags: ['Design', 'Collaboration'] },
      { name: 'MDN Web Docs', type: 'Documentation', tags: ['Reference', 'Web'] },
    ],
    site: {
      pages: ['/', '/browse', '/submit', '/about'],
    },
    app: {
      views: ['explore', 'collections', 'bookmarks', 'submit'],
    },
  },
}

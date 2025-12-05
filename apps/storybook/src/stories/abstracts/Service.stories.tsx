import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Briefcase, Clock, DollarSign, Calendar } from 'lucide-react'

// Conceptual Service component
const Service = ({
  name,
  tagline,
  description,
  type,
  pricing,
  availability,
  site,
  app,
}: {
  name: string
  tagline: string
  description: string
  type: 'consulting' | 'development' | 'design' | 'support' | 'training'
  pricing: string
  availability: 'available' | 'limited' | 'waitlist'
  site?: { pages: string[] }
  app?: { views: string[] }
}) => (
  <Card className="w-[500px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Briefcase className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant={availability === 'available' ? 'default' : availability === 'limited' ? 'secondary' : 'outline'}>
              {availability}
            </Badge>
          </div>
          <CardDescription>{tagline}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <p className="text-sm text-muted-foreground">{description}</p>

      <div className="flex items-center gap-4 text-sm">
        <Badge variant="outline" className="capitalize">{type}</Badge>
        <div className="flex items-center gap-1 text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>{pricing}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {site && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Service Site</h4>
            <div className="flex flex-wrap gap-1">
              {site.pages.map(page => (
                <code key={page} className="text-xs bg-muted px-1 py-0.5 rounded">{page}</code>
              ))}
            </div>
          </div>
        )}
        {app && (
          <div className="border rounded-lg p-3">
            <h4 className="text-sm font-medium mb-2">Client Portal</h4>
            <div className="flex flex-wrap gap-1">
              {app.views.map(view => (
                <code key={view} className="text-xs bg-muted px-1 py-0.5 rounded">{view}</code>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {site && <Button variant="outline" size="sm">Learn More</Button>}
        <Button size="sm">
          <Calendar className="h-4 w-4 mr-1" />
          Book Consultation
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Service> = {
  title: 'Abstracts/Service',
  component: Service,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Service represents a service-based offering. Services have a marketing Site and a client portal App.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    name: 'TechConsult Pro',
    tagline: 'Expert technology consulting',
    description: 'Strategic technology consulting to help your business modernize, scale, and innovate.',
    type: 'consulting',
    pricing: 'From $200/hr',
    availability: 'available',
    site: {
      pages: ['/', '/services', '/case-studies', '/team', '/contact'],
    },
    app: {
      views: ['projects', 'documents', 'meetings', 'invoices'],
    },
  },
}

export const Development: Story = {
  args: {
    name: 'CodeCraft Studio',
    tagline: 'Custom software development',
    description: 'Full-stack development services for web, mobile, and cloud applications.',
    type: 'development',
    pricing: 'Project-based',
    availability: 'limited',
    site: {
      pages: ['/', '/portfolio', '/tech-stack', '/process', '/contact'],
    },
    app: {
      views: ['projects', 'sprints', 'demos', 'feedback'],
    },
  },
}

export const Training: Story = {
  args: {
    name: 'LearnPath Academy',
    tagline: 'Professional training & workshops',
    description: 'Expert-led training programs for teams looking to upskill in modern technologies.',
    type: 'training',
    pricing: 'From $500/person',
    availability: 'available',
    site: {
      pages: ['/', '/courses', '/workshops', '/corporate', '/schedule'],
    },
    app: {
      views: ['courses', 'progress', 'certificates', 'community'],
    },
  },
}

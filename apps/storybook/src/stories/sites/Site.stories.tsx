import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Globe, FileText, Layout, Palette, ExternalLink } from 'lucide-react'

// Page component
const PagePreview = ({ path, title, sections }: { path: string, title: string, sections: string[] }) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center justify-between mb-2">
      <code className="text-xs bg-muted px-2 py-1 rounded">{path}</code>
      <span className="text-xs text-muted-foreground">{sections.length} sections</span>
    </div>
    <div className="font-medium text-sm">{title}</div>
    <div className="flex flex-wrap gap-1 mt-2">
      {sections.map(section => (
        <Badge key={section} variant="outline" className="text-xs">{section}</Badge>
      ))}
    </div>
  </div>
)

// Conceptual Site component
const Site = ({
  domain,
  name,
  description,
  theme,
  layout,
  pages,
}: {
  domain: string
  name: string
  description: string
  theme: 'light' | 'dark' | 'system'
  layout: string
  pages: Array<{ path: string, title: string, sections: string[] }>
}) => (
  <Card className="w-[550px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center">
          <Globe className="h-7 w-7 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>{name}</CardTitle>
            <Badge variant="secondary">{theme}</Badge>
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Domain and layout info */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span>{domain}</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <Layout className="h-4 w-4" />
          <span>{layout} layout</span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>{pages.length} pages</span>
        </div>
      </div>

      {/* Site structure visualization */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">SITE STRUCTURE</div>
        <div className="font-mono text-sm space-y-1">
          <div className="text-primary">Site</div>
          <div className="ml-4">├── Layout <span className="text-muted-foreground">({layout})</span></div>
          <div className="ml-4">└── Pages</div>
          {pages.map((page, i) => (
            <div key={page.path} className="ml-8">
              {i === pages.length - 1 ? '└──' : '├──'} {page.path} <span className="text-muted-foreground">→ {page.sections.length} sections</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pages */}
      <div>
        <h4 className="text-sm font-medium mb-2">Pages</h4>
        <div className="space-y-2">
          {pages.map(page => (
            <PagePreview key={page.path} {...page} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">
          <Palette className="h-4 w-4 mr-1" />
          Theme
        </Button>
        <Button size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          Preview Site
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Site> = {
  title: 'Containers/Site',
  component: Site,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A Site is a content-driven container. Sites contain Pages, which contain Sections, which contain Blocks. Sites are for marketing, docs, and content.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    domain: 'example.com',
    name: 'Example Site',
    description: 'A modern marketing website',
    theme: 'light',
    layout: 'Marketing',
    pages: [
      { path: '/', title: 'Home', sections: ['Hero', 'Features', 'Testimonials', 'CTA'] },
      { path: '/pricing', title: 'Pricing', sections: ['Hero', 'Plans', 'FAQ', 'CTA'] },
      { path: '/about', title: 'About', sections: ['Hero', 'Story', 'Team', 'Values'] },
      { path: '/blog', title: 'Blog', sections: ['Hero', 'Posts', 'Newsletter'] },
    ],
  },
}

export const DocumentationSite: Story = {
  args: {
    domain: 'docs.example.com',
    name: 'Documentation',
    description: 'Technical documentation and guides',
    theme: 'system',
    layout: 'Docs',
    pages: [
      { path: '/', title: 'Getting Started', sections: ['Hero', 'Quickstart', 'NextSteps'] },
      { path: '/guides', title: 'Guides', sections: ['Overview', 'Tutorials'] },
      { path: '/api', title: 'API Reference', sections: ['Endpoints', 'Types'] },
      { path: '/examples', title: 'Examples', sections: ['Gallery', 'CodeSamples'] },
    ],
  },
}

export const BlogSite: Story = {
  args: {
    domain: 'blog.example.com',
    name: 'Engineering Blog',
    description: 'Technical articles and updates',
    theme: 'dark',
    layout: 'Blog',
    pages: [
      { path: '/', title: 'Latest Posts', sections: ['Featured', 'Recent', 'Categories'] },
      { path: '/post/[slug]', title: 'Post', sections: ['Header', 'Content', 'Author', 'Related'] },
      { path: '/authors', title: 'Authors', sections: ['Grid', 'Bio'] },
    ],
  },
}

export const LandingPage: Story = {
  args: {
    domain: 'launch.example.com',
    name: 'Product Launch',
    description: 'Single-page product landing',
    theme: 'dark',
    layout: 'Landing',
    pages: [
      { path: '/', title: 'Launch', sections: ['Hero', 'Demo', 'Features', 'Pricing', 'FAQ', 'CTA'] },
    ],
  },
}

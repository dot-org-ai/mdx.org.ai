import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Globe, FileText, DollarSign, Users, Book, MessageSquare, ExternalLink } from 'lucide-react'

// Page preview
const PagePreview = ({
  path,
  title,
  sections,
  icon: Icon
}: {
  path: string
  title: string
  sections: string[]
  icon: React.ElementType
}) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="font-medium text-sm">{title}</span>
      <code className="text-xs bg-muted px-1.5 py-0.5 rounded ml-auto">{path}</code>
    </div>
    <div className="flex flex-wrap gap-1">
      {sections.map(section => (
        <Badge key={section} variant="outline" className="text-[10px]">{section}</Badge>
      ))}
    </div>
  </div>
)

// SaaSSite component
const SaaSSite = ({
  domain,
  product,
  pages,
  features,
  pricing,
}: {
  domain: string
  product: {
    name: string
    tagline: string
    category: string
  }
  pages: Array<{
    path: string
    title: string
    sections: string[]
    icon: 'home' | 'pricing' | 'features' | 'about' | 'docs' | 'blog'
  }>
  features: string[]
  pricing: {
    model: 'subscription' | 'usage' | 'freemium'
    starting: number
    plans: number
  }
}) => {
  const iconMap = {
    home: Globe,
    pricing: DollarSign,
    features: FileText,
    about: Users,
    docs: Book,
    blog: MessageSquare,
  }

  return (
    <Card className="w-[600px]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <Globe className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>SaaS Site</CardTitle>
              <Badge>{pricing.model}</Badge>
            </div>
            <CardDescription>Full marketing site for SaaS products</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div>
            <div className="font-semibold">{product.name}</div>
            <div className="text-sm text-muted-foreground">{product.tagline}</div>
          </div>
          <Badge variant="secondary">{product.category}</Badge>
        </div>

        {/* Domain & pricing */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>{domain}</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <DollarSign className="h-4 w-4" />
            <span>From ${pricing.starting}/mo</span>
          </div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span>{pricing.plans} plans</span>
          </div>
        </div>

        {/* Site structure */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">SITE ARCHITECTURE</div>
          <div className="font-mono text-sm space-y-1">
            <div className="text-primary">SaaSSite</div>
            <div className="ml-4">├── Layout (Header, Footer, Nav)</div>
            <div className="ml-4">└── Pages</div>
            {pages.map((page, i) => (
              <div key={page.path} className="ml-8">
                {i === pages.length - 1 ? '└──' : '├──'} {page.path}
                <span className="text-muted-foreground"> → {page.sections.length} sections</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pages */}
        <div>
          <h4 className="text-sm font-medium mb-3">Pages</h4>
          <div className="space-y-2">
            {pages.map(page => (
              <PagePreview
                key={page.path}
                {...page}
                icon={iconMap[page.icon]}
              />
            ))}
          </div>
        </div>

        {/* Key features */}
        <div>
          <h4 className="text-sm font-medium mb-2">Key Features Highlighted</h4>
          <div className="flex flex-wrap gap-1">
            {features.map(feature => (
              <Badge key={feature} variant="secondary" className="text-xs">{feature}</Badge>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm">Edit Pages</Button>
          <Button size="sm">
            <ExternalLink className="h-4 w-4 mr-1" />
            Preview Site
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

const meta: Meta<typeof SaaSSite> = {
  title: 'Sites/SaaSSite',
  component: SaaSSite,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A SaaSSite is a complete marketing website for SaaS products, including Home, Pricing, Features, About, Docs, and Blog pages.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const DeveloperTools: Story = {
  args: {
    domain: 'devtools.io',
    product: {
      name: 'DevTools Pro',
      tagline: 'The complete developer toolkit',
      category: 'Developer Tools',
    },
    pages: [
      { path: '/', title: 'Home', icon: 'home', sections: ['Hero', 'Logos', 'Features', 'HowItWorks', 'Testimonials', 'CTA'] },
      { path: '/pricing', title: 'Pricing', icon: 'pricing', sections: ['PricingHero', 'Plans', 'Compare', 'FAQ', 'Enterprise'] },
      { path: '/features', title: 'Features', icon: 'features', sections: ['FeatureHero', 'FeatureList', 'Integrations', 'Security'] },
      { path: '/about', title: 'About', icon: 'about', sections: ['Story', 'Mission', 'Team', 'Values', 'Investors'] },
      { path: '/docs', title: 'Documentation', icon: 'docs', sections: ['Quickstart', 'Guides', 'API', 'Examples'] },
      { path: '/blog', title: 'Blog', icon: 'blog', sections: ['Featured', 'Recent', 'Categories', 'Newsletter'] },
    ],
    features: ['AI Autocomplete', 'Real-time Collab', 'Git Integration', 'Cloud Deploy', 'Analytics'],
    pricing: { model: 'subscription', starting: 19, plans: 4 },
  },
}

export const MarketingPlatform: Story = {
  args: {
    domain: 'marketflow.com',
    product: {
      name: 'MarketFlow',
      tagline: 'AI-powered marketing automation',
      category: 'Marketing',
    },
    pages: [
      { path: '/', title: 'Home', icon: 'home', sections: ['Hero', 'Stats', 'UseCases', 'Features', 'ROI', 'CTA'] },
      { path: '/pricing', title: 'Pricing', icon: 'pricing', sections: ['Calculator', 'Plans', 'FAQ'] },
      { path: '/features', title: 'Features', icon: 'features', sections: ['AIWriter', 'Analytics', 'Automation', 'ABTesting'] },
      { path: '/customers', title: 'Customers', icon: 'about', sections: ['CaseStudies', 'Testimonials', 'Logos'] },
      { path: '/resources', title: 'Resources', icon: 'docs', sections: ['Blog', 'Guides', 'Webinars', 'Templates'] },
    ],
    features: ['AI Copywriting', 'A/B Testing', 'Email Automation', 'Analytics', 'CRM Integration'],
    pricing: { model: 'usage', starting: 49, plans: 3 },
  },
}

export const AnalyticsSaaS: Story = {
  args: {
    domain: 'insightful.ai',
    product: {
      name: 'Insightful',
      tagline: 'Turn data into decisions',
      category: 'Analytics',
    },
    pages: [
      { path: '/', title: 'Home', icon: 'home', sections: ['Hero', 'Demo', 'Integrations', 'Features', 'Security', 'CTA'] },
      { path: '/pricing', title: 'Pricing', icon: 'pricing', sections: ['Plans', 'DataVolume', 'Enterprise'] },
      { path: '/solutions', title: 'Solutions', icon: 'features', sections: ['ByIndustry', 'ByRole', 'ByUseCase'] },
      { path: '/integrations', title: 'Integrations', icon: 'docs', sections: ['Categories', 'AllIntegrations', 'API'] },
      { path: '/security', title: 'Security', icon: 'about', sections: ['Compliance', 'DataHandling', 'SOC2'] },
    ],
    features: ['Real-time Dashboards', 'SQL Editor', 'AI Insights', 'Embedded Analytics', 'White-label'],
    pricing: { model: 'freemium', starting: 0, plans: 4 },
  },
}

export const CollaborationTool: Story = {
  args: {
    domain: 'teamspace.co',
    product: {
      name: 'TeamSpace',
      tagline: 'Where teams do their best work',
      category: 'Collaboration',
    },
    pages: [
      { path: '/', title: 'Home', icon: 'home', sections: ['Hero', 'Video', 'Features', 'Teams', 'Testimonials'] },
      { path: '/pricing', title: 'Pricing', icon: 'pricing', sections: ['PerSeat', 'Plans', 'Compare', 'Enterprise'] },
      { path: '/product', title: 'Product', icon: 'features', sections: ['Docs', 'Projects', 'Chat', 'Video', 'Whiteboard'] },
      { path: '/templates', title: 'Templates', icon: 'docs', sections: ['Categories', 'Gallery', 'Community'] },
      { path: '/enterprise', title: 'Enterprise', icon: 'about', sections: ['Security', 'Admin', 'SSO', 'API', 'Support'] },
    ],
    features: ['Real-time Docs', 'Project Management', 'Video Calls', 'Whiteboard', 'AI Assistant'],
    pricing: { model: 'subscription', starting: 8, plans: 3 },
  },
}

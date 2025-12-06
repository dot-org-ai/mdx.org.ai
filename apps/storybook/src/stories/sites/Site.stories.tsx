import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Globe, Package, Building2, Bot, Briefcase, Layers, BookOpen, ShoppingBag, FolderKanban, Clock, ExternalLink, Sparkles } from 'lucide-react'

// Props display
const PropsDisplay = ({ props }: { props: Record<string, string | boolean> }) => (
  <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg">
    <span className="text-purple-400">{'<Site'}</span>
    {Object.entries(props).map(([key, value]) => (
      <div key={key} className="ml-4">
        <span className="text-cyan-400">{key}</span>
        <span className="text-slate-500">=</span>
        {typeof value === 'boolean' ? (
          <span className="text-orange-400">{`{${value}}`}</span>
        ) : (
          <span className="text-green-400">{`{${value}}`}</span>
        )}
      </div>
    ))}
    <span className="text-purple-400">{'/>'}</span>
  </div>
)

// Page structure preview
const PagePreview = ({ path, sections }: { path: string, sections: string[] }) => (
  <div className="flex items-center gap-2 text-xs">
    <code className="bg-muted px-1.5 py-0.5 rounded">{path}</code>
    <span className="text-muted-foreground">→</span>
    <div className="flex gap-1">
      {sections.map(s => (
        <Badge key={s} variant="outline" className="text-[10px]">{s}</Badge>
      ))}
    </div>
  </div>
)

// Site component showing props-based rendering
const Site = ({
  // Core props that define the site type
  siteProps,
  // Display info
  displayName,
  description,
  icon: Icon,
  color,
  // Structure
  pages,
  subsites,
  // Context
  hasContext,
}: {
  siteProps: Record<string, string | boolean>
  displayName: string
  description: string
  icon: React.ElementType
  color: string
  pages: Array<{ path: string, sections: string[] }>
  subsites?: string[]
  hasContext?: boolean
}) => (
  <Card className="w-[600px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center`}>
          <Icon className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Site</CardTitle>
            <Badge>{displayName}</Badge>
            {hasContext && (
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                AI Context
              </Badge>
            )}
          </div>
          <CardDescription>{description}</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Props that define this site */}
      <div>
        <div className="text-xs font-medium text-muted-foreground mb-2">PROPS DEFINE THE SHAPE</div>
        <PropsDisplay props={siteProps} />
      </div>

      {/* Generated structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">GENERATED STRUCTURE</div>
        <div className="space-y-2">
          {pages.map(page => (
            <PagePreview key={page.path} {...page} />
          ))}
          {subsites && subsites.length > 0 && (
            <>
              <div className="text-xs text-muted-foreground mt-3 mb-1">Subsites:</div>
              {subsites.map(sub => (
                <div key={sub} className="flex items-center gap-2 text-xs ml-4">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  <code className="bg-muted px-1.5 py-0.5 rounded">{sub}</code>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Context preview if applicable */}
      {hasContext && (
        <div className="border border-dashed rounded-lg p-3">
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            CONTEXT FOR AI GENERATION
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>• StoryBrand framework for copywriting</div>
            <div>• LeanCanvas for value propositions</div>
            <div>• BrandVoice for tone consistency</div>
            <div>• TargetPersona for audience targeting</div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Edit Props</Button>
        <Button size="sm">
          <ExternalLink className="h-4 w-4 mr-1" />
          Preview
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Site> = {
  title: 'Sites/Site',
  component: Site,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Site is a props-driven container. The props you pass determine what kind of site gets rendered. Pass `product` for a product site, `business` for a company site, `agent` for an AI agent site, etc.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const ProductSite: Story = {
  args: {
    siteProps: {
      product: 'widget',
      domain: '"widget.com"',
    },
    displayName: 'Product',
    description: 'Single product marketing site',
    icon: Package,
    color: 'from-blue-500 to-cyan-500',
    pages: [
      { path: '/', sections: ['Hero', 'Features', 'HowItWorks', 'Testimonials', 'CTA'] },
      { path: '/features', sections: ['FeatureHero', 'FeatureList', 'Comparison'] },
      { path: '/pricing', sections: ['PricingHero', 'Plans', 'FAQ'] },
    ],
    hasContext: true,
  },
}

export const ProductWithDocs: Story = {
  args: {
    siteProps: {
      product: 'widget',
      api: 'widgetAPI',
      sdk: 'widgetSDK',
      domain: '"widget.com"',
    },
    displayName: 'Product + Docs',
    description: 'Product site with API documentation',
    icon: BookOpen,
    color: 'from-violet-500 to-purple-600',
    pages: [
      { path: '/', sections: ['Hero', 'Features', 'CTA'] },
      { path: '/pricing', sections: ['Plans', 'FAQ'] },
    ],
    subsites: ['/docs (API Reference)', '/sdk (SDK Guide)'],
    hasContext: true,
  },
}

export const BusinessSite: Story = {
  args: {
    siteProps: {
      business: 'acme',
      domain: '"acme.inc"',
    },
    displayName: 'Business',
    description: 'Company/organization marketing site',
    icon: Building2,
    color: 'from-slate-600 to-slate-800',
    pages: [
      { path: '/', sections: ['Hero', 'Stats', 'Services', 'Testimonials'] },
      { path: '/about', sections: ['Story', 'Mission', 'Team', 'Values'] },
      { path: '/contact', sections: ['ContactForm', 'Locations'] },
    ],
    hasContext: true,
  },
}

export const BusinessWithProducts: Story = {
  args: {
    siteProps: {
      business: 'acme',
      products: '[widget, analytics, api]',
      services: '[consulting]',
      domain: '"acme.inc"',
    },
    displayName: 'Business + Portfolio',
    description: 'Company site with multiple products and services',
    icon: Layers,
    color: 'from-indigo-500 to-blue-600',
    pages: [
      { path: '/', sections: ['Hero', 'Products', 'Services', 'Testimonials'] },
      { path: '/about', sections: ['Story', 'Team'] },
      { path: '/pricing', sections: ['AllPlans', 'Compare'] },
    ],
    subsites: ['/widget (Product)', '/analytics (Product)', '/consulting (Service)'],
    hasContext: true,
  },
}

export const AgentSite: Story = {
  args: {
    siteProps: {
      agent: 'claude',
      domain: '"claude.ai"',
    },
    displayName: 'Agent',
    description: 'AI agent marketing site',
    icon: Bot,
    color: 'from-emerald-500 to-teal-600',
    pages: [
      { path: '/', sections: ['Hero', 'Capabilities', 'Demo', 'UseCases'] },
      { path: '/capabilities', sections: ['CapabilityList', 'Examples'] },
      { path: '/pricing', sections: ['UsagePlans', 'Enterprise'] },
    ],
    hasContext: true,
  },
}

export const ServiceSite: Story = {
  args: {
    siteProps: {
      service: 'consulting',
      domain: '"consulting.acme.inc"',
    },
    displayName: 'Service',
    description: 'Service/consulting marketing site',
    icon: Briefcase,
    color: 'from-amber-500 to-orange-600',
    pages: [
      { path: '/', sections: ['Hero', 'Services', 'Process', 'CaseStudies'] },
      { path: '/services', sections: ['ServiceList', 'Pricing'] },
      { path: '/contact', sections: ['BookCall', 'ContactForm'] },
    ],
    hasContext: true,
  },
}

export const DirectorySite: Story = {
  args: {
    siteProps: {
      listings: 'tools',
      domain: '"aitools.directory"',
    },
    displayName: 'Directory',
    description: 'Searchable listings directory',
    icon: FolderKanban,
    color: 'from-green-500 to-emerald-600',
    pages: [
      { path: '/', sections: ['SearchHero', 'FeaturedListings', 'Categories'] },
      { path: '/[category]', sections: ['CategoryHeader', 'ListingGrid', 'Filters'] },
      { path: '/[slug]', sections: ['ListingDetail', 'Reviews', 'Related'] },
    ],
  },
}

export const MarketplaceSite: Story = {
  args: {
    siteProps: {
      marketplace: 'sellers',
      domain: '"market.example.com"',
    },
    displayName: 'Marketplace',
    description: 'Multi-vendor commerce platform',
    icon: ShoppingBag,
    color: 'from-pink-500 to-rose-600',
    pages: [
      { path: '/', sections: ['Hero', 'FeaturedProducts', 'Categories', 'TopSellers'] },
      { path: '/products', sections: ['ProductGrid', 'Filters', 'Sort'] },
      { path: '/product/[id]', sections: ['ProductDetail', 'SellerInfo', 'Reviews'] },
      { path: '/sell', sections: ['SellerBenefits', 'SellerSignup'] },
    ],
  },
}

export const WaitlistSite: Story = {
  args: {
    siteProps: {
      waitlist: 'config',
      domain: '"beta.widget.com"',
    },
    displayName: 'Waitlist',
    description: 'Pre-launch email capture',
    icon: Clock,
    color: 'from-orange-500 to-red-600',
    pages: [
      { path: '/', sections: ['Hero', 'Countdown', 'ValueProp', 'EmailCapture', 'Teaser'] },
    ],
    hasContext: true,
  },
}

export const PortfolioSite: Story = {
  args: {
    siteProps: {
      portfolio: 'projects',
      domain: '"jane.dev"',
    },
    displayName: 'Portfolio',
    description: 'Personal/creative portfolio',
    icon: FolderKanban,
    color: 'from-purple-500 to-pink-600',
    pages: [
      { path: '/', sections: ['Hero', 'FeaturedWork', 'Skills', 'About'] },
      { path: '/work', sections: ['ProjectGrid', 'Filters'] },
      { path: '/work/[slug]', sections: ['ProjectDetail', 'Gallery', 'Tech'] },
      { path: '/contact', sections: ['ContactForm', 'Availability'] },
    ],
  },
}

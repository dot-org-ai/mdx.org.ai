import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Globe, Zap, ArrowRight, Play } from 'lucide-react'

// Section preview
const SectionPreview = ({ name, variant }: { name: string, variant?: string }) => (
  <div className="flex items-center gap-2 px-2 py-1 bg-muted/50 rounded text-xs">
    <span className="font-medium">{name}</span>
    {variant && <Badge variant="outline" className="text-[10px]">{variant}</Badge>}
  </div>
)

// LandingPage component
const LandingPage = ({
  domain,
  headline,
  subheadline,
  cta,
  sections,
  theme,
  conversionGoal,
}: {
  domain: string
  headline: string
  subheadline: string
  cta: { primary: string, secondary?: string }
  sections: Array<{ name: string, variant?: string }>
  theme: 'light' | 'dark'
  conversionGoal: string
}) => (
  <Card className="w-[550px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Zap className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Landing Page</CardTitle>
            <Badge>{theme}</Badge>
          </div>
          <CardDescription>Single-page conversion site</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Domain */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>{domain}</span>
      </div>

      {/* Hero preview */}
      <div className="border rounded-lg overflow-hidden">
        <div className={`p-6 ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white'}`}>
          <h2 className="text-xl font-bold mb-1">{headline}</h2>
          <p className="text-sm text-muted-foreground mb-4">{subheadline}</p>
          <div className="flex gap-2">
            <Button size="sm">{cta.primary}</Button>
            {cta.secondary && (
              <Button size="sm" variant="outline">
                <Play className="h-3 w-3 mr-1" />
                {cta.secondary}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Page structure */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-xs font-medium text-muted-foreground mb-3">PAGE STRUCTURE</div>
        <div className="font-mono text-sm space-y-1">
          <div className="text-primary">LandingPage</div>
          <div className="ml-4">└── Sections (scroll)</div>
          {sections.map((section, i) => (
            <div key={section.name} className="ml-8 flex items-center gap-2">
              <span className="text-muted-foreground">{i === sections.length - 1 ? '└──' : '├──'}</span>
              <SectionPreview {...section} />
            </div>
          ))}
        </div>
      </div>

      {/* Conversion goal */}
      <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
        <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
          <ArrowRight className="h-4 w-4 text-green-600" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Conversion Goal</div>
          <div className="text-sm font-medium">{conversionGoal}</div>
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Edit Sections</Button>
        <Button size="sm">Preview</Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof LandingPage> = {
  title: 'Sites/LandingPage',
  component: LandingPage,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A LandingPage is a single-page, conversion-focused site for launches, features, or campaigns. All content scrolls vertically with a clear call-to-action.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const ProductLaunch: Story = {
  args: {
    domain: 'launch.acme.com',
    headline: 'Ship 10x Faster with AI',
    subheadline: 'The AI-powered development platform that writes, tests, and deploys your code.',
    cta: { primary: 'Start Free Trial', secondary: 'Watch Demo' },
    theme: 'dark',
    conversionGoal: 'Free trial signup',
    sections: [
      { name: 'Hero', variant: 'centered' },
      { name: 'Logos', variant: 'scroll' },
      { name: 'Features', variant: 'bento' },
      { name: 'Demo', variant: 'video' },
      { name: 'Testimonials', variant: 'carousel' },
      { name: 'Pricing', variant: 'cards' },
      { name: 'FAQ', variant: 'accordion' },
      { name: 'CTA', variant: 'banner' },
    ],
  },
}

export const FeatureAnnouncement: Story = {
  args: {
    domain: 'new.acme.com/ai-features',
    headline: 'Introducing AI Code Review',
    subheadline: 'Get instant feedback on every pull request with our new AI-powered code review.',
    cta: { primary: 'Enable Now', secondary: 'Learn More' },
    theme: 'light',
    conversionGoal: 'Feature activation',
    sections: [
      { name: 'Hero', variant: 'split' },
      { name: 'Before/After', variant: 'comparison' },
      { name: 'Features', variant: 'list' },
      { name: 'HowItWorks', variant: 'steps' },
      { name: 'CTA', variant: 'inline' },
    ],
  },
}

export const EventRegistration: Story = {
  args: {
    domain: 'conference.acme.com',
    headline: 'AI Dev Summit 2025',
    subheadline: 'Join 5,000+ developers for the largest AI development conference.',
    cta: { primary: 'Register Now', secondary: 'View Schedule' },
    theme: 'dark',
    conversionGoal: 'Event registration',
    sections: [
      { name: 'Hero', variant: 'video-bg' },
      { name: 'Speakers', variant: 'grid' },
      { name: 'Schedule', variant: 'timeline' },
      { name: 'Sponsors', variant: 'logos' },
      { name: 'Pricing', variant: 'tickets' },
      { name: 'Venue', variant: 'map' },
      { name: 'FAQ' },
      { name: 'CTA', variant: 'sticky' },
    ],
  },
}

export const AppDownload: Story = {
  args: {
    domain: 'app.acme.com',
    headline: 'Your AI Copilot, Everywhere',
    subheadline: 'Available on Mac, Windows, iOS, and Android.',
    cta: { primary: 'Download Free' },
    theme: 'light',
    conversionGoal: 'App download',
    sections: [
      { name: 'Hero', variant: 'app-showcase' },
      { name: 'Platforms', variant: 'icons' },
      { name: 'Screenshots', variant: 'gallery' },
      { name: 'Features', variant: 'grid' },
      { name: 'Reviews', variant: 'app-store' },
      { name: 'Download', variant: 'platforms' },
    ],
  },
}

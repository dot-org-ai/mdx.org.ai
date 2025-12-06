import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Sparkles, Target, Lightbulb, MessageSquare, Users, Swords, FileCode } from 'lucide-react'

// Context section display
const ContextSection = ({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) => (
  <div className="border rounded-lg p-3">
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{title}</span>
    </div>
    <div className="text-xs text-muted-foreground space-y-1">
      {children}
    </div>
  </div>
)

// Context component
const Context = ({
  storyBrand,
  leanCanvas,
  brandVoice,
  targetPersona,
  competitors,
}: {
  storyBrand?: {
    hero: { persona: string, desire: string }
    problem: { external: string, internal: string, philosophical: string }
    guide: { empathy: string, authority: string }
    plan: string[]
    callToAction: { direct: string, transitional: string }
  }
  leanCanvas?: {
    problem: string[]
    solution: string[]
    uniqueValue: string
    channels: string[]
    customerSegments: string[]
  }
  brandVoice?: {
    tone: string
    style: string
    avoid: string[]
    examples: string[]
  }
  targetPersona?: {
    role: string
    company: string
    goals: string[]
    painPoints: string[]
    objections: string[]
  }
  competitors?: Array<{
    name: string
    positioning: string
    pricing: string
    weakness: string
  }>
}) => (
  <Card className="w-[700px]">
    <CardHeader>
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle>Context Props</CardTitle>
            <Badge variant="outline">AI Generation</Badge>
          </div>
          <CardDescription>Strategic context passed to ai-props for content generation</CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      {/* Explanation */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="text-sm mb-2">
          The <code className="bg-muted px-1 rounded">context</code> prop provides strategic information for AI-powered content generation.
          This data is <strong>never rendered directly</strong> — it's used as system prompt context when generating copy, headlines, and content.
        </div>
        <div className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg">
          <span className="text-purple-400">{'<Site'}</span>
          <div className="ml-4">
            <span className="text-cyan-400">product</span>
            <span className="text-slate-500">=</span>
            <span className="text-green-400">{'{widget}'}</span>
          </div>
          <div className="ml-4">
            <span className="text-cyan-400">context</span>
            <span className="text-slate-500">=</span>
            <span className="text-green-400">{'{{'}</span>
          </div>
          <div className="ml-8 text-slate-500">storyBrand, leanCanvas, brandVoice, ...</div>
          <div className="ml-4">
            <span className="text-green-400">{'}}'}</span>
          </div>
          <span className="text-purple-400">{'>'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* StoryBrand */}
        {storyBrand && (
          <ContextSection title="StoryBrand Framework" icon={Target}>
            <div><strong>Hero:</strong> {storyBrand.hero.persona}</div>
            <div><strong>Desire:</strong> {storyBrand.hero.desire}</div>
            <div className="mt-2"><strong>Problem:</strong></div>
            <div className="ml-2">• External: {storyBrand.problem.external}</div>
            <div className="ml-2">• Internal: {storyBrand.problem.internal}</div>
            <div className="ml-2">• Philosophical: {storyBrand.problem.philosophical}</div>
            <div className="mt-2"><strong>Guide:</strong></div>
            <div className="ml-2">• Empathy: {storyBrand.guide.empathy}</div>
            <div className="ml-2">• Authority: {storyBrand.guide.authority}</div>
            <div className="mt-2"><strong>Plan:</strong> {storyBrand.plan.join(' → ')}</div>
            <div className="mt-2"><strong>CTA:</strong></div>
            <div className="ml-2">• Direct: {storyBrand.callToAction.direct}</div>
            <div className="ml-2">• Transitional: {storyBrand.callToAction.transitional}</div>
          </ContextSection>
        )}

        {/* Lean Canvas */}
        {leanCanvas && (
          <ContextSection title="Lean Canvas" icon={Lightbulb}>
            <div><strong>Problems:</strong></div>
            {leanCanvas.problem.map((p, i) => (
              <div key={i} className="ml-2">• {p}</div>
            ))}
            <div className="mt-2"><strong>Solutions:</strong></div>
            {leanCanvas.solution.map((s, i) => (
              <div key={i} className="ml-2">• {s}</div>
            ))}
            <div className="mt-2"><strong>Unique Value:</strong> {leanCanvas.uniqueValue}</div>
            <div className="mt-2"><strong>Channels:</strong> {leanCanvas.channels.join(', ')}</div>
            <div className="mt-2"><strong>Segments:</strong> {leanCanvas.customerSegments.join(', ')}</div>
          </ContextSection>
        )}

        {/* Brand Voice */}
        {brandVoice && (
          <ContextSection title="Brand Voice" icon={MessageSquare}>
            <div><strong>Tone:</strong> {brandVoice.tone}</div>
            <div><strong>Style:</strong> {brandVoice.style}</div>
            <div className="mt-2"><strong>Avoid:</strong></div>
            {brandVoice.avoid.map((a, i) => (
              <div key={i} className="ml-2">• {a}</div>
            ))}
            <div className="mt-2"><strong>Examples:</strong></div>
            {brandVoice.examples.map((e, i) => (
              <div key={i} className="ml-2 italic">"{e}"</div>
            ))}
          </ContextSection>
        )}

        {/* Target Persona */}
        {targetPersona && (
          <ContextSection title="Target Persona" icon={Users}>
            <div><strong>Role:</strong> {targetPersona.role}</div>
            <div><strong>Company:</strong> {targetPersona.company}</div>
            <div className="mt-2"><strong>Goals:</strong></div>
            {targetPersona.goals.map((g, i) => (
              <div key={i} className="ml-2">• {g}</div>
            ))}
            <div className="mt-2"><strong>Pain Points:</strong></div>
            {targetPersona.painPoints.map((p, i) => (
              <div key={i} className="ml-2">• {p}</div>
            ))}
            <div className="mt-2"><strong>Objections:</strong></div>
            {targetPersona.objections.map((o, i) => (
              <div key={i} className="ml-2">• {o}</div>
            ))}
          </ContextSection>
        )}
      </div>

      {/* Competitors */}
      {competitors && competitors.length > 0 && (
        <ContextSection title="Competitive Analysis" icon={Swords}>
          <div className="grid grid-cols-2 gap-2 mt-2">
            {competitors.map((c, i) => (
              <div key={i} className="bg-muted/50 rounded p-2">
                <div className="font-medium">{c.name}</div>
                <div><strong>Positioning:</strong> {c.positioning}</div>
                <div><strong>Pricing:</strong> {c.pricing}</div>
                <div><strong>Weakness:</strong> {c.weakness}</div>
              </div>
            ))}
          </div>
        </ContextSection>
      )}

      {/* Usage in MDX */}
      <div className="bg-muted/50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">MDX Frontmatter</span>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          In MDX files, anything not in the schema becomes context automatically:
        </div>
        <pre className="font-mono text-xs bg-slate-900 text-slate-300 p-3 rounded-lg overflow-x-auto">
{`---
$type: Site
title: Widget Pro
product: widget-pro

# All of this becomes context
storyBrand:
  hero:
    persona: Busy developer
    desire: Ship faster
  problem:
    external: Slow deploys

brandVoice:
  tone: confident
  style: concise
---

<Hero />  {/* AI uses context to generate copy */}`}
        </pre>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" size="sm">Edit Context</Button>
        <Button size="sm">
          <Sparkles className="h-4 w-4 mr-1" />
          Generate Content
        </Button>
      </div>
    </CardContent>
  </Card>
)

const meta: Meta<typeof Context> = {
  title: 'Sites/Context',
  component: Context,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Context props provide strategic information for AI-powered content generation. This data flows to ai-props as system prompt context but is never rendered directly.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const FullContext: Story = {
  args: {
    storyBrand: {
      hero: {
        persona: 'Busy developer who wants to ship features faster',
        desire: 'Deploy without anxiety or late nights',
      },
      problem: {
        external: 'Deployments are slow and error-prone',
        internal: 'Feels anxious before every deploy',
        philosophical: 'Developers should build, not babysit infrastructure',
      },
      guide: {
        empathy: 'We\'ve been there - 3am deploys, rollback panic',
        authority: 'Trusted by 10,000+ engineering teams',
      },
      plan: ['Connect your repo', 'Configure your stack', 'Deploy with confidence'],
      callToAction: {
        direct: 'Start Free Trial',
        transitional: 'Watch 2-min Demo',
      },
    },
    leanCanvas: {
      problem: ['Manual deployments waste time', 'CI/CD is complex to set up', 'Rollbacks are scary'],
      solution: ['One-click deploys', 'Zero-config setup', 'Instant rollbacks'],
      uniqueValue: 'Deploy 10x faster with zero configuration',
      channels: ['Developer communities', 'Technical blogs', 'GitHub'],
      customerSegments: ['Startups', 'Scale-ups', 'Enterprise DevOps'],
    },
    brandVoice: {
      tone: 'confident',
      style: 'concise and technical',
      avoid: ['buzzwords', 'jargon', 'hype'],
      examples: ['Ship faster, sleep better', 'Deploy in seconds, not hours'],
    },
    targetPersona: {
      role: 'Senior Software Engineer',
      company: 'Series A-C startup',
      goals: ['Ship features faster', 'Reduce deployment anxiety', 'Focus on building'],
      painPoints: ['Wasted time on DevOps', 'Fear of breaking production', 'Context switching'],
      objections: ['We already have CI/CD', 'Vendor lock-in concerns', 'Security/compliance'],
    },
    competitors: [
      {
        name: 'Vercel',
        positioning: 'Frontend-focused',
        pricing: '$20/seat/mo',
        weakness: 'Limited backend support',
      },
      {
        name: 'Railway',
        positioning: 'Simple PaaS',
        pricing: 'Usage-based',
        weakness: 'Limited enterprise features',
      },
    ],
  },
}

export const StoryBrandOnly: Story = {
  args: {
    storyBrand: {
      hero: {
        persona: 'Marketing manager overwhelmed by content demands',
        desire: 'Create high-quality content 10x faster',
      },
      problem: {
        external: 'Can\'t keep up with content calendar',
        internal: 'Feels like they\'re always behind',
        philosophical: 'Great marketing shouldn\'t require an army',
      },
      guide: {
        empathy: 'We know the pressure of shipping daily',
        authority: 'Powers content for 5,000+ brands',
      },
      plan: ['Describe your content', 'AI generates draft', 'Edit and publish'],
      callToAction: {
        direct: 'Try Free',
        transitional: 'See Examples',
      },
    },
  },
}

export const PersonaFocused: Story = {
  args: {
    targetPersona: {
      role: 'VP of Engineering',
      company: 'Fortune 500',
      goals: ['Reduce infrastructure costs', 'Improve developer velocity', 'Ensure compliance'],
      painPoints: ['Legacy systems', 'Talent retention', 'Security requirements'],
      objections: ['Enterprise support?', 'On-prem options?', 'SOC 2 compliance?'],
    },
    competitors: [
      {
        name: 'AWS',
        positioning: 'Full cloud platform',
        pricing: 'Complex usage-based',
        weakness: 'Complexity, lock-in',
      },
      {
        name: 'Azure',
        positioning: 'Microsoft ecosystem',
        pricing: 'Complex usage-based',
        weakness: 'Microsoft-centric',
      },
      {
        name: 'GCP',
        positioning: 'Data/ML focused',
        pricing: 'Complex usage-based',
        weakness: 'Smaller ecosystem',
      },
    ],
  },
}

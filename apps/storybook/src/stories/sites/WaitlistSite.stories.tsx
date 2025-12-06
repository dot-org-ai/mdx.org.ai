import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Badge, Button, Progress } from '@mdxui/shadcn'
import { Clock, Users, Mail, Sparkles, Gift } from 'lucide-react'

// Countdown display
const CountdownDisplay = ({ days, label }: { days: number, label: string }) => (
  <div className="text-center">
    <div className="text-2xl font-bold">{days}</div>
    <div className="text-xs text-muted-foreground">{label}</div>
  </div>
)

// WaitlistSite component
const WaitlistSite = ({
  domain,
  productName,
  tagline,
  launchDate,
  waitlistSize,
  targetSize,
  incentive,
  features,
  theme,
}: {
  domain: string
  productName: string
  tagline: string
  launchDate: string
  waitlistSize: number
  targetSize: number
  incentive: string
  features: string[]
  theme: 'light' | 'dark'
}) => {
  const daysUntilLaunch = Math.ceil((new Date(launchDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  const percentFull = Math.round((waitlistSize / targetSize) * 100)

  return (
    <Card className="w-[550px]">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center">
            <Clock className="h-7 w-7 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle>Waitlist Site</CardTitle>
              <Badge variant="secondary">Pre-launch</Badge>
            </div>
            <CardDescription>Build anticipation, capture emails</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product info */}
        <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-muted/50'}`}>
          <div className="text-xs text-muted-foreground mb-1">{domain}</div>
          <h3 className="text-lg font-bold">{productName}</h3>
          <p className="text-sm text-muted-foreground">{tagline}</p>
        </div>

        {/* Countdown */}
        <div className="border rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3 text-center">LAUNCHING IN</div>
          <div className="flex justify-center gap-6">
            <CountdownDisplay days={daysUntilLaunch} label="days" />
            <CountdownDisplay days={Math.floor(daysUntilLaunch * 24) % 24} label="hours" />
            <CountdownDisplay days={0} label="min" />
          </div>
        </div>

        {/* Waitlist progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {waitlistSize.toLocaleString()} signed up
            </span>
            <span className="text-muted-foreground">{targetSize.toLocaleString()} goal</span>
          </div>
          <Progress value={percentFull} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {percentFull}% of launch goal reached
          </div>
        </div>

        {/* Email capture preview */}
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Join the waitlist</span>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 h-9 bg-muted rounded border px-3 flex items-center text-sm text-muted-foreground">
              your@email.com
            </div>
            <Button size="sm">Join</Button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Gift className="h-3 w-3" />
            <span>{incentive}</span>
          </div>
        </div>

        {/* Coming features */}
        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            COMING SOON
          </div>
          <div className="flex flex-wrap gap-1">
            {features.map(feature => (
              <Badge key={feature} variant="outline" className="text-xs">{feature}</Badge>
            ))}
          </div>
        </div>

        {/* Structure */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-xs font-medium text-muted-foreground mb-3">SITE STRUCTURE</div>
          <div className="font-mono text-xs space-y-1 text-muted-foreground">
            <div>WaitlistSite</div>
            <div className="ml-4">├── Hero + Countdown</div>
            <div className="ml-4">├── Value Proposition</div>
            <div className="ml-4">├── Email Capture Form</div>
            <div className="ml-4">├── Social Proof</div>
            <div className="ml-4">└── Feature Teaser</div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm">Edit Content</Button>
          <Button size="sm">Preview</Button>
        </div>
      </CardContent>
    </Card>
  )
}

const meta: Meta<typeof WaitlistSite> = {
  title: 'Sites/WaitlistSite',
  component: WaitlistSite,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A WaitlistSite captures email signups before launch, builds anticipation with countdown timers, and teases upcoming features.',
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const ProductWaitlist: Story = {
  args: {
    domain: 'beta.aicode.dev',
    productName: 'AI Code',
    tagline: 'The AI-native IDE that writes code while you think',
    launchDate: '2025-04-01',
    waitlistSize: 12453,
    targetSize: 25000,
    incentive: 'Early access + 50% off first year',
    theme: 'dark',
    features: [
      'AI Autocomplete',
      'Natural Language Commands',
      'Code Review',
      'Test Generation',
      'Documentation',
    ],
  },
}

export const BetaProgram: Story = {
  args: {
    domain: 'beta.acme.com',
    productName: 'Acme 3.0 Beta',
    tagline: 'Be the first to try our completely redesigned platform',
    launchDate: '2025-03-15',
    waitlistSize: 8234,
    targetSize: 10000,
    incentive: 'Free premium for 6 months',
    theme: 'light',
    features: [
      'New UI',
      'Real-time Collab',
      'AI Assistant',
      'Mobile App',
      'API v3',
    ],
  },
}

export const ComingSoon: Story = {
  args: {
    domain: 'soon.startup.io',
    productName: 'Startup IO',
    tagline: 'Launch your startup in a weekend',
    launchDate: '2025-06-01',
    waitlistSize: 3421,
    targetSize: 50000,
    incentive: 'Founding member pricing forever',
    theme: 'dark',
    features: [
      'Landing Pages',
      'Payment Integration',
      'Email Marketing',
      'Analytics',
      'AI Copywriting',
    ],
  },
}

export const ExclusiveAccess: Story = {
  args: {
    domain: 'vip.enterprise.com',
    productName: 'Enterprise AI Suite',
    tagline: 'AI infrastructure for the Fortune 500',
    launchDate: '2025-02-28',
    waitlistSize: 487,
    targetSize: 500,
    incentive: 'Priority onboarding + dedicated success manager',
    theme: 'dark',
    features: [
      'SOC 2 Compliant',
      'On-Premise Deploy',
      'Custom Models',
      'SLA Guarantee',
      'Priority Support',
    ],
  },
}

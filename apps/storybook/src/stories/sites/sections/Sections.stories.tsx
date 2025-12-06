import type { Meta, StoryObj } from '@storybook/react'
import { Card, CardContent, Badge, Button } from '@mdxui/shadcn'
import { Check, Star, ArrowRight, Play, Quote, ChevronDown, Users, Zap, Shield, BarChart } from 'lucide-react'

// Section wrapper
const Section = ({
  name,
  purpose,
  children,
  dark,
}: {
  name: string
  purpose: string
  children: React.ReactNode
  dark?: boolean
}) => (
  <Card className="w-[800px]">
    <CardContent className="p-0">
      <div className="p-4 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge>{name}</Badge>
          <span className="text-sm text-muted-foreground">{purpose}</span>
        </div>
      </div>
      <div className={`${dark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
        {children}
      </div>
    </CardContent>
  </Card>
)

// Hero Section
const HeroSection = () => (
  <Section name="Hero" purpose="Headline, subheadline, CTA">
    <div className="py-16 px-8 text-center">
      <Badge className="mb-4">Now in Beta</Badge>
      <h1 className="text-3xl font-bold mb-4">Ship 10x Faster with AI</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
        The AI-powered platform that writes, tests, and deploys your code while you focus on building.
      </p>
      <div className="flex justify-center gap-4">
        <Button size="lg">Start Free Trial</Button>
        <Button size="lg" variant="outline">
          <Play className="h-4 w-4 mr-2" />
          Watch Demo
        </Button>
      </div>
      <p className="text-sm text-muted-foreground mt-4">No credit card required</p>
    </div>
  </Section>
)

// Pain Section
const PainSection = () => (
  <Section name="Pain" purpose="Agitate the problem" dark>
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Sound Familiar?</h2>
      <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-red-400 font-medium mb-2">"Deployments take hours"</div>
          <p className="text-sm text-slate-400">Manual processes, failed builds, waiting for CI...</p>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-red-400 font-medium mb-2">"3am production fires"</div>
          <p className="text-sm text-slate-400">Rollbacks, debugging, missed deadlines...</p>
        </div>
        <div className="p-4 rounded-lg bg-white/5 border border-white/10">
          <div className="text-red-400 font-medium mb-2">"Context switching kills flow"</div>
          <p className="text-sm text-slate-400">DevOps, testing, infrastructure...</p>
        </div>
      </div>
    </div>
  </Section>
)

// Benefits Section
const BenefitsSection = () => (
  <Section name="Benefits" purpose="Outcome-focused value">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-2 text-center">What You'll Gain</h2>
      <p className="text-muted-foreground text-center mb-8">Focus on building, not firefighting</p>
      <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <Zap className="h-6 w-6 text-green-600" />
          </div>
          <h3 className="font-semibold mb-2">10x Faster Deploys</h3>
          <p className="text-sm text-muted-foreground">Ship in seconds, not hours</p>
        </div>
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="font-semibold mb-2">Zero Anxiety</h3>
          <p className="text-sm text-muted-foreground">Instant rollbacks, always safe</p>
        </div>
        <div className="text-center">
          <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mx-auto mb-4">
            <BarChart className="h-6 w-6 text-purple-600" />
          </div>
          <h3 className="font-semibold mb-2">Full Visibility</h3>
          <p className="text-sm text-muted-foreground">Real-time metrics & logs</p>
        </div>
      </div>
    </div>
  </Section>
)

// Features Section
const FeaturesSection = () => (
  <Section name="Features" purpose="Capability showcase">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-2 text-center">Everything You Need</h2>
      <p className="text-muted-foreground text-center mb-8">Powerful features, simple interface</p>
      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
        {[
          { title: 'One-Click Deploy', desc: 'Push to deploy in seconds' },
          { title: 'Auto Scaling', desc: 'Handle any traffic spike' },
          { title: 'Edge Functions', desc: 'Run code at the edge' },
          { title: 'Real-time Logs', desc: 'Debug in production' },
          { title: 'Instant Rollback', desc: 'Undo with one click' },
          { title: 'Custom Domains', desc: 'SSL included free' },
        ].map((f, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
            <Check className="h-5 w-5 text-green-500 mt-0.5" />
            <div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-muted-foreground">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// Steps Section
const StepsSection = () => (
  <Section name="Steps" purpose="How it works (1-2-3)">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-2 text-center">How It Works</h2>
      <p className="text-muted-foreground text-center mb-8">Get started in 3 simple steps</p>
      <div className="flex justify-center items-start gap-8 max-w-3xl mx-auto">
        {[
          { num: '1', title: 'Connect', desc: 'Link your GitHub repo' },
          { num: '2', title: 'Configure', desc: 'Set your build settings' },
          { num: '3', title: 'Deploy', desc: 'Push and go live' },
        ].map((step, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-4 text-lg font-bold">
              {step.num}
            </div>
            <h3 className="font-semibold mb-1">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// Pricing Section
const PricingSection = () => (
  <Section name="Pricing" purpose="Plans and pricing">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-2 text-center">Simple Pricing</h2>
      <p className="text-muted-foreground text-center mb-8">Start free, scale as you grow</p>
      <div className="flex justify-center gap-6 max-w-3xl mx-auto">
        {[
          { name: 'Starter', price: '0', features: ['3 projects', '100GB bandwidth', 'Community support'] },
          { name: 'Pro', price: '20', features: ['Unlimited projects', '1TB bandwidth', 'Priority support', 'Custom domains'], popular: true },
          { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'SSO', 'SLA', 'Dedicated support'] },
        ].map((plan, i) => (
          <div key={i} className={`flex-1 p-6 rounded-lg border ${plan.popular ? 'border-primary ring-2 ring-primary/20' : ''}`}>
            {plan.popular && <Badge className="mb-2">Most Popular</Badge>}
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <div className="text-3xl font-bold my-2">
              {plan.price === 'Custom' ? plan.price : `$${plan.price}`}
              {plan.price !== 'Custom' && <span className="text-sm font-normal text-muted-foreground">/mo</span>}
            </div>
            <ul className="space-y-2 my-4">
              {plan.features.map((f, j) => (
                <li key={j} className="text-sm flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  {f}
                </li>
              ))}
            </ul>
            <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
              {plan.price === 'Custom' ? 'Contact Sales' : 'Get Started'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// Quotes Section
const QuotesSection = () => (
  <Section name="Quotes" purpose="Testimonials, social proof">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Loved by Developers</h2>
      <div className="grid grid-cols-3 gap-6 max-w-3xl mx-auto">
        {[
          { quote: 'Reduced our deploy time from hours to seconds. Game changer.', author: 'Sarah Chen', role: 'CTO, TechCorp', avatar: 'SC' },
          { quote: 'Finally I can focus on building instead of fighting infrastructure.', author: 'Mike Johnson', role: 'Lead Dev, StartupXYZ', avatar: 'MJ' },
          { quote: 'The best developer experience I\'ve ever had.', author: 'Emily Rodriguez', role: 'Founder, DevTools', avatar: 'ER' },
        ].map((q, i) => (
          <div key={i} className="p-4 rounded-lg border">
            <Quote className="h-6 w-6 text-muted-foreground/30 mb-2" />
            <p className="text-sm mb-4">{q.quote}</p>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                {q.avatar}
              </div>
              <div>
                <div className="text-sm font-medium">{q.author}</div>
                <div className="text-xs text-muted-foreground">{q.role}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// FAQ Section
const FAQSection = () => (
  <Section name="FAQ" purpose="Objection handling">
    <div className="py-12 px-8">
      <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
      <div className="max-w-2xl mx-auto space-y-4">
        {[
          { q: 'How does pricing work?', a: 'Start free, pay as you scale. No hidden fees.' },
          { q: 'Can I use my own domain?', a: 'Yes! Custom domains with free SSL included.' },
          { q: 'What about vendor lock-in?', a: 'Standard Docker containers. Export anytime.' },
          { q: 'Do you support monorepos?', a: 'Yes, with automatic dependency detection.' },
        ].map((faq, i) => (
          <div key={i} className="border rounded-lg">
            <div className="flex items-center justify-between p-4 cursor-pointer">
              <span className="font-medium">{faq.q}</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="px-4 pb-4 text-sm text-muted-foreground">
              {faq.a}
            </div>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// CTA Section
const CTASection = () => (
  <Section name="CTA" purpose="Final call to action" dark>
    <div className="py-16 px-8 text-center">
      <h2 className="text-3xl font-bold mb-4">Ready to Ship Faster?</h2>
      <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
        Join 10,000+ developers who deploy with confidence.
      </p>
      <div className="flex justify-center gap-4">
        <Button size="lg" variant="secondary">Start Free Trial</Button>
        <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
          Talk to Sales
        </Button>
      </div>
    </div>
  </Section>
)

// Stats Section
const StatsSection = () => (
  <Section name="Stats" purpose="Numbers, metrics">
    <div className="py-12 px-8">
      <div className="grid grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
        {[
          { value: '10K+', label: 'Developers' },
          { value: '1M+', label: 'Deployments' },
          { value: '99.99%', label: 'Uptime' },
          { value: '<50ms', label: 'Avg Latency' },
        ].map((stat, i) => (
          <div key={i}>
            <div className="text-3xl font-bold text-primary">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  </Section>
)

// Logos Section
const LogosSection = () => (
  <Section name="Logos" purpose="Trust signals">
    <div className="py-8 px-8">
      <p className="text-sm text-muted-foreground text-center mb-6">Trusted by teams at</p>
      <div className="flex justify-center items-center gap-12">
        {['Acme', 'TechCorp', 'Startup', 'Enterprise', 'Global'].map((logo, i) => (
          <div key={i} className="text-xl font-bold text-muted-foreground/40">
            {logo}
          </div>
        ))}
      </div>
    </div>
  </Section>
)

const meta: Meta = {
  title: 'Sites/Sections',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta

export const Hero: StoryObj = { render: () => <HeroSection /> }
export const Pain: StoryObj = { render: () => <PainSection /> }
export const Benefits: StoryObj = { render: () => <BenefitsSection /> }
export const Features: StoryObj = { render: () => <FeaturesSection /> }
export const Steps: StoryObj = { render: () => <StepsSection /> }
export const Pricing: StoryObj = { render: () => <PricingSection /> }
export const Quotes: StoryObj = { render: () => <QuotesSection /> }
export const FAQ: StoryObj = { render: () => <FAQSection /> }
export const CTA: StoryObj = { render: () => <CTASection /> }
export const Stats: StoryObj = { render: () => <StatsSection /> }
export const Logos: StoryObj = { render: () => <LogosSection /> }

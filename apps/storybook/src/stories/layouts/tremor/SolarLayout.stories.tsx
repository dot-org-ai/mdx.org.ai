import type { Meta, StoryObj } from '@storybook/react'
import { SolarLayout } from '@mdxui/tremor/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleHero,
  sampleFeaturesSection,
  samplePricingSection,
  sampleTestimonialsSection,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof SolarLayout> = {
  title: 'Layouts/Tremor/SolarLayout',
  component: SolarLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Solar Layout

A one-page marketing website layout from Tremor's template collection. Optimized for product showcases and company pages.

### Sections
- Navigation header
- Hero with CTA
- Features showcase
- Testimonials
- Pricing
- Footer
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SolarLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      title: sampleHero.title,
      description: sampleHero.description,
      primaryAction: sampleHero.primaryAction,
      secondaryAction: sampleHero.secondaryAction,
    },
    features: sampleFeaturesSection,
    testimonials: sampleTestimonialsSection,
    pricing: samplePricingSection,
    footer: sampleFooter,
  },
}

export const StartupLanding: Story = {
  name: 'Startup Landing',
  args: {
    header: {
      brand: { name: 'LaunchPad', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'About', href: '/about' },
      ],
      actions: [{ label: 'Get Early Access', href: '/signup', variant: 'primary' }],
    },
    hero: {
      title: 'Launch your startup in days, not months',
      description:
        'Everything you need to validate, build, and launch your next big idea. From MVP to scale.',
      primaryAction: { label: 'Start Building', href: '/signup' },
      secondaryAction: { label: 'See Examples', href: '/examples' },
    },
    features: {
      headline: 'Built for speed',
      description: 'Focus on your product, not the infrastructure.',
      features: [
        { title: 'One-click Deploy', description: 'Push to production in seconds.' },
        { title: 'Auto-scaling', description: 'Handle any amount of traffic.' },
        { title: 'Built-in Auth', description: 'User management out of the box.' },
        { title: 'Database Ready', description: 'PostgreSQL, Redis, and more.' },
      ],
    },
    pricing: {
      headline: 'Start free, scale as you grow',
      tiers: [
        {
          name: 'Hobby',
          price: { monthly: 'Free' },
          features: ['1 project', 'Community support', 'Basic analytics'],
          cta: 'Get Started',
        },
        {
          name: 'Pro',
          price: { monthly: '$20' },
          features: ['Unlimited projects', 'Priority support', 'Advanced analytics', 'Custom domain'],
          cta: 'Go Pro',
          featured: true,
        },
      ],
    },
    footer: {
      brand: { name: 'LaunchPad' },
      columns: [],
      legal: { copyright: '© 2024 LaunchPad. Ship fast.' },
    },
  },
}

export const AgencyPage: Story = {
  name: 'Agency Page',
  args: {
    header: {
      brand: { name: 'Studio', href: '/' },
      navigation: [
        { label: 'Work', href: '/work' },
        { label: 'Services', href: '/services' },
        { label: 'About', href: '/about' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    hero: {
      title: 'We design products people love',
      description:
        'A boutique design studio crafting digital experiences for ambitious brands. Strategy, design, and development under one roof.',
      primaryAction: { label: 'Start a Project', href: '/contact' },
    },
    features: {
      headline: 'Our Services',
      features: [
        { title: 'Brand Strategy', description: 'Define your brand voice and positioning.' },
        { title: 'Product Design', description: 'Beautiful, intuitive user interfaces.' },
        { title: 'Development', description: 'Pixel-perfect implementation.' },
        { title: 'Growth', description: 'Launch strategies that scale.' },
      ],
    },
    testimonials: {
      headline: 'Client Love',
      testimonials: [
        {
          quote: 'Studio transformed our brand. The results speak for themselves.',
          author: { name: 'Alex Kim', title: 'CEO', company: 'TechFlow' },
        },
        {
          quote: 'Professional, creative, and a joy to work with.',
          author: { name: 'Maria Santos', title: 'Founder', company: 'Bloom' },
        },
      ],
    },
    footer: {
      brand: { name: 'Studio', description: 'Design that moves.' },
      columns: [
        {
          title: 'Contact',
          links: [
            { text: 'hello@studio.com', href: 'mailto:hello@studio.com' },
            { text: 'Twitter', href: '#' },
          ],
        },
      ],
      legal: { copyright: '© 2024 Studio' },
    },
  },
}

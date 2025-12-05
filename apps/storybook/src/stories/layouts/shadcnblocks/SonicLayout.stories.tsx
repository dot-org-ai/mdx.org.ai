import type { Meta, StoryObj } from '@storybook/react'
import { SonicLayout } from '@mdxui/shadcnblocks/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleHero,
  sampleFeaturesSection,
  samplePricingSection,
  sampleDemo,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof SonicLayout> = {
  title: 'Layouts/Shadcnblocks/SonicLayout',
  component: SonicLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Sonic Layout

A product launch page layout optimized for demos and social proof. Features a prominent demo section and focused conversion flow.

### Key Features
- Demo-first design (image or video)
- Social proof with trusted-by logos
- Streamlined features presentation
- Simple pricing with featured tier
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof SonicLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      badge: sampleHero.badge,
      title: sampleHero.title,
      description: sampleHero.description,
      primaryAction: sampleHero.primaryAction,
      secondaryAction: sampleHero.secondaryAction,
      demo: sampleDemo,
    },
    features: sampleFeaturesSection,
    pricing: samplePricingSection,
    footer: sampleFooter,
  },
}

export const WithVideoDemo: Story = {
  name: 'With Video Demo',
  args: {
    header: {
      brand: { name: 'VideoApp', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      badge: 'Watch the Demo',
      title: 'See it in action',
      description: 'A 2-minute video that shows everything you need to know.',
      primaryAction: { label: 'Start Free', href: '/signup' },
      demo: {
        type: 'video',
        video: {
          src: 'https://example.com/demo.mp4',
          poster: 'https://placehold.co/1200x800/1a1a2e/ffffff?text=Video+Poster',
          autoplay: false,
        },
      },
    },
    features: sampleFeaturesSection,
    footer: sampleFooter,
  },
}

export const ProductHunt: Story = {
  name: 'Product Hunt Launch',
  args: {
    header: {
      brand: { name: 'LaunchApp', href: '/' },
      navigation: [{ label: 'Features', href: '#features' }],
      actions: [{ label: 'Upvote on PH', href: '#', variant: 'primary' }],
    },
    hero: {
      badge: '#1 Product of the Day',
      title: 'The fastest way to launch',
      description: 'Join 5,000+ makers who shipped this week. Free forever for indie hackers.',
      primaryAction: { label: 'Try it Free', href: '/signup' },
      secondaryAction: { label: 'View on GitHub', href: 'https://github.com' },
      demo: {
        type: 'image',
        image: {
          src: 'https://placehold.co/1200x800/ff6154/ffffff?text=Product+Hunt',
          alt: 'Product launch screenshot',
        },
      },
    },
    features: {
      headline: 'Why makers love us',
      features: [
        { title: 'Ship in hours', description: 'Not days. Get from idea to launch fast.' },
        { title: 'Free tier forever', description: 'No credit card required. Ever.' },
        { title: 'Open source', description: 'MIT licensed. Fork it, own it.' },
      ],
    },
    footer: {
      brand: { name: 'LaunchApp' },
      columns: [],
      legal: { copyright: '© 2024 LaunchApp. Made with ❤️' },
    },
  },
}

export const SaaSLaunch: Story = {
  name: 'SaaS Product Launch',
  args: {
    header: {
      brand: { name: 'CloudSync', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      badge: 'New: Team Collaboration',
      title: 'Sync your files across all devices',
      description: 'Real-time file synchronization with enterprise security. Never lose work again.',
      primaryAction: { label: 'Start 14-day Trial', href: '/signup' },
      secondaryAction: { label: 'See Plans', href: '#pricing' },
      demo: {
        type: 'image',
        image: {
          src: 'https://placehold.co/1200x800/3b82f6/ffffff?text=CloudSync+Dashboard',
          alt: 'CloudSync dashboard',
        },
      },
    },
    features: sampleFeaturesSection,
    pricing: {
      headline: 'Simple pricing',
      tiers: [
        {
          name: 'Personal',
          price: { monthly: '$9' },
          features: ['100GB storage', '5 devices', 'Basic support'],
          cta: 'Start Free',
        },
        {
          name: 'Team',
          price: { monthly: '$29' },
          features: ['1TB storage', 'Unlimited devices', 'Priority support', 'Admin controls'],
          cta: 'Start Trial',
          featured: true,
        },
      ],
    },
    footer: sampleFooter,
  },
}

import type { Meta, StoryObj } from '@storybook/react'
import { DuskLayout } from '@mdxui/tailark/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleFeaturesSection,
  samplePricingSection,
  sampleTestimonialsSection,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof DuskLayout> = {
  title: 'Layouts/Tailark/DuskLayout',
  component: DuskLayout,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'dark' },
    docs: {
      description: {
        component: `
## Dusk Layout

A dark, bold style layout from Tailark. Features gradient accents and glow effects.

### Design Characteristics
- Dark background (gray/black)
- Gradient accents (purple-pink, blue-purple, etc.)
- Bold, impactful headings
- Glow effects and gradient borders
- High contrast for readability

### Best For
- AI/ML products
- Gaming platforms
- Creative tools
- Consumer apps
- Fintech products
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof DuskLayout>

export const Default: Story = {
  args: {
    header: {
      brand: { name: 'NightOwl', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      announcement: { text: 'Introducing AI-powered features', href: '/blog/ai' },
      headline: 'The future is here',
      description: 'Experience the next generation of intelligent software.',
      primaryAction: { label: 'Get Started', href: '/signup' },
      secondaryAction: { label: 'Watch Demo', href: '/demo' },
    },
    features: sampleFeaturesSection,
    testimonials: sampleTestimonialsSection,
    pricing: samplePricingSection,
    footer: sampleFooter,
  },
}

export const PurplePinkGradient: Story = {
  name: 'Purple-Pink Gradient',
  args: {
    gradient: 'purple-pink',
    glow: true,
    header: {
      brand: { name: 'NeuralAI', href: '/' },
      navigation: [
        { label: 'Models', href: '/models' },
        { label: 'API', href: '/api' },
        { label: 'Pricing', href: '#pricing' },
      ],
      actions: [{ label: 'Try API', href: '/playground', variant: 'primary' }],
    },
    hero: {
      announcement: { text: 'GPT-5 compatible', href: '/blog/gpt5' },
      headline: 'AI that understands',
      description: 'State-of-the-art language models for every use case.',
      primaryAction: { label: 'Start Building', href: '/signup' },
      secondaryAction: { label: 'API Docs', href: '/docs' },
    },
    features: {
      headline: 'Capabilities',
      features: [
        { title: 'Text Generation', description: 'Human-quality content at scale.' },
        { title: 'Code Completion', description: 'AI pair programming.' },
        { title: 'Embeddings', description: 'Semantic search and more.' },
        { title: 'Fine-tuning', description: 'Customize for your domain.' },
      ],
    },
    pricing: {
      headline: 'Simple API Pricing',
      tiers: [
        { name: 'Free', price: { monthly: '$0' }, features: ['1M tokens/month', 'Community support'], cta: 'Start Free' },
        { name: 'Pro', price: { monthly: '$20' }, features: ['10M tokens/month', 'Priority support', 'Fine-tuning'], cta: 'Go Pro', featured: true },
        { name: 'Enterprise', price: { monthly: 'Custom' }, features: ['Unlimited tokens', 'Dedicated support', 'SLA'], cta: 'Contact Us' },
      ],
    },
    footer: {
      brand: { name: 'NeuralAI' },
      columns: [],
      legal: { copyright: '© 2024 NeuralAI. All rights reserved.' },
    },
  },
}

export const BluePurpleGradient: Story = {
  name: 'Blue-Purple Gradient',
  args: {
    gradient: 'blue-purple',
    glow: true,
    header: {
      brand: { name: 'GameForge', href: '/' },
      navigation: [
        { label: 'Games', href: '/games' },
        { label: 'Community', href: '/community' },
        { label: 'Store', href: '/store' },
      ],
      actions: [{ label: 'Play Now', href: '/play', variant: 'primary' }],
    },
    hero: {
      headline: 'Next-gen gaming',
      description: 'Immersive experiences powered by the latest technology.',
      primaryAction: { label: 'Explore Games', href: '/games' },
    },
    features: {
      headline: 'Why GameForge?',
      features: [
        { title: 'Ray Tracing', description: 'Photorealistic graphics.' },
        { title: 'Cross-Platform', description: 'Play anywhere.' },
        { title: 'Esports Ready', description: 'Competitive gaming.' },
      ],
    },
    footer: {
      brand: { name: 'GameForge' },
      columns: [],
      legal: { copyright: '© 2024 GameForge' },
    },
  },
}

export const GreenCyanGradient: Story = {
  name: 'Green-Cyan Gradient',
  args: {
    gradient: 'green-cyan',
    glow: true,
    header: {
      brand: { name: 'CryptoVault', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Security', href: '/security' },
        { label: 'Pricing', href: '#pricing' },
      ],
      actions: [{ label: 'Open Vault', href: '/app', variant: 'primary' }],
    },
    hero: {
      headline: 'Secure your assets',
      description: 'Military-grade encryption for your digital assets.',
      primaryAction: { label: 'Get Started', href: '/signup' },
      secondaryAction: { label: 'Security Audit', href: '/security' },
    },
    features: {
      headline: 'Bank-grade Security',
      features: [
        { title: 'Multi-sig', description: 'Multiple approvals required.' },
        { title: 'Cold Storage', description: 'Air-gapped security.' },
        { title: 'Insurance', description: '$100M coverage.' },
      ],
    },
    footer: {
      brand: { name: 'CryptoVault' },
      columns: [],
      legal: { copyright: '© 2024 CryptoVault' },
    },
  },
}

export const OrangeRedGradient: Story = {
  name: 'Orange-Red Gradient',
  args: {
    gradient: 'orange-red',
    glow: true,
    header: {
      brand: { name: 'StreamFire', href: '/' },
      navigation: [
        { label: 'Live', href: '/live' },
        { label: 'Creators', href: '/creators' },
        { label: 'Subscribe', href: '/subscribe' },
      ],
      actions: [{ label: 'Go Live', href: '/studio', variant: 'primary' }],
    },
    hero: {
      headline: 'Stream like a pro',
      description: 'The ultimate platform for content creators.',
      primaryAction: { label: 'Start Streaming', href: '/studio' },
    },
    features: {
      headline: 'Creator Tools',
      features: [
        { title: '4K Streaming', description: 'Crystal clear quality.' },
        { title: 'Monetization', description: 'Multiple revenue streams.' },
        { title: 'Analytics', description: 'Know your audience.' },
      ],
    },
    footer: {
      brand: { name: 'StreamFire' },
      columns: [],
      legal: { copyright: '© 2024 StreamFire' },
    },
  },
}

export const NoGlow: Story = {
  name: 'Without Glow Effects',
  args: {
    gradient: 'purple-pink',
    glow: false,
    header: {
      brand: { name: 'Subtle', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Understated elegance',
      description: 'Dark mode without the flashiness.',
      primaryAction: { label: 'Explore', href: '/explore' },
    },
    features: sampleFeaturesSection,
    footer: sampleFooter,
  },
}

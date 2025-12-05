import type { Meta, StoryObj } from '@storybook/react'
import { QuartzLayout } from '@mdxui/tailark/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleFeaturesSection,
  samplePricingSection,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof QuartzLayout> = {
  title: 'Layouts/Tailark/QuartzLayout',
  component: QuartzLayout,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
    docs: {
      description: {
        component: `
## Quartz Layout

A light, minimal style layout from Tailark. Features clean typography and generous whitespace.

### Design Characteristics
- Light background (white/gray)
- Indigo/violet accent colors
- Clean, sharp typography
- Generous whitespace
- Subtle borders

### Best For
- SaaS landing pages
- Developer tools
- Professional services
- B2B products
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof QuartzLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Build with confidence',
      description: 'A clean, professional platform for modern development teams.',
      primaryAction: { label: 'Start Building', href: '/signup' },
      secondaryAction: { label: 'Documentation', href: '/docs' },
    },
    features: sampleFeaturesSection,
    pricing: samplePricingSection,
    footer: sampleFooter,
  },
}

export const IndigoAccent: Story = {
  name: 'Indigo Accent (Default)',
  args: {
    accentColor: 'indigo',
    header: {
      brand: { name: 'DevTools', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Developer-first platform',
      description: 'Built by developers, for developers. Ship faster with modern tools.',
      primaryAction: { label: 'Get API Key', href: '/signup' },
    },
    features: sampleFeaturesSection,
    footer: sampleFooter,
  },
}

export const VioletAccent: Story = {
  name: 'Violet Accent',
  args: {
    accentColor: 'violet',
    header: {
      brand: { name: 'Creative', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Gallery', href: '/gallery' },
        { label: 'Pricing', href: '#pricing' },
      ],
      actions: [{ label: 'Try Free', href: '/signup', variant: 'primary' }],
    },
    hero: {
      headline: 'Design without limits',
      description: 'Professional design tools for creative teams.',
      primaryAction: { label: 'Start Creating', href: '/signup' },
    },
    features: {
      headline: 'Powerful features',
      features: [
        { title: 'Vector Graphics', description: 'Precision tools for every project.' },
        { title: 'Collaboration', description: 'Work together in real-time.' },
        { title: 'Asset Library', description: 'Millions of assets at your fingertips.' },
      ],
    },
    footer: sampleFooter,
  },
}

export const BlueAccent: Story = {
  name: 'Blue Accent',
  args: {
    accentColor: 'blue',
    header: {
      brand: { name: 'CloudBase', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Infrastructure that scales',
      description: 'Enterprise cloud solutions for growing businesses.',
      primaryAction: { label: 'Contact Sales', href: '/contact' },
      secondaryAction: { label: 'View Demo', href: '/demo' },
    },
    features: sampleFeaturesSection,
    pricing: samplePricingSection,
    footer: sampleFooter,
  },
}

export const CyanAccent: Story = {
  name: 'Cyan Accent',
  args: {
    accentColor: 'cyan',
    header: {
      brand: { name: 'DataFlow', href: '/' },
      navigation: [
        { label: 'Product', href: '/product' },
        { label: 'Solutions', href: '/solutions' },
        { label: 'Pricing', href: '#pricing' },
      ],
      actions: [{ label: 'Book Demo', href: '/demo', variant: 'primary' }],
    },
    hero: {
      headline: 'Data pipelines made simple',
      description: 'Connect, transform, and deliver data anywhere.',
      primaryAction: { label: 'Start Free', href: '/signup' },
    },
    features: {
      headline: 'Why DataFlow?',
      features: [
        { title: 'No-code Setup', description: 'Visual pipeline builder.' },
        { title: 'Real-time Sync', description: 'Sub-second latency.' },
        { title: 'Enterprise Ready', description: 'SOC2 compliant.' },
      ],
    },
    footer: sampleFooter,
  },
}

import type { Meta, StoryObj } from '@storybook/react'
import { MarketingLayout } from '@mdxui/tailark/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleHero,
  sampleFeaturesSection,
  sampleIntegrationsSection,
  samplePricingSection,
  sampleTestimonialsSection,
  sampleFAQSection,
  sampleCTA,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof MarketingLayout> = {
  title: 'Layouts/Tailark/MarketingLayout',
  component: MarketingLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Marketing Layout

A full marketing landing page layout from Tailark. Includes all standard sections for conversion-optimized landing pages.

### Sections
- Header with navigation
- Hero with announcement badge
- Features grid
- Integrations showcase
- Testimonials
- Pricing tiers
- FAQ accordion
- Final CTA
- Footer
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MarketingLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      announcement: sampleHero.announcement,
      headline: sampleHero.headline,
      description: sampleHero.description,
      primaryAction: sampleHero.primaryAction,
      secondaryAction: sampleHero.secondaryAction,
      trustedBy: sampleHero.trustedBy,
    },
    features: sampleFeaturesSection,
    integrations: sampleIntegrationsSection,
    testimonials: sampleTestimonialsSection,
    pricing: samplePricingSection,
    faq: sampleFAQSection,
    cta: sampleCTA,
    footer: sampleFooter,
  },
}

export const MinimalLanding: Story = {
  name: 'Minimal Landing',
  args: {
    header: {
      brand: { name: 'Minimal', href: '/' },
      navigation: [{ label: 'Features', href: '#features' }],
      actions: [{ label: 'Get Started', href: '/signup', variant: 'primary' }],
    },
    hero: {
      headline: 'Simple. Powerful. Yours.',
      description: 'The tool that gets out of your way.',
      primaryAction: { label: 'Try Free', href: '/signup' },
    },
    features: {
      features: [
        { title: 'Fast', description: 'Built for speed.' },
        { title: 'Simple', description: 'No learning curve.' },
        { title: 'Secure', description: 'Your data is safe.' },
      ],
    },
    footer: {
      brand: { name: 'Minimal' },
      columns: [],
      legal: { copyright: '© 2024' },
    },
  },
}

export const WithIntegrations: Story = {
  name: 'With Integrations Focus',
  args: {
    header: {
      brand: { name: 'ConnectHub', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Connect everything',
      description: 'Integrate with 100+ tools your team already uses.',
      primaryAction: { label: 'See Integrations', href: '#integrations' },
    },
    integrations: {
      headline: 'Works with your stack',
      description: 'Native integrations with all your favorite tools.',
      integrations: sampleIntegrationsSection.integrations,
    },
    features: {
      headline: 'Why teams choose us',
      features: sampleFeaturesSection.features.slice(0, 4),
    },
    footer: sampleFooter,
  },
}

export const PricingFocused: Story = {
  name: 'Pricing Focused',
  args: {
    header: {
      brand: { name: 'PriceRight', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'FAQ', href: '#faq' },
      ],
      actions: [{ label: 'Start Free', href: '/signup', variant: 'primary' }],
    },
    hero: {
      headline: 'Transparent pricing',
      description: 'No hidden fees. No surprises. Just simple pricing that scales with you.',
      primaryAction: { label: 'View Plans', href: '#pricing' },
    },
    pricing: {
      headline: 'Choose your plan',
      description: 'All plans include a 30-day money-back guarantee.',
      tiers: samplePricingSection.tiers,
    },
    faq: sampleFAQSection,
    footer: sampleFooter,
  },
}

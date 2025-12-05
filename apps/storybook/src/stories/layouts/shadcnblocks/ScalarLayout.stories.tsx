import type { Meta, StoryObj } from '@storybook/react'
import { ScalarLayout } from '@mdxui/shadcnblocks/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleHero,
  sampleFeaturesSection,
  samplePricingSection,
  sampleTestimonialsSection,
  sampleFAQSection,
  sampleCTA,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof ScalarLayout> = {
  title: 'Layouts/Shadcnblocks/ScalarLayout',
  component: ScalarLayout,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
## Scalar Layout

A complete SaaS landing page layout with all standard sections. Perfect for marketing pages, product launches, and company websites.

### Sections Included
- Header with navigation and CTAs
- Hero section with badge and dual CTAs
- Features grid
- Testimonials
- Pricing tiers
- FAQ accordion
- Final CTA
- Footer with columns
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof ScalarLayout>

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
    },
    features: sampleFeaturesSection,
    testimonials: sampleTestimonialsSection,
    pricing: samplePricingSection,
    faq: sampleFAQSection,
    cta: sampleCTA,
    footer: sampleFooter,
  },
}

export const MinimalSections: Story = {
  name: 'Minimal (Hero + Features Only)',
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      title: 'Ship faster with Scalar',
      description: 'A minimal landing page layout for quick launches.',
      primaryAction: { label: 'Get Started', href: '/signup' },
    },
    features: {
      headline: 'Key Features',
      features: sampleFeaturesSection.features.slice(0, 3),
    },
    footer: sampleFooter,
  },
}

export const WithTestimonialsOnly: Story = {
  name: 'With Testimonials (No Pricing)',
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      badge: 'Trusted by 10,000+ teams',
      title: 'The platform developers love',
      description: 'See what our customers have to say.',
      primaryAction: { label: 'Join Them', href: '/signup' },
    },
    features: sampleFeaturesSection,
    testimonials: sampleTestimonialsSection,
    cta: sampleCTA,
    footer: sampleFooter,
  },
}

export const EnterpriseFocused: Story = {
  name: 'Enterprise Focus',
  args: {
    header: {
      brand: { name: 'Enterprise Suite', href: '/' },
      navigation: [
        { label: 'Solutions', href: '/solutions' },
        { label: 'Security', href: '/security' },
        { label: 'Compliance', href: '/compliance' },
        { label: 'Contact', href: '/contact' },
      ],
      actions: [
        { label: 'Sign In', href: '/login', variant: 'ghost' },
        { label: 'Contact Sales', href: '/contact', variant: 'primary' },
      ],
    },
    hero: {
      badge: 'SOC2 Compliant',
      title: 'Enterprise-grade security for modern teams',
      description: 'Trusted by Fortune 500 companies worldwide. Secure, scalable, and compliant.',
      primaryAction: { label: 'Schedule Demo', href: '/demo' },
      secondaryAction: { label: 'View Security', href: '/security' },
    },
    features: {
      headline: 'Enterprise Features',
      description: 'Everything you need for large-scale deployments.',
      features: [
        {
          title: 'SSO & SAML',
          description: 'Integrate with your existing identity provider.',
        },
        {
          title: '99.99% SLA',
          description: 'Guaranteed uptime with enterprise support.',
        },
        {
          title: 'Audit Logs',
          description: 'Complete visibility into all system activities.',
        },
        {
          title: 'Custom Contracts',
          description: 'Flexible terms that fit your organization.',
        },
      ],
    },
    faq: {
      headline: 'Enterprise FAQ',
      items: [
        {
          question: 'Do you offer custom contracts?',
          answer: 'Yes, we work with your legal team to create agreements that meet your requirements.',
        },
        {
          question: 'What compliance certifications do you have?',
          answer: 'We are SOC2 Type II, GDPR, and HIPAA compliant.',
        },
      ],
    },
    footer: sampleFooter,
  },
}

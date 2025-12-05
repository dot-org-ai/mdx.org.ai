import type { Meta, StoryObj } from '@storybook/react'
import { MistLayout } from '@mdxui/tailark/templates'
import {
  sampleBrand,
  sampleNavigation,
  sampleHeaderActions,
  sampleFeaturesSection,
  samplePricingSection,
  sampleTestimonialsSection,
  sampleFAQSection,
  sampleFooter,
} from '../../../data/sample-data'

const meta: Meta<typeof MistLayout> = {
  title: 'Layouts/Tailark/MistLayout',
  component: MistLayout,
  parameters: {
    layout: 'fullscreen',
    backgrounds: { default: 'light' },
    docs: {
      description: {
        component: `
## Mist Layout

A soft, muted style layout from Tailark. Features rounded elements and gentle transitions.

### Design Characteristics
- Soft gray/off-white background
- Teal/emerald accent colors
- Soft, rounded typography
- Rounded corners and soft shadows
- Subtle hover transitions

### Best For
- Health & wellness apps
- Productivity tools
- Note-taking apps
- Collaboration platforms
- Education products
        `,
      },
    },
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof MistLayout>

export const Default: Story = {
  args: {
    header: {
      brand: sampleBrand,
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Find your calm',
      description: 'A peaceful space for focused work and mindful productivity.',
      primaryAction: { label: 'Get Started', href: '/signup' },
      secondaryAction: { label: 'Learn More', href: '/about' },
    },
    features: sampleFeaturesSection,
    testimonials: sampleTestimonialsSection,
    pricing: samplePricingSection,
    faq: sampleFAQSection,
    footer: sampleFooter,
  },
}

export const TealAccent: Story = {
  name: 'Teal Accent (Default)',
  args: {
    accentColor: 'teal',
    warmth: 'neutral',
    header: {
      brand: { name: 'Mindful', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'About', href: '/about' },
      ],
      actions: [{ label: 'Start Free', href: '/signup', variant: 'primary' }],
    },
    hero: {
      headline: 'Focus on what matters',
      description: 'A calm space for your thoughts and tasks.',
      primaryAction: { label: 'Try Free', href: '/signup' },
    },
    features: {
      headline: 'Designed for focus',
      features: [
        { title: 'Distraction-free', description: 'Clean interface that helps you concentrate.' },
        { title: 'Daily Planning', description: 'Start each day with intention.' },
        { title: 'Progress Tracking', description: 'See how far you\'ve come.' },
      ],
    },
    footer: {
      brand: { name: 'Mindful' },
      columns: [],
      legal: { copyright: '© 2024 Mindful. Take it easy.' },
    },
  },
}

export const EmeraldAccent: Story = {
  name: 'Emerald Accent',
  args: {
    accentColor: 'emerald',
    warmth: 'warm',
    header: {
      brand: { name: 'GreenLeaf', href: '/' },
      navigation: [
        { label: 'Products', href: '/products' },
        { label: 'Science', href: '/science' },
        { label: 'Community', href: '/community' },
      ],
      actions: [{ label: 'Shop Now', href: '/shop', variant: 'primary' }],
    },
    hero: {
      headline: 'Wellness, naturally',
      description: 'Plant-based supplements backed by science.',
      primaryAction: { label: 'Explore Products', href: '/products' },
    },
    features: {
      headline: 'Why GreenLeaf?',
      features: [
        { title: 'Organic', description: 'Certified organic ingredients.' },
        { title: 'Tested', description: 'Third-party lab verified.' },
        { title: 'Sustainable', description: 'Eco-friendly packaging.' },
      ],
    },
    testimonials: {
      headline: 'Customer Stories',
      testimonials: [
        {
          quote: 'I\'ve never felt better. These supplements actually work.',
          author: { name: 'Lisa M.', title: 'Verified Customer' },
        },
      ],
    },
    footer: {
      brand: { name: 'GreenLeaf' },
      columns: [],
      legal: { copyright: '© 2024 GreenLeaf Health' },
    },
  },
}

export const SkyAccent: Story = {
  name: 'Sky Accent',
  args: {
    accentColor: 'sky',
    warmth: 'cool',
    header: {
      brand: { name: 'LearnFlow', href: '/' },
      navigation: [
        { label: 'Courses', href: '/courses' },
        { label: 'Paths', href: '/paths' },
        { label: 'For Teams', href: '/teams' },
      ],
      actions: [{ label: 'Start Learning', href: '/signup', variant: 'primary' }],
    },
    hero: {
      headline: 'Learn at your pace',
      description: 'Interactive courses that adapt to your learning style.',
      primaryAction: { label: 'Browse Courses', href: '/courses' },
      secondaryAction: { label: 'For Teams', href: '/teams' },
    },
    features: {
      headline: 'Why students love us',
      features: [
        { title: 'Personalized', description: 'AI-powered learning paths.' },
        { title: 'Interactive', description: 'Hands-on projects and quizzes.' },
        { title: 'Community', description: 'Learn together with peers.' },
      ],
    },
    pricing: {
      headline: 'Invest in yourself',
      tiers: [
        { name: 'Free', price: { monthly: '$0' }, features: ['5 courses', 'Community access'], cta: 'Start Free' },
        { name: 'Pro', price: { monthly: '$19' }, features: ['All courses', 'Certificates', 'Priority support'], cta: 'Go Pro', featured: true },
      ],
    },
    footer: {
      brand: { name: 'LearnFlow' },
      columns: [],
      legal: { copyright: '© 2024 LearnFlow' },
    },
  },
}

export const RoseAccent: Story = {
  name: 'Rose Accent',
  args: {
    accentColor: 'rose',
    warmth: 'warm',
    header: {
      brand: { name: 'Bloom', href: '/' },
      navigation: [
        { label: 'Features', href: '#features' },
        { label: 'Stories', href: '/stories' },
        { label: 'Download', href: '/download' },
      ],
      actions: [{ label: 'Get the App', href: '/download', variant: 'primary' }],
    },
    hero: {
      headline: 'Self-care made simple',
      description: 'Daily rituals for mental wellness and personal growth.',
      primaryAction: { label: 'Download Free', href: '/download' },
    },
    features: {
      headline: 'Your daily companion',
      features: [
        { title: 'Guided Meditation', description: '5-minute sessions for busy days.' },
        { title: 'Mood Tracking', description: 'Understand your patterns.' },
        { title: 'Sleep Stories', description: 'Drift off peacefully.' },
        { title: 'Affirmations', description: 'Start your day positively.' },
      ],
    },
    testimonials: {
      headline: 'Life-changing',
      testimonials: [
        {
          quote: 'Bloom helped me build a meditation habit that stuck.',
          author: { name: 'Amanda K.', title: '6-month user' },
        },
        {
          quote: 'The sleep stories are incredible. I fall asleep within minutes now.',
          author: { name: 'David L.', title: 'Premium member' },
        },
      ],
    },
    footer: {
      brand: { name: 'Bloom', description: 'Grow every day.' },
      columns: [],
      legal: { copyright: '© 2024 Bloom Wellness' },
    },
  },
}

export const CoolWarmth: Story = {
  name: 'Cool Warmth',
  args: {
    accentColor: 'teal',
    warmth: 'cool',
    header: {
      brand: { name: 'CoolApp', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Cool and collected',
      description: 'A crisp, clean design for focused work.',
      primaryAction: { label: 'Get Started', href: '/signup' },
    },
    features: sampleFeaturesSection,
    footer: sampleFooter,
  },
}

export const WarmWarmth: Story = {
  name: 'Warm Warmth',
  args: {
    accentColor: 'teal',
    warmth: 'warm',
    header: {
      brand: { name: 'CozyApp', href: '/' },
      navigation: sampleNavigation,
      actions: sampleHeaderActions,
    },
    hero: {
      headline: 'Warm and inviting',
      description: 'A cozy design that feels like home.',
      primaryAction: { label: 'Come In', href: '/signup' },
    },
    features: sampleFeaturesSection,
    footer: sampleFooter,
  },
}

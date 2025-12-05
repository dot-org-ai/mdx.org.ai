/**
 * markt.ng - AI Marketing Services
 */

import React from 'react'
import { ScalarLayout } from '@mdxui/shadcnblocks/templates'

export const marktData = {
  name: 'markt.ng',
  title: 'AI Marketing - Marketing That Runs Itself',
  description: 'Campaigns plan themselves, content creates itself, and your marketing runs on autopilot while you focus on your business.',
  layout: 'scalar',

  header: {
    brand: { name: 'markt.ng', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Templates', href: '/templates' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'Login', href: '/login', variant: 'ghost' as const },
      { label: 'Build Your Marketing Plan', href: '/signup', variant: 'primary' as const },
    ],
  },

  hero: {
    badge: 'Your Marketing, On Autopilot',
    title: 'Marketing That Runs Itself',
    description: 'Stop planning marketing you never execute. AI creates a strategy, generates content, posts on schedule, and improves over time—while you focus on your actual business.',
    primaryAction: { label: 'Build Your Marketing Plan', href: '/signup' },
    secondaryAction: { label: 'See Example Campaigns', href: '/templates' },
  },

  features: {
    headline: 'Stop Planning. Start Doing.',
    description: 'Marketing that happens without your constant attention.',
    features: [
      {
        title: 'AI Creates Your Plan',
        description: 'Tell us your business and goals. AI builds a content calendar and campaign strategy tailored to you.',
      },
      {
        title: 'Content Generates Itself',
        description: 'Email copy, social posts, landing pages—all on-brand, all generated, all reviewed by you.',
      },
      {
        title: 'Omnichannel Execution',
        description: 'Email, SMS, social, push. Coordinated campaigns that execute automatically.',
      },
      {
        title: 'Perfect Timing',
        description: 'AI learns when each user engages. Content arrives at the perfect moment.',
      },
      {
        title: 'Continuous Improvement',
        description: 'A/B tests everything. Learns what works. Gets better without your input.',
      },
      {
        title: 'Clear Attribution',
        description: 'Know exactly what\'s working. Funnels, cohorts, revenue attribution—all visible.',
      },
    ],
  },

  testimonials: {
    headline: 'Marketing That Actually Happens',
    testimonials: [
      {
        quote: 'I used to plan content calendars I never executed. Now marketing just... happens. Revenue is up 3x.',
        author: {
          name: 'Kate Williams',
          title: 'Head of Growth',
          company: 'E-ComCo',
          avatar: 'https://i.pravatar.cc/150?u=kate',
        },
      },
      {
        quote: 'I review AI drafts over coffee and hit approve. Same-day launches for campaigns that used to take a week.',
        author: {
          name: 'Derek Chang',
          title: 'Marketing Manager',
          company: 'SaaSly',
          avatar: 'https://i.pravatar.cc/150?u=derek',
        },
      },
      {
        quote: 'Every email feels hand-crafted but I didn\'t write any of them. The personalization is incredible.',
        author: {
          name: 'Aisha Patel',
          title: 'VP Marketing',
          company: 'RetailBrand',
          avatar: 'https://i.pravatar.cc/150?u=aisha',
        },
      },
    ],
  },

  pricing: {
    headline: 'Plans for Every Team',
    description: 'Start free. Upgrade when you need more.',
    tiers: [
      {
        name: 'Starter',
        description: 'For small teams getting started.',
        price: { monthly: '$49', yearly: '$490' },
        features: ['1,000 contacts', 'Email campaigns', 'Basic analytics', 'Email support'],
        cta: 'Start Free',
      },
      {
        name: 'Pro',
        description: 'For growing teams.',
        price: { monthly: '$149', yearly: '$1,490' },
        features: ['10,000 contacts', 'All channels', 'AI content', 'Advanced analytics', 'A/B testing', 'Priority support'],
        cta: 'Start Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        description: 'For large organizations.',
        price: { monthly: 'Custom', yearly: 'Custom' },
        features: ['Unlimited contacts', 'Custom AI models', 'Dedicated CSM', 'SLA', 'API access'],
        cta: 'Contact Sales',
      },
    ],
  },

  faq: {
    headline: 'Frequently Asked Questions',
    items: [
      {
        question: 'How does the AI generate content?',
        answer: 'We use Claude to generate content based on your brand guidelines, past campaigns, and audience data. You review and approve before sending.',
      },
      {
        question: 'Can I import my existing contacts?',
        answer: 'Yes! Import from CSV, integrate with your CRM, or connect your existing ESP. We handle migration.',
      },
      {
        question: 'Is there a free trial?',
        answer: 'Every plan starts with a 14-day free trial. No credit card required.',
      },
    ],
  },

  cta: {
    headline: 'Ready to transform your marketing?',
    description: 'Join thousands of marketers using AI to grow faster.',
    action: { label: 'Start Free Trial', href: '/signup' },
  },

  footer: {
    brand: {
      name: 'markt.ng',
      description: 'AI-powered marketing automation.',
    },
    columns: [
      {
        title: 'Product',
        links: [
          { text: 'Features', href: '/features' },
          { text: 'Templates', href: '/templates' },
          { text: 'Pricing', href: '#pricing' },
          { text: 'API', href: '/api' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { text: 'Documentation', href: '/docs' },
          { text: 'Blog', href: '/blog' },
          { text: 'Case Studies', href: '/cases' },
        ],
      },
      {
        title: 'Company',
        links: [
          { text: 'About', href: '/about' },
          { text: 'Careers', href: '/careers' },
          { text: 'Contact', href: '/contact' },
        ],
      },
    ],
    legal: {
      copyright: '© 2024 markt.ng. All rights reserved.',
      links: [
        { text: 'Privacy', href: '/privacy' },
        { text: 'Terms', href: '/terms' },
      ],
    },
  },
}

export function MarktSite() {
  return <ScalarLayout {...marktData} />
}

export default MarktSite

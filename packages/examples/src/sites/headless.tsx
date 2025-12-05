/**
 * headless.ly - Headless CMS
 */

import React from 'react'
import { LumenLayout } from '@mdxui/shadcnblocks/templates'

export const headlessData = {
  name: 'headless.ly',
  title: 'Headless CMS - Content is Code',
  description: 'A headless CMS where content is code—version-controlled, branch-deployable, and enhanced with AI superpowers.',
  layout: 'lumen',

  accentColor: 'violet' as const,

  header: {
    brand: { name: 'headless.ly', href: '/' },
    navigation: [
      { label: 'Content', href: '/content' },
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/headless.ly', variant: 'ghost' as const },
      { label: 'Connect Your Repository', href: '/signup', variant: 'primary' as const },
    ],
  },

  hero: {
    eyebrow: 'Branch Your Content',
    headline: 'Content is Code',
    description: 'Content changes should be reviewed, staged, and deployed with the same rigor as code changes. Store content in MDX, version with Git, enhance with AI.',
    primaryAction: { label: 'Connect Your Repository', href: '/docs/quickstart' },
    secondaryAction: { label: 'See the Editor', href: '/demo' },
  },

  features: {
    headline: 'End the Content/Code Disconnect',
    description: 'Content and code in the same workflow. Finally.',
    features: [
      {
        title: 'Git-Native',
        description: 'Content lives in your repository. Branch it, PR it, merge it. Full version history forever.',
      },
      {
        title: 'Deploy Together',
        description: 'Content changes deploy with code changes. Branch previews include content. No sync issues.',
      },
      {
        title: 'AI-Enhanced',
        description: 'Generate drafts, improve copy, translate content. AI as your writing partner, not replacement.',
      },
      {
        title: 'Type-Safe Schemas',
        description: 'Define content types in TypeScript. Catch errors at build time, not runtime.',
      },
      {
        title: 'Visual Editor',
        description: 'Non-technical users edit in a friendly UI. Developers use their IDE. Same content.',
      },
      {
        title: 'Zero Lock-in',
        description: 'Your content is always just files. Export and leave anytime.',
      },
    ],
  },

  testimonials: {
    headline: 'Content Teams Love Git',
    testimonials: [
      {
        quote: 'Content changes finally go through PR review. We caught two embarrassing typos last week that would have hit production.',
        author: {
          name: 'Emma Watson',
          title: 'Content Lead',
          company: 'TechBlog',
        },
      },
      {
        quote: 'Migrated from Contentful and our staging environments finally include real content. Game changer.',
        author: {
          name: 'Ryan Park',
          title: 'CTO',
          company: 'MediaCo',
        },
      },
    ],
  },

  pricing: {
    headline: 'Start Free, Scale Later',
    description: 'Free tier for personal projects. Pro for teams.',
    tiers: [
      {
        name: 'Free',
        price: { monthly: '$0' },
        features: ['1 project', 'Unlimited content', 'Git storage', 'Community support'],
        cta: 'Start Free',
      },
      {
        name: 'Pro',
        price: { monthly: '$29' },
        features: ['Unlimited projects', 'AI features', 'Team collaboration', 'Priority support', 'Analytics'],
        cta: 'Go Pro',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: { monthly: 'Custom' },
        features: ['Custom deployment', 'SSO', 'Dedicated support', 'SLA', 'Custom AI models'],
        cta: 'Contact Sales',
      },
    ],
  },

  footer: {
    brand: {
      name: 'headless.ly',
      description: 'Content management for developers.',
    },
    columns: [
      {
        title: 'Product',
        links: [
          { text: 'Documentation', href: '/docs' },
          { text: 'Content Types', href: '/content' },
          { text: 'API', href: '/api' },
          { text: 'Pricing', href: '#pricing' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { text: 'GitHub', href: 'https://github.com/mdx-org/headless.ly' },
          { text: 'Discord', href: '/discord' },
          { text: 'Blog', href: '/blog' },
        ],
      },
    ],
    legal: {
      copyright: '© 2024 headless.ly',
    },
  },
}

export function HeadlessSite() {
  return <LumenLayout {...headlessData} />
}

export default HeadlessSite

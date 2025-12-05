/**
 * db.ht - HyperText Database
 */

import React from 'react'
import { SonicLayout } from '@mdxui/shadcnblocks/templates'

export const dbHtData = {
  name: 'db.ht',
  title: 'HyperText Database - A Database You Can Browse',
  description: 'Every record has a URL. Every relationship is a link. Your data is as navigable as the web.',
  layout: 'sonic',

  header: {
    brand: { name: 'db.ht', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Collections', href: '/collections' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/db.ht', variant: 'ghost' as const },
      { label: 'Browse the Demo', href: '/demo', variant: 'primary' as const },
    ],
  },

  hero: {
    eyebrow: 'Click Your Data',
    headline: 'A Database You Can Browse',
    description: 'What if you could explore your database like a website? Click a user, see their orders. Click an order, see its items. Navigate data by following links.',
    primaryAction: { label: 'Browse the Demo Database', href: '/demo' },
    secondaryAction: { label: 'Read the Docs', href: '/docs' },
    stats: [
      { value: '10M+', label: 'Records stored' },
      { value: '<10ms', label: 'Query latency' },
      { value: '99.99%', label: 'Uptime' },
    ],
  },

  features: {
    headline: 'Stop Building Admin Panels',
    description: 'Browse any record by its URL. Navigate relationships by clicking links.',
    features: [
      {
        title: 'Every Record is a URL',
        description: 'db.ht/users/alice is a real, shareable, bookmarkable link to a specific record.',
      },
      {
        title: 'Click Through Relationships',
        description: 'Navigate your data like a website. No SQL required to explore.',
      },
      {
        title: 'Instant API',
        description: 'Every collection is automatically an API. CRUD operations with zero config.',
      },
      {
        title: 'Let Claude Query',
        description: 'MCP integration lets your team query data via Claude Desktop. Natural language meets structured data.',
      },
      {
        title: 'Semantic Search',
        description: 'Vector search built-in. Find similar records without writing embeddings code.',
      },
      {
        title: 'Edge-Native',
        description: 'Deployed to 200+ locations. Your data is fast everywhere.',
      },
    ],
  },

  testimonials: {
    headline: 'Data for Everyone',
    testimonials: [
      {
        quote: 'We stopped building admin dashboards. Now stakeholders just browse the data themselves.',
        author: { name: 'Maya Patel', title: 'Founder', company: 'StartupXYZ' },
      },
      {
        quote: 'The MCP integration means anyone on our team can query production data via Claude. Game-changing.',
        author: { name: 'James Chen', title: 'Engineering Lead', company: 'DataFirst' },
      },
    ],
  },

  pricing: {
    headline: 'Simple, Predictable Pricing',
    description: 'No surprises. Pay for what you use.',
    tiers: [
      {
        name: 'Free',
        price: { monthly: '$0' },
        features: ['1 database', '10K records', '100K reads/month', 'Community support'],
        cta: 'Start Free',
      },
      {
        name: 'Pro',
        price: { monthly: '$29' },
        features: ['Unlimited databases', '1M records', 'Unlimited reads', 'Vector search', 'Priority support'],
        cta: 'Go Pro',
        featured: true,
      },
      {
        name: 'Scale',
        price: { monthly: '$99' },
        features: ['Everything in Pro', '10M records', 'Dedicated support', 'SLA', 'Custom domains'],
        cta: 'Contact Sales',
      },
    ],
  },

  footer: {
    brand: { name: 'db.ht', description: 'The browsable database.' },
    columns: [
      {
        title: 'Product',
        links: [
          { text: 'Documentation', href: '/docs' },
          { text: 'API Reference', href: '/api' },
          { text: 'MCP Server', href: '/mcp' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { text: 'GitHub', href: 'https://github.com/mdx-org/db.ht' },
          { text: 'Discord', href: '/discord' },
        ],
      },
    ],
    legal: { copyright: '© 2024 db.ht. All rights reserved.' },
  },
}

export function DbHtSite() {
  return <SonicLayout {...dbHtData} />
}

export default DbHtSite

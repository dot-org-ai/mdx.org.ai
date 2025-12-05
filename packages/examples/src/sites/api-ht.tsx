/**
 * api.ht - HyperText API
 */

import React from 'react'
import { ScalarLayout } from '@mdxui/shadcnblocks/templates'

export const apiHtData = {
  name: 'api.ht',
  title: 'HyperText API - APIs You Can Click',
  description: 'Build APIs that work like the web was meant to—where every resource is a URL you can click, browse, and understand.',
  layout: 'scalar',

  header: {
    brand: { name: 'api.ht', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/api.ht', variant: 'ghost' as const },
      { label: 'Build Your First API', href: '/docs/quickstart', variant: 'primary' as const },
    ],
  },

  hero: {
    badge: 'Every Resource is a URL',
    title: 'APIs You Can Click',
    description: 'The best documentation is no documentation needed. Build APIs where every response includes links to related resources—navigable in a browser, queryable in code.',
    primaryAction: { label: 'Build Your First API', href: '/docs' },
    secondaryAction: { label: 'Browse Example APIs', href: '/api' },
  },

  features: {
    headline: 'Self-Documenting by Design',
    description: 'Stop answering "what\'s the endpoint?" Start sharing clickable URLs.',
    features: [
      {
        title: 'Navigate with Links',
        description: 'Every response includes links to related resources. Clients discover the API by following links, not reading docs.',
      },
      {
        title: 'Content Negotiation',
        description: 'Same URL serves JSON for code, HTML for browsers, Markdown for AI. Accept header decides.',
      },
      {
        title: 'Browser-Native',
        description: 'Open any endpoint in your browser and see human-readable output. Debug without Postman.',
      },
      {
        title: 'Meaningful URLs',
        description: 'Resources have stable, shareable URLs. /users/alice/orders/123 is a real, clickable link.',
      },
      {
        title: 'Type-Safe Schemas',
        description: 'Define resources in MDX with TypeScript types. Validation and autocomplete included.',
      },
      {
        title: 'Edge-Native',
        description: 'Deploy to Cloudflare Workers globally. Your API is fast everywhere.',
      },
    ],
  },

  testimonials: {
    headline: 'APIs That Explain Themselves',
    testimonials: [
      {
        quote: 'New team members explore our API in their browser on day one. The docs write themselves.',
        author: {
          name: 'Alex Thompson',
          title: 'Backend Lead',
          company: 'DataFlow',
          avatar: 'https://i.pravatar.cc/150?u=alex',
        },
      },
      {
        quote: 'I stopped answering "what endpoint do I use?" questions. Now I just share URLs.',
        author: {
          name: 'Jordan Lee',
          title: 'Senior Engineer',
          company: 'APIFirst',
          avatar: 'https://i.pravatar.cc/150?u=jordan',
        },
      },
      {
        quote: 'Finally, an API framework that works with the web instead of against it.',
        author: {
          name: 'Sam Wilson',
          title: 'CTO',
          company: 'WebNative',
          avatar: 'https://i.pravatar.cc/150?u=sam',
        },
      },
    ],
  },

  pricing: {
    headline: 'Open Source, Standards-Based',
    description: 'Free forever. Built on HTTP semantics that have worked for 30 years.',
    tiers: [
      {
        name: 'Open Source',
        description: 'Everything you need to build great APIs.',
        price: { monthly: '$0', yearly: '$0' },
        features: ['Unlimited endpoints', 'All features', 'Community support', 'MIT License'],
        cta: 'Get Started',
      },
      {
        name: 'Pro',
        description: 'For teams building production APIs.',
        price: { monthly: '$19', yearly: '$190' },
        features: ['Priority support', 'Team collaboration', 'Analytics dashboard', 'Custom domains', 'SLA'],
        cta: 'Start Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        description: 'For organizations with advanced needs.',
        price: { monthly: 'Custom', yearly: 'Custom' },
        features: ['Dedicated support', 'Custom integrations', 'On-premise deployment', 'SSO', 'Audit logs'],
        cta: 'Contact Us',
      },
    ],
  },

  faq: {
    headline: 'FAQ',
    items: [
      {
        question: 'What is HATEOAS?',
        answer: 'Hypermedia as the Engine of Application State. It means API responses include links telling clients what actions are available.',
      },
      {
        question: 'How is this different from OpenAPI/Swagger?',
        answer: 'OpenAPI documents your API externally. api.ht makes your API self-documenting.',
      },
      {
        question: 'Can I use this with my existing API?',
        answer: 'Yes! api.ht can wrap existing APIs or be used for new projects.',
      },
    ],
  },

  cta: {
    headline: 'Ready to build better APIs?',
    description: 'Join developers building APIs the way the web intended.',
    action: { label: 'Get Started Free', href: '/docs/quickstart' },
  },

  footer: {
    brand: {
      name: 'api.ht',
      description: 'HyperText APIs for the modern web.',
    },
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
          { text: 'GitHub', href: 'https://github.com/mdx-org/api.ht' },
          { text: 'Discord', href: '/discord' },
          { text: 'Blog', href: '/blog' },
        ],
      },
    ],
    legal: {
      copyright: '© 2024 api.ht. Open source under MIT.',
      links: [
        { text: 'Privacy', href: '/privacy' },
        { text: 'Terms', href: '/terms' },
      ],
    },
  },
}

export function ApiHtSite() {
  return <ScalarLayout {...apiHtData} />
}

export default ApiHtSite

/**
 * agentic.md - AI Agents in Markdown
 */

import React from 'react'
import { DuskLayout } from '@mdxui/tailark/templates'

export const agenticData = {
  name: 'agentic.md',
  title: 'AI Agents in Markdown',
  description: 'Ship intelligent automation in hours, not weeks. Build powerful AI agents without wrestling with complex frameworks.',
  layout: 'dusk',

  gradient: 'purple-blue' as const,
  glow: true,

  header: {
    brand: { name: 'agentic.md', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Gallery', href: '/gallery' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/agentic.md', variant: 'ghost' as const },
      { label: 'Create Your First Agent', href: '/docs/quickstart', variant: 'primary' as const },
    ],
  },

  hero: {
    announcement: { text: 'Claude, GPT-4, and Gemini support', href: '/docs/models' },
    headline: 'Write Markdown, Get Agents',
    description: 'The fastest path from idea to deployed AI agent. Define tools, memory, and behaviors in a format anyone can read—no framework complexity, no boilerplate.',
    primaryAction: { label: 'Create Your First Agent', href: '/docs/quickstart' },
    secondaryAction: { label: 'See Example Agents', href: '/gallery' },
    trustedBy: [
      { name: 'Anthropic' },
      { name: 'Vercel' },
      { name: 'Supabase' },
      { name: 'Resend' },
    ],
  },

  features: {
    headline: 'Ship Agents in Hours, Not Weeks',
    description: 'Complexity is optional. Capability is guaranteed.',
    features: [
      {
        title: 'Write Markdown',
        description: 'Create an .mdx file with your agent\'s personality, tools, and behavior. If you can write a README, you can write an agent.',
      },
      {
        title: 'Deploy Instantly',
        description: 'One command deploys to Cloudflare Workers globally. No Docker, no Kubernetes, no infrastructure headaches.',
      },
      {
        title: 'Multi-Model Support',
        description: 'Works with Claude, GPT-4, Gemini, and any OpenAI-compatible API. Switch models without changing code.',
      },
      {
        title: 'Type-Safe Tools',
        description: 'Define tools with TypeScript. Get full type inference, validation, and autocomplete.',
      },
      {
        title: 'Built-in Memory',
        description: 'Conversation history, vector storage, and persistent state—production-ready from day one.',
      },
      {
        title: 'MCP Compatible',
        description: 'Expose your agents via Model Context Protocol for Claude Desktop and IDE integration.',
      },
    ],
  },

  testimonials: {
    headline: 'From Idea to Production',
    testimonials: [
      {
        quote: 'We went from "let\'s try AI" to deployed agents in a single sprint. The Markdown format meant our product managers could contribute directly.',
        author: {
          name: 'Sarah Chen',
          title: 'Head of AI',
          company: 'DevTools Inc',
        },
      },
      {
        quote: 'Finally, agent code that reads like documentation. New engineers understand our AI features on day one.',
        author: {
          name: 'Marcus Rivera',
          title: 'CTO',
          company: 'AIStartup',
        },
      },
    ],
  },

  pricing: {
    headline: 'Start Free, Scale Confidently',
    description: 'Open source for builders. Cloud for teams who want to move even faster.',
    tiers: [
      {
        name: 'Open Source',
        price: { monthly: '$0' },
        features: ['Unlimited agents', 'All model providers', 'Full feature access', 'Community support', 'MIT License'],
        cta: 'Get Started',
      },
      {
        name: 'Cloud',
        price: { monthly: '$29' },
        features: ['Managed global deployment', 'Auto-scaling', 'Real-time analytics', 'Priority support', 'Team collaboration'],
        cta: 'Start Free Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: { monthly: 'Custom' },
        features: ['Dedicated infrastructure', 'SLA guarantee', 'SSO & audit logs', 'Custom integrations', 'On-premise option'],
        cta: 'Talk to Us',
      },
    ],
  },

  footer: {
    brand: {
      name: 'agentic.md',
      description: 'The fastest path from idea to deployed AI agent.',
    },
    columns: [
      {
        title: 'Product',
        links: [
          { text: 'Documentation', href: '/docs' },
          { text: 'API Reference', href: '/api' },
          { text: 'MCP Server', href: '/mcp' },
          { text: 'Agent Gallery', href: '/gallery' },
        ],
      },
      {
        title: 'Community',
        links: [
          { text: 'GitHub', href: 'https://github.com/mdx-org/agentic.md' },
          { text: 'Discord', href: '/discord' },
          { text: 'Blog', href: '/blog' },
          { text: 'Changelog', href: '/changelog' },
        ],
      },
    ],
    legal: {
      copyright: '© 2024 agentic.md. Open source under MIT.',
    },
  },
}

export function AgenticSite() {
  return <DuskLayout {...agenticData} />
}

export default AgenticSite

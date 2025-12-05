/**
 * advertis.ng - AI Advertising Platform
 */

import React from 'react'
import { DuskLayout } from '@mdxui/tailark/templates'

export const advertisData = {
  name: 'advertis.ng',
  title: 'AI Advertising - Ads That Optimize Themselves',
  description: 'Your ads write, test, and optimize themselves. Turn ad spend into an intelligent system instead of a guessing game.',
  layout: 'dusk',

  gradient: 'orange-red' as const,
  glow: true,

  header: {
    brand: { name: 'advertis.ng', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Templates', href: '/templates' },
      { label: 'Pricing', href: '#pricing' },
    ],
    actions: [
      { label: 'Login', href: '/login', variant: 'ghost' as const },
      { label: 'Generate Your First Campaign', href: '/signup', variant: 'primary' as const },
    ],
  },

  hero: {
    announcement: { text: 'Now with Meta & Google Ads integration', href: '/blog/integrations' },
    headline: 'Ads That Optimize Themselves',
    description: 'Stop writing ad copy variations. Stop guessing what works. AI generates hundreds of variants, tests continuously, and moves budget to winners—automatically.',
    primaryAction: { label: 'Generate Your First Campaign', href: '/signup' },
    secondaryAction: { label: 'See Case Studies', href: '/cases' },
    trustedBy: [
      { name: 'Shopify' },
      { name: 'BigCommerce' },
      { name: 'WooCommerce' },
    ],
  },

  features: {
    headline: 'Stop Writing Ads. Start Scaling Results.',
    description: 'AI creative at the speed of your spend.',
    features: [
      {
        title: 'AI Generates Variants',
        description: 'Hundreds of headline/body/CTA combinations targeting your specific audience. You approve, AI creates.',
      },
      {
        title: 'Continuous Testing',
        description: 'Multi-armed bandit testing finds winners faster than traditional A/B. Budget flows to performers automatically.',
      },
      {
        title: 'Smart Targeting',
        description: 'AI analyzes your best customers and finds lookalikes at scale.',
      },
      {
        title: 'Image Generation',
        description: 'AI creates visuals that convert. Product shots, lifestyle images, banners—all on-brand.',
      },
      {
        title: 'Multi-Platform',
        description: 'Meta, Google, LinkedIn, TikTok. One campaign definition, deployed everywhere.',
      },
      {
        title: '24/7 Optimization',
        description: 'AI adjusts bids, pauses underperformers, and scales winners while you sleep.',
      },
    ],
  },

  testimonials: {
    headline: 'Results, Not Effort',
    testimonials: [
      {
        quote: 'ROAS went from 2x to 5x in the first month. The AI found audiences we never would have thought to target.',
        author: {
          name: 'Jessica Mills',
          title: 'CMO',
          company: 'ShopDirect',
        },
      },
      {
        quote: 'I used to spend hours writing ad copy variations. Now I review AI drafts over morning coffee and scale what works.',
        author: {
          name: 'Tom Bradley',
          title: 'Marketing Director',
          company: 'BrandCo',
        },
      },
    ],
  },

  pricing: {
    headline: 'Pricing That Scales',
    description: 'Pay based on ad spend. No hidden fees.',
    tiers: [
      {
        name: 'Starter',
        price: { monthly: '$99' },
        features: ['Up to $5K ad spend', 'AI copywriting', 'Basic targeting', 'Email support'],
        cta: 'Start Free Trial',
      },
      {
        name: 'Growth',
        price: { monthly: '$299' },
        features: ['Up to $25K ad spend', 'Image generation', 'Advanced targeting', 'A/B testing', 'Priority support'],
        cta: 'Start Free Trial',
        featured: true,
      },
      {
        name: 'Enterprise',
        price: { monthly: 'Custom' },
        features: ['Unlimited spend', 'Custom AI models', 'Dedicated manager', 'API access', 'SLA'],
        cta: 'Contact Sales',
      },
    ],
  },

  footer: {
    brand: {
      name: 'advertis.ng',
      description: 'AI-powered advertising.',
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
          { text: 'Case Studies', href: '/cases' },
          { text: 'Blog', href: '/blog' },
        ],
      },
    ],
    legal: {
      copyright: '© 2024 advertis.ng',
    },
  },
}

export function AdvertisSite() {
  return <DuskLayout {...advertisData} />
}

export default AdvertisSite

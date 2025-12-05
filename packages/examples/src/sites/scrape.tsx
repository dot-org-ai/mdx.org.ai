/**
 * scrape.md - Web Scraping for AI
 */

import React from 'react'
import { MistLayout } from '@mdxui/tailark/templates'

export const scrapeData = {
  name: 'scrape.md',
  title: 'Web Scraping for AI - Let AI Read the Web',
  description: 'Turn any webpage into clean, structured markdown—so AI can read the web as easily as you do.',
  layout: 'mist',

  accentColor: 'cyan' as const,
  warmth: 'cool' as const,

  header: {
    brand: { name: 'scrape.md', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Try It', href: '/try' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/scrape.md', variant: 'ghost' as const },
      { label: 'Scrape a Page Now', href: '/try', variant: 'primary' as const },
    ],
  },

  hero: {
    headline: 'Let AI Read the Web',
    description: 'One API call. Any webpage. Clean markdown back. Give your AI agents the ability to read and understand any URL without maintaining scrapers.',
    primaryAction: { label: 'Scrape a Page Now', href: '/try' },
    secondaryAction: { label: 'See Output Examples', href: '/examples' },
  },

  features: {
    headline: 'Web Scraping, Without the Scraping',
    description: 'Focus on building, not parsing HTML.',
    features: [
      { title: 'AI-Ready Output', description: 'Clean markdown optimized for LLM context windows. Headings, lists, links—all preserved.' },
      { title: 'JavaScript Rendering', description: 'Handles SPAs and client-rendered content automatically. We run the browser, you get the content.' },
      { title: 'Ethical by Default', description: 'Respects robots.txt, implements rate limiting. Scrape responsibly without thinking about it.' },
      { title: 'Edge-Cached', description: 'Results cached globally. Repeated requests return in milliseconds.' },
      { title: 'MCP Server', description: 'Add "read the web" to any AI agent. Works with Claude Desktop out of the box.' },
      { title: 'Batch & Parallel', description: 'Process hundreds of URLs concurrently. Build RAG pipelines at scale.' },
    ],
  },

  testimonials: {
    headline: 'AI Builders Love Scrape.md',
    testimonials: [
      { quote: 'Our AI agents can now read any URL. The Markdown output slots perfectly into prompts.', author: { name: 'Lisa Park', title: 'ML Engineer' } },
      { quote: 'Replaced our entire scraping infrastructure with one API. Fresh content for our RAG pipeline, zero maintenance.', author: { name: 'David Kim', title: 'AI Lead' } },
    ],
  },

  pricing: {
    headline: 'Pay for Success',
    description: 'Simple per-page pricing. No monthly minimums. Failed extractions are free.',
    tiers: [
      { name: 'Free', price: { monthly: '$0' }, features: ['100 pages/month', 'Basic rendering', 'Community support'], cta: 'Start Free' },
      { name: 'Pro', price: { monthly: '$19' }, features: ['10K pages/month', 'JavaScript rendering', 'Priority queue', 'API support'], cta: 'Go Pro', featured: true },
      { name: 'Scale', price: { monthly: '$99' }, features: ['100K pages/month', 'Dedicated workers', 'Custom extraction', 'SLA'], cta: 'Contact Sales' },
    ],
  },

  footer: {
    brand: { name: 'scrape.md', description: 'Turn any webpage into AI-ready markdown.' },
    columns: [
      { title: 'Product', links: [{ text: 'Documentation', href: '/docs' }, { text: 'API', href: '/api' }, { text: 'Try It', href: '/try' }] },
      { title: 'Resources', links: [{ text: 'GitHub', href: 'https://github.com/mdx-org/scrape.md' }, { text: 'Status', href: '/status' }] },
    ],
    legal: { copyright: '© 2024 scrape.md' },
  },
}

export function ScrapeSite() {
  return <MistLayout {...scrapeData} />
}

export default ScrapeSite

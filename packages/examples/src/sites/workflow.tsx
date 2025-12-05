/**
 * workflow.md - Workflows in Markdown
 */

import React from 'react'
import { QuartzLayout } from '@mdxui/tailark/templates'

export const workflowData = {
  name: 'workflow.md',
  title: 'Workflows in Markdown - Automation You Can PR Review',
  description: 'Define automation workflows in markdown—readable by humans, executable by machines, version-controlled like code.',
  layout: 'quartz',

  accentColor: 'amber' as const,

  header: {
    brand: { name: 'workflow.md', href: '/' },
    navigation: [
      { label: 'Docs', href: '/docs' },
      { label: 'API', href: '/api' },
      { label: 'MCP', href: '/mcp' },
      { label: 'Templates', href: '/templates' },
    ],
    actions: [
      { label: 'GitHub', href: 'https://github.com/mdx-org/workflow.md', variant: 'ghost' as const },
      { label: 'Write Your First Workflow', href: '/docs/quickstart', variant: 'primary' as const },
    ],
  },

  hero: {
    headline: 'Automation That Reads Like Documentation',
    description: 'What if "what happens when a user signs up?" had an answer you could read? Define workflows in markdown. Review them in PRs. Deploy with git push.',
    primaryAction: { label: 'Write Your First Workflow', href: '/docs/quickstart' },
    secondaryAction: { label: 'See Workflow Examples', href: '/templates' },
  },

  features: {
    headline: 'Git Push Your Business Logic',
    description: 'Workflows you can PR review. Automation that lives in your repository.',
    features: [
      { title: 'Readable by Everyone', description: 'Workflows are markdown files. Anyone can read what happens and when.' },
      { title: 'Version-Controlled', description: 'Full git history. See exactly what changed and when. Roll back confidently.' },
      { title: 'Event-Driven', description: 'Trigger on webhooks, schedules, or custom events. React to anything.' },
      { title: 'Powerful Logic', description: 'Conditionals, loops, parallel execution, error handling. Full programming power.' },
      { title: 'AI Steps', description: 'Call Claude, GPT-4, or any AI model as a workflow step. Intelligent automation.' },
      { title: 'Full Observability', description: 'Execution traces for every run. Debug failures with context.' },
    ],
  },

  testimonials: {
    headline: 'Automation That Makes Sense',
    testimonials: [
      { quote: 'Our ops workflows went from scattered scripts to documented, reviewable, deployable code. New hires understand them on day one.', author: { name: 'Rachel Torres', title: 'DevOps Lead' } },
      { quote: 'We finally PR review our automation. Caught three bugs before they hit production last month alone.', author: { name: 'Mike Chen', title: 'VP Engineering' } },
    ],
  },

  pricing: {
    headline: 'Open Source Core',
    description: 'Free to run yourself. Cloud for teams who want managed infrastructure.',
    tiers: [
      { name: 'Open Source', price: { monthly: '$0' }, features: ['Unlimited workflows', 'Self-hosted', 'All integrations', 'MIT License'], cta: 'Get Started' },
      { name: 'Cloud', price: { monthly: '$49' }, features: ['Managed hosting', 'Team collaboration', 'Full execution history', 'Priority support'], cta: 'Start Trial', featured: true },
      { name: 'Enterprise', price: { monthly: 'Custom' }, features: ['Dedicated infrastructure', 'SSO', 'Audit logs', 'SLA'], cta: 'Contact Sales' },
    ],
  },

  footer: {
    brand: { name: 'workflow.md', description: 'Workflows you can PR review.' },
    columns: [
      { title: 'Product', links: [{ text: 'Documentation', href: '/docs' }, { text: 'Templates', href: '/templates' }, { text: 'API', href: '/api' }] },
      { title: 'Resources', links: [{ text: 'GitHub', href: 'https://github.com/mdx-org/workflow.md' }, { text: 'Discord', href: '/discord' }] },
    ],
    legal: { copyright: '© 2024 workflow.md' },
  },
}

export function WorkflowSite() {
  return <QuartzLayout {...workflowData} />
}

export default WorkflowSite

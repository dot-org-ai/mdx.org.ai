# markt.ng

AI Marketing Services.

## Overview

AI-powered marketing automation. Generate campaigns, analyze performance, and optimize messaging—all driven by AI.

## Services

### Content Generation

```ts
const campaign = await markt.generate({
  type: 'email-campaign',
  product: 'SaaS Analytics Tool',
  audience: 'startup founders',
  tone: 'professional',
  goals: ['awareness', 'trial-signup']
})

// Returns:
// - Subject lines (5 variants)
// - Email body
// - CTA options
// - Send time recommendations
```

### A/B Testing

```ts
const test = await markt.test({
  variants: [
    { subject: 'Boost your metrics today' },
    { subject: 'Analytics that actually help' }
  ],
  audience: 'segment_startup_founders',
  metric: 'open_rate',
  duration: '7d'
})
```

### Audience Analysis

```ts
const insights = await markt.analyze({
  audience: 'existing_customers',
  dimensions: ['behavior', 'preferences', 'churn_risk']
})
```

### Campaign Optimization

```ts
const optimized = await markt.optimize({
  campaign: 'summer_launch',
  budget: 10000,
  goals: { conversions: 500 },
  constraints: { cpa: 20 }
})
```

## Channels

- **Email** - Campaigns, sequences, newsletters
- **Social** - Posts, ads, engagement
- **Content** - Blog posts, landing pages
- **Ads** - Copy, targeting, bidding

## Integrations

- Mailchimp, SendGrid, Postmark
- Meta Ads, Google Ads, LinkedIn
- HubSpot, Salesforce
- Analytics platforms

## Getting Started

```bash
npx mdxe dev examples/markt.ng
```

## Pricing

| Plan | Credits/mo | Features |
|------|------------|----------|
| Starter | 1,000 | Basic generation |
| Pro | 10,000 | A/B testing, analytics |
| Enterprise | Unlimited | Custom models, dedicated support |

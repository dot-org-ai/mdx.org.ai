# advertis.ng

AI Advertising Platform.

## Overview

Generate, test, and optimize advertising campaigns with AI. Create ad copy, images, and landing pages. Run experiments automatically. Scale what works.

## Capabilities

### Ad Generation

```ts
const ads = await advertis.generate({
  product: {
    name: 'CloudSync Pro',
    description: 'Real-time file synchronization',
    price: '$9/mo'
  },
  platform: 'meta',  // or 'google', 'linkedin', 'tiktok'
  objective: 'conversions',
  audience: {
    interests: ['technology', 'productivity'],
    demographics: { age: '25-45', income: 'high' }
  },
  count: 10  // Generate 10 variants
})

// Returns ad variants with:
// - Headlines
// - Body copy
// - Call-to-action
// - Image prompts
// - Targeting suggestions
```

### Image Generation

```ts
const images = await advertis.images({
  product: 'CloudSync Pro',
  style: 'modern-minimal',
  dimensions: { width: 1200, height: 628 },  // Meta feed
  variants: 5
})
```

### Experimentation

```ts
const experiment = await advertis.experiment({
  campaign: 'q4_launch',
  variants: ads,
  budget: 1000,
  duration: '7d',
  metrics: ['ctr', 'cpa', 'roas']
})

// AI automatically:
// - Allocates budget to winners
// - Pauses underperformers
// - Generates new variants based on learnings
```

### Optimization

```ts
const optimized = await advertis.optimize({
  campaign: 'q4_launch',
  goal: 'maximize_roas',
  constraints: {
    budget: 50000,
    cpa_max: 25
  }
})
```

## Platforms

- **Meta** - Facebook, Instagram
- **Google** - Search, Display, YouTube
- **LinkedIn** - Sponsored content, InMail
- **TikTok** - In-feed, TopView
- **Twitter/X** - Promoted tweets

## Features

- **Multi-Variant Testing** - Test hundreds of variants
- **Automated Optimization** - AI manages budget allocation
- **Creative Generation** - Copy, images, video
- **Landing Page Builder** - High-converting pages
- **Analytics** - Real-time performance tracking

## Getting Started

```bash
npx mdxe dev examples/advertis.ng
```

## Connect Platforms

```ts
await advertis.connect('meta', { accessToken: '...' })
await advertis.connect('google', { credentials: '...' })
```

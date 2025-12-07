# @mdxui/tailark

Conversion-optimized marketing blocks from Tailark, mapped to MDXUI abstract types. Beautiful, responsive components for landing pages and marketing sites.

## Installation

```bash
pnpm add @mdxui/tailark
```

Requires peer dependencies:

```bash
pnpm add react react-dom
```

## Usage

### Hero Sections

```tsx
import { Hero01, Hero02 } from '@mdxui/tailark/blocks'

function LandingPage() {
  return (
    <Hero01
      headline="Ship faster with pre-built blocks"
      subheadline="Beautiful marketing components that convert"
      primaryCTA={{ text: 'Start Free Trial', href: '/signup' }}
      secondaryCTA={{ text: 'View Demo', href: '/demo' }}
      image="/hero.png"
    />
  )
}
```

### Features

```tsx
import { Features01 } from '@mdxui/tailark/blocks'

function Features() {
  return (
    <Features01
      headline="Everything you need"
      features={[
        { icon: '⚡', title: 'Fast', description: 'Optimized for performance' },
        { icon: '🎨', title: 'Beautiful', description: 'Tailwind-powered design' }
      ]}
    />
  )
}
```

### Pricing

```tsx
import { Pricing01 } from '@mdxui/tailark/blocks'

function Pricing() {
  return (
    <Pricing01
      tiers={[
        {
          name: 'Starter',
          price: '$29',
          features: ['Feature 1', 'Feature 2'],
          cta: { text: 'Get Started', href: '/signup' }
        }
      ]}
    />
  )
}
```

## Block Categories

- **Hero** - High-converting landing page heroes
- **Features** - Product feature showcases
- **Integrations** - Partner and integration displays
- **Testimonials** - Social proof and reviews
- **Pricing** - Pricing tables optimized for conversion
- **FAQ** - Common questions with answers
- **Footer** - Marketing site footers
- **Auth** - Authentication pages

## Templates

Pre-composed page layouts:

```tsx
import { LandingPageTemplate } from '@mdxui/tailark/templates'

function Home() {
  return <LandingPageTemplate sections={[...]} />
}
```

## Exports

```ts
// Marketing blocks
import * from '@mdxui/tailark/blocks'

// Page templates
import * from '@mdxui/tailark/templates'

// Layout components
import * from '@mdxui/tailark/templates/layouts'
```

Built on `@mdxui/shadcn` with Tailwind CSS styling.

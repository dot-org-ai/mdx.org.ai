# @mdxui/shadcnblocks

959+ shadcn/ui blocks across 40+ categories, mapped to MDXUI abstract Site/App types. Production-ready, copy-paste marketing and application components.

## Installation

```bash
pnpm add @mdxui/shadcnblocks
```

Requires peer dependencies:

```bash
pnpm add react react-dom
```

## Usage

### Marketing Blocks

```tsx
import { HeroSection, FeaturesGrid, PricingCards } from '@mdxui/shadcnblocks/blocks'

function LandingPage() {
  return (
    <>
      <HeroSection
        title="Build faster with MDX"
        subtitle="Component blocks for modern websites"
        cta={{ text: 'Get Started', href: '/docs' }}
      />
      <FeaturesGrid features={[...]} />
      <PricingCards plans={[...]} />
    </>
  )
}
```

### Page Templates

```tsx
import { MarketingLayout } from '@mdxui/shadcnblocks/templates/layouts'

function App() {
  return (
    <MarketingLayout
      header={...}
      footer={...}
    >
      {children}
    </MarketingLayout>
  )
}
```

## Block Categories

- **Hero** - Landing page heroes with CTAs
- **Features** - Feature grids, lists, and highlights
- **Pricing** - Pricing tables and comparison cards
- **Testimonials** - Customer quotes and reviews
- **Stats** - Metric displays and counters
- **Logos** - Partner and client logo grids
- **CTA** - Call-to-action sections
- **FAQ** - Accordion-based Q&A
- **Team** - Team member cards
- **Blog** - Post grids and article layouts
- **Contact** - Contact forms and info sections
- **Header** - Navigation bars and menus
- **Footer** - Site footers with links
- **Auth** - Sign in/up forms
- **Bento** - Bento grid layouts
- **Error Page** - 404 and error states

## Exports

```ts
// All blocks
import * from '@mdxui/shadcnblocks/blocks'

// Templates and layouts
import * from '@mdxui/shadcnblocks/templates'
import * from '@mdxui/shadcnblocks/templates/layouts'

// TypeScript types
import type { HeroProps, FeatureProps } from '@mdxui/shadcnblocks'
```

Built on top of `@mdxui/shadcn` with shadcn/ui primitives.

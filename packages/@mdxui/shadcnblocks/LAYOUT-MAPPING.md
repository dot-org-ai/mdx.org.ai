# Layout Type Mapping

This document shows how shadcnblocks templates map to our unified @mdxui Layout types.

## Layout Translation Summary

### ScalarLayout (scalar.tsx) - SaaS Landing

**Original:** shadcnblocks "Scalar" template
**Use Case:** Complete SaaS product landing pages
**Sections:** 10 major sections

| Section | Unified Type | Required | Notes |
|---------|-------------|----------|-------|
| Header | `HeaderBlockProps` | ✓ | Sticky navigation with actions |
| Hero | `HeroBlockProps` | ✓ | Badge, dual CTAs, image support |
| Logo Cloud | `LogoCloudBlockProps` | ○ | Social proof section |
| Features | `FeaturesBlockProps` | ✓ | 3-column grid by default |
| Stats | `StatsBlockProps` | ○ | Key metrics display |
| Testimonials | `TestimonialsBlockProps` | ✓ | Customer quotes with avatars |
| Pricing | `PricingBlockProps` | ✓ | Multi-tier pricing with toggle |
| FAQ | Custom `FAQProps` | ○ | Q&A section |
| CTA | `CTABlockProps` | ✓ | Final conversion section |
| Footer | `FooterBlockProps` | ✓ | Multi-column with legal |

**Complete Interface:**
```typescript
interface ScalarLayoutProps {
  header: HeaderBlockProps
  hero: HeroBlockProps
  logoCloud?: LogoCloudBlockProps
  features: FeaturesBlockProps
  stats?: StatsBlockProps
  testimonials: TestimonialsBlockProps
  pricing: PricingBlockProps
  faq?: {
    headline?: string
    description?: string
    items: Array<{ question: string; answer: string }>
  }
  cta: CTABlockProps
  footer: FooterBlockProps
}
```

---

### SonicLayout (sonic.tsx) - Product Launch

**Original:** shadcnblocks "Sonic" template
**Use Case:** Product launches, demo-first pages
**Sections:** 6 major sections

| Section | Unified Type | Required | Notes |
|---------|-------------|----------|-------|
| Header | `HeaderBlockProps` | ✓ | Minimal navigation, single CTA |
| Hero + Demo | `HeroBlockProps + DemoProps` | ✓ | Integrated demo (video/image/iframe) |
| Logo Cloud | `LogoCloudBlockProps` | ○ | Immediate social proof |
| Features | `FeaturesBlockProps` | ✓ | Top 3-6 benefits |
| Social/Testimonials | `TestimonialsBlockProps` | ○ | With ratings and avatars |
| Pricing | `PricingBlockProps` | ○ | Simple, 1-3 tiers |
| Footer | `FooterBlockProps` | ✓ | Minimal single-row layout |

**Complete Interface:**
```typescript
interface SonicLayoutProps {
  header: HeaderBlockProps
  hero: HeroBlockProps & { demo?: DemoProps }
  logoCloud?: LogoCloudBlockProps
  features: FeaturesBlockProps
  social?: {
    testimonials: TestimonialsBlockProps
  }
  pricing?: PricingBlockProps
  footer: FooterBlockProps
}

interface DemoProps {
  type: 'video' | 'image' | 'interactive'
  video?: { src: string; poster?: string; autoplay?: boolean }
  image?: { src: string; alt: string }
  iframe?: { src: string; title: string }
  caption?: string
}
```

---

### LumenLayout (lumen.tsx) - Modern Minimal

**Original:** shadcnblocks "Lumen" template
**Use Case:** Content-first sites, blogs, portfolios
**Sections:** 4 major sections + flexible content

| Section | Unified Type | Required | Notes |
|---------|-------------|----------|-------|
| Header | `LumenHeaderProps` | ✓ | Clean minimal navigation |
| Hero | `LumenHeroProps` | ✓ | Simple tagline + title |
| Content Blocks | `ContentBlockProps[]` | ✓ | Flexible array of blocks |
| Footer | `LumenFooterProps` | ✓ | Single-column minimal |

**Content Block Types:**

| Block Type | Props | Use Case |
|------------|-------|----------|
| `text` | `text: string \| ReactNode` | Rich text content |
| `image` | `image: { src, alt, caption }` | Full-width images |
| `quote` | `quote: { text, author, source }` | Pull quotes |
| `grid` | `grid: { columns, items[] }` | 2-4 column grids |
| `divider` | - | Section dividers |
| `custom` | `custom: ReactNode` | Any React component |

**Complete Interface:**
```typescript
interface LumenLayoutProps {
  header: LumenHeaderProps
  hero: LumenHeroProps
  content: ContentBlockProps[]
  footer: LumenFooterProps
}

interface ContentBlockProps {
  type: 'text' | 'image' | 'quote' | 'grid' | 'divider' | 'custom'
  text?: string | ReactNode
  image?: { src: string; alt: string; caption?: string }
  quote?: { text: string; author?: string; source?: string }
  grid?: {
    columns?: 2 | 3 | 4
    items: Array<{
      title?: string
      description?: string
      image?: string
      icon?: ReactNode
      href?: string
    }>
  }
  custom?: ReactNode
  id?: string
  background?: 'none' | 'subtle' | 'accent'
}
```

---

## Unified Block Props Reference

All layouts use consistent block prop types from `@mdxui/shadcnblocks/types`:

### HeaderBlockProps
```typescript
{
  logo?: ReactNode
  brand?: { name: string; href: string }
  navigation: Array<{
    label: string
    href: string
    children?: Array<{
      label: string
      href: string
      description?: string
    }>
  }>
  actions?: Array<{
    label: string
    href: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }>
  mobileVariant?: 'drawer' | 'dropdown' | 'fullscreen'
  sticky?: boolean
}
```

### HeroBlockProps
```typescript
{
  badge?: string                           // Small tagline above title
  title: string                           // Main headline
  description?: string                    // Supporting text
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  image?: { src: string; alt: string }
  video?: { src: string; poster?: string }
  background?: 'none' | 'gradient' | 'dots' | 'grid' | 'glow'
  variant?: 'centered' | 'split' | 'image-right' | 'image-left' | 'video'
  children?: ReactNode
}
```

### FeaturesBlockProps
```typescript
{
  headline?: string
  description?: string
  features: Array<{
    icon?: ReactNode
    title: string
    description: string
    href?: string
  }>
  variant?: 'grid' | 'cards' | 'list' | 'bento' | 'alternating'
  columns?: 2 | 3 | 4
}
```

### PricingBlockProps
```typescript
{
  headline?: string
  description?: string
  billingToggle?: boolean                 // Show monthly/annual toggle
  tiers: Array<{
    name: string
    description?: string
    price: {
      monthly: string | number
      annual?: string | number
    }
    features: string[]
    cta: string
    ctaHref?: string
    featured?: boolean                    // Highlight this tier
    badge?: string                        // "Most Popular", etc.
  }>
  variant?: 'cards' | 'table' | 'horizontal'
}
```

### TestimonialsBlockProps
```typescript
{
  headline?: string
  testimonials: Array<{
    quote: string
    author: {
      name: string
      title?: string
      company?: string
      avatar?: string
    }
    rating?: number                       // 1-5 stars
    logo?: string                         // Company logo
  }>
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee'
}
```

### LogoCloudBlockProps
```typescript
{
  title?: string                          // "Trusted by leading companies"
  logos: Array<{
    src: string
    alt: string
    href?: string
  }>
  variant?: 'grid' | 'marquee' | 'animated'
}
```

### StatsBlockProps
```typescript
{
  stats: Array<{
    value: string | number
    label: string
    trend?: {
      value: string
      type: 'up' | 'down' | 'neutral'
    }
  }>
  variant?: 'cards' | 'inline' | 'centered'
}
```

### CTABlockProps
```typescript
{
  headline: string
  description?: string
  primaryAction: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  background?: 'none' | 'gradient' | 'pattern' | 'image'
  variant?: 'centered' | 'split' | 'banner'
}
```

### FooterBlockProps
```typescript
{
  logo?: ReactNode
  brand?: { name: string; description?: string }
  columns: Array<{
    title: string
    links: Array<{
      label: string
      href: string
    }>
  }>
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
    instagram?: string
  }
  legal?: {
    copyright?: string
    links?: Array<{
      label: string
      href: string
    }>
  }
  newsletter?: boolean
  variant?: 'simple' | 'columns' | 'mega'
}
```

---

## Design Patterns

### Pattern 1: Marketing Page (ScalarLayout)

**When to use:** Full SaaS marketing site with all sections

**Structure:**
```
Header (sticky)
  ↓
Hero (centered with CTA)
  ↓
Logo Cloud (social proof)
  ↓
Features (3-column grid)
  ↓
Stats (metrics bar)
  ↓
Testimonials (customer quotes)
  ↓
Pricing (tiered plans)
  ↓
FAQ (common questions)
  ↓
CTA (final conversion)
  ↓
Footer (multi-column)
```

**Key characteristics:**
- Comprehensive - all major marketing sections
- Conversion-focused - multiple CTAs throughout
- Social proof - logos, testimonials, stats
- Feature-rich - detailed product information

---

### Pattern 2: Product Launch (SonicLayout)

**When to use:** Launching a new product or major feature

**Structure:**
```
Header (minimal)
  ↓
Hero + Demo (prominent visual)
  ↓
Logo Cloud (immediate credibility)
  ↓
Features (top 3-6 benefits)
  ↓
Testimonials (with ratings)
  ↓
Pricing (simple, 1-3 tiers)
  ↓
Footer (minimal)
```

**Key characteristics:**
- Demo-first - prominent product showcase
- Focused - fewer sections, more impact
- Simple pricing - easy decision making
- Quick to scan - designed for short attention spans

---

### Pattern 3: Content Site (LumenLayout)

**When to use:** Blogs, portfolios, documentation, content-first sites

**Structure:**
```
Header (clean)
  ↓
Hero (title + tagline)
  ↓
Content Blocks (flexible)
  - Text sections
  - Images with captions
  - Pull quotes
  - Grid layouts
  - Custom components
  ↓
Footer (minimal)
```

**Key characteristics:**
- Content-first - emphasis on typography and readability
- Flexible - array of content blocks
- Minimal UI - let content shine
- Editorial feel - like a high-quality magazine

---

## Customization Examples

### Example 1: Scalar with Custom Section Order

```typescript
<ScalarLayout
  header={header}
  hero={hero}
  // Start with social proof
  logoCloud={logoCloud}
  testimonials={testimonials}
  // Then features and pricing
  features={features}
  pricing={pricing}
  // Skip stats and FAQ
  cta={cta}
  footer={footer}
/>
```

### Example 2: Sonic with Extended Demo

```typescript
<SonicLayout
  header={header}
  hero={{
    ...hero,
    demo: {
      type: 'interactive',
      iframe: {
        src: 'https://demo.example.com',
        title: 'Interactive demo',
      },
      caption: 'Try it yourself - no signup required',
    },
  }}
  features={features}
  footer={footer}
/>
```

### Example 3: Lumen with Mixed Content

```typescript
<LumenLayout
  header={header}
  hero={hero}
  content={[
    {
      type: 'text',
      text: '<h2>Introduction</h2><p>Our story...</p>',
    },
    {
      type: 'image',
      image: {
        src: '/team.jpg',
        alt: 'Our team',
        caption: 'The team behind the product',
      },
    },
    {
      type: 'quote',
      quote: {
        text: 'This changed how we work.',
        author: 'Jane Doe',
        source: 'CEO, Acme Corp',
      },
    },
    {
      type: 'grid',
      grid: {
        columns: 3,
        items: servicesData,
      },
    },
    {
      type: 'custom',
      custom: <CustomInteractiveComponent />,
    },
  ]}
  footer={footer}
/>
```

---

## Variant System

Each layout and block supports variants for customization:

### Hero Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| `centered` | Default centered layout | Most landing pages |
| `split` | Content left, media right | SaaS products |
| `image-right` | Image on right side | Feature highlights |
| `image-left` | Image on left side | Alternative layouts |
| `video` | Full-width video hero | Product demos |

### Features Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| `grid` | Simple grid layout | Standard features |
| `cards` | Card-based layout | Detailed features |
| `list` | Vertical list | Long descriptions |
| `bento` | Bento box grid | Visual features |
| `alternating` | Alternating layout | Image-heavy features |

### Pricing Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| `cards` | Card-based tiers | 2-4 pricing tiers |
| `table` | Comparison table | Feature comparison |
| `horizontal` | Horizontal scroll | 5+ pricing tiers |

### Testimonials Variants

| Variant | Description | Best For |
|---------|-------------|----------|
| `cards` | Grid of cards | Standard testimonials |
| `carousel` | Scrolling carousel | Many testimonials |
| `masonry` | Masonry layout | Varying lengths |
| `marquee` | Animated marquee | Continuous display |

---

## Migration Guide

### From Legacy Templates

**LandingPage → ScalarLayout:**
```typescript
// Before
import { LandingPage } from '@mdxui/shadcnblocks/templates'

// After
import { ScalarLayout } from '@mdxui/shadcnblocks/templates/layouts'
```

**SaaSTemplate → SonicLayout:**
```typescript
// Before
import { SaaSTemplate } from '@mdxui/shadcnblocks/templates'

// After
import { SonicLayout } from '@mdxui/shadcnblocks/templates/layouts'
```

**Benefits:**
1. More features and customization options
2. Consistent prop interfaces
3. Better TypeScript support
4. Access to variant system
5. Easier to extend

---

## Next Steps

1. **Choose a layout** based on your use case
2. **Review the props** in the interface definitions
3. **Start with defaults** and customize gradually
4. **Experiment with variants** to find the right look
5. **Extend as needed** with custom sections

## Resources

- Layout implementations: `/packages/@mdxui/shadcnblocks/src/templates/layouts/`
- Type definitions: `/packages/@mdxui/shadcnblocks/src/types/index.ts`
- Documentation: `/packages/@mdxui/shadcnblocks/src/templates/layouts/README.md`
- Examples: (coming soon)

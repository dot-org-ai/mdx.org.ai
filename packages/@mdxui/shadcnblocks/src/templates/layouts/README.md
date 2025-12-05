# Template Layouts

Production-ready page layouts translated from shadcnblocks templates to use unified @mdxui prop types.

## Overview

This directory contains complete page layouts that demonstrate:

1. **Unified Props** - How shadcnblocks templates map to our abstract component types
2. **Template Patterns** - Common page structures for different use cases
3. **Customization** - Variants and options for each layout type
4. **Consistency** - Standard naming and prop interfaces across layouts

## Available Layouts

### ScalarLayout - Complete SaaS Landing

**Use case:** Full-featured SaaS product landing pages with all standard marketing sections

**Structure:**
- Header (sticky navigation with CTA)
- Hero (badge, headline, description, dual CTAs, image)
- Logo Cloud (social proof)
- Features (3-column grid)
- Stats (metrics)
- Testimonials (customer quotes)
- Pricing (tiered plans with toggle)
- FAQ (Q&A section)
- Final CTA (conversion section)
- Footer (multi-column with legal)

**Props:**
```typescript
interface ScalarLayoutProps {
  header: HeaderBlockProps
  hero: HeroBlockProps
  logoCloud?: LogoCloudBlockProps
  features: FeaturesBlockProps
  stats?: StatsBlockProps
  testimonials: TestimonialsBlockProps
  pricing: PricingBlockProps
  faq?: FAQProps
  cta: CTABlockProps
  footer: FooterBlockProps
}
```

**Example:**
```tsx
import { ScalarLayout } from '@mdxui/shadcnblocks/templates/layouts'

<ScalarLayout
  header={{
    brand: { name: 'Acme SaaS', href: '/' },
    navigation: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'About', href: '/about' },
    ],
    actions: [
      { label: 'Sign In', href: '/login', variant: 'ghost' },
      { label: 'Get Started', href: '/signup', variant: 'primary' },
    ],
  }}
  hero={{
    badge: 'New: AI-powered insights',
    title: 'Build faster with modern SaaS tools',
    description: 'The complete platform for building, deploying, and scaling your applications.',
    primaryAction: { label: 'Start Free Trial', href: '/signup' },
    secondaryAction: { label: 'View Demo', href: '/demo' },
    image: { src: '/hero-image.png', alt: 'Product screenshot' },
  }}
  // ... other sections
/>
```

---

### SonicLayout - Product Launch

**Use case:** Product launches, new feature announcements, demo-first pages

**Structure:**
- Header (minimal navigation, prominent CTA)
- Hero with Demo (integrated video/screenshot/interactive)
- Logo Cloud (immediate social proof)
- Features (top 3-6 benefits)
- Testimonials (with ratings and avatars)
- Pricing (simple, 1-3 tiers)
- Footer (minimal)

**Props:**
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

**Example:**
```tsx
import { SonicLayout } from '@mdxui/shadcnblocks/templates/layouts'

<SonicLayout
  header={{
    brand: { name: 'ProductName', href: '/' },
    navigation: [{ label: 'Demo', href: '#demo' }],
    actions: [{ label: 'Request Access', href: '/signup', variant: 'primary' }],
  }}
  hero={{
    badge: 'Launching Soon',
    title: 'The future of productivity',
    description: 'Experience the next generation of work tools.',
    primaryAction: { label: 'Get Early Access', href: '/signup' },
    demo: {
      type: 'video',
      video: { src: '/demo.mp4', autoplay: true },
      caption: 'See it in action',
    },
  }}
  // ... other sections
/>
```

---

### LumenLayout - Modern Minimal

**Use case:** Content-first sites, blogs, documentation, portfolios

**Structure:**
- Header (clean, minimal navigation)
- Hero (tagline, title, description, optional visual)
- Content Blocks (flexible array of sections)
  - Text blocks (rich content)
  - Image blocks (full-width with captions)
  - Quote blocks (pull quotes)
  - Grid blocks (2-4 columns of items)
  - Dividers (section breaks)
  - Custom blocks (any React component)
- Footer (minimal links and social)

**Props:**
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

**Example:**
```tsx
import { LumenLayout } from '@mdxui/shadcnblocks/templates/layouts'

<LumenLayout
  header={{
    brand: { name: 'Studio', href: '/' },
    navigation: [
      { label: 'Work', href: '/work' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  }}
  hero={{
    tagline: 'Design Studio',
    title: 'Creating beautiful digital experiences',
    description: 'We craft thoughtful solutions for ambitious brands.',
  }}
  content={[
    {
      type: 'text',
      text: '<p>Our approach combines research, design, and technology...</p>',
    },
    {
      type: 'image',
      image: {
        src: '/project-showcase.jpg',
        alt: 'Featured project',
        caption: 'Recent work for Client X',
      },
    },
    {
      type: 'grid',
      grid: {
        columns: 3,
        items: [
          {
            title: 'Brand Identity',
            description: 'Visual systems that tell your story',
            icon: <IconBrush />,
          },
          {
            title: 'Digital Products',
            description: 'Apps and platforms that delight',
            icon: <IconPhone />,
          },
          {
            title: 'Web Design',
            description: 'Beautiful, functional websites',
            icon: <IconGlobe />,
          },
        ],
      },
    },
  ]}
  footer={{
    brand: { name: 'Studio', description: 'Design & Development' },
    links: [
      { label: 'Twitter', href: 'https://twitter.com/...' },
      { label: 'LinkedIn', href: 'https://linkedin.com/...' },
    ],
  }}
/>
```

## Mapping to Unified Types

All layouts use consistent prop interfaces from `@mdxui/shadcnblocks/types`:

### Shared Block Props

```typescript
// Header/Navigation
HeaderBlockProps {
  logo?: ReactNode
  brand?: { name: string; href: string }
  navigation: Array<{ label: string; href: string; children?: ... }>
  actions?: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' | 'ghost' }>
  sticky?: boolean
}

// Hero Section
HeroBlockProps {
  badge?: string
  title: string
  description?: string
  primaryAction?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  image?: { src: string; alt: string }
  video?: { src: string; poster?: string }
  background?: 'none' | 'gradient' | 'dots' | 'grid' | 'glow'
  variant?: 'centered' | 'split' | 'image-right' | 'image-left' | 'video'
}

// Features Section
FeaturesBlockProps {
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

// Pricing Section
PricingBlockProps {
  headline?: string
  description?: string
  billingToggle?: boolean
  tiers: Array<{
    name: string
    description?: string
    price: { monthly: string | number; annual?: string | number }
    features: string[]
    cta: string
    ctaHref?: string
    featured?: boolean
    badge?: string
  }>
  variant?: 'cards' | 'table' | 'horizontal'
}

// Testimonials Section
TestimonialsBlockProps {
  headline?: string
  testimonials: Array<{
    quote: string
    author: {
      name: string
      title?: string
      company?: string
      avatar?: string
    }
    rating?: number
    logo?: string
  }>
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee'
}

// CTA Section
CTABlockProps {
  headline: string
  description?: string
  primaryAction: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  background?: 'none' | 'gradient' | 'pattern' | 'image'
  variant?: 'centered' | 'split' | 'banner'
}

// Footer
FooterBlockProps {
  logo?: ReactNode
  brand?: { name: string; description?: string }
  columns: Array<{
    title: string
    links: Array<{ label: string; href: string }>
  }>
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
    instagram?: string
  }
  legal?: {
    copyright?: string
    links?: Array<{ label: string; href: string }>
  }
  newsletter?: boolean
  variant?: 'simple' | 'columns' | 'mega'
}
```

## Design Principles

### 1. Unified Props
All layouts use consistent prop interfaces. A `HeroBlockProps` is the same whether used in Scalar, Sonic, or Lumen.

### 2. Composability
Layouts are composed of reusable block components. Each section (hero, features, pricing) can be:
- Used independently
- Customized with variants
- Extended with new props
- Replaced with custom implementations

### 3. Accessibility
All layouts include:
- Semantic HTML (`<header>`, `<main>`, `<section>`, `<footer>`)
- ARIA labels (`role="banner"`, `aria-label="Hero"`)
- Keyboard navigation support
- Screen reader friendly structure

### 4. Responsive Design
- Mobile-first approach
- Breakpoint utilities (sm, md, lg)
- Touch-friendly interactions
- Adaptive layouts

### 5. Theming
Uses CSS variables from shadcn/ui:
- `--background`, `--foreground`
- `--primary`, `--primary-foreground`
- `--muted`, `--muted-foreground`
- `--border`, `--accent`

## Customization

### Variant System

Each block supports variants for different visual styles:

```tsx
// Hero variants
hero={{ variant: 'centered' }}        // Default: centered content
hero={{ variant: 'split' }}            // Split: content left, media right
hero={{ variant: 'image-right' }}      // Image on right
hero={{ variant: 'video' }}            // Full-width video

// Features variants
features={{ variant: 'grid' }}         // Grid layout
features={{ variant: 'cards' }}        // Card-based
features={{ variant: 'bento' }}        // Bento grid
features={{ variant: 'alternating' }}  // Alternating layout

// Pricing variants
pricing={{ variant: 'cards' }}         // Card layout
pricing={{ variant: 'table' }}         // Table comparison
pricing={{ variant: 'horizontal' }}    // Horizontal scroll
```

### Background Options

Sections can have different background styles:

```tsx
// Hero backgrounds
hero={{ background: 'gradient' }}      // Gradient overlay
hero={{ background: 'dots' }}          // Dot pattern
hero={{ background: 'grid' }}          // Grid pattern
hero={{ background: 'glow' }}          // Glow effect

// Content block backgrounds (Lumen)
content={[
  { type: 'text', background: 'none' },     // Transparent
  { type: 'text', background: 'subtle' },   // Light background
  { type: 'text', background: 'accent' },   // Accent color
]}
```

### Extending Layouts

You can extend layouts with custom sections:

```tsx
import { ScalarLayout } from './layouts/scalar'

function CustomScalarLayout(props) {
  return (
    <>
      <ScalarLayout {...props} />

      {/* Add custom section after footer */}
      <section className="py-20">
        <div className="container mx-auto">
          {/* Custom content */}
        </div>
      </section>
    </>
  )
}
```

## Migration from Legacy Templates

### From LandingPage to ScalarLayout

```tsx
// Before
import { LandingPage } from '@mdxui/shadcnblocks/templates'

<LandingPage
  header={{ ... }}
  hero={{ ... }}
  features={{ ... }}
  footer={{ ... }}
/>

// After
import { ScalarLayout } from '@mdxui/shadcnblocks/templates/layouts'

<ScalarLayout
  header={{ ... }}
  hero={{ ... }}
  features={{ ... }}
  // Add new sections available in Scalar
  logoCloud={{ ... }}
  stats={{ ... }}
  testimonials={{ ... }}
  pricing={{ ... }}
  faq={{ ... }}
  cta={{ ... }}
  footer={{ ... }}
/>
```

### From SaaSTemplate to SonicLayout

```tsx
// Before
import { SaaSTemplate } from '@mdxui/shadcnblocks/templates'

<SaaSTemplate
  name="ProductName"
  tagline="Launch announcement"
  headline="Amazing product"
  cta={{ label: 'Get Started', href: '/signup' }}
  demo={{ type: 'video', src: '/demo.mp4' }}
/>

// After
import { SonicLayout } from '@mdxui/shadcnblocks/templates/layouts'

<SonicLayout
  header={{
    brand: { name: 'ProductName', href: '/' },
    navigation: [],
    actions: [{ label: 'Get Started', href: '/signup', variant: 'primary' }],
  }}
  hero={{
    badge: 'Launch announcement',
    title: 'Amazing product',
    primaryAction: { label: 'Get Started', href: '/signup' },
    demo: {
      type: 'video',
      video: { src: '/demo.mp4', autoplay: true },
    },
  }}
  features={{ ... }}
  footer={{ ... }}
/>
```

## Best Practices

### 1. Start with a Layout

Choose the layout that best fits your use case:
- **ScalarLayout** for comprehensive marketing pages
- **SonicLayout** for product launches and demos
- **LumenLayout** for content-focused pages

### 2. Customize Gradually

Start with the default layout, then customize:
1. Fill in required props
2. Add optional sections
3. Adjust variants
4. Customize styling

### 3. Maintain Consistency

Use the same prop interfaces across your site:
- Same `HeaderBlockProps` on every page
- Consistent `FooterBlockProps`
- Reusable feature/pricing data

### 4. Test Responsiveness

Check your layout on:
- Mobile (< 640px)
- Tablet (640px - 1024px)
- Desktop (> 1024px)

### 5. Optimize Performance

- Lazy load images
- Use next/image or similar
- Minimize layout shifts
- Preload critical assets

## Next Steps

1. **Try the layouts** - Start with ScalarLayout for a full example
2. **Customize props** - Adjust sections to match your content
3. **Add variants** - Experiment with different visual styles
4. **Extend** - Create custom sections as needed
5. **Share patterns** - Document reusable patterns for your team

## Resources

- [shadcnblocks.com](https://shadcnblocks.com) - Original template inspiration
- [shadcn/ui](https://ui.shadcn.com) - Component library and theming
- [@mdxui/shadcnblocks Types](../types/index.ts) - Full type definitions

# Type Hierarchy and Mapping

Visual reference showing how shadcnblocks layouts map to unified @mdxui types.

## Type Hierarchy

```
@mdxui/shadcnblocks/types
├── HeaderBlockProps
├── FooterBlockProps
├── HeroBlockProps
├── FeaturesBlockProps
├── PricingBlockProps
├── TestimonialsBlockProps
├── LogoCloudBlockProps
├── StatsBlockProps
├── CTABlockProps
├── TeamBlockProps
├── BlogBlockProps
├── ContactBlockProps
└── ... (40+ block types)

@mdxui/shadcnblocks/templates/layouts
├── ScalarLayoutProps
│   ├── header: HeaderBlockProps
│   ├── hero: HeroBlockProps
│   ├── logoCloud?: LogoCloudBlockProps
│   ├── features: FeaturesBlockProps
│   ├── stats?: StatsBlockProps
│   ├── testimonials: TestimonialsBlockProps
│   ├── pricing: PricingBlockProps
│   ├── faq?: FAQProps
│   ├── cta: CTABlockProps
│   └── footer: FooterBlockProps
│
├── SonicLayoutProps
│   ├── header: HeaderBlockProps
│   ├── hero: HeroBlockProps & { demo?: DemoProps }
│   ├── logoCloud?: LogoCloudBlockProps
│   ├── features: FeaturesBlockProps
│   ├── social?: { testimonials: TestimonialsBlockProps }
│   ├── pricing?: PricingBlockProps
│   └── footer: FooterBlockProps
│
└── LumenLayoutProps
    ├── header: LumenHeaderProps
    ├── hero: LumenHeroProps
    ├── content: ContentBlockProps[]
    └── footer: LumenFooterProps
```

## Layout Complexity Matrix

| Layout | Sections | Props | Complexity | Best For |
|--------|----------|-------|------------|----------|
| **Scalar** | 10 | High | Complex | Full SaaS marketing site |
| **Sonic** | 6 | Medium | Moderate | Product launches, demos |
| **Lumen** | 4 + blocks | Low | Simple | Content sites, portfolios |

## Section Usage Across Layouts

| Section | Scalar | Sonic | Lumen | Unified Type |
|---------|--------|-------|-------|--------------|
| Header | Required | Required | Custom | `HeaderBlockProps` |
| Hero | Required | Required | Custom | `HeroBlockProps` |
| Demo | - | Optional | - | `DemoProps` (Sonic) |
| Logo Cloud | Optional | Optional | - | `LogoCloudBlockProps` |
| Features | Required | Required | Grid blocks | `FeaturesBlockProps` |
| Stats | Optional | - | - | `StatsBlockProps` |
| Testimonials | Required | Optional | - | `TestimonialsBlockProps` |
| Pricing | Required | Optional | - | `PricingBlockProps` |
| FAQ | Optional | - | - | Custom `FAQProps` |
| CTA | Required | - | - | `CTABlockProps` |
| Content Blocks | - | - | Required | `ContentBlockProps[]` |
| Footer | Required | Required | Custom | `FooterBlockProps` |

## Prop Reusability

### Shared Across All Layouts

These props can be used in any layout:
- `HeaderBlockProps` - Header/navigation
- `FooterBlockProps` - Footer
- `HeroBlockProps` - Hero section
- `FeaturesBlockProps` - Features section

### Layout-Specific

These props are specialized for certain layouts:
- `DemoProps` - Sonic only (integrated demo)
- `FAQProps` - Scalar only (Q&A section)
- `ContentBlockProps` - Lumen only (flexible content)
- `LumenHeaderProps` - Lumen only (minimal header)
- `LumenHeroProps` - Lumen only (minimal hero)
- `LumenFooterProps` - Lumen only (minimal footer)

## Type Composition Patterns

### Pattern 1: Intersection Types (Sonic Hero + Demo)

```typescript
// Sonic extends Hero with demo
hero: HeroBlockProps & { demo?: DemoProps }

// Usage
<SonicLayout
  hero={{
    // Standard HeroBlockProps
    title: 'Product Launch',
    description: 'Amazing new features',
    primaryAction: { ... },

    // Additional DemoProps
    demo: {
      type: 'video',
      video: { src: '/demo.mp4' },
    },
  }}
/>
```

### Pattern 2: Optional Sections

```typescript
// Scalar with optional sections
interface ScalarLayoutProps {
  header: HeaderBlockProps         // Required
  hero: HeroBlockProps             // Required
  logoCloud?: LogoCloudBlockProps  // Optional
  stats?: StatsBlockProps          // Optional
  faq?: FAQProps                   // Optional
  // ...
}

// Usage - omit optional sections
<ScalarLayout
  header={header}
  hero={hero}
  features={features}
  // Skip logoCloud, stats, faq
  testimonials={testimonials}
  pricing={pricing}
  cta={cta}
  footer={footer}
/>
```

### Pattern 3: Array of Flexible Content (Lumen)

```typescript
// Lumen with flexible content blocks
content: ContentBlockProps[]

// Usage - compose any blocks
<LumenLayout
  content={[
    { type: 'text', text: '...' },
    { type: 'image', image: { ... } },
    { type: 'quote', quote: { ... } },
    { type: 'grid', grid: { ... } },
    { type: 'custom', custom: <Component /> },
  ]}
/>
```

### Pattern 4: Nested Objects (Social Section)

```typescript
// Sonic with nested social section
social?: {
  testimonials: TestimonialsBlockProps
}

// Usage
<SonicLayout
  social={{
    testimonials: {
      headline: 'What people say',
      testimonials: [ ... ],
    },
  }}
/>
```

## Variant Inheritance

Some props support variants for different visual styles:

```typescript
// Hero variants (all layouts)
HeroBlockProps {
  variant?: 'centered' | 'split' | 'image-right' | 'image-left' | 'video'
}

// Features variants (Scalar, Sonic)
FeaturesBlockProps {
  variant?: 'grid' | 'cards' | 'list' | 'bento' | 'alternating'
}

// Pricing variants (Scalar, Sonic)
PricingBlockProps {
  variant?: 'cards' | 'table' | 'horizontal'
}

// Testimonials variants (Scalar, Sonic)
TestimonialsBlockProps {
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee'
}

// Footer variants (all layouts)
FooterBlockProps {
  variant?: 'simple' | 'columns' | 'mega'
}
```

## Type Extensions

How to extend layouts with custom types:

### Extend Scalar with Custom Section

```typescript
import type { ScalarLayoutProps } from './layouts/scalar'

interface ExtendedScalarProps extends ScalarLayoutProps {
  // Add custom section
  comparison?: {
    headline: string
    items: Array<{
      feature: string
      us: boolean
      competitor: boolean
    }>
  }
}

function ExtendedScalar(props: ExtendedScalarProps) {
  return (
    <>
      <ScalarLayout {...props} />
      {props.comparison && (
        <section>
          {/* Custom comparison table */}
        </section>
      )}
    </>
  )
}
```

### Extend Block Props with Variants

```typescript
import type { HeroBlockProps } from '@mdxui/shadcnblocks/types'

interface ExtendedHeroProps extends HeroBlockProps {
  // Add custom props
  animation?: 'fade' | 'slide' | 'zoom'
  countdown?: {
    endDate: Date
    label: string
  }
}
```

### Create Custom Content Block Type

```typescript
import type { ContentBlockProps } from './layouts/lumen'

// Add new block type
type ExtendedContentBlockProps =
  | ContentBlockProps
  | {
      type: 'video'
      video: {
        src: string
        poster?: string
        controls?: boolean
      }
    }
  | {
      type: 'form'
      form: {
        fields: Array<{
          name: string
          type: string
          label: string
        }>
        action: string
      }
    }
```

## Type Safety Benefits

### 1. Compile-Time Validation

```typescript
// Error: missing required 'title' prop
<ScalarLayout
  header={header}
  hero={{ description: 'Missing title' }} // ❌ Error
  // ...
/>

// Success: all required props
<ScalarLayout
  header={header}
  hero={{ title: 'Hello', description: '...' }} // ✓ Valid
  // ...
/>
```

### 2. IntelliSense Support

```typescript
// IDE shows all available props
<ScalarLayout
  hero={{
    title: 'Hello',
    // IDE suggests: badge, description, primaryAction, etc.
    |
  }}
/>
```

### 3. Refactoring Safety

```typescript
// Rename prop in type definition
interface HeroBlockProps {
  title: string
  subtitle?: string  // renamed from 'description'
}

// TypeScript shows all usage locations that need updating
```

## Prop Transformation Patterns

### Converting Between Layouts

**SaaSTemplate → SonicLayout:**
```typescript
// Old simple props
const saasProps: SaaSTemplateProps = {
  name: 'Product',
  headline: 'Amazing',
  cta: { label: 'Start', href: '/signup' },
}

// Transform to Sonic
const sonicProps: SonicLayoutProps = {
  header: {
    brand: { name: saasProps.name, href: '/' },
    actions: [{ ...saasProps.cta, variant: 'primary' }],
    navigation: [],
  },
  hero: {
    title: saasProps.headline,
    primaryAction: saasProps.cta,
  },
  // ...
}
```

**Scalar → Custom Layout:**
```typescript
// Reuse Scalar sections in custom order
function CustomLayout(props: ScalarLayoutProps) {
  return (
    <>
      <Header {...props.header} />

      {/* Custom order */}
      <Hero {...props.hero} />
      <Testimonials {...props.testimonials} />  // Social proof first
      <Features {...props.features} />          // Then features
      <Pricing {...props.pricing} />
      <CTA {...props.cta} />

      <Footer {...props.footer} />
    </>
  )
}
```

## Type Naming Conventions

| Convention | Example | Usage |
|------------|---------|-------|
| `*BlockProps` | `HeroBlockProps` | Individual section/block |
| `*LayoutProps` | `ScalarLayoutProps` | Complete page layout |
| `*Props` (custom) | `DemoProps`, `FAQProps` | Specialized props |
| `Lumen*Props` | `LumenHeaderProps` | Layout-specific variant |
| `*BlockProps[]` | `ContentBlockProps[]` | Array of blocks |

## Best Practices

### 1. Prefer Composition Over Extension

```typescript
// Good: Compose with existing types
interface MyLayoutProps {
  header: HeaderBlockProps
  customSection: CustomProps
  footer: FooterBlockProps
}

// Avoid: Extending and modifying
interface MyLayoutProps extends ScalarLayoutProps {
  // Changes to Scalar affect this
}
```

### 2. Use Type Unions for Variants

```typescript
// Good: Explicit variant union
type HeroVariant = 'centered' | 'split' | 'image-right' | 'image-left'

// Avoid: String type (no autocomplete)
variant?: string
```

### 3. Make Optional Props Obvious

```typescript
// Good: Clear what's required vs optional
interface Props {
  title: string              // Required
  description?: string       // Optional
  badge?: string            // Optional
}

// Avoid: Everything optional (unclear requirements)
interface Props {
  title?: string
  description?: string
  badge?: string
}
```

### 4. Document Complex Types

```typescript
/**
 * Demo section props
 *
 * Supports video, image, or interactive iframe demos.
 * Only one demo type should be provided.
 */
interface DemoProps {
  /** Type of demo to display */
  type: 'video' | 'image' | 'interactive'

  /** Video props (when type='video') */
  video?: { src: string; poster?: string; autoplay?: boolean }

  // ... more props
}
```

## Reference Documentation

For complete type definitions, see:
- Block types: `/packages/@mdxui/shadcnblocks/src/types/index.ts`
- Layout types: `/packages/@mdxui/shadcnblocks/src/templates/layouts/*.tsx`
- Usage examples: `/packages/@mdxui/shadcnblocks/src/templates/layouts/README.md`

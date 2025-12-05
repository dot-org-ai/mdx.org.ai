# MDXUI Component Gaps Analysis

This document summarizes gaps identified in `@mdxui/html` components/types/props after porting templates from shadcnblocks, Tremor, Mantine, and Tailark.

## Summary

After analyzing 4 major UI libraries and their block/template offerings, the following gaps were identified in our abstract Site/App component types.

---

## 1. Missing Section Types in @mdxui/html

### Currently Have
- Hero
- Features
- Pricing
- FAQ
- Testimonials
- Stats
- Logos
- Newsletter
- CTA
- Timeline

### Missing Sections
| Section | Found In | Priority |
|---------|----------|----------|
| **Team** | shadcnblocks, Tailark | High |
| **Gallery** | shadcnblocks | Medium |
| **Blog** | shadcnblocks, Tailark | High |
| **Contact** | shadcnblocks, Tailark | High |
| **Comparison** | shadcnblocks | Medium |
| **Integrations** | Tailark | Medium |
| **Bento Grid** | shadcnblocks | Medium |

---

## 2. Missing Page Types

### Authentication Pages (GAP - Not in @mdxui/html)
- Login
- Signup
- Forgot Password
- Reset Password
- Verify Email
- Two-Factor Auth

### Error Pages (GAP - Not in @mdxui/html)
- 404 Not Found
- 500 Server Error
- 403 Forbidden
- 401 Unauthorized
- Maintenance

---

## 3. Props Gaps in Existing Sections

### HeroProps - Missing
```typescript
interface HeroProps {
  // Current props...

  // MISSING:
  badge?: string              // Announcement badge (Tailark, shadcnblocks)
  announcement?: {            // Announcement banner
    text: string
    href?: string
  }
  video?: {                   // Video support
    src: string
    poster?: string
  }
  background?: 'none' | 'gradient' | 'dots' | 'grid' | 'glow' | 'pattern'
  trustedBy?: Array<{         // Inline logo cloud
    src: string
    alt: string
  }>
  variant?: 'centered' | 'split' | 'split-reverse' | 'video' | 'minimal'
}
```

### FeaturesProps - Missing
```typescript
interface Feature {
  // Current props...

  // MISSING:
  image?: string              // Feature image
  href?: string               // Feature link
}

interface FeaturesProps {
  // MISSING:
  variant?: 'grid' | 'cards' | 'list' | 'bento' | 'alternating'
  columns?: 2 | 3 | 4
}
```

### PricingProps - Missing
```typescript
interface PricingTier {
  // Current props...

  // MISSING:
  badge?: string              // "Popular", "Best Value"
  features: Array<{
    text: string
    included: boolean         // Show included/excluded state
  }>
}

interface PricingProps {
  // MISSING:
  billingToggle?: boolean     // Monthly/annual toggle
  variant?: 'cards' | 'table' | 'horizontal'
  faq?: FAQItem[]             // Inline FAQ below pricing
}
```

### TestimonialsProps - Missing
```typescript
interface Testimonial {
  // Current props...

  // MISSING:
  rating?: number             // Star rating
  logo?: string               // Company logo
  featured?: boolean          // Highlight this testimonial
}

interface TestimonialsProps {
  // MISSING:
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee' | 'wall'
}
```

### StatsProps - Missing
```typescript
interface Stat {
  // Current props...

  // MISSING:
  trend?: {
    value: string
    direction: 'up' | 'down' | 'neutral'
  }
  icon?: ReactNode
  sparkline?: number[]
}
```

---

## 4. Missing Layout Components

### Header/Navbar as Section
Currently only a container - need:
```typescript
interface HeaderSectionProps {
  logo?: ReactNode
  brand?: { name: string; href: string }
  navigation: NavItem[]
  actions?: ActionButton[]
  sticky?: boolean
  transparent?: boolean
  mobileVariant?: 'drawer' | 'dropdown' | 'fullscreen'
}
```

### Footer as Section
Currently only a container - need:
```typescript
interface FooterSectionProps {
  brand: { logo?: ReactNode; name: string; description?: string }
  columns: FooterColumn[]
  social?: SocialLinks
  legal?: { copyright: string; links?: Link[] }
  newsletter?: boolean
  variant?: 'simple' | 'columns' | 'mega'
}
```

---

## 5. Missing Dashboard/App Components (from Tremor)

### KPI Card Enhancement
```typescript
interface DashboardStatProps {
  // Current props...

  // MISSING:
  icon?: ReactNode
  sparkline?: number[]
  comparison?: { value: string; label: string }
  color?: string
}
```

### Missing Dashboard Blocks
- Activity Feed
- Notification Panel
- Billing/Usage Display
- Date Range Picker
- Filter Controls

### Missing Chart Types
- Sparkline
- Funnel Chart
- Radar Chart
- Scatter Plot
- Treemap
- Heatmap

---

## 6. Missing Interactive Components (from Mantine)

| Component | Description | Priority |
|-----------|-------------|----------|
| **Spotlight** | Command palette / search | High |
| **Notifications** | Toast notification system | High |
| **Stepper** | Multi-step wizard | Medium |
| **Rich Text Editor** | WYSIWYG editor | Medium |
| **File Upload** | Drag-drop with preview | Medium |
| **Color Picker** | Color selection | Low |
| **Date/Time Pickers** | Date range selection | Medium |

---

## 7. Missing Animation/Effects (from MagicUI)

### Background Types to Add
- Animated dots
- Animated grid
- Gradient animations
- WebGL particles
- Light rays
- Orb effects

### Text Effects
- Text reveal
- Text gradient
- Typing animation
- Text scramble

### Marquee/Animation
- Logo marquee
- Testimonial marquee
- Stats counter animation

---

## 8. Recommended Type Updates

### New SectionType Values
```typescript
type SectionType =
  | 'Hero'
  | 'Features'
  | 'Pricing'
  | 'FAQ'
  | 'Testimonials'
  | 'Team'        // NEW
  | 'Stats'
  | 'Logos'
  | 'Newsletter'
  | 'CTA'
  | 'Gallery'     // NEW
  | 'Timeline'
  | 'Comparison'  // NEW
  | 'Blog'        // NEW
  | 'Contact'     // NEW
  | 'Integrations' // NEW
  | 'Bento'       // NEW
```

### New ViewType Values
```typescript
type ViewType =
  | 'Dashboard'
  | 'Developer'
  | 'Table'
  | 'Grid'
  | 'List'
  | 'Chat'
  | 'Form'
  | 'Detail'
  | 'Settings'
  | 'Profile'
  | 'Editor'
  | 'Calendar'
  | 'Kanban'
  | 'Analytics'    // NEW
  | 'Billing'      // NEW
  | 'Activity'     // NEW
  | 'Notifications' // NEW
```

### New PageType (for full pages)
```typescript
type PageType =
  | 'Landing'
  | 'Login'
  | 'Signup'
  | 'ForgotPassword'
  | 'ResetPassword'
  | 'VerifyEmail'
  | 'Error404'
  | 'Error500'
  | 'Maintenance'
```

---

## 9. Implementation Priority

### High Priority (Core Marketing)
1. Team section
2. Blog section
3. Contact section
4. Auth pages (login, signup, forgot-password)
5. Error pages (404, 500)
6. Header/Footer as sections

### Medium Priority (Enhanced UX)
1. Gallery section
2. Bento grid
3. Comparison section
4. Integrations section
5. Command palette (Spotlight)
6. Notifications system
7. Stepper component

### Low Priority (Nice to Have)
1. Animated backgrounds
2. Text effects
3. Marquee animations
4. Rich text editor
5. Color picker

---

## 10. Package Dependencies

Each new package creates these dependencies:

| Package | Dependencies |
|---------|--------------|
| @mdxui/shadcnblocks | @mdxui/shadcn |
| @mdxui/tremor | @tremor/react |
| @mdxui/mantine | @mantine/core, @mantine/hooks |
| @mdxui/tailark | @mdxui/shadcn |
| @mdxui/magicui | react (optional: ogl for WebGL) |
| @mdxui/js | hono |

---

## Next Steps

1. Add missing section types to `@mdxui/html`
2. Update existing section props with missing fields
3. Add new view types for dashboard use cases
4. Create page-level types for auth/error pages
5. Document the abstract component interface for all packages to implement

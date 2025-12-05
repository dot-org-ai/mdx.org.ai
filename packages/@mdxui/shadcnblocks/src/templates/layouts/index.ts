/**
 * Template Layouts
 *
 * Production-ready page layouts translated from shadcnblocks templates.
 * Each layout provides a complete page structure with unified prop types.
 *
 * ## Layouts
 *
 * - **Scalar** - Complete SaaS landing page (hero, features, pricing, testimonials, FAQ, CTA)
 * - **Sonic** - Product launch page (demo-first, social proof, simple pricing)
 * - **Lumen** - Modern minimal (content-first, flexible blocks, clean typography)
 *
 * ## Usage
 *
 * ```tsx
 * import { ScalarLayout } from '@mdxui/shadcnblocks/templates/layouts'
 *
 * <ScalarLayout
 *   header={{ brand, navigation, actions }}
 *   hero={{ title, description, primaryAction }}
 *   features={{ headline, features }}
 *   // ... other sections
 * />
 * ```
 *
 * ## Design Principles
 *
 * 1. **Unified Props** - All layouts use consistent prop interfaces from @mdxui types
 * 2. **Composable** - Each section can be used independently or as part of the layout
 * 3. **Accessible** - Proper ARIA labels and semantic HTML
 * 4. **Responsive** - Mobile-first design with breakpoint variants
 * 5. **Themeable** - Uses CSS variables from shadcn/ui theme system
 *
 * ## Mapping to Abstract System
 *
 * These layouts demonstrate how shadcnblocks templates map to our unified
 * component types (Hero, Features, Pricing, etc.). This helps identify:
 *
 * - Common patterns across templates
 * - Prop variations and customization needs
 * - Gaps in our abstract type system
 * - Naming conventions for consistency
 */

export { ScalarLayout } from './scalar'
export type { ScalarLayoutProps } from './scalar'

export { SonicLayout } from './sonic'
export type { SonicLayoutProps, DemoProps } from './sonic'

export { LumenLayout } from './lumen'
export type {
  LumenLayoutProps,
  LumenHeaderProps,
  LumenHeroProps,
  LumenFooterProps,
  ContentBlockProps,
} from './lumen'

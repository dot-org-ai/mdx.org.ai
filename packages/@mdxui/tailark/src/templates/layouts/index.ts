/**
 * Tailark Layout Templates
 *
 * Translated Tailark templates mapped to unified @mdxui Layout types.
 * Each layout uses semantic naming and standard props interfaces.
 *
 * ## Layouts
 *
 * - **MarketingLayout** - Full marketing landing page (hero, features, pricing, FAQ)
 * - **QuartzLayout** - Light, minimal style with clean typography
 * - **DuskLayout** - Dark, bold style with gradient accents
 * - **MistLayout** - Soft, muted style with subtle animations
 *
 * ## Naming Conventions
 *
 * We use unified terminology across all layouts:
 * - `brand` for logo/company info
 * - `navigation` for nav items
 * - `hero` for main headline section
 * - `features` for feature grid/list
 * - `pricing` for pricing tiers
 * - `testimonials` for social proof
 * - `faq` for frequently asked questions
 * - `footer` for page footer
 *
 * ## Usage
 *
 * ```tsx
 * import { QuartzLayout } from '@mdxui/tailark/templates/layouts'
 *
 * <QuartzLayout
 *   header={{ brand: { name: 'Acme' }, navigation: [...] }}
 *   hero={{ headline: 'Build faster', description: '...' }}
 *   features={{ features: [...] }}
 *   footer={{ brand: { name: 'Acme' }, columns: [...] }}
 * />
 * ```
 *
 * ## Style Variants
 *
 * Each layout (Quartz, Dusk, Mist) applies different design tokens:
 *
 * | Layout | Background | Accent | Typography |
 * |--------|------------|--------|------------|
 * | Quartz | white/gray | indigo | Clean, sharp |
 * | Dusk | dark | purple/pink gradient | Bold, impactful |
 * | Mist | soft gray | teal | Soft, rounded |
 */

export { MarketingLayout } from './marketing'
export type { MarketingLayoutProps } from './marketing'

export { QuartzLayout } from './quartz'
export type { QuartzLayoutProps } from './quartz'

export { DuskLayout } from './dusk'
export type { DuskLayoutProps } from './dusk'

export { MistLayout } from './mist'
export type { MistLayoutProps } from './mist'

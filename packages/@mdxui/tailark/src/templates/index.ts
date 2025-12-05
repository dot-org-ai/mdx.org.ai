/**
 * Tailark Templates
 *
 * Pre-built marketing page templates with style variants.
 *
 * ## Layout System
 *
 * Templates now use the unified layout system in `./layouts/`:
 * - **MarketingLayout** - Full marketing landing page
 * - **QuartzLayout** - Light, minimal style
 * - **DuskLayout** - Dark, bold style with gradients
 * - **MistLayout** - Soft, muted style
 *
 * ## Migration Guide
 *
 * Old templates are wrappers for backward compatibility:
 * - `MarketingTemplate` → Use `MarketingLayout` from './layouts/marketing'
 *
 * @example
 * ```tsx
 * // New: Use layouts directly
 * import { QuartzLayout, DuskLayout, MistLayout } from '@mdxui/tailark/templates/layouts'
 *
 * // Old: Still works but deprecated
 * import { MarketingTemplate } from '@mdxui/tailark/templates'
 * ```
 */

// Legacy templates (backward compatibility)
export * from './marketing'

// New unified layout system (recommended)
export * from './layouts'

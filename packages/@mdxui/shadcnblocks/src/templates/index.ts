/**
 * ShadcnBlocks Templates
 *
 * Pre-built page templates that compose blocks together.
 * Each template maps to our abstract Site/App layout types.
 *
 * ## Layout System
 *
 * Templates now use the unified layout system in `./layouts/`:
 * - **ScalarLayout** - Complete SaaS landing (hero, features, pricing, FAQ, etc.)
 * - **SonicLayout** - Product launch (demo-first, social proof)
 * - **LumenLayout** - Modern minimal (content-first, flexible blocks)
 *
 * ## Migration Guide
 *
 * Old templates (landing.tsx, saas.tsx) are now wrappers for backward compatibility:
 * - `LandingPage` → Use `ScalarLayout` from './layouts/scalar'
 * - `SaaSTemplate` → Use `SonicLayout` from './layouts/sonic'
 *
 * @example
 * ```tsx
 * // New: Use layouts directly
 * import { ScalarLayout } from '@mdxui/shadcnblocks/templates/layouts'
 *
 * // Old: Still works but deprecated
 * import { LandingPage } from '@mdxui/shadcnblocks/templates'
 * ```
 */

// Legacy templates (backward compatibility)
export * from './landing'
export * from './saas'

// New unified layout system (recommended)
export * from './layouts'

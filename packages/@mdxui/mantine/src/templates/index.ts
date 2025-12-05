/**
 * Mantine Templates
 *
 * Pre-built dashboard page templates.
 *
 * ## Layout System
 *
 * Templates now use the unified layout system in `./layouts/`:
 * - **AdminLayout** - Full admin dashboard with AppShell, Spotlight, Notifications
 *
 * ## Migration Guide
 *
 * Old templates are wrappers for backward compatibility:
 * - `AdminTemplate` → Use `AdminLayout` from './layouts/admin'
 *
 * @example
 * ```tsx
 * // New: Use layouts directly
 * import { AdminLayout } from '@mdxui/mantine/templates/layouts'
 *
 * // Old: Still works but deprecated
 * import { AdminTemplate } from '@mdxui/mantine/templates'
 * ```
 */

// Legacy templates (backward compatibility)
export * from './admin'

// New unified layout system (recommended)
export * from './layouts'

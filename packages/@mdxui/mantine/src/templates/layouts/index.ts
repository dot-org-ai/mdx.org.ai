/**
 * Mantine Layout Templates
 *
 * Translated Mantine templates mapped to unified @mdxui Layout types.
 * Each layout uses semantic naming and standard props interfaces.
 *
 * ## Layouts
 *
 * - **AdminLayout** - Full-featured admin dashboard with AppShell, Spotlight, and Notifications
 *
 * ## Naming Conventions
 *
 * We use unified terminology across all layouts:
 * - `navigation` for sidebar/menu items
 * - `spotlight` for command palette (Mantine-specific feature)
 * - `notifications` for toast system
 * - `brand` for logo/branding element
 *
 * ## Usage
 *
 * ```tsx
 * import { AdminLayout } from '@mdxui/mantine/templates/layouts'
 *
 * <AdminLayout
 *   brand={<Logo />}
 *   navigation={[
 *     { label: 'Dashboard', href: '/', icon: <Home /> },
 *     { label: 'Users', href: '/users', icon: <Users /> },
 *   ]}
 *   spotlight={{ actions: [...] }}
 * >
 *   <DashboardContent />
 * </AdminLayout>
 * ```
 */

export { AdminLayout } from './admin'
export type { AdminLayoutProps, NavigationItem, SpotlightConfig } from './admin'

/**
 * Admin Layout
 *
 * Full-featured admin dashboard layout translated from Mantine AppShell.
 * Provides unified props interface for admin dashboards with:
 * - Responsive sidebar navigation with nested items
 * - Command palette (Spotlight) for power users
 * - Toast notifications system
 * - Theme-aware styling
 *
 * ## Original: Mantine Admin Template
 *
 * This layout translates Mantine's admin template to our unified system:
 * - AppShell → AdminLayout
 * - Spotlight → spotlight prop
 * - Notifications → notifications prop
 *
 * ## Props Mapping
 *
 * | Mantine | Unified | Notes |
 * |---------|---------|-------|
 * | navbar | navigation | Sidebar nav items |
 * | header | headerContent | Custom header content |
 * | aside | aside | Secondary sidebar |
 * | footer | footerContent | Footer area |
 */

import * as React from 'react'

export interface NavigationItem {
  /** Display label */
  label: string
  /** Navigation URL */
  href?: string
  /** Icon element */
  icon?: React.ReactNode
  /** Currently active */
  active?: boolean
  /** Nested navigation items */
  children?: NavigationItem[]
  /** Click handler for non-link items */
  onClick?: () => void
}

export interface SpotlightConfig {
  /** Keyboard shortcut (default: Cmd/Ctrl + K) */
  shortcut?: string[]
  /** Placeholder text */
  placeholder?: string
  /** Search actions */
  actions: Array<{
    id: string
    label: string
    description?: string
    icon?: React.ReactNode
    onClick: () => void
    keywords?: string[]
  }>
}

export interface AdminLayoutProps {
  /** Brand/logo element */
  brand?: React.ReactNode
  /** Sidebar navigation items */
  navigation: NavigationItem[]
  /** Custom header content (right side) */
  headerContent?: React.ReactNode
  /** Spotlight/command palette configuration */
  spotlight?: SpotlightConfig
  /** Enable notifications system */
  notifications?: boolean
  /** Footer content */
  footerContent?: React.ReactNode
  /** Secondary sidebar content */
  aside?: React.ReactNode
  /** Theme configuration */
  theme?: {
    primaryColor?: string
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
    colorScheme?: 'light' | 'dark' | 'auto'
    fontFamily?: string
    headingFontFamily?: string
  }
  /** Main content */
  children: React.ReactNode
}

/**
 * AdminLayout Component
 *
 * Renders a full admin dashboard with sidebar navigation,
 * optional command palette, and notifications.
 *
 * @example
 * ```tsx
 * <AdminLayout
 *   brand={<Logo />}
 *   navigation={[
 *     { label: 'Dashboard', href: '/', icon: <DashboardIcon /> },
 *     {
 *       label: 'Users',
 *       icon: <UsersIcon />,
 *       children: [
 *         { label: 'All Users', href: '/users' },
 *         { label: 'Add User', href: '/users/new' },
 *       ],
 *     },
 *   ]}
 *   spotlight={{
 *     actions: [
 *       { id: 'home', label: 'Go to Dashboard', onClick: () => navigate('/') },
 *       { id: 'search', label: 'Search Users', onClick: () => openSearch() },
 *     ],
 *   }}
 * >
 *   <DashboardContent />
 * </AdminLayout>
 * ```
 */
export function AdminLayout({
  brand,
  navigation,
  headerContent,
  spotlight,
  notifications = true,
  footerContent,
  aside,
  theme,
  children,
}: AdminLayoutProps) {
  const themeStyles = theme
    ? {
        '--admin-primary': theme.primaryColor || 'blue',
        '--admin-radius': getRadius(theme.radius),
      }
    : {}

  return (
    <div
      data-layout="admin"
      data-theme={theme?.colorScheme}
      style={themeStyles as React.CSSProperties}
    >
      {/* Sidebar */}
      <aside data-admin="sidebar" aria-label="Main navigation">
        {brand && <div data-admin="brand">{brand}</div>}
        <nav data-admin="nav">
          {navigation.map((item, index) => (
            <NavItem key={index} item={item} />
          ))}
        </nav>
      </aside>

      {/* Main area */}
      <div data-admin="main">
        {/* Header */}
        <header data-admin="header">
          <div data-admin="header-content">{headerContent}</div>
          {spotlight && (
            <button
              data-admin="spotlight-trigger"
              type="button"
              aria-label={`Open command palette (${spotlight.shortcut?.join('+') || 'Cmd+K'})`}
            >
              <kbd>{spotlight.shortcut?.join('+') || '⌘K'}</kbd>
            </button>
          )}
        </header>

        {/* Content */}
        <main data-admin="content">{children}</main>

        {/* Footer */}
        {footerContent && <footer data-admin="footer">{footerContent}</footer>}
      </div>

      {/* Secondary sidebar */}
      {aside && (
        <aside data-admin="aside" aria-label="Secondary sidebar">
          {aside}
        </aside>
      )}

      {/* Spotlight portal target */}
      {spotlight && <div data-admin="spotlight-portal" data-spotlight-actions={JSON.stringify(spotlight.actions.map((a) => a.id))} />}

      {/* Notifications portal target */}
      {notifications && <div data-admin="notifications-portal" />}
    </div>
  )
}

function NavItem({ item, depth = 0 }: { item: NavigationItem; depth?: number }) {
  const hasChildren = item.children && item.children.length > 0

  if (hasChildren) {
    return (
      <div data-admin="nav-group" data-depth={depth}>
        <span data-admin="nav-group-label">
          {item.icon && <span data-admin="nav-icon">{item.icon}</span>}
          {item.label}
        </span>
        <div data-admin="nav-children">
          {item.children!.map((child, index) => (
            <NavItem key={index} item={child} depth={depth + 1} />
          ))}
        </div>
      </div>
    )
  }

  const Element = item.href ? 'a' : 'button'
  const props = item.href ? { href: item.href } : { type: 'button' as const, onClick: item.onClick }

  return (
    <Element data-admin="nav-item" data-active={item.active} data-depth={depth} {...props}>
      {item.icon && <span data-admin="nav-icon">{item.icon}</span>}
      {item.label}
    </Element>
  )
}

function getRadius(radius?: string): string {
  const radii: Record<string, string> = {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  }
  return radii[radius || 'md'] || radii.md
}

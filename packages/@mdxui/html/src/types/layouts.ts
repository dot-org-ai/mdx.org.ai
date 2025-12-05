/**
 * Layout Type Definitions
 *
 * Framework-agnostic layout types for different application contexts.
 * Layouts define structural patterns, not implementations.
 */

import type { ReactNode } from 'react'

/* ==========================================================================
   Layout Variants
   ========================================================================== */

export type SiteLayoutVariant = 'landing' | 'marketing' | 'blog' | 'docs' | 'portfolio'
export type AppLayoutVariant = 'dashboard' | 'admin' | 'analytics' | 'settings' | 'developer'
export type PageLayoutVariant = 'auth' | 'error' | 'maintenance' | 'coming-soon'

/* ==========================================================================
   Common Layout Components
   ========================================================================== */

export interface HeaderConfig {
  logo?: ReactNode | string
  logoHref?: string
  navigation?: NavigationItem[]
  actions?: ReactNode
  sticky?: boolean
  transparent?: boolean
}

export interface NavigationItem {
  label: string
  href: string
  icon?: ReactNode
  children?: NavigationItem[]
  external?: boolean
}

export interface FooterConfig {
  logo?: ReactNode | string
  logoHref?: string
  tagline?: string
  columns?: FooterColumn[]
  social?: SocialLink[]
  legal?: LegalLink[]
  copyright?: string
}

export interface FooterColumn {
  title: string
  links: { label: string; href: string }[]
}

export interface SocialLink {
  platform: 'twitter' | 'github' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'discord' | 'slack'
  href: string
  label?: string
}

export interface LegalLink {
  label: string
  href: string
}

export interface SidebarConfig {
  navigation?: NavigationItem[]
  collapsible?: boolean
  collapsed?: boolean
  position?: 'left' | 'right'
  width?: 'narrow' | 'default' | 'wide'
}

/* ==========================================================================
   Site Layout
   ========================================================================== */

export interface SiteLayoutConfig {
  variant: SiteLayoutVariant
  header?: HeaderConfig
  footer?: FooterConfig
  sections?: ReactNode[]
  theme?: 'light' | 'dark' | 'auto'
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

export interface LandingLayoutConfig extends SiteLayoutConfig {
  variant: 'landing'
  hero?: ReactNode
  features?: ReactNode
  pricing?: ReactNode
  testimonials?: ReactNode
  cta?: ReactNode
}

export interface MarketingLayoutConfig extends SiteLayoutConfig {
  variant: 'marketing'
  announcement?: ReactNode
  hero?: ReactNode
}

export interface BlogLayoutConfig extends SiteLayoutConfig {
  variant: 'blog'
  sidebar?: SidebarConfig
  toc?: boolean
  author?: ReactNode
  relatedPosts?: ReactNode
}

export interface DocsLayoutConfig extends SiteLayoutConfig {
  variant: 'docs'
  sidebar: SidebarConfig
  toc?: boolean
  breadcrumbs?: boolean
  editLink?: string
  lastUpdated?: Date
}

export interface PortfolioLayoutConfig extends SiteLayoutConfig {
  variant: 'portfolio'
  hero?: ReactNode
  gallery?: ReactNode
  about?: ReactNode
  contact?: ReactNode
}

/* ==========================================================================
   App Layout
   ========================================================================== */

export interface AppLayoutConfig {
  variant: AppLayoutVariant
  header?: HeaderConfig
  sidebar?: SidebarConfig
  breadcrumbs?: boolean
  theme?: 'light' | 'dark' | 'auto'
}

export interface DashboardLayoutConfig extends AppLayoutConfig {
  variant: 'dashboard'
  sidebar: SidebarConfig
  widgets?: ReactNode[]
  metrics?: ReactNode
}

export interface AdminLayoutConfig extends AppLayoutConfig {
  variant: 'admin'
  sidebar: SidebarConfig
  notifications?: ReactNode
  userMenu?: ReactNode
}

export interface AnalyticsLayoutConfig extends AppLayoutConfig {
  variant: 'analytics'
  sidebar?: SidebarConfig
  dateRange?: ReactNode
  filters?: ReactNode
  charts?: ReactNode[]
}

export interface SettingsLayoutConfig extends AppLayoutConfig {
  variant: 'settings'
  sidebar: SidebarConfig
  tabs?: TabConfig[]
}

export interface DeveloperLayoutConfig extends AppLayoutConfig {
  variant: 'developer'
  sidebar: SidebarConfig
  console?: ReactNode
  apiExplorer?: ReactNode
}

export interface TabConfig {
  id: string
  label: string
  icon?: ReactNode
  content: ReactNode
}

/* ==========================================================================
   Page Layout
   ========================================================================== */

export interface PageLayoutConfig {
  variant: PageLayoutVariant
  centered?: boolean
  maxWidth?: 'sm' | 'md' | 'lg'
  theme?: 'light' | 'dark' | 'auto'
}

export interface AuthLayoutConfig extends PageLayoutConfig {
  variant: 'auth'
  logo?: ReactNode | string
  logoHref?: string
  background?: ReactNode | string
  socialProviders?: SocialProvider[]
  footer?: ReactNode
}

export interface SocialProvider {
  provider: 'google' | 'github' | 'facebook' | 'twitter' | 'microsoft' | 'apple'
  label?: string
  onAuth: () => void
}

export interface ErrorLayoutConfig extends PageLayoutConfig {
  variant: 'error'
  code: number
  title: string
  message: string
  actions?: ReactNode
  illustration?: ReactNode
}

export interface MaintenanceLayoutConfig extends PageLayoutConfig {
  variant: 'maintenance'
  title?: string
  message?: string
  estimatedTime?: string
  contactEmail?: string
  statusUrl?: string
}

export interface ComingSoonLayoutConfig extends PageLayoutConfig {
  variant: 'coming-soon'
  logo?: ReactNode | string
  title: string
  description?: string
  countdown?: Date
  notifyForm?: boolean
  social?: SocialLink[]
}

/* ==========================================================================
   Union Types
   ========================================================================== */

export type LayoutConfig =
  | SiteLayoutConfig
  | LandingLayoutConfig
  | MarketingLayoutConfig
  | BlogLayoutConfig
  | DocsLayoutConfig
  | PortfolioLayoutConfig
  | AppLayoutConfig
  | DashboardLayoutConfig
  | AdminLayoutConfig
  | AnalyticsLayoutConfig
  | SettingsLayoutConfig
  | DeveloperLayoutConfig
  | PageLayoutConfig
  | AuthLayoutConfig
  | ErrorLayoutConfig
  | MaintenanceLayoutConfig
  | ComingSoonLayoutConfig

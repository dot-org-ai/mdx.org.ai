/**
 * Layout type mappings
 *
 * Maps layout names to their package imports.
 */

export type LayoutType =
  | 'scalar'
  | 'sonic'
  | 'lumen'
  | 'quartz'
  | 'dusk'
  | 'mist'
  | 'marketing'
  | 'admin'
  | 'dashboard-oss'
  | 'solar'
  | 'insights'

export interface LayoutMapping {
  /** The component name to import */
  component: string
  /** The package to import from */
  package: string
  /** Storybook category */
  category: 'Site' | 'App' | 'Dashboard'
  /** Description for docs */
  description: string
}

export const LAYOUT_MAPPING: Record<LayoutType, LayoutMapping> = {
  // Shadcnblocks layouts
  scalar: {
    component: 'ScalarLayout',
    package: '@mdxui/shadcnblocks/templates',
    category: 'Site',
    description: 'Complete SaaS landing page with hero, features, pricing, testimonials, FAQ',
  },
  sonic: {
    component: 'SonicLayout',
    package: '@mdxui/shadcnblocks/templates',
    category: 'Site',
    description: 'Product launch page with demo-first design and social proof',
  },
  lumen: {
    component: 'LumenLayout',
    package: '@mdxui/shadcnblocks/templates',
    category: 'Site',
    description: 'Modern minimal layout with content-first design',
  },

  // Tailark layouts
  quartz: {
    component: 'QuartzLayout',
    package: '@mdxui/tailark/templates',
    category: 'Site',
    description: 'Light, minimal style with clean typography',
  },
  dusk: {
    component: 'DuskLayout',
    package: '@mdxui/tailark/templates',
    category: 'Site',
    description: 'Dark, bold style with gradient accents',
  },
  mist: {
    component: 'MistLayout',
    package: '@mdxui/tailark/templates',
    category: 'Site',
    description: 'Soft, muted style with rounded elements',
  },
  marketing: {
    component: 'MarketingLayout',
    package: '@mdxui/tailark/templates',
    category: 'Site',
    description: 'Full marketing landing page with all standard sections',
  },

  // Mantine layouts
  admin: {
    component: 'AdminLayout',
    package: '@mdxui/mantine/templates',
    category: 'App',
    description: 'Full admin dashboard with sidebar, spotlight, and notifications',
  },

  // Tremor layouts
  'dashboard-oss': {
    component: 'DashboardOSSLayout',
    package: '@mdxui/tremor/templates',
    category: 'Dashboard',
    description: 'Analytics dashboard with KPIs, charts, and tables',
  },
  solar: {
    component: 'SolarLayout',
    package: '@mdxui/tremor/templates',
    category: 'Site',
    description: 'One-page marketing website from Tremor',
  },
  insights: {
    component: 'InsightsLayout',
    package: '@mdxui/tremor/templates',
    category: 'Dashboard',
    description: 'Data exploration dashboard with filters and visualizations',
  },
}

/**
 * Get layout mapping by name (case-insensitive)
 */
export function getLayoutMapping(name: string): LayoutMapping | undefined {
  const normalized = name.toLowerCase().replace(/layout$/i, '') as LayoutType
  return LAYOUT_MAPPING[normalized]
}

/**
 * Get all layouts by category
 */
export function getLayoutsByCategory(category: 'Site' | 'App' | 'Dashboard'): LayoutType[] {
  return Object.entries(LAYOUT_MAPPING)
    .filter(([, mapping]) => mapping.category === category)
    .map(([key]) => key as LayoutType)
}

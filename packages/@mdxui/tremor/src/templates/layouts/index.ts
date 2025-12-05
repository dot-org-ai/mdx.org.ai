/**
 * Tremor Layout Templates
 *
 * Translated Tremor templates mapped to unified @mdxui Layout types.
 * Each layout uses semantic naming and standard props interfaces.
 *
 * ## Layouts
 *
 * - **DashboardOSS** - Analytics dashboard (tremorlabs/template-dashboard-oss)
 * - **Solar** - One-page marketing website (tremorlabs/template-solar)
 * - **Insights** - Data exploration dashboard (tremorlabs/template-insights)
 *
 * ## Naming Conventions
 *
 * We use unified terminology across all layouts:
 * - `kpis` instead of `metrics` or `stats`
 * - `sections` instead of `blocks` or `areas`
 * - `navigation` for sidebar/menu items
 * - `widgets` for modular content components
 * - `dateRange` for time period selectors
 *
 * ## Usage
 *
 * ```tsx
 * import { DashboardOSSLayout } from '@mdxui/tremor/templates/layouts'
 *
 * <DashboardOSSLayout
 *   title="Analytics Dashboard"
 *   kpis={[
 *     { title: 'Revenue', value: '$45,231', trend: { value: '+12%', direction: 'up' } }
 *   ]}
 *   mainChart={{ title: 'Monthly Growth', component: <AreaChart {...} /> }}
 * />
 * ```
 */

export * from './dashboard-oss'
export * from './solar'
export * from './insights'

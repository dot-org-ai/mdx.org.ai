/**
 * Component Registry
 *
 * Metadata and configuration for all UI components.
 * Enables introspection, validation, and runtime component discovery.
 *
 * @packageDocumentation
 */

import type {
  ComponentName,
  AppProps,
  SiteProps,
  PageProps,
  SectionProps,
  ContainerProps,
  GridProps,
  StackProps,
  LandingPageProps,
  HeroProps,
  FeaturesProps,
  TestimonialsProps,
  PricingProps,
  FAQProps,
  CTAProps,
  BlogProps,
  BlogPostProps,
  DocsProps,
  CardProps,
  FormProps,
  NewsletterProps,
  ContactProps,
  StatsProps,
  TableProps,
  TimelineProps,
  APIProps,
  AlertProps,
  BadgeProps,
  ProgressProps,
} from './types.js'

/**
 * Component category
 */
export type ComponentCategory = 'layout' | 'landing' | 'content' | 'form' | 'data' | 'api' | 'feedback'

/**
 * Component metadata
 */
export interface ComponentMeta<Props = Record<string, unknown>> {
  /** Component name */
  name: ComponentName
  /** Component category */
  category: ComponentCategory
  /** Human-readable description */
  description: string
  /** Whether component accepts children */
  hasChildren: boolean
  /** Required props (string keys) */
  requiredProps: string[]
  /** Default prop values */
  defaults?: Partial<Props>
  /** Related components */
  related?: ComponentName[]
  /** Semantic HTML element hint */
  semanticElement?: string
  /** Accessibility hints */
  a11y?: {
    role?: string
    label?: string
  }
}

/**
 * Type mapping from component name to props
 */
export interface ComponentPropsMap {
  App: AppProps
  Site: SiteProps
  Page: PageProps
  Section: SectionProps
  Container: ContainerProps
  Grid: GridProps
  Stack: StackProps
  LandingPage: LandingPageProps
  Hero: HeroProps
  Features: FeaturesProps
  Testimonials: TestimonialsProps
  Pricing: PricingProps
  FAQ: FAQProps
  CTA: CTAProps
  Blog: BlogProps
  BlogPost: BlogPostProps
  Docs: DocsProps
  Card: CardProps
  Form: FormProps
  Newsletter: NewsletterProps
  Contact: ContactProps
  Stats: StatsProps
  Table: TableProps
  Timeline: TimelineProps
  API: APIProps
  Alert: AlertProps
  Badge: BadgeProps
  Progress: ProgressProps
}

/**
 * Component registry with metadata for all components
 */
export const componentRegistry: Record<ComponentName, ComponentMeta> = {
  // Layout Components
  App: {
    name: 'App',
    category: 'layout',
    description: 'Root application wrapper with theme and locale support',
    hasChildren: true,
    requiredProps: [],
    defaults: { theme: 'system' },
    related: ['Site', 'Page'],
    semanticElement: 'div',
    a11y: { role: 'application' },
  },
  Site: {
    name: 'Site',
    category: 'layout',
    description: 'Website wrapper with header, navigation, and footer',
    hasChildren: true,
    requiredProps: [],
    related: ['App', 'Page', 'LandingPage'],
    semanticElement: 'div',
  },
  Page: {
    name: 'Page',
    category: 'layout',
    description: 'Generic page wrapper with SEO and layout options',
    hasChildren: true,
    requiredProps: [],
    defaults: { layout: 'default' },
    related: ['Site', 'Section'],
    semanticElement: 'main',
    a11y: { role: 'main' },
  },
  Section: {
    name: 'Section',
    category: 'layout',
    description: 'Content section with optional heading and background',
    hasChildren: true,
    requiredProps: [],
    defaults: { padding: 'md', background: 'default' },
    semanticElement: 'section',
  },
  Container: {
    name: 'Container',
    category: 'layout',
    description: 'Centered content container with max-width',
    hasChildren: true,
    requiredProps: [],
    defaults: { size: 'lg', center: true },
    semanticElement: 'div',
  },
  Grid: {
    name: 'Grid',
    category: 'layout',
    description: 'Responsive grid layout',
    hasChildren: true,
    requiredProps: [],
    defaults: { cols: 3, gap: 'md' },
    related: ['Stack'],
    semanticElement: 'div',
  },
  Stack: {
    name: 'Stack',
    category: 'layout',
    description: 'Vertical or horizontal stack layout',
    hasChildren: true,
    requiredProps: [],
    defaults: { direction: 'vertical', gap: 'md' },
    related: ['Grid'],
    semanticElement: 'div',
  },

  // Landing Page Components
  LandingPage: {
    name: 'LandingPage',
    category: 'landing',
    description: 'Complete landing page layout with common sections',
    hasChildren: true,
    requiredProps: [],
    related: ['Hero', 'Features', 'Pricing', 'FAQ', 'CTA'],
    semanticElement: 'div',
  },
  Hero: {
    name: 'Hero',
    category: 'landing',
    description: 'Hero section with headline, subtitle, and CTAs',
    hasChildren: true,
    requiredProps: ['title'],
    defaults: { layout: 'centered' },
    related: ['CTA', 'LandingPage'],
    semanticElement: 'header',
    a11y: { role: 'banner' },
  },
  Features: {
    name: 'Features',
    category: 'landing',
    description: 'Feature showcase section',
    hasChildren: false,
    requiredProps: ['items'],
    defaults: { layout: 'grid', columns: 3 },
    related: ['Hero', 'Card'],
    semanticElement: 'section',
  },
  Testimonials: {
    name: 'Testimonials',
    category: 'landing',
    description: 'Customer testimonials and social proof',
    hasChildren: false,
    requiredProps: ['items'],
    defaults: { layout: 'grid' },
    related: ['Features', 'Stats'],
    semanticElement: 'section',
  },
  Pricing: {
    name: 'Pricing',
    category: 'landing',
    description: 'Pricing table with tier comparison',
    hasChildren: false,
    requiredProps: ['tiers'],
    defaults: { showToggle: true },
    related: ['FAQ', 'CTA'],
    semanticElement: 'section',
  },
  FAQ: {
    name: 'FAQ',
    category: 'landing',
    description: 'Frequently asked questions section',
    hasChildren: false,
    requiredProps: ['items'],
    defaults: { layout: 'accordion' },
    related: ['Pricing', 'Contact'],
    semanticElement: 'section',
  },
  CTA: {
    name: 'CTA',
    category: 'landing',
    description: 'Call to action section',
    hasChildren: false,
    requiredProps: ['title'],
    defaults: { background: 'accent' },
    related: ['Hero', 'Newsletter'],
    semanticElement: 'section',
  },

  // Content Components
  Blog: {
    name: 'Blog',
    category: 'content',
    description: 'Blog listing layout',
    hasChildren: false,
    requiredProps: ['posts'],
    defaults: { layout: 'grid' },
    related: ['BlogPost', 'Card'],
    semanticElement: 'section',
  },
  BlogPost: {
    name: 'BlogPost',
    category: 'content',
    description: 'Single blog post view',
    hasChildren: true,
    requiredProps: ['post'],
    defaults: { toc: true, share: true },
    related: ['Blog', 'Docs'],
    semanticElement: 'article',
    a11y: { role: 'article' },
  },
  Docs: {
    name: 'Docs',
    category: 'content',
    description: 'Documentation layout with sidebar navigation',
    hasChildren: true,
    requiredProps: [],
    related: ['BlogPost', 'API'],
    semanticElement: 'article',
  },
  Card: {
    name: 'Card',
    category: 'content',
    description: 'Content card with title, description, and actions',
    hasChildren: true,
    requiredProps: [],
    defaults: { variant: 'default' },
    related: ['Features', 'Blog'],
    semanticElement: 'article',
  },

  // Form Components
  Form: {
    name: 'Form',
    category: 'form',
    description: 'Form component with configurable fields',
    hasChildren: true,
    requiredProps: ['fields'],
    defaults: { method: 'POST', submitLabel: 'Submit' },
    related: ['Contact', 'Newsletter'],
    semanticElement: 'form',
  },
  Newsletter: {
    name: 'Newsletter',
    category: 'form',
    description: 'Newsletter signup form',
    hasChildren: false,
    requiredProps: [],
    defaults: { placeholder: 'Enter your email', submitLabel: 'Subscribe' },
    related: ['Form', 'CTA'],
    semanticElement: 'form',
  },
  Contact: {
    name: 'Contact',
    category: 'form',
    description: 'Contact form with optional info',
    hasChildren: false,
    requiredProps: [],
    defaults: { submitLabel: 'Send Message' },
    related: ['Form', 'FAQ'],
    semanticElement: 'form',
  },

  // Data Display Components
  Stats: {
    name: 'Stats',
    category: 'data',
    description: 'Statistics display with labels and values',
    hasChildren: false,
    requiredProps: ['items'],
    defaults: { layout: 'row' },
    related: ['Features', 'Testimonials'],
    semanticElement: 'dl',
  },
  Table: {
    name: 'Table',
    category: 'data',
    description: 'Data table with sorting and filtering',
    hasChildren: false,
    requiredProps: ['columns', 'data'],
    defaults: { sortable: true },
    related: ['Stats', 'Timeline'],
    semanticElement: 'table',
    a11y: { role: 'grid' },
  },
  Timeline: {
    name: 'Timeline',
    category: 'data',
    description: 'Timeline display for events or steps',
    hasChildren: false,
    requiredProps: ['items'],
    defaults: { layout: 'vertical' },
    related: ['Stats', 'Table'],
    semanticElement: 'ol',
    a11y: { role: 'list' },
  },

  // API Components
  API: {
    name: 'API',
    category: 'api',
    description: 'API documentation with endpoint listing',
    hasChildren: false,
    requiredProps: ['endpoints'],
    related: ['Docs', 'Table'],
    semanticElement: 'section',
  },

  // Feedback Components
  Alert: {
    name: 'Alert',
    category: 'feedback',
    description: 'Alert/notification message',
    hasChildren: false,
    requiredProps: ['message'],
    defaults: { type: 'info', dismissible: false },
    related: ['Badge', 'Progress'],
    semanticElement: 'div',
    a11y: { role: 'alert' },
  },
  Badge: {
    name: 'Badge',
    category: 'feedback',
    description: 'Small badge or tag',
    hasChildren: false,
    requiredProps: ['label'],
    defaults: { variant: 'default', size: 'md' },
    related: ['Alert'],
    semanticElement: 'span',
  },
  Progress: {
    name: 'Progress',
    category: 'feedback',
    description: 'Progress indicator',
    hasChildren: false,
    requiredProps: ['value'],
    defaults: { max: 100, variant: 'default' },
    related: ['Stats', 'Alert'],
    semanticElement: 'progress',
    a11y: { role: 'progressbar' },
  },
}

/**
 * Get all component names
 */
export function getComponentNames(): ComponentName[] {
  return Object.keys(componentRegistry) as ComponentName[]
}

/**
 * Get component metadata by name
 */
export function getComponentMeta<N extends ComponentName>(name: N): ComponentMeta<ComponentPropsMap[N]> {
  return componentRegistry[name] as ComponentMeta<ComponentPropsMap[N]>
}

/**
 * Get all components in a category
 */
export function getComponentsByCategory(category: ComponentCategory): ComponentName[] {
  return Object.entries(componentRegistry)
    .filter(([_, meta]) => meta.category === category)
    .map(([name]) => name as ComponentName)
}

/**
 * Get all categories
 */
export function getCategories(): ComponentCategory[] {
  return ['layout', 'landing', 'content', 'form', 'data', 'api', 'feedback']
}

/**
 * Check if a component has children
 */
export function componentHasChildren(name: ComponentName): boolean {
  return componentRegistry[name]?.hasChildren ?? false
}

/**
 * Get required props for a component
 */
export function getRequiredProps(name: ComponentName): string[] {
  return componentRegistry[name]?.requiredProps ?? []
}

/**
 * Get default props for a component
 */
export function getDefaultProps<N extends ComponentName>(name: N): Partial<ComponentPropsMap[N]> | undefined {
  return componentRegistry[name]?.defaults as Partial<ComponentPropsMap[N]> | undefined
}

/**
 * Get related components
 */
export function getRelatedComponents(name: ComponentName): ComponentName[] {
  return componentRegistry[name]?.related ?? []
}

/**
 * mdxui - JSX-agnostic UI component abstractions for MDX
 *
 * Provides type-safe component definitions that work with any JSX runtime
 * including React, Ink (CLI), Hono JSX, Slack JSX, and more.
 *
 * @packageDocumentation
 */

// Export all types
export type {
  // Base types
  Action,
  Media,
  Person,
  SocialLink,
  NavItem,
  SEO,
  // Layout components
  AppProps,
  SiteProps,
  PageProps,
  SectionProps,
  ContainerProps,
  GridProps,
  StackProps,
  // Landing page components
  LandingPageProps,
  HeroProps,
  Feature,
  FeaturesProps,
  Testimonial,
  TestimonialsProps,
  PricingTier,
  PricingProps,
  FAQItem,
  FAQProps,
  CTAProps,
  // Content components
  BlogPost,
  BlogProps,
  BlogPostProps,
  DocsProps,
  CardProps,
  // Form components
  FormField,
  FormProps,
  NewsletterProps,
  ContactProps,
  // Data display components
  Stat,
  StatsProps,
  TableColumn,
  TableProps,
  TimelineItem,
  TimelineProps,
  // API components
  APIEndpoint,
  APIProps,
  // Feedback components
  AlertProps,
  BadgeProps,
  ProgressProps,
  // Utility types
  ComponentProps,
  ComponentName,
} from './types.js'

// Export registry
export {
  componentRegistry,
  getComponentNames,
  getComponentMeta,
  getComponentsByCategory,
  getCategories,
  componentHasChildren,
  getRequiredProps,
  getDefaultProps,
  getRelatedComponents,
} from './registry.js'

export type { ComponentCategory, ComponentMeta, ComponentPropsMap } from './registry.js'

// Export factory
export {
  createComponents,
  createComponent,
  createStubComponents,
  createValidatedComponents,
  mergeComponents,
  pickComponents,
  omitComponents,
} from './factory.js'

export type {
  JSXElement,
  JSXFactory,
  ComponentRenderer,
  Component,
  Components,
  ComponentRenderers,
  CreateComponentsOptions,
} from './factory.js'

// Export type loader for MDX component type definitions
export {
  parsePropDef,
  parsePartDef,
  parseCSSVariableDef,
  parseFrontmatter,
  parseComponentType,
  loadComponentTypes,
  getComponentType,
  getTypesByCategory,
  getTypeCategories,
  generateTypeScriptInterface,
} from './type-loader.js'

export type {
  PropDef,
  PartDef,
  CSSVariableDef,
  JSONLDMapping,
  ComponentType,
} from './type-loader.js'

// Export products integration (requires digital-products peer dependency)
// Import from 'mdxui/products' to use these features
export * from './products.js'

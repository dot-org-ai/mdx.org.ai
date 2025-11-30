/**
 * mdxui Component Type Definitions
 *
 * JSX-agnostic prop interfaces for all UI component abstractions.
 * These types can be used with any JSX runtime (React, Ink, Hono, Slack, etc.)
 *
 * @packageDocumentation
 */

// ============================================================================
// Base Types
// ============================================================================

/**
 * Generic action/link type
 */
export interface Action {
  /** Display text */
  label: string
  /** URL or action identifier */
  href?: string
  /** Action handler identifier (for non-web contexts) */
  action?: string
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'link'
  /** Icon name or identifier */
  icon?: string
}

/**
 * Media content
 */
export interface Media {
  /** Source URL or path */
  src: string
  /** Alt text for accessibility */
  alt?: string
  /** Media type */
  type?: 'image' | 'video' | 'audio' | 'icon'
  /** Width (number or string like '100%') */
  width?: number | string
  /** Height (number or string) */
  height?: number | string
}

/**
 * Person/Author information
 */
export interface Person {
  name: string
  title?: string
  avatar?: string | Media
  email?: string
  url?: string
  bio?: string
}

/**
 * Social link
 */
export interface SocialLink {
  platform: 'twitter' | 'github' | 'linkedin' | 'facebook' | 'instagram' | 'youtube' | 'discord' | 'slack' | string
  url: string
  label?: string
}

/**
 * Navigation item
 */
export interface NavItem {
  label: string
  href?: string
  action?: string
  icon?: string
  children?: NavItem[]
  active?: boolean
}

/**
 * SEO/Metadata
 */
export interface SEO {
  title?: string
  description?: string
  image?: string | Media
  url?: string
  type?: 'website' | 'article' | 'product' | string
  keywords?: string[]
  author?: string | Person
}

// ============================================================================
// Layout Components
// ============================================================================

/**
 * App - Root application wrapper
 */
export interface AppProps {
  /** Application name */
  name?: string
  /** Theme configuration */
  theme?: 'light' | 'dark' | 'system' | Record<string, unknown>
  /** Locale/language */
  locale?: string
  /** SEO metadata */
  seo?: SEO
  /** Children content */
  children?: unknown
}

/**
 * Site - Website wrapper with header/footer
 */
export interface SiteProps {
  /** Site name */
  name?: string
  /** Logo media */
  logo?: string | Media
  /** Navigation items */
  nav?: NavItem[]
  /** Footer navigation */
  footerNav?: NavItem[]
  /** Social links */
  social?: SocialLink[]
  /** Copyright text */
  copyright?: string
  /** SEO metadata */
  seo?: SEO
  children?: unknown
}

/**
 * Page - Generic page wrapper
 */
export interface PageProps {
  /** Page title */
  title?: string
  /** Page description */
  description?: string
  /** SEO metadata */
  seo?: SEO
  /** Page layout variant */
  layout?: 'default' | 'wide' | 'narrow' | 'full'
  children?: unknown
}

/**
 * Section - Content section with optional heading
 */
export interface SectionProps {
  /** Section ID for anchoring */
  id?: string
  /** Section title */
  title?: string
  /** Section subtitle/description */
  subtitle?: string
  /** Background variant */
  background?: 'default' | 'muted' | 'accent' | 'dark' | 'light'
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  children?: unknown
}

/**
 * Container - Centered content container
 */
export interface ContainerProps {
  /** Max width variant */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  /** Center content */
  center?: boolean
  children?: unknown
}

/**
 * Grid - Responsive grid layout
 */
export interface GridProps {
  /** Number of columns */
  cols?: number | { sm?: number; md?: number; lg?: number; xl?: number }
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  children?: unknown
}

/**
 * Stack - Vertical or horizontal stack
 */
export interface StackProps {
  /** Direction */
  direction?: 'vertical' | 'horizontal' | 'row' | 'column'
  /** Gap between items */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl'
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /** Justification */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  /** Wrap items */
  wrap?: boolean
  children?: unknown
}

// ============================================================================
// Landing Page Components
// ============================================================================

/**
 * LandingPage - Complete landing page layout
 */
export interface LandingPageProps {
  /** Hero section */
  hero?: HeroProps
  /** Features section */
  features?: FeaturesProps
  /** Testimonials */
  testimonials?: TestimonialsProps
  /** Pricing */
  pricing?: PricingProps
  /** FAQ */
  faq?: FAQProps
  /** CTA section */
  cta?: CTAProps
  /** Site wrapper props */
  site?: SiteProps
  children?: unknown
}

/**
 * Hero - Hero section
 */
export interface HeroProps {
  /** Main headline */
  title: string
  /** Supporting text */
  subtitle?: string
  /** Hero description/body */
  description?: string
  /** Primary CTA */
  primaryAction?: Action
  /** Secondary CTA */
  secondaryAction?: Action
  /** Hero image/media */
  media?: string | Media
  /** Layout variant */
  layout?: 'centered' | 'split' | 'image-left' | 'image-right'
  /** Background variant */
  background?: 'default' | 'gradient' | 'image' | 'video'
  /** Background media (if background is 'image' or 'video') */
  backgroundMedia?: string | Media
  children?: unknown
}

/**
 * Feature item
 */
export interface Feature {
  /** Feature title */
  title: string
  /** Feature description */
  description?: string
  /** Icon identifier */
  icon?: string
  /** Feature image */
  image?: string | Media
  /** Link to learn more */
  href?: string
}

/**
 * Features - Feature showcase section
 */
export interface FeaturesProps {
  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string
  /** Feature items */
  items: Feature[]
  /** Layout variant */
  layout?: 'grid' | 'list' | 'alternating' | 'cards'
  /** Number of columns (for grid) */
  columns?: number
}

/**
 * Testimonial item
 */
export interface Testimonial {
  /** Quote text */
  quote: string
  /** Author information */
  author: Person
  /** Company/organization */
  company?: string
  /** Rating (1-5) */
  rating?: number
}

/**
 * Testimonials - Social proof section
 */
export interface TestimonialsProps {
  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string
  /** Testimonial items */
  items: Testimonial[]
  /** Layout variant */
  layout?: 'grid' | 'carousel' | 'masonry' | 'single'
}

/**
 * Pricing tier
 */
export interface PricingTier {
  /** Tier name */
  name: string
  /** Price (string to support 'Free', '$99/mo', etc.) */
  price: string
  /** Billing period */
  period?: 'monthly' | 'yearly' | 'one-time' | string
  /** Description */
  description?: string
  /** Features included */
  features: string[]
  /** CTA action */
  action?: Action
  /** Is this the recommended/highlighted tier? */
  featured?: boolean
  /** Badge text (e.g., 'Popular', 'Best Value') */
  badge?: string
}

/**
 * Pricing - Pricing table section
 */
export interface PricingProps {
  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string
  /** Pricing tiers */
  tiers: PricingTier[]
  /** Show monthly/yearly toggle */
  showToggle?: boolean
  /** FAQ below pricing */
  faq?: FAQItem[]
}

/**
 * FAQ item
 */
export interface FAQItem {
  /** Question */
  question: string
  /** Answer (can be string or rich content) */
  answer: string
}

/**
 * FAQ - Frequently asked questions
 */
export interface FAQProps {
  /** Section title */
  title?: string
  /** Section subtitle */
  subtitle?: string
  /** FAQ items */
  items: FAQItem[]
  /** Layout variant */
  layout?: 'accordion' | 'list' | 'grid' | 'two-column'
}

/**
 * CTA - Call to action section
 */
export interface CTAProps {
  /** Headline */
  title: string
  /** Supporting text */
  description?: string
  /** Primary action */
  primaryAction?: Action
  /** Secondary action */
  secondaryAction?: Action
  /** Background variant */
  background?: 'default' | 'accent' | 'gradient' | 'dark'
}

// ============================================================================
// Content Components
// ============================================================================

/**
 * Blog post metadata
 */
export interface BlogPost {
  /** Post title */
  title: string
  /** Post slug/URL */
  slug: string
  /** Excerpt/summary */
  excerpt?: string
  /** Full content */
  content?: string
  /** Featured image */
  image?: string | Media
  /** Author */
  author?: Person
  /** Publish date (ISO string) */
  date?: string
  /** Categories/tags */
  tags?: string[]
  /** Reading time in minutes */
  readingTime?: number
}

/**
 * Blog - Blog listing/layout
 */
export interface BlogProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Blog posts */
  posts: BlogPost[]
  /** Layout variant */
  layout?: 'grid' | 'list' | 'featured'
  /** Show sidebar */
  sidebar?: boolean
  /** Pagination */
  pagination?: {
    page: number
    totalPages: number
    baseUrl?: string
  }
}

/**
 * BlogPost - Single blog post view
 */
export interface BlogPostProps {
  /** Post data */
  post: BlogPost
  /** Related posts */
  related?: BlogPost[]
  /** Show table of contents */
  toc?: boolean
  /** Show share buttons */
  share?: boolean
  children?: unknown
}

/**
 * Docs - Documentation layout
 */
export interface DocsProps {
  /** Sidebar navigation */
  nav?: NavItem[]
  /** Current page title */
  title?: string
  /** Table of contents */
  toc?: Array<{ title: string; id: string; level: number }>
  /** Previous page */
  prev?: { title: string; href: string }
  /** Next page */
  next?: { title: string; href: string }
  /** Edit URL */
  editUrl?: string
  children?: unknown
}

/**
 * Card - Content card
 */
export interface CardProps {
  /** Card title */
  title?: string
  /** Card description */
  description?: string
  /** Card image */
  image?: string | Media
  /** Card link */
  href?: string
  /** Card actions */
  actions?: Action[]
  /** Card variant */
  variant?: 'default' | 'outlined' | 'elevated'
  children?: unknown
}

// ============================================================================
// Form Components
// ============================================================================

/**
 * Form field
 */
export interface FormField {
  /** Field name */
  name: string
  /** Field label */
  label?: string
  /** Field type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'date' | 'file'
  /** Placeholder text */
  placeholder?: string
  /** Default value */
  defaultValue?: string | number | boolean
  /** Is required? */
  required?: boolean
  /** Help text */
  help?: string
  /** Options (for select, radio) */
  options?: Array<{ label: string; value: string }>
  /** Validation pattern */
  pattern?: string
  /** Min value/length */
  min?: number
  /** Max value/length */
  max?: number
}

/**
 * Form - Form component
 */
export interface FormProps {
  /** Form fields */
  fields: FormField[]
  /** Submit button text */
  submitLabel?: string
  /** Form action URL */
  action?: string
  /** HTTP method */
  method?: 'GET' | 'POST'
  /** Success message */
  successMessage?: string
  /** Error message */
  errorMessage?: string
  children?: unknown
}

/**
 * Newsletter - Newsletter signup form
 */
export interface NewsletterProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Placeholder text */
  placeholder?: string
  /** Submit button text */
  submitLabel?: string
  /** Form action URL */
  action?: string
  /** Success message */
  successMessage?: string
}

/**
 * Contact - Contact form
 */
export interface ContactProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Form fields (defaults to name, email, message) */
  fields?: FormField[]
  /** Submit button text */
  submitLabel?: string
  /** Form action URL */
  action?: string
  /** Contact info */
  info?: {
    email?: string
    phone?: string
    address?: string
  }
}

// ============================================================================
// Data Display Components
// ============================================================================

/**
 * Stats item
 */
export interface Stat {
  /** Stat label */
  label: string
  /** Stat value */
  value: string | number
  /** Change/trend indicator */
  change?: string
  /** Is change positive? */
  positive?: boolean
  /** Icon */
  icon?: string
}

/**
 * Stats - Statistics display
 */
export interface StatsProps {
  /** Stats items */
  items: Stat[]
  /** Layout variant */
  layout?: 'row' | 'grid'
}

/**
 * Table column definition
 */
export interface TableColumn {
  /** Column key (matches data object keys) */
  key: string
  /** Column header text */
  header: string
  /** Column width */
  width?: string | number
  /** Alignment */
  align?: 'left' | 'center' | 'right'
  /** Is sortable? */
  sortable?: boolean
}

/**
 * Table - Data table
 */
export interface TableProps {
  /** Column definitions */
  columns: TableColumn[]
  /** Data rows */
  data: Record<string, unknown>[]
  /** Show row numbers */
  rowNumbers?: boolean
  /** Enable sorting */
  sortable?: boolean
  /** Enable filtering */
  filterable?: boolean
  /** Pagination */
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
}

/**
 * Timeline item
 */
export interface TimelineItem {
  /** Item title */
  title: string
  /** Item description */
  description?: string
  /** Date/time */
  date?: string
  /** Icon */
  icon?: string
  /** Status */
  status?: 'completed' | 'current' | 'upcoming'
}

/**
 * Timeline - Timeline display
 */
export interface TimelineProps {
  /** Timeline items */
  items: TimelineItem[]
  /** Layout variant */
  layout?: 'vertical' | 'horizontal'
}

// ============================================================================
// API Components
// ============================================================================

/**
 * API endpoint
 */
export interface APIEndpoint {
  /** HTTP method */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Path */
  path: string
  /** Description */
  description?: string
  /** Request body schema */
  body?: Record<string, unknown>
  /** Query parameters */
  query?: Record<string, unknown>
  /** Response schema */
  response?: Record<string, unknown>
  /** Example request */
  exampleRequest?: string
  /** Example response */
  exampleResponse?: string
}

/**
 * API - API documentation
 */
export interface APIProps {
  /** API title */
  title?: string
  /** API description */
  description?: string
  /** Base URL */
  baseUrl?: string
  /** API version */
  version?: string
  /** Endpoints */
  endpoints: APIEndpoint[]
  /** Authentication info */
  auth?: {
    type: 'bearer' | 'api-key' | 'basic' | 'oauth2'
    description?: string
  }
}

// ============================================================================
// Feedback Components
// ============================================================================

/**
 * Alert - Alert/notification message
 */
export interface AlertProps {
  /** Alert title */
  title?: string
  /** Alert message */
  message: string
  /** Alert type */
  type?: 'info' | 'success' | 'warning' | 'error'
  /** Is dismissible? */
  dismissible?: boolean
  /** Action */
  action?: Action
}

/**
 * Badge - Small badge/tag
 */
export interface BadgeProps {
  /** Badge text */
  label: string
  /** Badge variant */
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error'
  /** Size */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Progress - Progress indicator
 */
export interface ProgressProps {
  /** Current value (0-100) */
  value: number
  /** Max value */
  max?: number
  /** Show percentage label */
  showLabel?: boolean
  /** Size */
  size?: 'sm' | 'md' | 'lg'
  /** Color variant */
  variant?: 'default' | 'success' | 'warning' | 'error'
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * All component prop types
 */
export type ComponentProps =
  | AppProps
  | SiteProps
  | PageProps
  | SectionProps
  | ContainerProps
  | GridProps
  | StackProps
  | LandingPageProps
  | HeroProps
  | FeaturesProps
  | TestimonialsProps
  | PricingProps
  | FAQProps
  | CTAProps
  | BlogProps
  | BlogPostProps
  | DocsProps
  | CardProps
  | FormProps
  | NewsletterProps
  | ContactProps
  | StatsProps
  | TableProps
  | TimelineProps
  | APIProps
  | AlertProps
  | BadgeProps
  | ProgressProps

/**
 * Component name type
 */
export type ComponentName =
  | 'App'
  | 'Site'
  | 'Page'
  | 'Section'
  | 'Container'
  | 'Grid'
  | 'Stack'
  | 'LandingPage'
  | 'Hero'
  | 'Features'
  | 'Testimonials'
  | 'Pricing'
  | 'FAQ'
  | 'CTA'
  | 'Blog'
  | 'BlogPost'
  | 'Docs'
  | 'Card'
  | 'Form'
  | 'Newsletter'
  | 'Contact'
  | 'Stats'
  | 'Table'
  | 'Timeline'
  | 'API'
  | 'Alert'
  | 'Badge'
  | 'Progress'

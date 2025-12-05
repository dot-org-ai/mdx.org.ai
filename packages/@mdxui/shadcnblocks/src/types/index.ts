/**
 * Shared Types for ShadcnBlocks
 *
 * These types map shadcnblocks categories to our abstract Site/App component types.
 * This mapping helps identify gaps in our component/props system.
 */

import type { ReactNode } from 'react'

/**
 * Block categories from shadcnblocks.com (40+ categories)
 * Mapped to our abstract section types where possible
 */
export type BlockCategory =
  // Marketing Sections (maps to Site sections)
  | 'hero'           // → Hero section
  | 'features'       // → Features section
  | 'pricing'        // → Pricing section
  | 'testimonials'   // → Testimonials section
  | 'faq'            // → FAQ section
  | 'cta'            // → CTA section
  | 'stats'          // → Stats section
  | 'logos'          // → Logos section
  | 'newsletter'     // → Newsletter section
  | 'team'           // → Team section (GAP: not in @mdxui/html)
  | 'portfolio'      // → Gallery section (or Portfolio - GAP)
  | 'gallery'        // → Gallery section (GAP: not in @mdxui/html)
  | 'blog'           // → Blog section (GAP: not in @mdxui/html)
  | 'timeline'       // → Timeline section
  | 'comparison'     // → Comparison section (GAP: not in @mdxui/html)
  | 'contact'        // → Contact section (GAP: not in @mdxui/html)
  // Navigation
  | 'header'         // → Header (GAP: only in containers, not sections)
  | 'navbar'         // → Navigation (GAP: not explicit in @mdxui/html)
  | 'footer'         // → Footer (GAP: only in containers, not sections)
  | 'sidebar'        // → Sidebar (in layouts)
  // Authentication
  | 'login'          // → Auth (GAP: not in @mdxui/html)
  | 'signup'         // → Auth (GAP: not in @mdxui/html)
  | 'forgot-password' // → Auth (GAP: not in @mdxui/html)
  // Error pages
  | '404'            // → Error page (GAP: not in @mdxui/html)
  | '500'            // → Error page (GAP: not in @mdxui/html)
  // Content blocks
  | 'content'        // → Generic content (paragraphs, media)
  | 'cards'          // → Card grids (GAP: specialized cards)
  | 'bento'          // → Bento grid (GAP: not in @mdxui/html)
  | 'marquee'        // → Animated marquee (GAP)

/**
 * Hero block variants from shadcnblocks
 */
export interface HeroBlockProps {
  /** Small tagline above headline */
  badge?: string
  /** Main headline */
  title: string
  /** Description text */
  description?: string
  /** Primary CTA */
  primaryAction?: {
    label: string
    href: string
  }
  /** Secondary CTA */
  secondaryAction?: {
    label: string
    href: string
  }
  /** Hero image or media */
  image?: {
    src: string
    alt: string
  }
  /** Video instead of image */
  video?: {
    src: string
    poster?: string
  }
  /** Background variant */
  background?: 'none' | 'gradient' | 'dots' | 'grid' | 'glow'
  /** Layout variant */
  variant?: 'centered' | 'split' | 'image-right' | 'image-left' | 'video'
  children?: ReactNode
}

/**
 * Features block variants
 */
export interface FeaturesBlockProps {
  headline?: string
  description?: string
  features: Array<{
    icon?: ReactNode
    title: string
    description: string
    href?: string
  }>
  /** Layout variant */
  variant?: 'grid' | 'cards' | 'list' | 'bento' | 'alternating'
  /** Number of columns */
  columns?: 2 | 3 | 4
}

/**
 * Pricing block variants
 */
export interface PricingBlockProps {
  headline?: string
  description?: string
  /** Show monthly/annual toggle */
  billingToggle?: boolean
  tiers: Array<{
    name: string
    description?: string
    price: {
      monthly: string | number
      annual?: string | number
    }
    features: string[]
    cta: string
    ctaHref?: string
    featured?: boolean
    badge?: string
  }>
  /** Layout variant */
  variant?: 'cards' | 'table' | 'horizontal'
}

/**
 * Testimonials block variants
 */
export interface TestimonialsBlockProps {
  headline?: string
  testimonials: Array<{
    quote: string
    author: {
      name: string
      title?: string
      company?: string
      avatar?: string
    }
    rating?: number
    logo?: string
  }>
  /** Layout variant */
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee'
}

/**
 * Logo cloud block
 */
export interface LogoCloudBlockProps {
  title?: string
  logos: Array<{
    src: string
    alt: string
    href?: string
  }>
  /** Layout variant */
  variant?: 'grid' | 'marquee' | 'animated'
}

/**
 * Stats block
 */
export interface StatsBlockProps {
  stats: Array<{
    value: string | number
    label: string
    trend?: {
      value: string
      type: 'up' | 'down' | 'neutral'
    }
  }>
  /** Layout variant */
  variant?: 'cards' | 'inline' | 'centered'
}

/**
 * CTA block
 */
export interface CTABlockProps {
  headline: string
  description?: string
  primaryAction: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
  /** Background variant */
  background?: 'none' | 'gradient' | 'pattern' | 'image'
  /** Layout variant */
  variant?: 'centered' | 'split' | 'banner'
}

/**
 * Team block (GAP in @mdxui/html)
 */
export interface TeamBlockProps {
  headline?: string
  description?: string
  members: Array<{
    name: string
    role: string
    bio?: string
    avatar?: string
    social?: {
      twitter?: string
      linkedin?: string
      github?: string
    }
  }>
  /** Layout variant */
  variant?: 'grid' | 'cards' | 'carousel'
}

/**
 * Blog block (GAP in @mdxui/html)
 */
export interface BlogBlockProps {
  headline?: string
  posts: Array<{
    title: string
    excerpt?: string
    date: string
    author?: {
      name: string
      avatar?: string
    }
    image?: string
    href: string
    category?: string
  }>
  /** Layout variant */
  variant?: 'grid' | 'list' | 'featured'
}

/**
 * Contact block (GAP in @mdxui/html)
 */
export interface ContactBlockProps {
  headline?: string
  description?: string
  /** Show contact form */
  form?: boolean
  /** Contact info */
  info?: {
    email?: string
    phone?: string
    address?: string
    hours?: string
  }
  /** Social links */
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
  }
  /** Layout variant */
  variant?: 'split' | 'form-only' | 'info-only'
}

/**
 * Header/Navbar block (GAP in sections)
 */
export interface HeaderBlockProps {
  logo?: ReactNode
  brand?: {
    name: string
    href: string
  }
  navigation: Array<{
    label: string
    href: string
    children?: Array<{
      label: string
      href: string
      description?: string
    }>
  }>
  /** Actions (buttons) on right side */
  actions?: Array<{
    label: string
    href: string
    variant?: 'primary' | 'secondary' | 'ghost'
  }>
  /** Mobile menu variant */
  mobileVariant?: 'drawer' | 'dropdown' | 'fullscreen'
  /** Sticky behavior */
  sticky?: boolean
}

/**
 * Footer block (GAP in sections)
 */
export interface FooterBlockProps {
  logo?: ReactNode
  brand?: {
    name: string
    description?: string
  }
  columns: Array<{
    title: string
    links: Array<{
      label: string
      href: string
    }>
  }>
  social?: {
    twitter?: string
    linkedin?: string
    github?: string
    instagram?: string
  }
  legal?: {
    copyright?: string
    links?: Array<{
      label: string
      href: string
    }>
  }
  /** Newsletter form in footer */
  newsletter?: boolean
  /** Layout variant */
  variant?: 'simple' | 'columns' | 'mega'
}

/**
 * Auth block (GAP in @mdxui/html)
 */
export interface AuthBlockProps {
  /** Auth type */
  type: 'login' | 'signup' | 'forgot-password' | 'reset-password'
  /** Title */
  title?: string
  /** Description */
  description?: string
  /** Social login providers */
  socialProviders?: Array<'google' | 'github' | 'apple' | 'twitter'>
  /** Form submission handler */
  onSubmit?: (data: Record<string, string>) => void
  /** Redirect URL */
  redirectUrl?: string
  /** Layout variant */
  variant?: 'centered' | 'split' | 'minimal'
}

/**
 * Bento grid block (GAP in @mdxui/html)
 */
export interface BentoBlockProps {
  items: Array<{
    title: string
    description?: string
    icon?: ReactNode
    image?: string
    /** Grid span */
    span?: {
      cols?: 1 | 2 | 3
      rows?: 1 | 2
    }
    href?: string
  }>
  /** Number of columns */
  columns?: 2 | 3 | 4
}

/**
 * Error page block (GAP in @mdxui/html)
 */
export interface ErrorPageBlockProps {
  /** Error code */
  code: 404 | 500 | 403 | 401
  /** Error title */
  title?: string
  /** Error description */
  description?: string
  /** Action button */
  action?: {
    label: string
    href: string
  }
}

// =============================================================================
// GAPS IDENTIFIED:
// =============================================================================
//
// Missing from @mdxui/html sections:
// - Team section
// - Gallery section
// - Blog section
// - Contact section
// - Comparison section
//
// Missing from @mdxui/html containers:
// - Bento grid container
//
// Missing from @mdxui/html altogether:
// - Header/Navbar as a section (only as container)
// - Footer as a section (only as container)
// - Auth pages (login, signup, forgot-password)
// - Error pages (404, 500, etc.)
// - Marquee/animated elements
//
// Props gaps in existing sections:
// - Hero: missing badge, background, video support
// - Features: missing bento, alternating variants
// - Pricing: missing billingToggle, badge on tiers
// - Testimonials: missing rating, logo, masonry/marquee variants
// - Stats: missing trend indicator
//
// =============================================================================

/**
 * Shared Types for Tailark
 *
 * Types for marketing blocks built with shadcn/ui and Tailwind CSS.
 * Tailark focuses on conversion-optimized marketing pages.
 */

import type { ReactNode } from 'react'

/**
 * Tailark block categories (15+ categories)
 */
export type TailarkCategory =
  | 'hero'
  | 'logo-cloud'
  | 'features'
  | 'integrations'
  | 'stats'
  | 'team'
  | 'testimonials'
  | 'pricing'
  | 'faq'
  | 'cta'
  | 'footer'
  | 'authentication'
  | 'newsletter'
  | 'contact'
  | 'content'

/**
 * Hero variants from Tailark
 */
export type HeroVariant =
  | 'centered'        // Centered text with optional image below
  | 'split'           // Text left, image right
  | 'split-reverse'   // Image left, text right
  | 'video'           // With embedded video
  | 'gradient'        // With gradient background
  | 'dark'            // Dark background variant
  | 'pattern'         // With background pattern
  | 'minimal'         // Minimal, text-focused

/**
 * Hero props (Tailark enhanced)
 */
export interface TailarkHeroProps {
  variant?: HeroVariant
  /** Announcement banner/badge above headline */
  announcement?: {
    text: string
    href?: string
  }
  /** Main headline */
  headline: string
  /** Subheadline/description */
  description?: string
  /** Primary CTA */
  primaryCta?: {
    text: string
    href: string
  }
  /** Secondary CTA */
  secondaryCta?: {
    text: string
    href: string
  }
  /** Hero image */
  image?: {
    src: string
    alt: string
  }
  /** Trusted by logos */
  trustedBy?: Array<{
    src: string
    alt: string
  }>
  /** Custom content below CTAs */
  children?: ReactNode
}

/**
 * Feature item
 */
export interface FeatureItem {
  icon?: ReactNode
  title: string
  description: string
  image?: string
  href?: string
}

/**
 * Features props
 */
export interface TailarkFeaturesProps {
  /** Section title */
  title?: string
  /** Section description */
  description?: string
  /** Feature items */
  features: FeatureItem[]
  /** Layout variant */
  variant?: 'grid' | 'cards' | 'list' | 'bento' | 'alternating'
  /** Number of columns */
  columns?: 2 | 3 | 4
}

/**
 * Integration/logo item
 */
export interface IntegrationItem {
  name: string
  logo: string
  href?: string
  category?: string
}

/**
 * Integrations props
 */
export interface TailarkIntegrationsProps {
  title?: string
  description?: string
  integrations: IntegrationItem[]
  /** Show category tabs */
  showCategories?: boolean
  /** CTA at bottom */
  cta?: {
    text: string
    href: string
  }
}

/**
 * Testimonial item (enhanced)
 */
export interface TailarkTestimonialItem {
  quote: string
  author: {
    name: string
    title?: string
    company?: string
    avatar?: string
  }
  rating?: number
  logo?: string
  /** Highlight/featured */
  featured?: boolean
}

/**
 * Testimonials props
 */
export interface TailarkTestimonialsProps {
  title?: string
  testimonials: TailarkTestimonialItem[]
  variant?: 'cards' | 'carousel' | 'masonry' | 'marquee' | 'wall'
}

/**
 * Pricing tier
 */
export interface TailarkPricingTier {
  name: string
  description?: string
  price: {
    monthly: string | number
    annual?: string | number
  }
  features: Array<{
    text: string
    included: boolean
  }>
  cta: string
  ctaHref?: string
  featured?: boolean
  badge?: string
}

/**
 * Pricing props
 */
export interface TailarkPricingProps {
  title?: string
  description?: string
  billingToggle?: boolean
  tiers: TailarkPricingTier[]
  variant?: 'cards' | 'table' | 'horizontal'
  /** FAQ below pricing */
  faq?: Array<{
    question: string
    answer: string
  }>
}

/**
 * FAQ item
 */
export interface FAQItem {
  question: string
  answer: string
  category?: string
}

/**
 * FAQ props
 */
export interface TailarkFAQProps {
  title?: string
  description?: string
  items: FAQItem[]
  variant?: 'accordion' | 'cards' | 'columns'
  /** Show category tabs */
  showCategories?: boolean
}

/**
 * Footer column
 */
export interface FooterColumn {
  title: string
  links: Array<{
    text: string
    href: string
  }>
}

/**
 * Footer props
 */
export interface TailarkFooterProps {
  brand: {
    logo?: ReactNode
    name: string
    description?: string
  }
  columns: FooterColumn[]
  social?: {
    twitter?: string
    github?: string
    linkedin?: string
    youtube?: string
    discord?: string
  }
  legal?: {
    copyright: string
    links?: Array<{
      text: string
      href: string
    }>
  }
  /** Newsletter in footer */
  newsletter?: {
    title?: string
    description?: string
    placeholder?: string
    buttonText?: string
  }
  variant?: 'simple' | 'columns' | 'mega'
}

/**
 * Auth page type
 */
export type AuthType = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email'

/**
 * Auth props
 */
export interface TailarkAuthProps {
  type: AuthType
  logo?: ReactNode
  title?: string
  description?: string
  socialProviders?: Array<'google' | 'github' | 'apple' | 'twitter' | 'microsoft'>
  onSubmit?: (data: Record<string, string>) => void
  variant?: 'centered' | 'split' | 'minimal'
}

// =============================================================================
// GAPS IDENTIFIED FROM TAILARK:
// =============================================================================
//
// Tailark has enhanced versions of blocks that @mdxui/html doesn't have:
//
// 1. Hero enhancements:
//    - announcement banner/badge - GAP
//    - trustedBy logos inline - GAP
//    - video variant - partial (no native video support)
//    - gradient/pattern backgrounds - GAP (handled by @mdxui/magicui)
//
// 2. Integrations section - GAP (specialized logo cloud with categories)
//
// 3. Testimonials enhancements:
//    - wall variant (many small testimonials) - GAP
//    - marquee variant - GAP
//    - masonry variant - GAP
//
// 4. Pricing enhancements:
//    - features with included/excluded state - GAP
//    - inline FAQ - GAP
//    - comparison table variant - GAP
//
// 5. Footer enhancements:
//    - newsletter integration - GAP
//    - social links with multiple platforms - partial
//    - mega footer variant - GAP
//
// 6. Auth pages - GAP in @mdxui/html
//
// =============================================================================

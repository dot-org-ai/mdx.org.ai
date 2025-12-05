/**
 * Sample Data for Storybook Stories
 *
 * Shared mock data used across all layout stories.
 */

import * as React from 'react'
import {
  Zap,
  Shield,
  Rocket,
  Users,
  BarChart3,
  Globe,
  Code,
  Database,
  Cloud,
  Lock,
  Star,
  CheckCircle,
  ArrowRight,
  Home,
  Settings,
  FileText,
  Bell,
  Search,
  Mail,
  Calendar,
  Folder,
} from 'lucide-react'

// =============================================================================
// Brand Data
// =============================================================================

export const sampleBrand = {
  name: 'Acme Inc',
  logo: <span style={{ fontWeight: 700, fontSize: '1.25rem' }}>Acme</span>,
  href: '/',
  description: 'Building the future of software development.',
}

export const sampleNavigation = [
  { label: 'Features', href: '#features' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Docs', href: '/docs' },
  { label: 'Blog', href: '/blog' },
]

export const sampleHeaderActions = [
  { label: 'Sign In', href: '/login', variant: 'ghost' as const },
  { label: 'Get Started', href: '/signup', variant: 'primary' as const },
]

// =============================================================================
// Hero Data
// =============================================================================

export const sampleHero = {
  badge: 'Now in Public Beta',
  announcement: {
    text: 'Announcing our Series A funding',
    href: '/blog/series-a',
  },
  title: 'Build faster with modern tools',
  headline: 'Build faster with modern tools',
  description:
    'The complete platform for building production-ready applications. Ship faster, scale effortlessly, and delight your users.',
  primaryAction: { label: 'Start Free Trial', href: '/signup' },
  secondaryAction: { label: 'View Demo', href: '/demo' },
  trustedBy: [
    { name: 'Vercel', logo: <span style={{ opacity: 0.6 }}>Vercel</span> },
    { name: 'Stripe', logo: <span style={{ opacity: 0.6 }}>Stripe</span> },
    { name: 'GitHub', logo: <span style={{ opacity: 0.6 }}>GitHub</span> },
    { name: 'Linear', logo: <span style={{ opacity: 0.6 }}>Linear</span> },
  ],
}

// =============================================================================
// Features Data
// =============================================================================

export const sampleFeatures = [
  {
    icon: <Zap size={24} />,
    title: 'Lightning Fast',
    description: 'Built on the edge for instant response times. Your users will love the speed.',
  },
  {
    icon: <Shield size={24} />,
    title: 'Secure by Default',
    description: 'Enterprise-grade security with SOC2 compliance and end-to-end encryption.',
  },
  {
    icon: <Rocket size={24} />,
    title: 'Ship Faster',
    description: 'Pre-built components and templates let you focus on what makes you unique.',
  },
  {
    icon: <Users size={24} />,
    title: 'Team Collaboration',
    description: 'Real-time collaboration features keep your team in sync across time zones.',
  },
  {
    icon: <BarChart3 size={24} />,
    title: 'Built-in Analytics',
    description: 'Understand your users with detailed analytics and conversion tracking.',
  },
  {
    icon: <Globe size={24} />,
    title: 'Global CDN',
    description: 'Automatically deployed to 200+ edge locations worldwide for maximum reach.',
  },
]

export const sampleFeaturesSection = {
  headline: 'Everything you need to succeed',
  description: 'Powerful features that help you ship faster and scale effortlessly.',
  features: sampleFeatures,
}

// =============================================================================
// Pricing Data
// =============================================================================

export const samplePricingTiers = [
  {
    name: 'Starter',
    description: 'Perfect for side projects and small teams.',
    price: { monthly: '$0', yearly: '$0' },
    features: ['Up to 3 projects', '1GB storage', 'Community support', 'Basic analytics'],
    cta: 'Start Free',
    ctaHref: '/signup?plan=starter',
  },
  {
    name: 'Pro',
    description: 'For growing teams that need more power.',
    price: { monthly: '$29', yearly: '$290' },
    features: [
      'Unlimited projects',
      '100GB storage',
      'Priority support',
      'Advanced analytics',
      'Custom domains',
      'Team collaboration',
    ],
    cta: 'Start Trial',
    ctaHref: '/signup?plan=pro',
    featured: true,
  },
  {
    name: 'Enterprise',
    description: 'For organizations with advanced needs.',
    price: { monthly: '$99', yearly: '$990' },
    features: [
      'Everything in Pro',
      'Unlimited storage',
      'Dedicated support',
      'SSO & SAML',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    ctaHref: '/contact',
  },
]

export const samplePricingSection = {
  headline: 'Simple, transparent pricing',
  description: 'Choose the plan that fits your needs. All plans include a 14-day free trial.',
  tiers: samplePricingTiers,
}

// =============================================================================
// Testimonials Data
// =============================================================================

export const sampleTestimonials = [
  {
    quote:
      "This platform has completely transformed how we build products. We've cut our development time in half.",
    author: {
      name: 'Sarah Chen',
      title: 'CTO',
      company: 'TechStart',
      avatar: 'https://i.pravatar.cc/150?u=sarah',
    },
  },
  {
    quote:
      "The best developer experience I've ever had. The documentation is excellent and the support team is incredibly responsive.",
    author: {
      name: 'Marcus Johnson',
      title: 'Lead Developer',
      company: 'DevCorp',
      avatar: 'https://i.pravatar.cc/150?u=marcus',
    },
  },
  {
    quote:
      "We migrated our entire infrastructure in a weekend. The migration tools made it seamless.",
    author: {
      name: 'Emily Rodriguez',
      title: 'Engineering Manager',
      company: 'ScaleUp',
      avatar: 'https://i.pravatar.cc/150?u=emily',
    },
  },
]

export const sampleTestimonialsSection = {
  headline: 'Loved by developers worldwide',
  testimonials: sampleTestimonials,
}

// =============================================================================
// FAQ Data
// =============================================================================

export const sampleFAQItems = [
  {
    question: 'How do I get started?',
    answer:
      'Sign up for a free account, create your first project, and follow our quickstart guide. You can have your first app deployed in under 5 minutes.',
  },
  {
    question: 'Can I use my own domain?',
    answer:
      'Yes! All paid plans include custom domain support. Simply add your domain in the project settings and we handle SSL certificates automatically.',
  },
  {
    question: 'What payment methods do you accept?',
    answer:
      'We accept all major credit cards, PayPal, and wire transfers for enterprise customers. All payments are processed securely through Stripe.',
  },
  {
    question: 'Is there a free tier?',
    answer:
      'Yes! Our Starter plan is free forever and includes everything you need to get started. Upgrade anytime as your needs grow.',
  },
  {
    question: 'Do you offer refunds?',
    answer:
      "We offer a 30-day money-back guarantee on all paid plans. If you're not satisfied, contact us for a full refund.",
  },
]

export const sampleFAQSection = {
  headline: 'Frequently Asked Questions',
  items: sampleFAQItems,
}

// =============================================================================
// Footer Data
// =============================================================================

export const sampleFooterColumns = [
  {
    title: 'Product',
    links: [
      { text: 'Features', href: '#features' },
      { text: 'Pricing', href: '#pricing' },
      { text: 'Changelog', href: '/changelog' },
      { text: 'Roadmap', href: '/roadmap' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { text: 'Documentation', href: '/docs' },
      { text: 'API Reference', href: '/api' },
      { text: 'Guides', href: '/guides' },
      { text: 'Blog', href: '/blog' },
    ],
  },
  {
    title: 'Company',
    links: [
      { text: 'About', href: '/about' },
      { text: 'Careers', href: '/careers' },
      { text: 'Contact', href: '/contact' },
      { text: 'Press', href: '/press' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { text: 'Privacy', href: '/privacy' },
      { text: 'Terms', href: '/terms' },
      { text: 'Security', href: '/security' },
    ],
  },
]

export const sampleFooter = {
  brand: sampleBrand,
  columns: sampleFooterColumns,
  social: [
    { platform: 'Twitter', href: 'https://twitter.com', icon: <span>𝕏</span> },
    { platform: 'GitHub', href: 'https://github.com', icon: <Code size={20} /> },
    { platform: 'Discord', href: 'https://discord.com', icon: <span>💬</span> },
  ],
  legal: {
    copyright: `© ${new Date().getFullYear()} Acme Inc. All rights reserved.`,
    links: [
      { text: 'Privacy Policy', href: '/privacy' },
      { text: 'Terms of Service', href: '/terms' },
    ],
  },
}

// =============================================================================
// Dashboard/KPI Data
// =============================================================================

export const sampleKPIs = [
  {
    title: 'Total Revenue',
    value: '$45,231.89',
    change: '+20.1%',
    trend: { value: '+20.1%', direction: 'up' as const },
  },
  {
    title: 'Subscriptions',
    value: '+2,350',
    change: '+180.1%',
    trend: { value: '+180.1%', direction: 'up' as const },
  },
  {
    title: 'Active Users',
    value: '12,543',
    change: '+19%',
    trend: { value: '+19%', direction: 'up' as const },
  },
  {
    title: 'Churn Rate',
    value: '2.4%',
    change: '-0.5%',
    trend: { value: '-0.5%', direction: 'down' as const },
  },
]

// =============================================================================
// Admin Navigation Data
// =============================================================================

export const sampleAdminNavigation = [
  { label: 'Dashboard', href: '/', icon: <Home size={18} />, active: true },
  { label: 'Analytics', href: '/analytics', icon: <BarChart3 size={18} /> },
  {
    label: 'Users',
    icon: <Users size={18} />,
    children: [
      { label: 'All Users', href: '/users' },
      { label: 'Add User', href: '/users/new' },
      { label: 'Roles', href: '/users/roles' },
    ],
  },
  {
    label: 'Content',
    icon: <FileText size={18} />,
    children: [
      { label: 'Posts', href: '/content/posts' },
      { label: 'Pages', href: '/content/pages' },
      { label: 'Media', href: '/content/media' },
    ],
  },
  { label: 'Settings', href: '/settings', icon: <Settings size={18} /> },
]

export const sampleSpotlightActions = [
  {
    id: 'home',
    label: 'Go to Dashboard',
    description: 'Navigate to the main dashboard',
    icon: <Home size={18} />,
    onClick: () => console.log('Navigate to dashboard'),
  },
  {
    id: 'search-users',
    label: 'Search Users',
    description: 'Find users by name or email',
    icon: <Search size={18} />,
    onClick: () => console.log('Open user search'),
  },
  {
    id: 'new-post',
    label: 'Create New Post',
    description: 'Start writing a new blog post',
    icon: <FileText size={18} />,
    onClick: () => console.log('Create new post'),
  },
  {
    id: 'settings',
    label: 'Open Settings',
    description: 'Configure your account settings',
    icon: <Settings size={18} />,
    onClick: () => console.log('Open settings'),
  },
]

// =============================================================================
// Integrations Data
// =============================================================================

export const sampleIntegrations = [
  { name: 'Slack', logo: <span style={{ fontSize: '2rem' }}>💬</span>, category: 'Communication' },
  { name: 'GitHub', logo: <Code size={32} />, category: 'Development' },
  { name: 'Stripe', logo: <span style={{ fontSize: '2rem' }}>💳</span>, category: 'Payments' },
  { name: 'AWS', logo: <Cloud size={32} />, category: 'Infrastructure' },
  { name: 'MongoDB', logo: <Database size={32} />, category: 'Database' },
  { name: 'Auth0', logo: <Lock size={32} />, category: 'Security' },
  { name: 'Vercel', logo: <span style={{ fontSize: '2rem' }}>▲</span>, category: 'Deployment' },
  { name: 'Figma', logo: <span style={{ fontSize: '2rem' }}>🎨</span>, category: 'Design' },
]

export const sampleIntegrationsSection = {
  headline: 'Integrates with your favorite tools',
  description: 'Connect with the tools you already use and love.',
  integrations: sampleIntegrations,
}

// =============================================================================
// CTA Data
// =============================================================================

export const sampleCTA = {
  headline: 'Ready to get started?',
  description: 'Join thousands of developers building with our platform.',
  action: { label: 'Start Free Trial', href: '/signup' },
}

// =============================================================================
// Demo Data (for Sonic layout)
// =============================================================================

export const sampleDemo = {
  type: 'image' as const,
  image: {
    src: 'https://placehold.co/1200x800/1a1a2e/ffffff?text=Product+Demo',
    alt: 'Product demo screenshot',
  },
}

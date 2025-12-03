/**
 * Example: Digital Products Integration
 *
 * This example demonstrates how to use digital-products primitives
 * with mdxui component props.
 */

import { Site, App, API, Content, Nav, SEO, Analytics, Endpoint, APIAuth, Route, State, Auth } from 'digital-products'
import { siteToProps, appToProps, apiToProps, contentToProps, isBlogContent, isDocsContent } from 'mdxui/products'

// ============================================================================
// Example 1: Site Definition
// ============================================================================

const docsSite = Site({
  id: 'docs',
  name: 'My Documentation',
  description: 'Product documentation site',
  version: '1.0.0',
  generator: 'fumadocs',
  navigation: [
    Nav('Home', '/'),
    Nav('Docs', '/docs', {
      children: [
        Nav('Getting Started', '/docs/getting-started'),
        Nav('API Reference', '/docs/api-reference'),
        Nav('Examples', '/docs/examples'),
      ],
    }),
    Nav('Blog', '/blog'),
  ],
  seo: SEO({
    titleTemplate: '%s | My Docs',
    description: 'Official documentation for My Product',
    keywords: ['docs', 'api', 'reference', 'guides'],
    ogImage: '/og-docs.png',
    twitterCard: 'summary_large_image',
  }),
  analytics: Analytics('plausible', 'docs.example.com'),
})

// Convert to mdxui SiteProps
const siteProps = siteToProps(docsSite)

console.log('Site Props:', siteProps)
// Use with: <Site {...siteProps}>{children}</Site>

// ============================================================================
// Example 2: App Definition
// ============================================================================

const dashboardApp = App({
  id: 'dashboard',
  name: 'Dashboard',
  description: 'Admin dashboard application',
  version: '1.0.0',
  framework: 'react',
  routes: [
    Route('/', 'Home'),
    Route('/dashboard', 'Dashboard', {
      meta: { requiresAuth: true },
    }),
    Route('/users', 'UserList', {
      meta: { requiresAuth: true, roles: ['admin'] },
    }),
    Route('/users/:id', 'UserDetail', {
      meta: { requiresAuth: true },
    }),
    Route('/settings', 'Settings', {
      meta: { requiresAuth: true },
    }),
  ],
  config: {
    title: 'Dashboard App',
    theme: {
      mode: 'dark',
      primaryColor: '#3b82f6',
    },
  },
  state: State({
    library: 'zustand',
    schema: {
      user: 'Current authenticated user',
      settings: 'Application settings',
      notifications: 'User notifications array',
    },
    persistence: {
      type: 'local',
      key: 'dashboard-state',
    },
  }),
  auth: Auth({
    provider: 'clerk',
    protectedRoutes: ['/dashboard', '/users', '/settings'],
    roles: ['user', 'admin'],
  }),
})

// Convert to mdxui AppProps
const appProps = appToProps(dashboardApp)

console.log('App Props:', appProps)
// Use with: <App {...appProps}>{children}</App>

// ============================================================================
// Example 3: API Definition
// ============================================================================

const restAPI = API({
  id: 'rest-api',
  name: 'My REST API',
  description: 'RESTful API for managing resources',
  version: '2.0.0',
  style: 'rest',
  baseUrl: 'https://api.example.com/v2',
  endpoints: [
    Endpoint('GET', '/users', 'List all users', {
      query: {
        page: 'number',
        limit: 'number',
        search: 'string',
      } as any,
      response: {
        users: 'Array of user objects',
        total: 'Total count (number)',
        page: 'Current page (number)',
      } as any,
    }),
    Endpoint('GET', '/users/:id', 'Get user by ID', {
      params: {
        id: 'string',
      },
      response: {
        id: 'string',
        name: 'string',
        email: 'string',
        createdAt: 'string (ISO date)',
      } as any,
      auth: true,
    }),
    Endpoint('POST', '/users', 'Create a new user', {
      request: {
        name: 'string (required)',
        email: 'string (required)',
        role: 'string (optional)',
      } as any,
      response: {
        id: 'string',
        name: 'string',
        email: 'string',
      } as any,
      auth: true,
    }),
    Endpoint('PUT', '/users/:id', 'Update user', {
      params: {
        id: 'string',
      },
      request: {
        name: 'string (optional)',
        email: 'string (optional)',
      } as any,
      response: {
        id: 'string',
        name: 'string',
        email: 'string',
        updatedAt: 'string (ISO date)',
      } as any,
      auth: true,
    }),
    Endpoint('DELETE', '/users/:id', 'Delete user', {
      params: {
        id: 'string',
      },
      response: {
        success: 'boolean',
      } as any,
      auth: true,
    }),
  ],
  auth: APIAuth({
    type: 'bearer',
    header: 'Authorization',
  }),
  rateLimit: {
    requests: 100,
    window: 60, // 60 seconds
    onExceeded: 'reject',
  },
})

// Convert to mdxui APIProps
const apiProps = apiToProps(restAPI)

console.log('API Props:', apiProps)
// Use with: <API {...apiProps} />

// ============================================================================
// Example 4: Content Definition (Blog)
// ============================================================================

const blogContent = Content({
  id: 'blog',
  name: 'Company Blog',
  description: 'Blog posts about technology and product updates',
  version: '1.0.0',
  format: 'mdx',
  source: './content/blog',
  categories: ['Blog', 'Technology', 'Product Updates'],
  frontmatter: {
    title: 'string',
    author: 'string',
    date: 'date',
    tags: 'string[]',
    excerpt: 'string',
    coverImage: 'string',
  } as any,
  metadata: {
    type: 'blog',
    posts: [
      {
        title: 'Introducing Our New Product',
        slug: 'introducing-new-product',
        excerpt: 'We are excited to announce our latest product...',
        date: '2025-01-15',
        tags: ['product', 'announcement'],
      },
      {
        title: 'Building Scalable APIs',
        slug: 'building-scalable-apis',
        excerpt: 'Learn how to build scalable APIs with best practices...',
        date: '2025-01-10',
        tags: ['api', 'development', 'tutorial'],
      },
    ],
    layout: 'grid',
  },
})

// Convert to mdxui BlogProps or DocsProps
const contentResult = contentToProps(blogContent)

if (isBlogContent(contentResult)) {
  console.log('Blog Props:', contentResult.props)
  // Use with: <Blog {...contentResult.props} />
}

// ============================================================================
// Example 5: Content Definition (Docs)
// ============================================================================

const docsContent = Content({
  id: 'documentation',
  name: 'Product Documentation',
  description: 'Comprehensive product documentation',
  version: '1.0.0',
  format: 'mdx',
  source: './content/docs',
  categories: ['Documentation', 'Guides', 'Reference'],
  metadata: {
    type: 'docs',
    nav: [
      { label: 'Getting Started', href: '/docs/getting-started' },
      { label: 'Installation', href: '/docs/installation' },
      { label: 'Configuration', href: '/docs/configuration' },
      { label: 'API Reference', href: '/docs/api-reference' },
    ],
    toc: [
      { title: 'Introduction', id: 'intro', level: 1 },
      { title: 'Quick Start', id: 'quick-start', level: 2 },
      { title: 'Basic Usage', id: 'basic-usage', level: 2 },
      { title: 'Advanced Topics', id: 'advanced', level: 1 },
    ],
    prev: { title: 'Introduction', href: '/docs/intro' },
    next: { title: 'Installation', href: '/docs/installation' },
    editUrl: 'https://github.com/example/repo/edit/main/docs',
  },
})

const docsResult = contentToProps(docsContent)

if (isDocsContent(docsResult)) {
  console.log('Docs Props:', docsResult.props)
  // Use with: <Docs {...docsResult.props}>{children}</Docs>
}

// ============================================================================
// Example 6: Using productToProps for Generic Conversion
// ============================================================================

import { productToProps, productsToProps } from 'mdxui/products'

// Convert any product
const genericSiteProps = productToProps(docsSite)
const genericAppProps = productToProps(dashboardApp)
const genericApiProps = productToProps(restAPI)
const genericContentProps = productToProps(blogContent)

console.log('Generic conversions:', {
  site: genericSiteProps,
  app: genericAppProps,
  api: genericApiProps,
  content: genericContentProps,
})

// Batch convert multiple products
const allProducts = [docsSite, dashboardApp, restAPI, blogContent]
const allProps = productsToProps(allProducts)

console.log('Batch conversion:', allProps)

// ============================================================================
// Example 7: Using with Product Registry
// ============================================================================

import { registry } from 'digital-products'

// Get all registered products and convert them
const registeredProducts = registry.list()
const registeredProps = productsToProps(registeredProducts)

console.log('Registered products props:', registeredProps)

// Get specific product type
const sites = registry.listByType('site')
const sitePropsArray = sites.map(siteToProps)

console.log('All site props:', sitePropsArray)

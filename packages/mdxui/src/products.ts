/**
 * Digital Products Integration
 *
 * Bridges digital-products primitives to mdxui component props.
 * Converts product definitions (Site, App, API, Content) to component prop types.
 *
 * @packageDocumentation
 */

import type {
  SiteDefinition,
  AppDefinition,
  APIDefinition,
  ContentDefinition,
  NavigationDefinition as ProductNavDefinition,
  SEOConfig as ProductSEOConfig,
  RouteDefinition,
  EndpointDefinition,
} from 'digital-products'

import type {
  SiteProps,
  AppProps,
  APIProps,
  BlogProps,
  DocsProps,
  NavItem,
  SEO,
  BlogPost,
} from './types.js'

// Re-export digital-products types for consumers
export type {
  SiteDefinition,
  AppDefinition,
  APIDefinition,
  ContentDefinition,
  DataDefinition,
  DatasetDefinition,
  MCPDefinition,
  SDKDefinition,
  ProductDefinition,
  NavigationDefinition,
  SEOConfig,
  AnalyticsConfig,
  RouteDefinition,
  EndpointDefinition,
  WorkflowDefinition,
} from 'digital-products'

// ============================================================================
// Converter Functions
// ============================================================================

/**
 * Convert a NavigationDefinition to mdxui NavItem
 */
function convertNavItem(nav: ProductNavDefinition): NavItem {
  return {
    label: nav.label,
    href: nav.href,
    icon: nav.icon,
    children: nav.children?.map(convertNavItem),
  }
}

/**
 * Convert SEOConfig to mdxui SEO
 */
function convertSEO(seo: ProductSEOConfig): SEO {
  return {
    title: seo.titleTemplate,
    description: seo.description,
    keywords: seo.keywords,
    image: seo.ogImage,
  }
}

/**
 * Convert SiteDefinition to SiteProps
 *
 * Transforms a digital-products Site definition into component props
 * suitable for rendering with mdxui Site component.
 *
 * @example
 * ```ts
 * import { Site } from 'digital-products'
 * import { siteToProps } from 'mdxui/products'
 *
 * const site = Site({
 *   id: 'docs',
 *   name: 'My Docs',
 *   description: 'Documentation site',
 *   version: '1.0.0',
 *   navigation: [
 *     Nav('Home', '/'),
 *     Nav('Docs', '/docs'),
 *   ],
 *   seo: {
 *     titleTemplate: '%s | My Docs',
 *     description: 'Official documentation',
 *   },
 * })
 *
 * const props = siteToProps(site)
 * // Use with Site component: <Site {...props} />
 * ```
 */
export function siteToProps(site: SiteDefinition): SiteProps {
  return {
    name: site.name,
    nav: site.navigation?.map(convertNavItem),
    seo: site.seo ? convertSEO(site.seo) : undefined,
    // logo, footerNav, social, copyright can be added via metadata
    logo: site.metadata?.logo as string | undefined,
    copyright: site.metadata?.copyright as string | undefined,
  }
}

/**
 * Convert AppDefinition to AppProps
 *
 * Transforms a digital-products App definition into component props
 * suitable for rendering with mdxui App component.
 *
 * @example
 * ```ts
 * import { App } from 'digital-products'
 * import { appToProps } from 'mdxui/products'
 *
 * const app = App({
 *   id: 'my-app',
 *   name: 'My App',
 *   description: 'Web application',
 *   version: '1.0.0',
 *   framework: 'react',
 *   config: {
 *     title: 'My App',
 *     theme: { mode: 'dark' },
 *   },
 * })
 *
 * const props = appToProps(app)
 * // Use with App component: <App {...props}>{children}</App>
 * ```
 */
export function appToProps(app: AppDefinition): AppProps {
  return {
    name: app.config?.title || app.name,
    theme: app.config?.theme as AppProps['theme'],
    locale: app.metadata?.locale as string | undefined,
    seo: app.metadata?.seo as SEO | undefined,
  }
}

/**
 * Convert APIDefinition to APIProps
 *
 * Transforms a digital-products API definition into component props
 * suitable for rendering with mdxui API component.
 *
 * @example
 * ```ts
 * import { API, Endpoint } from 'digital-products'
 * import { apiToProps } from 'mdxui/products'
 *
 * const api = API({
 *   id: 'my-api',
 *   name: 'My API',
 *   description: 'RESTful API',
 *   version: '1.0.0',
 *   baseUrl: 'https://api.example.com',
 *   endpoints: [
 *     Endpoint('GET', '/users', 'List users'),
 *     Endpoint('POST', '/users', 'Create user'),
 *   ],
 *   auth: {
 *     type: 'bearer',
 *     header: 'Authorization',
 *   },
 * })
 *
 * const props = apiToProps(api)
 * // Use with API component: <API {...props} />
 * ```
 */
export function apiToProps(api: APIDefinition): APIProps {
  return {
    title: api.name,
    description: api.description,
    baseUrl: api.baseUrl,
    version: api.version,
    endpoints: api.endpoints
      ?.filter((endpoint: EndpointDefinition) => {
        // Filter out methods not supported by mdxui APIEndpoint type
        return ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(endpoint.method)
      })
      .map((endpoint: EndpointDefinition) => ({
        method: endpoint.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
        path: endpoint.path,
        description: endpoint.description,
        body: endpoint.request as Record<string, unknown> | undefined,
        query: endpoint.query as Record<string, unknown> | undefined,
        response: endpoint.response as Record<string, unknown> | undefined,
      })) || [],
    auth: api.auth
      ? {
          type: api.auth.type as 'bearer' | 'api-key' | 'basic' | 'oauth2',
          description: (api.auth as { description?: string }).description,
        }
      : undefined,
  }
}

/**
 * Convert ContentDefinition to BlogProps or DocsProps
 *
 * Determines the appropriate content component type and converts
 * the content definition to matching props.
 *
 * @example
 * ```ts
 * import { Content } from 'digital-products'
 * import { contentToProps } from 'mdxui/products'
 *
 * const blogContent = Content({
 *   id: 'blog',
 *   name: 'Blog Posts',
 *   description: 'Company blog',
 *   version: '1.0.0',
 *   format: 'mdx',
 *   categories: ['Technology', 'Business'],
 * })
 *
 * const props = contentToProps(blogContent)
 * // props.type === 'blog'
 * // Use with Blog component: <Blog {...props.props} />
 * ```
 */
export function contentToProps(
  content: ContentDefinition
): { type: 'blog' | 'docs'; props: BlogProps | DocsProps } {
  // Determine content type based on metadata or categories
  const isBlog =
    content.metadata?.type === 'blog' ||
    content.categories?.some((cat: string) =>
      ['blog', 'posts', 'articles', 'news'].includes(cat.toLowerCase())
    )

  const isDocs =
    content.metadata?.type === 'docs' ||
    content.categories?.some((cat: string) =>
      ['docs', 'documentation', 'guides', 'reference'].includes(cat.toLowerCase())
    )

  if (isBlog || (!isDocs && content.format === 'mdx')) {
    // Convert to BlogProps
    const posts: BlogPost[] = content.metadata?.posts as BlogPost[] | undefined || []

    return {
      type: 'blog',
      props: {
        title: content.name,
        description: content.description,
        posts,
        layout: (content.metadata?.layout as BlogProps['layout']) || 'grid',
      },
    }
  } else {
    // Convert to DocsProps
    return {
      type: 'docs',
      props: {
        title: content.name,
        nav: content.metadata?.nav as NavItem[] | undefined,
        toc: content.metadata?.toc as DocsProps['toc'],
        prev: content.metadata?.prev as DocsProps['prev'],
        next: content.metadata?.next as DocsProps['next'],
        editUrl: content.metadata?.editUrl as string | undefined,
      },
    }
  }
}

/**
 * Type guard to check if content is blog content
 */
export function isBlogContent(
  result: ReturnType<typeof contentToProps>
): result is { type: 'blog'; props: BlogProps } {
  return result.type === 'blog'
}

/**
 * Type guard to check if content is docs content
 */
export function isDocsContent(
  result: ReturnType<typeof contentToProps>
): result is { type: 'docs'; props: DocsProps } {
  return result.type === 'docs'
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert any product definition to appropriate component props
 *
 * Generic converter that dispatches to the appropriate converter
 * based on product type.
 *
 * @example
 * ```ts
 * import { Site, App, API } from 'digital-products'
 * import { productToProps } from 'mdxui/products'
 *
 * const site = Site({ ... })
 * const siteProps = productToProps(site)
 *
 * const app = App({ ... })
 * const appProps = productToProps(app)
 * ```
 */
export function productToProps(
  product:
    | SiteDefinition
    | AppDefinition
    | APIDefinition
    | ContentDefinition
): SiteProps | AppProps | APIProps | { type: 'blog' | 'docs'; props: BlogProps | DocsProps } {
  switch (product.type) {
    case 'site':
      return siteToProps(product)
    case 'app':
      return appToProps(product)
    case 'api':
      return apiToProps(product)
    case 'content':
      return contentToProps(product)
    default:
      throw new Error(`Unsupported product type: ${(product as { type: string }).type}`)
  }
}

/**
 * Batch convert multiple products to props
 *
 * @example
 * ```ts
 * import { registry } from 'digital-products'
 * import { productsToProps } from 'mdxui/products'
 *
 * const products = registry.list()
 * const allProps = productsToProps(products)
 * ```
 */
export function productsToProps(
  products: Array<SiteDefinition | AppDefinition | APIDefinition | ContentDefinition>
): Array<ReturnType<typeof productToProps>> {
  return products.map(productToProps)
}

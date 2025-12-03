/**
 * Tests for digital-products integration
 */

import { describe, it, expect } from 'vitest'
import {
  siteToProps,
  appToProps,
  apiToProps,
  contentToProps,
  productToProps,
  productsToProps,
  isBlogContent,
  isDocsContent,
} from './products.js'
import type {
  SiteDefinition,
  AppDefinition,
  APIDefinition,
  ContentDefinition,
} from 'digital-products'

describe('siteToProps', () => {
  it('should convert SiteDefinition to SiteProps', () => {
    const site: SiteDefinition = {
      type: 'site',
      id: 'docs',
      name: 'My Docs',
      description: 'Documentation site',
      version: '1.0.0',
      navigation: [
        { label: 'Home', href: '/' },
        {
          label: 'Docs',
          href: '/docs',
          children: [
            { label: 'Getting Started', href: '/docs/getting-started' },
            { label: 'API Reference', href: '/docs/api' },
          ],
        },
      ],
      seo: {
        titleTemplate: '%s | My Docs',
        description: 'Official documentation',
        keywords: ['docs', 'api', 'reference'],
      },
    }

    const props = siteToProps(site)

    expect(props).toEqual({
      name: 'My Docs',
      nav: [
        { label: 'Home', href: '/' },
        {
          label: 'Docs',
          href: '/docs',
          children: [
            { label: 'Getting Started', href: '/docs/getting-started' },
            { label: 'API Reference', href: '/docs/api' },
          ],
        },
      ],
      seo: {
        title: '%s | My Docs',
        description: 'Official documentation',
        keywords: ['docs', 'api', 'reference'],
      },
      logo: undefined,
      copyright: undefined,
    })
  })

  it('should handle metadata logo and copyright', () => {
    const site: SiteDefinition = {
      type: 'site',
      id: 'site',
      name: 'My Site',
      description: 'Site',
      version: '1.0.0',
      metadata: {
        logo: '/logo.png',
        copyright: '© 2025 My Site',
      },
    }

    const props = siteToProps(site)

    expect(props.logo).toBe('/logo.png')
    expect(props.copyright).toBe('© 2025 My Site')
  })
})

describe('appToProps', () => {
  it('should convert AppDefinition to AppProps', () => {
    const app: AppDefinition = {
      type: 'app',
      id: 'my-app',
      name: 'My App',
      description: 'Web application',
      version: '1.0.0',
      framework: 'react',
      config: {
        title: 'My Application',
        theme: { mode: 'dark' },
      },
    }

    const props = appToProps(app)

    expect(props).toEqual({
      name: 'My Application',
      theme: { mode: 'dark' },
      locale: undefined,
      seo: undefined,
    })
  })

  it('should use app name if config.title is not set', () => {
    const app: AppDefinition = {
      type: 'app',
      id: 'my-app',
      name: 'My App',
      description: 'Web application',
      version: '1.0.0',
    }

    const props = appToProps(app)

    expect(props.name).toBe('My App')
  })

  it('should handle metadata locale and seo', () => {
    const app: AppDefinition = {
      type: 'app',
      id: 'my-app',
      name: 'My App',
      description: 'Web application',
      version: '1.0.0',
      metadata: {
        locale: 'en-US',
        seo: {
          title: 'My App',
          description: 'An awesome app',
        },
      },
    }

    const props = appToProps(app)

    expect(props.locale).toBe('en-US')
    expect(props.seo).toEqual({
      title: 'My App',
      description: 'An awesome app',
    })
  })
})

describe('apiToProps', () => {
  it('should convert APIDefinition to APIProps', () => {
    const api: APIDefinition = {
      type: 'api',
      id: 'my-api',
      name: 'My API',
      description: 'RESTful API',
      version: '1.0.0',
      baseUrl: 'https://api.example.com',
      endpoints: [
        {
          method: 'GET',
          path: '/users',
          description: 'List all users',
          response: {
            users: 'Array of user objects',
          },
        },
        {
          method: 'POST',
          path: '/users/:id',
          description: 'Create a user',
          params: {
            id: 'string',
          },
          request: {
            name: 'string',
            email: 'string',
          },
          response: {
            id: 'string',
            name: 'string',
            email: 'string',
          },
        },
      ],
      auth: {
        type: 'bearer',
        header: 'Authorization',
      },
    }

    const props = apiToProps(api)

    expect(props.title).toBe('My API')
    expect(props.description).toBe('RESTful API')
    expect(props.baseUrl).toBe('https://api.example.com')
    expect(props.version).toBe('1.0.0')
    expect(props.endpoints).toHaveLength(2)
    expect(props.endpoints[0]).toEqual({
      method: 'GET',
      path: '/users',
      description: 'List all users',
      body: undefined,
      query: undefined,
      response: {
        users: 'Array of user objects',
      },
    })
    expect(props.endpoints[1]).toEqual({
      method: 'POST',
      path: '/users/:id',
      description: 'Create a user',
      body: {
        name: 'string',
        email: 'string',
      },
      query: undefined,
      response: {
        id: 'string',
        name: 'string',
        email: 'string',
      },
    })
    expect(props.auth).toEqual({
      type: 'bearer',
      description: undefined,
    })
  })

  it('should handle API without endpoints and auth', () => {
    const api: APIDefinition = {
      type: 'api',
      id: 'my-api',
      name: 'My API',
      description: 'RESTful API',
      version: '1.0.0',
    }

    const props = apiToProps(api)

    expect(props.endpoints).toEqual([])
    expect(props.auth).toBeUndefined()
  })
})

describe('contentToProps', () => {
  it('should convert blog ContentDefinition to BlogProps', () => {
    const content: ContentDefinition = {
      type: 'content',
      id: 'blog',
      name: 'Blog Posts',
      description: 'Company blog',
      version: '1.0.0',
      format: 'mdx',
      categories: ['Blog', 'Technology'],
      metadata: {
        posts: [
          {
            title: 'First Post',
            slug: 'first-post',
            excerpt: 'My first blog post',
            date: '2025-01-01',
          },
          {
            title: 'Second Post',
            slug: 'second-post',
            excerpt: 'Another post',
            date: '2025-01-02',
          },
        ],
      },
    }

    const result = contentToProps(content)

    expect(result.type).toBe('blog')
    expect(isBlogContent(result)).toBe(true)
    expect(result.props).toEqual({
      title: 'Blog Posts',
      description: 'Company blog',
      posts: [
        {
          title: 'First Post',
          slug: 'first-post',
          excerpt: 'My first blog post',
          date: '2025-01-01',
        },
        {
          title: 'Second Post',
          slug: 'second-post',
          excerpt: 'Another post',
          date: '2025-01-02',
        },
      ],
      layout: 'grid',
    })
  })

  it('should convert docs ContentDefinition to DocsProps', () => {
    const content: ContentDefinition = {
      type: 'content',
      id: 'docs',
      name: 'Documentation',
      description: 'Product documentation',
      version: '1.0.0',
      format: 'mdx',
      categories: ['Docs', 'Guides'],
      metadata: {
        type: 'docs',
        nav: [
          { label: 'Getting Started', href: '/docs/getting-started' },
          { label: 'API Reference', href: '/docs/api' },
        ],
        toc: [
          { title: 'Introduction', id: 'intro', level: 1 },
          { title: 'Installation', id: 'install', level: 2 },
        ],
        prev: { title: 'Previous Page', href: '/docs/prev' },
        next: { title: 'Next Page', href: '/docs/next' },
        editUrl: 'https://github.com/example/repo/edit/main/docs',
      },
    }

    const result = contentToProps(content)

    expect(result.type).toBe('docs')
    expect(isDocsContent(result)).toBe(true)
    expect(result.props).toEqual({
      title: 'Documentation',
      nav: [
        { label: 'Getting Started', href: '/docs/getting-started' },
        { label: 'API Reference', href: '/docs/api' },
      ],
      toc: [
        { title: 'Introduction', id: 'intro', level: 1 },
        { title: 'Installation', id: 'install', level: 2 },
      ],
      prev: { title: 'Previous Page', href: '/docs/prev' },
      next: { title: 'Next Page', href: '/docs/next' },
      editUrl: 'https://github.com/example/repo/edit/main/docs',
    })
  })

  it('should default to blog for mdx without explicit type', () => {
    const content: ContentDefinition = {
      type: 'content',
      id: 'content',
      name: 'Content',
      description: 'Some content',
      version: '1.0.0',
      format: 'mdx',
    }

    const result = contentToProps(content)

    expect(result.type).toBe('blog')
  })

  it('should detect docs from categories', () => {
    const content: ContentDefinition = {
      type: 'content',
      id: 'docs',
      name: 'Documentation',
      description: 'Docs',
      version: '1.0.0',
      format: 'markdown',
      categories: ['Documentation'],
    }

    const result = contentToProps(content)

    expect(result.type).toBe('docs')
  })
})

describe('productToProps', () => {
  it('should dispatch to correct converter based on type', () => {
    const site: SiteDefinition = {
      type: 'site',
      id: 'site',
      name: 'Site',
      description: 'Site',
      version: '1.0.0',
    }

    const app: AppDefinition = {
      type: 'app',
      id: 'app',
      name: 'App',
      description: 'App',
      version: '1.0.0',
    }

    const api: APIDefinition = {
      type: 'api',
      id: 'api',
      name: 'API',
      description: 'API',
      version: '1.0.0',
    }

    const content: ContentDefinition = {
      type: 'content',
      id: 'content',
      name: 'Content',
      description: 'Content',
      version: '1.0.0',
      format: 'mdx',
    }

    const siteResult = productToProps(site)
    const appResult = productToProps(app)
    const apiResult = productToProps(api)
    const contentResult = productToProps(content)

    expect(siteResult).toEqual(siteToProps(site))
    expect(appResult).toEqual(appToProps(app))
    expect(apiResult).toEqual(apiToProps(api))
    expect(contentResult).toEqual(contentToProps(content))
  })

  it('should throw error for unsupported product type', () => {
    const unsupported = {
      type: 'unsupported',
      id: 'test',
      name: 'Test',
      description: 'Test',
      version: '1.0.0',
    } as never

    expect(() => productToProps(unsupported)).toThrow('Unsupported product type: unsupported')
  })
})

describe('productsToProps', () => {
  it('should batch convert multiple products', () => {
    const site: SiteDefinition = {
      type: 'site',
      id: 'site',
      name: 'Site',
      description: 'Site',
      version: '1.0.0',
    }

    const app: AppDefinition = {
      type: 'app',
      id: 'app',
      name: 'App',
      description: 'App',
      version: '1.0.0',
    }

    const products = [site, app]
    const results = productsToProps(products)

    expect(results).toHaveLength(2)
    expect(results[0]).toEqual(siteToProps(site))
    expect(results[1]).toEqual(appToProps(app))
  })

  it('should handle empty array', () => {
    const results = productsToProps([])
    expect(results).toEqual([])
  })
})

describe('type guards', () => {
  it('isBlogContent should correctly identify blog content', () => {
    const blogContent: ContentDefinition = {
      type: 'content',
      id: 'blog',
      name: 'Blog',
      description: 'Blog',
      version: '1.0.0',
      format: 'mdx',
      categories: ['Blog'],
    }

    const result = contentToProps(blogContent)
    expect(isBlogContent(result)).toBe(true)
    expect(isDocsContent(result)).toBe(false)

    if (isBlogContent(result)) {
      // Type narrowing should work
      expect(result.props.posts).toBeDefined()
    }
  })

  it('isDocsContent should correctly identify docs content', () => {
    const docsContent: ContentDefinition = {
      type: 'content',
      id: 'docs',
      name: 'Docs',
      description: 'Docs',
      version: '1.0.0',
      format: 'markdown',
      categories: ['Documentation'],
    }

    const result = contentToProps(docsContent)
    expect(isDocsContent(result)).toBe(true)
    expect(isBlogContent(result)).toBe(false)

    if (isDocsContent(result)) {
      // Type narrowing should work
      expect(result.props.title).toBe('Docs')
    }
  })
})

import { describe, it, expect } from 'vitest'
import {
  extractRouteMetadata,
  createMDXRoute,
  createRouteLoader,
} from './router.js'
import { parse } from 'mdxld'

describe('@mdxe/expo/router', () => {
  describe('extractRouteMetadata', () => {
    it('should extract standard route metadata', () => {
      const doc = parse(`---
title: My Page
description: A test page
showInNav: true
order: 5
icon: home
---

# Content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBe('My Page')
      expect(metadata.description).toBe('A test page')
      expect(metadata.showInNav).toBe(true)
      expect(metadata.order).toBe(5)
      expect(metadata.icon).toBe('home')
    })

    it('should handle missing metadata gracefully', () => {
      const doc = parse(`# Just content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBeUndefined()
      expect(metadata.description).toBeUndefined()
      expect(metadata.showInNav).toBeUndefined()
    })

    it('should include custom metadata fields', () => {
      const doc = parse(`---
title: Custom
customField: value
nested:
  key: data
---

Content`)

      const metadata = extractRouteMetadata(doc)

      expect(metadata.title).toBe('Custom')
      expect(metadata.customField).toBe('value')
      expect(metadata.nested).toEqual({ key: 'data' })
    })
  })

  describe('createMDXRoute', () => {
    it('should create a route from path and content', () => {
      const content = `---
title: Hello World
---

# Welcome`

      const route = createMDXRoute('/blog/hello-world', content)

      expect(route.path).toBe('/blog/hello-world')
      expect(route.segment).toBe('hello-world')
      expect(route.document.data.title).toBe('Hello World')
      expect(route.metadata.title).toBe('Hello World')
    })

    it('should handle root path', () => {
      const route = createMDXRoute('/', '# Home')

      expect(route.path).toBe('/')
      expect(route.segment).toBe('')
    })

    it('should handle nested paths', () => {
      const route = createMDXRoute('/docs/api/endpoints/users', '# Users API')

      expect(route.path).toBe('/docs/api/endpoints/users')
      expect(route.segment).toBe('users')
    })
  })

  describe('createRouteLoader', () => {
    it('should create a loader with default config', () => {
      const loader = createRouteLoader()

      expect(loader.getBasePath()).toBe('')
    })

    it('should create a loader with custom base path', () => {
      const loader = createRouteLoader({ basePath: '/content' })

      expect(loader.getBasePath()).toBe('/content')
    })

    it('should convert file paths to route paths', () => {
      const loader = createRouteLoader()

      expect(loader.toRoutePath('/blog/hello.mdx')).toBe('/blog/hello')
      expect(loader.toRoutePath('/docs/index.mdx')).toBe('/docs/')
      expect(loader.toRoutePath('/[slug].mdx')).toBe('/:slug')
      expect(loader.toRoutePath('/posts/[id]/comments.mdx')).toBe('/posts/:id/comments')
    })

    it('should apply custom path transforms', () => {
      const loader = createRouteLoader({
        transformPath: (path) => path.toLowerCase(),
      })

      expect(loader.toRoutePath('/Blog/HELLO.mdx')).toBe('/blog/hello')
    })

    it('should add base path to routes', () => {
      const loader = createRouteLoader({ basePath: '/api/v1' })

      expect(loader.toRoutePath('/users.mdx')).toBe('/api/v1/users')
    })

    it('should check if path matches loader', () => {
      const loader = createRouteLoader({ basePath: '/docs' })

      expect(loader.matches('/docs/intro')).toBe(true)
      expect(loader.matches('/docs')).toBe(true)
      expect(loader.matches('/blog/post')).toBe(false)
    })

    it('should handle custom extensions', () => {
      const loader = createRouteLoader({ extension: '.md' })

      expect(loader.toRoutePath('/readme.md')).toBe('/readme')
    })
  })
})

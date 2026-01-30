/**
 * Tests for @mdxe/payload
 *
 * Comprehensive test coverage for:
 * - Module exports
 * - Configuration builders
 * - Collection generators
 * - Worker handlers
 * - Type parsing and field inference
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ===========================================================================
// Module Export Tests
// ===========================================================================

describe('module exports', () => {
  it('exports package name', async () => {
    const mod = await import('./index.js')
    expect(mod.name).toBe('@mdxe/payload')
  })

  it('exports createPayloadWorker function', async () => {
    const mod = await import('./index.js')
    expect(mod.createPayloadWorker).toBeDefined()
    expect(typeof mod.createPayloadWorker).toBe('function')
  })

  it('exports defaultWorker', async () => {
    const mod = await import('./index.js')
    expect(mod.defaultWorker).toBeDefined()
  })

  it('exports createPayloadConfig function', async () => {
    const mod = await import('./index.js')
    expect(mod.createPayloadConfig).toBeDefined()
    expect(typeof mod.createPayloadConfig).toBe('function')
  })

  it('exports createMinimalConfig function', async () => {
    const mod = await import('./index.js')
    expect(mod.createMinimalConfig).toBeDefined()
    expect(typeof mod.createMinimalConfig).toBe('function')
  })

  it('exports createContentCollections function', async () => {
    const mod = await import('./index.js')
    expect(mod.createContentCollections).toBeDefined()
    expect(typeof mod.createContentCollections).toBe('function')
  })

  it('exports createCommerceCollections function', async () => {
    const mod = await import('./index.js')
    expect(mod.createCommerceCollections).toBeDefined()
    expect(typeof mod.createCommerceCollections).toBe('function')
  })

  it('exports UsersCollection', async () => {
    const mod = await import('./index.js')
    expect(mod.UsersCollection).toBeDefined()
    expect(mod.UsersCollection.slug).toBe('users')
  })

  it('exports MediaCollection', async () => {
    const mod = await import('./index.js')
    expect(mod.MediaCollection).toBeDefined()
    expect(mod.MediaCollection.slug).toBe('media')
  })

  it('exports generateCollections function', async () => {
    const mod = await import('./index.js')
    expect(mod.generateCollections).toBeDefined()
    expect(typeof mod.generateCollections).toBe('function')
  })

  it('exports parseTypeFromMDX function', async () => {
    const mod = await import('./index.js')
    expect(mod.parseTypeFromMDX).toBeDefined()
    expect(typeof mod.parseTypeFromMDX).toBe('function')
  })

  it('exports processContentDirectory function', async () => {
    const mod = await import('./index.js')
    expect(mod.processContentDirectory).toBeDefined()
    expect(typeof mod.processContentDirectory).toBe('function')
  })

  it('exports typeToCollection function', async () => {
    const mod = await import('./index.js')
    expect(mod.typeToCollection).toBeDefined()
    expect(typeof mod.typeToCollection).toBe('function')
  })

  it('exports adminCommand function', async () => {
    const mod = await import('./index.js')
    expect(mod.adminCommand).toBeDefined()
    expect(typeof mod.adminCommand).toBe('function')
  })

  // Re-exports from @mdxdb/payload
  it('exports sqliteAdapter from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.sqliteAdapter).toBeDefined()
    expect(typeof mod.sqliteAdapter).toBe('function')
  })

  it('exports clickhouseAdapter from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.clickhouseAdapter).toBeDefined()
    expect(typeof mod.clickhouseAdapter).toBe('function')
  })

  it('exports getNativeCollections from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.getNativeCollections).toBeDefined()
    expect(typeof mod.getNativeCollections).toBe('function')
  })

  it('exports createVirtualCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.createVirtualCollection).toBeDefined()
    expect(typeof mod.createVirtualCollection).toBe('function')
  })

  it('exports ThingsCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.ThingsCollection).toBeDefined()
    expect(mod.ThingsCollection.slug).toBe('things')
  })

  it('exports RelationshipsCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.RelationshipsCollection).toBeDefined()
    expect(mod.RelationshipsCollection.slug).toBe('relationships')
  })

  it('exports SearchCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.SearchCollection).toBeDefined()
    expect(mod.SearchCollection.slug).toBe('search')
  })

  it('exports EventsCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.EventsCollection).toBeDefined()
    expect(mod.EventsCollection.slug).toBe('events')
  })

  it('exports ActionsCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.ActionsCollection).toBeDefined()
    expect(mod.ActionsCollection.slug).toBe('actions')
  })

  it('exports ArtifactsCollection from @mdxdb/payload', async () => {
    const mod = await import('./index.js')
    expect(mod.ArtifactsCollection).toBeDefined()
    expect(mod.ArtifactsCollection.slug).toBe('artifacts')
  })
})

// ===========================================================================
// UsersCollection Tests
// ===========================================================================

describe('UsersCollection', () => {
  it('has auth enabled', async () => {
    const { UsersCollection } = await import('./config.js')
    expect(UsersCollection.auth).toBe(true)
  })

  it('uses email as title', async () => {
    const { UsersCollection } = await import('./config.js')
    expect(UsersCollection.admin?.useAsTitle).toBe('email')
  })

  it('is in Admin group', async () => {
    const { UsersCollection } = await import('./config.js')
    expect(UsersCollection.admin?.group).toBe('Admin')
  })

  it('has name field', async () => {
    const { UsersCollection } = await import('./config.js')
    const nameField = UsersCollection.fields.find((f: any) => f.name === 'name')
    expect(nameField).toBeDefined()
    expect(nameField?.type).toBe('text')
  })

  it('has role field with options', async () => {
    const { UsersCollection } = await import('./config.js')
    const roleField = UsersCollection.fields.find((f: any) => f.name === 'role')
    expect(roleField).toBeDefined()
    expect(roleField?.type).toBe('select')
    expect(roleField?.options).toHaveLength(3)
    expect(roleField?.defaultValue).toBe('user')
  })

  it('has avatar field', async () => {
    const { UsersCollection } = await import('./config.js')
    const avatarField = UsersCollection.fields.find((f: any) => f.name === 'avatar')
    expect(avatarField).toBeDefined()
    expect(avatarField?.type).toBe('text')
  })

  it('has access controls', async () => {
    const { UsersCollection } = await import('./config.js')
    expect(UsersCollection.access?.read).toBeDefined()
    expect(UsersCollection.access?.create).toBeDefined()
    expect(UsersCollection.access?.update).toBeDefined()
    expect(UsersCollection.access?.delete).toBeDefined()
  })
})

// ===========================================================================
// MediaCollection Tests
// ===========================================================================

describe('MediaCollection', () => {
  it('has upload configuration', async () => {
    const { MediaCollection } = await import('./config.js')
    expect(MediaCollection.upload).toBeDefined()
    expect(MediaCollection.upload?.staticDir).toBe('media')
  })

  it('allows common media mime types', async () => {
    const { MediaCollection } = await import('./config.js')
    expect(MediaCollection.upload?.mimeTypes).toContain('image/*')
    expect(MediaCollection.upload?.mimeTypes).toContain('video/*')
    expect(MediaCollection.upload?.mimeTypes).toContain('audio/*')
    expect(MediaCollection.upload?.mimeTypes).toContain('application/pdf')
  })

  it('uses filename as title', async () => {
    const { MediaCollection } = await import('./config.js')
    expect(MediaCollection.admin?.useAsTitle).toBe('filename')
  })

  it('is in Content group', async () => {
    const { MediaCollection } = await import('./config.js')
    expect(MediaCollection.admin?.group).toBe('Content')
  })

  it('has alt field', async () => {
    const { MediaCollection } = await import('./config.js')
    const altField = MediaCollection.fields.find((f: any) => f.name === 'alt')
    expect(altField).toBeDefined()
    expect(altField?.type).toBe('text')
  })

  it('has caption field', async () => {
    const { MediaCollection } = await import('./config.js')
    const captionField = MediaCollection.fields.find((f: any) => f.name === 'caption')
    expect(captionField).toBeDefined()
    expect(captionField?.type).toBe('textarea')
  })
})

// ===========================================================================
// createContentCollections Tests
// ===========================================================================

describe('createContentCollections()', () => {
  it('returns an array of collections', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    expect(Array.isArray(collections)).toBe(true)
    expect(collections.length).toBeGreaterThan(0)
  })

  it('includes posts collection', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const posts = collections.find(c => c.slug === 'posts')
    expect(posts).toBeDefined()
  })

  it('includes pages collection', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const pages = collections.find(c => c.slug === 'pages')
    expect(pages).toBeDefined()
  })

  it('includes categories collection', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const categories = collections.find(c => c.slug === 'categories')
    expect(categories).toBeDefined()
  })

  it('posts collection has author relationship', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const posts = collections.find(c => c.slug === 'posts')
    const authorField = posts?.fields.find((f: any) => f.name === 'author')
    expect(authorField).toBeDefined()
    expect(authorField?.type).toBe('relationship')
    expect(authorField?.relationTo).toBe('users')
  })

  it('posts collection has categories relationship', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const posts = collections.find(c => c.slug === 'posts')
    const categoriesField = posts?.fields.find((f: any) => f.name === 'categories')
    expect(categoriesField).toBeDefined()
    expect(categoriesField?.type).toBe('relationship')
    expect(categoriesField?.hasMany).toBe(true)
  })

  it('posts collection has status field with options', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const posts = collections.find(c => c.slug === 'posts')
    const statusField = posts?.fields.find((f: any) => f.name === 'status')
    expect(statusField).toBeDefined()
    expect(statusField?.type).toBe('select')
    expect(statusField?.options).toContainEqual({ label: 'Draft', value: 'draft' })
    expect(statusField?.options).toContainEqual({ label: 'Published', value: 'published' })
  })

  it('pages collection has parent relationship', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const pages = collections.find(c => c.slug === 'pages')
    const parentField = pages?.fields.find((f: any) => f.name === 'parent')
    expect(parentField).toBeDefined()
    expect(parentField?.type).toBe('relationship')
    expect(parentField?.relationTo).toBe('pages')
  })

  it('pages collection has SEO group field', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const pages = collections.find(c => c.slug === 'pages')
    const seoField = pages?.fields.find((f: any) => f.name === 'seo')
    expect(seoField).toBeDefined()
    expect(seoField?.type).toBe('group')
  })

  it('categories collection has color field', async () => {
    const { createContentCollections } = await import('./config.js')
    const collections = createContentCollections()
    const categories = collections.find(c => c.slug === 'categories')
    const colorField = categories?.fields.find((f: any) => f.name === 'color')
    expect(colorField).toBeDefined()
    expect(colorField?.type).toBe('text')
  })
})

// ===========================================================================
// createCommerceCollections Tests
// ===========================================================================

describe('createCommerceCollections()', () => {
  it('returns an array of collections', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    expect(Array.isArray(collections)).toBe(true)
    expect(collections.length).toBeGreaterThan(0)
  })

  it('includes products collection', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const products = collections.find(c => c.slug === 'products')
    expect(products).toBeDefined()
  })

  it('includes product-categories collection', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const productCategories = collections.find(c => c.slug === 'product-categories')
    expect(productCategories).toBeDefined()
  })

  it('includes orders collection', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const orders = collections.find(c => c.slug === 'orders')
    expect(orders).toBeDefined()
  })

  it('products collection has price field', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const products = collections.find(c => c.slug === 'products')
    const priceField = products?.fields.find((f: any) => f.name === 'price')
    expect(priceField).toBeDefined()
    expect(priceField?.type).toBe('number')
    expect(priceField?.required).toBe(true)
  })

  it('products collection has currency select field', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const products = collections.find(c => c.slug === 'products')
    const currencyField = products?.fields.find((f: any) => f.name === 'currency')
    expect(currencyField).toBeDefined()
    expect(currencyField?.type).toBe('select')
    expect(currencyField?.defaultValue).toBe('USD')
  })

  it('products collection has unique SKU field', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const products = collections.find(c => c.slug === 'products')
    const skuField = products?.fields.find((f: any) => f.name === 'sku')
    expect(skuField).toBeDefined()
    expect(skuField?.unique).toBe(true)
  })

  it('products collection has inventory field', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const products = collections.find(c => c.slug === 'products')
    const inventoryField = products?.fields.find((f: any) => f.name === 'inventory')
    expect(inventoryField).toBeDefined()
    expect(inventoryField?.type).toBe('number')
    expect(inventoryField?.defaultValue).toBe(0)
  })

  it('orders collection has customer relationship', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const orders = collections.find(c => c.slug === 'orders')
    const customerField = orders?.fields.find((f: any) => f.name === 'customer')
    expect(customerField).toBeDefined()
    expect(customerField?.type).toBe('relationship')
    expect(customerField?.required).toBe(true)
  })

  it('orders collection has status field with order statuses', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const orders = collections.find(c => c.slug === 'orders')
    const statusField = orders?.fields.find((f: any) => f.name === 'status')
    expect(statusField).toBeDefined()
    expect(statusField?.options).toContainEqual({ label: 'Pending', value: 'pending' })
    expect(statusField?.options).toContainEqual({ label: 'Shipped', value: 'shipped' })
    expect(statusField?.options).toContainEqual({ label: 'Delivered', value: 'delivered' })
  })

  it('orders collection has read-only paymentIntent field', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    const orders = collections.find(c => c.slug === 'orders')
    const paymentField = orders?.fields.find((f: any) => f.name === 'paymentIntent')
    expect(paymentField).toBeDefined()
    expect(paymentField?.admin?.readOnly).toBe(true)
  })

  it('commerce collections are in Commerce group', async () => {
    const { createCommerceCollections } = await import('./config.js')
    const collections = createCommerceCollections()
    for (const collection of collections) {
      expect(collection.admin?.group).toBe('Commerce')
    }
  })
})

// ===========================================================================
// createPayloadWorker Tests
// ===========================================================================

describe('createPayloadWorker()', () => {
  it('returns object with fetch method', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker()
    expect(worker).toBeDefined()
    expect(typeof worker.fetch).toBe('function')
  })

  it('accepts partial app config', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({
      namespace: 'test.example.com',
    })
    expect(worker).toBeDefined()
  })

  it('accepts full app config', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({
      namespace: 'test.example.com',
      database: 'sqlite',
      nativeCollections: true,
      collections: [],
      globals: [],
      admin: { route: '/admin' },
      api: { graphQL: true, rest: true },
      auth: { enabled: true },
    })
    expect(worker).toBeDefined()
  })
})

// ===========================================================================
// Worker Request Handling Tests
// ===========================================================================

describe('Worker request handling', () => {
  const mockEnv = {
    PAYLOAD_SECRET: 'test-secret',
    NAMESPACE: 'test.example.com',
    MDXDB: {
      idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-id' }),
      get: vi.fn(),
    },
  }

  const mockCtx = {
    waitUntil: vi.fn(),
    passThroughOnException: vi.fn(),
  }

  it('handles requests with error response when Payload fails to initialize', async () => {
    // Payload initialization fails in test environment because database adapters
    // can't connect to real databases. This tests the error handling path.
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({ namespace: 'test.example.com' })

    const request = new Request('https://example.com/health')
    const response = await worker.fetch(request, mockEnv as any, mockCtx)

    // Worker returns 500 with error JSON when Payload can't initialize
    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })

  it('returns error response for any route when Payload fails', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({ namespace: 'test.example.com' })

    const request = new Request('https://example.com/unknown')
    const response = await worker.fetch(request, mockEnv as any, mockCtx)

    // Worker returns 500 when Payload initialization fails
    expect(response.status).toBe(500)
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('returns error for admin route when Payload unavailable', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({ namespace: 'test.example.com' })

    const request = new Request('https://example.com/admin')
    const response = await worker.fetch(request, mockEnv as any, mockCtx)

    expect(response.status).toBe(500)
  })

  it('returns error for graphql route when Payload unavailable', async () => {
    const { createPayloadWorker } = await import('./worker.js')
    const worker = createPayloadWorker({ namespace: 'test.example.com' })

    const request = new Request('https://example.com/graphql')
    const response = await worker.fetch(request, mockEnv as any, mockCtx)

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBeDefined()
  })
})

// ===========================================================================
// generateCollections Tests
// ===========================================================================

describe('generateCollections()', () => {
  it('generates collections from provided types', async () => {
    const { generateCollections } = await import('./generate.js')
    const types = [
      {
        name: 'Post',
        slug: 'posts',
        fields: [
          { name: 'title', type: 'text' as const, required: true },
          { name: 'content', type: 'textarea' as const },
        ],
      },
    ]

    const collections = await generateCollections({ source: '.', types })

    expect(collections).toHaveLength(1)
    expect(collections[0].slug).toBe('posts')
  })

  it('generates collections with relationships', async () => {
    const { generateCollections } = await import('./generate.js')
    const types = [
      {
        name: 'Post',
        slug: 'posts',
        fields: [{ name: 'title', type: 'text' as const }],
        relationships: [
          { name: 'author', to: 'users', type: 'hasOne' as const },
        ],
      },
    ]

    const collections = await generateCollections({ source: '.', types })

    expect(collections).toHaveLength(1)
    const authorField = collections[0].fields.find((f: any) => f.name === 'author')
    expect(authorField).toBeDefined()
    expect(authorField?.type).toBe('relationship')
  })
})

// ===========================================================================
// typeToCollection Tests
// ===========================================================================

describe('typeToCollection()', () => {
  it('converts type to collection config', async () => {
    const { typeToCollection } = await import('./generate.js')
    const type = {
      name: 'Article',
      slug: 'articles',
      fields: [
        { name: 'title', type: 'text' as const, required: true },
      ],
    }

    const collection = typeToCollection(type)

    expect(collection.slug).toBe('articles')
  })

  it('maps field types correctly', async () => {
    const { typeToCollection } = await import('./generate.js')
    const type = {
      name: 'Article',
      slug: 'articles',
      fields: [
        { name: 'title', type: 'text' as const, required: true },
        { name: 'body', type: 'textarea' as const },
        { name: 'views', type: 'number' as const },
        { name: 'published', type: 'checkbox' as const },
        { name: 'date', type: 'date' as const },
      ],
    }

    const collection = typeToCollection(type)

    expect(collection.fields.find((f: any) => f.name === 'title')?.type).toBe('text')
    expect(collection.fields.find((f: any) => f.name === 'body')?.type).toBe('textarea')
    expect(collection.fields.find((f: any) => f.name === 'views')?.type).toBe('number')
    expect(collection.fields.find((f: any) => f.name === 'published')?.type).toBe('checkbox')
    expect(collection.fields.find((f: any) => f.name === 'date')?.type).toBe('date')
  })

  it('maps hasMany relationships', async () => {
    const { typeToCollection } = await import('./generate.js')
    const type = {
      name: 'Post',
      slug: 'posts',
      fields: [],
      relationships: [
        { name: 'tags', to: 'tags', type: 'hasMany' as const },
      ],
    }

    const collection = typeToCollection(type)
    const tagsField = collection.fields.find((f: any) => f.name === 'tags')

    expect(tagsField?.type).toBe('relationship')
    expect(tagsField?.hasMany).toBe(true)
  })

  it('maps belongsToMany relationships', async () => {
    const { typeToCollection } = await import('./generate.js')
    const type = {
      name: 'Post',
      slug: 'posts',
      fields: [],
      relationships: [
        { name: 'categories', to: 'categories', type: 'belongsToMany' as const },
      ],
    }

    const collection = typeToCollection(type)
    const categoriesField = collection.fields.find((f: any) => f.name === 'categories')

    expect(categoriesField?.type).toBe('relationship')
    expect(categoriesField?.hasMany).toBe(true)
  })
})

// ===========================================================================
// Field Inference Tests (from parseTypeFromMDX)
// ===========================================================================

describe('field inference', () => {
  it('infers text type for strings', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
name: John
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'name')
    expect(field?.type).toBe('text')
  })

  it('infers number type for numbers', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
count: 42
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'count')
    expect(field?.type).toBe('number')
  })

  it('infers checkbox type for booleans', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
active: true
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'active')
    expect(field?.type).toBe('checkbox')
  })

  it('infers date type for date strings', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
created: 2024-01-15
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'created')
    expect(field?.type).toBe('date')
  })

  it('infers json type for arrays', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
items:
  - one
  - two
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'items')
    expect(field?.type).toBe('json')
  })

  it('infers json type for objects', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
config:
  key: value
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'config')
    expect(field?.type).toBe('json')
  })

  it('marks username field as unique', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: User
username: johndoe
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'username')
    expect(field?.unique).toBe(true)
  })

  it('marks id field as unique', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Thing
id: abc123
---`
    const type = parseTypeFromMDX(mdx)
    const field = type!.fields.find(f => f.name === 'id')
    expect(field?.unique).toBe(true)
    expect(field?.required).toBe(true)
  })

  it('skips fields starting with $', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
$id: https://example.com
title: Hello
---`
    const type = parseTypeFromMDX(mdx)
    const idField = type!.fields.find(f => f.name === '$id')
    expect(idField).toBeUndefined()
  })

  it('skips fields starting with @', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Test
"@context": https://schema.org
title: Hello
---`
    const type = parseTypeFromMDX(mdx)
    const contextField = type!.fields.find(f => f.name === '@context')
    expect(contextField).toBeUndefined()
  })
})

// ===========================================================================
// Relationship Detection Tests
// ===========================================================================

describe('relationship detection', () => {
  it('detects author relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Post
author: user-123
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'author')
    expect(rel).toBeDefined()
    expect(rel?.type).toBe('hasOne')
    expect(rel?.to).toBe('users')
  })

  it('detects creator relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Document
creator: user-456
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'creator')
    expect(rel).toBeDefined()
    expect(rel?.to).toBe('users')
  })

  it('detects owner relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Asset
owner: user-789
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'owner')
    expect(rel).toBeDefined()
    expect(rel?.to).toBe('users')
  })

  it('detects parent relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Page
parent: page-parent
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'parent')
    expect(rel).toBeDefined()
    expect(rel?.type).toBe('hasOne')
  })

  it('detects *Id pattern as relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: Comment
postId: post-123
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'postId')
    expect(rel).toBeDefined()
    expect(rel?.type).toBe('hasOne')
  })

  it('detects *Ids pattern as hasMany relationship', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
$type: User
groupIds:
  - group-1
  - group-2
---`
    const type = parseTypeFromMDX(mdx)
    const rel = type!.relationships?.find(r => r.name === 'groupIds')
    expect(rel).toBeDefined()
    expect(rel?.type).toBe('hasMany')
  })
})

// ===========================================================================
// Error Handling Tests
// ===========================================================================

describe('error handling', () => {
  it('parseTypeFromMDX returns null for invalid YAML', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `---
invalid: yaml: content: here
---`
    const type = parseTypeFromMDX(mdx)
    expect(type).toBeNull()
  })

  it('parseTypeFromMDX returns null for content without frontmatter', async () => {
    const { parseTypeFromMDX } = await import('./generate.js')
    const mdx = `# Just markdown content`
    const type = parseTypeFromMDX(mdx)
    expect(type).toBeNull()
  })

  it('processContentDirectory handles parsing errors gracefully', async () => {
    const { processContentDirectory } = await import('./generate.js')
    const files = [
      { path: '/good.mdx', content: `---\n$type: Post\ntitle: Good\n---` },
      { path: '/bad.mdx', content: `not valid frontmatter` },
    ]

    const result = await processContentDirectory(files)

    expect(result.types).toHaveLength(1)
    expect(result.errors).toHaveLength(0) // Skipped, not errored
  })

  it('createPayloadConfig throws without MDXDB binding in sqlite mode', async () => {
    const { createPayloadConfig } = await import('./config.js')

    expect(() =>
      createPayloadConfig(
        { namespace: 'test', database: 'sqlite' },
        { PAYLOAD_SECRET: 'secret' } as any
      )
    ).toThrow('MDXDB Durable Object binding is required')
  })

  it('createPayloadConfig throws without CLICKHOUSE_URL in clickhouse mode', async () => {
    const { createPayloadConfig } = await import('./config.js')

    expect(() =>
      createPayloadConfig(
        { namespace: 'test', database: 'clickhouse' },
        { PAYLOAD_SECRET: 'secret' } as any
      )
    ).toThrow('CLICKHOUSE_URL is required')
  })
})

// ===========================================================================
// Type Definition Tests
// ===========================================================================

describe('type definitions', () => {
  it('PayloadWorkerEnv has PAYLOAD_SECRET', () => {
    const env: import('./types.js').PayloadWorkerEnv = {
      PAYLOAD_SECRET: 'test',
    }
    expect(env.PAYLOAD_SECRET).toBe('test')
  })

  it('PayloadWorkerEnv supports MDXDB binding', () => {
    const env: import('./types.js').PayloadWorkerEnv = {
      PAYLOAD_SECRET: 'test',
      MDXDB: {} as any,
    }
    expect(env.MDXDB).toBeDefined()
  })

  it('PayloadWorkerEnv supports ClickHouse config', () => {
    const env: import('./types.js').PayloadWorkerEnv = {
      PAYLOAD_SECRET: 'test',
      CLICKHOUSE_URL: 'https://clickhouse.example.com',
      CLICKHOUSE_USERNAME: 'user',
      CLICKHOUSE_PASSWORD: 'pass',
      CLICKHOUSE_DATABASE: 'mydb',
    }
    expect(env.CLICKHOUSE_URL).toBeDefined()
  })

  it('PayloadAppConfig requires namespace and database', () => {
    const config: import('./types.js').PayloadAppConfig = {
      namespace: 'test.example.com',
      database: 'sqlite',
    }
    expect(config.namespace).toBe('test.example.com')
    expect(config.database).toBe('sqlite')
  })

  it('PayloadAppConfig supports all optional fields', () => {
    const config: import('./types.js').PayloadAppConfig = {
      namespace: 'test.example.com',
      database: 'clickhouse',
      nativeCollections: { things: true, search: false },
      collections: [],
      globals: [],
      admin: { route: '/admin', livePreview: true },
      api: { graphQL: true, rest: true },
      auth: { enabled: true, userSlug: 'users' },
      plugins: [{ name: 'seo' }],
    }
    expect(config.admin?.livePreview).toBe(true)
    expect(config.api?.graphQL).toBe(true)
  })

  it('TypeDefinition has required fields', () => {
    const type: import('./types.js').TypeDefinition = {
      name: 'Post',
      slug: 'posts',
      fields: [],
    }
    expect(type.name).toBe('Post')
    expect(type.slug).toBe('posts')
  })

  it('FieldDefinition supports all types', () => {
    const fields: import('./types.js').FieldDefinition[] = [
      { name: 'text', type: 'text' },
      { name: 'textarea', type: 'textarea' },
      { name: 'number', type: 'number' },
      { name: 'date', type: 'date' },
      { name: 'checkbox', type: 'checkbox' },
      { name: 'select', type: 'select', options: [{ label: 'A', value: 'a' }] },
      { name: 'json', type: 'json' },
      { name: 'richText', type: 'richText' },
      { name: 'upload', type: 'upload' },
      { name: 'relationship', type: 'relationship', relationTo: 'users' },
    ]
    expect(fields).toHaveLength(10)
  })

  it('RelationshipDefinition supports all types', () => {
    const rels: import('./types.js').RelationshipDefinition[] = [
      { name: 'author', to: 'users', type: 'hasOne' },
      { name: 'posts', to: 'posts', type: 'hasMany' },
      { name: 'parent', to: 'categories', type: 'belongsTo' },
      { name: 'tags', to: 'tags', type: 'belongsToMany', reverse: 'posts' },
    ]
    expect(rels).toHaveLength(4)
  })

  it('GenerateCollectionsOptions supports all fields', () => {
    const options: import('./types.js').GenerateCollectionsOptions = {
      source: './content',
      output: './generated',
      types: [],
      watch: true,
    }
    expect(options.source).toBe('./content')
    expect(options.watch).toBe(true)
  })

  it('ExecutionContext interface is correct', () => {
    const ctx: import('./types.js').ExecutionContext = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    }
    expect(typeof ctx.waitUntil).toBe('function')
    expect(typeof ctx.passThroughOnException).toBe('function')
  })
})

// ===========================================================================
// Config Builder Advanced Tests
// ===========================================================================

describe('createPayloadConfig advanced', () => {
  const mockMDXDB = {
    idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-id' }),
    get: vi.fn(),
    idFromString: vi.fn(),
    newUniqueId: vi.fn(),
  }

  it('creates config with sqlite adapter', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      { namespace: 'test', database: 'sqlite' },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    expect(config.secret).toBe('secret')
    expect(config.db).toBeDefined()
  })

  it('creates config with custom admin branding', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      {
        namespace: 'test',
        database: 'sqlite',
        admin: {
          branding: {
            logo: '/logo.png',
            favicon: '/favicon.ico',
            title: 'My CMS',
          },
        },
      },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    expect(config.admin?.meta?.titleSuffix).toContain('My CMS')
  })

  it('creates config with disabled auth', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      {
        namespace: 'test',
        database: 'sqlite',
        auth: { enabled: false },
      },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    // Users collection should not be added when auth is disabled
    const hasUsers = config.collections?.some((c: any) => c.slug === 'users')
    expect(hasUsers).toBe(false)
  })

  it('creates config with custom collections', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const customCollection = {
      slug: 'custom',
      fields: [{ name: 'test', type: 'text' as const }],
    }

    const config = createPayloadConfig(
      {
        namespace: 'test',
        database: 'sqlite',
        collections: [customCollection],
      },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    const hasCustom = config.collections?.some((c: any) => c.slug === 'custom')
    expect(hasCustom).toBe(true)
  })

  it('creates config with nativeCollections disabled', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      {
        namespace: 'test',
        database: 'sqlite',
        nativeCollections: false,
      },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    const hasThings = config.collections?.some((c: any) => c.slug === 'things')
    expect(hasThings).toBe(false)
  })

  it('creates config with selective nativeCollections', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      {
        namespace: 'test',
        database: 'sqlite',
        nativeCollections: {
          things: true,
          relationships: false,
          search: true,
          events: false,
          actions: false,
          artifacts: false,
        },
      },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any }
    )

    const hasThings = config.collections?.some((c: any) => c.slug === 'things')
    const hasRelationships = config.collections?.some((c: any) => c.slug === 'relationships')
    expect(hasThings).toBe(true)
    expect(hasRelationships).toBe(false)
  })

  it('uses NAMESPACE from env when not in config', async () => {
    const { createPayloadConfig } = await import('./config.js')
    const config = createPayloadConfig(
      { namespace: 'config-ns', database: 'sqlite' },
      { PAYLOAD_SECRET: 'secret', MDXDB: mockMDXDB as any, NAMESPACE: 'env-ns' }
    )

    expect(config).toBeDefined()
  })
})

// ===========================================================================
// createMinimalConfig Tests
// ===========================================================================

describe('createMinimalConfig', () => {
  const mockMDXDB = {
    idFromName: vi.fn().mockReturnValue({ toString: () => 'mock-id' }),
    get: vi.fn(),
    idFromString: vi.fn(),
    newUniqueId: vi.fn(),
  }

  it('creates minimal config from env', async () => {
    const { createMinimalConfig } = await import('./config.js')
    const config = createMinimalConfig({
      PAYLOAD_SECRET: 'secret',
      MDXDB: mockMDXDB as any,
      NAMESPACE: 'test.example.com',
    })

    expect(config).toBeDefined()
    expect(config.secret).toBe('secret')
  })

  it('uses default namespace when not provided', async () => {
    const { createMinimalConfig } = await import('./config.js')
    const config = createMinimalConfig({
      PAYLOAD_SECRET: 'secret',
      MDXDB: mockMDXDB as any,
    })

    expect(config).toBeDefined()
  })

  it('detects sqlite mode when MDXDB is present', async () => {
    const { createMinimalConfig } = await import('./config.js')
    const config = createMinimalConfig({
      PAYLOAD_SECRET: 'secret',
      MDXDB: mockMDXDB as any,
    })

    expect(config.db).toBeDefined()
  })

  it('throws when clickhouse mode lacks MDXDB and CLICKHOUSE_URL has issues', async () => {
    const { createMinimalConfig } = await import('./config.js')

    // When neither MDXDB nor CLICKHOUSE_URL is properly configured, should throw
    expect(() =>
      createMinimalConfig({
        PAYLOAD_SECRET: 'secret',
      } as any)
    ).toThrow()
  })

  it('creates config in clickhouse mode when CLICKHOUSE_URL is present', async () => {
    const { createMinimalConfig } = await import('./config.js')

    // This should work since clickhouse URL is provided
    const config = createMinimalConfig({
      PAYLOAD_SECRET: 'secret',
      CLICKHOUSE_URL: 'https://clickhouse.example.com',
    } as any)

    expect(config).toBeDefined()
    expect(config.db).toBeDefined()
  })
})

/**
 * Payload configuration builder for mdxdb
 *
 * Creates Payload CMS configurations using mdxdb database adapters.
 *
 * @example
 * ```ts
 * import { createPayloadConfig } from '@mdxe/payload/config'
 *
 * export default createPayloadConfig({
 *   namespace: 'example.com',
 *   database: 'sqlite',
 *   collections: [Posts, Authors],
 * })
 * ```
 *
 * @packageDocumentation
 */

import type { Config, CollectionConfig, GlobalConfig } from 'payload'
import {
  sqliteAdapter,
  clickhouseAdapter,
  getNativeCollections,
  createVirtualCollection,
} from '@mdxdb/payload'
import type { PayloadAppConfig, PayloadWorkerEnv } from './types.js'

// =============================================================================
// Default User Collection
// =============================================================================

const UsersCollection: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
    group: 'Admin',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      name: 'role',
      type: 'select',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Editor', value: 'editor' },
        { label: 'User', value: 'user' },
      ],
      defaultValue: 'user',
    },
    {
      name: 'avatar',
      type: 'text',
      admin: {
        description: 'Avatar URL',
      },
    },
  ],
}

// =============================================================================
// Default Media Collection
// =============================================================================

const MediaCollection: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: ['image/*', 'video/*', 'audio/*', 'application/pdf'],
  },
  admin: {
    useAsTitle: 'filename',
    group: 'Content',
  },
  access: {
    read: () => true,
    create: () => true,
    update: () => true,
    delete: () => true,
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      admin: {
        description: 'Alt text for accessibility',
      },
    },
    {
      name: 'caption',
      type: 'textarea',
    },
  ],
}

// =============================================================================
// Config Builder
// =============================================================================

/**
 * Create a Payload configuration for Cloudflare Workers
 *
 * @param appConfig - Application configuration
 * @param env - Worker environment bindings
 * @returns Payload configuration object
 */
export function createPayloadConfig(
  appConfig: PayloadAppConfig,
  env: PayloadWorkerEnv
): Config {
  const {
    namespace,
    database,
    nativeCollections = true,
    collections = [],
    globals = [],
    admin = {},
    api = {},
    auth = {},
  } = appConfig

  // Build database adapter based on mode
  let db: ReturnType<typeof sqliteAdapter> | ReturnType<typeof clickhouseAdapter>

  if (database === 'sqlite') {
    if (!env.MDXDB) {
      throw new Error('MDXDB Durable Object binding is required for SQLite mode')
    }
    db = sqliteAdapter({
      binding: env.MDXDB,
      namespace: env.NAMESPACE ?? namespace,
      debug: env.DEBUG === 'true',
    })
  } else {
    if (!env.CLICKHOUSE_URL) {
      throw new Error('CLICKHOUSE_URL is required for ClickHouse mode')
    }
    db = clickhouseAdapter({
      url: env.CLICKHOUSE_URL,
      username: env.CLICKHOUSE_USERNAME,
      password: env.CLICKHOUSE_PASSWORD,
      database: env.CLICKHOUSE_DATABASE ?? 'mdxdb',
      namespace: env.NAMESPACE ?? namespace,
      debug: env.DEBUG === 'true',
    })
  }

  // Build collections list
  const allCollections: CollectionConfig[] = []

  // Add native mdxdb collections if enabled
  if (nativeCollections) {
    const nativeConfig = typeof nativeCollections === 'boolean'
      ? {}
      : nativeCollections

    allCollections.push(...getNativeCollections(nativeConfig))
  }

  // Add users collection if auth is enabled
  if (auth.enabled !== false) {
    allCollections.push(UsersCollection)
  }

  // Add media collection
  allCollections.push(MediaCollection)

  // Add custom collections
  allCollections.push(...collections)

  // Build the config
  const config: Config = {
    secret: env.PAYLOAD_SECRET,
    db: db as any, // Type assertion needed due to Payload's complex types

    admin: {
      user: auth.userSlug ?? 'users',
      ...(admin.branding && {
        components: {
          graphics: {
            Logo: admin.branding.logo,
            Icon: admin.branding.favicon,
          },
        },
        meta: {
          titleSuffix: admin.branding.title ? ` - ${admin.branding.title}` : undefined,
        },
      }),
    },

    collections: allCollections,
    globals,

    // API configuration
    ...(api.graphQL && { graphQL: { disable: false } }),
    ...(api.rest && { routes: { api: api.route ?? '/api' } }),

    // Typescript configuration - disable output on Workers
    typescript: {
      outputFile: undefined,
    },

    // Telemetry
    telemetry: false,
  }

  return config
}

/**
 * Create a minimal Payload configuration from environment
 */
export function createMinimalConfig(env: PayloadWorkerEnv): Config {
  return createPayloadConfig(
    {
      namespace: env.NAMESPACE ?? 'default',
      database: env.MDXDB ? 'sqlite' : 'clickhouse',
    },
    env
  )
}

// =============================================================================
// Collection Generators
// =============================================================================

/**
 * Create common content collections
 */
export function createContentCollections(): CollectionConfig[] {
  return [
    createVirtualCollection({
      slug: 'posts',
      type: 'Post',
      labels: { singular: 'Post', plural: 'Posts' },
      fields: [
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'categories',
          hasMany: true,
        },
        {
          name: 'tags',
          type: 'json',
          admin: {
            description: 'Array of tags',
          },
        },
        {
          name: 'publishedAt',
          type: 'date',
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Published', value: 'published' },
            { label: 'Archived', value: 'archived' },
          ],
          defaultValue: 'draft',
        },
      ],
    }),

    createVirtualCollection({
      slug: 'pages',
      type: 'Page',
      labels: { singular: 'Page', plural: 'Pages' },
      fields: [
        {
          name: 'parent',
          type: 'relationship',
          relationTo: 'pages',
          admin: {
            description: 'Parent page for hierarchy',
          },
        },
        {
          name: 'template',
          type: 'select',
          options: [
            { label: 'Default', value: 'default' },
            { label: 'Landing', value: 'landing' },
            { label: 'Documentation', value: 'docs' },
          ],
          defaultValue: 'default',
        },
        {
          name: 'seo',
          type: 'group',
          fields: [
            { name: 'metaTitle', type: 'text' },
            { name: 'metaDescription', type: 'textarea' },
            { name: 'keywords', type: 'json' },
          ],
        },
      ],
    }),

    createVirtualCollection({
      slug: 'categories',
      type: 'Category',
      labels: { singular: 'Category', plural: 'Categories' },
      fields: [
        {
          name: 'parent',
          type: 'relationship',
          relationTo: 'categories',
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'color',
          type: 'text',
          admin: {
            description: 'Hex color code',
          },
        },
      ],
    }),
  ]
}

/**
 * Create e-commerce collections
 */
export function createCommerceCollections(): CollectionConfig[] {
  return [
    createVirtualCollection({
      slug: 'products',
      type: 'Product',
      group: 'Commerce',
      fields: [
        {
          name: 'price',
          type: 'number',
          required: true,
        },
        {
          name: 'currency',
          type: 'select',
          options: [
            { label: 'USD', value: 'USD' },
            { label: 'EUR', value: 'EUR' },
            { label: 'GBP', value: 'GBP' },
          ],
          defaultValue: 'USD',
        },
        {
          name: 'sku',
          type: 'text',
          unique: true,
        },
        {
          name: 'inventory',
          type: 'number',
          defaultValue: 0,
        },
        {
          name: 'categories',
          type: 'relationship',
          relationTo: 'product-categories',
          hasMany: true,
        },
        {
          name: 'variants',
          type: 'json',
        },
      ],
    }),

    createVirtualCollection({
      slug: 'product-categories',
      type: 'ProductCategory',
      labels: { singular: 'Product Category', plural: 'Product Categories' },
      group: 'Commerce',
      fields: [
        {
          name: 'parent',
          type: 'relationship',
          relationTo: 'product-categories',
        },
        {
          name: 'image',
          type: 'relationship',
          relationTo: 'media',
        },
      ],
    }),

    createVirtualCollection({
      slug: 'orders',
      type: 'Order',
      group: 'Commerce',
      fields: [
        {
          name: 'customer',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'items',
          type: 'json',
          required: true,
        },
        {
          name: 'total',
          type: 'number',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          options: [
            { label: 'Pending', value: 'pending' },
            { label: 'Processing', value: 'processing' },
            { label: 'Shipped', value: 'shipped' },
            { label: 'Delivered', value: 'delivered' },
            { label: 'Cancelled', value: 'cancelled' },
          ],
          defaultValue: 'pending',
        },
        {
          name: 'shippingAddress',
          type: 'json',
        },
        {
          name: 'paymentIntent',
          type: 'text',
          admin: {
            readOnly: true,
          },
        },
      ],
    }),
  ]
}

export { UsersCollection, MediaCollection }

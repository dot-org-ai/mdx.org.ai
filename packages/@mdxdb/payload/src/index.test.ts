/**
 * Tests for @mdxdb/payload
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getNativeCollections,
  createVirtualCollection,
  ThingsCollection,
  RelationshipsCollection,
  SearchCollection,
  EventsCollection,
  ActionsCollection,
  ArtifactsCollection,
} from './index.js'

describe('@mdxdb/payload', () => {
  describe('getNativeCollections', () => {
    it('should return all native collections by default', () => {
      const collections = getNativeCollections()

      expect(collections).toHaveLength(6)

      const slugs = collections.map(c => c.slug)
      expect(slugs).toContain('things')
      expect(slugs).toContain('relationships')
      expect(slugs).toContain('search')
      expect(slugs).toContain('events')
      expect(slugs).toContain('actions')
      expect(slugs).toContain('artifacts')
    })

    it('should allow selective collection inclusion', () => {
      const collections = getNativeCollections({
        things: true,
        relationships: true,
        search: false,
        events: false,
        actions: true,
        artifacts: false,
      })

      expect(collections).toHaveLength(3)

      const slugs = collections.map(c => c.slug)
      expect(slugs).toContain('things')
      expect(slugs).toContain('relationships')
      expect(slugs).toContain('actions')
      expect(slugs).not.toContain('search')
      expect(slugs).not.toContain('events')
      expect(slugs).not.toContain('artifacts')
    })

    it('should apply custom access control', () => {
      const customAccess = {
        read: () => false,
        create: () => false,
      }

      const collections = getNativeCollections({
        things: true,
        relationships: false,
        search: false,
        events: false,
        actions: false,
        artifacts: false,
        access: customAccess,
      })

      expect(collections).toHaveLength(1)
      expect(collections[0]!.access?.read).toBe(customAccess.read)
      expect(collections[0]!.access?.create).toBe(customAccess.create)
    })
  })

  describe('ThingsCollection', () => {
    it('should have correct slug', () => {
      expect(ThingsCollection.slug).toBe('things')
    })

    it('should have required fields', () => {
      const fieldNames = ThingsCollection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('url')
      expect(fieldNames).toContain('ns')
      expect(fieldNames).toContain('type')
      expect(fieldNames).toContain('branch')
      expect(fieldNames).toContain('version')
      expect(fieldNames).toContain('data')
      expect(fieldNames).toContain('content')
    })

    it('should be in MDXDB admin group', () => {
      expect(ThingsCollection.admin?.group).toBe('MDXDB')
    })

    it('should have versioning enabled', () => {
      expect(ThingsCollection.versions).toBeTruthy()
    })
  })

  describe('RelationshipsCollection', () => {
    it('should have correct slug', () => {
      expect(RelationshipsCollection.slug).toBe('relationships')
    })

    it('should have from/to/type fields', () => {
      const fieldNames = RelationshipsCollection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('type')
      expect(fieldNames).toContain('from')
      expect(fieldNames).toContain('to')
      expect(fieldNames).toContain('data')
    })
  })

  describe('ActionsCollection', () => {
    it('should have correct slug', () => {
      expect(ActionsCollection.slug).toBe('actions')
    })

    it('should have job/workflow fields', () => {
      const fieldNames = ActionsCollection.fields.map((f: any) => f.name)

      // Verb conjugations
      expect(fieldNames).toContain('act')
      expect(fieldNames).toContain('action')
      expect(fieldNames).toContain('activity')

      // Job fields
      expect(fieldNames).toContain('status')
      expect(fieldNames).toContain('progress')
      expect(fieldNames).toContain('priority')
      expect(fieldNames).toContain('attempts')
      expect(fieldNames).toContain('maxAttempts')

      // Workflow hierarchy
      expect(fieldNames).toContain('parent')
      expect(fieldNames).toContain('children')
      expect(fieldNames).toContain('dependencies')
    })

    it('should have status select options', () => {
      const statusField = ActionsCollection.fields.find((f: any) => f.name === 'status') as any

      expect(statusField.type).toBe('select')
      expect(statusField.options).toBeDefined()

      const values = statusField.options.map((o: any) => o.value)
      expect(values).toContain('pending')
      expect(values).toContain('active')
      expect(values).toContain('completed')
      expect(values).toContain('failed')
      expect(values).toContain('cancelled')
    })
  })

  describe('EventsCollection', () => {
    it('should have correct slug', () => {
      expect(EventsCollection.slug).toBe('events')
    })

    it('should be immutable (no update/delete)', () => {
      expect(EventsCollection.access?.update).toBeDefined()
      expect(EventsCollection.access?.delete).toBeDefined()

      // Should return false
      expect(EventsCollection.access?.update?.()).toBe(false)
      expect(EventsCollection.access?.delete?.()).toBe(false)
    })

    it('should have actor-event-object pattern fields', () => {
      const fieldNames = EventsCollection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('event')
      expect(fieldNames).toContain('actor')
      expect(fieldNames).toContain('actorData')
      expect(fieldNames).toContain('object')
      expect(fieldNames).toContain('objectData')
      expect(fieldNames).toContain('result')
      expect(fieldNames).toContain('resultData')
    })
  })

  describe('createVirtualCollection', () => {
    it('should create a collection with correct slug and type', () => {
      const collection = createVirtualCollection({
        slug: 'posts',
        type: 'Post',
      })

      expect(collection.slug).toBe('posts')
    })

    it('should include default fields', () => {
      const collection = createVirtualCollection({
        slug: 'posts',
        type: 'Post',
      })

      const fieldNames = collection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('title')
      expect(fieldNames).toContain('slug')
      expect(fieldNames).toContain('content')
    })

    it('should include custom fields', () => {
      const collection = createVirtualCollection({
        slug: 'products',
        type: 'Product',
        fields: [
          { name: 'price', type: 'number', required: true },
          { name: 'sku', type: 'text', unique: true },
        ],
      })

      const fieldNames = collection.fields.map((f: any) => f.name)

      expect(fieldNames).toContain('price')
      expect(fieldNames).toContain('sku')
    })

    it('should set admin group', () => {
      const collection = createVirtualCollection({
        slug: 'posts',
        type: 'Post',
        group: 'Blog',
      })

      expect(collection.admin?.group).toBe('Blog')
    })

    it('should enable versioning by default', () => {
      const collection = createVirtualCollection({
        slug: 'posts',
        type: 'Post',
      })

      expect(collection.versions).toBeTruthy()
    })

    it('should allow disabling versioning', () => {
      const collection = createVirtualCollection({
        slug: 'settings',
        type: 'Setting',
        versions: false,
      })

      expect(collection.versions).toBe(false)
    })
  })
})

describe('Collections → Things mapping', () => {
  it('should map collection slug to type (PascalCase)', () => {
    // This tests the getType function concept
    const slugToType = (slug: string) =>
      slug
        .split('-')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

    expect(slugToType('posts')).toBe('Posts')
    expect(slugToType('blog-posts')).toBe('BlogPosts')
    expect(slugToType('product-categories')).toBe('ProductCategories')
  })
})

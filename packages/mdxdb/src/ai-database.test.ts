/**
 * Tests for ai-database integration with mdxdb
 *
 * This tests the schema-first database approach from ai-database
 * integrated with mdxdb's storage backends.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  DB,
  parseSchema,
  setProvider,
  MemoryProvider,
  createMemoryProvider,
  type DatabaseSchema,
  type TypedDB,
} from './index.js'

describe('ai-database integration', () => {
  describe('DB factory', () => {
    it('should create a typed database from schema', () => {
      const { db } = DB({
        User: {
          name: 'string',
          email: 'string',
          age: 'number',
        },
      })

      expect(db).toBeDefined()
      expect(db.User).toBeDefined()
    })

    it('should support bi-directional relationships', () => {
      const { db } = DB({
        Post: {
          title: 'string',
          content: 'markdown',
          author: 'Author.posts', // Creates Post.author -> Author AND Author.posts -> Post[]
        },
        Author: {
          name: 'string',
          email: 'string',
          // posts: Post[] is auto-created from the backref
        },
      })

      expect(db).toBeDefined()
      expect(db.Post).toBeDefined()
      expect(db.Author).toBeDefined()
    })

    it('should support multiple entity types', () => {
      const { db } = DB({
        User: {
          name: 'string',
          email: 'string',
        },
        Post: {
          title: 'string',
          content: 'markdown',
        },
        Comment: {
          content: 'string',
          author: 'User.comments',
          post: 'Post.comments',
        },
      })

      expect(db).toBeDefined()
      expect(db.User).toBeDefined()
      expect(db.Post).toBeDefined()
      expect(db.Comment).toBeDefined()
    })
  })

  describe('parseSchema', () => {
    it('should parse a simple schema', () => {
      const schema: DatabaseSchema = {
        User: {
          name: 'string',
          email: 'string',
          age: 'number',
        },
      }

      const parsed = parseSchema(schema)

      expect(parsed).toBeDefined()
      expect(parsed.entities).toBeDefined()

      const userEntity = parsed.entities.get('User')
      expect(userEntity).toBeDefined()
      expect(userEntity!.fields.get('name')).toEqual({
        name: 'name',
        type: 'string',
        isArray: false,
        isOptional: false,
        isRelation: false,
      })
      expect(userEntity!.fields.get('email')).toEqual({
        name: 'email',
        type: 'string',
        isArray: false,
        isOptional: false,
        isRelation: false,
      })
      expect(userEntity!.fields.get('age')).toEqual({
        name: 'age',
        type: 'number',
        isArray: false,
        isOptional: false,
        isRelation: false,
      })
    })

    it('should parse optional fields', () => {
      const schema: DatabaseSchema = {
        User: {
          name: 'string',
          bio: 'string?',
        },
      }

      const parsed = parseSchema(schema)
      const userEntity = parsed.entities.get('User')!

      expect(userEntity.fields.get('name')!.isOptional).toBe(false)
      expect(userEntity.fields.get('bio')!.isOptional).toBe(true)
    })

    it('should parse array fields', () => {
      const schema: DatabaseSchema = {
        User: {
          name: 'string',
          tags: 'string[]',
          scores: 'number[]',
        },
      }

      const parsed = parseSchema(schema)
      const userEntity = parsed.entities.get('User')!

      expect(userEntity.fields.get('name')!.isArray).toBe(false)
      expect(userEntity.fields.get('tags')!.isArray).toBe(true)
      expect(userEntity.fields.get('scores')!.isArray).toBe(true)
    })

    it('should parse relationship fields with backrefs', () => {
      const schema: DatabaseSchema = {
        Post: {
          title: 'string',
          author: 'Author.posts',
        },
        Author: {
          name: 'string',
        },
      }

      const parsed = parseSchema(schema)
      const postEntity = parsed.entities.get('Post')!
      const authorEntity = parsed.entities.get('Author')!

      expect(postEntity.fields.get('author')).toMatchObject({
        name: 'author',
        type: 'Author',
        isArray: false,
        isOptional: false,
        isRelation: true,
        relatedType: 'Author',
        backref: 'posts',
      })
      // Check that Author.posts was auto-created
      expect(authorEntity.fields.get('posts')).toMatchObject({
        name: 'posts',
        type: 'Post',
        isArray: true,
        isOptional: false,
        isRelation: true,
        relatedType: 'Post',
        backref: 'author',
      })
    })

    it('should handle complex schema with multiple relationships', () => {
      const schema: DatabaseSchema = {
        User: {
          name: 'string',
          email: 'string',
        },
        Post: {
          title: 'string',
          content: 'markdown',
          author: 'User.posts',
          tags: 'Tag.posts',
        },
        Comment: {
          content: 'string',
          author: 'User.comments',
          post: 'Post.comments',
        },
        Tag: {
          name: 'string',
        },
      }

      const parsed = parseSchema(schema)

      // Verify all entities exist
      expect(parsed.entities.get('User')).toBeDefined()
      expect(parsed.entities.get('Post')).toBeDefined()
      expect(parsed.entities.get('Comment')).toBeDefined()
      expect(parsed.entities.get('Tag')).toBeDefined()

      // Verify backrefs were created
      expect(parsed.entities.get('User')!.fields.get('posts')).toBeDefined()
      expect(parsed.entities.get('User')!.fields.get('comments')).toBeDefined()
      expect(parsed.entities.get('Post')!.fields.get('comments')).toBeDefined()
      expect(parsed.entities.get('Tag')!.fields.get('posts')).toBeDefined()
    })
  })

  describe('MemoryProvider', () => {
    let provider: ReturnType<typeof createMemoryProvider>

    beforeEach(() => {
      provider = createMemoryProvider()
    })

    it('should create a memory provider', () => {
      expect(provider).toBeDefined()
      expect(provider.get).toBeDefined()
      expect(provider.list).toBeDefined()
      expect(provider.create).toBeDefined()
      expect(provider.update).toBeDefined()
      expect(provider.delete).toBeDefined()
    })

    it('should create and retrieve entities', async () => {
      const user = await provider.create('User', 'user-1', {
        name: 'Alice',
        email: 'alice@example.com',
      })

      expect(user).toBeDefined()
      expect(user.$id).toBe('user-1')
      expect(user.$type).toBe('User')
      expect(user.name).toBe('Alice')
      expect(user.email).toBe('alice@example.com')

      const retrieved = await provider.get('User', 'user-1')
      expect(retrieved).toEqual(user)
    })

    it('should list entities of a type', async () => {
      await provider.create('User', 'user-1', { name: 'Alice' })
      await provider.create('User', 'user-2', { name: 'Bob' })
      await provider.create('Post', 'post-1', { title: 'Hello' })

      const users = await provider.list('User')
      expect(users).toHaveLength(2)
      expect(users.map((u) => u.name)).toContain('Alice')
      expect(users.map((u) => u.name)).toContain('Bob')

      const posts = await provider.list('Post')
      expect(posts).toHaveLength(1)
    })

    it('should update entities', async () => {
      await provider.create('User', 'user-1', {
        name: 'Alice',
        email: 'alice@example.com',
      })

      const updated = await provider.update('User', 'user-1', {
        email: 'alice.new@example.com',
      })

      expect(updated.name).toBe('Alice')
      expect(updated.email).toBe('alice.new@example.com')
    })

    it('should delete entities', async () => {
      await provider.create('User', 'user-1', { name: 'Alice' })

      const deleted = await provider.delete('User', 'user-1')
      expect(deleted).toBe(true)

      const retrieved = await provider.get('User', 'user-1')
      expect(retrieved).toBeNull()
    })

    it('should return null for non-existent entities', async () => {
      const result = await provider.get('User', 'non-existent')
      expect(result).toBeNull()
    })

    it('should handle search queries', async () => {
      await provider.create('User', 'user-1', {
        name: 'Alice Smith',
        email: 'alice@example.com',
      })
      await provider.create('User', 'user-2', {
        name: 'Bob Jones',
        email: 'bob@example.com',
      })

      const results = await provider.search('User', 'Alice')
      expect(results).toHaveLength(1)
      expect(results[0].name).toBe('Alice Smith')
    })
  })

  describe('DB with MemoryProvider', () => {
    let testProvider: ReturnType<typeof createMemoryProvider>

    beforeEach(() => {
      testProvider = createMemoryProvider()
      setProvider(testProvider)
    })

    it('should work with MemoryProvider', async () => {
      const db = DB({
        User: {
          name: 'string',
          email: 'string',
          age: 'number?',
        },
      })

      // Create a user
      const user = await db.User.create('user-1', {
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
      })

      expect(user.$id).toBe('user-1')
      expect(user.$type).toBe('User')
      expect(user.name).toBe('Alice')
      expect(user.email).toBe('alice@example.com')
      expect(user.age).toBe(30)

      // Get the user
      const retrieved = await db.User.get('user-1')
      expect(retrieved).toMatchObject({
        $id: 'user-1',
        $type: 'User',
        name: 'Alice',
        email: 'alice@example.com',
        age: 30,
      })

      // List users
      const users = await db.User.list()
      expect(users).toHaveLength(1)
      expect(users[0]).toMatchObject({
        $id: 'user-1',
        name: 'Alice',
      })

      // Update the user
      const updated = await db.User.update('user-1', { age: 31 })
      expect(updated.age).toBe(31)
      expect(updated.name).toBe('Alice')

      // Delete the user
      const deleted = await db.User.delete('user-1')
      expect(deleted).toBe(true)

      const afterDelete = await db.User.get('user-1')
      expect(afterDelete).toBeNull()
    })

    it('should handle relationships with MemoryProvider', async () => {
      const db = DB({
        Post: {
          title: 'string',
          content: 'markdown',
          author: 'Author.posts',
        },
        Author: {
          name: 'string',
          email: 'string',
        },
      })

      // Create author
      const author = await db.Author.create('author-1', {
        name: 'Alice',
        email: 'alice@example.com',
      })

      expect(author.$id).toBe('author-1')
      expect(author.name).toBe('Alice')

      // Create post
      const post = await db.Post.create('post-1', {
        title: 'Hello World',
        content: '# Hello\n\nThis is my first post.',
        author: 'author-1',
      })

      expect(post.title).toBe('Hello World')
      expect(post.$id).toBe('post-1')

      // The author field is stored as a string ID
      // When accessed, it would return a Promise to the related Author
      // (via the lazy-loaded getter from hydrateEntity)
    })

    it('should support multiple entity types', async () => {
      const db = DB({
        User: {
          name: 'string',
          email: 'string',
        },
        Post: {
          title: 'string',
          content: 'markdown',
        },
        Comment: {
          content: 'string',
        },
      })

      await db.User.create('user-1', {
        name: 'Alice',
        email: 'alice@example.com',
      })
      await db.Post.create('post-1', {
        title: 'Hello',
        content: '# Hello World',
      })
      await db.Comment.create('comment-1', {
        content: 'Great post!',
      })

      const users = await db.User.list()
      const posts = await db.Post.list()
      const comments = await db.Comment.list()

      expect(users).toHaveLength(1)
      expect(posts).toHaveLength(1)
      expect(comments).toHaveLength(1)
    })
  })

  describe('Type inference', () => {
    it('should infer entity types from schema', () => {
      const schema = {
        User: {
          name: 'string',
          email: 'string',
          age: 'number',
        },
      } as const

      type UserEntity = {
        id: string
        name: string
        email: string
        age: number
      }

      // This is a compile-time test - if it compiles, types are working
      const db = DB(schema)
      const checkType = async () => {
        const user = await db.User.get('user-1')
        if (user) {
          // These should not cause type errors
          const name: string = user.name
          const email: string = user.email
          const age: number = user.age
          const id: string = user.id

          // Silence unused variable warnings
          void name
          void email
          void age
          void id
        }
      }

      expect(checkType).toBeDefined()
    })
  })
})

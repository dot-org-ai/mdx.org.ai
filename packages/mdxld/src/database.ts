/**
 * AI Database primitives integration
 *
 * Re-exports from ai-database package for convenient access via mdxld.
 * This is an optional integration - ai-database must be installed separately.
 *
 * @example
 * ```ts
 * import { DB } from 'mdxld/database'
 *
 * const db = DB({
 *   Post: {
 *     title: 'string',
 *     content: 'markdown',
 *     author: 'Author.posts',
 *   },
 *   Author: {
 *     name: 'string',
 *     email: 'string',
 *   },
 * })
 *
 * // Typed, provider-agnostic access
 * const post = await db.Post.get('hello-world')
 * const author = await post.author
 * ```
 *
 * @packageDocumentation
 */

// Re-export everything from ai-database
export * from 'ai-database'

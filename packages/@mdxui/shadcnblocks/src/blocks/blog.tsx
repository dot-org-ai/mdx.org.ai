/**
 * Blog Blocks (GAP: Not in @mdxui/html)
 */

import * as React from 'react'
import type { BlogBlockProps } from '../types'

export function BlogGrid({ headline, posts }: BlogBlockProps) {
  return (
    <section aria-label="Blog" className="py-20">
      <div className="container mx-auto px-4">
        {headline && <h2 className="mb-12 text-center text-3xl font-bold tracking-tight md:text-4xl">{headline}</h2>}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post, i) => (
            <article key={i} className="group">
              {post.image && (
                <a href={post.href} className="block overflow-hidden rounded-lg">
                  <img src={post.image} alt="" className="aspect-video w-full object-cover transition-transform group-hover:scale-105" />
                </a>
              )}
              <div className="mt-4">
                {post.category && <span className="text-sm font-medium text-primary">{post.category}</span>}
                <h3 className="mt-2 text-xl font-semibold">
                  <a href={post.href} className="hover:underline">{post.title}</a>
                </h3>
                {post.excerpt && <p className="mt-2 text-muted-foreground">{post.excerpt}</p>}
                <div className="mt-4 flex items-center gap-4">
                  {post.author && (
                    <div className="flex items-center gap-2">
                      {post.author.avatar && <img src={post.author.avatar} alt="" className="h-8 w-8 rounded-full" />}
                      <span className="text-sm">{post.author.name}</span>
                    </div>
                  )}
                  <time className="text-sm text-muted-foreground">{post.date}</time>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export function BlogFeatured({ headline, posts }: BlogBlockProps) {
  const [featured, ...rest] = posts
  return (
    <section aria-label="Blog" className="py-20">
      <div className="container mx-auto px-4">
        {headline && <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-4xl">{headline}</h2>}
        <div className="grid gap-8 lg:grid-cols-2">
          {featured && (
            <article className="group">
              {featured.image && (
                <a href={featured.href} className="block overflow-hidden rounded-lg">
                  <img src={featured.image} alt="" className="aspect-video w-full object-cover transition-transform group-hover:scale-105" />
                </a>
              )}
              <div className="mt-6">
                <h3 className="text-2xl font-bold"><a href={featured.href} className="hover:underline">{featured.title}</a></h3>
                {featured.excerpt && <p className="mt-4 text-lg text-muted-foreground">{featured.excerpt}</p>}
              </div>
            </article>
          )}
          <div className="space-y-6">
            {rest.slice(0, 4).map((post, i) => (
              <article key={i} className="flex gap-4">
                {post.image && (
                  <a href={post.href} className="block w-24 flex-shrink-0 overflow-hidden rounded-lg">
                    <img src={post.image} alt="" className="aspect-square w-full object-cover" />
                  </a>
                )}
                <div>
                  <h3 className="font-semibold"><a href={post.href} className="hover:underline">{post.title}</a></h3>
                  <time className="mt-2 block text-sm text-muted-foreground">{post.date}</time>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export const Blog = { Grid: BlogGrid, Featured: BlogFeatured }

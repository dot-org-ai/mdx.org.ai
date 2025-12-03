# db4.ai

The AI-Native Database.

## Overview

A database built for AI from the ground up. Hybrid full-text and vector search, automatic embeddings, batch generation, and get-or-generate mode where missing content is created on demand.

## Features

### Hybrid Search

Combine keyword matching with semantic understanding:

```ts
const results = await db4.search('articles', {
  query: 'how to deploy serverless functions',
  mode: 'hybrid',  // full-text + vector
  limit: 10
})
```

### Automatic Embeddings

Content is automatically embedded on insert:

```ts
await db4.insert('articles', {
  title: 'Getting Started with MDX',
  content: 'MDX lets you write JSX in markdown...'
})
// Embeddings generated automatically
```

### forEach Generate/Enrich

Batch process your data with AI:

```ts
// Generate summaries for all articles
await db4.forEach('articles', async (article) => {
  const summary = await ai.summarize(article.content)
  return { ...article, summary }
})

// Enrich products with AI descriptions
await db4.forEach('products', async (product) => {
  const description = await ai.generate(`
    Write a compelling product description for: ${product.name}
  `)
  return { ...product, description }
})
```

### Get or Generate

Request content that may not exist - it gets created automatically:

```ts
// If the blog post exists, return it
// If not, generate it on demand
const post = await db4.getOrGenerate('blog', 'introduction-to-mdx', {
  generator: async (slug) => {
    const content = await ai.write({
      type: 'blog-post',
      topic: slug.replace(/-/g, ' '),
      style: 'technical'
    })
    return content
  }
})

// Landing pages generated on demand
const page = await db4.getOrGenerate('pages', 'pricing', {
  generator: (slug) => ai.generate(`landing page for ${slug}`)
})
```

## Schema

```ts
import { db4 } from 'db4.ai'

// Define a collection with embedding config
const articles = db4.collection('articles', {
  schema: {
    title: 'string',
    content: 'text',
    author: 'reference:users',
    tags: 'string[]'
  },
  embedding: {
    fields: ['title', 'content'],  // Fields to embed
    model: 'text-embedding-3-small'
  },
  search: {
    fullText: ['title', 'content'],
    vector: true
  }
})
```

## Queries

```ts
// Semantic search
const similar = await db4.search('articles', {
  query: 'serverless deployment best practices',
  limit: 5
})

// Full-text search
const matches = await db4.search('articles', {
  query: 'serverless',
  mode: 'fulltext'
})

// Filter + search
const tagged = await db4.search('articles', {
  query: 'deployment',
  filter: { tags: { $contains: 'devops' } }
})
```

## Getting Started

```bash
npx mdxe dev examples/db4.ai
```

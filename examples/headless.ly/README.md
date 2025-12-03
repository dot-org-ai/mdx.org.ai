# headless.ly

Headless CMS powered by MDX and AI.

## Overview

A modern headless content management system where content is code. Write content in MDX, get a fully-typed API, and render anywhere.

## Content Types

- **[BlogPost]** - Blog posts and articles
- **[Author]** - Content authors and contributors
- **[Tag]** - Taxonomy and categorization
- **[Page]** - Static pages
- **[Collection]** - Content collections

## Features

- Git-based content versioning
- AI-powered content generation
- Automatic SEO optimization
- Multi-language support
- Preview environments
- Scheduled publishing

## API

```ts
// Fetch all blog posts
const posts = await headless.content('BlogPost').list()

// Get a single post by slug
const post = await headless.content('BlogPost').get({ slug: 'hello-world' })

// Create with AI assistance
const draft = await headless.ai.draft('BlogPost', {
  topic: 'Introduction to MDX',
  tone: 'technical'
})
```

## Getting Started

```bash
npx mdxe dev examples/headless.ly
```

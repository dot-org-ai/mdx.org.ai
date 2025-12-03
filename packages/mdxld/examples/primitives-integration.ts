/**
 * Example demonstrating primitives integration with mdxld
 *
 * This example shows how to use mdxld's core functionality
 * together with AI primitives for a complete workflow.
 *
 * To run this example:
 * 1. Install the primitives: pnpm add ai-functions ai-database ai-workflows
 * 2. Build mdxld: pnpm build
 * 3. Run: tsx examples/primitives-integration.ts
 */

// Core MDXLD functionality
import { parse, stringify } from '../src/index.js'

// Optional primitives (comment out if not installed)
// import { RPC, AI, generateText } from '../src/functions.js'
// import { DB } from '../src/database.js'
// import { Workflow } from '../src/workflows.js'

async function main() {
  console.log('=== MDXLD Primitives Integration Example ===\n')

  // 1. Parse MDX content
  console.log('1. Parsing MDX content...')
  const mdxContent = `---
$type: BlogPosting
$id: https://example.com/posts/hello-world
$context: https://schema.org
title: Hello World
author: john-doe
datePublished: 2024-01-15
tags:
  - mdx
  - tutorial
---

# Hello World

This is my first blog post using MDXLD with primitives integration.

## Features

- Parse MDX with YAML frontmatter
- Store in database with relationships
- Process events via workflows
- Call AI functions for enhancement
`

  const doc = parse(mdxContent)
  console.log('Parsed document:', {
    id: doc.id,
    type: doc.type,
    title: doc.data.title,
    author: doc.data.author,
  })
  console.log()

  // 2. Demonstrate stringify
  console.log('2. Stringifying back to MDX...')
  const mdx = stringify(doc)
  console.log('Generated MDX (first 200 chars):')
  console.log(mdx.substring(0, 200) + '...\n')

  // 3. Database integration (uncomment if ai-database is installed)
  /*
  console.log('3. Database integration...')
  const db = DB({
    BlogPosting: {
      title: 'string',
      content: 'markdown',
      author: 'Author.posts',
    },
    Author: {
      name: 'string',
      email: 'string',
    },
  })

  // Create the blog post
  await db.BlogPosting.create({
    id: 'hello-world',
    title: doc.data.title,
    content: doc.content,
    author: doc.data.author,
  })

  console.log('✓ Blog post stored in database\n')
  */

  // 4. Workflows integration (uncomment if ai-workflows is installed)
  /*
  console.log('4. Workflows integration...')
  const workflow = Workflow($ => {
    $.on.BlogPosting.created(async (post, $) => {
      $.log('New blog post created:', post.title)
      // In a real app: notify subscribers, update search index, etc.
    })

    $.every.hour(async ($) => {
      $.log('Hourly: Check for posts to publish')
    })
  })

  await workflow.start()
  await workflow.send('BlogPosting.created', doc.data)
  console.log('✓ Workflow events processed\n')
  */

  // 5. AI Functions integration (uncomment if ai-functions is installed)
  /*
  console.log('5. AI Functions integration...')

  // Define an AI function for summarization
  const summarize = AI('Generate a summary', {
    input: schema({ text: 'string' }),
    output: schema({ summary: 'string', keywords: ['string'] }),
  })

  // Use RPC for function composition
  const rpc = RPC({
    functions: {
      summarize,
      enhancePost: async (content: string) => {
        const summary = await summarize({ text: content })
        return { content, summary }
      },
    },
  })

  console.log('✓ AI functions configured\n')
  */

  console.log('=== Example Complete ===\n')
  console.log('To enable database, workflows, or AI functions:')
  console.log('1. Install the packages: pnpm add ai-database ai-workflows ai-functions')
  console.log('2. Uncomment the relevant sections in this file')
  console.log('3. Run again: tsx examples/primitives-integration.ts')
}

main().catch(console.error)

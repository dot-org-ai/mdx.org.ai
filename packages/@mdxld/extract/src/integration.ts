/**
 * @mdxld/extract Integration Examples
 *
 * This module provides integration examples showing how to use @mdxld/extract
 * with mdxdb and other parts of the mdx.org.ai ecosystem.
 *
 * @packageDocumentation
 */

import { extract, diff, applyExtract, roundTripComponent, type ExtractResult } from './extract.js'

// =============================================================================
// Example: Blog Post Round-Trip Editing
// =============================================================================

/**
 * Example blog post template
 */
export const blogPostTemplate = `# {post.title}

*By {post.author} on {post.date}*

{post.content}

---

**Tags:** {post.tags}`

/**
 * Example: Extract blog post data from rendered markdown
 */
export function extractBlogPost(rendered: string): ExtractResult {
  return extract({
    template: blogPostTemplate,
    rendered
  })
}

/**
 * Example: Sync edited markdown back to structured data
 */
export function syncBlogPostEdits<T extends Record<string, unknown>>(
  original: T,
  editedMarkdown: string
): { updated: T; changes: ReturnType<typeof diff> } {
  const extracted = extract({ template: blogPostTemplate, rendered: editedMarkdown })
  const changes = diff(original, extracted.data)
  const updated = applyExtract(original, extracted.data)

  return { updated, changes }
}

// =============================================================================
// Example: Schema.org Type Round-Trip
// =============================================================================

/**
 * Property table round-trip component for schema.org types
 */
export const PropertyTable = roundTripComponent({
  render: (props: { properties: Array<{ name: string; type: string; description: string }> }) => {
    const header = '| Property | Type | Description |\n|---|---|---|'
    const rows = props.properties.map(p =>
      `| ${p.name} | ${p.type} | ${p.description} |`
    ).join('\n')
    return `${header}\n${rows}`
  },
  extract: (content: string) => {
    const rows = content.split('\n').filter(r =>
      r.startsWith('|') && !r.includes('---') && !r.includes('Property')
    )
    return {
      properties: rows.map(row => {
        const cells = row.split('|').filter(Boolean).map(c => c.trim())
        return {
          name: cells[0]!,
          type: cells[1]!,
          description: cells[2]!
        }
      })
    }
  }
})

/**
 * Schema type template
 */
export const schemaTypeTemplate = `# {type.label}

## Description

{type.comment}

## Parent Type

{type.subClassOf}

## Properties

<PropertyTable properties={type.properties} />`

// =============================================================================
// Example: CMS Integration
// =============================================================================

/**
 * CMS document interface
 */
export interface CMSDocument {
  id: string
  type: string
  data: Record<string, unknown>
  content: string
  template: string
  updatedAt: Date
}

/**
 * Example CMS integration showing full round-trip workflow
 */
export class ContentManager {
  private documents = new Map<string, CMSDocument>()

  /**
   * Get a document by ID
   */
  async get(id: string): Promise<CMSDocument | null> {
    return this.documents.get(id) || null
  }

  /**
   * Render a document to markdown using its template
   */
  render(doc: CMSDocument): string {
    // In a real implementation, this would evaluate the MDX template
    // For this example, we just return the content
    return doc.content
  }

  /**
   * Update a document from edited markdown
   *
   * This is the key round-trip operation:
   * 1. Extract structured data from the edited markdown
   * 2. Diff against the original data
   * 3. Apply changes to the document
   */
  async updateFromMarkdown(
    id: string,
    editedMarkdown: string
  ): Promise<{ doc: CMSDocument; changes: ReturnType<typeof diff> }> {
    const doc = await this.get(id)
    if (!doc) {
      throw new Error(`Document not found: ${id}`)
    }

    // Extract data from the edited markdown
    const result = extract({
      template: doc.template,
      rendered: editedMarkdown
    })

    // Calculate diff
    const changes = diff(doc.data, result.data)

    // Apply changes
    const updatedData = applyExtract(doc.data, result.data)

    // Update document
    const updatedDoc: CMSDocument = {
      ...doc,
      data: updatedData,
      content: editedMarkdown,
      updatedAt: new Date()
    }

    this.documents.set(id, updatedDoc)

    return { doc: updatedDoc, changes }
  }

  /**
   * Create a new document
   */
  async create(doc: Omit<CMSDocument, 'id' | 'updatedAt'>): Promise<CMSDocument> {
    const id = Math.random().toString(36).slice(2)
    const newDoc: CMSDocument = {
      ...doc,
      id,
      updatedAt: new Date()
    }
    this.documents.set(id, newDoc)
    return newDoc
  }
}

// =============================================================================
// Example: mdxdb Integration
// =============================================================================

/**
 * Example showing how @mdxld/extract integrates with mdxdb
 *
 * This demonstrates the bi-directional sync workflow:
 * 1. Fetch document from mdxdb
 * 2. Render to markdown for editing
 * 3. User/AI edits the markdown
 * 4. Extract changes back to structured data
 * 5. Update mdxdb with changes
 */
export async function mdxdbIntegrationExample() {
  // Simulated mdxdb document
  const original = {
    $type: 'BlogPost',
    $id: 'https://example.com/posts/hello-world',
    title: 'Hello World',
    author: 'Jane Doe',
    date: '2024-01-15',
    content: 'This is my first blog post.',
    tags: 'intro, hello'
  }

  // Template for this document type
  const template = blogPostTemplate

  // Simulated rendered markdown (would come from MDX evaluation)
  const rendered = `# Hello World

*By Jane Doe on 2024-01-15*

This is my first blog post.

---

**Tags:** intro, hello`

  // User edits the markdown...
  const edited = `# Hello World - Updated!

*By Jane Doe on 2024-01-15*

This is my first blog post, with some updates!

---

**Tags:** intro, hello, updated`

  // Extract changes
  const result = extract({ template, rendered: edited })

  // Calculate diff
  const changes = diff(
    { post: original },
    result.data
  )

  console.log('Changes detected:', changes)
  // {
  //   modified: {
  //     'post.title': { from: 'Hello World', to: 'Hello World - Updated!' },
  //     'post.content': { from: '...', to: '...' },
  //     'post.tags': { from: 'intro, hello', to: 'intro, hello, updated' }
  //   }
  // }

  // Apply changes back to original
  const updated = applyExtract({ post: original }, result.data)

  console.log('Updated document:', updated)

  return { original, edited, result, changes, updated }
}

// =============================================================================
// Example: AI Editing Workflow
// =============================================================================

/**
 * Example showing AI-assisted content editing with extraction
 *
 * Workflow:
 * 1. Render document to markdown
 * 2. AI edits the markdown (improves content, fixes grammar, etc.)
 * 3. Extract changes back to structured data
 * 4. Review and apply changes
 */
export async function aiEditingWorkflowExample() {
  const original = {
    title: 'Product Launch',
    description: 'We are excited to announce our new product.',
    features: ['Fast', 'Reliable', 'Easy to use']
  }

  const template = `# {data.title}

## Overview

{data.description}

## Key Features

{data.features}`

  // Original rendered markdown
  const rendered = `# Product Launch

## Overview

We are excited to announce our new product.

## Key Features

Fast, Reliable, Easy to use`

  // AI improves the content...
  const aiEdited = `# Introducing Our Revolutionary Product Launch

## Overview

We're thrilled to announce the launch of our groundbreaking new product that will transform how you work.

## Key Features

Lightning Fast, Enterprise Reliable, Intuitive to use`

  // Extract changes
  const result = extract({ template, rendered: aiEdited })

  // Show what changed
  const changes = diff({ data: original }, result.data)

  console.log('AI made these improvements:')
  for (const [path, change] of Object.entries(changes.modified)) {
    console.log(`  ${path}:`)
    console.log(`    Before: ${JSON.stringify(change.from)}`)
    console.log(`    After:  ${JSON.stringify(change.to)}`)
  }

  return { original, aiEdited, result, changes }
}

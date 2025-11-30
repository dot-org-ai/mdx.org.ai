/**
 * Shared test fixtures for MDX documents
 */

/**
 * Simple document with frontmatter
 */
export const simpleDocument = `---
title: Hello World
author: Test Author
date: 2024-01-15
---

# Hello World

This is a simple test document.

## Features

- Feature 1
- Feature 2
- Feature 3

> A quote for testing blockquotes.

\`\`\`javascript
const greeting = 'Hello, World!'
console.log(greeting)
\`\`\`
`

/**
 * Document with typed data ($type)
 */
export const typedDocument = `---
$type: BlogPost
$id: https://example.com/posts/hello-world
title: My First Blog Post
author: Jane Doe
publishedAt: 2024-01-15T10:00:00Z
tags:
  - javascript
  - tutorial
  - beginner
---

# My First Blog Post

Welcome to my blog! This is my first post.

## What You'll Learn

1. Setting up the project
2. Writing your first code
3. Running the application

**Bold text** and *italic text* are supported.

[Link to documentation](https://docs.example.com)
`

/**
 * Document with linked data context
 */
export const linkedDataDocument = `---
$type: Article
$context: https://schema.org
$id: https://example.com/articles/getting-started
name: Getting Started Guide
description: A comprehensive guide to getting started
author:
  $type: Person
  name: John Smith
  url: https://example.com/authors/john
datePublished: 2024-01-20
---

# Getting Started Guide

This guide will help you get started with the platform.
`

/**
 * Complex document with nested structures
 */
export const complexDocument = `---
$type: LandingPage
title: Awesome Product
description: The best product for your needs
hero:
  headline: Build Amazing Things
  subheadline: With our powerful platform
  cta:
    label: Get Started
    href: /signup
features:
  - title: Fast
    description: Lightning fast performance
    icon: bolt
  - title: Secure
    description: Enterprise-grade security
    icon: shield
  - title: Scalable
    description: Grows with your needs
    icon: chart
pricing:
  - name: Free
    price: $0
    features:
      - 1 project
      - Basic support
  - name: Pro
    price: $29
    features:
      - Unlimited projects
      - Priority support
      - Advanced features
---

# Awesome Product

Build something amazing with our platform.

## Why Choose Us?

We offer the best combination of speed, security, and scalability.

## Get Started Today

Sign up for a free account and start building.
`

/**
 * Document with MDX components (JSX)
 */
export const mdxComponentDocument = `---
title: Interactive Demo
---

# Interactive Demo

Here's an interactive component:

<Button onClick={() => alert('clicked!')}>
  Click Me
</Button>

And a custom card:

<Card title="Feature Highlight" image="/feature.png">
  This is a highlighted feature with rich content.
</Card>

Regular markdown continues here.
`

/**
 * Minimal document (no frontmatter)
 */
export const minimalDocument = `# Just Content

This document has no frontmatter.

- Item 1
- Item 2
`

/**
 * Empty document
 */
export const emptyDocument = ``

/**
 * Document with only frontmatter
 */
export const frontmatterOnlyDocument = `---
title: Frontmatter Only
description: This document has only frontmatter
---
`

/**
 * API documentation document
 */
export const apiDocument = `---
$type: API
title: User API
version: 1.0.0
baseUrl: https://api.example.com/v1
---

# User API

RESTful API for managing users.

## Endpoints

### GET /users

List all users with pagination.

**Query Parameters:**
- \`page\` - Page number (default: 1)
- \`limit\` - Items per page (default: 20)

**Response:**
\`\`\`json
{
  "users": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
\`\`\`

### POST /users

Create a new user.

**Request Body:**
\`\`\`json
{
  "name": "John Doe",
  "email": "john@example.com"
}
\`\`\`

### GET /users/:id

Get a specific user by ID.

### PUT /users/:id

Update a user.

### DELETE /users/:id

Delete a user.
`

/**
 * Document collection for batch testing
 */
export const documentCollection = {
  simple: simpleDocument,
  typed: typedDocument,
  linkedData: linkedDataDocument,
  complex: complexDocument,
  mdxComponents: mdxComponentDocument,
  minimal: minimalDocument,
  empty: emptyDocument,
  frontmatterOnly: frontmatterOnlyDocument,
  api: apiDocument,
}

/**
 * Expected parsed data for validation
 */
export const expectedParsedData = {
  simple: {
    title: 'Hello World',
    author: 'Test Author',
    date: '2024-01-15',
  },
  typed: {
    $type: 'BlogPost',
    $id: 'https://example.com/posts/hello-world',
    title: 'My First Blog Post',
    author: 'Jane Doe',
  },
  linkedData: {
    $type: 'Article',
    $context: 'https://schema.org',
    name: 'Getting Started Guide',
  },
}

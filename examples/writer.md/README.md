# writer.md

Write Markdown Content with AI.

## Overview

AI-powered writing assistant for Markdown. Generate blog posts, documentation, emails, and more. Edit, expand, and improve existing content.

## Commands

### Generate

```bash
# Generate a blog post
npx writer.md generate "Introduction to MDX" --type blog --length 1500

# Generate documentation
npx writer.md generate "API Reference" --type docs --from ./src/api.ts

# Generate from outline
npx writer.md generate --from outline.md
```

### Edit

```bash
# Improve clarity
npx writer.md edit article.md --improve clarity

# Fix grammar
npx writer.md edit article.md --fix grammar

# Change tone
npx writer.md edit article.md --tone professional
```

### Expand

```bash
# Expand a section
npx writer.md expand article.md --section "Getting Started"

# Add examples
npx writer.md expand article.md --add examples

# Add code samples
npx writer.md expand article.md --add code --language typescript
```

## API

```ts
import { writer } from 'writer.md'

// Generate content
const post = await writer.generate({
  topic: 'Introduction to MDX',
  type: 'blog',
  length: 1500,
  tone: 'technical',
  audience: 'developers'
})

// Edit content
const improved = await writer.edit(content, {
  improve: ['clarity', 'flow'],
  fix: ['grammar', 'spelling']
})

// Expand content
const expanded = await writer.expand(content, {
  section: 'Getting Started',
  add: ['examples', 'code']
})

// Summarize
const summary = await writer.summarize(content, {
  length: 'short',  // or 'medium', 'long'
  format: 'bullets'  // or 'paragraph'
})
```

## Templates

Pre-built templates for common content:

```bash
# Blog post
npx writer.md new --template blog

# Documentation page
npx writer.md new --template docs

# README
npx writer.md new --template readme

# Changelog
npx writer.md new --template changelog

# Email
npx writer.md new --template email
```

## Features

- **Multiple Formats** - Blog, docs, email, social
- **Tone Control** - Professional, casual, technical
- **Length Control** - Short, medium, long
- **SEO Optimization** - Keywords, meta descriptions
- **Multi-Language** - Write in any language

## MCP Server

```json
{
  "mcpServers": {
    "writer": {
      "command": "npx",
      "args": ["@writer.md/mcp"]
    }
  }
}
```

## Getting Started

```bash
npx writer.md init
npx writer.md generate "My First Post" --type blog
```

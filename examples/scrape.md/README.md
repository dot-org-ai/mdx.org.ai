# scrape.md

Scrape the Web for AI Agents.

## Overview

Turn any webpage into clean Markdown for AI consumption. Expose as an MCP server so your agents can browse the web.

## Features

- **Clean Markdown** - Extracts content, removes clutter
- **Structured Data** - Extracts metadata, links, images
- **MCP Server** - Give your agents web access
- **Batch Scraping** - Process multiple URLs
- **Caching** - Smart caching for repeated requests

## MCP Server

```json
{
  "mcpServers": {
    "scrape": {
      "command": "npx",
      "args": ["@scrape.md/mcp"]
    }
  }
}
```

Your agent can now:

```
Agent: Can you summarize the content at https://example.com/article?

[scrape.md fetches and converts to markdown]

Agent: Based on the article, here are the key points...
```

## API

```bash
# Scrape a single URL
GET https://scrape.md/api?url=https://example.com

# Returns clean markdown
{
  "url": "https://example.com",
  "title": "Example Domain",
  "content": "# Example Domain\n\nThis domain is for use in examples...",
  "links": ["https://www.iana.org/domains/example"],
  "metadata": { "description": "..." }
}
```

## SDK

```ts
import { scrape } from 'scrape.md'

// Single URL
const page = await scrape('https://example.com')
console.log(page.markdown)

// Multiple URLs
const pages = await scrape.batch([
  'https://example.com/page1',
  'https://example.com/page2'
])

// With options
const article = await scrape('https://blog.example.com/post', {
  selector: 'article',  // Extract specific element
  waitFor: '.content',  // Wait for dynamic content
  format: 'markdown'    // or 'text', 'html'
})
```

## CLI

```bash
# Scrape to stdout
npx scrape.md https://example.com

# Save to file
npx scrape.md https://example.com -o page.md

# Batch scrape
npx scrape.md urls.txt -o output/
```

## Use Cases

- **Research** - Gather information from multiple sources
- **RAG** - Build knowledge bases from web content
- **Monitoring** - Track changes to web pages
- **Data Collection** - Extract structured data

## Getting Started

```bash
npx mdxe dev examples/scrape.md
```

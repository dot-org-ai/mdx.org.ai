# agentic.md

Build and Deploy AI Agents with Markdown.

## Overview

Create powerful AI agents using only Markdown. Define capabilities, tools, and behaviors in a simple, readable format. Deploy anywhere with a single command.

## How It Works

### Define Your Agent

```mdx
---
$type: Agent
name: Research Assistant
model: claude-sonnet-4-20250514
---

# Research Assistant

You help users research topics and summarize findings.

## Personality

- Thorough and detail-oriented
- Cites sources for all claims
- Asks clarifying questions when needed

## Tools

### Web Search

Search the web for current information.

```ts
async function search(query: string) {
  return await web.search(query, { limit: 10 })
}
```

### Read URL

Extract content from a webpage.

```ts
async function read(url: string) {
  return await web.fetch(url).then(r => r.markdown())
}
```

### Save Note

Save research findings for later.

```ts
async function save(title: string, content: string) {
  return await db.notes.create({ title, content })
}
```
```

### Deploy

```bash
# Deploy to the cloud
npx agentic.md deploy ./research-assistant.md

# Run locally
npx agentic.md run ./research-assistant.md

# Expose as MCP server
npx agentic.md mcp ./research-assistant.md
```

## Features

- **Markdown-First** - Define agents in readable Markdown
- **Tool Definition** - Add capabilities with code blocks
- **Multi-Model** - Support for Claude, GPT, and more
- **One-Click Deploy** - Deploy to cloud or run locally
- **MCP Compatible** - Expose agents as MCP servers

## Examples

- `assistant.md` - Personal assistant
- `researcher.md` - Research agent
- `coder.md` - Coding assistant
- `writer.md` - Content writer

## Getting Started

```bash
npx agentic.md init my-agent
npx agentic.md dev my-agent.md
```

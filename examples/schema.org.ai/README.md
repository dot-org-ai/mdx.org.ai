# schema.org.ai

AI-Enhanced Semantic Vocabulary.

## Overview

A superset of Schema.org with AI-native extensions. Browse types at `/[Type]` and properties at `/[property]`. Adds the `digital` property to Thing and introduces new types for the AI era.

## Browse

- **Types**: [schema.org.ai/Person](/Person), [schema.org.ai/Organization](/Organization), [schema.org.ai/Product](/Product)
- **Properties**: [schema.org.ai/name](/name), [schema.org.ai/email](/email), [schema.org.ai/digital](/digital)

## New Property: `digital`

Every Thing now has a `digital` property representing its AI/digital twin:

```json
{
  "@type": "Person",
  "@id": "https://example.com/people/alice",
  "name": "Alice Smith",
  "digital": {
    "@type": "Agent",
    "@id": "https://agents.ai/alice",
    "capabilities": ["email", "calendar", "research"],
    "model": "claude-sonnet-4-20250514"
  }
}
```

## New Types

### Agent

An autonomous AI agent that can perform tasks:

```json
{
  "@type": "Agent",
  "name": "Research Assistant",
  "description": "Helps with research and analysis",
  "capabilities": ["search", "summarize", "analyze"],
  "model": "claude-sonnet-4-20250514",
  "tools": [
    { "@type": "Tool", "name": "web_search" },
    { "@type": "Tool", "name": "read_file" }
  ]
}
```

### Tool

A capability that an Agent can use:

```json
{
  "@type": "Tool",
  "name": "web_search",
  "description": "Search the web for information",
  "inputSchema": { "query": "string" },
  "outputSchema": { "results": "SearchResult[]" }
}
```

### Business

An AI-enhanced business entity:

```json
{
  "@type": "Business",
  "name": "Acme Corp",
  "industry": "Technology",
  "digital": {
    "@type": "Agent",
    "capabilities": ["customer-support", "sales", "scheduling"]
  }
}
```

### Workflow

A sequence of steps performed by agents:

```json
{
  "@type": "Workflow",
  "name": "Customer Onboarding",
  "steps": [
    { "@type": "Action", "agent": "sales-agent", "action": "qualify" },
    { "@type": "Action", "agent": "onboarding-agent", "action": "setup" }
  ]
}
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Browse all types and properties |
| `/[Type]` | View type definition and properties |
| `/[property]` | View property definition and usage |
| `/types` | List all types |
| `/properties` | List all properties |

## Getting Started

```bash
npx mdxe dev examples/schema.org.ai
```

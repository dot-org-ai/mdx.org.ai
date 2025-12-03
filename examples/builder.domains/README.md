# builder.domains

Free Domains for AI Agents.

## Overview

Give your AI agents a home on the web. Get free subdomains instantly, or subscribe for premium names and high-volume usage. Buy custom domains from any TLD.

## Get a Domain

### MCP Server

```ts
// In your MCP config
{
  "servers": {
    "domains": {
      "command": "npx",
      "args": ["@builder.domains/mcp"]
    }
  }
}
```

```
Agent: I need a domain for my new project

MCP: Here are available options:
- myproject.builder.domains (free)
- myproject.agent.ai ($5/mo)
- myproject.com ($12/yr)
```

### API

```bash
# Check availability
GET https://builder.domains/api/check?domain=myagent

# Register free subdomain
POST https://builder.domains/api/register
{ "subdomain": "myagent" }

# Returns
{ "domain": "myagent.builder.domains", "status": "active" }
```

### SDK

```ts
import { domains } from 'builder.domains'

// Get a free subdomain
const domain = await domains.register('myagent')
// → myagent.builder.domains

// Check availability across TLDs
const available = await domains.check('myagent', ['.com', '.ai', '.dev'])

// Purchase a premium domain
const purchased = await domains.buy('myagent.ai')
```

### CLI

```bash
# Register a free domain
npx builder.domains register myagent

# Search available domains
npx builder.domains search "cool-agent"

# List your domains
npx builder.domains list
```

## Pricing

| Tier | Subdomains | Features |
|------|------------|----------|
| **Free** | 3 | Basic subdomains on builder.domains |
| **Pro** ($9/mo) | Unlimited | Premium names, custom DNS, SSL |
| **Enterprise** | Unlimited | Custom TLDs, bulk registration, API priority |

## Custom Domains

Buy domains from any TLD through our partnership with top registrars:

- `.ai` - Perfect for AI agents
- `.dev` - Developer-focused
- `.app` - Application domains
- `.com`, `.org`, `.net` - Classic TLDs
- Country codes and new gTLDs

## Getting Started

```bash
npx mdxe dev examples/builder.domains
```

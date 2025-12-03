# api.ht

The HyperText API - Simple, Clickable APIs.

## Overview

Build APIs the way the web was meant to work. Every response contains links to related resources. No documentation hunting, no SDK required - just follow the links.

## Philosophy

- **Discoverable** - Start at the root, follow links to find what you need
- **Self-Documenting** - Every resource describes itself and its relationships
- **URL-Native** - Resources are identified by URLs, not opaque IDs
- **Click to Navigate** - Test your API in a browser, no tools needed

## How It Works

```bash
# Start at the root
curl https://api.ht/

# Response includes links to everything
{
  "$id": "https://api.ht/",
  "users": { "$ref": "https://api.ht/users" },
  "products": { "$ref": "https://api.ht/products" },
  "orders": { "$ref": "https://api.ht/orders" }
}
```

```bash
# Follow a link
curl https://api.ht/users

# Get a list with links to each item
{
  "$id": "https://api.ht/users",
  "items": [
    { "$ref": "https://api.ht/users/alice", "name": "Alice" },
    { "$ref": "https://api.ht/users/bob", "name": "Bob" }
  ],
  "next": { "$ref": "https://api.ht/users?cursor=xyz" }
}
```

```bash
# Get a resource with related links
curl https://api.ht/users/alice

{
  "$id": "https://api.ht/users/alice",
  "name": "Alice",
  "email": "alice@example.com",
  "orders": { "$ref": "https://api.ht/users/alice/orders" },
  "profile": { "$ref": "https://api.ht/users/alice/profile" }
}
```

## Features

- **Link Relations** - Standard link types (`self`, `next`, `prev`, `collection`)
- **URL Templates** - Parameterized URLs for search and filtering
- **Actions** - Links can describe available operations
- **Embedded Resources** - Inline related data to reduce round trips
- **Content Negotiation** - JSON, HTML, or Markdown responses

## Getting Started

```bash
npx mdxe dev examples/api.ht
```

## Define an Endpoint

```mdx
---
$type: Resource
$id: /users/{username}
---

# User

A user in the system.

## Links

- `orders` → /users/{username}/orders
- `profile` → /users/{username}/profile
- `organization` → /organizations/{orgId}
```

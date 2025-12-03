# db.ht

The HyperText Database - Click Your Data.

## Overview

A database with a browsable interface. List, search, and CRUD operations through clickable links. Every record has a URL. Every query returns links.

## Philosophy

- **URL-Based Identity** - Every record is a URL you can share and bookmark
- **Click to Navigate** - Browse your data like a website
- **Simple Operations** - List, Search, Create, Read, Update, Delete
- **Link Everything** - Relationships are URLs, not foreign keys

## API

### List

```bash
GET https://db.ht/users
```

```json
{
  "$id": "https://db.ht/users",
  "items": [
    { "$ref": "https://db.ht/users/u_abc123" },
    { "$ref": "https://db.ht/users/u_def456" }
  ],
  "count": 2,
  "next": { "$ref": "https://db.ht/users?cursor=xyz" }
}
```

### Search

```bash
GET https://db.ht/users?q=alice&role=admin
```

### Create

```bash
POST https://db.ht/users
{ "name": "Alice", "email": "alice@example.com" }

# Returns
{ "$ref": "https://db.ht/users/u_abc123" }
```

### Read

```bash
GET https://db.ht/users/u_abc123
```

### Update

```bash
PUT https://db.ht/users/u_abc123
{ "name": "Alice Smith" }
```

### Delete

```bash
DELETE https://db.ht/users/u_abc123
```

## SDK

```ts
import { db } from 'db.ht'

// List
const users = await db.users.list()

// Search
const admins = await db.users.search({ role: 'admin' })

// CRUD
const user = await db.users.create({ name: 'Alice' })
const alice = await db.users.get('u_abc123')
await db.users.update('u_abc123', { name: 'Alice Smith' })
await db.users.delete('u_abc123')

// Follow links
const orders = await alice.orders.list()
```

## Getting Started

```bash
npx mdxe dev examples/db.ht
```

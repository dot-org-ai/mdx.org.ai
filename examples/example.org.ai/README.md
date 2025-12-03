# example.org.ai

Modern Examples for the AI Era.

## Overview

A superset of example.org, modernized for AI-native development. Browse examples, copy code, and see how things work in practice.

## Examples

### Domains

| Domain | Description |
|--------|-------------|
| `example.org.ai` | This site |
| `user.example.org.ai` | Example user profiles |
| `api.example.org.ai` | Example API endpoints |
| `app.example.org.ai` | Example application |

### Placeholders

Use these in your tests and documentation:

```ts
// Users
const user = {
  id: 'user_example123',
  email: 'alice@example.org.ai',
  name: 'Alice Example'
}

// API Keys
const apiKey = 'sk_example_abc123'

// URLs
const apiUrl = 'https://api.example.org.ai'
const webhookUrl = 'https://webhooks.example.org.ai/hook'

// IDs
const orderId = 'order_example456'
const productId = 'prod_example789'
```

### Code Snippets

```ts
// Authentication
const auth = await fetch('https://api.example.org.ai/auth', {
  method: 'POST',
  body: JSON.stringify({
    email: 'alice@example.org.ai',
    password: 'example123'
  })
})

// API Request
const users = await fetch('https://api.example.org.ai/users', {
  headers: { 'Authorization': 'Bearer sk_example_abc123' }
})

// Webhook
app.post('/webhooks/example', (req) => {
  const event = req.body
  console.log(`Received ${event.type} from example.org.ai`)
})
```

### Test Data

```json
{
  "users": [
    { "id": "user_1", "name": "Alice", "email": "alice@example.org.ai" },
    { "id": "user_2", "name": "Bob", "email": "bob@example.org.ai" },
    { "id": "user_3", "name": "Charlie", "email": "charlie@example.org.ai" }
  ],
  "products": [
    { "id": "prod_1", "name": "Example Widget", "price": 9.99 },
    { "id": "prod_2", "name": "Sample Gadget", "price": 19.99 }
  ]
}
```

## Routes

| Path | Description |
|------|-------------|
| `/` | Home |
| `/users` | Example users |
| `/products` | Example products |
| `/api` | Example API documentation |
| `/code` | Code snippets |

## Getting Started

```bash
npx mdxe dev examples/example.org.ai
```

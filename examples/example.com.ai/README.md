# example.com.ai

Modern Examples for the AI Era.

## Overview

A superset of example.com, modernized for AI-native development. Browse examples, copy code, and see how things work in practice.

## Examples

### Domains

| Domain | Description |
|--------|-------------|
| `example.com.ai` | This site |
| `user.example.com.ai` | Example user profiles |
| `api.example.com.ai` | Example API endpoints |
| `app.example.com.ai` | Example application |

### Placeholders

Use these in your tests and documentation:

```ts
// Users
const user = {
  id: 'user_example123',
  email: 'alice@example.com.ai',
  name: 'Alice Example'
}

// API Keys
const apiKey = 'sk_example_abc123'

// URLs
const apiUrl = 'https://api.example.com.ai'
const webhookUrl = 'https://webhooks.example.com.ai/hook'

// IDs
const orderId = 'order_example456'
const productId = 'prod_example789'
```

### Code Snippets

```ts
// Authentication
const auth = await fetch('https://api.example.com.ai/auth', {
  method: 'POST',
  body: JSON.stringify({
    email: 'alice@example.com.ai',
    password: 'example123'
  })
})

// API Request
const users = await fetch('https://api.example.com.ai/users', {
  headers: { 'Authorization': 'Bearer sk_example_abc123' }
})

// Webhook
app.post('/webhooks/example', (req) => {
  const event = req.body
  console.log(`Received ${event.type} from example.com.ai`)
})
```

### Test Data

```json
{
  "users": [
    { "id": "user_1", "name": "Alice", "email": "alice@example.com.ai" },
    { "id": "user_2", "name": "Bob", "email": "bob@example.com.ai" },
    { "id": "user_3", "name": "Charlie", "email": "charlie@example.com.ai" }
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
npx mdxe dev examples/example.com.ai
```

# api.qa

AI-Powered API Testing.

## Overview

Test your APIs with AI. Describe what your API should do in plain English, and let AI generate comprehensive test suites, find edge cases, and validate behavior.

## Features

- **Natural Language Tests** - Write tests in plain English
- **AI Test Generation** - Automatically generate edge cases
- **Contract Testing** - Validate API contracts and schemas
- **Regression Detection** - Catch breaking changes automatically
- **Load Testing** - Generate realistic traffic patterns
- **Security Scanning** - Find vulnerabilities with AI

## How It Works

### Write Tests in English

```mdx
---
$type: TestSuite
api: https://api.example.com
---

# User API Tests

## Authentication

- Requests without an API key should return 401
- Invalid API keys should return 403
- Valid API keys should authenticate successfully

## Create User

- Creating a user with valid data should return 201
- Email addresses must be valid format
- Duplicate emails should return 409
- Missing required fields should return 400 with details

## Get User

- Getting an existing user should return their profile
- Getting a non-existent user should return 404
- Users can only access their own private data
```

### AI Generates Test Cases

```ts
// AI generates these from your descriptions
test('Requests without an API key should return 401', async () => {
  const response = await fetch('https://api.example.com/users')
  expect(response.status).toBe(401)
})

test('Email addresses must be valid format', async () => {
  const invalidEmails = ['notanemail', 'missing@', '@nodomain', 'spaces in@email.com']
  for (const email of invalidEmails) {
    const response = await createUser({ email })
    expect(response.status).toBe(400)
    expect(response.body.error).toContain('email')
  }
})
```

### Discover Edge Cases

```bash
npx api.qa discover https://api.example.com

# AI finds edge cases you didn't think of:
# - What happens with unicode in names?
# - What's the max length for fields?
# - How does pagination handle empty results?
# - What happens with concurrent updates?
```

## Getting Started

```bash
npx mdxe dev examples/api.qa
```

## Run Tests

```bash
npx api.qa test ./tests --api https://api.example.com
```

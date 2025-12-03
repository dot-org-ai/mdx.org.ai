# @mdxe/vitest

Vitest integration for testing MDX content. Extract and run tests embedded in MDX files with natural language assertions.

## Installation

```bash
npm install @mdxe/vitest
# or
pnpm add @mdxe/vitest
# or
yarn add @mdxe/vitest
```

## Features

- **Embedded Tests** - Write tests directly in MDX code blocks
- **Natural Assertions** - BDD-style `should` assertions
- **Test Extraction** - Extract test blocks from MDX files
- **Code Generation** - Generate runnable Vitest test files
- **Plugin Support** - Vitest plugin for MDX test files
- **Type-Safe** - Full TypeScript support

## Quick Start

Write tests in your MDX files:

```mdx
---
title: Math Utils
---

# Math Utilities

## add(a, b)

Adds two numbers together.

\`\`\`typescript test
import { add } from './math'

const result = add(2, 3)
result.should.equal(5)
\`\`\`

## multiply(a, b)

Multiplies two numbers.

\`\`\`typescript test
import { multiply } from './math'

multiply(3, 4).should.equal(12)
multiply(0, 100).should.equal(0)
\`\`\`
```

Run tests with Vitest:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { mdxTestPlugin } from '@mdxe/vitest'

export default defineConfig({
  plugins: [mdxTestPlugin()],
  test: {
    include: ['**/*.mdx']
  }
})
```

## API Reference

### `extractTests(content, options?)`

Extract test blocks from MDX content.

```typescript
function extractTests(content: string, options?: ExtractTestsOptions): TestBlock[]

interface ExtractTestsOptions {
  languages?: string[]  // Languages to extract (default: ['typescript', 'ts', 'javascript', 'js'])
  marker?: string       // Test marker (default: 'test')
}

interface TestBlock {
  name: string          // Test name from heading or generated
  code: string          // Test code
  language: string      // Code block language
  line: number          // Line number in source
}
```

**Example:**

```typescript
import { extractTests } from '@mdxe/vitest'

const mdx = `
# Calculator

## Addition

\`\`\`typescript test
expect(1 + 1).toBe(2)
\`\`\`
`

const tests = extractTests(mdx)
// [{ name: 'Addition', code: 'expect(1 + 1).toBe(2)', language: 'typescript', line: 7 }]
```

### `generateTestCode(testFile)`

Generate runnable Vitest test code from extracted tests.

```typescript
function generateTestCode(testFile: MDXTestFile): string

interface MDXTestFile {
  path: string          // Source file path
  title?: string        // Test suite title
  tests: TestBlock[]    // Extracted test blocks
}
```

**Example:**

```typescript
import { extractTests, generateTestCode } from '@mdxe/vitest'

const tests = extractTests(mdxContent)
const code = generateTestCode({
  path: 'docs/math.mdx',
  title: 'Math Utils',
  tests
})

// Generated code:
// import { describe, it, expect } from 'vitest'
// import { should, assert } from '@mdxe/vitest'
//
// describe('Math Utils', () => {
//   it('Addition', () => {
//     expect(1 + 1).toBe(2)
//   })
// })
```

### `mdxTestPlugin(options?)`

Vitest plugin for running MDX tests.

```typescript
function mdxTestPlugin(options?: ExtractTestsOptions): VitePlugin
```

**Example:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { mdxTestPlugin } from '@mdxe/vitest'

export default defineConfig({
  plugins: [
    mdxTestPlugin({
      languages: ['typescript', 'javascript'],
      marker: 'test'
    })
  ],
  test: {
    include: ['**/*.mdx', '**/*.test.ts']
  }
})
```

### `should(value)`

Create a BDD-style assertion wrapper.

```typescript
function should<T>(value: T): T & { should: ShouldAssertion }

interface ShouldAssertion {
  equal(expected: unknown): void
  deepEqual(expected: unknown): void
  be: {
    true(): void
    false(): void
    null(): void
    undefined(): void
    a(type: string): void
    an(type: string): void
  }
  have: {
    property(name: string, value?: unknown): void
    length(n: number): void
  }
  include(item: unknown): void
  throw(message?: string | RegExp): void
}
```

**Example:**

```typescript
import { should } from '@mdxe/vitest'

const result = should(calculateSum([1, 2, 3]))
result.should.equal(6)

const arr = should([1, 2, 3])
arr.should.have.length(3)
arr.should.include(2)

const obj = should({ name: 'Alice', age: 30 })
obj.should.have.property('name', 'Alice')
obj.should.be.an('object')
```

### `assert(condition, message?)`

Simple assertion function.

```typescript
function assert(condition: unknown, message?: string): asserts condition
```

**Example:**

```typescript
import { assert } from '@mdxe/vitest'

assert(user.isActive, 'User should be active')
assert(items.length > 0, 'Items should not be empty')
```

## Test Block Syntax

### Basic Test

Mark code blocks with `test` to make them runnable:

````mdx
```typescript test
const sum = 1 + 1
sum.should.equal(2)
```
````

### Named Tests

Tests inherit names from the nearest heading:

````mdx
## User Authentication

```typescript test
// This test is named "User Authentication"
const user = await login('alice', 'password')
user.should.have.property('token')
```
````

### Multiple Tests Per Section

````mdx
## Array Operations

```typescript test
// Test 1: push
const arr = [1, 2]
arr.push(3)
arr.should.have.length(3)
```

```typescript test
// Test 2: pop
const arr = [1, 2, 3]
arr.pop().should.equal(3)
```
````

### Async Tests

```typescript test
const response = await fetch('/api/users')
const data = await response.json()

data.should.be.an('array')
data.should.have.length.greaterThan(0)
```

### Setup and Imports

Tests can include imports and setup code:

````mdx
```typescript test
import { createDatabase } from '@mdxdb/sqlite'
import { testData } from './fixtures'

const db = await createDatabase({ url: ':memory:' })
await db.create({ ns: 'test', type: 'User', data: testData })

const users = await db.list({ type: 'User' })
users.should.have.length(1)
```
````

## Assertions Reference

### Equality

```typescript
value.should.equal(expected)       // Strict equality (===)
value.should.deepEqual(expected)   // Deep equality
```

### Type Checks

```typescript
value.should.be.true()
value.should.be.false()
value.should.be.null()
value.should.be.undefined()
value.should.be.a('string')
value.should.be.an('array')
```

### Property Checks

```typescript
obj.should.have.property('name')
obj.should.have.property('age', 30)
arr.should.have.length(3)
```

### Collection Checks

```typescript
arr.should.include(item)
str.should.include('substring')
```

### Error Checks

```typescript
fn.should.throw()
fn.should.throw('error message')
fn.should.throw(/pattern/)
```

## Configuration

### Custom Test Marker

Use a different marker for test blocks:

```typescript
mdxTestPlugin({ marker: 'spec' })
```

````mdx
```typescript spec
// This is now a test block
```
````

### Language Filtering

Only extract tests from specific languages:

```typescript
mdxTestPlugin({
  languages: ['typescript']  // Ignore JavaScript blocks
})
```

## Examples

### API Documentation with Tests

```mdx
---
title: User API
---

# User API

## Create User

`POST /api/users`

Creates a new user account.

\`\`\`typescript test
const response = await fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Alice', email: 'alice@example.com' })
})

response.status.should.equal(201)

const user = await response.json()
user.should.have.property('id')
user.should.have.property('name', 'Alice')
\`\`\`

## Get User

`GET /api/users/:id`

Returns a user by ID.

\`\`\`typescript test
const response = await fetch('/api/users/123')
response.status.should.equal(200)

const user = await response.json()
user.id.should.equal('123')
\`\`\`
```

### Component Documentation

```mdx
---
title: Button Component
---

# Button

A customizable button component.

## Rendering

\`\`\`typescript test
import { render } from '@testing-library/react'
import { Button } from './Button'

const { getByRole } = render(<Button>Click me</Button>)
const button = getByRole('button')

button.textContent.should.equal('Click me')
\`\`\`

## Click Handler

\`\`\`typescript test
import { render, fireEvent } from '@testing-library/react'
import { Button } from './Button'

let clicked = false
const { getByRole } = render(
  <Button onClick={() => { clicked = true }}>Click</Button>
)

fireEvent.click(getByRole('button'))
clicked.should.be.true()
\`\`\`
```

## Integration with CI

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm test  # Runs vitest including MDX tests
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [vitest](https://www.npmjs.com/package/vitest) | Test framework |
| [@mdxe/node](https://www.npmjs.com/package/@mdxe/node) | Node.js MDX evaluation |

## License

MIT

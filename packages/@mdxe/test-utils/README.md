# @mdxe/test-utils

Shared test utilities for MDX packages - fixtures, mocks, and custom vitest matchers.

## Installation

```bash
pnpm add -D @mdxe/test-utils vitest
```

## Usage

### MDX Fixtures

Create test MDX content with various configurations:

```typescript
import { createMDXFixture, FIXTURE_PRESETS } from '@mdxe/test-utils'

// Create custom fixture
const mdx = createMDXFixture({
  frontmatter: {
    $type: 'BlogPost',
    title: 'Test Post',
    author: 'Test Author',
  },
  content: '# Hello World\n\nThis is content.',
  exports: [
    {
      name: 'greet',
      type: 'function',
      body: '(name) => `Hello, ${name}!`',
    },
  ],
  codeBlocks: [
    {
      language: 'ts',
      code: 'expect(1 + 1).toBe(2)',
      meta: 'test name="should add"',
    },
  ],
})

// Use presets
const basicMDX = FIXTURE_PRESETS.basic
const blogPost = FIXTURE_PRESETS.blogPost
const withTests = FIXTURE_PRESETS.withTests
const invalid = FIXTURE_PRESETS.invalidSyntax
```

#### Fixture Helpers

```typescript
import {
  createSimpleMDX,
  createMDXWithFrontmatter,
  createMDXWithExports,
  createMDXWithCodeBlocks,
  createMDXWithComponents,
} from '@mdxe/test-utils'

// Simple content
const simple = createSimpleMDX('# Hello')

// With frontmatter
const withFrontmatter = createMDXWithFrontmatter(
  { title: 'Test', author: 'Me' },
  '# Content'
)

// With exports
const withExports = createMDXWithExports([
  { name: 'add', type: 'function', body: '(a, b) => a + b' },
])
```

### Mock Factories

Create mock Cloudflare Workers resources for testing:

```typescript
import {
  createMockMiniflare,
  createMockKVNamespace,
  createMockD1Database,
  createMockEnv,
  createMockRequest,
  createMockResponse,
} from '@mdxe/test-utils'

// Mock Miniflare instance
const mf = createMockMiniflare({
  kvNamespaces: ['CONTENT', 'CACHE'],
  d1Databases: ['DB'],
  onFetch: (url) => {
    if (url.includes('/api')) {
      return new Response(JSON.stringify({ data: 'test' }))
    }
    return new Response('Not Found', { status: 404 })
  },
})

const response = await mf.dispatchFetch('http://localhost/api')
const kv = mf.getKVNamespace('CONTENT')
await kv.put('key', 'value')

// Mock KV Namespace
const kv = createMockKVNamespace({
  initialData: { existing: 'data' },
})
await kv.put('key', 'value')
const value = await kv.get('key')

// Mock D1 Database
const db = createMockD1Database({
  queryResults: {
    'SELECT * FROM users': [
      { id: 1, name: 'Alice' },
      { id: 2, name: 'Bob' },
    ],
  },
})
const result = await db.prepare('SELECT * FROM users').all()

// Mock environment
const env = createMockEnv({
  kvNamespaces: ['CONTENT'],
  d1Databases: ['DB'],
  bindings: { API_KEY: 'secret' },
  workerLoader: true,
})

// Mock requests/responses
const request = createMockRequest('http://localhost/api', {
  method: 'POST',
  body: { data: 'test' },
  json: true,
})

const response = createMockResponse({ message: 'success' }, { json: true })
```

### Custom Vitest Matchers

Import the matchers to extend vitest's expect:

```typescript
// In your test file or vitest setup
import '@mdxe/test-utils/matchers'

// Now you can use MDX matchers
expect(mdxContent).toBeValidMDX()
expect(mdxContent).toHaveFrontmatter({ title: 'Test' })
expect(mdxContent).toHaveExports(['greet', 'add'])
expect(mdxContent).toHaveDefaultExport()
expect(compiledCode).toBeCompiledMDX()
expect(mdxContent).toHaveCodeBlock('typescript', { contains: 'const' })
```

#### TypeScript Support

Add the type declarations to your `vitest.d.ts` or test setup file:

```typescript
declare module 'vitest' {
  interface Assertion<T> {
    toBeValidMDX(): T
    toHaveFrontmatter(expected: Record<string, unknown>): T
    toHaveExports(expected: string[]): T
    toHaveDefaultExport(): T
    toBeCompiledMDX(): T
    toHaveCodeBlock(language?: string, options?: { contains?: string; meta?: string }): T
    toMatchMDXSnapshot(): T
  }
}
```

### Port Management

Utilities for managing ports in tests to avoid conflicts:

```typescript
import {
  getRandomPort,
  reservePort,
  releasePort,
  createPortRange,
  isPortAvailable,
} from '@mdxe/test-utils'

// Get a random available port
const port = getRandomPort()

// Reserve a specific port
if (reservePort(3000)) {
  // Port 3000 is now reserved
}

// Release when done
releasePort(port)

// Create a range of ports
const range = createPortRange(5) // 5 contiguous ports
const port1 = range.next()
const port2 = range.next()
range.release() // Release all ports in range
```

### Timing Utilities

Utilities for managing timing in tests:

```typescript
import {
  retry,
  sleep,
  waitUntil,
  withTimeout,
  createDeferred,
  measureTime,
} from '@mdxe/test-utils'

// Retry an operation with exponential backoff
const result = await retry(
  async () => {
    const response = await fetch('/api')
    if (!response.ok) throw new Error('Failed')
    return response.json()
  },
  {
    maxAttempts: 3,
    initialDelay: 100,
    exponentialBackoff: true,
  }
)

// Wait for a condition
await waitUntil(() => server.isReady, {
  timeout: 5000,
  interval: 100,
})

// Add timeout to any promise
const data = await withTimeout(
  fetch('/api').then((r) => r.json()),
  5000,
  'API request timed out'
)

// Create a deferred promise for testing async flows
const { promise, resolve, reject } = createDeferred<string>()
// Later...
resolve('done')

// Measure execution time
const { result, duration } = await measureTime(async () => {
  return await expensiveOperation()
})
console.log(`Operation took ${duration}ms`)
```

## API Reference

### Fixtures

| Function | Description |
|----------|-------------|
| `createMDXFixture(options)` | Create MDX with frontmatter, exports, code blocks |
| `createSimpleMDX(content)` | Create simple MDX with just content |
| `createMDXWithFrontmatter(frontmatter, content)` | Create MDX with frontmatter |
| `createMDXWithExports(exports)` | Create MDX with exports |
| `createMDXWithCodeBlocks(blocks)` | Create MDX with code blocks |
| `createMDXWithComponents(components)` | Create MDX with components |
| `FIXTURE_PRESETS` | Pre-built fixtures for common scenarios |

### Mocks

| Function | Description |
|----------|-------------|
| `createMockMiniflare(options)` | Create a mock Miniflare instance |
| `createMockWorkerLoader(options)` | Create a mock worker loader |
| `createMockKVNamespace(options)` | Create a mock KV namespace |
| `createMockD1Database(options)` | Create a mock D1 database |
| `createMockRequest(url, options)` | Create a mock Request |
| `createMockResponse(body, options)` | Create a mock Response |
| `createMockEnv(options)` | Create a mock environment |
| `createMockExecutionContext()` | Create a mock ExecutionContext |
| `createMockCache()` | Create a mock Cache |

### Matchers

| Matcher | Description |
|---------|-------------|
| `toBeValidMDX()` | Assert string is valid MDX |
| `toHaveFrontmatter(expected)` | Assert MDX has expected frontmatter properties |
| `toHaveExports(names)` | Assert MDX has expected exports |
| `toHaveDefaultExport()` | Assert MDX has a default export |
| `toBeCompiledMDX()` | Assert string is compiled MDX code |
| `toHaveCodeBlock(lang?, options?)` | Assert MDX has matching code block |

### Ports

| Function | Description |
|----------|-------------|
| `getRandomPort(options?)` | Get a random available port |
| `reservePort(port)` | Reserve a specific port |
| `releasePort(port)` | Release a reserved port |
| `getRandomPorts(count, options?)` | Get multiple random ports |
| `createPortRange(count, options?)` | Create a contiguous port range |
| `isPortAvailable(port)` | Check if a port is available |
| `releaseAllPorts()` | Release all reserved ports |

### Timing

| Function | Description |
|----------|-------------|
| `retry(operation, options?)` | Retry with exponential backoff |
| `sleep(ms)` | Sleep for specified duration |
| `waitUntil(condition, options?)` | Wait until condition is true |
| `withTimeout(promise, timeout, message?)` | Add timeout to a promise |
| `createDeferred()` | Create a deferred promise |
| `measureTime(operation)` | Measure execution time |
| `debounce(fn, delay)` | Debounce a function |
| `throttle(fn, limit)` | Throttle a function |

## License

MIT

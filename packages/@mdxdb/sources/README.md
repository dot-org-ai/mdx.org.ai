# @mdxdb/sources

External data source adapters for mdxdb. Unified access to REST APIs, GraphQL endpoints, web scraping, JSON-LD, and CSV with built-in caching, retries, and proxy support.

## Installation

```bash
npm install @mdxdb/sources
# or
pnpm add @mdxdb/sources
# or
yarn add @mdxdb/sources
```

## Features

- **Multiple Source Types** - REST, GraphQL, Scraper, JSON-LD, CSV
- **Built-in Caching** - Memory and KV storage with TTL and stale-while-revalidate
- **Proxy Support** - SOCKS5 proxy for web scraping
- **Rate Limiting** - Configurable rate limits per source
- **Retry Logic** - Automatic retries with exponential backoff
- **MDX Integration** - Define sources in YAML frontmatter
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { createRestSource, createGraphQLSource, createScraperSource } from '@mdxdb/sources'

// REST API
const api = createRestSource({
  id: 'my-api',
  baseUrl: 'https://api.example.com',
  cache: { ttl: 60 }
})
const users = await api.get('/users')

// GraphQL
const graphql = createGraphQLSource({
  id: 'github',
  endpoint: 'https://api.github.com/graphql',
  auth: { type: 'bearer', token: process.env.GITHUB_TOKEN }
})
const data = await graphql.query(`{ viewer { login } }`)

// Web Scraper
const scraper = createScraperSource({
  id: 'news',
  baseUrl: 'https://news.ycombinator.com',
  selectors: {
    title: '.storylink',
    score: '.score'
  }
})
const stories = await scraper.scrape('/')
```

## API Reference

### REST Source

#### `createRestSource(config)`

Create a REST API client.

```typescript
function createRestSource(config: RestSourceConfig): RestSource

interface RestSourceConfig {
  type: 'rest'
  id: string
  baseUrl: string
  auth?: AuthConfig
  cache?: CacheConfig
  rateLimit?: RateLimitConfig
  retry?: RetryConfig
  headers?: Record<string, string>
  endpoints?: Record<string, RestEndpointConfig>
}
```

**Example:**

```typescript
import { createRestSource } from '@mdxdb/sources'

const api = createRestSource({
  id: 'my-api',
  baseUrl: 'https://api.example.com/v1',
  auth: {
    type: 'bearer',
    token: process.env.API_TOKEN
  },
  cache: {
    ttl: 300,
    staleWhileRevalidate: 60
  },
  rateLimit: {
    requests: 100,
    period: 60000  // per minute
  },
  retry: {
    maxRetries: 3,
    backoff: 'exponential'
  }
})

// GET request
const users = await api.get('/users')

// POST request
const newUser = await api.post('/users', {
  body: { name: 'Alice', email: 'alice@example.com' }
})

// PUT request
await api.put('/users/123', {
  body: { name: 'Alice Smith' }
})

// DELETE request
await api.delete('/users/123')
```

### GraphQL Source

#### `createGraphQLSource(config)`

Create a GraphQL client.

```typescript
function createGraphQLSource(config: GraphQLSourceConfig): GraphQLSource

interface GraphQLSourceConfig {
  type: 'graphql'
  id: string
  endpoint: string
  auth?: AuthConfig
  cache?: CacheConfig
  headers?: Record<string, string>
  queries?: Record<string, GraphQLQueryConfig>
}
```

**Example:**

```typescript
import { createGraphQLSource, gql } from '@mdxdb/sources'

const github = createGraphQLSource({
  id: 'github',
  endpoint: 'https://api.github.com/graphql',
  auth: {
    type: 'bearer',
    token: process.env.GITHUB_TOKEN
  },
  cache: { ttl: 300 }
})

// Execute query
const result = await github.query(gql`
  query GetUser($login: String!) {
    user(login: $login) {
      name
      bio
      repositories(first: 10) {
        nodes {
          name
          description
        }
      }
    }
  }
`, {
  variables: { login: 'octocat' }
})

// Execute mutation
await github.mutate(gql`
  mutation CreateIssue($input: CreateIssueInput!) {
    createIssue(input: $input) {
      issue {
        id
        title
      }
    }
  }
`, {
  variables: { input: { repositoryId: '...', title: 'Bug report' } }
})
```

### Scraper Source

#### `createScraperSource(config)`

Create a web scraper.

```typescript
function createScraperSource(config: ScraperSourceConfig): ScraperSource

interface ScraperSourceConfig {
  type: 'scraper'
  id: string
  baseUrl: string
  selectors: Record<string, SelectorConfig | string>
  proxy?: ProxyConfig
  cache?: CacheConfig
  rateLimit?: RateLimitConfig
  pages?: Record<string, PageConfig>
}

interface SelectorConfig {
  selector: string
  attribute?: string  // Extract attribute instead of text
  multiple?: boolean  // Get all matches
  transform?: string | ((value: string) => unknown)
}
```

**Example:**

```typescript
import { createScraperSource, select, transforms } from '@mdxdb/sources'

const scraper = createScraperSource({
  id: 'hacker-news',
  baseUrl: 'https://news.ycombinator.com',
  selectors: {
    // Simple selector (text content)
    title: '.storylink',

    // Extract attribute
    link: { selector: '.storylink', attribute: 'href' },

    // Multiple elements
    scores: { selector: '.score', multiple: true },

    // With transform
    points: {
      selector: '.score',
      transform: transforms.number
    }
  },
  cache: { ttl: 60 },
  rateLimit: { requests: 10, period: 60000 }
})

// Scrape page
const data = await scraper.scrape('/')

// Scrape with custom selectors
const custom = await scraper.scrape('/newest', {
  selectors: {
    items: { selector: '.athing', multiple: true }
  }
})
```

#### Built-in Transforms

```typescript
import { transforms } from '@mdxdb/sources'

// Number parsing
transforms.number('42')      // 42
transforms.number('$1,234')  // 1234

// Date parsing
transforms.date('2024-01-15')

// Boolean
transforms.boolean('yes')    // true
transforms.boolean('false')  // false

// JSON
transforms.json('{"key": "value"}')

// Trim whitespace
transforms.trim('  hello  ')  // 'hello'
```

### JSON-LD Source

#### `createJSONLDSource(config)`

Create a JSON-LD client for Linked Data APIs.

```typescript
function createJSONLDSource(config: JSONLDSourceConfig): JSONLDSource

interface JSONLDSourceConfig {
  type: 'jsonld'
  id: string
  baseUrl: string
  context?: string | Record<string, unknown>
  auth?: AuthConfig
  cache?: CacheConfig
  endpoints?: Record<string, JSONLDEndpointConfig>
}
```

**Example:**

```typescript
import { createJSONLDSource, jsonldToMDXLD } from '@mdxdb/sources'

const source = createJSONLDSource({
  id: 'schema-org',
  baseUrl: 'https://schema.org',
  context: 'https://schema.org'
})

// Fetch JSON-LD
const data = await source.get('/Person/example')

// Convert to MDXLD document
const doc = jsonldToMDXLD(data)
```

#### JSON-LD Utilities

```typescript
import {
  jsonldToMDXLD,
  mdxldToJSONLD,
  extractJSONLD,
  validateJSONLD
} from '@mdxdb/sources'

// Convert JSON-LD to MDXLD document
const doc = jsonldToMDXLD({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'John Doe'
})

// Convert MDXLD to JSON-LD
const jsonld = mdxldToJSONLD(doc)

// Extract JSON-LD from HTML
const extracted = extractJSONLD('<script type="application/ld+json">...</script>')

// Validate JSON-LD
const result = validateJSONLD(data, { context: 'https://schema.org' })
```

### CSV Source

#### `createCSVSource(config)`

Create a CSV data source.

```typescript
function createCSVSource(config: CSVSourceConfig): CSVSource

interface CSVSourceConfig {
  type: 'csv'
  id: string
  url?: string
  delimiter?: string
  columns?: CSVColumnConfig[]
  headers?: boolean
}

interface CSVColumnConfig {
  name: string
  type?: 'string' | 'number' | 'boolean' | 'date'
  transform?: (value: string) => unknown
}
```

**Example:**

```typescript
import { createCSVSource, csvToMDXLD } from '@mdxdb/sources'

const csv = createCSVSource({
  id: 'users-csv',
  url: 'https://example.com/users.csv',
  columns: [
    { name: 'id', type: 'number' },
    { name: 'name', type: 'string' },
    { name: 'active', type: 'boolean' },
    { name: 'createdAt', type: 'date' }
  ]
})

// Parse remote CSV
const rows = await csv.fetch()

// Parse CSV string
import { parseCSV } from '@mdxdb/sources'
const data = parseCSV('name,age\nAlice,30\nBob,25')

// Convert to MDXLD documents
const docs = csvToMDXLD(data, {
  type: 'User',
  idColumn: 'id'
})
```

### Source Factory

#### `createSource(config)`

Create any source type from configuration.

```typescript
import { createSource } from '@mdxdb/sources'

const source = createSource({
  type: 'rest',
  id: 'my-api',
  baseUrl: 'https://api.example.com'
})
```

### Source Registry

Manage multiple sources.

```typescript
import { SourceRegistry, sources } from '@mdxdb/sources'

// Use default registry
sources.register({
  type: 'rest',
  id: 'api',
  baseUrl: 'https://api.example.com'
})

const api = sources.get('api')

// Create custom registry
const registry = new SourceRegistry()

registry.register({ type: 'rest', id: 'api1', baseUrl: '...' })
registry.register({ type: 'graphql', id: 'api2', endpoint: '...' })

// Get source
const api1 = registry.get('api1')

// List sources
const ids = registry.list()  // ['api1', 'api2']

// Invalidate cache across all sources
await registry.invalidateCache()
```

## Configuration

### Authentication

```typescript
interface AuthConfig {
  type: 'basic' | 'bearer' | 'api-key' | 'oauth2'
  // Basic auth
  username?: string
  password?: string
  // Bearer token
  token?: string
  // API key
  key?: string
  header?: string  // Header name (default: 'X-API-Key')
  query?: string   // Query parameter name
  // OAuth2
  clientId?: string
  clientSecret?: string
  tokenUrl?: string
}
```

### Caching

```typescript
interface CacheConfig {
  ttl?: number                  // Time to live in seconds
  staleWhileRevalidate?: number // Serve stale while fetching fresh
  storage?: 'memory' | 'kv'     // Storage backend
  tags?: string[]               // Cache tags for invalidation
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  requests: number   // Number of requests
  period: number     // Period in milliseconds
  retryAfter?: number // Retry delay when limited
}
```

### Retry

```typescript
interface RetryConfig {
  maxRetries?: number           // Max retry attempts (default: 3)
  backoff?: 'fixed' | 'exponential'  // Backoff strategy
  delay?: number                // Initial delay in ms
  maxDelay?: number             // Maximum delay cap
  retryOn?: number[]            // HTTP status codes to retry
}
```

### Proxy

```typescript
interface ProxyConfig {
  type: 'socks5'
  host: string
  port: number
  auth?: {
    username: string
    password: string
  }
}
```

## MDX Frontmatter Definition

Define sources directly in MDX frontmatter:

```yaml
---
$type: RestSource
$id: https://api.example.com
baseUrl: https://api.example.com/v1
auth:
  type: bearer
  token: ${env.API_TOKEN}
cache:
  ttl: 300
  staleWhileRevalidate: 60
---

# API Source

This source provides access to the Example API.
```

Parse source definitions:

```typescript
import { parseSourceDefinition } from '@mdxdb/sources'

const config = parseSourceDefinition(doc.data)
if (config) {
  const source = createSource(config)
}
```

## Define Helpers

Type-safe source definition:

```typescript
import {
  defineRestSource,
  defineGraphQLSource,
  defineScraperSource,
  defineJSONLDSource,
  defineCSVSource
} from '@mdxdb/sources'

const api = defineRestSource({
  id: 'my-api',
  baseUrl: 'https://api.example.com'
})

const graphql = defineGraphQLSource({
  id: 'github',
  endpoint: 'https://api.github.com/graphql'
})
```

## Examples

### Multi-Source Data Pipeline

```typescript
import { SourceRegistry } from '@mdxdb/sources'

const sources = new SourceRegistry()

// Register sources
sources.register({
  type: 'rest',
  id: 'users-api',
  baseUrl: 'https://api.example.com/users'
})

sources.register({
  type: 'graphql',
  id: 'analytics',
  endpoint: 'https://analytics.example.com/graphql'
})

// Fetch and combine data
async function getUsersWithAnalytics() {
  const usersApi = sources.get('users-api')
  const analyticsGql = sources.get('analytics')

  const users = await usersApi.get('/')
  const analytics = await analyticsGql.query(`
    query { userMetrics { userId views clicks } }
  `)

  return users.map(user => ({
    ...user,
    metrics: analytics.userMetrics.find(m => m.userId === user.id)
  }))
}
```

### Cached API with Stale-While-Revalidate

```typescript
import { createRestSource } from '@mdxdb/sources'

const api = createRestSource({
  id: 'news-api',
  baseUrl: 'https://newsapi.org/v2',
  auth: {
    type: 'api-key',
    key: process.env.NEWS_API_KEY,
    query: 'apiKey'
  },
  cache: {
    ttl: 300,                 // 5 minutes
    staleWhileRevalidate: 60  // Serve stale for 1 minute while refreshing
  }
})

// First call fetches from API
const news1 = await api.get('/top-headlines', { params: { country: 'us' } })

// Second call within TTL returns cached
const news2 = await api.get('/top-headlines', { params: { country: 'us' } })

// After TTL but within SWR, returns stale immediately and refreshes in background
```

### Web Scraping with Proxy

```typescript
import { createScraperSource } from '@mdxdb/sources'

const scraper = createScraperSource({
  id: 'protected-site',
  baseUrl: 'https://example.com',
  proxy: {
    type: 'socks5',
    host: 'proxy.example.com',
    port: 1080,
    auth: {
      username: process.env.PROXY_USER,
      password: process.env.PROXY_PASS
    }
  },
  selectors: {
    title: 'h1',
    content: '.article-body',
    images: { selector: 'img', attribute: 'src', multiple: true }
  },
  rateLimit: {
    requests: 5,
    period: 60000
  }
})

const page = await scraper.scrape('/article/123')
```

## Types

### Source Types

```typescript
type SourceConfig =
  | RestSourceConfig
  | GraphQLSourceConfig
  | ScraperSourceConfig
  | JSONLDSourceConfig
  | CSVSourceConfig
```

### Request/Response

```typescript
interface SourceRequest {
  url: string
  method: string
  headers?: Record<string, string>
  body?: unknown
  params?: Record<string, string>
}

interface SourceResponse<T = unknown> {
  data: T
  status: number
  headers: Record<string, string>
  cached?: boolean
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxdb](https://www.npmjs.com/package/mdxdb) | Database abstraction layer |
| [@mdxdb/api](https://www.npmjs.com/package/@mdxdb/api) | REST API server |
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |

## License

MIT

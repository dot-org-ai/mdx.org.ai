# @mdxld/yaml

Bi-directional conversion between Objects and YAML. Perfect for config files, Kubernetes manifests, CI/CD pipelines.

## Installation

```bash
pnpm add @mdxld/yaml
```

## Overview

```typescript
import { toYAML, fromYAML } from '@mdxld/yaml'

// Object → YAML
const yaml = toYAML(config)

// YAML → Object
const config = fromYAML<Config>(yaml)
```

## API

### toYAML(object, options?)

Convert an object to YAML string.

```typescript
function toYAML<T>(
  object: T,
  options?: ToYAMLOptions
): string

interface ToYAMLOptions {
  indent?: number           // Indentation spaces (default: 2)
  flowLevel?: number        // Flow style nesting level (-1 = block)
  sortKeys?: boolean        // Sort object keys alphabetically
  lineWidth?: number        // Max line width (default: 80)
  noRefs?: boolean          // Disable anchor/alias refs
  quotingType?: '"' | "'"   // String quoting style
  forceQuotes?: boolean     // Quote all strings
}
```

**Example:**

```typescript
const config = {
  name: 'my-app',
  version: '1.0.0',
  database: {
    host: 'localhost',
    port: 5432,
    credentials: {
      username: 'admin',
      password: 'secret'
    }
  },
  features: ['auth', 'api', 'dashboard']
}

const yaml = toYAML(config)
```

**Output:**

```yaml
name: my-app
version: 1.0.0
database:
  host: localhost
  port: 5432
  credentials:
    username: admin
    password: secret
features:
  - auth
  - api
  - dashboard
```

### fromYAML(yaml, options?)

Parse YAML string to object.

```typescript
function fromYAML<T>(
  yaml: string,
  options?: FromYAMLOptions
): T

interface FromYAMLOptions {
  schema?: 'core' | 'json' | 'failsafe'  // YAML schema
  strict?: boolean                        // Strict parsing
}
```

**Example:**

```typescript
const yaml = `
name: my-app
replicas: 3
env:
  NODE_ENV: production
  DEBUG: false
`

const config = fromYAML<AppConfig>(yaml)
// { name: 'my-app', replicas: 3, env: { NODE_ENV: 'production', DEBUG: false } }
```

### Multi-Document Support

```typescript
import { toYAMLDocuments, fromYAMLDocuments } from '@mdxld/yaml'

// Multiple documents in one file
const docs = [
  { kind: 'Deployment', metadata: { name: 'app' } },
  { kind: 'Service', metadata: { name: 'app-svc' } }
]

const yaml = toYAMLDocuments(docs)
```

**Output:**

```yaml
---
kind: Deployment
metadata:
  name: app
---
kind: Service
metadata:
  name: app-svc
```

## Use Cases

### Kubernetes Manifests

```typescript
const deployment = {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'my-app',
    labels: { app: 'my-app' }
  },
  spec: {
    replicas: 3,
    selector: {
      matchLabels: { app: 'my-app' }
    },
    template: {
      metadata: {
        labels: { app: 'my-app' }
      },
      spec: {
        containers: [{
          name: 'app',
          image: 'my-app:latest',
          ports: [{ containerPort: 3000 }]
        }]
      }
    }
  }
}

const manifest = toYAML(deployment)
await Bun.write('deployment.yaml', manifest)
```

### GitHub Actions

```typescript
const workflow = {
  name: 'CI',
  on: {
    push: { branches: ['main'] },
    pull_request: { branches: ['main'] }
  },
  jobs: {
    build: {
      'runs-on': 'ubuntu-latest',
      steps: [
        { uses: 'actions/checkout@v4' },
        { uses: 'actions/setup-node@v4', with: { 'node-version': '20' } },
        { run: 'npm ci' },
        { run: 'npm test' }
      ]
    }
  }
}

const yaml = toYAML(workflow)
await Bun.write('.github/workflows/ci.yml', yaml)
```

### Docker Compose

```typescript
const compose = {
  version: '3.8',
  services: {
    web: {
      build: '.',
      ports: ['3000:3000'],
      environment: {
        DATABASE_URL: 'postgres://db:5432/app'
      },
      depends_on: ['db']
    },
    db: {
      image: 'postgres:15',
      volumes: ['db-data:/var/lib/postgresql/data'],
      environment: {
        POSTGRES_DB: 'app',
        POSTGRES_PASSWORD: 'secret'
      }
    }
  },
  volumes: {
    'db-data': {}
  }
}

const yaml = toYAML(compose)
```

### Configuration Files

```typescript
// Read, modify, write config
const configYaml = await Bun.file('config.yaml').text()
const config = fromYAML<AppConfig>(configYaml)

config.database.pool.max = 20
config.features.push('new-feature')

await Bun.write('config.yaml', toYAML(config))
```

## YAML-LD Integration

Convert between YAML-LD (MDXLD frontmatter) and JSON-LD:

```typescript
import { toYAML, fromYAML } from '@mdxld/yaml'
import { toJSONLD } from '@mdxld/json'

// YAML-LD frontmatter
const yamlld = `
$type: BlogPost
$id: https://example.com/posts/hello
title: Hello World
author:
  $type: Person
  name: Jane Doe
`

// Parse YAML-LD
const doc = fromYAML(yamlld)

// Convert to JSON-LD
const jsonld = toJSONLD(doc)
// { "@type": "BlogPost", "@id": "...", "title": "...", "author": { "@type": "Person", ... } }
```

## Streaming

For large files:

```typescript
import { createYAMLStream } from '@mdxld/yaml'

const stream = createYAMLStream()

for await (const doc of stream.parse(fileStream)) {
  console.log(doc)
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [`@mdxld/json`](../json) | JSON / JSON-LD / JSON Schema |
| [`@mdxld/typescript`](../typescript) | TypeScript types / Zod / JSON5 |
| [`@mdxld/markdown`](../markdown) | Markdown output |
| [`mdxld`](../../mdxld) | Core MDXLD parser (uses YAML frontmatter) |

## License

MIT

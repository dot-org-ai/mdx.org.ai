# @mdxld/config

Shared TypeScript and ESLint configurations for the MDXLD monorepo.

> **Note:** This is a private package used internally by the mdx.org.ai monorepo.

## Features

- **TypeScript Configs** - Base, library, and React configurations
- **ESLint Configs** - Base and React ESLint rules
- **Strict Mode** - Opinionated strict TypeScript settings
- **Modern ESM** - ES2022 target with ESM module resolution

## TypeScript Configurations

### Base Configuration

The base configuration for all packages:

```json
{
  "extends": "@mdxld/config/typescript/base"
}
```

Features:
- ES2022 target
- ESNext module format
- Bundler module resolution
- Strict mode enabled
- Source maps and declarations

### Library Configuration

For packages published to npm:

```json
{
  "extends": "@mdxld/config/typescript/library"
}
```

Adds:
- Declaration output
- Declaration maps
- Optimized for package publishing

### React Configuration

For React/Next.js packages:

```json
{
  "extends": "@mdxld/config/typescript/react"
}
```

Adds:
- JSX support with react-jsx transform
- DOM lib types
- React-specific settings

## ESLint Configurations

### Base Configuration

```javascript
// eslint.config.js
import config from '@mdxld/config/eslint'

export default config
```

Or import specific parts:

```javascript
import { base, ignores } from '@mdxld/config/eslint/base'

export default [
  ...base,
  // your custom rules
]
```

Features:
- ESLint recommended rules
- TypeScript ESLint recommended
- Unused vars with underscore ignore
- Consistent type imports
- Standard ignores (dist, node_modules, etc.)

### React Configuration

```javascript
import config from '@mdxld/config/eslint/react'

export default config
```

Adds:
- React hooks rules
- JSX accessibility rules
- React-specific best practices

## Configuration Details

### TypeScript Base Settings

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### ESLint Rules

```javascript
{
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports'
    }],
    '@typescript-eslint/no-explicit-any': 'warn'
  }
}
```

### Ignored Paths

```javascript
{
  ignores: [
    '**/dist/**',
    '**/node_modules/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/.next/**'
  ]
}
```

## Usage in Packages

### package.json

```json
{
  "devDependencies": {
    "@mdxld/config": "workspace:^"
  }
}
```

### tsconfig.json

```json
{
  "extends": "@mdxld/config/typescript/library",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

### eslint.config.js

```javascript
import config from '@mdxld/config/eslint'

export default [
  ...config,
  {
    // package-specific overrides
  }
]
```

## Exports

```javascript
// TypeScript configs
import '@mdxld/config/typescript'          // base.json
import '@mdxld/config/typescript/base'     // base.json
import '@mdxld/config/typescript/library'  // library.json
import '@mdxld/config/typescript/react'    // react.json

// ESLint configs
import config from '@mdxld/config/eslint'       // full config
import { base } from '@mdxld/config/eslint/base'    // base rules
import react from '@mdxld/config/eslint/react' // react rules
```

## Related Packages

| Package | Description |
|---------|-------------|
| [typescript](https://www.typescriptlang.org/) | TypeScript compiler |
| [eslint](https://eslint.org/) | JavaScript linter |
| [typescript-eslint](https://typescript-eslint.io/) | TypeScript ESLint |

## License

MIT

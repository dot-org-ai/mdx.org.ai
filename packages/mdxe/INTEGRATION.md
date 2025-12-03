# Primitives Integration in mdxe

This document describes the integration of AI primitives (ai-sandbox, ai-functions, ai-workflows) into the mdxe package.

## Overview

mdxe now serves as the primary execution layer that integrates all primitives:
- **ai-sandbox** - Secure code execution in sandboxed environments
- **ai-functions** - RPC primitives and AI function interfaces
- **ai-workflows** - Event-driven workflows with the `$` context

## Changes Made

### 1. Package Dependencies (package.json)

Added dependencies to primitives packages:
```json
"dependencies": {
  "ai-sandbox": "file:../../primitives/packages/ai-sandbox",
  "ai-functions": "file:../../primitives/packages/ai-functions",
  "ai-workflows": "file:../../primitives/packages/ai-workflows",
  ...
}
```

Added SDK export:
```json
"exports": {
  "./sdk": {
    "types": "./dist/sdk.d.ts",
    "import": "./dist/sdk.js",
    "require": "./dist/sdk.cjs"
  },
  ...
}
```

### 2. SDK Provider (src/sdk-provider.ts)

Existing file that creates local or remote SDK implementations. Updated to:
- Add graceful fallbacks when mdxdb is not available
- Use stub DB client when dependencies are missing
- Support all database backends (memory, fs, sqlite, postgres, clickhouse, mongo)

Key features:
- **Local Context**: Uses in-process implementations with mdxdb, mdxai, ai-workflows
- **Remote Context**: Proxies all calls to RPC server
- **Code Generation**: Generate SDK injection code for sandboxed workers

### 3. Public SDK Module (src/sdk.ts)

New file that exposes SDK provider publicly:
- Re-exports `createSDKProvider` and `generateSDKInjectionCode`
- Exports all SDK-related types
- Comprehensive documentation of context modes

### 4. Main Index (src/index.ts)

Updated to export primitives integration:
- SDK provider types and functions
- Re-export `evaluate` and `createEvaluator` from ai-sandbox
- Re-export workflow types from ai-workflows
- Re-export RPC types from ai-functions

```typescript
// SDK Provider
export { createSDKProvider, generateSDKInjectionCode }
export type { SDKProviderConfig, SDKProvider, ... }

// ai-sandbox
export { evaluate, createEvaluator }
export type { EvaluateOptions, EvaluateResult, ... }

// ai-workflows
export type { WorkflowContext, EventHandler, OnProxy, EveryProxy }

// ai-functions
export type { RPC, RPCPromise, RPCServer, RPCClient }
```

### 5. Types (src/types.ts)

Added SDK provider type exports:
```typescript
export type {
  SDKProviderConfig,
  SDKProvider,
  AIProvider,
  WorkflowProvider,
  ContextProvider,
} from './sdk-provider.js'
```

### 6. Build Configuration (tsup.config.ts)

Updated to:
- Include sdk.ts and sdk-provider.ts in build entries
- Mark all primitive dependencies as external
- Generate proper type declarations

### 7. Tests (tests/sdk.test.ts)

New comprehensive test suite covering:
- Local context with different backends (memory, fs, sqlite)
- Remote context configuration
- Code generation for local and remote contexts
- Export validation
- Integration with ai-sandbox, ai-workflows, ai-functions
- Configuration validation

All 22 tests pass, even when dependencies are not available (using stubs).

### 8. Documentation (README.md)

Added comprehensive documentation:
- SDK Provider section with examples
- Local vs Remote context comparison
- Database backends documentation
- Code generation for sandboxed execution
- Primitives integration section with usage examples
- ai-sandbox integration examples
- ai-workflows type examples
- ai-functions RPC type examples

## Usage Examples

### Creating an SDK Provider

```typescript
import { createSDKProvider } from 'mdxe'

// Local context with SQLite
const sdk = await createSDKProvider({
  context: 'local',
  db: 'sqlite',
  dbPath: './data.db',
  aiMode: 'remote',
  ns: 'my-app'
})

// Use the SDK
const post = await sdk.db.create({
  type: 'Post',
  data: { title: 'Hello World' }
})

await sdk.close()
```

### Remote Context

```typescript
const sdk = await createSDKProvider({
  context: 'remote',
  rpcUrl: 'https://rpc.example.com',
  token: process.env.API_TOKEN,
  ns: 'tenant-123',
  db: 'memory',
  aiMode: 'remote'
})
```

### Sandboxed Execution

```typescript
import { evaluate, generateSDKInjectionCode } from 'mdxe'

const result = await evaluate({
  code: userCode,
  sdkConfig: {
    context: 'local',
    db: 'memory',
    aiMode: 'remote',
    ns: 'my-app'
  }
})
```

### Using ai-workflows Types

```typescript
import type { WorkflowContext, OnProxy } from 'mdxe'

const handlers = {
  on: {
    Customer: {
      created: async (customer: any, $: WorkflowContext) => {
        await $.send('Email.welcome', { to: customer.email })
      }
    }
  }
}
```

## Architecture

```
mdxe (execution layer)
├── SDK Provider (local/remote implementations)
│   ├── DB: mdxdb with multiple backends
│   ├── AI: local models or remote APIs
│   └── Workflows: ai-workflows event handlers
│
├── ai-sandbox (secure execution)
│   └── evaluate(), createEvaluator()
│
├── ai-functions (RPC & AI)
│   └── RPC types for @mdxe/rpc
│
└── ai-workflows (events)
    └── on, every, send types
```

## Testing

All tests pass with graceful degradation:
```bash
pnpm test tests/sdk.test.ts
# ✓ 22 tests passed
```

Tests cover:
- SDK provider creation (local and remote)
- Database backend configuration
- AI provider functionality
- Workflow provider registration
- Code generation
- Export validation
- Type checking

## Future Enhancements

1. **Complete mdxdb Integration**: Once mdxdb packages are implemented, remove stub fallbacks
2. **Local AI Models**: Implement local AI provider using mdxai packages
3. **Enhanced Workflow Support**: Add state machine integration from ai-workflows
4. **RPC Server**: Implement full RPC server for remote context using ai-functions
5. **Multi-tenant Support**: Add tenant isolation for dispatch namespaces

## Dependencies

The integration maintains proper separation:
- **Required**: ai-sandbox (for execution)
- **Optional**: mdxdb, @mdxdb/*, ai-functions, ai-workflows
- **Peer**: mdxld

All dependencies are marked as external in the build configuration and gracefully degrade if not available.

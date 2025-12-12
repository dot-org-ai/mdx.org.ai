import { describe, it, expect } from 'vitest'

/**
 * Main entry point tests - verifying exports are accessible
 * Detailed tests for each module are in their respective test files:
 * - cli/cli.test.ts
 * - runner/runner.test.ts
 * - auth/auth.test.ts
 * - client/client.test.ts
 * - client/hooks.test.ts
 * - components/components.test.tsx
 */
describe('@mdxai/code exports', () => {
  it('should export types', async () => {
    const types = await import('./types.js')

    // Type exports are compile-time only, but we can check the module loads
    expect(types).toBeDefined()
  })

  it('should export runner functions', async () => {
    const runner = await import('./runner/index.js')

    expect(runner.spawnClaude).toBeTypeOf('function')
    expect(runner.parseStreamJson).toBeTypeOf('function')
    expect(runner.parseStreamLines).toBeTypeOf('function')
    expect(runner.EventReporter).toBeTypeOf('function')
  })

  it('should export auth functions', async () => {
    const auth = await import('./auth/index.js')

    expect(auth.getAuthToken).toBeTypeOf('function')
    expect(auth.authHeaders).toBeTypeOf('function')
    expect(auth.storeToken).toBeTypeOf('function')
    expect(auth.loadToken).toBeTypeOf('function')
    expect(auth.isTokenExpired).toBeTypeOf('function')
    expect(auth.clearToken).toBeTypeOf('function')
    expect(auth.login).toBeTypeOf('function')
    expect(auth.logout).toBeTypeOf('function')
  })

  it('should export client classes and hooks', async () => {
    const client = await import('./client/index.js')

    expect(client.ApiClient).toBeTypeOf('function')
    expect(client.SessionClient).toBeTypeOf('function')
    expect(client.useSession).toBeTypeOf('function')
    expect(client.useSessionEvents).toBeTypeOf('function')
    expect(client.useSessionWithEvents).toBeTypeOf('function')
  })

  it('should export components', async () => {
    const components = await import('./components/index.js')

    expect(components.SessionCard).toBeTypeOf('function')
    expect(components.SessionDashboard).toBeTypeOf('function')
    expect(components.TodoList).toBeTypeOf('function')
    expect(components.ToolHistory).toBeTypeOf('function')
  })
})

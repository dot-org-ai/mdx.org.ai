/**
 * Worker integration tests
 *
 * Tests for the main Worker entry point
 */

import { describe, it, expect } from 'vitest'

describe('Worker', () => {
  it('should export SessionDO', async () => {
    const { SessionDO } = await import('./session-do')
    expect(SessionDO).toBeDefined()
  })

  it('should export types', async () => {
    const types = await import('./types')
    expect(types).toBeDefined()
  })
})

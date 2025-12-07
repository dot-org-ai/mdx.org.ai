import { describe, it, expect } from 'vitest'

describe('module', () => {
  it('loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

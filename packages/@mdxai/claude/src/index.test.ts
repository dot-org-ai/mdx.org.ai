import { describe, it, expect } from 'vitest'

describe('@mdxai/claude', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

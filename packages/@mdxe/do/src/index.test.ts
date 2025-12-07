import { describe, it, expect } from 'vitest'

describe('@mdxe/do', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

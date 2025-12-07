import { describe, it, expect } from 'vitest'

describe('@mdxld/ast', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

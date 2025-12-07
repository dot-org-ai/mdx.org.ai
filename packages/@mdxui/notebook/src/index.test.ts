import { describe, it, expect } from 'vitest'

describe('@mdxui/notebook', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })
})

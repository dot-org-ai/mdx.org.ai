import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxe/isolate', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxe/isolate')
  })
})

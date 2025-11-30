import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxe/node', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxe/node')
  })
})

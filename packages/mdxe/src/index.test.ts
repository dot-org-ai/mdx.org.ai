import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('mdxe', () => {
  it('exports package name', () => {
    expect(name).toBe('mdxe')
  })
})

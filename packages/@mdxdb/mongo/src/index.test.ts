import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxdb/mongo', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxdb/mongo')
  })
})

import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxdb/postgres', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxdb/postgres')
  })
})

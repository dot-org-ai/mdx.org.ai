import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxui/json', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxui/json')
  })
})

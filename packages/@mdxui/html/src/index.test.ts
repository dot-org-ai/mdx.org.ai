import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxui/html', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxui/html')
  })
})

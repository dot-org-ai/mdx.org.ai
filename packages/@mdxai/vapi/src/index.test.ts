import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxai/vapi', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxai/vapi')
  })
})

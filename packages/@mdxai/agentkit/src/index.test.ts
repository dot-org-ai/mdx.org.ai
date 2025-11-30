import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxai/agentkit', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxai/agentkit')
  })
})

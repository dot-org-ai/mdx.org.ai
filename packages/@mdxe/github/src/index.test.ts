import { describe, it, expect } from 'vitest'
import { setupPagesActions, generatePagesWorkflow } from './index.js'

describe('@mdxe/github', () => {
  it('exports setupPagesActions', () => {
    expect(typeof setupPagesActions).toBe('function')
  })

  it('exports generatePagesWorkflow', () => {
    expect(typeof generatePagesWorkflow).toBe('function')
  })
})

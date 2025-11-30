import { describe, it, expect } from 'vitest'
import { name, createApiClient } from './index.js'

describe('mdxdb', () => {
  it('exports package name', () => {
    expect(name).toBe('mdxdb')
  })

  it('exports createApiClient function', () => {
    expect(typeof createApiClient).toBe('function')
  })
})

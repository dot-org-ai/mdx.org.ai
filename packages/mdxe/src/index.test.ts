import { describe, it, expect } from 'vitest'
import { name } from './index.js'
import { VERSION } from './cli.js'

describe('mdxe', () => {
  it('exports package name', () => {
    expect(name).toBe('mdxe')
  })

  it('VERSION is not hardcoded 0.0.0', () => {
    expect(VERSION).not.toBe('0.0.0')
  })

  it('VERSION matches package.json version', async () => {
    const pkg = await import('../package.json', { with: { type: 'json' } })
    expect(VERSION).toBe(pkg.default.version)
  })
})

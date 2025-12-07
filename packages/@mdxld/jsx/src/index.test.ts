import { describe, it, expect } from 'vitest'
import { compileMDX, JSX_PRESETS } from './index.js'

describe('@mdxld/jsx', () => {
  it('exports compileMDX', () => {
    expect(typeof compileMDX).toBe('function')
  })

  it('exports JSX_PRESETS', () => {
    expect(JSX_PRESETS).toBeDefined()
    expect(JSX_PRESETS.hono).toBeDefined()
    expect(JSX_PRESETS.react).toBeDefined()
    expect(JSX_PRESETS.preact).toBeDefined()
  })

  it('compiles basic MDX', async () => {
    const result = await compileMDX('# Hello')
    expect(result.code).toContain('Hello')
  })
})

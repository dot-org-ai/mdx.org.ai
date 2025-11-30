import { describe, it, expect } from 'vitest'
import { name } from './index.js'

describe('@mdxdb/clickhouse', () => {
  it('exports package name', () => {
    expect(name).toBe('@mdxdb/clickhouse')
  })
})

import { describe, it, expect } from 'vitest'
import {
  parseTypeScriptESM,
  extractTypeInfo,
  hasTypeScriptImportExport,
} from './typescript.js'

describe('parseTypeScriptESM', () => {
  describe('type-only imports', () => {
    it('should parse import type statement', () => {
      const result = parseTypeScriptESM(`import type { Foo } from './types'`)

      expect(result.imports).toHaveLength(1)
      expect(result.imports[0]!.source).toBe('./types')
      expect(result.imports[0]!.isTypeOnly).toBe(true)
      expect(result.imports[0]!.specifiers).toHaveLength(1)
      expect(result.imports[0]!.specifiers[0]).toEqual({
        name: 'Foo',
        alias: undefined,
        isType: true,
      })
      expect(result.strippedContent.trim()).toBe('')
      expect(result.hasTypeScript).toBe(true)
    })

    it('should parse inline type imports', () => {
      const result = parseTypeScriptESM(`import { type Foo, Bar } from './utils'`)

      expect(result.imports).toHaveLength(1)
      expect(result.imports[0]!.isTypeOnly).toBe(false)
      expect(result.imports[0]!.specifiers).toHaveLength(2)
      expect(result.imports[0]!.specifiers[0]).toEqual({
        name: 'Foo',
        alias: undefined,
        isType: true,
      })
      expect(result.imports[0]!.specifiers[1]).toEqual({
        name: 'Bar',
        alias: undefined,
        isType: false,
      })
      expect(result.strippedContent).toContain('Bar')
      expect(result.strippedContent).not.toContain('type Foo')
    })

    it('should parse multiple type imports', () => {
      const result = parseTypeScriptESM(`
        import type { Foo, Bar } from './types'
        import { type Baz, qux } from './utils'
      `)

      expect(result.imports).toHaveLength(2)
      expect(result.hasTypeScript).toBe(true)
    })
  })

  describe('regular imports', () => {
    it('should preserve regular imports', () => {
      const result = parseTypeScriptESM(`import { foo } from './utils'`)

      expect(result.imports).toHaveLength(1)
      expect(result.imports[0]!.isTypeOnly).toBe(false)
      expect(result.imports[0]!.specifiers[0]!.isType).toBe(false)
      expect(result.strippedContent.trim()).toBe(`import { foo } from './utils'`)
      expect(result.hasTypeScript).toBe(false)
    })

    it('should handle default imports', () => {
      const result = parseTypeScriptESM(`import React from 'react'`)

      expect(result.imports).toHaveLength(1)
      expect(result.imports[0]!.specifiers[0]).toEqual({
        name: 'default',
        alias: 'React',
        isType: false,
      })
    })

    it('should handle namespace imports', () => {
      const result = parseTypeScriptESM(`import * as React from 'react'`)

      expect(result.imports[0]!.specifiers[0]).toEqual({
        name: '*',
        alias: 'React',
        isType: false,
      })
    })

    it('should handle aliased imports', () => {
      const result = parseTypeScriptESM(`import { foo as bar } from './utils'`)

      expect(result.imports[0]!.specifiers[0]).toEqual({
        name: 'foo',
        alias: 'bar',
        isType: false,
      })
    })
  })

  describe('type-only exports', () => {
    it('should parse export type statement', () => {
      const result = parseTypeScriptESM(`export type { Foo }`)

      expect(result.exports).toHaveLength(1)
      expect(result.exports[0]!.isTypeOnly).toBe(true)
      expect(result.exports[0]!.specifiers[0]).toEqual({
        name: 'Foo',
        localName: undefined,
        isType: true,
      })
      expect(result.strippedContent.trim()).toBe('')
    })

    it('should parse re-export type', () => {
      const result = parseTypeScriptESM(`export type { Foo } from './types'`)

      expect(result.exports[0]!.source).toBe('./types')
      expect(result.exports[0]!.isTypeOnly).toBe(true)
    })
  })

  describe('mixed content', () => {
    it('should handle mixed imports and other content', () => {
      const source = `
import type { Config } from './config'
import { render } from 'react-dom'

const app = document.getElementById('app')
render(<App />, app)
`
      const result = parseTypeScriptESM(source)

      expect(result.imports).toHaveLength(2)
      expect(result.strippedContent).toContain("import { render } from 'react-dom'")
      expect(result.strippedContent).toContain('const app')
      expect(result.strippedContent).not.toContain('import type')
    })
  })

  describe('preserves TypeScript AST', () => {
    it('should include TypeScript AST nodes', () => {
      const result = parseTypeScriptESM(`import type { Foo } from './types'`)

      expect(result.imports[0]!.ast).toBeDefined()
      expect(result.imports[0]!.ast.kind).toBeDefined() // TypeScript AST node
    })

    it('should include position information', () => {
      const result = parseTypeScriptESM(`import type { Foo } from './types'`)

      expect(result.imports[0]!.position.start).toBe(0)
      expect(result.imports[0]!.position.end).toBeGreaterThan(0)
    })
  })
})

describe('extractTypeInfo', () => {
  it('should extract type and value imports separately', () => {
    const result = parseTypeScriptESM(`
      import type { Foo } from './types'
      import { bar, type Baz } from './utils'
    `)
    const info = extractTypeInfo(result)

    expect(info.typeImports).toEqual([
      { source: './types', names: ['Foo'] },
      { source: './utils', names: ['Baz'] },
    ])
    expect(info.valueImports).toEqual([{ source: './utils', names: ['bar'] }])
  })
})

describe('hasTypeScriptImportExport', () => {
  it('should detect type-only imports', () => {
    expect(hasTypeScriptImportExport(`import type { Foo } from './types'`)).toBe(true)
  })

  it('should detect inline type imports', () => {
    expect(hasTypeScriptImportExport(`import { type Foo } from './types'`)).toBe(true)
  })

  it('should detect type exports', () => {
    expect(hasTypeScriptImportExport(`export type { Foo }`)).toBe(true)
  })

  it('should return false for regular imports', () => {
    expect(hasTypeScriptImportExport(`import { foo } from './utils'`)).toBe(false)
  })
})

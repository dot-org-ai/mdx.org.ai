import { describe, it, expect } from 'vitest'
import { compile, transformJSX } from './index.js'

describe('@mdxld/compile', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })

  describe('compile()', () => {
    it('function-body output (the default) is a bare function body', async () => {
      const { code } = await compile('# Hello World')

      expect(code).not.toMatch(/\bexport\b/)
      expect(code).not.toContain('__commonJS')

      // It must be runnable exactly the way @mdxld/evaluate runs it.
      const fn = new Function('h', 'Fragment', code)
      const result = fn((type: unknown, props: unknown, ...children: unknown[]) => ({ type, props, children }), Symbol.for('Fragment'))
      expect(typeof result.default).toBe('function')
      expect(result.frontmatter).toEqual({})
    })

    it('function-body output carries parsed frontmatter', async () => {
      const { code, frontmatter } = await compile('---\ntitle: Hi\ncount: 3\n---\n# Hello')

      expect(frontmatter).toEqual({ title: 'Hi', count: 3 })
      const result = new Function('h', 'Fragment', code)(() => null, null)
      expect(result.frontmatter).toEqual({ title: 'Hi', count: 3 })
    })

    it('module output uses ESM exports', async () => {
      const { code } = await compile('# Hello World', { outputFormat: 'module' })

      expect(code).toMatch(/export\s*\{[^}]*default/)
      expect(code).toContain('frontmatter')
      expect(code).not.toContain('__commonJS')
    })
  })

  describe('transformJSX()', () => {
    it('defaults to ESM output', async () => {
      const { code } = await transformJSX('export const A = () => <div>x</div>')
      expect(code).toContain('export')
      expect(code).toContain('h("div", null, "x")')
    })

    it('leaves a top-level return untouched when format is null', async () => {
      const { code } = await transformJSX('return <div>x</div>', { format: null })
      expect(code.trim()).toBe('return /* @__PURE__ */ h("div", null, "x");')
    })
  })
})

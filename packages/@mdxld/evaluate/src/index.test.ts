import { describe, it, expect } from 'vitest'
import { compile } from '@mdxld/compile'
import { evaluate, evaluateInSandbox, run, renderToString, h, Fragment } from './index.js'

type MDXComponent = (props: Record<string, unknown>) => unknown

describe('@mdxld/evaluate', () => {
  it('module loads', async () => {
    const mod = await import('./index.js')
    expect(mod).toBeDefined()
  })

  it('evaluate() of a trivial MDX module returns its default export', async () => {
    const { code } = await compile('# Hello World', { outputFormat: 'function-body' })
    const result = evaluate(code, { jsx: h, Fragment })

    expect(typeof result.default).toBe('function')
    expect(renderToString((result.default as MDXComponent)({}))).toContain('Hello World')
  })

  it('evaluate() renders JSX content from the default export', async () => {
    const { code } = await compile('<p>Hello World</p>', { outputFormat: 'function-body' })
    const result = evaluate(code, { jsx: h, Fragment })

    expect(renderToString((result.default as MDXComponent)({}))).toBe('<p>Hello World</p>')
  })

  it('evaluate() exposes frontmatter alongside the default export', async () => {
    const { code } = await compile('---\ntitle: Hi\n---\n# Hello', { outputFormat: 'function-body' })
    const result = evaluate(code)

    expect(result.frontmatter).toEqual({ title: 'Hi' })
    expect(typeof result.default).toBe('function')
  })

  it('run() compiles and evaluates in one step', async () => {
    const result = await run('<p>Hello World</p>')

    expect(typeof result.default).toBe('function')
    expect(renderToString((result.default as MDXComponent)({}))).toBe('<p>Hello World</p>')
  })

  it('evaluateInSandbox() resolves ai-evaluate and returns a structured result', async () => {
    const result = await evaluateInSandbox('# Hello')

    // The root ai-evaluate entry needs a Cloudflare worker_loaders binding.
    // Without one it must answer with its own structured refusal - proving the
    // module resolved - and never with a module-resolution failure.
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/worker_loaders|LOADER/)
    expect(result.error).not.toMatch(/Cannot find (module|package)/)
    expect(Array.isArray(result.logs)).toBe(true)
    expect(typeof result.duration).toBe('number')
  })
})

/**
 * The text registers served from workerd (mdx-8je.18 acceptance: "response headers verified in
 * the workers pool"). Every request goes through `SELF.fetch` — the deployed Worker's fetch
 * handler — so the headers checked here are the bytes workerd puts on the wire.
 */
import { SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'
import { render } from '@mdxui/text/core'
import { countTokens } from '@mdxe/cli-core/tokens'
import { doc, source } from './worker.js'

const fetchDoc = (accept?: string) =>
  SELF.fetch('https://example.com/doc', { headers: accept === undefined ? {} : { Accept: accept } })

describe('text registers in workerd', () => {
  it('Accept: text/markdown → text/markdown; charset=utf-8, Vary: Accept, x-markdown-tokens; bytes = @mdxui/text md', async () => {
    const res = await fetchDoc('text/markdown')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(res.headers.get('vary')).toBe('Accept')

    const body = await res.text()
    expect(body).toBe(render(doc, 'md'))
    expect(body).not.toBe(source)

    const expected = await countTokens(body, 'o200k_base')
    expect(res.headers.get('x-markdown-tokens')).toBe(String(expected.count))
    expect(Number(res.headers.get('x-markdown-tokens'))).toBeGreaterThan(0)
    // Labelled: the method that produced the count travels with it.
    expect(res.headers.get('x-markdown-tokens-method')).toBe(`${expected.method}; tokenizer=${expected.tokenizer}`)
    expect(res.headers.get('x-markdown-tokens-method')).toMatch(/^(tiktoken-o200k|chars-approx); tokenizer=o200k_base$/)
  })

  it('Accept: text/plain → the plain register', async () => {
    const res = await fetchDoc('text/plain')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(res.headers.get('vary')).toBe('Accept')
    expect(await res.text()).toBe(render(doc, 'plain'))
    expect(res.headers.get('x-markdown-tokens')).toBeNull()
  })

  it('Accept for an unimplemented format → 406 naming what exists', async () => {
    const res = await fetchDoc('text/csv')
    expect(res.status).toBe(406)
    expect(res.headers.get('content-type')).toBe('application/problem+json; charset=utf-8')
    expect(res.headers.get('vary')).toBe('Accept')
    const body = (await res.json()) as { status: number; accept: string; available: string[] }
    expect(body.status).toBe(406)
    expect(body.accept).toBe('text/csv')
    expect(body.available).toEqual(expect.arrayContaining(['text/markdown', 'text/plain', 'text/html', 'application/json']))
  })

  it('a browser Accept → html, never a text register', async () => {
    const res = await fetchDoc('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(res.headers.get('vary')).toBe('Accept')
  })

  it('no Accept → html', async () => {
    const res = await fetchDoc()
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/html; charset=utf-8')
  })
})

/**
 * renderDocument formats (mdx-8je.8): `md` goes through the `md` register of npm @mdxui/text
 * (the renderer received from mdx.org.ai's @mdxui/markdown), `json` is the parsed document, and
 * `html` is the fallback page. Nothing here reads a workspace @mdxui source.
 */
import { describe, it, expect } from 'vitest'
import { parse } from 'mdxld'
import { render as renderMd } from '@mdxui/text/md'
import { renderDocument, getFormatFromAccept, parseFormat, FORMAT_CONTENT_TYPES } from './format.js'

const source = `---
$type: BlogPost
title: Hello
tags: [a, b]
---

# Hello

<Hero title="x" />

A **bold** line with {props.expr} inside.

- one
- two
`

describe('renderDocument (mdx-8je.8)', () => {
  const doc = parse(source)

  it('md renders through @mdxui/text/md: frontmatter kept, JSX stripped', () => {
    const { content, contentType } = renderDocument(doc, 'md')
    expect(contentType).toBe(FORMAT_CONTENT_TYPES.md)
    expect(content).toBe(renderMd(doc))
    expect(content).toContain('title: Hello')
    expect(content).toContain('# Hello')
    expect(content).toContain('**bold**')
    expect(content).toContain('- one')
    expect(content).not.toContain('<Hero')
    // Inline `{expr}` inside a paragraph survives @mdxui/text@0.1.0's default `expressionHandling:
    // 'strip'` (only flow expressions are stripped); tracked as a gap against dot-do/ui, not pinned here.
  })

  it('md is not the raw MDX source', () => {
    const { content } = renderDocument(doc, 'md')
    expect(content).not.toBe(source)
  })

  it('json is the parsed document, round-trippable', () => {
    const { content, contentType } = renderDocument(doc, 'json')
    expect(contentType).toBe(FORMAT_CONTENT_TYPES.json)
    const parsed = JSON.parse(content) as { type?: string; data: Record<string, unknown>; content: string }
    expect(parsed.type).toBe('BlogPost')
    expect(parsed.data.title).toBe('Hello')
    expect(parsed.content).toContain('# Hello')
  })

  it('html falls back to a page titled from the document', () => {
    const { content, contentType } = renderDocument(doc, 'html')
    expect(contentType).toBe(FORMAT_CONTENT_TYPES.html)
    expect(content).toContain('<title>Hello</title>')
    expect(content).toContain('# Hello')
  })

  it('html uses a custom renderer when given', () => {
    const { content } = renderDocument(doc, 'html', { renderHtml: (d) => `<h1>${String(d.data.title)}</h1>` })
    expect(content).toBe('<h1>Hello</h1>')
  })

  it('txt is the body only', () => {
    const { content } = renderDocument(doc, 'txt')
    expect(content).toBe(doc.content)
  })
})

describe('format negotiation', () => {
  it('maps extensions to formats and strips them', () => {
    expect(parseFormat('/docs/intro.md')).toEqual({ format: 'md', basePath: '/docs/intro' })
    expect(parseFormat('/docs/intro.json')).toEqual({ format: 'json', basePath: '/docs/intro' })
    expect(parseFormat('/docs/intro')).toEqual({ format: null, basePath: '/docs/intro' })
  })

  it('reads text/markdown, application/json and text/html from Accept', () => {
    expect(getFormatFromAccept('text/markdown')).toBe('md')
    expect(getFormatFromAccept('application/json')).toBe('json')
    expect(getFormatFromAccept('text/html,application/xhtml+xml')).toBe('html')
    expect(getFormatFromAccept('*/*')).toBeNull()
  })
})

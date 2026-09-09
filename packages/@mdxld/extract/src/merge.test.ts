/**
 * 3-way merge through @mdxld/diff (mdx-8je.12): the props AND the markdown both changed since
 * the markdown was rendered.
 */
import { describe, it, expect } from 'vitest'
import { applyPaths, diffPaths, merge3wayObjects } from '@mdxld/diff'
import { applyExtract, diff, extract, mergeExtract } from './index.js'

const template = `# {data.title}

*By {data.author}*

{data.body}`

const base = {
  data: {
    title: 'Hello',
    author: 'Jane',
    body: 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.',
    slug: 'hello', // not rendered by the template
  },
}

const renderMd = (props: typeof base) => `# ${props.data.title}\n\n*By ${props.data.author}*\n\n${props.data.body}`

describe('diff / applyExtract are @mdxld/diff', () => {
  it('diff is diffPaths and applyExtract is applyPaths', () => {
    const extracted = { data: { title: 'Hi' } }
    expect(diff(base, extracted)).toEqual(diffPaths(base, extracted))
    expect(applyExtract(base, extracted)).toEqual(applyPaths(base, extracted))
  })
})

describe('mergeExtract: props and markdown both changed', () => {
  it('takes the record edit and the markdown edit when they touch different fields', () => {
    // The record changed since render (ours): author renamed
    const current = { data: { ...base.data, author: 'Jane Doe' } }
    // The markdown was edited (theirs): title changed
    const edited = renderMd(base).replace('# Hello', '# Hello, world')
    const { data: extracted } = extract({ template, rendered: edited })

    const result = mergeExtract(base, current, extracted)

    expect(result.hasConflicts).toBe(false)
    expect(result.merged).toEqual({
      data: { title: 'Hello, world', author: 'Jane Doe', body: base.data.body, slug: 'hello' },
    })
    expect(result.applied).toEqual({ ours: ['data.author'], theirs: ['data.title'] })
  })

  it('never treats a field the template does not render as deleted by the markdown', () => {
    const current = { data: { ...base.data, slug: 'hello-world' } }
    const { data: extracted } = extract({ template, rendered: renderMd(base) })

    const result = mergeExtract(base, current, extracted)

    expect(result.merged.data.slug).toBe('hello-world')
    expect(result.hasConflicts).toBe(false)
  })

  it('line-merges a body both sides edited in different paragraphs', () => {
    const current = { data: { ...base.data, body: base.data.body.replace('First paragraph.', 'FIRST paragraph.') } }
    const edited = renderMd(base).replace('Third paragraph.', 'Third paragraph, edited.')
    const { data: extracted } = extract({ template, rendered: edited })

    const result = mergeExtract(base, current, extracted)

    expect(result.hasConflicts).toBe(false)
    expect(result.merged.data.body).toBe('FIRST paragraph.\n\nSecond paragraph.\n\nThird paragraph, edited.')
  })

  it('reports a conflict when both changed the same field, keeps ours by default, and can prefer the markdown', () => {
    const current = { data: { ...base.data, title: 'Record title' } }
    const edited = renderMd(base).replace('# Hello', '# Markdown title')
    const { data: extracted } = extract({ template, rendered: edited })

    const ours = mergeExtract(base, current, extracted)
    expect(ours.hasConflicts).toBe(true)
    expect(ours.conflicts).toEqual([{ path: 'data.title', base: 'Hello', ours: 'Record title', theirs: 'Markdown title', resolution: 'ours' }])
    expect(ours.merged.data.title).toBe('Record title')

    const theirs = mergeExtract(base, current, extracted, { onConflict: 'theirs' })
    expect(theirs.merged.data.title).toBe('Markdown title')
    expect(theirs.conflicts[0]?.resolution).toBe('theirs')
  })

  it('accepts the same edit made on both sides', () => {
    const current = { data: { ...base.data, title: 'Same' } }
    const { data: extracted } = extract({ template, rendered: renderMd(current) })
    const result = mergeExtract(base, current, extracted)
    expect(result.hasConflicts).toBe(false)
    expect(result.merged.data.title).toBe('Same')
  })

  it('restricts the markdown side to the given paths', () => {
    const edited = renderMd(base).replace('# Hello', '# New').replace('By Jane', 'By Someone')
    const { data: extracted } = extract({ template, rendered: edited })
    const result = mergeExtract(base, base, extracted, { paths: ['data.title'] })
    expect(result.merged.data).toMatchObject({ title: 'New', author: 'Jane' })
  })

  it('is merge3wayObjects over an overlay of the extracted data', () => {
    const current = { data: { ...base.data, author: 'Jane Doe' } }
    const extracted = { data: { title: 'Hi' } }
    expect(mergeExtract(base, current, extracted)).toEqual(merge3wayObjects(base, current, applyPaths(base, extracted)))
  })
})

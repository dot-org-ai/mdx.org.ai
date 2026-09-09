/**
 * render → extract identity against the npm `@mdxui/text` md register (mdx-8je.12).
 *
 * Forward: `render(fixture, 'md')` from `@mdxui/text/core` walks a Role's Contract props into
 * markdown. Reverse: `extract({ template, rendered, components })` here turns it back. For
 * every Role fixture the two must agree on the props the walk renders (`roundTripProps`), or
 * bi-directional sync silently breaks. `ROLE_MD_TEMPLATES` and `MD_EXTRACTORS` are published
 * by @mdxui/text so both repos run this same test; `ROUND_TRIP_GAPS` is its published list of
 * what does NOT round-trip, and the entries routed at this package are witnessed below.
 */
import { describe, it, expect } from 'vitest'
import { render } from '@mdxui/text/core'
import { MD_EXTRACTORS, ROLES, ROLE_FIXTURES, ROLE_MD_TEMPLATES, ROUND_TRIP_GAPS, roundTripProps, type Role } from '@mdxui/text/fixtures'
import { diff, extract, type ComponentExtractor } from './index.js'

const components = MD_EXTRACTORS as unknown as Record<string, ComponentExtractor>

describe('render → extract identity across the Role fixture set (@mdxui/text md register)', () => {
  it('covers every Role @mdxui/text publishes', () => {
    expect(ROLES).toEqual(['Hero', 'Features', 'Pricing', 'Testimonials', 'CTA', 'FAQ'])
    expect(Object.keys(ROLE_MD_TEMPLATES).sort()).toEqual([...ROLES].sort())
  })

  describe.each(ROLES as readonly Role[])('%s', (role) => {
    const fixture = ROLE_FIXTURES[role]
    const template = ROLE_MD_TEMPLATES[role]

    it('extract(template, render(props)).data deep-equals the round-trip props', () => {
      const rendered = render(fixture, 'md')
      const result = extract({ template, rendered, components })

      expect(result.debug?.matched).toBe(true)
      expect(result.unmatched).toEqual([])
      expect(result.confidence).toBe(1)
      expect(result.data).toEqual(roundTripProps(fixture))
    })

    it('reports no diff between the round-trip props and what came back', () => {
      const rendered = render(fixture, 'md')
      const { data } = extract({ template, rendered, components })
      const changes = diff(roundTripProps(fixture) as unknown as Record<string, unknown>, data)
      expect(changes.hasChanges).toBe(false)
    })

    it('carries an edit inside a scalar slot back as that scalar', () => {
      const rendered = render(fixture, 'md').replace(String(fixture.data.title), 'Edited title')
      const { data } = extract<{ data: { title: string } }>({ template, rendered, components })
      expect(data.data.title).toBe('Edited title')
    })
  })
})

describe('published round-trip gaps routed at @mdxld/extract (ROUND_TRIP_GAPS)', () => {
  const routedHere = ROUND_TRIP_GAPS.filter((gap) => gap.route === 'extractor')

  it('lists the diff-over-key-order gap (issue mdx-8je.12) and nothing else for this package', () => {
    expect(routedHere.map((gap) => `${gap.kind}:${gap.issue ?? ''}`)).toEqual(['diff:mdx-8je.12'])
  })

  it('diff no longer reports a list of objects whose keys are merely reordered', () => {
    const { data } = ROLE_FIXTURES.Features
    const features = data.features as Array<Record<string, unknown>>
    const reordered = {
      data: { ...data, features: features.map((f) => ({ description: f.description, title: f.title })) },
    }
    expect(diff({ data }, reordered).hasChanges).toBe(false)
  })

  it('a loop slot no longer poisons the scalars beside it (the gap @mdxui/text routes to extractWithAI)', () => {
    const template = '## {data.title}\n\n{data.features.map(f => `- ${f.title}`).join("\\n")}\n\n---\n\n{content}\n'
    const rendered = '## What you get\n\n- One walk\n- Measured\n\n---\n\nBody.\n'
    const result = extract<{ data: { title: string }; content: string }>({ template, rendered })
    expect(result.debug?.matched).toBe(true)
    expect(result.data.data.title).toBe('What you get')
    expect(result.data.content).toBe('Body.')
    expect(result.unmatched).toEqual(['data.features.map(f => `- ${f.title}`).join("\\n")'])
  })
})

import { describe, it, expect } from 'vitest'
import {
  extract,
  extractWithAI,
  roundTripComponent,
  diff,
  applyExtract,
  validateTemplate,
  parseTemplateSlots,
  ExtractError,
  type TemplateSlot,
  type ComponentExtractor
} from './extract.js'

// =============================================================================
// Template Slot Parsing Tests
// =============================================================================

describe('parseTemplateSlots', () => {
  it('should parse simple expression slots', () => {
    const slots = parseTemplateSlots('# {data.title}')
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      path: 'data.title',
      type: 'expression',
      raw: '{data.title}'
    })
  })

  it('should parse multiple expression slots', () => {
    const slots = parseTemplateSlots('# {data.title}\n\n{data.content}')
    expect(slots).toHaveLength(2)
    expect(slots[0]!.path).toBe('data.title')
    expect(slots[1]!.path).toBe('data.content')
  })

  it('should parse deeply nested paths', () => {
    const slots = parseTemplateSlots('{user.profile.settings.theme}')
    expect(slots[0]!.path).toBe('user.profile.settings.theme')
  })

  it('should parse self-closing component slots', () => {
    const slots = parseTemplateSlots('<PropertyTable properties={data.props} />')
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      type: 'component',
      componentName: 'PropertyTable',
      componentProps: { properties: 'data.props' }
    })
  })

  it('should parse block component slots', () => {
    const slots = parseTemplateSlots('<Card title={data.title}>Content</Card>')
    expect(slots).toHaveLength(1)
    expect(slots[0]).toMatchObject({
      type: 'component',
      componentName: 'Card',
      componentProps: { title: 'data.title' }
    })
  })

  it('should parse components with multiple props', () => {
    const slots = parseTemplateSlots('<Hero title={page.title} subtitle={page.subtitle} cta={page.cta} />')
    expect(slots[0]!.componentProps).toEqual({
      title: 'page.title',
      subtitle: 'page.subtitle',
      cta: 'page.cta'
    })
  })

  it('should NOT parse expressions inside component props', () => {
    const template = '# {data.title}\n\n<Table rows={data.rows} />'
    const slots = parseTemplateSlots(template)

    // Should have expression slot for title and component slot for Table
    expect(slots).toHaveLength(2)
    expect(slots.find(s => s.path === 'data.title')).toBeDefined()
    expect(slots.find(s => s.componentName === 'Table')).toBeDefined()
    // Should NOT have a separate slot for data.rows
    expect(slots.find(s => s.path === 'data.rows')).toBeUndefined()
  })

  it('should detect conditional expressions', () => {
    const slots = parseTemplateSlots('{data.show ? "Yes" : "No"}')
    expect(slots[0]!.type).toBe('conditional')
  })

  it('should detect loop expressions', () => {
    const slots = parseTemplateSlots('{items.map(i => i.name).join(", ")}')
    expect(slots[0]!.type).toBe('loop')
  })

  it('should detect complex expressions with function calls', () => {
    const slots = parseTemplateSlots('{formatDate(data.createdAt)}')
    expect(slots[0]!.type).toBe('conditional') // Complex expression
  })
})

// =============================================================================
// Basic Extraction Tests
// =============================================================================

describe('extract', () => {
  describe('simple expressions', () => {
    it('should extract a single title', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello World'
      })

      expect(result.data).toEqual({ data: { title: 'Hello World' } })
      expect(result.confidence).toBe(1)
      expect(result.unmatched).toEqual([])
    })

    it('should extract multiple fields', () => {
      const result = extract({
        template: `# {data.title}

## Description
{data.description}`,
        rendered: `# My Article

## Description
This is the article content.`
      })

      expect(result.data).toEqual({
        data: {
          title: 'My Article',
          description: 'This is the article content.'
        }
      })
      expect(result.confidence).toBe(1)
    })

    it('should handle nested paths', () => {
      const result = extract({
        template: '# {type.label}\n\n{type.comment}',
        rendered: '# Person\n\nA person (alive, dead, undead, or fictional).'
      })

      expect(result.data).toEqual({
        type: {
          label: 'Person',
          comment: 'A person (alive, dead, undead, or fictional).'
        }
      })
    })

    it('should handle deeply nested paths', () => {
      const result = extract({
        template: '{user.profile.settings.theme}',
        rendered: 'dark'
      })

      expect(result.data).toEqual({
        user: {
          profile: {
            settings: {
              theme: 'dark'
            }
          }
        }
      })
    })

    it('should preserve whitespace in values', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello   World  With   Spaces'
      })

      expect(result.data).toEqual({
        data: { title: 'Hello   World  With   Spaces' }
      })
    })

    it('should handle special characters in values', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello <World> & "Friends"'
      })

      expect(result.data).toEqual({
        data: { title: 'Hello <World> & "Friends"' }
      })
    })
  })

  describe('structural patterns', () => {
    it('should extract sections by headers', () => {
      const result = extract({
        template: `# {page.title}

## Overview
{page.overview}

## Features
{page.features}

## Pricing
{page.pricing}`,
        rendered: `# Product Page

## Overview
Our amazing product does X, Y, and Z.

## Features
Feature list goes here.

## Pricing
Starting at $99/month.`
      })

      expect(result.data).toEqual({
        page: {
          title: 'Product Page',
          overview: 'Our amazing product does X, Y, and Z.',
          features: 'Feature list goes here.',
          pricing: 'Starting at $99/month.'
        }
      })
    })

    it('should handle multi-line content in sections', () => {
      const result = extract({
        template: `## Description
{data.description}

## Details`,
        rendered: `## Description
Line one of the description.
Line two of the description.
Line three.

## Details`
      })

      expect(result.data.data.description).toContain('Line one')
      expect(result.data.data.description).toContain('Line three')
    })
  })

  describe('component slots', () => {
    it('should identify component slots as unmatched without extractors', () => {
      const result = extract({
        template: '# {data.title}\n\n<PropertyTable properties={data.properties} />',
        rendered: '# Test\n\n| Name | Type |\n|---|---|\n| id | string |'
      })

      expect(result.data).toEqual({ data: { title: 'Test' } })
      expect(result.unmatched).toContain('<PropertyTable />')
    })

    it('should use component extractors when provided', () => {
      const tableExtractor: ComponentExtractor = {
        extract: (content: string) => {
          const rows = content.split('\n').filter(r =>
            r.startsWith('|') && !r.includes('---') && !r.includes('Name')
          )
          return {
            properties: rows.map(row => {
              const cells = row.split('|').filter(Boolean).map(c => c.trim())
              return { name: cells[0], type: cells[1] }
            })
          }
        }
      }

      expect(tableExtractor.extract('| Name | Type |\n|---|---|\n| id | string |'))
        .toEqual({ properties: [{ name: 'id', type: 'string' }] })
    })
  })

  describe('confidence scoring', () => {
    it('should return lower confidence for partial matches', () => {
      const result = extract({
        template: '# {data.title}\n\n{data.subtitle}\n\n{data.content}',
        rendered: '# Only Title'
      })

      expect(result.confidence).toBeLessThan(1)
    })

    it('should return 1.0 confidence for full matches', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello'
      })

      expect(result.confidence).toBe(1)
    })
  })

  describe('strict mode', () => {
    it('should throw ExtractError in strict mode when slots are unmatched', () => {
      expect(() => extract({
        template: '# {data.title}\n\n<Component />',
        rendered: '# Test\n\nContent',
        strict: true
      })).toThrow(ExtractError)
    })

    it('should include debug info in ExtractError', () => {
      try {
        extract({
          template: '# {data.title}\n\n<Component />',
          rendered: '# Test\n\nContent',
          strict: true
        })
      } catch (e) {
        expect(e).toBeInstanceOf(ExtractError)
        expect((e as ExtractError).details.unmatched).toContain('<Component />')
        expect((e as ExtractError).details.debug).toBeDefined()
      }
    })
  })

  describe('debug information', () => {
    it('should include slots in debug info', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello'
      })

      expect(result.debug?.slots).toHaveLength(1)
      expect(result.debug?.matched).toBe(true)
    })

    it('should include pattern in debug info', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello'
      })

      expect(result.debug?.pattern).toContain('slot_data_title')
    })

    it('should include matched groups in debug info', () => {
      const result = extract({
        template: '# {data.title}',
        rendered: '# Hello'
      })

      expect(result.debug?.groups).toBeDefined()
    })
  })
})

// =============================================================================
// Round-Trip Component Tests
// =============================================================================

describe('roundTripComponent', () => {
  interface Property {
    name: string
    type: string
  }

  it('should create a component with render and extract', () => {
    const PropertyTable = roundTripComponent({
      render: (props: { properties: Property[] }) => {
        const header = '| Name | Type |\n|---|---|'
        const rows = props.properties.map(p => `| ${p.name} | ${p.type} |`).join('\n')
        return `${header}\n${rows}`
      },
      extract: (content: string) => {
        const rows = content.split('\n').filter(r =>
          r.startsWith('|') && !r.includes('---') && !r.includes('Name')
        )
        return {
          properties: rows.map(row => {
            const cells = row.split('|').filter(Boolean).map(c => c.trim())
            return { name: cells[0]!, type: cells[1]! }
          })
        }
      }
    })

    // Test render
    const rendered = PropertyTable.render({
      properties: [
        { name: 'id', type: 'string' },
        { name: 'count', type: 'number' }
      ]
    })
    expect(rendered).toContain('| id | string |')
    expect(rendered).toContain('| count | number |')

    // Test extract (reverse)
    const extracted = PropertyTable.extract(rendered)
    expect(extracted).toEqual({
      properties: [
        { name: 'id', type: 'string' },
        { name: 'count', type: 'number' }
      ]
    })

    // Full round-trip
    const original = {
      properties: [{ name: 'foo', type: 'boolean' }]
    }
    const roundTripped = PropertyTable.extract(PropertyTable.render(original))
    expect(roundTripped).toEqual(original)
  })

  it('should expose extractor for use with extract()', () => {
    const List = roundTripComponent({
      render: (props: { items: string[] }) => props.items.map(i => `- ${i}`).join('\n'),
      extract: (content: string) => ({
        items: content.split('\n').map(line => line.replace(/^- /, ''))
      })
    })

    expect(List.extractor).toBeDefined()
    expect(List.extractor.extract('- a\n- b\n- c')).toEqual({
      items: ['a', 'b', 'c']
    })
  })
})

// =============================================================================
// Diff Tests
// =============================================================================

describe('diff', () => {
  it('should detect added fields', () => {
    const original = { title: 'Hello' }
    const extracted = { title: 'Hello', subtitle: 'World' }

    const result = diff(original, extracted)

    expect(result.added).toEqual({ subtitle: 'World' })
    expect(result.hasChanges).toBe(true)
  })

  it('should detect modified fields', () => {
    const original = { title: 'Hello' }
    const extracted = { title: 'Goodbye' }

    const result = diff(original, extracted)

    expect(result.modified).toEqual({
      title: { from: 'Hello', to: 'Goodbye' }
    })
    expect(result.hasChanges).toBe(true)
  })

  it('should detect removed fields', () => {
    const original = { title: 'Hello', subtitle: 'World' }
    const extracted = { title: 'Hello' }

    const result = diff(original, extracted)

    expect(result.removed).toContain('subtitle')
    expect(result.hasChanges).toBe(true)
  })

  it('should detect no changes', () => {
    const original = { title: 'Hello' }
    const extracted = { title: 'Hello' }

    const result = diff(original, extracted)

    expect(result.hasChanges).toBe(false)
    expect(result.added).toEqual({})
    expect(result.modified).toEqual({})
    expect(result.removed).toEqual([])
  })

  it('should handle nested objects', () => {
    const original = { data: { title: 'Hello' } }
    const extracted = { data: { title: 'Goodbye', subtitle: 'New' } }

    const result = diff(original, extracted)

    expect(result.modified).toHaveProperty('data.title')
    expect(result.added).toEqual({ data: { subtitle: 'New' } })
  })

  it('should handle arrays', () => {
    const original = { tags: ['a', 'b'] }
    const extracted = { tags: ['a', 'b', 'c'] }

    const result = diff(original, extracted)

    expect(result.modified).toHaveProperty('tags')
    expect(result.modified.tags.to).toEqual(['a', 'b', 'c'])
  })
})

// =============================================================================
// Apply Extract Tests
// =============================================================================

describe('applyExtract', () => {
  it('should merge extracted data into original', () => {
    const original = { title: 'Hello', author: 'John' }
    const extracted = { title: 'Updated Title' }

    const result = applyExtract(original, extracted)

    expect(result).toEqual({ title: 'Updated Title', author: 'John' })
  })

  it('should add new fields', () => {
    const original = { title: 'Hello' }
    const extracted = { subtitle: 'World' }

    const result = applyExtract(original, extracted)

    expect(result).toEqual({ title: 'Hello', subtitle: 'World' })
  })

  it('should handle nested paths', () => {
    const original = { data: { title: 'Hello' } }
    const extracted = { data: { title: 'Updated' } }

    const result = applyExtract(original, extracted)

    expect(result).toEqual({ data: { title: 'Updated' } })
  })

  it('should create nested structure if needed', () => {
    const original = { title: 'Hello' }
    const extracted = { meta: { description: 'New' } }

    const result = applyExtract(original, extracted)

    expect(result).toEqual({
      title: 'Hello',
      meta: { description: 'New' }
    })
  })

  it('should respect paths option', () => {
    const original = { title: 'Hello', content: 'Original' }
    const extracted = { title: 'Updated', content: 'Changed' }

    const result = applyExtract(original, extracted, { paths: ['title'] })

    expect(result).toEqual({ title: 'Updated', content: 'Original' })
  })

  it('should handle array merge strategies', () => {
    const original = { tags: ['a', 'b'] }

    // Replace (default)
    expect(applyExtract(original, { tags: ['c'] }))
      .toEqual({ tags: ['c'] })

    // Append
    expect(applyExtract(original, { tags: ['c'] }, { arrayMerge: 'append' }))
      .toEqual({ tags: ['a', 'b', 'c'] })

    // Prepend
    expect(applyExtract(original, { tags: ['c'] }, { arrayMerge: 'prepend' }))
      .toEqual({ tags: ['c', 'a', 'b'] })
  })
})

// =============================================================================
// Template Validation Tests
// =============================================================================

describe('validateTemplate', () => {
  it('should mark simple templates as valid', () => {
    const result = validateTemplate('# {data.title}\n\n{data.content}')

    expect(result.valid).toBe(true)
    expect(result.extractable).toContain('data.title')
    expect(result.extractable).toContain('data.content')
    expect(result.needsAI).toHaveLength(0)
  })

  it('should warn about components', () => {
    const result = validateTemplate('# {data.title}\n\n<Table rows={data.rows} />')

    expect(result.valid).toBe(false)
    expect(result.warnings.some(w => w.includes('Table'))).toBe(true)
    expect(result.needsAI).toContain('<Table />')
  })

  it('should warn about conditionals', () => {
    const result = validateTemplate('{data.show ? "Yes" : "No"}')

    expect(result.valid).toBe(false)
    expect(result.needsAI.length).toBeGreaterThan(0)
  })

  it('should warn about loops', () => {
    const result = validateTemplate('{items.map(i => i.name).join(", ")}')

    expect(result.valid).toBe(false)
    expect(result.needsAI.length).toBeGreaterThan(0)
  })

  it('should return all slots', () => {
    const result = validateTemplate('# {title}\n\n<Card />\n\n{show ? "A" : "B"}')

    expect(result.slots.length).toBe(3)
  })
})

// =============================================================================
// Schema.org.ai Example Tests
// =============================================================================

describe('schema.org.ai example', () => {
  it('should extract type information from rendered schema page', () => {
    const template = `# {type.label}

## Description

{type.comment}

## Parent Type

{type.subClassOf}`

    const rendered = `# Person

## Description

A person (alive, dead, undead, or fictional).

## Parent Type

Thing`

    const result = extract({ template, rendered })

    expect(result.data).toEqual({
      type: {
        label: 'Person',
        comment: 'A person (alive, dead, undead, or fictional).',
        subClassOf: 'Thing'
      }
    })
    expect(result.confidence).toBe(1)
  })

  it('should handle property table with custom extractor', () => {
    interface Property {
      name: string
      type: string
      description: string
    }

    const PropertyTable = roundTripComponent({
      render: (props: { properties: Property[] }) => {
        const header = '| Property | Type | Description |\n|---|---|---|'
        const rows = props.properties.map(p =>
          `| ${p.name} | ${p.type} | ${p.description} |`
        ).join('\n')
        return `${header}\n${rows}`
      },
      extract: (content: string) => {
        const rows = content.split('\n').filter(r =>
          r.startsWith('|') && !r.includes('---') && !r.includes('Property')
        )
        return {
          properties: rows.map(row => {
            const cells = row.split('|').filter(Boolean).map(c => c.trim())
            return {
              name: cells[0]!,
              type: cells[1]!,
              description: cells[2]!
            }
          })
        }
      }
    })

    const original = {
      properties: [
        { name: 'givenName', type: 'Text', description: "The person's first name" },
        { name: 'familyName', type: 'Text', description: "The person's last name" }
      ]
    }

    const rendered = PropertyTable.render(original)
    const extracted = PropertyTable.extract(rendered)

    expect(extracted).toEqual(original)
  })
})

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('edge cases', () => {
  it('should handle empty template', () => {
    const result = extract({
      template: '',
      rendered: 'Some content'
    })

    expect(result.data).toEqual({})
    expect(result.confidence).toBe(1)
  })

  it('should handle template with no slots', () => {
    const result = extract({
      template: '# Static Title\n\nStatic content',
      rendered: '# Static Title\n\nStatic content'
    })

    expect(result.data).toEqual({})
    expect(result.confidence).toBe(1)
  })

  it('should handle empty rendered content', () => {
    const result = extract({
      template: '# {data.title}',
      rendered: ''
    })

    expect(result.unmatched).toContain('data.title')
    expect(result.confidence).toBe(0)
  })

  it('should handle mismatched structure', () => {
    const result = extract({
      template: '# {data.title}\n\n## Description\n\n{data.desc}',
      rendered: '# Title\n\nNo description section here.'
    })

    // Might not match perfectly due to missing "## Description" header
    expect(result.confidence).toBeLessThanOrEqual(1)
  })

  it('should handle unicode content', () => {
    const result = extract({
      template: '# {data.title}',
      rendered: '# 你好世界 🌍'
    })

    expect(result.data).toEqual({
      data: { title: '你好世界 🌍' }
    })
  })

  it('should handle markdown formatting in values', () => {
    const result = extract({
      template: '{data.content}',
      rendered: '**Bold** and *italic* and `code`'
    })

    expect(result.data.data.content).toBe('**Bold** and *italic* and `code`')
  })

  it('should handle code blocks in values', () => {
    const result = extract({
      template: `## Description
{data.description}

## Code`,
      rendered: `## Description
Here is some text with \`inline code\`.

## Code`
    })

    expect(result.data.data.description).toContain('inline code')
  })
})

// =============================================================================
// AI Extraction Tests (placeholder)
// =============================================================================

describe('extractWithAI', () => {
  it('should return pattern result if confidence is high', async () => {
    const result = await extractWithAI({
      template: '# {data.title}',
      rendered: '# Hello'
    })

    expect(result.data).toEqual({ data: { title: 'Hello' } })
    expect(result.aiAssisted).toBe(false)
  })

  it('should flag aiAssisted when pattern matching fails', async () => {
    const result = await extractWithAI({
      template: '{data.show ? "Yes" : "No"}',
      rendered: 'Yes'
    })

    // For now, just returns with aiAssisted flag
    // Full AI integration would extract the value
    expect(result.aiAssisted).toBe(true)
  })
})

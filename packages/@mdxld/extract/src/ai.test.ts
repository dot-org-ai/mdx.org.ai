/**
 * extractWithAI against a mocked ai-functions generateObject (mdx-8je.12): the slots the
 * pattern matcher cannot reverse — loops, conditionals, components without an extractor — are
 * put to the model once, and its answers land at the expression's data path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { expressionPath, extract, extractWithAI, ExtractError, type AIGenerateArgs } from './index.js'

const generateObject = vi.fn<(args: AIGenerateArgs) => Promise<{ object: Record<string, unknown> }>>()

vi.mock('ai-functions', () => ({ generateObject: (args: AIGenerateArgs) => generateObject(args) }))

const loopTemplate = `# {data.title}

{data.tags.map(t => '- ' + t).join('\\n')}

Published: {data.published ? 'yes' : 'no'}`

const loopRendered = `# Hello

- alpha
- beta

Published: yes`

beforeEach(() => {
  generateObject.mockReset()
})

describe('expressionPath', () => {
  it('finds the data path an expression reads', () => {
    expect(expressionPath('data.title')).toBe('data.title')
    expect(expressionPath("data.published ? 'yes' : 'no'")).toBe('data.published')
    expect(expressionPath("data.tags.map(t => '- ' + t).join('\\n')")).toBe('data.tags')
    expect(expressionPath('items.filter(Boolean)')).toBe('items')
    expect(expressionPath('(a || b)')).toBeUndefined()
  })
})

describe('extractWithAI', () => {
  it('returns the pattern result untouched when every slot matched', async () => {
    const result = await extractWithAI({ template: '# {data.title}', rendered: '# Hello' })

    expect(result.data).toEqual({ data: { title: 'Hello' } })
    expect(result.aiAssisted).toBe(false)
    expect(generateObject).not.toHaveBeenCalled()
  })

  it('asks the mocked ai-functions generateObject for a loop and a conditional slot and lands the answers', async () => {
    generateObject.mockResolvedValue({ object: { data: { tags: ['alpha', 'beta'], published: true } } })

    const result = await extractWithAI<{ data: { title: string; tags: string[]; published: boolean } }>({
      template: loopTemplate,
      rendered: loopRendered,
      model: 'sonnet',
    })

    expect(result.aiAssisted).toBe(true)
    expect(result.data).toEqual({ data: { title: 'Hello', tags: ['alpha', 'beta'], published: true } })
    expect(result.unmatched).toEqual([])
    expect(result.confidence).toBe(1)

    expect(generateObject).toHaveBeenCalledTimes(1)
    const args = generateObject.mock.calls[0]![0]
    expect(args.model).toBe('sonnet')
    // A loop asks for a list, a conditional for a value, both at the expression's path
    expect(args.schema).toEqual({
      data: { tags: [expect.stringContaining('data.tags')], published: expect.stringContaining('data.published') },
    })
    // The prompt carries the template, the rendered content and the captured regions
    expect(args.prompt).toContain(loopTemplate)
    expect(args.prompt).toContain(loopRendered)
    expect(args.prompt).toContain('- alpha\n- beta')
    expect(args.prompt).toContain('yes')
    expect(args.system).toMatch(/reverse MDX templates/)
  })

  it('takes an explicit generate instead of ai-functions', async () => {
    const generate = vi.fn(async () => ({ object: { data: { published: false } } }))

    const result = await extractWithAI({
      template: "{data.published ? 'yes' : 'no'}",
      rendered: 'no',
      generate,
    })

    expect(generate).toHaveBeenCalledTimes(1)
    expect(generateObject).not.toHaveBeenCalled()
    expect(result.data).toEqual({ data: { published: false } })
    expect(result.aiAssisted).toBe(true)
  })

  it('leaves a slot unmatched (and the confidence below 1) when the model returns nothing for it', async () => {
    generateObject.mockResolvedValue({ object: { data: { tags: ['alpha', 'beta'] } } })

    const result = await extractWithAI({ template: loopTemplate, rendered: loopRendered })

    expect(result.data).toEqual({ data: { title: 'Hello', tags: ['alpha', 'beta'] } })
    expect(result.unmatched).toEqual(["data.published ? 'yes' : 'no'"])
    expect(result.confidence).toBeCloseTo(2 / 3)
  })

  it('reconstructs a component prop when no extractor is registered', async () => {
    generateObject.mockResolvedValue({ object: { data: { rows: [{ name: 'a' }, { name: 'b' }] } } })

    const result = await extractWithAI({
      template: '# {data.title}\n\n<Table rows={data.rows} />',
      rendered: '# T\n\n| name |\n|---|\n| a |\n| b |',
    })

    expect(result.data).toEqual({ data: { title: 'T', rows: [{ name: 'a' }, { name: 'b' }] } })
    const args = generateObject.mock.calls[0]![0]
    expect(args.schema).toEqual({ data: { rows: expect.stringContaining('<Table />') } })
    expect(args.prompt).toContain('| a |')
  })

  it('throws ExtractError in strict mode only after the model had its turn', async () => {
    generateObject.mockResolvedValue({ object: {} })

    await expect(extractWithAI({ template: loopTemplate, rendered: loopRendered, strict: true })).rejects.toBeInstanceOf(ExtractError)
    expect(generateObject).toHaveBeenCalledTimes(1)
  })

  it('the pattern pass captures the regions the model is shown', () => {
    const result = extract({ template: loopTemplate, rendered: loopRendered })
    expect(result.debug?.regions).toEqual({
      "data.tags.map(t => '- ' + t).join('\\n')": '- alpha\n- beta',
      "data.published ? 'yes' : 'no'": 'yes',
    })
  })
})

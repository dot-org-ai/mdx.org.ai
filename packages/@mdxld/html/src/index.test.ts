import { describe, it, expect } from 'vitest'
import { toHTML, fromHTML, toJSONLDScript } from './index.js'

// =============================================================================
// toHTML Tests
// =============================================================================

describe('toHTML', () => {
  describe('basic structure', () => {
    it('should render article tag by default', () => {
      const result = toHTML({ name: 'Test' })
      expect(result).toContain('<article')
      expect(result).toContain('</article>')
    })

    it('should use div when semantic is false', () => {
      const result = toHTML({ name: 'Test' }, { semantic: false })
      expect(result).toContain('<div')
      expect(result).not.toContain('<article')
    })

    it('should include microdata by default', () => {
      const result = toHTML({ name: 'Test' })
      expect(result).toContain('itemscope')
      expect(result).toContain('itemtype="https://schema.org/')
    })

    it('should exclude microdata when disabled', () => {
      const result = toHTML({ name: 'Test' }, { microdata: false })
      expect(result).not.toContain('itemscope')
      expect(result).not.toContain('itemprop')
    })
  })

  describe('name and description', () => {
    it('should render name as h1', () => {
      const result = toHTML({ name: 'Customer' })
      expect(result).toContain('<h1')
      expect(result).toContain('Customer')
      expect(result).toContain('</h1>')
    })

    it('should add itemprop="name" to h1', () => {
      const result = toHTML({ name: 'Test' })
      expect(result).toContain('<h1 itemprop="name">Test</h1>')
    })

    it('should render description as p', () => {
      const result = toHTML({ name: 'Test', description: 'A description' })
      expect(result).toContain('<p itemprop="description">A description</p>')
    })

    it('should escape HTML in name', () => {
      const result = toHTML({ name: '<script>alert("xss")</script>' })
      expect(result).toContain('&lt;script&gt;')
      expect(result).not.toContain('<script>')
    })

    it('should escape special characters', () => {
      const result = toHTML({ name: 'Test & "Quotes" <brackets>' })
      expect(result).toContain('&amp;')
      expect(result).toContain('&quot;')
      expect(result).toContain('&lt;')
      expect(result).toContain('&gt;')
    })
  })

  describe('properties table', () => {
    it('should render properties as table', () => {
      const result = toHTML({
        name: 'Customer',
        properties: [
          { name: 'id', type: 'string', required: true, description: 'Unique ID' },
        ],
      })

      expect(result).toContain('<table>')
      expect(result).toContain('<thead>')
      expect(result).toContain('<tbody>')
      expect(result).toContain('<th>Property</th>')
      expect(result).toContain('<code>id</code>')
      expect(result).toContain('<code>string</code>')
      expect(result).toContain('✓')
      expect(result).toContain('Unique ID')
    })

    it('should handle optional properties', () => {
      const result = toHTML({
        name: 'Test',
        properties: [{ name: 'optional', type: 'string', required: false }],
      })

      expect(result).toContain('<td></td>')
    })

    it('should use default type string', () => {
      const result = toHTML({
        name: 'Test',
        properties: [{ name: 'field' }],
      })

      expect(result).toContain('<code>string</code>')
    })
  })

  describe('sections', () => {
    it('should render sections with h2', () => {
      const result = toHTML({
        name: 'API',
        sections: [{ name: 'Overview', content: 'This is an overview.' }],
      })

      expect(result).toContain('<section>')
      expect(result).toContain('<h2>Overview</h2>')
      expect(result).toContain('<p>This is an overview.</p>')
    })

    it('should use div when semantic is false', () => {
      const result = toHTML(
        {
          name: 'API',
          sections: [{ name: 'Section' }],
        },
        { semantic: false }
      )

      expect(result).not.toContain('<section>')
      expect(result).toContain('<div>')
    })

    it('should handle sections without content', () => {
      const result = toHTML({
        name: 'API',
        sections: [{ name: 'Empty' }],
      })

      expect(result).toContain('<h2>Empty</h2>')
      expect(result).not.toContain('<p></p>')
    })
  })

  describe('items list', () => {
    it('should render items as ul', () => {
      const result = toHTML({ items: ['First', 'Second', 'Third'] })

      expect(result).toContain('<ul>')
      expect(result).toContain('<li>First</li>')
      expect(result).toContain('<li>Second</li>')
      expect(result).toContain('<li>Third</li>')
      expect(result).toContain('</ul>')
    })

    it('should escape HTML in items', () => {
      const result = toHTML({ items: ['<b>bold</b>'] })
      expect(result).toContain('&lt;b&gt;bold&lt;/b&gt;')
    })

    it('should handle numeric items', () => {
      const result = toHTML({ items: [1, 2, 3] })
      expect(result).toContain('<li>1</li>')
    })
  })

  describe('other properties as dl', () => {
    it('should render extra properties as definition list', () => {
      const result = toHTML({ email: 'test@example.com', phone: '555-1234' })

      expect(result).toContain('<dl>')
      expect(result).toContain('<dt>email</dt>')
      expect(result).toContain('<dd')
      expect(result).toContain('test@example.com')
    })

    it('should add itemprop with kebab-case', () => {
      const result = toHTML({ phoneNumber: '555-1234' })
      expect(result).toContain('itemprop="phone-number"')
    })

    it('should not render known properties in dl', () => {
      const result = toHTML({
        name: 'Test',
        description: 'Desc',
        email: 'test@example.com',
      })

      // name and description should not be in dl
      expect(result.match(/<dt>name<\/dt>/)).toBeNull()
      expect(result.match(/<dt>description<\/dt>/)).toBeNull()
      // email should be in dl
      expect(result).toContain('<dt>email</dt>')
    })
  })

  describe('type inference', () => {
    it('should infer Person type', () => {
      const result = toHTML({ name: 'John', email: 'john@example.com', jobTitle: 'Engineer' })
      expect(result).toContain('itemtype="https://schema.org/Person"')
    })

    it('should infer Organization type', () => {
      const result = toHTML({ name: 'Acme', email: 'info@acme.com' })
      expect(result).toContain('itemtype="https://schema.org/Organization"')
    })

    it('should use explicit itemtype', () => {
      const result = toHTML({ name: 'Test' }, { itemtype: 'Product' })
      expect(result).toContain('itemtype="https://schema.org/Product"')
    })

    it('should default to Thing', () => {
      const result = toHTML({ foo: 'bar' })
      expect(result).toContain('itemtype="https://schema.org/Thing"')
    })
  })

  describe('document wrapper', () => {
    it('should wrap in full document', () => {
      const result = toHTML({ name: 'Test' }, { document: true })

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html lang="en">')
      expect(result).toContain('<head>')
      expect(result).toContain('<meta charset="UTF-8">')
      expect(result).toContain('<title>Test</title>')
      expect(result).toContain('</body>')
      expect(result).toContain('</html>')
    })

    it('should not wrap by default', () => {
      const result = toHTML({ name: 'Test' })
      expect(result).not.toContain('<!DOCTYPE')
    })
  })

  describe('formatting options', () => {
    it('should pretty print by default', () => {
      const result = toHTML({ name: 'Test' })
      expect(result).toContain('\n')
    })

    it('should not pretty print when disabled', () => {
      const result = toHTML({ name: 'Test' }, { pretty: false })
      expect(result).not.toContain('\n')
    })

    it('should use custom indentation', () => {
      const result = toHTML(
        { name: 'Test', items: ['Item'] },
        { indent: '    ' }
      )
      expect(result).toContain('    <ul>')
    })
  })

  describe('edge cases', () => {
    it('should handle empty object', () => {
      const result = toHTML({})
      expect(result).toContain('<article')
      expect(result).toContain('</article>')
    })

    it('should handle unicode', () => {
      const result = toHTML({ name: '客户 🎉' })
      expect(result).toContain('客户 🎉')
    })

    it('should handle empty arrays', () => {
      const result = toHTML({ items: [], properties: [], sections: [] })
      // Empty arrays still render their container elements
      expect(result).toContain('<article')
      expect(result).toContain('</article>')
    })
  })
})

// =============================================================================
// fromHTML Tests
// =============================================================================

describe('fromHTML', () => {
  describe('basic extraction', () => {
    it('should extract name from h1', () => {
      const result = fromHTML('<h1>Customer</h1>')
      expect(result.name).toBe('Customer')
    })

    it('should extract description from p with itemprop', () => {
      const result = fromHTML('<p itemprop="description">A customer entity</p>')
      expect(result.description).toBe('A customer entity')
    })

    it('should extract description from first p', () => {
      const result = fromHTML('<h1>Test</h1><p>Description here</p>')
      expect(result.description).toBe('Description here')
    })
  })

  describe('list extraction', () => {
    it('should extract list items', () => {
      const result = fromHTML('<ul><li>First</li><li>Second</li></ul>')
      expect(result.items).toEqual(['First', 'Second'])
    })

    it('should handle empty list', () => {
      const result = fromHTML('<ul></ul>')
      expect(result.items).toBeUndefined()
    })
  })

  describe('table extraction', () => {
    it('should extract properties from table', () => {
      const html = `
        <table>
          <tbody>
            <tr>
              <td><code>id</code></td>
              <td><code>string</code></td>
              <td>✓</td>
              <td>Unique ID</td>
            </tr>
          </tbody>
        </table>
      `
      const result = fromHTML(html)
      expect(result.properties).toHaveLength(1)
      expect(result.properties[0]).toEqual({
        name: 'id',
        type: 'string',
        required: true,
        description: 'Unique ID',
      })
    })

    it('should handle optional properties', () => {
      const html = `
        <tbody>
          <tr>
            <td>name</td>
            <td>string</td>
            <td></td>
            <td>Name field</td>
          </tr>
        </tbody>
      `
      const result = fromHTML(html)
      expect(result.properties[0].required).toBe(false)
    })
  })

  describe('definition list extraction', () => {
    it('should extract from dl', () => {
      const html = '<dl><dt>email</dt><dd>test@example.com</dd></dl>'
      const result = fromHTML(html)
      expect(result.email).toBe('test@example.com')
    })

    it('should handle multiple dt/dd pairs', () => {
      const html = '<dl><dt>a</dt><dd>1</dd><dt>b</dt><dd>2</dd></dl>'
      const result = fromHTML(html)
      expect(result.a).toBe('1')
      expect(result.b).toBe('2')
    })
  })

  describe('section extraction', () => {
    it('should extract sections', () => {
      const html = '<section><h2>Overview</h2><p>Content here</p></section>'
      const result = fromHTML(html)
      expect(result.sections).toHaveLength(1)
      expect(result.sections[0]).toEqual({
        name: 'Overview',
        content: 'Content here',
      })
    })

    it('should handle sections without content', () => {
      const html = '<section><h2>Empty</h2></section>'
      const result = fromHTML(html)
      expect(result.sections[0].name).toBe('Empty')
      expect(result.sections[0].content).toBeUndefined()
    })
  })

  describe('round-trip', () => {
    it('should round-trip simple entity', () => {
      const original = { name: 'Customer', description: 'A customer' }
      const html = toHTML(original)
      const parsed = fromHTML(html)

      expect(parsed.name).toBe(original.name)
      expect(parsed.description).toBe(original.description)
    })

    it('should round-trip entity with items', () => {
      const original = { name: 'List', items: ['A', 'B', 'C'] }
      const html = toHTML(original)
      const parsed = fromHTML(html)

      expect(parsed.items).toEqual(original.items)
    })
  })

  describe('edge cases', () => {
    it('should handle empty HTML', () => {
      const result = fromHTML('')
      expect(result).toEqual({})
    })

    it('should handle HTML with no structured data', () => {
      const result = fromHTML('<div>Random content</div>')
      expect(result).toEqual({})
    })

    it('should handle nested HTML', () => {
      const result = fromHTML('<article><h1>Test</h1></article>')
      expect(result.name).toBe('Test')
    })
  })
})

// =============================================================================
// toJSONLDScript Tests
// =============================================================================

describe('toJSONLDScript', () => {
  it('should generate script tag', () => {
    const result = toJSONLDScript({ name: 'Test' })
    expect(result).toContain('<script type="application/ld+json">')
    expect(result).toContain('</script>')
  })

  it('should include @context', () => {
    const result = toJSONLDScript({ name: 'Test' })
    expect(result).toContain('"@context": "https://schema.org"')
  })

  it('should include @type', () => {
    const result = toJSONLDScript({ name: 'Test' }, { type: 'Product' })
    expect(result).toContain('"@type": "Product"')
  })

  it('should infer type from data', () => {
    const result = toJSONLDScript({ name: 'John', email: 'john@example.com', jobTitle: 'Dev' })
    expect(result).toContain('"@type": "Person"')
  })

  it('should include data properties', () => {
    const result = toJSONLDScript({ name: 'Product', price: 99.99 })
    expect(result).toContain('"name": "Product"')
    expect(result).toContain('"price": 99.99')
  })

  it('should pretty print JSON', () => {
    const result = toJSONLDScript({ name: 'Test' })
    expect(result).toContain('\n')
  })
})

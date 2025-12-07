import { describe, it, expect } from 'vitest'
import {
  PDF,
  toMarkdown,
  toJSONLD,
  toDocument,
  search,
} from './index.js'
import type { PDFDocument } from './index.js'

// =============================================================================
// Format Object Tests
// =============================================================================

describe('PDF Format Object', () => {
  it('should have correct metadata', () => {
    expect(PDF.name).toBe('pdf')
    expect(PDF.mimeTypes).toContain('application/pdf')
    expect(PDF.extensions).toContain('pdf')
  })

  it('should be marked as readonly', () => {
    expect(PDF.readonly).toBe(true)
  })

  it('should not have stringify method', () => {
    expect((PDF as any).stringify).toBeUndefined()
  })
})

// =============================================================================
// Utility Functions Tests
// =============================================================================

describe('toMarkdown', () => {
  it('should convert PDF document to markdown', () => {
    const doc: PDFDocument = {
      text: 'This is the content.',
      numPages: 1,
      metadata: {},
      info: {
        Title: 'Test Document',
        Author: 'Test Author',
      },
    }

    const result = toMarkdown(doc)
    expect(result).toContain('# Test Document')
    expect(result).toContain('Author: Test Author')
    expect(result).toContain('This is the content.')
  })

  it('should handle document without title', () => {
    const doc: PDFDocument = {
      text: 'Content only.',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = toMarkdown(doc)
    expect(result).toContain('Content only.')
    expect(result).not.toContain('#')
  })

  it('should include subject if present', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {
        Subject: 'Test Subject',
      },
    }

    const result = toMarkdown(doc)
    expect(result).toContain('Subject: Test Subject')
  })
})

describe('toJSONLD', () => {
  it('should convert to JSON-LD DigitalDocument', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 5,
      metadata: {},
      info: {
        Title: 'Test Doc',
        Author: 'John Doe',
      },
    }

    const result = toJSONLD(doc)
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('DigitalDocument')
    expect(result.name).toBe('Test Doc')
    expect(result.numberOfPages).toBe(5)
    expect(result.text).toBe('Content')
  })

  it('should include author as Person', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {
        Author: 'Jane Doe',
      },
    }

    const result = toJSONLD(doc)
    expect(result.author).toEqual({
      '@type': 'Person',
      name: 'Jane Doe',
    })
  })

  it('should include @id when provided', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = toJSONLD(doc, { id: 'doc-123' })
    expect(result['@id']).toBe('doc-123')
  })

  it('should include keywords', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {
        Keywords: 'test, pdf, document',
      },
    }

    const result = toJSONLD(doc)
    expect(result.keywords).toBe('test, pdf, document')
  })

  it('should include dates', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {
        CreationDate: '2024-01-01',
        ModDate: '2024-06-01',
      },
    }

    const result = toJSONLD(doc)
    expect(result.dateCreated).toBe('2024-01-01')
    expect(result.dateModified).toBe('2024-06-01')
  })
})

describe('toDocument', () => {
  it('should convert to structured document', () => {
    const doc: PDFDocument = {
      text: 'Full content here',
      numPages: 3,
      metadata: { custom: 'value' },
      info: {
        Title: 'My Document',
        Author: 'Author Name',
      },
      pages: ['Page 1', 'Page 2', 'Page 3'],
    }

    const result = toDocument(doc)
    expect(result.title).toBe('My Document')
    expect(result.author).toBe('Author Name')
    expect(result.content).toBe('Full content here')
    expect(result.pages).toEqual(['Page 1', 'Page 2', 'Page 3'])
    expect(result.metadata.numPages).toBe(3)
    expect(result.metadata.custom).toBe('value')
  })

  it('should handle missing optional fields', () => {
    const doc: PDFDocument = {
      text: 'Content',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = toDocument(doc)
    expect(result.title).toBeUndefined()
    expect(result.author).toBeUndefined()
    expect(result.content).toBe('Content')
    expect(result.pages).toEqual([])
  })
})

describe('search', () => {
  it('should find matches in document', () => {
    const doc: PDFDocument = {
      text: 'The quick brown fox jumps over the lazy dog. The fox is quick.',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'fox')
    expect(result.count).toBe(2)
    expect(result.matches).toHaveLength(2)
  })

  it('should be case-insensitive by default', () => {
    const doc: PDFDocument = {
      text: 'Hello World HELLO world',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'hello')
    expect(result.count).toBe(2)
  })

  it('should respect case sensitivity option', () => {
    const doc: PDFDocument = {
      text: 'Hello World HELLO world',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'Hello', { caseSensitive: true })
    expect(result.count).toBe(1)
  })

  it('should return empty results when no matches', () => {
    const doc: PDFDocument = {
      text: 'No matching content here',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'xyz')
    expect(result.count).toBe(0)
    expect(result.matches).toEqual([])
  })

  it('should include context around matches', () => {
    const doc: PDFDocument = {
      text: 'Before the keyword is here and after',
      numPages: 1,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'keyword')
    expect(result.matches[0]?.text).toContain('Before')
    expect(result.matches[0]?.text).toContain('after')
  })
})

// =============================================================================
// Edge Cases
// =============================================================================

describe('edge cases', () => {
  it('should handle empty document in toMarkdown', () => {
    const doc: PDFDocument = {
      text: '',
      numPages: 0,
      metadata: {},
      info: {},
    }

    const result = toMarkdown(doc)
    expect(result).toBe('')
  })

  it('should handle empty document in search', () => {
    const doc: PDFDocument = {
      text: '',
      numPages: 0,
      metadata: {},
      info: {},
    }

    const result = search(doc, 'test')
    expect(result.count).toBe(0)
  })

  it('should handle unicode content', () => {
    const doc: PDFDocument = {
      text: '客户文档 🎉 测试内容',
      numPages: 1,
      metadata: {},
      info: {
        Title: '中文标题',
      },
    }

    const result = search(doc, '客户')
    expect(result.count).toBe(1)
  })
})

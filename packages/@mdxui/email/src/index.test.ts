import { describe, it, expect } from 'vitest'
import { toEmail, renderToHtml, renderToText } from './index.js'
import type { MDXLDDocument, EmailRenderOptions } from './index.js'

describe('@mdxui/email', () => {
  const sampleDoc: MDXLDDocument = {
    id: 'https://example.com/email/welcome',
    type: 'EmailMessage',
    data: {
      title: 'Welcome Email',
      subject: 'Welcome to our platform!',
      previewText: 'Get started with your new account',
    },
    content: 'Welcome to our platform! We are excited to have you here.',
  }

  describe('toEmail', () => {
    it('should render MDXLD document to email output', async () => {
      const result = await toEmail(sampleDoc)

      expect(result).toHaveProperty('html')
      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('subject')
      expect(result).toHaveProperty('previewText')
    })

    it('should extract subject from document data', async () => {
      const result = await toEmail(sampleDoc)

      expect(result.subject).toBe('Welcome to our platform!')
    })

    it('should extract previewText from document data', async () => {
      const result = await toEmail(sampleDoc)

      expect(result.previewText).toBe('Get started with your new account')
    })

    it('should include content in HTML output', async () => {
      const result = await toEmail(sampleDoc)

      expect(result.html).toContain('Welcome to our platform!')
      expect(result.html).toContain('We are excited to have you here')
    })

    it('should include content in text output', async () => {
      const result = await toEmail(sampleDoc)

      expect(result.text).toContain('Welcome to our platform!')
    })

    it('should handle document without subject', async () => {
      const docWithoutSubject: MDXLDDocument = {
        data: {},
        content: 'Simple email content',
      }

      const result = await toEmail(docWithoutSubject)

      expect(result.subject).toBeUndefined()
      expect(result.html).toContain('Simple email content')
    })

    it('should use title as fallback in email', async () => {
      const docWithTitle: MDXLDDocument = {
        data: {
          title: 'My Email Title',
        },
        content: 'Email body content',
      }

      const result = await toEmail(docWithTitle)

      expect(result.html).toContain('My Email Title')
    })

    it('should support plainText option', async () => {
      const result = await toEmail(sampleDoc, { plainText: true })

      expect(result.text).toBeDefined()
      expect(typeof result.text).toBe('string')
    })

    it('should support disabling plainText', async () => {
      const result = await toEmail(sampleDoc, { plainText: false })

      expect(result.text).toBeUndefined()
    })

    it('should support pretty option', async () => {
      const prettyResult = await toEmail(sampleDoc, { pretty: true })
      const compactResult = await toEmail(sampleDoc, { pretty: false })

      expect(prettyResult.html).toBeTruthy()
      expect(compactResult.html).toBeTruthy()
      // Pretty output should generally be longer due to formatting
      expect(prettyResult.html.length).toBeGreaterThanOrEqual(compactResult.html.length)
    })

    it('should handle document with only content', async () => {
      const minimalDoc: MDXLDDocument = {
        data: {},
        content: 'Minimal email',
      }

      const result = await toEmail(minimalDoc)

      expect(result.html).toContain('Minimal email')
      expect(result.subject).toBeUndefined()
    })

    it('should handle empty content', async () => {
      const emptyDoc: MDXLDDocument = {
        data: { subject: 'Test' },
        content: '',
      }

      const result = await toEmail(emptyDoc)

      expect(result.html).toBeDefined()
      expect(result.subject).toBe('Test')
    })

    it('should render valid HTML structure', async () => {
      const result = await toEmail(sampleDoc)

      // Check for basic HTML structure
      expect(result.html).toContain('<html')
      expect(result.html).toContain('</html>')
      expect(result.html).toContain('<head')
      expect(result.html).toContain('<body')
    })
  })

  describe('renderToHtml', () => {
    it('should return only HTML string', async () => {
      const html = await renderToHtml(sampleDoc)

      expect(typeof html).toBe('string')
      expect(html).toContain('Welcome to our platform!')
    })

    it('should produce same HTML as toEmail', async () => {
      const html = await renderToHtml(sampleDoc)
      const fullResult = await toEmail(sampleDoc)

      expect(html).toBe(fullResult.html)
    })

    it('should respect options', async () => {
      const options: EmailRenderOptions = { pretty: false }
      const html = await renderToHtml(sampleDoc, options)

      expect(typeof html).toBe('string')
      expect(html.length).toBeGreaterThan(0)
    })
  })

  describe('renderToText', () => {
    it('should return only plain text string', async () => {
      const text = await renderToText(sampleDoc)

      expect(typeof text).toBe('string')
      expect(text).toContain('Welcome to our platform!')
    })

    it('should not contain HTML tags', async () => {
      const text = await renderToText(sampleDoc)

      // Plain text should not have HTML tags
      expect(text).not.toMatch(/<[^>]+>/)
    })

    it('should handle empty content gracefully', async () => {
      const emptyDoc: MDXLDDocument = {
        data: {},
        content: '',
      }

      const text = await renderToText(emptyDoc)

      expect(typeof text).toBe('string')
    })
  })

  describe('complex documents', () => {
    it('should handle document with multiple data fields', async () => {
      const complexDoc: MDXLDDocument = {
        id: 'https://example.com/newsletter',
        type: ['EmailMessage', 'Newsletter'],
        context: 'https://schema.org',
        data: {
          title: 'Monthly Newsletter',
          subject: 'Your Monthly Update',
          previewText: 'Latest news and updates',
          author: 'Newsletter Team',
          date: '2024-01-15',
        },
        content: 'Here are this months top stories...',
      }

      const result = await toEmail(complexDoc)

      expect(result.subject).toBe('Your Monthly Update')
      expect(result.previewText).toBe('Latest news and updates')
      expect(result.html).toContain('Here are this months top stories')
    })

    it('should handle long content', async () => {
      const longContent = 'Lorem ipsum '.repeat(100)
      const longDoc: MDXLDDocument = {
        data: { subject: 'Long Email' },
        content: longContent,
      }

      const result = await toEmail(longDoc)

      expect(result.html).toContain('Lorem ipsum')
      expect(result.text).toContain('Lorem ipsum')
    })

    it('should handle special characters in content', async () => {
      const specialDoc: MDXLDDocument = {
        data: { subject: 'Special Characters: &lt;&gt;&amp;' },
        content: 'Content with <tags> & special "characters"',
      }

      const result = await toEmail(specialDoc)

      expect(result.html).toBeDefined()
      expect(result.subject).toContain('Special Characters')
    })
  })
})

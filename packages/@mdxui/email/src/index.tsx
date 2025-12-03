/**
 * @mdxui/email - Render MDXLD documents to email HTML using React Email
 */

import { render } from '@react-email/render'
import type { ReactElement } from 'react'

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

export interface EmailRenderOptions {
  /** Include doctype and html wrapper */
  pretty?: boolean
  /** Plain text version */
  plainText?: boolean
  /** Custom React Email components */
  components?: Record<string, React.ComponentType<unknown>>
}

export interface EmailOutput {
  html: string
  text?: string
  subject?: string
  previewText?: string
}

/**
 * Render an MDXLD document to email HTML
 */
export async function toEmail(
  doc: MDXLDDocument,
  options: EmailRenderOptions = {}
): Promise<EmailOutput> {
  const { pretty = true, plainText = true } = options

  // Extract email-specific frontmatter
  const subject = doc.data.subject as string | undefined
  const previewText = doc.data.previewText as string | undefined

  // Build email component from document
  const emailElement = await buildEmailElement(doc, options)

  // Render to HTML
  const html = await render(emailElement, { pretty })

  // Optionally render plain text version
  let text: string | undefined
  if (plainText) {
    text = await render(emailElement, { plainText: true })
  }

  return {
    html,
    text,
    subject,
    previewText,
  }
}

/**
 * Render only the HTML string (convenience function)
 */
export async function renderToHtml(
  doc: MDXLDDocument,
  options: EmailRenderOptions = {}
): Promise<string> {
  const result = await toEmail(doc, options)
  return result.html
}

/**
 * Render only the plain text version
 */
export async function renderToText(
  doc: MDXLDDocument,
  options: EmailRenderOptions = {}
): Promise<string> {
  const emailElement = await buildEmailElement(doc, options)
  return render(emailElement, { plainText: true })
}

/**
 * Build React Email element from MDXLD document
 */
async function buildEmailElement(
  doc: MDXLDDocument,
  _options: EmailRenderOptions
): Promise<ReactElement> {
  // This is a placeholder - actual implementation would:
  // 1. Parse the MDX content
  // 2. Map MDX components to React Email components
  // 3. Apply email-specific styling

  // For now, return a simple HTML email
  const { Html, Head, Body, Container, Text } = await import('@react-email/components')

  const title = (doc.data.title as string) || (doc.data.subject as string) || 'Email'

  return (
    <Html>
      <Head>
        <title>{title}</title>
      </Head>
      <Body style={{ fontFamily: 'sans-serif', padding: '20px' }}>
        <Container>
          <Text>{doc.content}</Text>
        </Container>
      </Body>
    </Html>
  ) as ReactElement
}

// Re-export React Email components for convenience
export {
  Html,
  Head,
  Body,
  Container,
  Section,
  Row,
  Column,
  Text,
  Link,
  Button,
  Img,
  Hr,
  Heading,
  Preview,
  Tailwind,
} from '@react-email/components'

// Types are already exported where they are declared above

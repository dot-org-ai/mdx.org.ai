# @mdxui/email

Render MDXLD documents to email HTML using React Email.

## Installation

```bash
npm install @mdxui/email
# or
pnpm add @mdxui/email
# or
yarn add @mdxui/email
```

## Features

- **Email Rendering** - Convert MDXLD documents to email-safe HTML
- **React Email** - Built on React Email components
- **Plain Text** - Automatic plain text version generation
- **Component Mapping** - Map MDX components to email components
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { toEmail } from '@mdxui/email'

const doc = parse(`---
$type: Newsletter
subject: Weekly Update
previewText: Check out what's new this week
---

# Weekly Update

Hello **subscriber**!

Here's what's new this week:

- New feature launched
- Bug fixes
- Performance improvements

[Read more](https://example.com/blog)
`)

const { html, text, subject, previewText } = await toEmail(doc)

// Send with your email provider
await sendEmail({
  to: 'user@example.com',
  subject,
  html,
  text,
})
```

## API Reference

### `toEmail(doc, options?)`

Render an MDXLD document to email HTML.

```typescript
function toEmail(
  doc: MDXLDDocument,
  options?: EmailRenderOptions
): Promise<EmailOutput>

interface EmailRenderOptions {
  pretty?: boolean      // Format HTML output (default: true)
  plainText?: boolean   // Generate plain text version (default: true)
  components?: Record<string, React.ComponentType>  // Custom components
}

interface EmailOutput {
  html: string          // Email HTML
  text?: string         // Plain text version
  subject?: string      // From frontmatter
  previewText?: string  // From frontmatter
}
```

### `renderToHtml(doc, options?)`

Convenience function to get just the HTML string.

```typescript
const html = await renderToHtml(doc)
```

### `renderToText(doc, options?)`

Get just the plain text version.

```typescript
const text = await renderToText(doc)
```

## Email Components

The package re-exports React Email components:

```typescript
import {
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
} from '@mdxui/email'
```

## Custom Email Templates

Create custom email templates with React Email components:

```tsx
import { Html, Head, Body, Container, Text, Button } from '@mdxui/email'

function WelcomeEmail({ name, link }) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Text>Welcome, {name}!</Text>
          <Button href={link}>Get Started</Button>
        </Container>
      </Body>
    </Html>
  )
}
```

## Examples

### Newsletter Template

```typescript
import { parse } from 'mdxld'
import { toEmail } from '@mdxui/email'

const newsletter = parse(`---
$type: Newsletter
subject: "March 2024 Newsletter"
previewText: "New features, updates, and more"
---

# March Newsletter

## What's New

We've been busy shipping new features:

### Feature Highlights

- **Dark Mode** - Now available across all platforms
- **API v2** - Faster and more reliable
- **Mobile App** - Download now

## Community Spotlight

Thanks to our amazing community members!

[Join our Discord](https://discord.gg/example)

---

You're receiving this because you subscribed at example.com
`)

const email = await toEmail(newsletter)
```

### Transactional Email

```typescript
const orderConfirmation = parse(`---
$type: TransactionalEmail
subject: "Order Confirmed #{{orderId}}"
---

# Order Confirmed

Thank you for your order!

**Order Number:** {{orderId}}
**Total:** {{total}}

We'll send you a shipping confirmation once your order is on its way.

[View Order]({{orderUrl}})
`)

const email = await toEmail(orderConfirmation, {
  // Template variables would be replaced during rendering
})
```

## Types

### `MDXLDDocument`

```typescript
interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxui/html](https://www.npmjs.com/package/@mdxui/html) | HTML rendering |
| [react-email](https://react.email) | React Email framework |

## License

MIT

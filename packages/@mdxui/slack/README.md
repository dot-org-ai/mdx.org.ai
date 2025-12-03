# @mdxui/slack

Render MDXLD documents to Slack Block Kit format.

## Installation

```bash
npm install @mdxui/slack
# or
pnpm add @mdxui/slack
# or
yarn add @mdxui/slack
```

## Features

- **Block Kit Output** - Convert MDXLD documents to Slack blocks
- **Markdown → mrkdwn** - Automatic markdown to Slack mrkdwn conversion
- **Fallback Text** - Plain text fallback for notifications
- **Rich Formatting** - Headers, sections, dividers, actions
- **Type-Safe** - Full TypeScript support

## Quick Start

```typescript
import { parse } from 'mdxld'
import { toSlack } from '@mdxui/slack'

const doc = parse(`---
$type: Notification
title: Deployment Complete
author: CI/CD Bot
---

# Deployment Complete

**Production** deployment finished successfully.

## Changes
- Fixed login bug
- Added dark mode
- Performance improvements

---

View the [deployment logs](https://example.com/logs)
`)

const message = toSlack(doc)
// {
//   blocks: [...],
//   text: "Deployment Complete..."
// }

// Send to Slack
await slack.chat.postMessage({
  channel: '#deployments',
  ...message,
})
```

## API Reference

### `toSlack(doc, options?)`

Render an MDXLD document to Slack Block Kit format.

```typescript
function toSlack(
  doc: MDXLDDocument,
  options?: SlackRenderOptions
): SlackMessage

interface SlackRenderOptions {
  includeFallback?: boolean  // Include text fallback (default: true)
  renderers?: Record<string, (node: unknown) => SlackBlock | SlackBlock[]>
  unfurlLinks?: boolean
  unfurlMedia?: boolean
}

interface SlackMessage {
  blocks: SlackBlock[]
  text?: string  // Fallback text
  attachments?: SlackAttachment[]
}
```

### `createActionsBlock(buttons)`

Create an actions block with buttons.

```typescript
import { createActionsBlock } from '@mdxui/slack'

const actions = createActionsBlock([
  { text: 'Approve', actionId: 'approve', style: 'primary' },
  { text: 'Reject', actionId: 'reject', style: 'danger' },
  { text: 'View Details', actionId: 'view', url: 'https://example.com' },
])
```

### `createImageBlock(imageUrl, altText, title?)`

Create an image block.

```typescript
import { createImageBlock } from '@mdxui/slack'

const image = createImageBlock(
  'https://example.com/chart.png',
  'Monthly metrics chart',
  'Performance Metrics'
)
```

## Block Types

The converter supports these block types:

| Markdown | Slack Block |
|----------|-------------|
| `# Heading` | Header block |
| `## Subheading` | Section with bold text |
| Paragraphs | Section blocks |
| `---` | Divider |
| Links | mrkdwn links |
| **Bold** | *Bold* (mrkdwn) |
| *Italic* | _Italic_ (mrkdwn) |
| `code` | `code` (preserved) |
| ~~strike~~ | ~strike~ (mrkdwn) |

## Examples

### Alert Notification

```typescript
const alert = parse(`---
$type: Alert
title: High CPU Usage
severity: warning
---

# High CPU Usage Detected

Server **prod-api-1** is experiencing high CPU usage.

- Current: **92%**
- Threshold: 80%
- Duration: 5 minutes

[View Dashboard](https://monitoring.example.com)
`)

const message = toSlack(alert)

// Add action buttons
message.blocks.push(createActionsBlock([
  { text: 'Acknowledge', actionId: 'ack', style: 'primary' },
  { text: 'Snooze 1hr', actionId: 'snooze' },
  { text: 'View Logs', actionId: 'logs', url: 'https://logs.example.com' },
]))
```

### Daily Standup

```typescript
const standup = parse(`---
$type: Standup
title: Daily Standup
author: John Doe
---

# Daily Standup - John Doe

## Yesterday
- Completed user authentication feature
- Fixed 3 bugs in the dashboard

## Today
- Starting payment integration
- Code review for PR #123

## Blockers
- Waiting on API docs from third-party vendor
`)

const message = toSlack(standup)
```

### Deployment Summary

```typescript
const deployment = parse(`---
$type: Deployment
title: v2.1.0 Released
environment: production
---

# v2.1.0 Released to Production

## Changes
- New user dashboard
- Performance improvements
- Bug fixes

## Stats
- Build time: 2m 34s
- Tests passed: 142/142
- Coverage: 87%

---

Deployed by CI/CD Pipeline
`)

const message = toSlack(deployment)
```

## Types

### `SlackBlock`

```typescript
interface SlackBlock {
  type: string
  [key: string]: unknown
}
```

### `SlackMessage`

```typescript
interface SlackMessage {
  blocks: SlackBlock[]
  text?: string
  attachments?: SlackAttachment[]
}
```

### `SlackAttachment`

```typescript
interface SlackAttachment {
  color?: string
  blocks?: SlackBlock[]
  fallback?: string
}
```

## Related Packages

| Package | Description |
|---------|-------------|
| [mdxld](https://www.npmjs.com/package/mdxld) | MDX + Linked Data parser |
| [@mdxui/json](https://www.npmjs.com/package/@mdxui/json) | JSON output |
| [@slack/web-api](https://www.npmjs.com/package/@slack/web-api) | Slack Web API |

## License

MIT

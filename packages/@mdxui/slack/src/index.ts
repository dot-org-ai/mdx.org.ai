/**
 * @mdxui/slack - Render MDXLD documents to Slack Block Kit format
 */

export interface MDXLDDocument {
  id?: string
  type?: string | string[]
  context?: string | Record<string, unknown>
  data: Record<string, unknown>
  content: string
}

// Slack Block Kit types
export interface SlackBlock {
  type: string
  [key: string]: unknown
}

export interface SlackMessage {
  blocks: SlackBlock[]
  text?: string // Fallback text
  attachments?: SlackAttachment[]
}

export interface SlackAttachment {
  color?: string
  blocks?: SlackBlock[]
  fallback?: string
}

export interface SlackRenderOptions {
  /** Include fallback text */
  includeFallback?: boolean
  /** Custom block renderers */
  renderers?: Record<string, (node: unknown) => SlackBlock | SlackBlock[]>
  /** Unfurl links */
  unfurlLinks?: boolean
  /** Unfurl media */
  unfurlMedia?: boolean
}

/**
 * Render an MDXLD document to Slack Block Kit format
 */
export function toSlack(
  doc: MDXLDDocument,
  options: SlackRenderOptions = {}
): SlackMessage {
  const { includeFallback = true } = options

  const blocks: SlackBlock[] = []

  // Add header if title exists
  if (doc.data.title) {
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: String(doc.data.title),
        emoji: true,
      },
    })
  }

  // Parse markdown content to blocks
  const contentBlocks = markdownToBlocks(doc.content)
  blocks.push(...contentBlocks)

  // Add context block with metadata if available
  if (doc.type || doc.data.author) {
    const elements: Array<{ type: string; text: string }> = []

    if (doc.type) {
      elements.push({
        type: 'mrkdwn',
        text: `*Type:* ${Array.isArray(doc.type) ? doc.type.join(', ') : doc.type}`,
      })
    }

    if (doc.data.author) {
      elements.push({
        type: 'mrkdwn',
        text: `*Author:* ${doc.data.author}`,
      })
    }

    if (elements.length > 0) {
      blocks.push({
        type: 'context',
        elements,
      })
    }
  }

  const message: SlackMessage = { blocks }

  // Add fallback text
  if (includeFallback) {
    message.text = doc.data.title
      ? `${doc.data.title}\n\n${stripMarkdown(doc.content)}`
      : stripMarkdown(doc.content)
  }

  return message
}

/**
 * Convert markdown to Slack blocks
 */
function markdownToBlocks(markdown: string): SlackBlock[] {
  const blocks: SlackBlock[] = []
  const lines = markdown.split('\n')

  let currentSection = ''

  for (const line of lines) {
    // Headers become header blocks
    if (line.startsWith('# ')) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()))
        currentSection = ''
      }
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: line.slice(2),
          emoji: true,
        },
      })
    }
    // Subheaders (##, ###) become bold text in sections
    else if (line.match(/^#{2,6}\s/)) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()))
        currentSection = ''
      }
      const text = line.replace(/^#+\s/, '')
      blocks.push(createSectionBlock(`*${text}*`))
    }
    // Horizontal rules become dividers
    else if (line.match(/^[-*_]{3,}$/)) {
      if (currentSection) {
        blocks.push(createSectionBlock(currentSection.trim()))
        currentSection = ''
      }
      blocks.push({ type: 'divider' })
    }
    // Code blocks
    else if (line.startsWith('```')) {
      // TODO: Handle code blocks properly
      currentSection += line + '\n'
    }
    // Regular text
    else {
      currentSection += line + '\n'
    }
  }

  // Add remaining content
  if (currentSection.trim()) {
    blocks.push(createSectionBlock(currentSection.trim()))
  }

  return blocks
}

/**
 * Create a section block with mrkdwn text
 */
function createSectionBlock(text: string): SlackBlock {
  // Convert markdown to Slack mrkdwn
  const mrkdwn = markdownToMrkdwn(text)

  return {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: mrkdwn,
    },
  }
}

/**
 * Convert standard markdown to Slack mrkdwn format
 */
function markdownToMrkdwn(markdown: string): string {
  return markdown
    // Bold: **text** or __text__ → *text*
    .replace(/\*\*(.+?)\*\*/g, '*$1*')
    .replace(/__(.+?)__/g, '*$1*')
    // Italic: *text* or _text_ → _text_ (Slack uses _ for italic)
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_')
    // Links: [text](url) → <url|text>
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>')
    // Inline code stays the same
    // Strikethrough: ~~text~~ → ~text~
    .replace(/~~(.+?)~~/g, '~$1~')
}

/**
 * Strip markdown formatting for plain text
 */
function stripMarkdown(markdown: string): string {
  return markdown
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/[-*_]{3,}/g, '---')
    .trim()
}

/**
 * Create an action block with buttons
 */
export function createActionsBlock(
  buttons: Array<{
    text: string
    actionId: string
    url?: string
    style?: 'primary' | 'danger'
  }>
): SlackBlock {
  return {
    type: 'actions',
    elements: buttons.map((btn) => ({
      type: btn.url ? 'button' : 'button',
      text: {
        type: 'plain_text',
        text: btn.text,
        emoji: true,
      },
      action_id: btn.actionId,
      ...(btn.url && { url: btn.url }),
      ...(btn.style && { style: btn.style }),
    })),
  }
}

/**
 * Create an image block
 */
export function createImageBlock(
  imageUrl: string,
  altText: string,
  title?: string
): SlackBlock {
  return {
    type: 'image',
    image_url: imageUrl,
    alt_text: altText,
    ...(title && {
      title: {
        type: 'plain_text',
        text: title,
        emoji: true,
      },
    }),
  }
}

// Types are already exported where they are declared above

'use client'
/**
 * Card View Component for Payload Collections
 *
 * Renders collection documents as cards instead of table rows.
 * Ideal for media-heavy collections or when you want a visual overview.
 */

import { useMemo } from 'react'
import type { CardData, CardViewConfig, CardSize } from './types.js'

/**
 * Props for the CardView component
 */
interface CardViewProps {
  docs: Array<Record<string, unknown>>
  config: CardViewConfig
  collectionConfig: {
    slug: string
    admin?: {
      useAsTitle?: string
      [key: string]: unknown
    }
    fields: Array<{
      name?: string
      type: string
      label?: string
      [key: string]: unknown
    }>
  }
  onCardClick?: (doc: Record<string, unknown>) => void
}

/**
 * Get the best field for a given purpose
 */
function findField(
  fields: Array<{ name?: string; type: string; label?: string }>,
  purpose: 'title' | 'subtitle' | 'image',
  explicit?: string
): string | undefined {
  if (explicit) return explicit

  // Priority patterns for each purpose
  const patterns: Record<string, string[]> = {
    title: ['title', 'name', 'label', 'heading', 'subject'],
    subtitle: ['subtitle', 'description', 'summary', 'excerpt', 'content'],
    image: ['image', 'thumbnail', 'cover', 'photo', 'avatar', 'picture', 'media'],
  }

  const priorityNames = patterns[purpose] || []

  // First try exact matches
  for (const name of priorityNames) {
    const field = fields.find((f) => f.name?.toLowerCase() === name)
    if (field?.name) return field.name
  }

  // Then try partial matches
  for (const name of priorityNames) {
    const field = fields.find((f) => f.name?.toLowerCase().includes(name))
    if (field?.name) return field.name
  }

  // Fallback by type
  if (purpose === 'title') {
    const textField = fields.find((f) => f.type === 'text' && f.name)
    if (textField?.name) return textField.name
  }

  if (purpose === 'subtitle') {
    const textareaField = fields.find((f) => f.type === 'textarea' && f.name)
    if (textareaField?.name) return textareaField.name
    const richTextField = fields.find((f) => f.type === 'richText' && f.name)
    if (richTextField?.name) return richTextField.name
  }

  if (purpose === 'image') {
    const uploadField = fields.find((f) => f.type === 'upload' && f.name)
    if (uploadField?.name) return uploadField.name
  }

  return undefined
}

/**
 * Extract card data from a document
 */
function extractCardData(
  doc: Record<string, unknown>,
  config: CardViewConfig,
  fields: Array<{ name?: string; type: string; label?: string }>
): CardData {
  const titleField = findField(fields, 'title', config.titleField)
  const subtitleField = findField(fields, 'subtitle', config.subtitleField)
  const imageField = findField(fields, 'image', config.imageField)

  // Extract title
  let title = 'Untitled'
  if (titleField && doc[titleField]) {
    title = String(doc[titleField])
  } else if (doc.id) {
    title = String(doc.id)
  }

  // Extract subtitle
  let subtitle: string | undefined
  if (subtitleField && doc[subtitleField]) {
    const rawSubtitle = String(doc[subtitleField])
    // Truncate long text
    subtitle = rawSubtitle.length > 150 ? `${rawSubtitle.slice(0, 150)}...` : rawSubtitle
  }

  // Extract image URL
  let image: string | undefined
  if (imageField && doc[imageField]) {
    const imageValue = doc[imageField]
    if (typeof imageValue === 'string') {
      image = imageValue
    } else if (typeof imageValue === 'object' && imageValue !== null) {
      // Handle Payload upload relation
      const imageObj = imageValue as Record<string, unknown>
      image = (imageObj.url as string) || (imageObj.filename as string)
    }
  }

  // Extract meta fields
  const meta: CardData['meta'] = []
  if (config.metaFields) {
    for (const fieldName of config.metaFields) {
      if (doc[fieldName] !== undefined && doc[fieldName] !== null) {
        const field = fields.find((f) => f.name === fieldName)
        meta.push({
          label: field?.label || fieldName,
          value: doc[fieldName] as string | number | boolean,
        })
      }
    }
  }

  return {
    id: String(doc.id || ''),
    title,
    subtitle,
    image,
    meta,
    raw: doc,
  }
}

/**
 * Get grid columns based on size and explicit config
 */
function getGridColumns(size: CardSize, explicit?: number | 'auto'): string {
  if (typeof explicit === 'number') {
    return `repeat(${explicit}, 1fr)`
  }

  // Responsive columns based on size
  switch (size) {
    case 'small':
      return 'repeat(auto-fill, minmax(200px, 1fr))'
    case 'large':
      return 'repeat(auto-fill, minmax(350px, 1fr))'
    default:
      return 'repeat(auto-fill, minmax(280px, 1fr))'
  }
}

/**
 * Single Card Component
 */
function Card({
  data,
  size,
  showLabels,
  onClick,
}: {
  data: CardData
  size: CardSize
  showLabels: boolean
  onClick?: () => void
}) {
  const cardStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid var(--theme-elevation-150, #e0e0e0)',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: 'var(--theme-elevation-0, #fff)',
    cursor: onClick ? 'pointer' : 'default',
    transition: 'box-shadow 0.2s, transform 0.2s',
  }

  const cardHoverStyle = onClick
    ? {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        transform: 'translateY(-2px)',
      }
    : {}

  const imageHeight = size === 'small' ? '120px' : size === 'large' ? '200px' : '160px'
  const padding = size === 'small' ? '12px' : size === 'large' ? '20px' : '16px'

  return (
    <div
      style={cardStyle}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          Object.assign(e.currentTarget.style, cardHoverStyle)
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = ''
          e.currentTarget.style.transform = ''
        }
      }}
    >
      {/* Image */}
      {data.image && (
        <div
          style={{
            height: imageHeight,
            backgroundColor: 'var(--theme-elevation-100, #f5f5f5)',
            backgroundImage: `url(${data.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}

      {/* Content */}
      <div style={{ padding, flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Title */}
        <h3
          style={{
            margin: 0,
            fontSize: size === 'small' ? '14px' : size === 'large' ? '18px' : '16px',
            fontWeight: 600,
            color: 'var(--theme-elevation-1000, #000)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {data.title}
        </h3>

        {/* Subtitle */}
        {data.subtitle && (
          <p
            style={{
              margin: 0,
              fontSize: size === 'small' ? '12px' : '14px',
              color: 'var(--theme-elevation-600, #666)',
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: size === 'large' ? 4 : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.subtitle}
          </p>
        )}

        {/* Meta fields */}
        {data.meta.length > 0 && (
          <div
            style={{
              marginTop: 'auto',
              paddingTop: '8px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            {data.meta.map((item, i) => (
              <span
                key={i}
                style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--theme-elevation-100, #f0f0f0)',
                  color: 'var(--theme-elevation-700, #555)',
                }}
              >
                {showLabels && <strong>{item.label}: </strong>}
                {String(item.value)}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * CardView Component
 *
 * Renders a grid of cards for collection documents.
 */
export function CardView({ docs, config, collectionConfig, onCardClick }: CardViewProps) {
  const size = config.size || 'medium'
  const showLabels = config.showLabels ?? false

  // Extract card data from all documents
  const cards = useMemo(
    () => docs.map((doc) => extractCardData(doc, config, collectionConfig.fields)),
    [docs, config, collectionConfig.fields]
  )

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: getGridColumns(size, config.columns),
    gap: size === 'small' ? '12px' : size === 'large' ? '24px' : '16px',
    padding: '16px',
  }

  if (cards.length === 0) {
    return (
      <div
        style={{
          padding: '48px',
          textAlign: 'center',
          color: 'var(--theme-elevation-500, #888)',
        }}
      >
        No documents found
      </div>
    )
  }

  return (
    <div style={gridStyle}>
      {cards.map((card) => (
        <Card
          key={card.id}
          data={card}
          size={size}
          showLabels={showLabels}
          onClick={onCardClick ? () => onCardClick(card.raw) : undefined}
        />
      ))}
    </div>
  )
}

export default CardView

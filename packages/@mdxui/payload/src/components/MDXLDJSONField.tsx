'use client'
/**
 * MDX-LD JSON Field Component for Payload CMS
 *
 * A custom field component that replaces Payload's default JSON field
 * with the MDX-LD editor for enhanced editing of structured content.
 *
 * @example
 * ```ts
 * // payload.config.ts
 * import { MDXLDJSONField } from '@mdxui/payload'
 *
 * const myCollection = {
 *   slug: 'posts',
 *   fields: [
 *     {
 *       name: 'content',
 *       type: 'json',
 *       admin: {
 *         components: {
 *           Field: MDXLDJSONField,
 *         },
 *       },
 *     },
 *   ],
 * }
 * ```
 */

import { useCallback, useMemo } from 'react'
import { MDXLDEditor } from './MDXLDEditor.js'
import { stringify, parse } from 'mdxld'
import type { EditorMode, MDXLDDocument } from '../types.js'

/**
 * Field label component
 */
function FieldLabel({
  label,
  required,
}: {
  label?: string
  required?: boolean
}) {
  if (!label) return null

  return (
    <label
      style={{
        display: 'block',
        marginBottom: '8px',
        fontWeight: 500,
        fontSize: '14px',
      }}
    >
      {label}
      {required && (
        <span style={{ color: 'var(--theme-error-500, #ef4444)', marginLeft: '4px' }}>*</span>
      )}
    </label>
  )
}

/**
 * Field description component
 */
function FieldDescription({ description }: { description?: string }) {
  if (!description) return null

  return (
    <p
      style={{
        margin: '8px 0 0 0',
        fontSize: '12px',
        color: 'var(--theme-elevation-500, #666)',
      }}
    >
      {description}
    </p>
  )
}

/**
 * Props for the Payload JSON field
 */
interface PayloadFieldProps {
  path: string
  name: string
  label?: string | false
  description?: string
  required?: boolean
  value?: unknown
  onChange?: (value: unknown) => void
  showError?: boolean
  errorMessage?: string
  admin?: {
    description?: string
    components?: {
      Field?: React.ComponentType<unknown>
      Cell?: React.ComponentType<unknown>
    }
    [key: string]: unknown
  }
  custom?: {
    mdxldEditor?: boolean
    editorMode?: EditorMode
    [key: string]: unknown
  }
}

/**
 * Convert JSON value to MDXLD string for editing
 */
function jsonToMDXLD(value: unknown): string {
  if (!value) return ''
  if (typeof value === 'string') return value

  // If it's already an MDXLDDocument-like object, stringify it
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>

    // Check if it looks like an MDXLD document
    if ('content' in obj || 'data' in obj || '$type' in obj || 'type' in obj) {
      try {
        return stringify(obj as unknown as MDXLDDocument)
      } catch {
        // Fall through to JSON stringify
      }
    }

    // Otherwise, create a simple MDXLD with the JSON in data
    try {
      const doc: MDXLDDocument = {
        data: obj,
        content: '',
      }
      return stringify(doc)
    } catch {
      // Fall back to raw JSON
      return JSON.stringify(value, null, 2)
    }
  }

  return String(value)
}

/**
 * Convert MDXLD string back to JSON for storage
 */
function mdxldToJSON(mdxld: string): unknown {
  if (!mdxld.trim()) return null

  try {
    const doc = parse(mdxld)

    // Return the full document structure
    return {
      ...(doc.id && { $id: doc.id }),
      ...(doc.type && { $type: doc.type }),
      ...(doc.context && { $context: doc.context }),
      ...doc.data,
      ...(doc.content && { content: doc.content }),
    }
  } catch {
    // If parsing fails, try as raw JSON
    try {
      return JSON.parse(mdxld)
    } catch {
      // Return as string if nothing works
      return mdxld
    }
  }
}

/**
 * MDX-LD JSON Field Component
 *
 * Drop-in replacement for Payload's JSON field that uses the MDX-LD editor.
 */
export function MDXLDJSONField(props: PayloadFieldProps) {
  const {
    path,
    name,
    label,
    description,
    required,
    value,
    onChange,
    showError,
    errorMessage,
    custom,
  } = props

  const useMdxldEditor = custom?.mdxldEditor !== false
  const editorMode = custom?.editorMode || 'split'

  // Convert value to MDXLD string
  const mdxldValue = useMemo(() => jsonToMDXLD(value), [value])

  // Handle editor changes
  const handleChange = useCallback(
    (newValue: string) => {
      if (onChange) {
        const jsonValue = mdxldToJSON(newValue)
        onChange(jsonValue)
      }
    },
    [onChange]
  )

  // If mdxld editor is disabled, render a simple textarea
  if (!useMdxldEditor) {
    return (
      <div style={{ marginBottom: '24px' }}>
        {label !== false && <FieldLabel label={typeof label === 'string' ? label : name} required={required} />}
        <textarea
          name={name}
          value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
          onChange={(e) => {
            try {
              onChange?.(JSON.parse(e.target.value))
            } catch {
              onChange?.(e.target.value)
            }
          }}
          style={{
            width: '100%',
            minHeight: '200px',
            padding: '12px',
            fontFamily: 'monospace',
            fontSize: '13px',
            border: `1px solid ${showError ? 'var(--theme-error-500, #ef4444)' : 'var(--theme-elevation-200, #e0e0e0)'}`,
            borderRadius: '4px',
            resize: 'vertical',
          }}
        />
        {showError && errorMessage && (
          <p style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: '12px', margin: '4px 0 0 0' }}>
            {errorMessage}
          </p>
        )}
        <FieldDescription description={description} />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      {label !== false && <FieldLabel label={typeof label === 'string' ? label : name} required={required} />}
      <div
        style={{
          border: showError ? '1px solid var(--theme-error-500, #ef4444)' : undefined,
          borderRadius: '4px',
        }}
      >
        <MDXLDEditor
          value={mdxldValue}
          onChange={handleChange}
          mode={editorMode}
          minHeight={250}
          validate
        />
      </div>
      {showError && errorMessage && (
        <p style={{ color: 'var(--theme-error-500, #ef4444)', fontSize: '12px', margin: '4px 0 0 0' }}>
          {errorMessage}
        </p>
      )}
      <FieldDescription description={description || props.admin?.description} />
    </div>
  )
}

/**
 * Cell renderer for the JSON field in list view
 */
export function MDXLDJSONCell({ cellData }: { cellData: unknown }) {
  const preview = useMemo(() => {
    if (!cellData) return '-'
    if (typeof cellData === 'string') {
      return cellData.length > 50 ? `${cellData.slice(0, 50)}...` : cellData
    }
    const str = JSON.stringify(cellData)
    return str.length > 50 ? `${str.slice(0, 50)}...` : str
  }, [cellData])

  return (
    <span
      style={{
        fontFamily: 'monospace',
        fontSize: '12px',
        color: 'var(--theme-elevation-600, #555)',
      }}
    >
      {preview}
    </span>
  )
}

export default MDXLDJSONField

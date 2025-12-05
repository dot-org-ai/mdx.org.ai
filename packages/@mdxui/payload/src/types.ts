/**
 * Types for @mdxui/payload components
 */

/**
 * MDX-LD document structure
 */
export interface MDXLDDocument {
  /**
   * JSON-LD @id field
   */
  id?: string

  /**
   * JSON-LD @type field
   */
  type?: string | string[]

  /**
   * JSON-LD @context field
   */
  context?: string | string[] | Record<string, unknown>

  /**
   * Frontmatter data (excluding JSON-LD fields)
   */
  data: Record<string, unknown>

  /**
   * Markdown/MDX content body
   */
  content: string
}

/**
 * Editor mode
 */
export type EditorMode = 'yaml' | 'json' | 'mdx' | 'split'

/**
 * Editor theme
 */
export type EditorTheme = 'light' | 'dark' | 'system'

/**
 * MDX-LD Editor props
 */
export interface MDXLDEditorProps {
  /**
   * Current value (raw MDXLD string)
   */
  value: string

  /**
   * Change handler
   */
  onChange: (value: string) => void

  /**
   * Editor mode
   * @default 'split'
   */
  mode?: EditorMode

  /**
   * Editor theme
   * @default 'system'
   */
  theme?: EditorTheme

  /**
   * Placeholder text
   */
  placeholder?: string

  /**
   * Whether the editor is disabled
   */
  disabled?: boolean

  /**
   * Minimum height in pixels
   * @default 300
   */
  minHeight?: number

  /**
   * Maximum height in pixels
   */
  maxHeight?: number

  /**
   * Show line numbers
   * @default true
   */
  lineNumbers?: boolean

  /**
   * Enable syntax validation
   * @default true
   */
  validate?: boolean

  /**
   * Additional CSS class name
   */
  className?: string
}

/**
 * JSON Field component props (extends Payload's field props)
 */
export interface MDXLDJSONFieldProps {
  /**
   * Field path
   */
  path: string

  /**
   * Field name
   */
  name: string

  /**
   * Field label
   */
  label?: string

  /**
   * Field description
   */
  description?: string

  /**
   * Whether the field is required
   */
  required?: boolean

  /**
   * Whether to show as MDXLD editor
   * @default true
   */
  mdxldEditor?: boolean

  /**
   * Editor mode for MDXLD editor
   */
  editorMode?: EditorMode
}

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Error message
   */
  message: string

  /**
   * Line number (1-indexed)
   */
  line?: number

  /**
   * Column number (1-indexed)
   */
  column?: number

  /**
   * Error type
   */
  type: 'yaml' | 'json' | 'mdx' | 'schema'
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether the content is valid
   */
  valid: boolean

  /**
   * Validation errors (if any)
   */
  errors: ValidationError[]

  /**
   * Parsed document (if valid)
   */
  document?: MDXLDDocument
}

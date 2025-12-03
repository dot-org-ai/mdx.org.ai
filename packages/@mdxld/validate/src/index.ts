/**
 * @mdxld/validate - Validate MDXLD documents against schemas
 *
 * Provides validation functions for MDXLD documents:
 * - validate: Validate document against a schema
 * - validateFrontmatter: Validate frontmatter properties
 * - createValidator: Create a reusable validator
 * - defineSchema: Define a validation schema
 *
 * @packageDocumentation
 */

import type { MDXLDDocument } from 'mdxld'

/**
 * Validation error with details
 */
export interface ValidationError {
  /** Error path (dot notation) */
  path: string

  /** Error message */
  message: string

  /** Expected value or type */
  expected?: string

  /** Actual value received */
  actual?: unknown
}

/**
 * Result of validation
 */
export interface ValidationResult {
  /** Whether the document is valid */
  valid: boolean

  /** List of validation errors */
  errors: ValidationError[]

  /** Warnings (non-fatal issues) */
  warnings: ValidationError[]
}

/**
 * Schema field definition
 */
export interface FieldSchema {
  /** Field type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date' | 'url' | 'email'

  /** Whether the field is required */
  required?: boolean

  /** Default value if not provided */
  default?: unknown

  /** Minimum value (for numbers) or length (for strings/arrays) */
  min?: number

  /** Maximum value (for numbers) or length (for strings/arrays) */
  max?: number

  /** Regex pattern (for strings) */
  pattern?: string

  /** Allowed values (enum) */
  enum?: unknown[]

  /** Array item schema (for arrays) */
  items?: FieldSchema

  /** Object property schemas (for objects) */
  properties?: Record<string, FieldSchema>

  /** Custom validation function */
  validate?: (value: unknown) => boolean | string
}

/**
 * Document validation schema
 */
export interface DocumentSchema {
  /** Schema name/identifier */
  name?: string

  /** Schema description */
  description?: string

  /** Required @type value(s) */
  type?: string | string[]

  /** Required @context value */
  context?: string

  /** Frontmatter field schemas */
  fields?: Record<string, FieldSchema>

  /** Whether to allow additional fields not in schema */
  additionalFields?: boolean

  /** Content validation rules */
  content?: {
    /** Minimum content length */
    minLength?: number
    /** Maximum content length */
    maxLength?: number
    /** Required patterns in content */
    requiredPatterns?: RegExp[]
    /** Forbidden patterns in content */
    forbiddenPatterns?: RegExp[]
  }
}

/**
 * Define a validation schema
 *
 * @param schema - Schema definition
 * @returns Validated schema object
 *
 * @example
 * ```ts
 * const blogPostSchema = defineSchema({
 *   name: 'BlogPost',
 *   type: 'BlogPosting',
 *   context: 'https://schema.org',
 *   fields: {
 *     title: { type: 'string', required: true, min: 1, max: 200 },
 *     author: { type: 'string', required: true },
 *     datePublished: { type: 'date', required: true },
 *     tags: { type: 'array', items: { type: 'string' } },
 *   },
 * })
 * ```
 */
export function defineSchema(schema: DocumentSchema): DocumentSchema {
  return schema
}

/**
 * Validate a value against a field schema
 */
function validateField(value: unknown, schema: FieldSchema, path: string): ValidationError[] {
  const errors: ValidationError[] = []

  // Check required
  if (value === undefined || value === null) {
    if (schema.required) {
      errors.push({ path, message: 'Field is required', expected: schema.type })
    }
    return errors
  }

  // Type validation
  const actualType = Array.isArray(value) ? 'array' : typeof value

  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push({ path, message: `Expected string, got ${actualType}`, expected: 'string', actual: value })
        return errors
      }
      if (schema.min !== undefined && value.length < schema.min) {
        errors.push({ path, message: `String length must be at least ${schema.min}`, actual: value.length })
      }
      if (schema.max !== undefined && value.length > schema.max) {
        errors.push({ path, message: `String length must be at most ${schema.max}`, actual: value.length })
      }
      if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
        errors.push({ path, message: `String must match pattern: ${schema.pattern}`, actual: value })
      }
      break

    case 'number':
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({ path, message: `Expected number, got ${actualType}`, expected: 'number', actual: value })
        return errors
      }
      if (schema.min !== undefined && value < schema.min) {
        errors.push({ path, message: `Value must be at least ${schema.min}`, actual: value })
      }
      if (schema.max !== undefined && value > schema.max) {
        errors.push({ path, message: `Value must be at most ${schema.max}`, actual: value })
      }
      break

    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push({ path, message: `Expected boolean, got ${actualType}`, expected: 'boolean', actual: value })
      }
      break

    case 'array':
      if (!Array.isArray(value)) {
        errors.push({ path, message: `Expected array, got ${actualType}`, expected: 'array', actual: value })
        return errors
      }
      if (schema.min !== undefined && value.length < schema.min) {
        errors.push({ path, message: `Array must have at least ${schema.min} items`, actual: value.length })
      }
      if (schema.max !== undefined && value.length > schema.max) {
        errors.push({ path, message: `Array must have at most ${schema.max} items`, actual: value.length })
      }
      if (schema.items) {
        value.forEach((item, index) => {
          errors.push(...validateField(item, schema.items!, `${path}[${index}]`))
        })
      }
      break

    case 'object':
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({ path, message: `Expected object, got ${actualType}`, expected: 'object', actual: value })
        return errors
      }
      if (schema.properties) {
        const obj = value as Record<string, unknown>
        for (const [key, fieldSchema] of Object.entries(schema.properties)) {
          errors.push(...validateField(obj[key], fieldSchema, `${path}.${key}`))
        }
      }
      break

    case 'date':
      if (typeof value === 'string') {
        const date = new Date(value)
        if (isNaN(date.getTime())) {
          errors.push({ path, message: 'Invalid date format', expected: 'date', actual: value })
        }
      } else if (!(value instanceof Date)) {
        errors.push({ path, message: `Expected date, got ${actualType}`, expected: 'date', actual: value })
      }
      break

    case 'url':
      if (typeof value !== 'string') {
        errors.push({ path, message: `Expected URL string, got ${actualType}`, expected: 'url', actual: value })
      } else {
        try {
          new URL(value)
        } catch {
          errors.push({ path, message: 'Invalid URL format', expected: 'url', actual: value })
        }
      }
      break

    case 'email':
      if (typeof value !== 'string') {
        errors.push({ path, message: `Expected email string, got ${actualType}`, expected: 'email', actual: value })
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        errors.push({ path, message: 'Invalid email format', expected: 'email', actual: value })
      }
      break
  }

  // Enum validation
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({ path, message: `Value must be one of: ${schema.enum.join(', ')}`, actual: value })
  }

  // Custom validation
  if (schema.validate) {
    const result = schema.validate(value)
    if (result !== true) {
      errors.push({ path, message: typeof result === 'string' ? result : 'Custom validation failed', actual: value })
    }
  }

  return errors
}

/**
 * Validate frontmatter against field schemas
 *
 * @param frontmatter - Frontmatter object to validate
 * @param fields - Field schema definitions
 * @returns Validation result
 */
export function validateFrontmatter(
  frontmatter: Record<string, unknown>,
  fields: Record<string, FieldSchema>
): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  for (const [fieldName, schema] of Object.entries(fields)) {
    errors.push(...validateField(frontmatter[fieldName], schema, fieldName))
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate an MDXLD document against a schema
 *
 * @param document - Document to validate
 * @param schema - Validation schema
 * @returns Validation result
 *
 * @example
 * ```ts
 * import { validate, defineSchema } from '@mdxld/validate'
 * import { parse } from 'mdxld'
 *
 * const schema = defineSchema({
 *   type: 'BlogPosting',
 *   fields: {
 *     title: { type: 'string', required: true },
 *   },
 * })
 *
 * const doc = parse(mdxContent)
 * const result = validate(doc, schema)
 *
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */
export function validate(document: MDXLDDocument, schema: DocumentSchema): ValidationResult {
  const errors: ValidationError[] = []
  const warnings: ValidationError[] = []

  // Validate @type
  if (schema.type) {
    const expectedTypes = Array.isArray(schema.type) ? schema.type : [schema.type]
    const docType = document.type
    const docTypes = docType ? (Array.isArray(docType) ? docType : [docType]) : []

    if (!docType) {
      errors.push({
        path: '@type',
        message: `Document must have @type: ${expectedTypes.join(' or ')}`,
        expected: expectedTypes.join(' | '),
      })
    } else if (!docTypes.some(t => expectedTypes.includes(t))) {
      errors.push({
        path: '@type',
        message: `Expected @type to be ${expectedTypes.join(' or ')}, got ${docTypes.join(', ')}`,
        expected: expectedTypes.join(' | '),
        actual: docType,
      })
    }
  }

  // Validate @context
  if (schema.context) {
    const docContext = document.context

    if (!docContext) {
      errors.push({
        path: '@context',
        message: `Document must have @context: ${schema.context}`,
        expected: schema.context,
      })
    } else if (docContext !== schema.context) {
      errors.push({
        path: '@context',
        message: `Expected @context to be ${schema.context}, got ${docContext}`,
        expected: schema.context,
        actual: docContext,
      })
    }
  }

  // Validate frontmatter fields
  if (schema.fields) {
    const frontmatter = document.data || {}
    const fieldResult = validateFrontmatter(frontmatter, schema.fields)
    errors.push(...fieldResult.errors)
    warnings.push(...fieldResult.warnings)

    // Check for additional fields if not allowed
    if (schema.additionalFields === false) {
      const allowedFields = new Set(Object.keys(schema.fields))
      for (const key of Object.keys(frontmatter)) {
        if (!allowedFields.has(key) && !key.startsWith('@') && !key.startsWith('$')) {
          warnings.push({
            path: key,
            message: `Unknown field: ${key}`,
            actual: frontmatter[key],
          })
        }
      }
    }
  }

  // Validate content
  if (schema.content && document.content) {
    const content = document.content

    if (schema.content.minLength !== undefined && content.length < schema.content.minLength) {
      errors.push({
        path: 'content',
        message: `Content must be at least ${schema.content.minLength} characters`,
        actual: content.length,
      })
    }

    if (schema.content.maxLength !== undefined && content.length > schema.content.maxLength) {
      errors.push({
        path: 'content',
        message: `Content must be at most ${schema.content.maxLength} characters`,
        actual: content.length,
      })
    }

    if (schema.content.requiredPatterns) {
      for (const pattern of schema.content.requiredPatterns) {
        if (!pattern.test(content)) {
          errors.push({
            path: 'content',
            message: `Content must match pattern: ${pattern.source}`,
          })
        }
      }
    }

    if (schema.content.forbiddenPatterns) {
      for (const pattern of schema.content.forbiddenPatterns) {
        if (pattern.test(content)) {
          warnings.push({
            path: 'content',
            message: `Content should not match pattern: ${pattern.source}`,
          })
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Create a reusable validator for a schema
 *
 * @param schema - Validation schema
 * @returns Validator function
 *
 * @example
 * ```ts
 * const validateBlogPost = createValidator({
 *   type: 'BlogPosting',
 *   fields: {
 *     title: { type: 'string', required: true },
 *   },
 * })
 *
 * const result = validateBlogPost(document)
 * ```
 */
export function createValidator(schema: DocumentSchema): (document: MDXLDDocument) => ValidationResult {
  return (document: MDXLDDocument) => validate(document, schema)
}

/**
 * Check if a document is valid (simple boolean check)
 *
 * @param document - Document to validate
 * @param schema - Validation schema
 * @returns True if valid, false otherwise
 */
export function isValid(document: MDXLDDocument, schema: DocumentSchema): boolean {
  return validate(document, schema).valid
}

/**
 * Assert that a document is valid (throws on invalid)
 *
 * @param document - Document to validate
 * @param schema - Validation schema
 * @throws Error if document is invalid
 */
export function assertValid(document: MDXLDDocument, schema: DocumentSchema): void {
  const result = validate(document, schema)
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => `${e.path}: ${e.message}`).join('\n')
    throw new Error(`Document validation failed:\n${errorMessages}`)
  }
}

/**
 * Built-in schemas for common document types
 */
export const schemas = {
  /** Schema.org BlogPosting */
  BlogPosting: defineSchema({
    name: 'BlogPosting',
    type: 'BlogPosting',
    context: 'https://schema.org',
    fields: {
      title: { type: 'string', required: true, min: 1, max: 200 },
      author: { type: 'string', required: true },
      datePublished: { type: 'date', required: true },
      dateModified: { type: 'date' },
      description: { type: 'string', max: 500 },
      tags: { type: 'array', items: { type: 'string' } },
    },
  }),

  /** Schema.org Article */
  Article: defineSchema({
    name: 'Article',
    type: 'Article',
    context: 'https://schema.org',
    fields: {
      title: { type: 'string', required: true },
      author: { type: 'string', required: true },
      datePublished: { type: 'date' },
    },
  }),

  /** Schema.org HowTo */
  HowTo: defineSchema({
    name: 'HowTo',
    type: 'HowTo',
    context: 'https://schema.org',
    fields: {
      name: { type: 'string', required: true },
      description: { type: 'string' },
      totalTime: { type: 'string' },
    },
  }),

  /** Schema.org FAQPage */
  FAQPage: defineSchema({
    name: 'FAQPage',
    type: 'FAQPage',
    context: 'https://schema.org',
    fields: {
      name: { type: 'string' },
    },
  }),
}

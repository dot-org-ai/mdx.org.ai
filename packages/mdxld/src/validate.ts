/**
 * MDXLD Validation module using arktype
 *
 * This module provides runtime validation for MDXLD documents using arktype,
 * the lightest TypeScript-first validation library.
 *
 * @example
 * ```ts
 * import { validateDocument, createValidator } from 'mdxld/validate'
 * import { type } from 'arktype'
 *
 * // Validate a document
 * const result = validateDocument(doc)
 * if (result.success) {
 *   console.log(result.data) // MDXLDDocument
 * }
 *
 * // Create custom validator with typed data
 * const articleSchema = type({
 *   $type: '"Article"',
 *   headline: 'string',
 *   author: 'string',
 * })
 *
 * const validateArticle = createValidator(articleSchema)
 * ```
 *
 * @packageDocumentation
 */

import { type, Type } from 'arktype'
import type { MDXLDDocument, MDXLDData } from './types.js'

/**
 * Base schema for JSON-LD properties
 */
export const ldPropertiesSchema = type({
  '$id?': 'string',
  '$type?': 'string | string[]',
  '$context?': 'string | string[] | Record<string, unknown>',
})

/**
 * Base schema for MDXLDData (any additional properties allowed)
 */
export const mdxldDataSchema = type({
  '$id?': 'string',
  '$type?': 'string | string[]',
  '$context?': 'string | string[] | Record<string, unknown>',
}).and(type('Record<string, unknown>'))

/**
 * Schema for MDXLDDocument
 */
export const mdxldDocumentSchema = type({
  'id?': 'string',
  'type?': 'string | string[]',
  'context?': 'string | string[] | Record<string, unknown>',
  data: 'Record<string, unknown>',
  content: 'string',
})

/**
 * Validation result type
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; errors: string[] }

/**
 * Validate an MDXLDDocument
 *
 * @param doc - Document to validate
 * @returns Validation result with typed data or errors
 *
 * @example
 * ```ts
 * const result = validateDocument(doc)
 * if (result.success) {
 *   // result.data is MDXLDDocument
 * } else {
 *   console.error(result.errors)
 * }
 * ```
 */
export function validateDocument(doc: unknown): ValidationResult<MDXLDDocument> {
  const result = mdxldDocumentSchema(doc)
  if (result instanceof type.errors) {
    return {
      success: false,
      errors: result.map((e) => e.message),
    }
  }
  return {
    success: true,
    data: result as MDXLDDocument,
  }
}

/**
 * Validate only the data portion of a document
 *
 * @param data - Data object to validate
 * @returns Validation result
 */
export function validateData(data: unknown): ValidationResult<MDXLDData> {
  const result = mdxldDataSchema(data)
  if (result instanceof type.errors) {
    return {
      success: false,
      errors: result.map((e) => e.message),
    }
  }
  return {
    success: true,
    data: result as MDXLDData,
  }
}

/**
 * Create a validator function for typed data
 *
 * This allows extension packages to create validators for their specific types.
 *
 * @param dataSchema - arktype schema for the data type
 * @returns Validator function
 *
 * @example
 * ```ts
 * // In schema.org.ai package:
 * import { type } from 'arktype'
 * import { createValidator } from 'mdxld/validate'
 *
 * const articleDataSchema = type({
 *   $type: '"Article"',
 *   headline: 'string',
 *   author: 'string',
 *   'datePublished?': 'string',
 * })
 *
 * export const validateArticle = createValidator(articleDataSchema)
 * ```
 */
export function createValidator<T extends MDXLDData>(dataSchema: Type<T>) {
  const documentSchema = type({
    'id?': 'string',
    'type?': 'string | string[]',
    'context?': 'string | string[] | Record<string, unknown>',
    data: dataSchema,
    content: 'string',
  })

  return (doc: unknown): ValidationResult<MDXLDDocument<T>> => {
    const result = documentSchema(doc)
    if (result instanceof type.errors) {
      return {
        success: false,
        errors: result.map((e) => e.message),
      }
    }
    return {
      success: true,
      data: result as MDXLDDocument<T>,
    }
  }
}

/**
 * Create a data-only validator for typed data
 *
 * @param dataSchema - arktype schema for the data type
 * @returns Data validator function
 */
export function createDataValidator<T extends MDXLDData>(dataSchema: Type<T>) {
  return (data: unknown): ValidationResult<T> => {
    const result = dataSchema(data)
    if (result instanceof type.errors) {
      return {
        success: false,
        errors: result.map((e) => e.message),
      }
    }
    return {
      success: true,
      data: result as T,
    }
  }
}

/**
 * Check if document has a specific $type value
 *
 * @param doc - Document to check
 * @param expectedType - Expected type value
 * @returns true if document has the expected type
 */
export function hasType(doc: MDXLDDocument, expectedType: string): boolean {
  const docType = doc.type ?? doc.data.$type
  if (Array.isArray(docType)) {
    return docType.includes(expectedType)
  }
  return docType === expectedType
}

/**
 * Assert document has a specific type, throws if not
 *
 * @param doc - Document to check
 * @param expectedType - Expected type value
 * @throws Error if document doesn't have the expected type
 */
export function assertType(doc: MDXLDDocument, expectedType: string): void {
  if (!hasType(doc, expectedType)) {
    const actualType = doc.type ?? doc.data.$type ?? 'undefined'
    throw new Error(`Expected document type "${expectedType}" but got "${actualType}"`)
  }
}

/**
 * Create a discriminated union validator from multiple type schemas
 *
 * @param typeSchemas - Map of type name to data schema
 * @returns Validator that handles any of the defined types
 *
 * @example
 * ```ts
 * const schemaOrgValidator = createUnionValidator({
 *   Article: type({ $type: '"Article"', headline: 'string' }),
 *   Person: type({ $type: '"Person"', name: 'string' }),
 * })
 *
 * const result = schemaOrgValidator(doc)
 * ```
 */
export function createUnionValidator<T extends Record<string, Type<MDXLDData>>>(
  typeSchemas: T
): (doc: unknown) => ValidationResult<MDXLDDocument> {
  return (doc: unknown) => {
    // First validate basic document structure
    const baseResult = mdxldDocumentSchema(doc)
    if (baseResult instanceof type.errors) {
      return {
        success: false,
        errors: baseResult.map((e) => e.message),
      }
    }

    const document = baseResult as MDXLDDocument
    const docType = document.type ?? document.data.$type

    // Find matching schema
    const typeKey = Array.isArray(docType) ? docType[0] : docType
    if (!typeKey || !(typeKey in typeSchemas)) {
      return {
        success: false,
        errors: [`Unknown document type: ${typeKey}. Expected one of: ${Object.keys(typeSchemas).join(', ')}`],
      }
    }

    // Validate data against specific schema
    const schema = typeSchemas[typeKey]!
    const dataResult = schema(document.data)
    if (dataResult instanceof type.errors) {
      return {
        success: false,
        errors: dataResult.map((e) => e.message),
      }
    }

    return {
      success: true,
      data: document,
    }
  }
}

// Re-export arktype's type function for convenience
export { type } from 'arktype'

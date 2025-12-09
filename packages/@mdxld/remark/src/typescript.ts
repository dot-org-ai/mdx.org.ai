/**
 * @mdxld/remark/typescript - TypeScript import/export handling
 *
 * Parses TypeScript imports/exports and provides:
 * 1. Stripped JavaScript versions for acorn compatibility
 * 2. Full TypeScript AST for tooling (VSCode, type checking, etc.)
 *
 * @packageDocumentation
 */

import ts from 'typescript'

/**
 * Represents a parsed import specifier
 */
export interface ImportSpecifier {
  /** The imported name (or 'default' for default imports) */
  name: string
  /** Local alias if renamed */
  alias?: string
  /** Whether this is a type-only import */
  isType: boolean
}

/**
 * Represents a parsed import statement
 */
export interface ParsedImport {
  /** The module specifier (e.g., './types', 'react') */
  source: string
  /** Import specifiers */
  specifiers: ImportSpecifier[]
  /** Whether the entire import is type-only */
  isTypeOnly: boolean
  /** Original source text */
  original: string
  /** Stripped JavaScript version (type imports removed) */
  stripped: string
  /** TypeScript AST node */
  ast: ts.ImportDeclaration
  /** Position in source */
  position: { start: number; end: number }
}

/**
 * Represents a parsed export specifier
 */
export interface ExportSpecifier {
  /** The exported name */
  name: string
  /** Local name if different */
  localName?: string
  /** Whether this is a type-only export */
  isType: boolean
}

/**
 * Represents a parsed export statement
 */
export interface ParsedExport {
  /** Export specifiers (for named exports) */
  specifiers: ExportSpecifier[]
  /** Re-export source module (if any) */
  source?: string
  /** Whether the entire export is type-only */
  isTypeOnly: boolean
  /** Original source text */
  original: string
  /** Stripped JavaScript version */
  stripped: string
  /** TypeScript AST node */
  ast: ts.ExportDeclaration | ts.ExportAssignment
  /** Position in source */
  position: { start: number; end: number }
}

/**
 * Result of parsing TypeScript ESM statements
 */
export interface TypeScriptESMResult {
  /** Parsed imports with AST */
  imports: ParsedImport[]
  /** Parsed exports with AST */
  exports: ParsedExport[]
  /** Content with type imports/exports stripped for acorn */
  strippedContent: string
  /** Whether any TypeScript-specific syntax was found */
  hasTypeScript: boolean
}

/**
 * Parse a TypeScript import declaration
 */
function parseImport(node: ts.ImportDeclaration, sourceFile: ts.SourceFile): ParsedImport {
  const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text
  const specifiers: ImportSpecifier[] = []
  const isTypeOnly = node.importClause?.isTypeOnly ?? false

  if (node.importClause) {
    // Default import
    if (node.importClause.name) {
      specifiers.push({
        name: 'default',
        alias: node.importClause.name.text,
        isType: isTypeOnly,
      })
    }

    // Named imports
    if (node.importClause.namedBindings) {
      if (ts.isNamespaceImport(node.importClause.namedBindings)) {
        // import * as foo
        specifiers.push({
          name: '*',
          alias: node.importClause.namedBindings.name.text,
          isType: isTypeOnly,
        })
      } else if (ts.isNamedImports(node.importClause.namedBindings)) {
        // import { a, b as c }
        for (const element of node.importClause.namedBindings.elements) {
          specifiers.push({
            name: element.propertyName?.text ?? element.name.text,
            alias: element.propertyName ? element.name.text : undefined,
            isType: isTypeOnly || element.isTypeOnly,
          })
        }
      }
    }
  }

  const original = node.getText(sourceFile)
  const stripped = stripTypeOnlyImport(node, sourceFile, specifiers)

  return {
    source: moduleSpecifier,
    specifiers,
    isTypeOnly,
    original,
    stripped,
    ast: node,
    position: {
      start: node.getStart(sourceFile),
      end: node.getEnd(),
    },
  }
}

/**
 * Strip type-only imports from an import statement
 */
function stripTypeOnlyImport(
  node: ts.ImportDeclaration,
  sourceFile: ts.SourceFile,
  specifiers: ImportSpecifier[]
): string {
  // If entire import is type-only, strip completely
  if (node.importClause?.isTypeOnly) {
    return ''
  }

  // Check if all specifiers are type-only
  const valueSpecifiers = specifiers.filter((s) => !s.isType)
  if (valueSpecifiers.length === 0) {
    return ''
  }

  // If we have a mix, rebuild the import without type specifiers
  if (valueSpecifiers.length < specifiers.length) {
    const moduleSpecifier = (node.moduleSpecifier as ts.StringLiteral).text

    // Handle default import
    const defaultSpec = valueSpecifiers.find((s) => s.name === 'default')
    const namedSpecs = valueSpecifiers.filter((s) => s.name !== 'default' && s.name !== '*')
    const namespaceSpec = valueSpecifiers.find((s) => s.name === '*')

    let importClause = ''

    if (defaultSpec) {
      importClause = defaultSpec.alias ?? 'default'
    }

    if (namespaceSpec) {
      if (importClause) importClause += ', '
      importClause += `* as ${namespaceSpec.alias}`
    }

    if (namedSpecs.length > 0) {
      const namedPart = namedSpecs
        .map((s) => (s.alias && s.alias !== s.name ? `${s.name} as ${s.alias}` : s.name))
        .join(', ')
      if (importClause) importClause += ', '
      importClause += `{ ${namedPart} }`
    }

    return `import ${importClause} from '${moduleSpecifier}'`
  }

  // No type-only specifiers, return original
  return node.getText(sourceFile)
}

/**
 * Parse a TypeScript export declaration
 */
function parseExport(
  node: ts.ExportDeclaration | ts.ExportAssignment,
  sourceFile: ts.SourceFile
): ParsedExport {
  const specifiers: ExportSpecifier[] = []
  let source: string | undefined
  let isTypeOnly = false

  if (ts.isExportDeclaration(node)) {
    isTypeOnly = node.isTypeOnly
    source = node.moduleSpecifier
      ? (node.moduleSpecifier as ts.StringLiteral).text
      : undefined

    if (node.exportClause && ts.isNamedExports(node.exportClause)) {
      for (const element of node.exportClause.elements) {
        specifiers.push({
          name: element.name.text,
          localName: element.propertyName?.text,
          isType: isTypeOnly || element.isTypeOnly,
        })
      }
    }
  }

  const original = node.getText(sourceFile)
  const stripped = stripTypeOnlyExport(node, sourceFile, specifiers, isTypeOnly)

  return {
    specifiers,
    source,
    isTypeOnly,
    original,
    stripped,
    ast: node,
    position: {
      start: node.getStart(sourceFile),
      end: node.getEnd(),
    },
  }
}

/**
 * Strip type-only exports from an export statement
 */
function stripTypeOnlyExport(
  node: ts.ExportDeclaration | ts.ExportAssignment,
  sourceFile: ts.SourceFile,
  specifiers: ExportSpecifier[],
  isTypeOnly: boolean
): string {
  if (ts.isExportAssignment(node)) {
    return node.getText(sourceFile)
  }

  // If entire export is type-only, strip completely
  if (isTypeOnly) {
    return ''
  }

  // Check if all specifiers are type-only
  const valueSpecifiers = specifiers.filter((s) => !s.isType)
  if (valueSpecifiers.length === 0 && specifiers.length > 0) {
    return ''
  }

  // If we have a mix, rebuild the export without type specifiers
  if (valueSpecifiers.length < specifiers.length) {
    const namedPart = valueSpecifiers
      .map((s) => (s.localName ? `${s.localName} as ${s.name}` : s.name))
      .join(', ')

    const source = node.moduleSpecifier
      ? (node.moduleSpecifier as ts.StringLiteral).text
      : undefined

    if (source) {
      return `export { ${namedPart} } from '${source}'`
    }
    return `export { ${namedPart} }`
  }

  // No type-only specifiers, return original
  return node.getText(sourceFile)
}

/**
 * Parse TypeScript ESM statements from source code
 *
 * @param source - TypeScript/MDX source code
 * @returns Parsed imports/exports with both TypeScript AST and stripped JS versions
 *
 * @example
 * ```ts
 * import { parseTypeScriptESM } from '@mdxld/remark/typescript'
 *
 * const result = parseTypeScriptESM(`
 *   import type { Foo } from './types'
 *   import { Bar, type Baz } from './utils'
 *   export type { Qux }
 * `)
 *
 * // result.strippedContent - JS version for acorn
 * // result.imports[0].ast - Full TypeScript AST
 * // result.imports[0].specifiers[0].isType - true for type imports
 * ```
 */
export function parseTypeScriptESM(source: string): TypeScriptESMResult {
  const sourceFile = ts.createSourceFile(
    'input.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )

  const imports: ParsedImport[] = []
  const exports: ParsedExport[] = []
  let hasTypeScript = false

  // Track type-only declarations that need to be stripped entirely
  const typeOnlyDeclarations: Array<{ start: number; end: number }> = []

  // Traverse the source file
  ts.forEachChild(sourceFile, (node) => {
    if (ts.isImportDeclaration(node)) {
      const parsed = parseImport(node, sourceFile)
      imports.push(parsed)
      if (parsed.isTypeOnly || parsed.specifiers.some((s) => s.isType)) {
        hasTypeScript = true
      }
    } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      const parsed = parseExport(node, sourceFile)
      exports.push(parsed)
      if (parsed.isTypeOnly || parsed.specifiers.some((s) => s.isType)) {
        hasTypeScript = true
      }
    } else if (ts.isTypeAliasDeclaration(node)) {
      // Handle `export type X = ...` - type aliases with export modifier
      const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      if (hasExport) {
        hasTypeScript = true
        typeOnlyDeclarations.push({
          start: node.getStart(sourceFile),
          end: node.getEnd(),
        })
      }
    } else if (ts.isInterfaceDeclaration(node)) {
      // Handle `export interface X {...}` - interfaces with export modifier
      const hasExport = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      if (hasExport) {
        hasTypeScript = true
        typeOnlyDeclarations.push({
          start: node.getStart(sourceFile),
          end: node.getEnd(),
        })
      }
    }
  })

  // Build stripped content by replacing original statements with stripped versions
  let strippedContent = source
  const replacements: Array<{ start: number; end: number; replacement: string }> = []

  for (const imp of imports) {
    replacements.push({
      start: imp.position.start,
      end: imp.position.end,
      replacement: imp.stripped,
    })
  }

  for (const exp of exports) {
    replacements.push({
      start: exp.position.start,
      end: exp.position.end,
      replacement: exp.stripped,
    })
  }

  // Strip type-only declarations (type aliases, interfaces with export)
  for (const decl of typeOnlyDeclarations) {
    replacements.push({
      start: decl.start,
      end: decl.end,
      replacement: '',
    })
  }

  // Sort by position descending to replace from end to start
  replacements.sort((a, b) => b.start - a.start)

  for (const { start, end, replacement } of replacements) {
    strippedContent = strippedContent.slice(0, start) + replacement + strippedContent.slice(end)
  }

  return {
    imports,
    exports,
    strippedContent,
    hasTypeScript,
  }
}

/**
 * Extract all type information from imports/exports
 *
 * Useful for building type declarations or understanding dependencies
 */
export function extractTypeInfo(result: TypeScriptESMResult): {
  typeImports: Array<{ source: string; names: string[] }>
  valueImports: Array<{ source: string; names: string[] }>
  typeExports: string[]
  valueExports: string[]
} {
  const typeImports: Array<{ source: string; names: string[] }> = []
  const valueImports: Array<{ source: string; names: string[] }> = []

  for (const imp of result.imports) {
    const typeNames = imp.specifiers.filter((s) => s.isType).map((s) => s.alias ?? s.name)
    const valueNames = imp.specifiers.filter((s) => !s.isType).map((s) => s.alias ?? s.name)

    if (typeNames.length > 0) {
      typeImports.push({ source: imp.source, names: typeNames })
    }
    if (valueNames.length > 0) {
      valueImports.push({ source: imp.source, names: valueNames })
    }
  }

  const typeExports = result.exports
    .flatMap((e) => e.specifiers.filter((s) => s.isType).map((s) => s.name))

  const valueExports = result.exports
    .flatMap((e) => e.specifiers.filter((s) => !s.isType).map((s) => s.name))

  return { typeImports, valueImports, typeExports, valueExports }
}

/**
 * Check if a string contains TypeScript-specific import/export syntax
 */
export function hasTypeScriptImportExport(source: string): boolean {
  // Quick regex check before full parsing
  // Matches:
  // - import type { ... } or import type X from ...
  // - export type { ... }
  // - import { type Foo, ... } or import { Foo, type Bar }
  // - export type Foo = ...
  // - export interface Foo { ... }
  return /\bimport\s+type\b|\bexport\s+type\s+\{|\bexport\s+type\s+\w+\s*=|\bexport\s+interface\b|,\s*type\s+\w+|\{\s*type\s+\w+/.test(source)
}

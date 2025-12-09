# @mdxld/remark

Remark plugin for MDXLD with GFM support, TypeScript import/export parsing, mermaid diagram extraction, and code block attributes.

## Installation

```bash
pnpm add @mdxld/remark
```

## Features

- **GFM Support** - GitHub Flavored Markdown (tables, task lists, strikethrough, autolinks)
- **TypeScript Parsing** - Parse and strip TypeScript-specific syntax while preserving AST
- **Mermaid Extraction** - Extract and parse mermaid diagrams into structured AST
- **Code Block Attributes** - Parse code block attributes like `{title="example.ts"}`
- **Custom Code Handlers** - Register handlers for specific code block languages

## Usage

### Basic Usage

```typescript
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import { remarkMDXLD } from '@mdxld/remark'

const processor = unified()
  .use(remarkParse)
  .use(remarkMDXLD)

const file = await processor.process(mdxContent)

// Access extracted data
console.log(file.data.mdxld)
// {
//   typescript: { imports: [...], exports: [...], hasTypeScript: true },
//   mermaid: [{ source: '...', ast: {...}, position: {...} }],
//   codeBlocks: [{ lang: 'typescript', meta: {...}, value: '...' }]
// }
```

### With Options

```typescript
import { remarkMDXLD } from '@mdxld/remark'

processor.use(remarkMDXLD, {
  gfm: true,           // Enable GFM (default: true)
  typescript: true,    // Enable TypeScript parsing (default: true)
  mermaid: true,       // Enable mermaid extraction (default: true)
  attributes: true,    // Enable code block attributes (default: true)
  codeHandlers: {
    // Custom handler for specific languages
    sql: (node) => {
      console.log('SQL code:', node.value)
    }
  }
})
```

### Using Presets

```typescript
import { remarkMDXLD, presets } from '@mdxld/remark'

// Full features (default)
processor.use(remarkMDXLD, presets.full)

// Minimal - just GFM
processor.use(remarkMDXLD, presets.minimal)

// Documentation - GFM + mermaid + attributes
processor.use(remarkMDXLD, presets.docs)

// Code-focused - GFM + TypeScript + attributes
processor.use(remarkMDXLD, presets.code)
```

## TypeScript Parsing

Parse TypeScript import/export statements and extract type information:

```typescript
import {
  parseTypeScriptESM,
  extractTypeInfo,
  hasTypeScriptImportExport
} from '@mdxld/remark/typescript'

const source = `
import type { User } from './types'
import { useState } from 'react'
export type { User }
export const name = 'example'
`

// Check if content has TypeScript-specific syntax
if (hasTypeScriptImportExport(source)) {
  const result = parseTypeScriptESM(source)

  console.log(result.hasTypeScript) // true
  console.log(result.strippedContent) // Content with type imports removed

  // Get structured type info
  const info = extractTypeInfo(result)
  console.log(info.typeImports)
  // [{ source: './types', names: ['User'] }]

  console.log(info.valueImports)
  // [{ source: 'react', names: ['useState'] }]

  console.log(info.typeExports) // ['User']
  console.log(info.valueExports) // ['name']
}
```

### TypeScript Result Structure

```typescript
interface TypeScriptESMResult {
  imports: ParsedImport[]
  exports: ParsedExport[]
  strippedContent: string  // Content safe for acorn/non-TS parsers
  hasTypeScript: boolean   // Whether TS-specific syntax was found
}

interface ParsedImport {
  type: 'value' | 'type' | 'mixed'
  source: string
  specifiers: Array<{
    name: string
    isType: boolean
    alias?: string
  }>
  isTypeOnly: boolean
  original: string    // Original import statement
  stripped: string    // Stripped version (type imports removed)
  ast: ImportDeclaration  // Full TypeScript AST node
  position: { start: number; end: number }
}
```

## Mermaid Parsing

Extract and parse mermaid diagrams:

```typescript
import {
  parseMermaid,
  extractMermaidDiagrams,
  validateMermaid
} from '@mdxld/remark'

const content = `
# Document

\`\`\`mermaid
flowchart TD
    A[Start] --> B{Decision}
    B -->|Yes| C[Action]
    B -->|No| D[End]
\`\`\`
`

// Extract all mermaid diagrams from content
const diagrams = extractMermaidDiagrams(content)

for (const diagram of diagrams) {
  console.log(diagram.source)     // Raw mermaid source
  console.log(diagram.ast.type)   // 'flowchart'
  console.log(diagram.ast.direction) // 'TD'
  console.log(diagram.ast.nodes)  // [{ id: 'A', label: 'Start', shape: 'rect' }, ...]
  console.log(diagram.ast.edges)  // [{ from: 'A', to: 'B', type: '-->' }, ...]
  console.log(diagram.position)   // { start: 25, end: 120 }

  // Validate diagram
  const errors = validateMermaid(diagram.ast)
  if (errors.length > 0) {
    console.warn('Validation errors:', errors)
  }
}
```

### Supported Diagram Types

```typescript
type MermaidDiagramType =
  | 'flowchart'
  | 'graph'
  | 'sequenceDiagram'
  | 'classDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'gantt'
  | 'pie'
  | 'mindmap'
  | 'timeline'
  | 'gitGraph'
  | 'journey'
  | 'quadrantChart'
  | 'requirementDiagram'
  | 'c4Context'
  | 'unknown'
```

### Mermaid AST Structure

```typescript
interface MermaidAST {
  type: MermaidDiagramType
  source: string
  direction?: 'TB' | 'TD' | 'BT' | 'RL' | 'LR'
  nodes?: MermaidNode[]
  edges?: MermaidEdge[]
  participants?: MermaidParticipant[]
  messages?: MermaidMessage[]
  classes?: MermaidClass[]
  states?: MermaidState[]
  transitions?: MermaidTransition[]
  entities?: MermaidEntity[]
  relationships?: MermaidRelationship[]
}

interface MermaidNode {
  id: string
  label?: string
  shape?: 'rect' | 'round' | 'stadium' | 'subroutine' | 'cylinder' |
          'circle' | 'asymmetric' | 'rhombus' | 'hexagon' | 'parallelogram' |
          'parallelogram_alt' | 'trapezoid' | 'trapezoid_alt' | 'double_circle'
}

interface MermaidEdge {
  from: string
  to: string
  label?: string
  type?: '-->' | '---' | '-.->?' | '==>' | '--x' | '--o' | '<-->'
}
```

## Code Block Attributes

Parse code block metadata attributes:

```markdown
\`\`\`typescript {title="example.ts" lineNumbers highlight="3-5"}
const x = 1
const y = 2
const z = x + y  // highlighted
console.log(z)   // highlighted
return z         // highlighted
\`\`\`
```

Extracted as:

```typescript
{
  lang: 'typescript',
  meta: {
    title: 'example.ts',
    lineNumbers: true,
    highlight: '3-5'
  },
  value: '...'
}
```

## Integration with @mdxld/jsx

The remark plugin integrates seamlessly with the MDXLD compiler:

```typescript
import { compile } from '@mdxld/jsx'

const result = await compile(mdxContent, {
  // remarkMDXLD is automatically included
  remarkPlugins: [],
  rehypePlugins: []
})
```

## API Reference

### `remarkMDXLD(options?)`

Main remark plugin.

**Options:**
- `gfm` (boolean, default: `true`) - Enable GFM support
- `typescript` (boolean, default: `true`) - Enable TypeScript parsing
- `mermaid` (boolean, default: `true`) - Enable mermaid extraction
- `attributes` (boolean, default: `true`) - Enable code block attributes
- `codeHandlers` (object) - Custom handlers for code block languages

### `parseTypeScriptESM(source)`

Parse TypeScript ESM syntax from source string.

### `extractTypeInfo(result)`

Extract structured type information from parse result.

### `hasTypeScriptImportExport(content)`

Check if content contains TypeScript-specific import/export syntax.

### `parseMermaid(source)`

Parse mermaid diagram source into AST.

### `extractMermaidDiagrams(content)`

Extract all mermaid diagrams from markdown content.

### `validateMermaid(ast)`

Validate mermaid AST and return array of error messages.

### `presets`

Pre-configured option sets:
- `presets.full` - All features enabled
- `presets.minimal` - GFM only
- `presets.docs` - GFM + mermaid + attributes
- `presets.code` - GFM + TypeScript + attributes

## Related Packages

- [mdxld-vscode](../vscode) - VSCode extension for MDXLD
- [@mdxld/jsx](../jsx) - MDX compilation with JSX support
- [@mdxld/ast](../ast) - AST manipulation utilities
- [mdxld](../../mdxld) - Core MDXLD parsing library

## License

MIT

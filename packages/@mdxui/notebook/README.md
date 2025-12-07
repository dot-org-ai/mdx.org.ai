# @mdxui/notebook

Jupyter Notebook-style components for MDX with browser (QuickJS) and RPC execution modes.

## Installation

```bash
pnpm add @mdxui/notebook
```

## Usage

### Basic Notebook

```tsx
import { Notebook, createNotebookDocument, createCell } from '@mdxui/notebook'

const doc = createNotebookDocument({
  title: 'My Notebook',
  language: 'javascript'
})

doc.cells.push(
  createCell('code', {
    source: 'const x = 42\nconsole.log(x)'
  }),
  createCell('markdown', {
    source: '# Results\n\nThe answer is 42.'
  })
)

function MyNotebook() {
  return (
    <Notebook
      document={doc}
      executionMode="browser"
      onDocumentChange={(updated) => console.log(updated)}
    />
  )
}
```

### RPC Execution

For full Node.js/Python execution, connect to an RPC server:

```tsx
<Notebook
  document={doc}
  executionMode="rpc"
  rpcEndpoint="http://localhost:3000/rpc"
/>
```

### Programmatic Execution

```tsx
import { createBrowserExecutor, createRPCExecutor } from '@mdxui/notebook/execution'

// Browser execution (QuickJS)
const browserExec = createBrowserExecutor()
const result = await browserExec.execute('1 + 1', {})

// RPC execution
const rpcExec = createRPCExecutor({ endpoint: 'http://localhost:3000/rpc' })
const result = await rpcExec.execute('import numpy as np\nnp.array([1,2,3])', {})
```

### SQL Tagged Template

```tsx
import { sql } from '@mdxui/notebook/execution'

const query = sql`
  SELECT * FROM users
  WHERE id = ${userId}
`

const executor = createSQLExecutor({ connection: db })
const result = await executor.execute(query)
```

## Features

- **Dual Execution Modes**:
  - `browser` - QuickJS in-browser execution (no server required)
  - `rpc` - Remote execution via RPC (supports Python, Node.js, etc.)
- **CodeMirror Editor** - Syntax highlighting for JavaScript, Python, SQL
- **Multiple Output Types** - Text, errors, tables, JSON, charts
- **Cell Management** - Add, delete, move, execute cells
- **Execution Context** - Shared variables across cells
- **Toolbar** - Run all, interrupt, clear outputs
- **Custom Renderers** - Override output rendering

## Components

```tsx
import {
  Notebook,              // Main notebook component
  Cell,                  // Individual cell
  CodeEditor,            // Monaco-based editor
  useNotebookContext,    // Access notebook state
} from '@mdxui/notebook'
```

## Execution

```tsx
import {
  BrowserExecutor,       // QuickJS browser execution
  RPCExecutor,           // Remote RPC execution
  createExecutor,        // Factory for either mode
  createExecutionContext,
  sql,                   // SQL tagged template
} from '@mdxui/notebook/execution'
```

## Outputs

```tsx
import {
  Output,                // Generic output renderer
  TextOutputRenderer,    // Plain text
  ErrorOutputRenderer,   // Error messages
  TableOutputRenderer,   // Tabular data
  JsonOutputRenderer,    // JSON objects
} from '@mdxui/notebook/outputs'
```

## Hooks

```tsx
import {
  useNotebook,           // Full notebook state management
  useCell,              // Individual cell state
  useCellOutputs,       // Cell outputs only
} from '@mdxui/notebook/hooks'
```

## Types

```typescript
interface NotebookDocument {
  id: string
  title?: string
  cells: NotebookCell[]
  metadata: {
    language: Language
    executionMode: ExecutionMode
  }
}

interface NotebookCell {
  id: string
  type: 'code' | 'markdown'
  source: string
  language: 'javascript' | 'python' | 'sql'
  outputs: CellOutput[]
  status: 'idle' | 'running' | 'completed' | 'error'
}

type ExecutionMode = 'browser' | 'rpc'
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `document` | `NotebookDocument` | required | Notebook data |
| `executionMode` | `'browser' \| 'rpc'` | `'browser'` | Execution environment |
| `rpcEndpoint` | `string` | - | RPC server URL (for rpc mode) |
| `isReadOnly` | `boolean` | `false` | Disable editing |
| `showToolbar` | `boolean` | `true` | Show toolbar |
| `showLineNumbers` | `boolean` | `true` | Editor line numbers |
| `theme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Color theme |
| `onDocumentChange` | `(doc) => void` | - | Document update callback |
| `onCellExecute` | `(cell, result) => void` | - | Cell execution callback |

## License

MIT

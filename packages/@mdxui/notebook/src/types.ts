import type { ReactNode } from 'react'

/** Supported programming languages */
export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'sql'
  | 'markdown'
  | 'json'

/** Execution mode: browser-side or remote RPC */
export type ExecutionMode = 'browser' | 'rpc'

/** Cell type: code or markdown */
export type CellType = 'code' | 'markdown'

/** Output types */
export type OutputType =
  | 'text'
  | 'error'
  | 'html'
  | 'json'
  | 'table'
  | 'chart'
  | 'image'
  | 'stream'

/** A single output from cell execution */
export interface CellOutput {
  type: OutputType
  data: unknown
  timestamp: number
  executionTime?: number
}

/** Text output */
export interface TextOutput extends CellOutput {
  type: 'text'
  data: string
}

/** Error output */
export interface ErrorOutput extends CellOutput {
  type: 'error'
  data: {
    name: string
    message: string
    stack?: string
  }
}

/** Table output for structured data */
export interface TableOutput extends CellOutput {
  type: 'table'
  data: {
    columns: string[]
    rows: Record<string, unknown>[]
  }
}

/** Chart output for visualizations */
export interface ChartOutput extends CellOutput {
  type: 'chart'
  data: {
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'area'
    labels?: string[]
    datasets: Array<{
      label: string
      data: number[]
      color?: string
    }>
  }
}

/** JSON output */
export interface JsonOutput extends CellOutput {
  type: 'json'
  data: unknown
}

/** Cell execution state */
export type CellStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'success'
  | 'error'

/** A notebook cell */
export interface NotebookCell {
  id: string
  type: CellType
  source: string
  language: Language
  outputs: CellOutput[]
  status: CellStatus
  executionCount?: number
  metadata?: Record<string, unknown>
}

/** Notebook document */
export interface NotebookDocument {
  id: string
  title?: string
  cells: NotebookCell[]
  metadata?: {
    language?: Language
    executionMode?: ExecutionMode
    rpcEndpoint?: string
    [key: string]: unknown
  }
}

/** Execution context shared across cells */
export interface ExecutionContext {
  variables: Record<string, unknown>
  functions: Record<string, Function>
  imports: Record<string, unknown>
}

/** Executor interface */
export interface Executor {
  execute(
    code: string,
    language: Language,
    context: ExecutionContext
  ): Promise<CellOutput[]>

  interrupt?(): Promise<void>

  reset?(): Promise<void>
}

/** RPC execution options */
export interface RPCExecutionOptions {
  endpoint: string
  apiKey?: string
  timeout?: number
  language?: Language
}

/** Browser execution options */
export interface BrowserExecutionOptions {
  timeout?: number
  sandbox?: boolean
}

/** Cell component props */
export interface CellProps {
  cell: NotebookCell
  index: number
  isActive?: boolean
  isReadOnly?: boolean
  onSourceChange?: (source: string) => void
  onExecute?: () => Promise<void>
  onDelete?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  onTypeChange?: (type: CellType) => void
  onLanguageChange?: (language: Language) => void
}

/** Notebook component props */
export interface NotebookProps {
  document: NotebookDocument
  executionMode?: ExecutionMode
  rpcEndpoint?: string
  isReadOnly?: boolean
  showToolbar?: boolean
  showLineNumbers?: boolean
  theme?: 'light' | 'dark' | 'auto'
  className?: string
  onDocumentChange?: (document: NotebookDocument) => void
  onCellExecute?: (cellId: string, outputs: CellOutput[]) => void
  renderOutput?: (output: CellOutput) => ReactNode
}

/** Code editor props */
export interface CodeEditorProps {
  value: string
  language: Language
  onChange?: (value: string) => void
  onExecute?: () => void
  isReadOnly?: boolean
  showLineNumbers?: boolean
  theme?: 'light' | 'dark'
  placeholder?: string
  minHeight?: number
  maxHeight?: number
  className?: string
}

/** Output renderer props */
export interface OutputRendererProps {
  output: CellOutput
  className?: string
}

/** Notebook toolbar props */
export interface ToolbarProps {
  onAddCell?: (type: CellType) => void
  onRunAll?: () => void
  onClearOutputs?: () => void
  onReset?: () => void
  executionMode?: ExecutionMode
  onExecutionModeChange?: (mode: ExecutionMode) => void
  isRunning?: boolean
}

/** Notebook context */
export interface NotebookContextValue {
  document: NotebookDocument
  executionMode: ExecutionMode
  executor: Executor | null
  context: ExecutionContext
  activeCell: string | null
  isRunning: boolean

  // Actions
  setActiveCell: (id: string | null) => void
  addCell: (type: CellType, afterId?: string) => string
  deleteCell: (id: string) => void
  updateCell: (id: string, updates: Partial<NotebookCell>) => void
  moveCell: (id: string, direction: 'up' | 'down') => void
  executeCell: (id: string) => Promise<void>
  executeAll: () => Promise<void>
  interrupt: () => Promise<void>
  clearOutputs: () => void
  reset: () => Promise<void>
}

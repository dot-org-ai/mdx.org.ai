import { useCallback, useMemo } from 'react'
import type { NotebookCell, CellType, Language, CellOutput } from '../types'

export interface UseCellOptions {
  cell: NotebookCell
  onUpdate?: (updates: Partial<NotebookCell>) => void
  onExecute?: () => Promise<void>
  onDelete?: () => void
}

export interface UseCellReturn {
  cell: NotebookCell
  isCode: boolean
  isMarkdown: boolean
  isRunning: boolean
  hasError: boolean
  hasOutput: boolean

  setSource: (source: string) => void
  setType: (type: CellType) => void
  setLanguage: (language: Language) => void
  execute: () => Promise<void>
  remove: () => void
  clearOutput: () => void
}

/**
 * Hook for managing a single cell
 */
export function useCell({
  cell,
  onUpdate,
  onExecute,
  onDelete,
}: UseCellOptions): UseCellReturn {
  const isCode = cell.type === 'code'
  const isMarkdown = cell.type === 'markdown'
  const isRunning = cell.status === 'running'
  const hasError = cell.status === 'error'
  const hasOutput = cell.outputs.length > 0

  const setSource = useCallback(
    (source: string) => {
      onUpdate?.({ source })
    },
    [onUpdate]
  )

  const setType = useCallback(
    (type: CellType) => {
      onUpdate?.({ type })
    },
    [onUpdate]
  )

  const setLanguage = useCallback(
    (language: Language) => {
      onUpdate?.({ language })
    },
    [onUpdate]
  )

  const execute = useCallback(async () => {
    if (isCode && onExecute) {
      await onExecute()
    }
  }, [isCode, onExecute])

  const remove = useCallback(() => {
    onDelete?.()
  }, [onDelete])

  const clearOutput = useCallback(() => {
    onUpdate?.({ outputs: [], status: 'idle', executionCount: undefined })
  }, [onUpdate])

  return {
    cell,
    isCode,
    isMarkdown,
    isRunning,
    hasError,
    hasOutput,

    setSource,
    setType,
    setLanguage,
    execute,
    remove,
    clearOutput,
  }
}

/**
 * Parse cell outputs into typed results
 */
export function useCellOutputs(outputs: CellOutput[]) {
  return useMemo(() => {
    const textOutputs = outputs.filter((o) => o.type === 'text' || o.type === 'stream')
    const errorOutputs = outputs.filter((o) => o.type === 'error')
    const tableOutputs = outputs.filter((o) => o.type === 'table')
    const chartOutputs = outputs.filter((o) => o.type === 'chart')
    const jsonOutputs = outputs.filter((o) => o.type === 'json')
    const htmlOutputs = outputs.filter((o) => o.type === 'html')
    const imageOutputs = outputs.filter((o) => o.type === 'image')

    return {
      all: outputs,
      text: textOutputs,
      errors: errorOutputs,
      tables: tableOutputs,
      charts: chartOutputs,
      json: jsonOutputs,
      html: htmlOutputs,
      images: imageOutputs,
      hasErrors: errorOutputs.length > 0,
      isEmpty: outputs.length === 0,
    }
  }, [outputs])
}

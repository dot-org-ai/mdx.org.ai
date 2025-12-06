import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import type {
  NotebookDocument,
  NotebookCell,
  NotebookContextValue,
  CellType,
  ExecutionMode,
  Executor,
  ExecutionContext,
  CellOutput,
} from '../types'
import { createExecutor, createExecutionContext } from '../execution'

export interface UseNotebookOptions {
  initialDocument: NotebookDocument
  executionMode?: ExecutionMode
  rpcEndpoint?: string
  onDocumentChange?: (document: NotebookDocument) => void
  onCellExecute?: (cellId: string, outputs: CellOutput[]) => void
}

export function useNotebook({
  initialDocument,
  executionMode = 'browser',
  rpcEndpoint,
  onDocumentChange,
  onCellExecute,
}: UseNotebookOptions): NotebookContextValue {
  const [document, setDocument] = useState<NotebookDocument>(initialDocument)
  const [activeCell, setActiveCell] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const executionCountRef = useRef(0)

  // Create executor based on mode
  const executor = useMemo<Executor>(() => {
    if (executionMode === 'rpc' && rpcEndpoint) {
      return createExecutor({
        mode: 'rpc',
        options: { endpoint: rpcEndpoint },
      })
    }
    return createExecutor({ mode: 'browser' })
  }, [executionMode, rpcEndpoint])

  // Shared execution context
  const context = useMemo<ExecutionContext>(
    () => createExecutionContext(),
    []
  )

  // Notify parent of document changes
  useEffect(() => {
    onDocumentChange?.(document)
  }, [document, onDocumentChange])

  const updateDocument = useCallback(
    (updater: (doc: NotebookDocument) => NotebookDocument) => {
      setDocument((prev) => updater(prev))
    },
    []
  )

  const addCell = useCallback(
    (type: CellType, afterId?: string) => {
      const newCell: NotebookCell = {
        id: generateId(),
        type,
        source: '',
        language: document.metadata?.language || 'javascript',
        outputs: [],
        status: 'idle',
      }

      updateDocument((doc) => {
        const cells = [...doc.cells]
        if (afterId) {
          const index = cells.findIndex((c) => c.id === afterId)
          if (index >= 0) {
            cells.splice(index + 1, 0, newCell)
          } else {
            cells.push(newCell)
          }
        } else {
          cells.push(newCell)
        }
        return { ...doc, cells }
      })

      setActiveCell(newCell.id)
      return newCell.id
    },
    [document.metadata?.language, updateDocument]
  )

  const deleteCell = useCallback(
    (id: string) => {
      updateDocument((doc) => ({
        ...doc,
        cells: doc.cells.filter((c) => c.id !== id),
      }))

      if (activeCell === id) {
        setActiveCell(null)
      }
    },
    [activeCell, updateDocument]
  )

  const updateCell = useCallback(
    (id: string, updates: Partial<NotebookCell>) => {
      updateDocument((doc) => ({
        ...doc,
        cells: doc.cells.map((c) =>
          c.id === id ? { ...c, ...updates } : c
        ),
      }))
    },
    [updateDocument]
  )

  const moveCell = useCallback(
    (id: string, direction: 'up' | 'down') => {
      updateDocument((doc) => {
        const cells = [...doc.cells]
        const index = cells.findIndex((c) => c.id === id)

        if (index < 0) return doc

        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= cells.length) return doc

        // Swap
        ;[cells[index], cells[newIndex]] = [cells[newIndex], cells[index]]

        return { ...doc, cells }
      })
    },
    [updateDocument]
  )

  const executeCell = useCallback(
    async (id: string) => {
      const cell = document.cells.find((c) => c.id === id)
      if (!cell || cell.type !== 'code') return

      // Update status to running
      updateCell(id, { status: 'running', outputs: [] })
      setIsRunning(true)

      try {
        const outputs = await executor.execute(cell.source, cell.language, context)

        executionCountRef.current += 1

        updateCell(id, {
          status: outputs.some((o) => o.type === 'error') ? 'error' : 'success',
          outputs,
          executionCount: executionCountRef.current,
        })

        onCellExecute?.(id, outputs)
      } catch (error) {
        updateCell(id, {
          status: 'error',
          outputs: [
            {
              type: 'error',
              data: {
                name: error instanceof Error ? error.name : 'Error',
                message: error instanceof Error ? error.message : String(error),
              },
              timestamp: Date.now(),
            },
          ],
        })
      } finally {
        setIsRunning(false)
      }
    },
    [document.cells, executor, context, updateCell, onCellExecute]
  )

  const executeAll = useCallback(async () => {
    const codeCells = document.cells.filter((c) => c.type === 'code')

    for (const cell of codeCells) {
      await executeCell(cell.id)
    }
  }, [document.cells, executeCell])

  const interrupt = useCallback(async () => {
    await executor.interrupt?.()
    setIsRunning(false)

    // Mark any running cells as idle
    updateDocument((doc) => ({
      ...doc,
      cells: doc.cells.map((c) =>
        c.status === 'running' ? { ...c, status: 'idle' } : c
      ),
    }))
  }, [executor, updateDocument])

  const clearOutputs = useCallback(() => {
    updateDocument((doc) => ({
      ...doc,
      cells: doc.cells.map((c) => ({
        ...c,
        outputs: [],
        status: 'idle',
        executionCount: undefined,
      })),
    }))
    executionCountRef.current = 0
  }, [updateDocument])

  const reset = useCallback(async () => {
    await executor.reset?.()
    clearOutputs()
    // Reset context
    Object.keys(context.variables).forEach((key) => {
      delete context.variables[key]
    })
  }, [executor, clearOutputs, context])

  return {
    document,
    executionMode,
    executor,
    context,
    activeCell,
    isRunning,

    setActiveCell,
    addCell,
    deleteCell,
    updateCell,
    moveCell,
    executeCell,
    executeAll,
    interrupt,
    clearOutputs,
    reset,
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10)
}

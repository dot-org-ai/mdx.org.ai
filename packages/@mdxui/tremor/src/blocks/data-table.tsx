/**
 * Data Table
 *
 * Sortable, paginated data table.
 */

import * as React from 'react'
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
} from '@tremor/react'
import type { DataTableProps, TableColumn } from '../types'

export function DataTable<T extends object>({
  data,
  columns,
  onRowClick,
  pagination,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = React.useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = React.useState<'asc' | 'desc'>('asc')

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn]
      const bVal = b[sortColumn]
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [data, sortColumn, sortDirection])

  return (
    <div>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column, i) => (
              <TableHeaderCell
                key={i}
                className={`${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''} ${column.sortable ? 'cursor-pointer hover:bg-muted' : ''}`}
                onClick={() => handleSort(column)}
              >
                <span className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortColumn === column.key && (
                    <span>{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </span>
              </TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedData.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              className={onRowClick ? 'cursor-pointer hover:bg-muted' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <TableCell
                  key={colIndex}
                  className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.pageSize + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
            {pagination.total}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
              className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

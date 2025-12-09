/**
 * Data Table
 *
 * Sortable, paginated data table.
 */

import {
  forwardRef,
  useState,
  useMemo,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeaderCell,
  TableCell,
} from '../ui/table'
import { Button } from '../ui/button'
import type { DataTableProps, TableColumn } from '../types'

type DataTableElement = HTMLDivElement

function DataTableInner<T extends object>({
  data,
  columns,
  onRowClick,
  pagination,
  className = '',
  ...props
}: DataTableProps<T> & ComponentPropsWithoutRef<'div'>, ref: React.ForwardedRef<DataTableElement>) {
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const handleSort = (column: TableColumn<T>) => {
    if (!column.sortable) return
    if (sortColumn === column.key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column.key)
      setSortDirection('asc')
    }
  }

  const sortedData = useMemo(() => {
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
    <Primitive.div ref={ref} className={className} {...props}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column, i) => (
              <TableHeaderCell
                key={i}
                className={`${column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''} ${column.sortable ? 'cursor-pointer select-none hover:bg-muted' : ''}`.trim()}
                onClick={() => handleSort(column)}
              >
                <span className="flex items-center gap-1">
                  {column.header}
                  {column.sortable && sortColumn === column.key && (
                    <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
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
              className={onRowClick ? 'cursor-pointer' : ''}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((column, colIndex) => (
                <TableCell
                  key={colIndex}
                  className={column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : ''}
                >
                  {column.render
                    ? column.render(row[column.key], row)
                    : String(row[column.key] ?? '')}
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
            <Button
              variant="light"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="light"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page * pagination.pageSize >= pagination.total}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Primitive.div>
  )
}

// Forward ref with generic support
const DataTable = forwardRef(DataTableInner) as <T extends object>(
  props: DataTableProps<T> & ComponentPropsWithoutRef<'div'> & { ref?: React.ForwardedRef<DataTableElement> }
) => React.ReactElement

export { DataTable }

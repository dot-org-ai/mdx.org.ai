/**
 * Table components - Data table primitives
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Table
 * -----------------------------------------------------------------------------------------------*/

type TableElement = HTMLTableElement
interface TableProps extends ComponentPropsWithoutRef<'table'> {}

const Table = forwardRef<TableElement, TableProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <div className="w-full overflow-auto">
        <table
          ref={ref}
          className={`w-full caption-bottom text-sm ${className}`.trim()}
          {...props}
        />
      </div>
    )
  }
)
Table.displayName = 'Table'

/* -------------------------------------------------------------------------------------------------
 * TableHead
 * -----------------------------------------------------------------------------------------------*/

type TableHeadElement = HTMLTableSectionElement
interface TableHeadProps extends ComponentPropsWithoutRef<'thead'> {}

const TableHead = forwardRef<TableHeadElement, TableHeadProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <thead
        ref={ref}
        className={`[&_tr]:border-b ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableHead.displayName = 'TableHead'

/* -------------------------------------------------------------------------------------------------
 * TableBody
 * -----------------------------------------------------------------------------------------------*/

type TableBodyElement = HTMLTableSectionElement
interface TableBodyProps extends ComponentPropsWithoutRef<'tbody'> {}

const TableBody = forwardRef<TableBodyElement, TableBodyProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <tbody
        ref={ref}
        className={`[&_tr:last-child]:border-0 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableBody.displayName = 'TableBody'

/* -------------------------------------------------------------------------------------------------
 * TableFoot
 * -----------------------------------------------------------------------------------------------*/

type TableFootElement = HTMLTableSectionElement
interface TableFootProps extends ComponentPropsWithoutRef<'tfoot'> {}

const TableFoot = forwardRef<TableFootElement, TableFootProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <tfoot
        ref={ref}
        className={`border-t bg-muted/50 font-medium [&>tr]:last:border-b-0 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableFoot.displayName = 'TableFoot'

/* -------------------------------------------------------------------------------------------------
 * TableRow
 * -----------------------------------------------------------------------------------------------*/

type TableRowElement = HTMLTableRowElement
interface TableRowProps extends ComponentPropsWithoutRef<'tr'> {}

const TableRow = forwardRef<TableRowElement, TableRowProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <tr
        ref={ref}
        className={`border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableRow.displayName = 'TableRow'

/* -------------------------------------------------------------------------------------------------
 * TableHeaderCell
 * -----------------------------------------------------------------------------------------------*/

type TableHeaderCellElement = HTMLTableCellElement
interface TableHeaderCellProps extends ComponentPropsWithoutRef<'th'> {}

const TableHeaderCell = forwardRef<TableHeaderCellElement, TableHeaderCellProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <th
        ref={ref}
        className={`h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableHeaderCell.displayName = 'TableHeaderCell'

/* -------------------------------------------------------------------------------------------------
 * TableCell
 * -----------------------------------------------------------------------------------------------*/

type TableCellElement = HTMLTableCellElement
interface TableCellProps extends ComponentPropsWithoutRef<'td'> {}

const TableCell = forwardRef<TableCellElement, TableCellProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <td
        ref={ref}
        className={`p-4 align-middle [&:has([role=checkbox])]:pr-0 ${className}`.trim()}
        {...props}
      />
    )
  }
)
TableCell.displayName = 'TableCell'

export { Table, TableHead, TableBody, TableFoot, TableRow, TableHeaderCell, TableCell }
export type {
  TableProps,
  TableHeadProps,
  TableBodyProps,
  TableFootProps,
  TableRowProps,
  TableHeaderCellProps,
  TableCellProps,
}

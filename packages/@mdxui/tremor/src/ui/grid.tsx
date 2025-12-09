/**
 * Grid - CSS Grid layout components
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Grid
 * -----------------------------------------------------------------------------------------------*/

type GridElement = HTMLDivElement
interface GridProps extends ComponentPropsWithoutRef<'div'> {
  /** Number of columns (default responsive) */
  numItems?: 1 | 2 | 3 | 4 | 5 | 6
  /** Number of columns at sm breakpoint */
  numItemsSm?: 1 | 2 | 3 | 4 | 5 | 6
  /** Number of columns at md breakpoint */
  numItemsMd?: 1 | 2 | 3 | 4 | 5 | 6
  /** Number of columns at lg breakpoint */
  numItemsLg?: 1 | 2 | 3 | 4 | 5 | 6
}

const Grid = forwardRef<GridElement, GridProps>(
  ({
    className = '',
    numItems = 1,
    numItemsSm,
    numItemsMd,
    numItemsLg,
    ...props
  }, ref) => {
    const colsMap = {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
      5: 'grid-cols-5',
      6: 'grid-cols-6',
    }

    const smMap = {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
      5: 'sm:grid-cols-5',
      6: 'sm:grid-cols-6',
    }

    const mdMap = {
      1: 'md:grid-cols-1',
      2: 'md:grid-cols-2',
      3: 'md:grid-cols-3',
      4: 'md:grid-cols-4',
      5: 'md:grid-cols-5',
      6: 'md:grid-cols-6',
    }

    const lgMap = {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
      5: 'lg:grid-cols-5',
      6: 'lg:grid-cols-6',
    }

    const classes = [
      'grid gap-6',
      colsMap[numItems],
      numItemsSm ? smMap[numItemsSm] : '',
      numItemsMd ? mdMap[numItemsMd] : '',
      numItemsLg ? lgMap[numItemsLg] : '',
      className,
    ].filter(Boolean).join(' ')

    return (
      <Primitive.div
        ref={ref}
        className={classes}
        {...props}
      />
    )
  }
)
Grid.displayName = 'Grid'

/* -------------------------------------------------------------------------------------------------
 * Col
 * -----------------------------------------------------------------------------------------------*/

type ColElement = HTMLDivElement
interface ColProps extends ComponentPropsWithoutRef<'div'> {
  /** Column span (default responsive) */
  numColSpan?: 1 | 2 | 3 | 4 | 5 | 6
  /** Column span at sm breakpoint */
  numColSpanSm?: 1 | 2 | 3 | 4 | 5 | 6
  /** Column span at md breakpoint */
  numColSpanMd?: 1 | 2 | 3 | 4 | 5 | 6
  /** Column span at lg breakpoint */
  numColSpanLg?: 1 | 2 | 3 | 4 | 5 | 6
}

const Col = forwardRef<ColElement, ColProps>(
  ({
    className = '',
    numColSpan,
    numColSpanSm,
    numColSpanMd,
    numColSpanLg,
    ...props
  }, ref) => {
    const spanMap = {
      1: 'col-span-1',
      2: 'col-span-2',
      3: 'col-span-3',
      4: 'col-span-4',
      5: 'col-span-5',
      6: 'col-span-6',
    }

    const smMap = {
      1: 'sm:col-span-1',
      2: 'sm:col-span-2',
      3: 'sm:col-span-3',
      4: 'sm:col-span-4',
      5: 'sm:col-span-5',
      6: 'sm:col-span-6',
    }

    const mdMap = {
      1: 'md:col-span-1',
      2: 'md:col-span-2',
      3: 'md:col-span-3',
      4: 'md:col-span-4',
      5: 'md:col-span-5',
      6: 'md:col-span-6',
    }

    const lgMap = {
      1: 'lg:col-span-1',
      2: 'lg:col-span-2',
      3: 'lg:col-span-3',
      4: 'lg:col-span-4',
      5: 'lg:col-span-5',
      6: 'lg:col-span-6',
    }

    const classes = [
      numColSpan ? spanMap[numColSpan] : '',
      numColSpanSm ? smMap[numColSpanSm] : '',
      numColSpanMd ? mdMap[numColSpanMd] : '',
      numColSpanLg ? lgMap[numColSpanLg] : '',
      className,
    ].filter(Boolean).join(' ')

    return (
      <Primitive.div
        ref={ref}
        className={classes}
        {...props}
      />
    )
  }
)
Col.displayName = 'Col'

export { Grid, Col }
export type { GridProps, ColProps }

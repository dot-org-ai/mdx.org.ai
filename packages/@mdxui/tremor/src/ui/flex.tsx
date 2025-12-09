/**
 * Flex - Flexbox layout component
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Flex
 * -----------------------------------------------------------------------------------------------*/

type FlexElement = HTMLDivElement
interface FlexProps extends ComponentPropsWithoutRef<'div'> {
  /** Flex direction */
  flexDirection?: 'row' | 'col' | 'row-reverse' | 'col-reverse'
  /** Justify content */
  justifyContent?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly'
  /** Align items */
  alignItems?: 'start' | 'end' | 'center' | 'baseline' | 'stretch'
}

const Flex = forwardRef<FlexElement, FlexProps>(
  ({
    className = '',
    flexDirection = 'row',
    justifyContent = 'start',
    alignItems = 'stretch',
    ...props
  }, ref) => {
    const directionClass = {
      row: 'flex-row',
      col: 'flex-col',
      'row-reverse': 'flex-row-reverse',
      'col-reverse': 'flex-col-reverse',
    }[flexDirection]

    const justifyClass = {
      start: 'justify-start',
      end: 'justify-end',
      center: 'justify-center',
      between: 'justify-between',
      around: 'justify-around',
      evenly: 'justify-evenly',
    }[justifyContent]

    const alignClass = {
      start: 'items-start',
      end: 'items-end',
      center: 'items-center',
      baseline: 'items-baseline',
      stretch: 'items-stretch',
    }[alignItems]

    return (
      <Primitive.div
        ref={ref}
        className={`flex ${directionClass} ${justifyClass} ${alignClass} ${className}`.trim()}
        {...props}
      />
    )
  }
)
Flex.displayName = 'Flex'

export { Flex }
export type { FlexProps }

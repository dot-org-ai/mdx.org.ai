/**
 * Card - Container component for dashboard content
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Card
 * -----------------------------------------------------------------------------------------------*/

type CardElement = HTMLDivElement
interface CardProps extends ComponentPropsWithoutRef<'div'> {
  /** Card decoration color */
  decoration?: 'top' | 'left' | 'bottom' | 'right'
  /** Decoration color */
  decorationColor?: string
}

const Card = forwardRef<CardElement, CardProps>(
  ({ className = '', decoration, decorationColor, children, ...props }, ref) => {
    const decorationStyles = decoration
      ? {
          top: 'border-t-4',
          left: 'border-l-4',
          bottom: 'border-b-4',
          right: 'border-r-4',
        }[decoration]
      : ''

    return (
      <Primitive.div
        ref={ref}
        className={`rounded-lg border bg-card p-6 shadow-sm ${decorationStyles} ${className}`.trim()}
        style={decorationColor ? { borderColor: decorationColor } : undefined}
        {...props}
      >
        {children}
      </Primitive.div>
    )
  }
)
Card.displayName = 'Card'

export { Card }
export type { CardProps }

/**
 * Divider - Horizontal/vertical divider component
 */

import {
  forwardRef,
  type ComponentPropsWithoutRef,
} from '@mdxui/jsx'
import { Primitive } from '@mdxui/jsx/primitives'

/* -------------------------------------------------------------------------------------------------
 * Divider
 * -----------------------------------------------------------------------------------------------*/

type DividerElement = HTMLDivElement
interface DividerProps extends ComponentPropsWithoutRef<'div'> {}

const Divider = forwardRef<DividerElement, DividerProps>(
  ({ className = '', children, ...props }, ref) => {
    if (children) {
      return (
        <Primitive.div
          ref={ref}
          className={`relative my-4 ${className}`.trim()}
          {...props}
        >
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {children}
            </span>
          </div>
        </Primitive.div>
      )
    }

    return (
      <Primitive.div
        ref={ref}
        className={`my-4 h-px w-full bg-border ${className}`.trim()}
        role="separator"
        {...props}
      />
    )
  }
)
Divider.displayName = 'Divider'

export { Divider }
export type { DividerProps }
